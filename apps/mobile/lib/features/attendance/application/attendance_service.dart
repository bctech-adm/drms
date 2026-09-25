import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:camera/camera.dart' show CameraLensDirection;
import 'package:uuid/uuid.dart';

import '../../../app/providers.dart';
import '../../../core/db/app_database.dart';
import '../../../core/format/dates.dart';
import '../../../core/location/location_service.dart';
import '../../../core/media/compress_plan.dart';
import '../../../core/media/photo_compressor.dart';
import '../../../core/time/device_clock.dart';
import '../../auth/application/auth_controller.dart';
import '../../expense/data/draft_repository.dart';
import '../../expense/presentation/camera_capture_screen.dart';
import '../../masters/domain/master_item.dart';
import '../../sync/data/outbox_repository.dart';
import '../domain/attendance.dart';

/// Queues own check-in/out: selfie compressed on the device (720 px, ≤ 150 KB, EXIF dropped) and kept
/// encrypted in the local DB, then one outbox item (works without signal; ADR 0010 decisions 5/7).
class AttendanceService {
  AttendanceService({required this.drafts, required this.outbox, required this.clock, required this.compressor});
  final DraftRepository drafts;
  final OutboxRepository outbox;
  final DeviceClock clock;
  final PhotoCompressor compressor;

  Future<String> record({
    required String sub,
    required AttendanceKind kind,
    required ProjectSite site,
    required LocationFix fix,
    required Uint8List rawSelfie,
    required bool online,
  }) async {
    final photo = await compressor.compress(rawSelfie, PhotoTarget.selfie);
    final selfieUuid = const Uuid().v7();
    await drafts.addMedia(sub, uuid: selfieUuid, kind: 'selfie', bytes: photo.bytes, sha256: photo.sha256Hex);
    return outbox.enqueueAttendance(
      sub: sub,
      type: kind.itemType,
      payload: attendancePayload(projectId: site.id, fix: fix, selfieUuid: selfieUuid),
      selfieUuid: selfieUuid,
      deviceTime: isoWithOffset(clock.now()),
      elapsedMs: await clock.elapsedMs(),
      bootId: await clock.bootId(),
      offline: !online,
    );
  }
}

final attendanceServiceProvider = Provider(
  (ref) => AttendanceService(
    drafts: ref.watch(draftRepositoryProvider),
    outbox: ref.watch(outboxRepositoryProvider),
    clock: ref.watch(deviceClockProvider),
    compressor: ref.watch(photoCompressorProvider),
  ),
);

final locationServiceProvider = Provider<LocationService>((ref) => GeolocatorLocationService());

typedef SelfieCapture = Future<Uint8List?> Function(BuildContext context, String title);

/// Front camera only, no gallery (ADR 0010 decision 11). Overridden in widget tests.
final selfieCaptureProvider = Provider<SelfieCapture>(
  (ref) =>
      (context, title) => Navigator.of(context).push<Uint8List>(
        MaterialPageRoute(
          builder: (_) => CameraCaptureScreen(lens: CameraLensDirection.front, title: title),
        ),
      ),
);

/// Assigned projects of the user (masters are access-filtered server-side), with their geofence.
final attendanceSitesProvider = FutureProvider<List<ProjectSite>>((ref) async {
  final sub = ref.watch(currentSubProvider);
  if (sub == null) return const [];
  final masters = await ref.watch(mastersRepositoryProvider).cached(sub);
  return [for (final m in masters[MasterTypes.projects] ?? const <MasterItem>[]) ProjectSite.fromMaster(m)];
});

/// Latest attendance items of this user in the outbox (queued / sent / rejected).
final attendanceItemsProvider = StreamProvider<List<OutboxData>>((ref) {
  final sub = ref.watch(currentSubProvider);
  if (sub == null) return Stream.value(const []);
  return ref.watch(outboxRepositoryProvider).watchAttendance(sub);
});
