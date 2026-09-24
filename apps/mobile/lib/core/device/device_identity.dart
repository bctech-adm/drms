import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:uuid/uuid.dart';

import '../network/api_client.dart';
import '../storage/secure_store.dart';

/// Install id (`X-Device-Id`, ADR 0003 §5) + app version + model. A revoked install id can never
/// be re-activated server-side, so [rotate] generates a fresh one (devices.ts "Pasang ulang").
class DeviceIdentity implements ClientHeaders {
  DeviceIdentity._(this._store, this._deviceId, this.appVersion, this.model);

  final SecureStore _store;
  String _deviceId;
  @override
  final String appVersion;
  final String model;

  @override
  String get deviceId => _deviceId;

  static Future<DeviceIdentity> load(SecureStore store) async {
    var id = await store.read(SecureKeys.installId);
    if (id == null) {
      id = const Uuid().v4();
      await store.write(SecureKeys.installId, id);
    }
    var version = '0.0.0';
    var model = 'android';
    try {
      version = (await PackageInfo.fromPlatform()).version;
      final a = await DeviceInfoPlugin().androidInfo;
      model = '${a.manufacturer} ${a.model}';
    } on Object {
      // Not on Android (tests): keep defaults.
    }
    return DeviceIdentity._(store, id, version, model.length > 128 ? model.substring(0, 128) : model);
  }

  /// For tests.
  static DeviceIdentity fixed(SecureStore store, {required String deviceId, String appVersion = '0.1.0'}) =>
      DeviceIdentity._(store, deviceId, appVersion, 'test');

  Future<void> rotate() async {
    _deviceId = const Uuid().v4();
    await _store.write(SecureKeys.installId, _deviceId);
  }
}
