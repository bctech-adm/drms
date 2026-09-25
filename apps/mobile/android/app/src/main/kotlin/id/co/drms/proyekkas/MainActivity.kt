package id.co.drms.proyekkas

import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

/**
 * Monotonic clock for the offline sync contract (ADR 0010 decision 7): `elapsed_ms` =
 * SystemClock.elapsedRealtime() (time since boot, not changeable by the user) and `boot_id` =
 * Settings.Global.BOOT_COUNT (API 24+), so the server can estimate the real time of offline items.
 *
 * Device integrity signals (ADR 0010 decision 10, QM-4): best effort, only REPORTED to the server
 * (POST /api/v1/devices/register `integrity`), never used to block. No third-party plugin and no
 * extra permission: su/Magisk files + test-keys build tags (root), well-known emulator build
 * properties, and the Settings.Global developer-options / ADB switches.
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
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "id.co.drms.proyekkas/integrity")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "check" -> result.success(
                        mapOf(
                            "rooted" to isRooted(),
                            "emulator" to isEmulator(),
                            "developerMode" to globalFlag(Settings.Global.DEVELOPMENT_SETTINGS_ENABLED),
                            "adbEnabled" to globalFlag(Settings.Global.ADB_ENABLED),
                        ),
                    )
                    else -> result.notImplemented()
                }
            }
    }

    private fun globalFlag(name: String): Boolean =
        try {
            Settings.Global.getInt(contentResolver, name, 0) != 0
        } catch (e: SecurityException) {
            false
        }

    private fun isRooted(): Boolean {
        if (Build.TAGS?.contains("test-keys") == true) return true
        return SU_PATHS.any { path ->
            try {
                File(path).exists()
            } catch (e: SecurityException) {
                false
            }
        }
    }

    private fun isEmulator(): Boolean {
        val fp = Build.FINGERPRINT ?: ""
        val model = Build.MODEL ?: ""
        val product = Build.PRODUCT ?: ""
        val hardware = Build.HARDWARE ?: ""
        return fp.startsWith("generic") || fp.startsWith("unknown") || fp.contains("emulator") ||
            model.contains("google_sdk") || model.contains("Emulator") || model.contains("Android SDK built for") ||
            (Build.MANUFACTURER ?: "").contains("Genymotion") ||
            hardware == "goldfish" || hardware == "ranchu" ||
            product.startsWith("sdk") || product.contains("_sdk") || product.contains("emulator") ||
            ((Build.BRAND ?: "").startsWith("generic") && (Build.DEVICE ?: "").startsWith("generic"))
    }

    private companion object {
        val SU_PATHS = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/system/xbin/daemonsu",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/data/local/bin/su",
            "/data/local/xbin/su",
            "/su/bin/su",
            "/sbin/magisk",
            "/system/bin/magisk",
            "/data/adb/magisk",
        )
    }
}
