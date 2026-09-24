import '../../auth/domain/user_profile.dart';
import '../domain/draft.dart';
import '../domain/expense_request.dart';
import '../domain/request_status.dart';

/// JSON (openapi v1) → domain. Tolerant: unknown/missing optional fields never crash the app.
typedef Json = Map<String, dynamic>;

int _int(Object? v, [int fallback = 0]) =>
    v is num ? v.toInt() : (v is String ? int.tryParse(v) ?? fallback : fallback);
int? _intN(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);
double? _dblN(Object? v) => v is num ? v.toDouble() : (v is String ? double.tryParse(v) : null);
String? _strN(Object? v) => v?.toString();
List<dynamic> _list(Object? v) => v is List ? v : const [];
Json? _map(Object? v) => v is Map<String, dynamic> ? v : null;

RefItem? refFromJson(Object? v) {
  final m = _map(v);
  if (m == null || _intN(m['id']) == null) return null;
  return RefItem(id: _int(m['id']), code: _strN(m['code']), name: _strN(m['name']));
}

BudgetImpact budgetFromJson(Object? v) {
  final m = _map(v);
  if (m == null) return const BudgetImpact(basis: 'none');
  return BudgetImpact(
    basis: '${m['basis'] ?? 'none'}',
    pctBefore: _dblN(m['pctBefore']),
    pctAfter: _dblN(m['pctAfter']),
  );
}

UserProfile userProfileFromJson(Json j) {
  final settings = _map(j['settings']) ?? const {};
  final targets = _map(settings['imageTargets']);
  final emp = _map(j['employee']);
  return UserProfile(
    id: _int(j['id']),
    email: '${j['email'] ?? ''}',
    name: _strN(j['name']),
    roles: {for (final r in _list(j['roles'])) ?Role.fromCode('$r')},
    employee: emp == null
        ? null
        : Employee(id: _int(emp['id']), code: '${emp['code'] ?? ''}', name: '${emp['name'] ?? ''}'),
    timezone: '${settings['timezone'] ?? 'Asia/Makassar'}',
    minAppVersion: _strN(settings['minAppVersion']),
    imageTargets: targets == null
        ? const ImageTargets()
        : ImageTargets(
            receiptsMaxPx: _int(targets['receiptsMaxPx'], 2000),
            jpegQuality: _int(targets['jpegQuality'], 80),
          ),
    serverTime: _strN(j['serverTime']),
  );
}

ExpenseSummary summaryFromJson(Json j) {
  final status = RequestStatus.fromCode(j['status'] as String?);
  final type = RequestType.fromCode(j['type'] as String?);
  return ExpenseSummary(
    id: _int(j['id']),
    docNo: _strN(j['docNo']),
    type: type,
    typeLabel: '${j['typeLabel'] ?? type.label}',
    status: status,
    statusLabel: '${j['statusLabel'] ?? status.label}',
    title: '${j['title'] ?? ''}',
    grandTotal: _int(j['grandTotal']),
    approvedAmount: _intN(j['approvedAmount']),
    requestDate: _strN(j['requestDate']),
    neededDate: _strN(j['neededDate']),
    updatedAt: _strN(j['updatedAt']),
    openWarningFlags: _int(j['openWarningFlags']),
  );
}

SignPosition _position(Object? v) => switch (v) {
  'diajukan' => SignPosition.diajukan,
  'dibuat' => SignPosition.dibuat,
  'diketahui' => SignPosition.diketahui,
  _ => SignPosition.approval,
};

