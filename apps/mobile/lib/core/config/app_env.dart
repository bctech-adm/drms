/// Build-time configuration injected with `--dart-define-from-file=config/<flavor>.json`
/// (no secrets: URLs and the public OIDC client id only — ADR 0003, no client secret in the APK).
class AppEnv {
  const AppEnv({
    required this.flavor,
    required this.apiBaseUrl,
    required this.oidcIssuer,
    required this.oidcClientId,
    required this.oidcRedirectUri,
    required this.pushEnabled,
  });

  factory AppEnv.fromEnvironment() => const AppEnv(
    flavor: String.fromEnvironment('PK_FLAVOR', defaultValue: 'staging'),
    apiBaseUrl: String.fromEnvironment('PK_API_BASE_URL', defaultValue: 'https://drms-kas.staging.bimacreative.tech'),
    oidcIssuer: String.fromEnvironment(
      'PK_OIDC_ISSUER',
      defaultValue: 'https://auth.bimacreative.tech/realms/drms-staging',
    ),
    oidcClientId: String.fromEnvironment('PK_OIDC_CLIENT_ID', defaultValue: 'proyekkas-mobile'),
    oidcRedirectUri: String.fromEnvironment(
      'PK_OIDC_REDIRECT_URI',
      defaultValue: 'https://drms-kas.staging.bimacreative.tech/app/callback',
    ),
    // Push (FCM, ADR 0011) stays off until the Firebase project exists (Q-44).
    pushEnabled: bool.fromEnvironment('PK_PUSH_ENABLED'),
  );

  final String flavor;
  final String apiBaseUrl;
  final String oidcIssuer;
  final String oidcClientId;
  final String oidcRedirectUri;
  final bool pushEnabled;

  static const scopes = ['openid', 'offline_access'];

  bool get isProd => flavor == 'prod';

  String get apiV1 => '$apiBaseUrl/api/v1';

  /// Keycloak OIDC endpoints (ADR 0003 "Keycloak 26.7.4 facts used").
  String get tokenEndpoint => '$oidcIssuer/protocol/openid-connect/token';
  String get authorizationEndpoint => '$oidcIssuer/protocol/openid-connect/auth';
  String get endSessionEndpoint => '$oidcIssuer/protocol/openid-connect/logout';
}
