import 'dart:convert';
import 'dart:math';

import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';
import 'package:sqlite3/common.dart' show CommonDatabase;

import '../storage/secure_store.dart';

part 'app_database.g.dart';

/// Local draft expense request (header). Every row is locked to the Keycloak `sub` that created it
/// (ADR 0010 decision 3: after a remote logout the queue is kept but only usable by the same user).
class LocalDrafts extends Table {
  TextColumn get clientUuid => text()();
  TextColumn get userSub => text()();
  TextColumn get type => text()(); // advance | reimburse
  TextColumn get title => text().withDefault(const Constant(''))();
  IntColumn get projectId => integer().nullable()();
  IntColumn get costCenterId => integer().nullable()();
  TextColumn get neededDate => text().nullable()();
  TextColumn get notes => text().nullable()();
  TextColumn get requesterIdsJson => text().withDefault(const Constant('[]'))();
  IntColumn get bankAccountId => integer().nullable()();
  IntColumn get serverId => integer().nullable()();
  IntColumn get serverRev => integer().nullable()();

  /// local | queued | synced | conflict | rejected | submitted
  TextColumn get syncState => text().withDefault(const Constant('local'))();
  TextColumn get lastError => text().nullable()();
  TextColumn get conflictCopyJson => text().nullable()();
  BoolColumn get deleted => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {clientUuid};
}

class LocalLines extends Table {
  TextColumn get clientUuid => text()();
  TextColumn get draftUuid => text().references(LocalDrafts, #clientUuid)();
  IntColumn get no => integer()();
  TextColumn get description => text().withDefault(const Constant(''))();
  RealColumn get qty => real().nullable()();
  IntColumn get uomId => integer().nullable()();
  IntColumn get unitPrice => integer().nullable()();
  IntColumn get total => integer().nullable()();
  IntColumn get categoryId => integer().nullable()();
  IntColumn get vehicleId => integer().nullable()();
  TextColumn get notes => text().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {clientUuid};
}

class LocalReceipts extends Table {
  TextColumn get clientUuid => text()();
  TextColumn get lineUuid => text().references(LocalLines, #clientUuid)();
  TextColumn get draftUuid => text().references(LocalDrafts, #clientUuid)();
  TextColumn get receiptNo => text().nullable()();
  TextColumn get vendorName => text().withDefault(const Constant(''))();
  TextColumn get receiptDate => text()(); // YYYY-MM-DD
  TextColumn get receiptTime => text().nullable()(); // HH:mm
  IntColumn get amount => integer()();
  TextColumn get mediaUuid => text()();
  IntColumn get serverReceiptId => integer().nullable()();

  @override
  Set<Column<Object>> get primaryKey => {clientUuid};
}

/// Compressed photos waiting for upload, stored inside the encrypted DB (ADR 0010 decision 4 default).
class MediaBlobs extends Table {
  TextColumn get clientUuid => text()();
  TextColumn get userSub => text()();
  TextColumn get kind => text()(); // receipt | signature | ...
  TextColumn get mimeType => text().withDefault(const Constant('image/jpeg'))();
  BlobColumn get bytes => blob()();
  TextColumn get sha256 => text()();
  IntColumn get sizeBytes => integer()();
  BoolColumn get uploaded => boolean().withDefault(const Constant(false))();
  TextColumn get serverMediaId => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {clientUuid};
}

/// Offline outbox (`POST /api/v1/sync/batch` items). `opUuid` = item `client_uuid` = idempotency key.
class Outbox extends Table {
  TextColumn get opUuid => text()();
  TextColumn get userSub => text()();
  TextColumn get type => text()();
  TextColumn get targetUuid => text()();
  TextColumn get payloadJson => text()();
  IntColumn get baseRev => integer().nullable()();
  TextColumn get dependsOnJson => text().withDefault(const Constant('[]'))();
  TextColumn get deviceTime => text()();
  IntColumn get elapsedMs => integer()();
  TextColumn get bootId => text()();
  BoolColumn get offline => boolean().withDefault(const Constant(true))();

  /// pending | applied | rejected | conflict | failed
  TextColumn get status => text().withDefault(const Constant('pending'))();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  DateTimeColumn get nextAttemptAt => dateTime().nullable()();
  TextColumn get lastErrorCode => text().nullable()();
  TextColumn get lastErrorMessage => text().nullable()();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column<Object>> get primaryKey => {opUuid};
}

/// Small key/value cache (masters JSON, last server time pair, …).
class KvEntries extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();

  @override
  Set<Column<Object>> get primaryKey => {key};
}

@DriftDatabase(tables: [LocalDrafts, LocalLines, LocalReceipts, MediaBlobs, Outbox, KvEntries])
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    beforeOpen: (details) async {
      await customStatement('PRAGMA foreign_keys = ON');
    },
  );

  Future<String?> kvGet(String key) async =>
      (await (select(kvEntries)..where((t) => t.key.equals(key))).getSingleOrNull())?.value;

  Future<void> kvPut(String key, String value) =>
      into(kvEntries).insertOnConflictUpdate(KvEntriesCompanion.insert(key: key, value: value));

  Future<Map<String, dynamic>?> kvGetJson(String key) async {
    final v = await kvGet(key);
    if (v == null) return null;
    final decoded = jsonDecode(v);
    return decoded is Map<String, dynamic> ? decoded : null;
  }
}

/// Opens the encrypted database (drift + SQLite3MultipleCiphers, ADR 0010 decision 4). The 256-bit
/// key is generated on first run and kept in [SecureStore] (Android Keystore-backed). Fails closed
/// when the SQLite library has no cipher support.
Future<AppDatabase> openEncryptedDatabase(SecureStore store) async {
  final key = await loadOrCreateDbKey(store);
  return AppDatabase(
    driftDatabase(
      name: 'proyekkas',
      native: DriftNativeOptions(setup: (CommonDatabase db) => applyCipherKey(db, key)),
    ),
  );
}

/// Applied in the drift background isolate; must only capture sendable values (drift_flutter docs).
void applyCipherKey(CommonDatabase db, String key) {
  final cipher = db.select('PRAGMA cipher;');
  if (cipher.isEmpty) {
    throw StateError('SQLite tanpa enkripsi (sqlite3mc tidak aktif)');
  }
  db.execute("PRAGMA key = '${key.replaceAll("'", "''")}';");
}

Future<String> loadOrCreateDbKey(SecureStore store) async {
  final existing = await store.read(SecureKeys.dbKey);
  if (existing != null && existing.isNotEmpty) return existing;
  final rnd = Random.secure();
  final bytes = List<int>.generate(32, (_) => rnd.nextInt(256));
  final key = base64Url.encode(bytes).replaceAll('=', '');
  await store.write(SecureKeys.dbKey, key);
  return key;
}
