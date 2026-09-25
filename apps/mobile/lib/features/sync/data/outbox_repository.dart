import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../../core/db/app_database.dart';
import '../domain/sync_models.dart';

class OutboxCounts {
  const OutboxCounts({this.pending = 0, this.failed = 0, this.rejected = 0});
  final int pending;
  final int failed;
  final int rejected;
  int get attention => failed + rejected;
}

class OutboxRepository {
  OutboxRepository(this.db);
  final AppDatabase db;

  /// Queues (or refreshes) the upsert of one draft. A still-pending operation for the same draft is
  /// updated in place (same idempotency key, never sent successfully). The first operation of a draft
  /// uses the draft uuid as `client_uuid` (ADR 0010 Example B); later edits get a new UUIDv7.
  Future<String> enqueueDraftUpsert({
    required String sub,
    required String draftUuid,
    required Map<String, dynamic> Function(bool includeDraftId) payload,
    required List<String> dependsOn,
    required String deviceTime,
    required int elapsedMs,
    required String bootId,
    required bool offline,
    int? baseRev,
    DateTime? now,
  }) => db.transaction(() async {
    final ts = now ?? DateTime.now();
    final pending =
        await (db.select(db.outbox)..where(
              (t) =>
                  t.targetUuid.equals(draftUuid) &
                  t.userSub.equals(sub) &
                  t.type.equals(SyncItemType.expenseDraftUpsert) &
                  t.status.equals('pending'),
            ))
            .getSingleOrNull();
    if (pending != null) {
      await (db.update(db.outbox)..where((t) => t.opUuid.equals(pending.opUuid))).write(
        OutboxCompanion(
          payloadJson: Value(jsonEncode(payload(pending.opUuid != draftUuid))),
          dependsOnJson: Value(jsonEncode(dependsOn)),
          deviceTime: Value(deviceTime),
          elapsedMs: Value(elapsedMs),
          bootId: Value(bootId),
          offline: Value(offline),
          baseRev: Value(baseRev),
          nextAttemptAt: const Value(null),
        ),
      );
      return pending.opUuid;
    }
    final anyBefore = await (db.select(db.outbox)..where((t) => t.opUuid.equals(draftUuid))).getSingleOrNull();
    final opUuid = anyBefore == null ? draftUuid : const Uuid().v7();
    await db
        .into(db.outbox)
        .insert(
          OutboxCompanion.insert(
            opUuid: opUuid,
            userSub: sub,
            type: SyncItemType.expenseDraftUpsert,
            targetUuid: draftUuid,
            payloadJson: jsonEncode(payload(opUuid != draftUuid)),
            baseRev: Value(baseRev),
            dependsOnJson: Value(jsonEncode(dependsOn)),
            deviceTime: deviceTime,
            elapsedMs: elapsedMs,
            bootId: bootId,
            offline: Value(offline),
            createdAt: ts,
          ),
        );
    return opUuid;
  });

  /// True when an operation for [target] was delivered (the server knows the draft).
  Future<bool> wasApplied(String sub, String target) async => (await (db.select(
    db.outbox,
  )..where((t) => t.userSub.equals(sub) & t.targetUuid.equals(target) & t.status.equals('applied'))).get()).isNotEmpty;

  Future<String> enqueueDraftDelete({
    required String sub,
    required String draftUuid,
    required Map<String, dynamic> payload,
    required String deviceTime,
    required int elapsedMs,
    required String bootId,
    required bool offline,
  }) async {
    final opUuid = const Uuid().v7();
    await db
        .into(db.outbox)
        .insert(
          OutboxCompanion.insert(
            opUuid: opUuid,
            userSub: sub,
            type: SyncItemType.expenseDraftDelete,
            targetUuid: draftUuid,
            payloadJson: jsonEncode(payload),
            deviceTime: deviceTime,
            elapsedMs: elapsedMs,
            bootId: bootId,
            offline: Value(offline),
            createdAt: DateTime.now(),
          ),
        );
    return opUuid;
  }

