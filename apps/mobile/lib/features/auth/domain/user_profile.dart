import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_profile.freezed.dart';

enum Role {
  staff('pk-staff'),
  pm('pk-pm'),
  finance('pk-finance'),
  owner('pk-owner'),
  admin('pk-admin');

  const Role(this.code);
  final String code;

  static Role? fromCode(String code) {
    for (final r in Role.values) {
      if (r.code == code) return r;
    }
    return null;
  }
}

/// Home variant chosen from the roles (union of permissions; the server re-checks every action).
enum HomeKind { owner, finance, pm, staff }

@freezed
abstract class Employee with _$Employee {
  const factory Employee({required int id, required String code, required String name}) = _Employee;
}

@freezed
abstract class ImageTargets with _$ImageTargets {
  const factory ImageTargets({@Default(2000) int receiptsMaxPx, @Default(80) int jpegQuality}) = _ImageTargets;
}

/// `GET /api/v1/me` (openapi `Me`).
@freezed
abstract class UserProfile with _$UserProfile {
  const UserProfile._();
  const factory UserProfile({
    required int id,
    required String email,
    String? name,
    required Set<Role> roles,
    Employee? employee,
    @Default('Asia/Makassar') String timezone,
    String? minAppVersion,
    @Default(ImageTargets()) ImageTargets imageTargets,
    String? serverTime,
  }) = _UserProfile;

  bool has(Role r) => roles.contains(r);

  String get displayName => (name == null || name!.trim().isEmpty) ? email : name!;

  /// Owner first (approval inbox), then Finance (read-only on mobile), PM, Staff.
  HomeKind get homeKind {
    if (has(Role.owner)) return HomeKind.owner;
    if (has(Role.finance)) return HomeKind.finance;
    if (has(Role.pm)) return HomeKind.pm;
    return HomeKind.staff;
  }

  /// Who sees the "Persetujuan" inbox: Owner (approve) and PM (Diketahui, US-42).
  bool get hasApprovalInbox => has(Role.owner) || has(Role.pm);

  /// Who may create requests on the APK (requirements §4: Staff and PM create own requests).
  bool get canCreateRequests => has(Role.staff) || has(Role.pm) || has(Role.admin);
}
