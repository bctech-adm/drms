import 'dart:async';

import 'package:dio/dio.dart';

import '../../../core/config/app_env.dart';
import '../../../core/logging/log.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/secure_store.dart';
import '../domain/jwt.dart';
import 'oidc_client.dart';

/// Owns the tokens: refresh token only in [SecureStore], access token only in memory (ADR 0010
/// decision 3). Keycloak rotates refresh tokens (Revoke Refresh Token = on), so a refresh is
/// single-flight and the NEW refresh token is persisted before the new access token is used.
class TokenManager implements TokenSource {
  TokenManager({required this.env, required this.store, Dio? tokenDio, this.onSessionEnded})
      : _dio = tokenDio ??
            Dio(BaseOptions(
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 20),
            ));

  final AppEnv env;
  final SecureStore store;
  final Dio _dio;

  /// Called once when the session cannot continue (refresh rejected / 401 after refresh).
  Future<void> Function(String reason)? onSessionEnded;

  String? _access;
  DateTime? _accessExpiry;
  Completer<String?>? _inflight;

  Future<bool> hasSession() async => (await store.read(SecureKeys.refreshToken)) != null;

  Future<String?> sessionSub() => store.read(SecureKeys.sessionSub);

  Future<String?> idToken() => store.read(SecureKeys.idToken);

  /// Stores a fresh login. Refresh token first (atomic w.r.t. rotation), then memory.
  Future<void> saveLogin(OidcTokens t) async {
    await store.write(SecureKeys.refreshToken, t.refreshToken);
    if (t.idToken != null) await store.write(SecureKeys.idToken, t.idToken!);
    final sub = subjectOf(t.accessToken) ?? subjectOf(t.idToken);
    if (sub != null) await store.write(SecureKeys.sessionSub, sub);
    _access = t.accessToken;
    _accessExpiry = t.accessTokenExpiry?.toUtc() ?? expiryOf(t.accessToken);
  }

  Future<void> clear() async {
    _access = null;
    _accessExpiry = null;
    await store.delete(SecureKeys.refreshToken);
    await store.delete(SecureKeys.idToken);
    // sessionSub is kept on purpose: the offline queue stays locked to that user (ADR 0010).
  }

  bool get _accessValid =>
      _access != null &&
      (_accessExpiry == null || _accessExpiry!.isAfter(DateTime.now().toUtc().add(const Duration(seconds: 30))));

  @override
  Future<String?> accessToken() async {
    if (_accessValid) return _access;
    if (!await hasSession()) return null;
    try {
      return await refreshAccessToken();
    } on NetworkException {
      return null; // offline: the request itself will fail with a network error
    }
  }

  @override
  Future<String?> refreshAccessToken() {
    final running = _inflight;
    if (running != null) return running.future;
    final c = Completer<String?>();
    _inflight = c;
    _doRefresh().then(c.complete, onError: c.completeError).whenComplete(() => _inflight = null);
    return c.future;
  }

  Future<String?> _doRefresh() async {
    final refresh = await store.read(SecureKeys.refreshToken);
    if (refresh == null) return null;
    Response<dynamic> res;
    try {
      res = await _dio.post<dynamic>(
        env.tokenEndpoint,
        data: {'grant_type': 'refresh_token', 'client_id': env.oidcClientId, 'refresh_token': refresh},
        options: Options(contentType: Headers.formUrlEncodedContentType, validateStatus: (_) => true),
      );
    } on DioException {
      throw const NetworkException();
    }
    final body = res.data;
    if (res.statusCode == 200 && body is Map<String, dynamic> && body['access_token'] is String) {
      final newRefresh = body['refresh_token'] as String?;
      if (newRefresh != null) await store.write(SecureKeys.refreshToken, newRefresh);
      if (body['id_token'] is String) await store.write(SecureKeys.idToken, body['id_token'] as String);
      _access = body['access_token'] as String;
      final expiresIn = body['expires_in'];
      _accessExpiry = expiresIn is num
          ? DateTime.now().toUtc().add(Duration(seconds: expiresIn.toInt()))
          : expiryOf(_access);
      return _access;
    }
    if (res.statusCode == 400 || res.statusCode == 401) {
      // invalid_grant: refresh token revoked/expired (remote logout, 30-day offline max, reuse).
      Log.w('auth: refresh rejected (${res.statusCode})');
      await clear();
      await onSessionEnded?.call('refresh_rejected');
      return null;
    }
    // 5xx / rate limit: keep the session, treat as temporarily unreachable.
    throw const NetworkException();
  }

  @override
  Future<void> onUnauthorized() async {
    await clear();
    await onSessionEnded?.call('unauthorized');
  }
}
