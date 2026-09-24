package id.co.drms.proyekkas

import android.os.SystemClock
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * Monotonic clock for the offline sync contract (ADR 0010 decision 7): `elapsed_ms` =
 * SystemClock.elapsedRealtime() (time since boot, not changeable by the user) and `boot_id` =
 * Settings.Global.BOOT_COUNT (API 24+), so the server can estimate the real time of offline items.
 */
class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "id.co.drms.proyekkas/clock")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "elapsedRealtime" -> result.success(SystemClock.elapsedRealtime())
                    "bootCount" -> {
                        val count = try {
                            Settings.Global.getInt(contentResolver, Settings.Global.BOOT_COUNT)
                        } catch (e: Settings.SettingNotFoundException) {
                            -1
                        }
                        result.success(count)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
