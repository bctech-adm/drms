import 'expense_request.dart';
import 'request_status.dart';

enum TurnState { done, current, pending, rejected, skipped }

class TimelineStep {
  const TimelineStep({required this.title, required this.state, this.actor, this.at, this.note});
  final String title;
  final TurnState state;
  final String? actor;
  final String? at;
  final String? note;
}

/// Signature positions of the current approval cycle, in form order (Diajukan → Dibuat → Diketahui →
/// Approval 1..n), with who acted and whose turn it is ("Giliran", US-05).
List<TimelineStep> buildTimeline(ExpenseDetail d) {
  final cycle = d.approvals.where((a) => a.cycle == d.approvalCycle).toList();
  ApprovalEntry? find(SignPosition p, [int? level]) {
    for (final a in cycle) {
      if (a.position == p && (level == null || a.level == level)) return a;
    }
    return null;
  }

  String actorOf(ApprovalEntry a) => '${a.actorName ?? '-'}${a.onBehalf ? ' (atas nama)' : ''}';
  final steps = <TimelineStep>[];
  final submitted = d.status != RequestStatus.draft;

  for (final pos in [SignPosition.diajukan, SignPosition.dibuat]) {
    final a = find(pos);
    final title = pos == SignPosition.diajukan ? 'Diajukan Oleh' : 'Dibuat Oleh';
    steps.add(
      a != null
          ? TimelineStep(title: title, state: TurnState.done, actor: actorOf(a), at: a.decidedAt)
          : TimelineStep(title: title, state: submitted ? TurnState.skipped : TurnState.current),
    );
  }

  final rule = d.approvalRule;
  final ackMode = rule?.acknowledge ?? 'none';
  if (ackMode != 'none') {
    final a = find(SignPosition.diketahui);
    final delegated = rule?.acknowledgeDelegatedTo != null ? 'dilimpahkan ke ${rule!.acknowledgeDelegatedTo}' : null;
    if (a != null) {
      steps.add(
        TimelineStep(
          title: 'Diketahui Oleh',
          state: a.decision == 'rejected' ? TurnState.rejected : TurnState.done,
          actor: actorOf(a),
          at: a.decidedAt,
          note: a.reason ?? delegated,
        ),
      );
    } else {
      final state = d.status == RequestStatus.pendingAck
          ? TurnState.current
          : (!submitted || d.status.waitsForDecision ? TurnState.pending : TurnState.skipped);
      steps.add(TimelineStep(title: 'Diketahui Oleh', state: state, note: delegated));
    }
  }

  final levels = rule?.steps.map((s) => s.level).toList() ?? const <int>[];
  final allLevels = levels.isEmpty ? [1] : levels;
  for (final level in allLevels) {
    final a = find(SignPosition.approval, level);
    final title = allLevels.length > 1 ? 'Approval level $level' : 'Approval';
    if (a != null) {
      steps.add(
        TimelineStep(
          title: title,
          state: a.decision == 'rejected' ? TurnState.rejected : TurnState.done,
          actor: actorOf(a),
          at: a.decidedAt,
          note: a.reason,
        ),
      );
    } else {
      final isCurrent = d.status == RequestStatus.pendingApproval && (d.currentLevel ?? allLevels.first) == level;
      final ended = d.status == RequestStatus.rejected || d.status == RequestStatus.cancelled;
      steps.add(
        TimelineStep(
          title: title,
          state: isCurrent ? TurnState.current : (ended ? TurnState.skipped : TurnState.pending),
        ),
      );
    }
  }
  return steps;
}

/// One-line "Giliran" text: who has to act next.
String currentTurn(ExpenseDetail d) => switch (d.status) {
  RequestStatus.draft => 'Pemohon — belum diajukan',
  RequestStatus.pendingAck => 'Diketahui Oleh (PM / penanggung jawab)',
  RequestStatus.pendingApproval =>
    (d.approvalRule?.steps.length ?? 1) > 1 ? 'Approval level ${d.currentLevel ?? 1}' : 'Approval (Owner)',
  RequestStatus.approved => d.type == RequestType.reimburse ? 'Finance — verifikasi nota' : 'Finance — antri transfer',
  RequestStatus.receiptRevision => 'Pemohon — perbaiki nota',
  RequestStatus.receiptsVerified => 'Finance — antri transfer',
  RequestStatus.transferred =>
    d.type == RequestType.advance ? 'Pemohon — lengkapi nota' : 'Pemohon/Finance — konfirmasi selesai',
  RequestStatus.receiptsComplete => 'Pemohon — kirim LPJ',
  RequestStatus.lpjSubmitted => 'Finance — verifikasi LPJ',
  RequestStatus.lpjRevision => 'Pemohon — revisi LPJ',
  RequestStatus.lpjVerified => 'Finance — penyelesaian selisih',
  RequestStatus.completed || RequestStatus.rejected || RequestStatus.cancelled => 'Selesai — tidak ada giliran',
  RequestStatus.unknown => '-',
};
