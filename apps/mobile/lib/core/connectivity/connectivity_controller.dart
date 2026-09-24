import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Online state = the phone has a network interface AND the last server call did not fail with a
/// network error. connectivity_plus is only a trigger (ADR 0010 decision 12: "real check = API call").
final connectivityProvider = NotifierProvider<ConnectivityController, bool>(ConnectivityController.new);

/// Fires when connectivity comes back (sync trigger).
final onlineAgainProvider = Provider<Stream<void>>((ref) => ref.watch(connectivityProvider.notifier).onlineAgain);

class ConnectivityController extends Notifier<bool> {
  StreamSubscription<List<ConnectivityResult>>? _sub;
  final _onlineAgain = StreamController<void>.broadcast();
  bool _hasInterface = true;
  bool _serverReachable = true;

  Stream<void> get onlineAgain => _onlineAgain.stream;

  /// Overridable for tests.
  Connectivity createConnectivity() => Connectivity();

  @override
  bool build() {
    ref.onDispose(() {
      _sub?.cancel();
      _onlineAgain.close();
    });
    try {
      final c = createConnectivity();
      _sub = c.onConnectivityChanged.listen(_onInterfaces, onError: (_) {});
      c.checkConnectivity().then(_onInterfaces, onError: (_) {});
    } on Object {
      // No platform channel (tests): assume online until an API call says otherwise.
    }
    return true;
  }

  void _onInterfaces(List<ConnectivityResult> r) {
    _hasInterface = r.any((e) => e != ConnectivityResult.none);
    if (_hasInterface) _serverReachable = true; // re-probe on the next call
    _emit();
  }

  void reportServerReachable(bool ok) {
    if (_serverReachable == ok) return;
    _serverReachable = ok;
    _emit();
  }

  void _emit() {
    final next = _hasInterface && _serverReachable;
    final was = state;
    state = next;
    if (!was && next && !_onlineAgain.isClosed) _onlineAgain.add(null);
  }
}
