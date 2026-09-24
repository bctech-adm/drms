import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/logging/log.dart';
import '../../../core/network/api_exception.dart';
import '../../expense/data/expense_mappers.dart';
import '../data/oidc_client.dart';
import '../domain/user_profile.dart';

sealed class AuthState {
  const AuthState();
}

class AuthStarting extends AuthState {
  const AuthStarting();
}

class AuthSignedOut extends AuthState {
  const AuthSignedOut({this.message});
  final String? message;
}

class AuthSignedIn extends AuthState {
  const AuthSignedIn({required this.profile, required this.sub, this.fromCache = false});
  final UserProfile profile;
  final String sub;

  /// Profile restored from the encrypted cache because the server was unreachable at start.
  final bool fromCache;
}

final authControllerProvider = NotifierProvider<AuthController, AuthState>(AuthController.new);

/// Current user's `sub` (queue owner) or null.
final currentSubProvider = Provider<String?>((ref) {
  final s = ref.watch(authControllerProvider);
  return s is AuthSignedIn ? s.sub : null;
});

final currentProfileProvider = Provider<UserProfile?>((ref) {
  final s = ref.watch(authControllerProvider);
  return s is AuthSignedIn ? s.profile : null;
});

class AuthController extends Notifier<AuthState> {
  bool _busy = false;

  @override
  AuthState build() {
    final tokens = ref.read(tokenManagerProvider);
    tokens.onSessionEnded = _onSessionEnded;
    Future.microtask(_restore);
    return const AuthStarting();
  }

  static String _profileKey(String sub) => 'profile:$sub';

  Future<void> _restore() async {
    final tokens = ref.read(tokenManagerProvider);
    if (!await tokens.hasSession()) {
      state = const AuthSignedOut();
      return;
    }
    final sub = await tokens.sessionSub();
    if (sub == null) {
      await tokens.clear();
      state = const AuthSignedOut();
      return;
    }
    try {
      final profile = await _loadProfileOnline(sub, register: true);
      state = AuthSignedIn(profile: profile, sub: sub);
    } on NetworkException {
      final cached = await ref.read(databaseProvider).kvGetJson(_profileKey(sub));
      state = cached == null
          ? const AuthSignedOut(message: 'Butuh koneksi internet untuk memuat profil.')
          : AuthSignedIn(profile: userProfileFromJson(cached), sub: sub, fromCache: true);
    } on UnauthorizedException {
      // _onSessionEnded already switched the state.
    } on ApiException catch (e) {
      Log.w('auth: restore failed', e);
      state = AuthSignedOut(message: e.message);
    }
  }

  Future<UserProfile> _loadProfileOnline(String sub, {required bool register}) async {
    if (register) await _registerDevice();
    final raw = await ref.read(profileApiProvider).meRaw();
    await ref.read(databaseProvider).kvPut(_profileKey(sub), jsonEncode(raw));
    final profile = userProfileFromJson(raw);
    unawaited(ref.read(syncEngineProvider).rememberServerTime(profile.serverTime));
    return profile;
  }

  /// Registers this install; a revoked install id (403) is replaced by a fresh one once.
  Future<void> _registerDevice() async {
    final device = ref.read(deviceIdentityProvider);
    final api = ref.read(profileApiProvider);
    final fcm = await ref.read(pushServiceProvider).token();
    Future<void> attempt() => api.registerDevice(
      deviceId: device.deviceId,
      model: device.model,
      appVersion: device.appVersion,
      fcmToken: fcm,
    );
    try {
      await attempt();
    } on ProblemException catch (e) {
      if (e.status != 403 && e.status != 409) rethrow;
      Log.i('auth: install id rejected (${e.status}), rotating');
      await device.rotate();
      await attempt();
    }
  }

  Future<String?> login() async {
    if (_busy) return null;
    _busy = true;
    try {
      final tokens = await ref.read(oidcBrowserClientProvider).login();
      final tm = ref.read(tokenManagerProvider);
      await tm.saveLogin(tokens);
      final sub = await tm.sessionSub();
      if (sub == null) throw StateError('sub hilang dari token');
      final profile = await _loadProfileOnline(sub, register: true);
      state = AuthSignedIn(profile: profile, sub: sub);
      return null;
    } on LoginCancelled {
      return 'cancelled';
    } on NetworkException {
      await ref.read(tokenManagerProvider).clear();
      return 'network';
    } on ApiException catch (e) {
      await ref.read(tokenManagerProvider).clear();
      return e.message;
    } on Object catch (e) {
      Log.w('auth: login failed', e);
      await ref.read(tokenManagerProvider).clear();
      return 'failed';
    } finally {
      _busy = false;
    }
  }

  Future<void> refreshProfile() async {
    final s = state;
    if (s is! AuthSignedIn) return;
    try {
      final p = await _loadProfileOnline(s.sub, register: s.fromCache);
      state = AuthSignedIn(profile: p, sub: s.sub);
    } on ApiException {
      // keep current
    }
  }

  /// Logout: revoke this device server-side (also ends the Keycloak offline session, ADR 0003 §5),
  /// end the browser SSO session, drop tokens, and use a new install id next time (a revoked id can
  /// never be re-activated). The encrypted queue stays, locked to this user's `sub`.
  Future<void> logout() async {
    final tm = ref.read(tokenManagerProvider);
    final device = ref.read(deviceIdentityProvider);
    try {
      await ref.read(profileApiProvider).revokeDevice(device.deviceId);
    } on ApiException catch (e) {
      Log.i('auth: device revoke skipped (${e.runtimeType})');
    }
    final idToken = await tm.idToken();
    try {
      await ref.read(oidcBrowserClientProvider).endSession(idTokenHint: idToken);
    } on Object catch (e) {
      Log.i('auth: end session skipped (${e.runtimeType})');
    }
    await ref.read(pushServiceProvider).onLogout();
    await tm.clear();
    await device.rotate();
    state = const AuthSignedOut();
  }

  Future<void> _onSessionEnded(String reason) async {
    Log.i('auth: session ended ($reason)');
    state = const AuthSignedOut(message: 'session_ended');
  }
}
