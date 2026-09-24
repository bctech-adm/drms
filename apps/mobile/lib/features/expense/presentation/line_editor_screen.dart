import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../app/providers.dart';
import '../../../core/format/dates.dart';
import '../../../core/format/rupiah.dart';
import '../../../core/media/compress_plan.dart';
import '../../../core/media/photo_compressor.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../shared/widgets/async_body.dart';
import '../../auth/application/auth_controller.dart';
import '../../masters/domain/master_item.dart';
import '../data/draft_repository.dart';
import '../domain/draft.dart';
import '../domain/draft_validation.dart';
import 'camera_capture_screen.dart';
import 'widgets/master_picker.dart';

/// Edits one line item (US-37) and its receipts (US-7/US-38). Returns the updated [DraftLine].
class LineEditorScreen extends ConsumerStatefulWidget {
  const LineEditorScreen({super.key, required this.line, required this.masters});
  final DraftLine line;
  final Map<String, List<MasterItem>> masters;

  @override
  ConsumerState<LineEditorScreen> createState() => _LineEditorScreenState();
}

class _LineEditorScreenState extends ConsumerState<LineEditorScreen> {
  final _form = GlobalKey<FormState>();
  late DraftLine _line = widget.line;
  late final _desc = TextEditingController(text: widget.line.description);
  late final _qty = TextEditingController(text: widget.line.qty?.toString().replaceAll(RegExp(r'\.0$'), '') ?? '');
  late final _unit = TextEditingController(text: widget.line.unitPrice == null ? '' : '${widget.line.unitPrice}');
  late final _total = TextEditingController(text: widget.line.total == null ? '' : '${widget.line.total}');
  late final _notes = TextEditingController(text: widget.line.notes ?? '');
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_desc, _qty, _unit, _total, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  DraftLine _collect() => _line.copyWith(
    description: _desc.text.trim(),
    qty: double.tryParse(_qty.text.replaceAll(',', '.')),
    unitPrice: parseRupiah(_unit.text),
    total: parseRupiah(_total.text),
    notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
  );

