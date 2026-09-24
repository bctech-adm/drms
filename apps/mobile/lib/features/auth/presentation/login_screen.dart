import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../core/connectivity/connectivity_controller.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../application/auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _busy = false;
  String? _error;

  Future<void> _login() async {
    final t = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    final res = await ref.read(authControllerProvider.notifier).login();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = switch (res) {
        null => null,
        'cancelled' => t.loginCancelled,
        'network' => t.loginNeedsInternet,
        'failed' => t.loginFailed,
        final String msg => msg,
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final env = ref.watch(appEnvProvider);
    final online = ref.watch(connectivityProvider);
    final auth = ref.watch(authControllerProvider);
    final notice = auth is AuthSignedOut ? (auth.message == 'session_ended' ? t.sessionEnded : auth.message) : null;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              const Icon(Icons.account_balance_wallet, size: 80),
              const SizedBox(height: 16),
              Text(t.loginTitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall),
              if (!env.isProd)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Center(child: Chip(label: Text(t.stagingBadge))),
                ),
              const SizedBox(height: 12),
              Text(t.loginSubtitle, textAlign: TextAlign.center),
              const Spacer(),
              if (notice != null)
                Card(
                  color: Theme.of(context).colorScheme.errorContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text(notice, key: const Key('login-notice')),
                  ),
                ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              FilledButton.icon(
                key: const Key('login-button'),
                onPressed: _busy || !online ? null : _login,
                icon: _busy
                    ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.login),
                label: Text(t.loginButton),
              ),
              if (!online)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(t.loginNeedsInternet, textAlign: TextAlign.center),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
