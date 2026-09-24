import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/connectivity/connectivity_controller.dart';
import '../../../core/logging/log.dart';
import '../../auth/application/auth_controller.dart';
import '../data/outbox_repository.dart';
import 'sync_engine.dart';

class SyncStatus {
  const SyncStatus({this.running = false, this.last, this.serverUnsupported = false});
  final bool running;
  final SyncRunResult? last;
  final bool serverUnsupported;
}

/// Sync triggers (ADR 0010 decision 12): after login/app start, when connectivity returns, after each
/// enqueue ([requestSync]) and manually. WorkManager background runs are a later step (F4b).
final syncCoordinatorProvider = NotifierProvider<SyncCoordinator, SyncStatus>(SyncCoordinator.new);

final outboxCountsProvider = StreamProvider<OutboxCounts>((ref) {
  final sub = ref.watch(currentSubProvider);
  if (sub == null) return Stream.value(const OutboxCounts());
  return ref.watch(outboxRepositoryProvider).watchCounts(sub);
});

class SyncCoordinator extends Notifier<SyncStatus> {
  StreamSubscription<void>? _online;
  Timer? _debounce;

  @override
  SyncStatus build() {
    _online = ref.watch(onlineAgainProvider).listen((_) => requestSync());
    ref.listen<String?>(currentSubProvider, (prev, next) {
      if (next != null && prev != next) {
        unawaited(ref.read(mastersRepositoryProvider).refresh(next));
        requestSync();
      }
    }, fireImmediately: true);
    ref.onDispose(() {
      _online?.cancel();
      _debounce?.cancel();
    });
    return const SyncStatus();
  }

  void requestSync({Duration delay = const Duration(milliseconds: 500)}) {
    _debounce?.cancel();
    _debounce = Timer(delay, () => unawaited(runNow()));
  }

  Future<SyncRunResult?> runNow() async {
    final sub = ref.read(currentSubProvider);
    if (sub == null || state.running) return null;
    if (!ref.read(connectivityProvider)) return const SyncRunResult(SyncRunOutcome.offline);
    state = SyncStatus(running: true, last: state.last, serverUnsupported: state.serverUnsupported);
    try {
      final r = await ref.read(syncEngineProvider).run(sub);
      state = SyncStatus(last: r, serverUnsupported: r.outcome == SyncRunOutcome.serverUnsupported);
      return r;
    } on Object catch (e) {
      Log.w('sync: run failed', e);
      state = SyncStatus(last: state.last, serverUnsupported: state.serverUnsupported);
      return null;
    }
  }
}
