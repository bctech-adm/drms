import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/dates.dart';
import '../../../core/format/rupiah.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../shared/widgets/async_body.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/domain/user_profile.dart';
import '../application/expense_providers.dart';
import '../domain/draft.dart';
import '../domain/request_status.dart';

String syncStateLabel(AppLocalizations t, DraftSyncState s) => switch (s) {
  DraftSyncState.local => t.syncStateLocal,
  DraftSyncState.queued => t.syncStateQueued,
  DraftSyncState.synced => t.syncStateSynced,
  DraftSyncState.conflict => t.syncStateConflict,
  DraftSyncState.rejected => t.syncStateRejected,
  DraftSyncState.submitted => t.syncStateSubmitted,
};

/// "Pengajuan": local drafts (offline-capable) + server list (scope mine; Owner/Finance: all).
class RequestsScreen extends ConsumerWidget {
  const RequestsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final profile = ref.watch(currentProfileProvider);
    final canCreate = profile?.canCreateRequests ?? false;
    final scope = (profile?.homeKind == HomeKind.owner || profile?.homeKind == HomeKind.finance) ? 'all' : 'mine';
    final sent = _SentList(scope: scope);
    return DefaultTabController(
      length: canCreate ? 2 : 1,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t.requestsTitle),
          bottom: canCreate
              ? TabBar(
                  tabs: [
                    Tab(text: t.tabDrafts),
                    Tab(text: t.tabSent),
                  ],
                )
              : null,
        ),
        floatingActionButton: canCreate
            ? FloatingActionButton.extended(
                key: const Key('fab-new-request'),
                onPressed: () => context.push('/drafts/new?type=${RequestType.reimburse.code}'),
                icon: const Icon(Icons.add),
                label: Text(t.editorNewTitle),
              )
            : null,
        body: canCreate ? TabBarView(children: [const _DraftList(), sent]) : sent,
      ),
    );
  }
}

class _DraftList extends ConsumerWidget {
  const _DraftList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    return AsyncBody(
      value: ref.watch(openDraftsProvider),
      data: (drafts) => drafts.isEmpty
          ? Center(child: Text(t.noDrafts))
          : ListView.separated(
              padding: const EdgeInsets.only(bottom: 96),
              itemCount: drafts.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (_, i) {
                final d = drafts[i];
                final warn = d.syncState == DraftSyncState.rejected || d.syncState == DraftSyncState.conflict;
                return ListTile(
                  key: Key('draft-${d.clientUuid}'),
                  leading: Icon(
                    d.syncState == DraftSyncState.synced ? Icons.cloud_done : Icons.phone_android,
                    color: warn ? Theme.of(context).colorScheme.error : null,
                  ),
                  title: Text(d.title.isEmpty ? t.draftUntitled : d.title),
                  subtitle: Text(
                    '${d.type.label} · ${syncStateLabel(t, d.syncState)}'
                    '${d.lastError != null ? '\n${d.lastError}' : ''}',
                  ),
                  trailing: Text(formatRupiah(d.previewGrandTotal)),
                  onTap: () => context.push('/drafts/${d.clientUuid}'),
                );
              },
            ),
    );
  }
}

class _SentList extends ConsumerWidget {
  const _SentList({required this.scope});
  final String scope;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final provider = requestListProvider(scope);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(provider.future),
      child: AsyncBody(
        value: ref.watch(provider),
        onRetry: () => ref.invalidate(provider),
        data: (s) => s.items.isEmpty
            ? ListView(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(child: Text(t.noRequests)),
                  ),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.only(bottom: 96),
                itemCount: s.items.length + (s.nextCursor != null ? 1 : 0),
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (_, i) {
                  if (i == s.items.length) {
                    return Padding(
                      padding: const EdgeInsets.all(16),
                      child: OutlinedButton(
                        onPressed: s.loadingMore ? null : () => ref.read(provider.notifier).loadMore(),
                        child: Text(t.loadMore),
                      ),
                    );
                  }
                  final r = s.items[i];
                  return ListTile(
                    key: Key('request-${r.id}'),
                    title: Text(r.title),
                    subtitle: Text(
                      '${r.docNo ?? '-'} · ${r.typeLabel}\n${r.statusLabel}'
                      '${r.neededDate != null ? ' · ${formatDateOnly(r.neededDate)}' : ''}',
                    ),
                    isThreeLine: true,
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(formatRupiah(r.grandTotal), style: const TextStyle(fontWeight: FontWeight.bold)),
                        if (r.openWarningFlags > 0)
                          Icon(Icons.flag, size: 16, color: Theme.of(context).colorScheme.error),
                      ],
                    ),
                    onTap: () => context.push('/requests/${r.id}'),
                  );
                },
              ),
      ),
    );
  }
}