  Future<void> _addReceipt({required bool fromCamera}) async {
    final t = AppLocalizations.of(context);
    final sub = ref.read(currentSubProvider);
    if (sub == null) return;
    Uint8List? raw;
    if (fromCamera) {
      raw = await Navigator.of(context).push<Uint8List>(MaterialPageRoute(builder: (_) => const CameraCaptureScreen()));
    } else {
      // Q-41 default: gallery allowed for receipts (e.g. booking screenshots); never for selfies.
      final file = await ImagePicker().pickImage(source: ImageSource.gallery, requestFullMetadata: false);
      raw = await file?.readAsBytes();
    }
    if (raw == null || !mounted) return;
    setState(() => _busy = true);
    try {
      final profile = ref.read(currentProfileProvider);
      final serverMax = profile?.imageTargets.receiptsMaxPx ?? PhotoTarget.receipt.maxSide;
      final target = PhotoTarget(
        maxSide: serverMax < PhotoTarget.receipt.maxSide ? serverMax : PhotoTarget.receipt.maxSide,
        quality: PhotoTarget.receipt.quality,
        maxBytes: PhotoTarget.receipt.maxBytes,
      );
      final photo = await ref.read(photoCompressorProvider).compress(raw, target);
      final mediaUuid = ref.read(draftServiceProvider).newId();
      await ref
          .read(draftRepositoryProvider)
          .addMedia(sub, uuid: mediaUuid, kind: 'receipt', bytes: photo.bytes, sha256: photo.sha256Hex);
      if (!mounted) return;
      final receipt = await showDialog<DraftReceipt>(
        context: context,
        barrierDismissible: false,
        builder: (_) => _ReceiptDialog(
          clientUuid: ref.read(draftServiceProvider).newId(),
          mediaUuid: mediaUuid,
          photo: photo.bytes,
          defaultAmount: parseRupiah(_total.text),
        ),
      );
      if (receipt != null) setState(() => _line = _line.copyWith(receipts: [..._line.receipts, receipt]));
    } on PhotoTooLargeException catch (e) {
      if (mounted) showSnack(context, e.message);
    } on QueueFullException catch (e) {
      if (mounted) showSnack(context, e.message);
    } on Object {
      if (mounted) showSnack(context, t.cameraUnavailable);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final m = widget.masters;
    final current = _collect();
    final diff = receiptDifference(current);
    String? req(String? v) => (v == null || v.trim().isEmpty) ? t.required : null;
    String? money(String? v, {bool required = false}) {
      if (v == null || v.trim().isEmpty) return required ? t.required : null;
      final p = parseRupiah(v);
      if (p == null || (required && p <= 0)) return t.invalidAmount;
      return null;
    }

    return Scaffold(
      appBar: AppBar(title: Text(t.lineTitle(_line.no))),
      body: AbsorbPointer(
        absorbing: _busy,
        child: Form(
          key: _form,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                key: const Key('line-description'),
                controller: _desc,
                maxLength: 500,
                decoration: InputDecoration(labelText: t.fieldDescription),
                validator: req,
              ),
              MasterPickerField(
                label: t.fieldCategory,
                items: m[MasterTypes.categories] ?? const [],
                value: _line.categoryId,
                onChanged: (v) => setState(() => _line = _line.copyWith(categoryId: v)),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      key: const Key('line-qty'),
                      controller: _qty,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(labelText: t.fieldQty),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: MasterPickerField(
                      label: t.fieldUom,
                      items: m[MasterTypes.uoms] ?? const [],
                      value: _line.uomId,
                      onChanged: (v) => setState(() => _line = _line.copyWith(uomId: v)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _unit,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(
                  labelText: t.fieldUnitPrice,
                  helperText: t.unitPriceHint,
                  prefixText: 'Rp ',
                ),
                validator: (v) => money(v),
              ),
              const SizedBox(height: 12),
              TextFormField(
                key: const Key('line-total'),
                controller: _total,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(labelText: t.fieldTotal, prefixText: 'Rp '),
                validator: (v) => money(v, required: true),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 12),
              MasterPickerField(
                label: t.fieldVehicle,
                items: m[MasterTypes.vehicles] ?? const [],
                value: _line.vehicleId,
                onChanged: (v) => setState(() => _line = _line.copyWith(vehicleId: v)),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _notes,
                maxLength: 500,
                decoration: InputDecoration(labelText: t.fieldLineNotes),
              ),
              const Divider(height: 24),
              Text(t.receiptsTitle, style: Theme.of(context).textTheme.titleMedium),
              for (final r in _line.receipts)
                ListTile(
                  leading: const Icon(Icons.receipt),
                  title: Text(r.vendorName),
                  subtitle: Text(
                    '${r.receiptNo ?? '-'} · ${formatDateOnly(r.receiptDate)}${r.receiptTime != null ? ' ${r.receiptTime}' : ''}',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(formatRupiah(r.amount)),
                      IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => setState(
                          () => _line = _line.copyWith(
                            receipts: [
                              for (final x in _line.receipts)
                                if (x.clientUuid != r.clientUuid) x,
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              if (_line.receipts.isNotEmpty && diff != 0) Text(t.receiptDiff(formatRupiah(diff))),
              if (_busy) Padding(padding: const EdgeInsets.all(8), child: Text(t.photoCompressing)),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      key: const Key('add-receipt-camera'),
                      onPressed: () => _addReceipt(fromCamera: true),
                      icon: const Icon(Icons.photo_camera),
                      label: Text(t.addReceiptCamera),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _addReceipt(fromCamera: false),
                      icon: const Icon(Icons.photo_library),
                      label: Text(t.addReceiptGallery),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              FilledButton(
                key: const Key('line-save'),
                onPressed: () {
                  if (!(_form.currentState?.validate() ?? false)) return;
                  Navigator.of(context).pop(_collect());
                },
                child: Text(t.save),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReceiptDialog extends StatefulWidget {
  const _ReceiptDialog({required this.clientUuid, required this.mediaUuid, required this.photo, this.defaultAmount});
  final String clientUuid;
  final String mediaUuid;
  final Uint8List photo;
  final int? defaultAmount;

  @override
  State<_ReceiptDialog> createState() => _ReceiptDialogState();
}

class _ReceiptDialogState extends State<_ReceiptDialog> {
  final _form = GlobalKey<FormState>();
  final _no = TextEditingController();
  final _vendor = TextEditingController();
  late final _amount = TextEditingController(text: widget.defaultAmount?.toString() ?? '');
  DateTime _date = DateTime.now();
  TimeOfDay? _time;

  @override
  void dispose() {
    _no.dispose();
    _vendor.dispose();
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return AlertDialog(
      title: Text(t.receiptDetailsTitle),
      content: SingleChildScrollView(
        child: Form(
          key: _form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(height: 140, child: Image.memory(widget.photo, fit: BoxFit.contain)),
              TextFormField(
                key: const Key('receipt-vendor'),
                controller: _vendor,
                maxLength: 160,
                decoration: InputDecoration(labelText: t.receiptVendor),
                validator: (v) => (v == null || v.trim().isEmpty) ? t.required : null,
              ),
              TextFormField(
                controller: _no,
                maxLength: 64,
                decoration: InputDecoration(labelText: t.receiptNo),
              ),
              TextFormField(
                key: const Key('receipt-amount'),
                controller: _amount,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: InputDecoration(labelText: t.receiptAmount, prefixText: 'Rp '),
                validator: (v) => (parseRupiah(v ?? '') ?? 0) <= 0 ? t.invalidAmount : null,
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(t.receiptDate),
                subtitle: Text(formatDateOnly(toYmd(_date))),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final d = await showDatePicker(
                    context: context,
                    initialDate: _date,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (d != null) setState(() => _date = d);
                },
              ),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(t.receiptTime),
                subtitle: Text(_time == null ? '-' : _time!.format(context)),
                trailing: const Icon(Icons.schedule),
                onTap: () async {
                  final tm = await showTimePicker(context: context, initialTime: _time ?? TimeOfDay.now());
                  if (tm != null) setState(() => _time = tm);
                },
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(t.cancel)),
        FilledButton(
          key: const Key('receipt-save'),
          onPressed: () {
            if (!(_form.currentState?.validate() ?? false)) return;
            String two(int v) => v.toString().padLeft(2, '0');
            Navigator.pop(
              context,
              DraftReceipt(
                clientUuid: widget.clientUuid,
                receiptNo: _no.text.trim().isEmpty ? null : _no.text.trim(),
                vendorName: _vendor.text.trim(),
                receiptDate: toYmd(_date),
                receiptTime: _time == null ? null : '${two(_time!.hour)}:${two(_time!.minute)}',
                amount: parseRupiah(_amount.text)!,
                mediaUuid: widget.mediaUuid,
              ),
            );
          },
          child: Text(t.save),
        ),
      ],
    );
  }
}
