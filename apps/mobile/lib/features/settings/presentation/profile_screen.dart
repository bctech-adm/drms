import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../auth/application/auth_controller.dart';
import '../../sync/application/sync_coordinator.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    final t = AppLocalizations.of(context);
    final pending = ref.read(outboxCountsProvider).value?.pending ?? 0;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(t.logoutConfirm),
        content: pending > 0 ? Text(t.logoutPendingWarning(pending)) : null,
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(t.cancel)),
          FilledButton(
            key: const Key('logout-confirm'),
            onPressed: () => Navigator.pop(c, true),
            child: Text(t.logout),
          ),
        ],
      ),
    );
    if (ok == true) await ref.read(authControllerProvider.notifier).logout();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final p = ref.watch(currentProfileProvider);
    final device = ref.watch(deviceIdentityProvider);
    final push = ref.watch(pushServiceProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t.profileTitle)),
      body: ListView(
        children: [
          if (p != null) ...[
            ListTile(leading: const Icon(Icons.person), title: Text(p.displayName), subtitle: Text(p.email)),
            ListTile(
              leading: const Icon(Icons.badge),
              title: Text(t.profileRoles),
              subtitle: Text(p.roles.map((r) => r.code).join(', ')),
            ),
            if (p.employee != null)
              ListTile(
                leading: const Icon(Icons.work),
                title: Text(t.profileEmployee),
                subtitle: Text('${p.employee!.code} — ${p.employee!.name}'),
              ),
          ],
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: Text(t.profileVersion),
            subtitle: Text(device.appVersion),
          ),
          ListTile(
            leading: const Icon(Icons.phone_android),
            title: Text(t.profileDevice),
            subtitle: Text(device.deviceId.substring(0, 8)),
          ),
          if (!push.available) ListTile(leading: const Icon(Icons.notifications_off), title: Text(t.pushDisabled)),
          const Divider(),
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              key: const Key('logout-button'),
              onPressed: () => _logout(context, ref),
              icon: const Icon(Icons.logout),
              label: Text(t.logout),
            ),
          ),
        ],
      ),
    );
  }
}
