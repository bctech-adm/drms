import 'package:freezed_annotation/freezed_annotation.dart';

import 'request_status.dart';

part 'expense_request.freezed.dart';

@freezed
abstract class RefItem with _$RefItem {
  const factory RefItem({required int id, String? code, String? name}) = _RefItem;
}

/// `ExpenseRequestListItem`.
@freezed
abstract class ExpenseSummary with _$ExpenseSummary {
  const factory ExpenseSummary({
    required int id,
    String? docNo,
    required RequestType type,
    required String typeLabel,
    required RequestStatus status,
    required String statusLabel,
    required String title,
    required int grandTotal,
    int? approvedAmount,
    String? requestDate,
    String? neededDate,
    String? updatedAt,
    @Default(0) int openWarningFlags,
  }) = _ExpenseSummary;
}

@freezed
abstract class ExpenseLine with _$ExpenseLine {
  const factory ExpenseLine({
    required String id,
    required int no,
    String? description,
    double? qty,
    RefItem? uom,
    int? unitPrice,
    int? unitPriceDisplay,
    required int total,
    String? notes,
    RefItem? category,
    String? vehiclePlate,
  }) = _ExpenseLine;
}

@freezed
abstract class ReceiptInfo with _$ReceiptInfo {
  const factory ReceiptInfo({
    required int id,
    required String lineId,
    int? lineNo,
    String? receiptNo,
    required String vendorName,
    required String receiptDate,
    required int amount,
    int? imageId,
    required String status,
  }) = _ReceiptInfo;
}

enum SignPosition { diajukan, dibuat, diketahui, approval }

@freezed
abstract class ApprovalEntry with _$ApprovalEntry {
  const factory ApprovalEntry({
    required int id,
    required int cycle,
    required SignPosition position,
    required int level,
    String? actorName,
    @Default(false) bool onBehalf,
    required String decision, // signed | acknowledged | approved | rejected
    String? reason,
    String? decidedAt,
  }) = _ApprovalEntry;
}

@freezed
abstract class RuleStep with _$RuleStep {
  const factory RuleStep({required int level, String? approverRole, int? approverUserId}) = _RuleStep;
}

@freezed
abstract class ApprovalRuleInfo with _$ApprovalRuleInfo {
  const factory ApprovalRuleInfo({
    required String name,
    required String acknowledge, // required | optional | none
    String? acknowledgeDelegatedTo,
    @Default([]) List<RuleStep> steps,
  }) = _ApprovalRuleInfo;
}

@freezed
abstract class FlagInfo with _$FlagInfo {
  const factory FlagInfo({
    required int id,
    required String kind,
    required String kindLabel,
    required String level, // info | warning
    required String status,
    int? lineNo,
    required String message,
  }) = _FlagInfo;
}

@freezed
abstract class BudgetImpact with _$BudgetImpact {
  const BudgetImpact._();
  const factory BudgetImpact({required String basis, double? pctBefore, double? pctAfter}) = _BudgetImpact;

  bool get hasBudget => basis == 'project';
}

/// `ExpenseRequestDetail` — the subset the APK shows.
@freezed
abstract class ExpenseDetail with _$ExpenseDetail {
  const factory ExpenseDetail({
    required int id,
    String? docNo,
    String? clientUuid,
    required RequestType type,
    required String typeLabel,
    required RequestStatus status,
    required String statusLabel,
    required String title,
    required int grandTotal,
    int? approvedAmount,
    String? requestDate,
    String? neededDate,
    String? notes,
    RefItem? project,
    RefItem? costCenter,
    @Default([]) List<RefItem> requesters,
    String? createdByName,
    String? bankName,
    String? bankAccountNo,
    String? bankAccountHolder,
    @Default([]) List<ExpenseLine> lines,
    @Default([]) List<ReceiptInfo> receipts,
    @Default([]) List<ApprovalEntry> approvals,
    ApprovalRuleInfo? approvalRule,
    @Default(1) int approvalCycle,
    int? currentLevel,
    @Default([]) List<FlagInfo> flags,
    @Default(BudgetImpact(basis: 'none')) BudgetImpact budget,
    @Default(<String>{}) Set<String> allowedActions,
    String? rejectReason,
    String? cancelReason,
    String? submittedAt,
    String? updatedAt,
  }) = _ExpenseDetail;
}

/// `ApprovalInbox.items[]`.
@freezed
abstract class InboxItem with _$InboxItem {
  const factory InboxItem({
    required int id,
    String? docNo,
    required RequestType type,
    required String typeLabel,
    required RequestStatus status,
    required String statusLabel,
    required String title,
    required String scope,
    required String requesters,
    required int grandTotal,
    String? neededDate,
    required String step, // acknowledge | approve
    int? level,
    required BudgetImpact budget,
    @Default(false) bool budgetOverWarn,
    @Default(0) int warningFlags,
    @Default(0) int infoFlags,
  }) = _InboxItem;
}
