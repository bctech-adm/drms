import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../../../core/connectivity/connectivity_controller.dart';
import '../../../core/db/app_database.dart';
import '../../../core/format/dates.dart';
import '../../../core/location/location_service.dart';
import '../../../core/media/photo_compressor.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../shared/widgets/async_body.dart';
import '../../app_config/application/app_config_providers.dart';
import '../../auth/application/auth_controller.dart';
import '../../expense/data/draft_repository.dart';
import '../../sync/application/sync_coordinator.dart';
import '../application/attendance_service.dart';
import '../domain/attendance.dart';

/// Own check-in / check-out (F4 slice of US-01/US-02). Works offline: GPS + front-camera selfie are
/// captured on the phone and queued; the server decides (geofence, mock, assignment, time).
class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen> {
  int? _projectId;
  bool _busy = false;
  String? _notice;
  bool _noticeIsError = false;

  Future<void> _record(AttendanceKind kind, ProjectSite site) async {
    final t = AppLocalizations.of(context);
    final sub = ref.read(currentSubProvider);
    if (sub == null) return;
    setState(() {
      _busy = true;
      _notice = t.attendanceLocating;
      _noticeIsError = false;
    });
    try {
      final fix = await ref.read(locationServiceProvider).current();
      final res = checkSite(site, fix);
      final problem = switch (res.check) {
        SiteCheck.mocked => t.attendanceMocked,
        SiteCheck.noGeofence => t.attendanceNoGeofence,
        SiteCheck.outside => t.attendanceOutside(res.distanceM ?? 0),
        SiteCheck.ok => null,
      };
      if (problem != null) {
        setState(() {
          _notice = problem;
          _noticeIsError = true;
        });
        return;
      }
      setState(() => _notice = t.attendanceInside(res.distanceM ?? 0));
      if (!mounted) return;
      final raw = await ref.read(selfieCaptureProvider)(context, t.attendanceSelfieTitle);
      if (raw == null || !mounted) return;
      final online = ref.read(connectivityProvider);
      await ref
          .read(attendanceServiceProvider)
          .record(sub: sub, kind: kind, site: site, fix: fix, rawSelfie: raw, online: online);
      ref.read(syncCoordinatorProvider.notifier).requestSync(delay: Duration.zero);
      if (mounted) showSnack(context, online ? t.attendanceSavedOnline : t.attendanceSavedOffline);
    } on LocationException catch (e) {
      setState(() {
        _notice = e.message;
        _noticeIsError = true;
      });
    } on PhotoTooLargeException catch (e) {
      if (mounted) showSnack(context, e.message);
    } on QueueFullException catch (e) {
      if (mounted) showSnack(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final enabled = ref.watch(appConfigProvider).value?.syncAttendance ?? false;
    final sites = ref.watch(attendanceSitesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t.attendanceTitle)),
      body: AsyncBody(
        value: sites,
        onRetry: () => ref.invalidate(attendanceSitesProvider),
        data: (list) {
          final site = list.where((s) => s.id == _projectId).firstOrNull ?? list.firstOrNull;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (!enabled) _InfoCard(text: t.attendanceDisabled, error: true),
              if (list.isEmpty)
                _InfoCard(text: t.attendanceNoProjects, error: true)
              else ...[
                DropdownButtonFormField<int>(
                  key: const Key('attendance-project'),
                  initialValue: site?.id,
                  isExpanded: true,
                  decoration: InputDecoration(labelText: t.attendanceProject),
                  items: [for (final s in list) DropdownMenuItem(value: s.id, child: Text(s.label))],
                  onChanged: _busy ? null : (v) => setState(() => _projectId = v),
                ),
                if (site != null && !site.hasGeofence) _InfoCard(text: t.attendanceNoGeofence, error: true),
                const SizedBox(height: 16),
                for (final kind in AttendanceKind.values)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: FilledButton.icon(
                      key: Key('attendance-${kind.name}'),
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                      onPressed: enabled && !_busy && site != null && site.hasGeofence
                          ? () => _record(kind, site)
                          : null,
                      icon: Icon(kind == AttendanceKind.checkIn ? Icons.login : Icons.logout),
                      label: Text(kind == AttendanceKind.checkIn ? t.attendanceCheckIn : t.attendanceCheckOut),
                    ),
                  ),
              ],
              if (_notice != null)
                _InfoCard(key: const Key('attendance-notice'), text: _notice!, error: _noticeIsError),
              const Divider(height: 32),
              Text(t.attendanceHistory, style: Theme.of(context).textTheme.titleMedium),
              _History(sites: {for (final s in list) s.id: s.label}),
            ],
          );
        },
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({super.key, required this.text, this.error = false});
  final String text;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      color: error ? scheme.errorContainer : scheme.secondaryContainer,
      child: Padding(padding: const EdgeInsets.all(12), child: Text(text)),
    );
  }
}

class _History extends ConsumerWidget {
  const _History({required this.sites});
  final Map<int, String> sites;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final items = ref.watch(attendanceItemsProvider).value ?? const <OutboxData>[];
    if (items.isEmpty) return Padding(padding: const EdgeInsets.all(8), child: Text(t.attendanceHistoryEmpty));
    final zone = ref.watch(currentProfileProvider)?.timezone;
    String status(OutboxData r) => switch (r.status) {
      'pending' => t.queueStatusPending,
      'applied' => t.queueStatusApplied,
      'rejected' => t.queueStatusRejected,
      'failed' => t.queueStatusFailed,
      _ => r.status,
    };
    return Column(
      children: [
        for (final r in items)
          ListTile(
            key: Key('attendance-item-${r.opUuid}'),
            leading: Icon(
              r.status == 'applied'
                  ? Icons.cloud_done
                  : (r.status == 'rejected' || r.status == 'failed' ? Icons.error : Icons.schedule),
              color: r.status == 'applied'
                  ? StatusColors.ok
                  : (r.status == 'rejected' || r.status == 'failed' ? StatusColors.danger : null),
            ),
            title: Text(
              '${AttendanceKind.fromItemType(r.type)?.label ?? r.type} · '
              '${sites[_projectOf(r)] ?? '-'}${r.offline ? ' · ${t.attendanceOfflineTag}' : ''}',
            ),
            subtitle: Text(
              [
                '${formatServerDateTime(r.deviceTime, zone: zone)} · ${status(r)}',
                if (r.lastErrorMessage != null && r.status != 'applied') r.lastErrorMessage!,
              ].join('\n'),
            ),
          ),
      ],
    );
  }

  static int? _projectOf(OutboxData r) {
    final p = jsonDecode(r.payloadJson);
    return p is Map<String, dynamic> ? (p['project_id'] as num?)?.toInt() : null;
  }
}
