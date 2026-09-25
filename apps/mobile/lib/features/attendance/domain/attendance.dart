import 'dart:math';

import '../../../core/location/location_service.dart';
import '../../expense/data/expense_mappers.dart' show selfiePlaceholderKey;
import '../../masters/domain/master_item.dart';
import '../../sync/domain/sync_models.dart';

/// Own attendance (F4 slice of US-01/US-02; the server re-checks everything — ADR 0010 decision 8).
enum AttendanceKind {
  checkIn(SyncItemType.attendanceCheckIn, 'Absen masuk'),
  checkOut(SyncItemType.attendanceCheckOut, 'Absen pulang');

  const AttendanceKind(this.itemType, this.label);
  final String itemType;
  final String label;

  static AttendanceKind? fromItemType(String t) => AttendanceKind.values.where((k) => k.itemType == t).firstOrNull;
}

/// Geofence of an assigned project from the cached masters (`projects`: lat, lng, radiusM).
class ProjectSite {
  const ProjectSite({required this.id, required this.label, this.lat, this.lng, this.radiusM});
  final int id;
  final String label;
  final double? lat;
  final double? lng;
  final double? radiusM;

  bool get hasGeofence => lat != null && lng != null && radiusM != null;

  static ProjectSite fromMaster(MasterItem m) {
    double? d(String k) => (m.extra[k] as num?)?.toDouble();
    return ProjectSite(id: m.id, label: m.label, lat: d('lat'), lng: d('lng'), radiusM: d('radiusM'));
  }
}

/// Same rule as the server (apps/web/src/domain/sync/attendance.ts): haversine, radius + accuracy
/// allowance capped at 50 m. Client side it only enables the buttons (US-01); never trusted.
const accuracyAllowanceCapM = 50.0;

double haversineM(double lat1, double lng1, double lat2, double lng2) {
  const r = 6371008.8;
  double rad(double d) => d * pi / 180;
  final dLat = rad(lat2 - lat1);
  final dLng = rad(lng2 - lng1);
  final a = pow(sin(dLat / 2), 2) + cos(rad(lat1)) * cos(rad(lat2)) * pow(sin(dLng / 2), 2);
  return 2 * r * asin(min(1.0, sqrt(a)));
}

enum SiteCheck { ok, outside, noGeofence, mocked }

({SiteCheck check, int? distanceM}) checkSite(ProjectSite site, LocationFix fix) {
  if (fix.isMocked) return (check: SiteCheck.mocked, distanceM: null);
  if (!site.hasGeofence) return (check: SiteCheck.noGeofence, distanceM: null);
  final dist = haversineM(fix.lat, fix.lng, site.lat!, site.lng!);
  final allowance = min(max(fix.accuracyM, 0.0), accuracyAllowanceCapM);
  return (check: dist <= site.radiusM! + allowance ? SiteCheck.ok : SiteCheck.outside, distanceM: dist.round());
}

/// `SyncAttendancePayload` (openapi) with the local selfie id in [selfiePlaceholderKey]; the sync engine
/// uploads the selfie (`POST /media/selfies`) and replaces it with `selfie_media_id` just before sending.
Map<String, dynamic> attendancePayload({
  required int projectId,
  required LocationFix fix,
  required String selfieUuid,
}) => {
  'project_id': projectId,
  'lat': fix.lat,
  'lng': fix.lng,
  'accuracy_m': double.parse(fix.accuracyM.toStringAsFixed(1)),
  'is_mocked': fix.isMocked,
  'camera_lens': 'front',
  selfiePlaceholderKey: selfieUuid,
};
