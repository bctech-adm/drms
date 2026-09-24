import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../domain/sync_models.dart';

/// `/api/v1/sync/*` (ADR 0010 "Sync contract").
class SyncApi {
  SyncApi(this.client);
  final ApiClient client;

  /// `PUT /sync/media/{client_uuid}` — idempotent by (uuid, sha256); 409 = same uuid, other bytes.
  Future<void> putMedia(
    String clientUuid,
    Uint8List bytes, {
    required String kind,
    required String sha256,
    String mime = 'image/jpeg',
  }) => client.run(
    (d) => d.put<dynamic>(
      '/sync/media/$clientUuid',
      data: FormData.fromMap({
        'file': MultipartFile.fromBytes(
          bytes,
          filename: '$clientUuid.${mime == 'image/png' ? 'png' : 'jpg'}',
          contentType: DioMediaType.parse(mime),
        ),
        'kind': kind,
        'sha256': sha256,
      }),
    ),
    (_) {},
  );

  Future<BatchResponse> postBatch({
    required String batchId,
    required String deviceId,
    required ClockInfo clock,
    required List<QueuedItem> items,
  }) => client.run(
    (d) => d.post<dynamic>(
      '/sync/batch',
      data: {
        'batch_id': batchId,
        'device_id': deviceId,
        'clock': clock.toJson(),
        'items': [for (final i in items) i.toJson()],
      },
      options: Options(headers: {'Idempotency-Key': batchId}),
    ),
    (data) => BatchResponse.fromJson(data as Map<String, dynamic>),
  );
}
