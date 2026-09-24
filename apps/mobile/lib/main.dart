import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app/app.dart';
import 'app/providers.dart';
import 'core/config/app_env.dart';
import 'core/db/app_database.dart';
import 'core/device/device_identity.dart';
import 'core/storage/secure_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id');
  final env = AppEnv.fromEnvironment();
  final store = PlatformSecureStore();
  final device = await DeviceIdentity.load(store);
  final db = await openEncryptedDatabase(store);
  runApp(
    ProviderScope(
      overrides: [
        appEnvProvider.overrideWithValue(env),
        secureStoreProvider.overrideWithValue(store),
        deviceIdentityProvider.overrideWithValue(device),
        databaseProvider.overrideWithValue(db),
      ],
      child: const ProyekKasApp(),
    ),
  );
}