  /// Queues one attendance check-in/out (ADR 0010 Example A). Never merged or edited: every tap is its
  /// own item; the selfie is uploaded first ([dependsOn] = local media uuid).
  Future<String> enqueueAttendance({
    required String sub,
    required String type,
    required Map<String, dynamic> payload,
    required String selfieUuid,
    required String deviceTime,
    required int elapsedMs,
    required String bootId,
    required bool offline,
  }) async {
    final opUuid = const Uuid().v7();
    await db
        .into(db.outbox)
        .insert(
          OutboxCompanion.insert(
            opUuid: opUuid,
            userSub: sub,
            type: type,
            targetUuid: opUuid,
            payloadJson: jsonEncode(payload),
            dependsOnJson: Value(jsonEncode([selfieUuid])),
            deviceTime: deviceTime,
            elapsedMs: elapsedMs,
            bootId: bootId,
            offline: Value(offline),
            createdAt: DateTime.now(),
          ),
        );
    return opUuid;
  }

  /// Attendance items of [sub], newest first (attendance screen).
  Stream<List<OutboxData>> watchAttendance(String sub) =>
      (db.select(db.outbox)
            ..where(
              (t) =>
                  t.userSub.equals(sub) &
                  t.type.isIn([SyncItemType.attendanceCheckIn, SyncItemType.attendanceCheckOut]),
            )
            ..orderBy([(t) => OrderingTerm.desc(t.createdAt)])
            ..limit(20))
          .watch();

  /// Items of [sub] that may be sent now, in creation order.
  Future<List<OutboxData>> due(String sub, DateTime now) =>
      (db.select(db.outbox)
            ..where(
              (t) =>
                  t.userSub.equals(sub) &
                  t.status.equals('pending') &
                  (t.nextAttemptAt.isNull() | t.nextAttemptAt.isSmallerOrEqualValue(now)),
            )
            ..orderBy([(t) => OrderingTerm.asc(t.createdAt), (t) => OrderingTerm.asc(t.opUuid)]))
          .get();

  Future<List<OutboxData>> all(String sub) =>
      (db.select(db.outbox)
            ..where((t) => t.userSub.equals(sub))
            ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
          .get();

  Future<OutboxData?> pendingForTarget(String sub, String target) => (db.select(
    db.outbox,
  )..where((t) => t.userSub.equals(sub) & t.targetUuid.equals(target) & t.status.equals('pending'))).getSingleOrNull();

  Future<void> setStatus(String opUuid, String status, {String? code, String? message}) =>
      (db.update(db.outbox)..where((t) => t.opUuid.equals(opUuid))).write(
        OutboxCompanion(status: Value(status), lastErrorCode: Value(code), lastErrorMessage: Value(message)),
      );

  Future<void> defer(String opUuid, int attempts, DateTime next, {String? code, String? message}) =>
      (db.update(db.outbox)..where((t) => t.opUuid.equals(opUuid))).write(
        OutboxCompanion(
          attempts: Value(attempts),
          nextAttemptAt: Value(next),
          status: Value(attempts >= maxSyncAttempts ? 'failed' : 'pending'),
          lastErrorCode: Value(code),
          lastErrorMessage: Value(message),
        ),
      );

  /// Manual "Coba lagi" for items shown as "Gagal dikirim".
  Future<void> retryFailed(String sub) =>
      (db.update(db.outbox)..where((t) => t.userSub.equals(sub) & t.status.equals('failed'))).write(
        const OutboxCompanion(status: Value('pending'), attempts: Value(0), nextAttemptAt: Value(null)),
      );

  /// Pending ops of a draft that was submitted online are obsolete.
  Future<void> supersede(String sub, String target) =>
      (db.update(db.outbox)
            ..where((t) => t.userSub.equals(sub) & t.targetUuid.equals(target) & t.status.equals('pending')))
          .write(const OutboxCompanion(status: Value('superseded')));

  Stream<OutboxCounts> watchCounts(String sub) {
    final q = db.select(db.outbox)..where((t) => t.userSub.equals(sub));
    return q.watch().map(
      (rows) => OutboxCounts(
        pending: rows.where((r) => r.status == 'pending').length,
        failed: rows.where((r) => r.status == 'failed').length,
        rejected: rows.where((r) => r.status == 'rejected' || r.status == 'conflict').length,
      ),
    );
  }

  /// Local photo ids this item needs uploaded first (kept local; the wire `depends_on` lists items).
  static List<String> mediaDeps(OutboxData r) =>
      (jsonDecode(r.dependsOnJson) as List<dynamic>).map((e) => '$e').toList();

  static QueuedItem toQueued(OutboxData r, Map<String, dynamic> payload) => QueuedItem(
    clientUuid: r.opUuid,
    type: r.type,
    payload: payload,
    deviceTime: r.deviceTime,
    elapsedMs: r.elapsedMs,
    bootId: r.bootId,
    offline: r.offline,
    baseRev: r.baseRev,
  );
}
