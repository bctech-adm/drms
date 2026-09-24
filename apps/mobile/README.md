# ProyekKas — Android app (Flutter)

Flutter **3.47.5** / Dart 3.13.4, Android minSdk 24 / target 36, package `id.co.drms.proyekkas`
(ADR 0010). Feature-first layout under `lib/features/<feature>/{domain,data,application,presentation}`;
Riverpod, go_router, drift + SQLite3MultipleCiphers (encrypted DB), dio, flutter_appauth (Keycloak PKCE).
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

## OIDC redirect: App Link vs. fallback scheme

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
