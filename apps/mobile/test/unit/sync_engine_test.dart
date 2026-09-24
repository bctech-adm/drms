import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:proyekkas/core/db/app_database.dart';
import 'package:proyekkas/core/time/device_clock.dart';
import 'package:proyekkas/core/util/async_lock.dart';
import 'package:proyekkas/features/expense/application/draft_service.dart';
import 'package:proyekkas/features/expense/data/draft_repository.dart';
import 'package:proyekkas/features/expense/data/expense_api.dart';
import 'package:proyekkas/features/expense/domain/draft.dart';
import 'package:proyekkas/features/sync/application/sync_engine.dart';
import 'package:proyekkas/features/sync/data/outbox_repository.dart';
import 'package:proyekkas/features/sync/data/sync_api.dart';

import '../support/harness.dart';
import '../support/mock_server.dart';
import '../support/seed.dart';

const sub = 'user-sub-1';

void main() {
  late MockServer server;
  late AppDatabase db;
  late DraftRepository drafts;
  late OutboxRepository outbox;
  late SyncEngine engine;
  late DraftService service;
  late FakeDeviceClock clock;

  setUp(() async {
    server = await MockServer.start();
    db = memoryDb();
    drafts = DraftRepository(db);
    outbox = OutboxRepository(db);
    clock = FakeDeviceClock(now: DateTime(2026, 9, 21, 12, 50), elapsed: 89200000, boot: 'b-7');
    final client = testClient(server.base, StaticTokens());
    final lock = AsyncLock();
    engine = SyncEngine(
      outbox: outbox,
      drafts: drafts,
      api: SyncApi(client),
      db: db,
      clock: clock,
      deviceId: () => '5b0c2f7e-2d1a-4e0b-8f5e-7a9d3c1b2e44',
      lock: lock,
    );
    service = DraftService(drafts: drafts, outbox: outbox, api: ExpenseApi(client), clock: clock, lock: lock);
  });

  tearDown(() async {
    await db.close();
    await server.close();
  });

  Future<DraftRequest> saveSeed() async {
    final d = seedDraft();
    for (final m in d.mediaUuids) {
      await drafts.addMedia(sub, uuid: m, kind: 'receipt', bytes: Uint8List.fromList([1, 2, 3]), sha256: 'sha-$m');
    }
    return service.save(sub, d, online: false);
  }

  Map<String, dynamic> resultFor(String body, String status, {Map<String, dynamic> extra = const {}}) {
    final j = jsonDecode(body) as Map<String, dynamic>;
    return {
      'batch_id': j['batch_id'],
      'server_time': '2026-09-21T05:10:02Z',
      'results': [
        for (final i in j['items'] as List) {'client_uuid': (i as Map)['client_uuid'], 'status': status, ...extra},
      ],
    };
  }

  test('save → queued draft with photos kept in the encrypted DB, locked to the user', () async {
    final saved = await saveSeed();
    expect(saved.syncState, DraftSyncState.queued);
    final loaded = await drafts.load(sub, saved.clientUuid);
    expect(loaded!.previewGrandTotal, 1447500);
    expect(loaded.receiptCount, 3);
    expect(await drafts.load('other-user', saved.clientUuid), isNull);
    expect(await outbox.due('other-user', clock.now()), isEmpty);
    final due = await outbox.due(sub, clock.now());
    expect(due.single.opUuid, saved.clientUuid, reason: 'first op uses the draft uuid (ADR Example B)');
    expect(await drafts.queueBytes(sub), 9);
  });

  test('editing before sending updates the same queued operation (no duplicates)', () async {
    final saved = await saveSeed();
    await service.save(sub, saved.copyWith(title: 'Judul baru'), online: false);
    final due = await outbox.due(sub, clock.now());
    expect(due, hasLength(1));
    expect((jsonDecode(due.single.payloadJson) as Map)['title'], 'Judul baru');
  });

  test('media first, then batch; applied → synced with server id/rev; clock pair sent', () async {
    await saveSeed();
    server.on('PUT', '/api/v1/sync/media/*', (req, body) => (200, {'status': 'stored'}));
    server.on(
      'POST',
      '/api/v1/sync/batch',
      (req, body) => (200, resultFor(body, 'applied', extra: {'server_id': '77', 'rev': 1})),
    );
    final r = await engine.run(sub);
    expect(r.outcome, SyncRunOutcome.done);
    final paths = server.pathsCalled().toList();
    expect(paths.where((p) => p.startsWith('PUT /api/v1/sync/media/')), hasLength(3));
    expect(paths.last, 'POST /api/v1/sync/batch');
    final batchCall = server.calls.last;
    expect(batchCall.$3['idempotency-key'], isNotEmpty);
    expect(batchCall.$3['x-device-id'], '5b0c2f7e-2d1a-4e0b-8f5e-7a9d3c1b2e44');
    final sent = jsonDecode(batchCall.$4) as Map<String, dynamic>;
    expect((sent['clock'] as Map)['boot_id'], 'b-7');
    expect((sent['items'] as List).single['depends_on'], hasLength(3));
    final d = await drafts.load(sub, seedDraft().clientUuid);
    expect(d!.syncState, DraftSyncState.synced);
    expect(d.serverId, 77);
    expect(d.serverRev, 1);
    expect(await outbox.due(sub, clock.now()), isEmpty);

    // Next run: nothing to do; media are not re-uploaded.
    expect((await engine.run(sub)).outcome, SyncRunOutcome.nothingToDo);

    // A second batch carries the last server time (same boot) for time estimation.
    await service.save(sub, d.copyWith(title: 'Edit setelah sinkron'), online: false);
    await engine.run(sub);
    final sent2 = jsonDecode(server.calls.last.$4) as Map<String, dynamic>;
    expect((sent2['clock'] as Map)['last_server_time'], '2026-09-21T05:10:02Z');
    final item2 = (sent2['items'] as List).single as Map<String, dynamic>;
    expect(item2['client_uuid'], isNot(seedDraft().clientUuid), reason: 'edits after apply get a new op id');
    expect((item2['payload'] as Map)['draft_client_uuid'], seedDraft().clientUuid);
    expect(item2['base_rev'], 1);
  });

  test('duplicate counts as delivered (replayed client_uuid)', () async {
    await saveSeed();
    server.on('PUT', '/api/v1/sync/media/*', (req, body) => (200, {}));
    server.on(
      'POST',
      '/api/v1/sync/batch',
      (req, body) => (200, resultFor(body, 'duplicate', extra: {'server_id': '77', 'rev': 1})),
    );
    expect((await engine.run(sub)).applied, 1);
    expect((await drafts.load(sub, seedDraft().clientUuid))!.syncState, DraftSyncState.synced);
  });

  test('rejected is never retried and the message is shown', () async {
    await saveSeed();
    server.on('PUT', '/api/v1/sync/media/*', (req, body) => (200, {}));
    server.on(
      'POST',
      '/api/v1/sync/batch',
      (req, body) => (
        200,
        resultFor(
          body,
          'rejected',
          extra: {
            'errors': [
              {'code': 'NOT_EDITABLE', 'message': 'x'},
            ],
          },
        ),
      ),
    );
    final r = await engine.run(sub);
    expect(r.rejected, 1);
    final d = await drafts.load(sub, seedDraft().clientUuid);
    expect(d!.syncState, DraftSyncState.rejected);
    expect(d.lastError, contains('tidak bisa diubah'));
    clock.current = clock.current.add(const Duration(days: 1));
    expect(await outbox.due(sub, clock.now()), isEmpty);
  });

  test('deferred is retried later with back-off', () async {
    await saveSeed();
    server.on('PUT', '/api/v1/sync/media/*', (req, body) => (200, {}));
    server.on('POST', '/api/v1/sync/batch', (req, body) => (200, resultFor(body, 'deferred')));
    expect((await engine.run(sub)).deferred, 1);
    expect(await outbox.due(sub, clock.now()), isEmpty, reason: 'not due before the back-off');
    clock.current = clock.current.add(const Duration(minutes: 11));
    final due = await outbox.due(sub, clock.now());
    expect(due.single.attempts, 1);
  });

  test('conflict: server wins, local copy kept as "Salinan konflik"', () async {
    await saveSeed();
    server.on('PUT', '/api/v1/sync/media/*', (req, body) => (200, {}));
    server.on(
      'POST',
      '/api/v1/sync/batch',
      (req, body) => (
        200,
        resultFor(
          body,
          'conflict',
          extra: {
            'server_id': '77',
            'rev': 3,
            'server_copy': {'status': 'draft', 'grand_total': 1000},
          },
        ),
      ),
    );
    expect((await engine.run(sub)).conflicts, 1);
    final row = await (db.select(db.localDrafts)).getSingle();
    expect(row.syncState, 'conflict');
    expect(row.conflictCopyJson, contains('grand_total'));
    expect(row.title, seedDraft().title, reason: 'local version is kept');
  });

  test('endpoint not deployed (404) → items stay queued, outcome serverUnsupported', () async {
    await saveSeed();
    final r = await engine.run(sub);
    expect(r.outcome, SyncRunOutcome.serverUnsupported);
    final row = await (db.select(db.outbox)).getSingle();
    expect(row.status, 'pending');
    expect(row.lastErrorCode, 'SYNC_UNAVAILABLE');
  });

  test('offline (connection refused) → nothing changes', () async {
    await saveSeed();
    await server.close();
    final r = await engine.run(sub);
    expect(r.outcome, SyncRunOutcome.offline);
    final row = await (db.select(db.outbox)).getSingle();
    expect(row.attempts, 0);
  });

  test('media 409 (same uuid, other bytes) rejects the item', () async {
    await saveSeed();
    server.on(
      'PUT',
      '/api/v1/sync/media/*',
      (req, body) => (409, {'type': 'about:blank', 'title': 'Conflict', 'status': 409}),
    );
    await engine.run(sub);
    final row = await (db.select(db.outbox)).getSingle();
    expect(row.status, 'rejected');
    expect(row.lastErrorCode, 'MEDIA_CONFLICT');
  });

  test('after 20 failed attempts the item shows "Gagal dikirim" and can be retried manually', () async {
    await saveSeed();
    final op = (await outbox.due(sub, clock.now())).single.opUuid;
    await outbox.defer(op, 20, clock.now());
    expect((await (db.select(db.outbox)).getSingle()).status, 'failed');
    await outbox.retryFailed(sub);
    expect((await outbox.due(sub, clock.now())).single.attempts, 0);
  });

  test('queue budget 100 MB is enforced', () async {
    final big = Uint8List(60 * 1024 * 1024);
    await drafts.addMedia(sub, uuid: 'm1', kind: 'receipt', bytes: big, sha256: 'a');
    expect(
      () => drafts.addMedia(sub, uuid: 'm2', kind: 'receipt', bytes: big, sha256: 'b'),
      throwsA(isA<QueueFullException>()),
    );
  });
}