ExpenseDetail detailFromJson(Json j) {
  final status = RequestStatus.fromCode(j['status'] as String?);
  final type = RequestType.fromCode(j['type'] as String?);
  final bank = _map(j['bank']);
  final rule = _map(j['approvalRule']);
  return ExpenseDetail(
    id: _int(j['id']),
    docNo: _strN(j['docNo']),
    clientUuid: _strN(j['clientUuid']),
    type: type,
    typeLabel: '${j['typeLabel'] ?? type.label}',
    status: status,
    statusLabel: '${j['statusLabel'] ?? status.label}',
    title: '${j['title'] ?? ''}',
    grandTotal: _int(j['grandTotal']),
    approvedAmount: _intN(j['approvedAmount']),
    requestDate: _strN(j['requestDate']),
    neededDate: _strN(j['neededDate']),
    notes: _strN(j['notes']),
    project: refFromJson(j['project']),
    costCenter: refFromJson(j['costCenter']),
    requesters: [for (final r in _list(j['requesters'])) ?refFromJson(r)],
    createdByName: _strN(_map(j['createdBy'])?['name']),
    bankName: _strN(bank?['bankName']),
    bankAccountNo: _strN(bank?['accountNo']),
    bankAccountHolder: _strN(bank?['accountHolder']),
    lines: [
      for (final l in _list(j['lines']))
        if (_map(l) case final m?)
          ExpenseLine(
            id: '${m['id']}',
            no: _int(m['no']),
            description: _strN(m['description']),
            qty: _dblN(m['qty']),
            uom: refFromJson(m['uom']),
            unitPrice: _intN(m['unitPrice']),
            unitPriceDisplay: _intN(m['unitPriceDisplay']),
            total: _int(m['total']),
            notes: _strN(m['notes']),
            category: refFromJson(m['category']),
            vehiclePlate: _strN(_map(m['vehicle'])?['plateDisplay'] ?? _map(m['vehicle'])?['plateNo']),
          ),
    ],
    receipts: [
      for (final r in _list(j['receipts']))
        if (_map(r) case final m?)
          ReceiptInfo(
            id: _int(m['id']),
            lineId: '${m['lineId']}',
            lineNo: _intN(m['lineNo']),
            receiptNo: _strN(m['receiptNo']),
            vendorName: '${m['vendorName'] ?? ''}',
            receiptDate: '${m['receiptDate'] ?? ''}',
            amount: _int(m['amount']),
            imageId: _intN(m['imageId']),
            status: '${m['status'] ?? 'pending'}',
          ),
    ],
    approvals: [
      for (final a in _list(j['approvals']))
        if (_map(a) case final m?)
          ApprovalEntry(
            id: _int(m['id']),
            cycle: _int(m['cycle'], 1),
            position: _position(m['position']),
            level: _int(m['level']),
            actorName: _strN(m['actorName']),
            onBehalf: m['onBehalf'] == true,
            decision: '${m['decision'] ?? ''}',
            reason: _strN(m['reason']),
            decidedAt: _strN(m['decidedAt']),
          ),
    ],
    approvalRule: rule == null
        ? null
        : ApprovalRuleInfo(
            name: '${rule['name'] ?? ''}',
            acknowledge: '${rule['acknowledge'] ?? 'none'}',
            acknowledgeDelegatedTo: _strN(rule['acknowledgeDelegatedTo']),
            steps: [
              for (final s in _list(rule['steps']))
                if (_map(s) case final m?)
                  RuleStep(
                    level: _int(m['level'], 1),
                    approverRole: _strN(m['approverRole']),
                    approverUserId: _intN(m['approverUserId']),
                  ),
            ],
          ),
    approvalCycle: _int(j['approvalCycle'], 1),
    currentLevel: _intN(j['currentLevel']),
    flags: [
      for (final f in _list(j['flags']))
        if (_map(f) case final m?)
          FlagInfo(
            id: _int(m['id']),
            kind: '${m['kind'] ?? ''}',
            kindLabel: '${m['kindLabel'] ?? m['kind'] ?? ''}',
            level: '${m['level'] ?? 'info'}',
            status: '${m['status'] ?? ''}',
            lineNo: _intN(m['lineNo']),
            message: '${m['message'] ?? ''}',
          ),
    ],
    budget: budgetFromJson(j['budget']),
    allowedActions: {for (final a in _list(j['allowedActions'])) '$a'},
    rejectReason: _strN(j['rejectReason']),
    cancelReason: _strN(j['cancelReason']),
    submittedAt: _strN(j['submittedAt']),
    updatedAt: _strN(j['updatedAt']),
  );
}

