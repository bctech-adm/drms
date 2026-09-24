import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../core/format/dates.dart';
import '../../../core/format/rupiah.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../shared/widgets/async_body.dart';
import '../../expense/presentation/request_detail_screen.dart' show pct;
import '../application/inbox_providers.dart';

/// Owner/PM inbox with budget impact (red above the warn %, US-26) and open flags (US-59).
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(t.inboxTitle)),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(inboxProvider.future),
        child: AsyncBody(
          value: ref.watch(inboxProvider),
          onRetry: () => ref.invalidate(inboxProvider),
          data: (page) => page.items.isEmpty
              ? ListView(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(32),
                      child: Center(child: Text(t.inboxEmpty)),
                    ),
                  ],
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(8),
                  itemCount: page.items.length,
                  itemBuilder: (_, i) {
                    final it = page.items[i];
                    final step = it.step == 'acknowledge' ? t.stepAcknowledge : t.stepApprove(it.level ?? 1);
                    final budget = it.budget.hasBudget
                        ? t.budgetChange(pct(it.budget.pctBefore), pct(it.budget.pctAfter))
                        : t.budgetNone;
                    return Card(
                      key: Key('inbox-${it.id}'),
                      child: ListTile(
                        title: Text(it.title),
                        isThreeLine: true,
                        subtitle: Text(
                          '${it.docNo ?? '-'} · ${it.typeLabel} · $step\n'
                          '${it.scope} · ${it.requesters}\n'
                          '${t.budgetImpact}: $budget · ${t.flagsCount(it.warningFlags, it.infoFlags)}'
                          '${it.neededDate != null ? '\n${t.neededDate}: ${formatDateOnly(it.neededDate)}' : ''}',
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(formatRupiah(it.grandTotal), style: const TextStyle(fontWeight: FontWeight.bold)),
                            if (it.budgetOverWarn) const Icon(Icons.warning, color: StatusColors.danger, size: 18),
                          ],
                        ),
                        onTap: () => context.push('/requests/${it.id}'),
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}
