import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../../core/network/api_client.dart';
import '../domain/expense_request.dart';
import 'expense_mappers.dart';

class ExpensePage {
  const ExpensePage(this.items, this.nextCursor);
  final List<ExpenseSummary> items;
  final String? nextCursor;
}

/// `/api/v1/expense-requests*` + `/media/*` (online operations).
class ExpenseApi {
  ExpenseApi(this.client);
  final ApiClient client;

  Options _idem(String key) => Options(headers: {'Idempotency-Key': key});

  Future<ExpensePage> list({String scope = 'mine', String? cursor, int limit = 30}) => client.run(
    (d) => d.get<dynamic>('/expense-requests', queryParameters: {'scope': scope, 'limit': limit, 'cursor': ?cursor}),
    (data) {
      final m = data as Map<String, dynamic>;
      return ExpensePage([
        for (final i in (m['items'] as List<dynamic>? ?? const [])) summaryFromJson(i as Map<String, dynamic>),
      ], m['nextCursor'] as String?);
    },
  );

  Future<ExpenseDetail> detail(int id) => client.run(
    (d) => d.get<dynamic>('/expense-requests/$id'),
    (data) => detailFromJson(data as Map<String, dynamic>),
  );

  /// Create a server draft; `clientUuid` makes a retry return the existing draft.
  Future<ExpenseDetail> create(Map<String, dynamic> body, {required String idempotencyKey}) => client.run(
    (d) => d.post<dynamic>('/expense-requests', data: body, options: _idem(idempotencyKey)),
    (data) => detailFromJson(data as Map<String, dynamic>),
  );

  /// Upload one compressed image (`POST /media/{kind}`, multipart field `file`) → media id.
  Future<int> uploadMedia(String kind, Uint8List bytes, {required String filename, String mime = 'image/jpeg'}) =>
      client.run(
        (d) => d.post<dynamic>(
          '/media/$kind',
          data: FormData.fromMap({
            'file': MultipartFile.fromBytes(bytes, filename: filename, contentType: DioMediaType.parse(mime)),
          }),
        ),
        (data) => ((data as Map<String, dynamic>)['id'] as num).toInt(),
      );

  Future<ExpenseDetail> addReceipt(int requestId, Map<String, dynamic> body, {required String idempotencyKey}) =>
      client.run(
        (d) => d.post<dynamic>('/expense-requests/$requestId/receipts', data: body, options: _idem(idempotencyKey)),
        (data) => detailFromJson(data as Map<String, dynamic>),
      );

  Future<ExpenseDetail> submit(int requestId, {required String idempotencyKey, int? signatureMediaId}) => client.run(
    (d) => d.post<dynamic>(
      '/expense-requests/$requestId/submit',
      data: {'signatureMediaId': ?signatureMediaId},
      options: _idem(idempotencyKey),
    ),
    (data) => detailFromJson(data as Map<String, dynamic>),
  );

  /// Receipt image (thumbnail variant) via the authorized file endpoint (ADR 0004 §4a).
  Future<Uint8List> receiptImage(int imageId, {bool thumb = true}) => client.run(
    (d) => d.get<dynamic>(
      '/media/receipts/$imageId/file',
      queryParameters: {if (thumb) 'variant': 'thumb'},
      options: Options(responseType: ResponseType.bytes),
    ),
    (data) => Uint8List.fromList(data as List<int>),
  );
}