InboxItem inboxItemFromJson(Json j) {
  final status = RequestStatus.fromCode(j['status'] as String?);
  final type = RequestType.fromCode(j['type'] as String?);
  final budget = _map(j['budget']);
  final flags = _map(j['flags']);
  return InboxItem(
    id: _int(j['id']),
    docNo: _strN(j['docNo']),
    type: type,
    typeLabel: '${j['typeLabel'] ?? type.label}',
    status: status,
    statusLabel: '${j['statusLabel'] ?? status.label}',
    title: '${j['title'] ?? ''}',
    scope: '${j['scope'] ?? ''}',
    requesters: '${j['requesters'] ?? ''}',
    grandTotal: _int(j['grandTotal']),
    neededDate: _strN(j['neededDate']),
    step: '${j['step'] ?? 'approve'}',
    level: _intN(j['level']),
    budget: budgetFromJson(budget),
    budgetOverWarn: budget?['overWarn'] == true,
    warningFlags: _int(flags?['warning']),
    infoFlags: _int(flags?['info']),
  );
}

/// Local draft → `POST /api/v1/expense-requests` body (openapi `ExpenseRequestCreate`).
Json draftToCreateBody(DraftRequest d) => {
  'type': d.type.code,
  'title': d.title.trim(),
  'projectId': d.projectId,
  'costCenterId': d.costCenterId,
  'neededDate': d.neededDate,
  'notes': (d.notes == null || d.notes!.trim().isEmpty) ? null : d.notes!.trim(),
  if (d.requesterIds.isNotEmpty) 'requesterIds': d.requesterIds,
  'bankAccountId': d.bankAccountId,
  'lines': [for (final l in d.lines) lineToInput(l)],
  'clientUuid': d.clientUuid,
};

Json lineToInput(DraftLine l) => {
  'description': l.description.trim(),
  'qty': l.qty,
  'uomId': l.uomId,
  'unitPrice': l.unitPrice,
  'total': l.total,
  'notes': (l.notes == null || l.notes!.trim().isEmpty) ? null : l.notes!.trim(),
  'categoryId': l.categoryId,
  'vehicleId': l.vehicleId,
};

/// Local draft → sync item payload `expense_request.draft_upsert` (ADR 0010 "Example B").
/// [zoneOffset] is the company display offset used to build `receipt_time` (e.g. `+08:00`).
/// [includeDraftId] adds `draft_client_uuid` for edits queued after the first upsert (the item
/// `client_uuid` is then a new operation id) — additive field, see the F4a report.
Json draftToSyncPayload(DraftRequest d, {String zoneOffset = '+08:00', bool includeDraftId = false}) => {
  if (includeDraftId) 'draft_client_uuid': d.clientUuid,
  'kind': d.type.code,
  'project_id': d.projectId,
  'cost_center_id': d.costCenterId,
  'title': d.title.trim(),
  'needed_date': d.neededDate,
  'notes': (d.notes == null || d.notes!.trim().isEmpty) ? null : d.notes!.trim(),
  'requester_ids': d.requesterIds,
  'bank_account_id': d.bankAccountId,
  'client_grand_total': d.previewGrandTotal,
  'lines': [
    for (final l in d.lines)
      {
        'client_uuid': l.clientUuid,
        'no': l.no,
        'description': l.description.trim(),
        'qty': l.qty,
        'uom_id': l.uomId,
        'unit_price': l.unitPrice,
        'total': l.total,
        'category_id': l.categoryId,
        'vehicle_id': l.vehicleId,
        'remark': (l.notes == null || l.notes!.trim().isEmpty) ? null : l.notes!.trim(),
        'receipts': [
          for (final r in l.receipts)
            {
              'client_uuid': r.clientUuid,
              'receipt_no': r.receiptNo,
              'vendor_name': r.vendorName.trim(),
              'receipt_time': '${r.receiptDate}T${r.receiptTime ?? '00:00'}:00$zoneOffset',
              'amount': r.amount,
              'media_client_uuid': r.mediaUuid,
            },
        ],
      },
  ],
};

String offsetString(Duration d) {
  final sign = d.isNegative ? '-' : '+';
  final a = d.abs();
  return '$sign${a.inHours.toString().padLeft(2, '0')}:${(a.inMinutes % 60).toString().padLeft(2, '0')}';
}
