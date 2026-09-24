import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../shared/widgets/big_action_button.dart';
import '../../app_config/application/app_config_providers.dart';
import '../../app_config/domain/app_config.dart';
import '../../approvals/application/inbox_providers.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/domain/user_profile.dart';
import '../../expense/domain/request_status.dart';

/// Role home (Staff / PM / Owner / Finance) with big action buttons.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final profile = ref.watch(currentProfileProvider);
    if (profile == null) return const SizedBox.shrink();
    final gate = ref.watch(versionGateProvider);
    final latest = ref.watch(appConfigProvider).value?.latestAppVersion;
    final kind = profile.homeKind;
    final inboxCount = profile.hasApprovalInbox ? ref.watch(inboxProvider).value?.items.length : null;

    final actions = <Widget>[
      if (profile.hasApprovalInbox)
        BigActionButton(
          key: const Key('home-inbox'),
          icon: Icons.fact_check,
          label: t.actionInbox,
          badge: inboxCount == null || inboxCount == 0 ? null : '$inboxCount',
          subtitle: inboxCount == null ? null : t.inboxCount(inboxCount),
          onPressed: () => context.go('/inbox'),
        ),
      if (profile.canCreateRequests) ...[
        BigActionButton(
          key: const Key('home-new-advance'),
          icon: Icons.payments,
          label: t.actionNewAdvance,
          onPressed: () => context.push('/drafts/new?type=${RequestType.advance.code}'),
        ),
        BigActionButton(
          key: const Key('home-new-reimburse'),
          icon: Icons.receipt,
          label: t.actionNewReimburse,
          onPressed: () => context.push('/drafts/new?type=${RequestType.reimburse.code}'),
        ),
      ],
      BigActionButton(
        icon: Icons.list_alt,
        label: kind == HomeKind.owner || kind == HomeKind.finance ? t.actionAllRequests : t.actionMyRequests,
        onPressed: () => context.go('/requests'),
      ),
      if (profile.has(Role.staff) || profile.has(Role.pm))
        BigActionButton(icon: Icons.fingerprint, label: t.actionAttendance, onPressed: null),
      if (kind == HomeKind.finance)
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Text(t.financeHint))),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(t.appTitle),
        actions: [
          if (!ref.watch(appEnvProvider).isProd)
            Padding(padding: const EdgeInsets.only(right: 12), child: Chip(label: Text(t.stagingBadge))),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(authControllerProvider.notifier).refreshProfile();
          ref.invalidate(inboxProvider);
        },
        child: ListView(padding: const EdgeInsets.all(16), children: [
          Text(t.greeting(profile.displayName), style: Theme.of(context).textTheme.titleLarge),
          if (gate == VersionGate.updateAvailable && latest != null)
            Padding(padding: const EdgeInsets.only(top: 8), child: Text(t.updateAvailable(latest))),
          const SizedBox(height: 16),
          for (final a in actions) Padding(padding: const EdgeInsets.only(bottom: 12), child: a),
        ]),
      ),
    );
  }
}
