import 'package:flutter_test/flutter_test.dart';
import 'package:proyekkas/features/auth/domain/user_profile.dart';
import 'package:proyekkas/features/expense/data/expense_mappers.dart';
import 'package:proyekkas/features/expense/domain/expense_request.dart';
import 'package:proyekkas/features/expense/domain/request_status.dart';

import '../support/fixtures.dart';
import '../support/seed.dart';

void main() {
  test('detail JSON → domain', () {
    final d = detailFromJson(detailJson());
    expect(d.id, 42);
    expect(d.type, RequestType.reimburse);
    expect(d.status, RequestStatus.pendingApproval);
    expect(d.grandTotal, 1447500);
    expect(d.costCenter?.name, 'Ops Palangka Banjar');
    expect(d.requesters.map((r) => r.name), ['Budi', 'Doni']);
    expect(d.lines.first.vehiclePlate, 'DA 1234 XY');
    expect(d.lines.first.uom?.name, 'bulan');
    expect(d.receipts.single.imageId, 901);
    expect(d.approvals.map((a) => a.position), [SignPosition.diajukan, SignPosition.dibuat, SignPosition.diketahui]);
    expect(d.approvalRule?.steps.single.level, 1);
    expect(d.flags.single.level, 'warning');
    expect(d.budget.hasBudget, isTrue);
    expect(d.budget.pctAfter, 88.25);
    expect(d.allowedActions, {'approve', 'reject'});
  });

  test('tolerates missing / unknown fields', () {
    final d = detailFromJson({'id': 1, 'status': 'something_new', 'type': 'advance'});
    expect(d.status, RequestStatus.unknown);
    expect(d.lines, isEmpty);
    expect(d.budget.hasBudget, isFalse);
  });

  test('inbox JSON → domain', () {
    final i = inboxItemFromJson(inboxJson()['items'][0] as Map<String, dynamic>);
    expect(i.step, 'approve');
    expect(i.budgetOverWarn, isTrue);
    expect(i.warningFlags, 1);
    expect(i.infoFlags, 2);
  });

  test('me JSON → profile, roles and home', () {
    final p = userProfileFromJson(meJson(roles: ['pk-staff', 'pk-pm', 'unknown-role']));
    expect(p.roles, {Role.staff, Role.pm});
    expect(p.homeKind, HomeKind.pm);
    expect(p.hasApprovalInbox, isTrue);
    expect(p.timezone, 'Asia/Makassar');
    expect(p.imageTargets.receiptsMaxPx, 2000);
    expect(userProfileFromJson(meJson(roles: ['pk-owner'])).homeKind, HomeKind.owner);
    expect(userProfileFromJson(meJson(roles: ['pk-finance'])).canCreateRequests, isFalse);
  });

  test('draft → create body (openapi ExpenseRequestCreate)', () {
    final b = draftToCreateBody(seedDraft());
    expect(b['type'], 'reimburse');
    expect(b['clientUuid'], '0192f6d0-aaaa-7bbb-8ccc-000000000100');
    expect(b['costCenterId'], 7);
    expect(b['projectId'], isNull);
    final lines = b['lines'] as List;
    expect(lines, hasLength(3));
    expect((lines[1] as Map)['total'], 677000);
    expect((lines[1] as Map)['unitPrice'], 339000);
    expect(b.containsKey('grandTotal'), isFalse, reason: 'server computes the grand total');
  });

  test('draft → sync payload matches ADR 0010 Example B', () {
    final p = draftToSyncPayload(seedDraft());
    expect(p['kind'], 'reimburse');
    expect(p['cost_center_id'], 7);
    expect(p['requester_ids'], [11, 12]);
    expect(p['client_grand_total'], 1447500);
    expect(p.containsKey('draft_client_uuid'), isFalse);
    final l2 = (p['lines'] as List)[1] as Map<String, dynamic>;
    expect(l2['client_uuid'], '0192f6d0-aaaa-7bbb-8ccc-000000000012');
    expect(l2['uom_id'], 4);
    final r = (l2['receipts'] as List).single as Map<String, dynamic>;
    expect(r['amount'], 676876);
    expect(r['receipt_time'], '2026-09-20T00:00:00+08:00');
    expect(r['media_client_uuid'], '0192f6d0-aaaa-7bbb-8ccc-000000000202');
    final r1 = ((p['lines'] as List)[0] as Map)['receipts'] as List;
    expect((r1.single as Map)['receipt_time'], '2026-09-21T11:42:00+08:00');
    expect(draftToSyncPayload(seedDraft(), includeDraftId: true)['draft_client_uuid'], seedDraft().clientUuid);
  });

  test('offset string', () {
    expect(offsetString(const Duration(hours: 8)), '+08:00');
    expect(offsetString(const Duration(hours: 7)), '+07:00');
  });
}
