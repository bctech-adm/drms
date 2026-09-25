# ProyekKas — Android app (Flutter)

Flutter **3.47.5** / Dart 3.13.4, Android minSdk 24 / target 36, package `id.co.drms.proyekkas`
(ADR 0010). Feature-first layout under `lib/features/<feature>/{domain,data,application,presentation}`;
Riverpod, go_router, drift + SQLite3MultipleCiphers (encrypted DB), dio, flutter_appauth (Keycloak PKCE;
staging uses the in-app password login instead, see below).
All UI text is Bahasa Indonesia (`lib/l10n/app_id.arb`).

## Build flavors

| Flavor | Config | API / Keycloak realm |
|---|---|---|
| `staging` | `config/staging.json` | `https://drms-kas.staging.bimacreative.tech`, realm `drms-staging` |
| `prod` | `config/prod.json` | `https://drms-kas.bimacreative.tech`, realm `drms` |

```sh
flutter pub get --enforce-lockfile
dart run build_runner build --delete-conflicting-outputs   # drift / freezed (generated files are committed)
flutter analyze && flutter test
flutter build apk --debug --flavor staging --dart-define-from-file=config/staging.json \
  --dart-define=PK_OIDC_REDIRECT_URI=id.co.drms.proyekkas:/oauth2redirect
```

The config files hold URLs and the public client id only. Nothing in them is secret.
Push is off (`PK_PUSH_ENABLED=false`, no `google-services.json`) until the Firebase project exists (Q-44).
Until then the home screen bell polls `GET /api/v1/notifications` (every 2 minutes while shown). What FCM needs:
`docs/proyekkas/f4/f4-gap-analysis.md` §4.

## Device security (F4b)

- **Remote revoke:** a `401` with `code: DEVICE_REVOKED` ends the session at once (no token refresh), gives the
  install a new id and shows "Perangkat ini sudah dicabut …" on the login screen.
- **Integrity signals** (ADR 0010 decision 10): `MainActivity.kt` channel `id.co.drms.proyekkas/integrity` reports
  root (su/Magisk files, `test-keys`), emulator, developer options and ADB. They are sent in
  `POST /devices/register` at every start/login, recorded on the server and **never block** (Q-43). Mock location is
  checked per GPS fix (`Position.isMocked`) at attendance. Both the phone and the server refuse a fake location.

## Online state, logout, start-up (phone fixes, ADR 0010 "Phone test fixes")

- **Online** = the server answered the last request (any HTTP status). No answer → red banner "Offline …" and a
  `GET /api/v1/health` probe every 3–60 s until the server answers; tap the banner to check at once. Mobile data,
  Wi-Fi, VPN and "other" all count as a network; a wrong "none" from Android no longer sticks.
- **Logout** always returns to the login screen: device revoke + Keycloak logout get at most 5 s together, then the
  local session is cleared even offline. Unsent data is **kept** (encrypted, locked to the same user); the dialog warns
  and asks "Tetap keluar".
- **Start-up**: home is shown from the cached profile at once; device registration, `/me`, `/app/config`, masters and
  notifications load in the background. `flutter run` (debug) prints `[pk.startup] +… ms` marks.

## Attendance (F4 slice)

`/attendance` (home button "Absensi", enabled when `/app/config` `features.syncAttendance` is true = company setting
"Absensi dari APK"): pick an assigned project, tap Absen masuk/pulang → GPS fix (geolocator 14.0.3, while-in-use
permission only) → the phone checks the radius and refuses mock locations → front-camera selfie (no gallery)
compressed to 720 px / ≤ 150 KB → queued in the encrypted outbox → `POST /media/selfies` + `attendance.check_*`
sync item. Works offline; the server decides and stamps the time (ADR 0010 decisions 7/8).

## APK secret scan

`tool/apk_secret_scan.sh <apk>…` (python3 + docker) unpacks the APK, dumps strings from dex / `libapp.so`, fails on
signing material or `google-services.json` inside the APK, on server secret names, and on gitleaks/trivy findings.
CI runs it on every APK it builds. Allow-listed false positives live in `tool/apk-gitleaks.toml`, each with a reason.

## Login mode (`PK_LOGIN_MODE`, ADR 0012)

| Value | Flow | Used by |
|---|---|---|
| `browser` (default) | Authorization Code + PKCE in a Custom Tab (flutter_appauth, ADR 0003) | `config/prod.json` (prod decision open, F6) |
| `password` | In-app form, Keycloak Direct Access Grant (`grant_type=password`) to `<issuer>/protocol/openid-connect/token`; logout = `POST <issuer>/protocol/openid-connect/logout` with `client_id` + `refresh_token` | `config/staging.json` |

`password` needs **Direct Access Grants** enabled on Keycloak client `proyekkas-mobile` (otherwise the app shows
"Login langsung belum diaktifkan di server"). Users with a pending required action (e.g. a temporary password)
cannot log in this way and must set their password on the web first. Rollback: build with
`--dart-define=PK_LOGIN_MODE=browser` and turn Direct Access Grants off again. Token refresh is the same plain
`refresh_token` grant in both modes (`TokenManager`).

## OIDC redirect: App Link vs. fallback scheme (browser mode)

- **App Link** `https://<host>/app/callback` is the default (ADR 0003/0010). Android only verifies it when the
  APK is signed with a key whose SHA-256 is listed in the server's `/.well-known/assetlinks.json` (env
  `ANDROID_APP_CERT_SHA256`). The server has **no** page at `/app/callback`. With an unverified link the browser
  opens that URL and the user is left on it. The login screen then says to close the browser and try again.
- **Fallback** `id.co.drms.proyekkas:/oauth2redirect` (private-use scheme, lowercase) is used for builds without
  the stable key, e.g. the CI debug APK (`--dart-define=PK_OIDC_REDIRECT_URI=…`). Keycloak client
  `proyekkas-mobile` must allow this redirect URI.

## Staging signing key (stable, for App Link verification)

Generate the key once, offline, on a trusted machine. Never commit it.

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore proyekkas-staging.jks \
  -alias proyekkas-staging -keyalg RSA -keysize 4096 -validity 9125 \
  -dname "CN=ProyekKas Staging, O=DRMS, C=ID"
# SHA-256 of the signing certificate → server env ANDROID_APP_CERT_SHA256 (staging)
keytool -list -v -keystore proyekkas-staging.jks -alias proyekkas-staging | grep 'SHA256:'
# GitHub secret ANDROID_STAGING_KEYSTORE_B64
base64 -w0 proyekkas-staging.jks
```

GitHub secrets for `.github/workflows/mobile.yml`: `ANDROID_STAGING_KEYSTORE_B64`, `ANDROID_STAGING_KEY_ALIAS`,
`ANDROID_STAGING_KEYSTORE_PASSWORD`, `ANDROID_STAGING_KEY_PASSWORD`. With PKCS12 both passwords are the same.
If the secrets are missing, CI builds only the debug APK. The production key (`ANDROID_KEYSTORE_*`) is
a separate key with two custodians (ADR 0010 decision 13). Gradle reads signing only from
`ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`
(see `android/app/build.gradle.kts`).
