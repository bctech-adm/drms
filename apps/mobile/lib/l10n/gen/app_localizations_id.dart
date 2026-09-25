// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Indonesian (`id`).
class AppLocalizationsId extends AppLocalizations {
  AppLocalizationsId([String locale = 'id']) : super(locale);

  @override
  String get appTitle => 'ProyekKas';

  @override
  String get loading => 'Memuat…';

  @override
  String get retry => 'Coba lagi';

  @override
  String get cancel => 'Batal';

  @override
  String get save => 'Simpan';

  @override
  String get close => 'Tutup';

  @override
  String get delete => 'Hapus';

  @override
  String get yes => 'Ya';

  @override
  String get no => 'Tidak';

  @override
  String get next => 'Lanjut';

  @override
  String get needsInternet => 'Butuh koneksi internet';

  @override
  String get offlineBanner => 'Offline — data disimpan di HP dan dikirim otomatis saat online.';

  @override
  String pendingQueue(int count) {
    return '$count data menunggu dikirim';
  }

  @override
  String failedQueue(int count) {
    return '$count data gagal dikirim — buka Antrean';
  }

  @override
  String get loginTitle => 'Masuk ke ProyekKas';

  @override
  String get loginSubtitle => 'Gunakan akun DRMS Anda. Halaman masuk dibuka di browser HP.';

  @override
  String get loginButton => 'Masuk';

  @override
  String get loginCancelled =>
      'Login dibatalkan. Jika halaman login tidak kembali ke aplikasi, tutup browser lalu tekan Masuk lagi.';

  @override
  String get loginFailed => 'Login gagal. Coba lagi.';

  @override
  String get loginNeedsInternet => 'Login pertama kali butuh koneksi internet.';

  @override
  String get sessionEnded => 'Sesi berakhir atau perangkat dicabut. Silakan masuk kembali.';

  @override
  String get deviceRevoked =>
      'Perangkat ini sudah dicabut dari akun Anda oleh Admin/Owner. Silakan masuk kembali atau hubungi Admin.';

  @override
  String get stagingBadge => 'STAGING';

  @override
  String get loginSubtitlePassword => 'Gunakan akun DRMS Anda.';

  @override
  String get loginUsernameLabel => 'Email atau username';

  @override
  String get loginUsernameRequired => 'Isi email atau username.';

  @override
  String get loginPasswordLabel => 'Kata sandi';

  @override
  String get loginPasswordRequired => 'Isi kata sandi.';

  @override
  String get loginShowPassword => 'Tampilkan kata sandi';

  @override
  String get loginHidePassword => 'Sembunyikan kata sandi';

  @override
  String get loginForgotPassword => 'Lupa kata sandi? Hubungi Admin.';

  @override
  String get updateRequiredTitle => 'Perbarui aplikasi';

  @override
  String updateRequiredBody(String current, String minimum) {
    return 'Versi aplikasi ini ($current) sudah tidak didukung. Versi minimal: $minimum.';
  }

  @override
  String get updateDownloadHint => 'Unduh versi terbaru dari:';

  @override
  String get copyLink => 'Salin tautan';

  @override
  String get updateContactAdmin => 'Hubungi admin untuk mendapatkan APK terbaru.';

  @override
  String updateAvailable(String version) {
    return 'Versi baru tersedia ($version).';
  }

  @override
  String get navHome => 'Beranda';

  @override
  String get navRequests => 'Pengajuan';

  @override
  String get navInbox => 'Persetujuan';

  @override
  String get navQueue => 'Antrean';

  @override
  String get navProfile => 'Profil';

  @override
  String greeting(String name) {
    return 'Halo, $name';
  }

  @override
  String get actionNewAdvance => 'Ajukan Uang Muka';

  @override
  String get actionNewReimburse => 'Ajukan Reimburse';

  @override
  String get actionMyRequests => 'Pengajuan Saya';

  @override
  String get actionInbox => 'Menunggu Persetujuan';

  @override
  String get actionAttendance => 'Absensi (segera hadir)';

  @override
  String get actionAllRequests => 'Semua Pengajuan';

  @override
  String get financeHint => 'Antrian transfer, verifikasi nota, dan kas dikerjakan di web admin.';

  @override
  String inboxCount(int count) {
    return '$count menunggu';
  }

  @override
  String get requestsTitle => 'Pengajuan';

  @override
  String get tabDrafts => 'Draft di HP';

  @override
  String get tabSent => 'Terkirim';

  @override
  String get noDrafts => 'Belum ada draft.';

  @override
  String get noRequests => 'Belum ada pengajuan.';

  @override
  String get loadMore => 'Muat lagi';

  @override
  String get draftUntitled => '(tanpa judul)';

  @override
  String get syncStateLocal => 'Belum dikirim';

  @override
  String get syncStateQueued => 'Menunggu sinkron';

  @override
  String get syncStateSynced => 'Tersimpan di server';

  @override
  String get syncStateConflict => 'Konflik — diubah di web';

  @override
  String get syncStateRejected => 'Ditolak server';

  @override
  String get syncStateSubmitted => 'Sudah diajukan';

  @override
  String get detailTitle => 'Detail Pengajuan';

  @override
  String get turnLabel => 'Giliran';

  @override
  String get timelineTitle => 'Posisi tanda tangan';

  @override
  String get linesTitle => 'Baris item';

  @override
  String get receiptsTitle => 'Nota';

  @override
  String get flagsTitle => 'Flag validasi';

  @override
  String get grandTotal => 'Grand total';

  @override
  String get approvedAmount => 'Disetujui';

  @override
  String get neededDate => 'Tanggal dibutuhkan';

  @override
  String get requestDate => 'Tanggal pengajuan';

  @override
  String get requesters => 'Diajukan oleh';

  @override
  String get createdBy => 'Dibuat oleh';

  @override
  String get bankAccount => 'Rekening tujuan';

  @override
  String get scopeLabel => 'Project / pusat biaya';

  @override
  String get rejectReasonLabel => 'Alasan ditolak';

  @override
  String get budgetImpact => 'Dampak anggaran';

  @override
  String get budgetNone => 'Tanpa anggaran';

  @override
  String budgetChange(String before, String after) {
    return '$before → $after';
  }

  @override
  String get receiptThumbFailed => 'Gambar tidak dapat dimuat';

  @override
  String get totalPreview => 'Total (pratinjau)';

  @override
  String get previewNote => 'Nilai final dihitung server.';

  @override
  String get editorNewTitle => 'Pengajuan baru';

  @override
  String get editorEditTitle => 'Ubah draft';

  @override
  String get fieldType => 'Jenis';

  @override
  String get fieldTitle => 'Judul';

  @override
  String get fieldProject => 'Project';

  @override
  String get fieldCostCenter => 'Pusat biaya';

  @override
  String get fieldNeededDate => 'Tanggal dibutuhkan';

  @override
  String get fieldNotes => 'Keterangan';

  @override
  String get fieldRequesters => 'Diajukan oleh (pemohon)';

  @override
  String get fieldBankAccount => 'Rekening tujuan';

  @override
  String get scopeProject => 'Project';

  @override
  String get scopeCostCenter => 'Pusat biaya';

  @override
  String get none => '— Tidak ada —';

  @override
  String get choose => 'Pilih…';

  @override
  String get addLine => 'Tambah baris';

  @override
  String get saveDraft => 'Simpan draft';

  @override
  String get submit => 'Ajukan';

  @override
  String get submitConfirm =>
      'Ajukan pengajuan ini? Setelah diajukan, nomor dokumen dibuat server dan draft tidak bisa diubah bebas.';

  @override
  String get submitted => 'Pengajuan berhasil diajukan.';

  @override
  String get draftSaved => 'Draft disimpan di HP.';

  @override
  String get draftSavedQueued => 'Draft disimpan dan akan dikirim saat online.';

  @override
  String get deleteDraftConfirm => 'Hapus draft ini dari HP?';

  @override
  String get mastersMissing => 'Data master belum tersedia. Buka aplikasi saat online sekali untuk mengunduhnya.';

  @override
  String lineTitle(int no) {
    return 'Baris $no';
  }

  @override
  String get fieldDescription => 'Uraian';

  @override
  String get fieldQty => 'Jumlah';

  @override
  String get fieldUom => 'Satuan';

  @override
  String get fieldUnitPrice => 'Harga satuan';

  @override
  String get fieldTotal => 'Total';

  @override
  String get fieldCategory => 'Kategori';

  @override
  String get fieldVehicle => 'Kendaraan';

  @override
  String get fieldLineNotes => 'Keterangan baris';

  @override
  String get unitPriceHint => 'Informasi saja — total tidak dihitung otomatis.';

  @override
  String receiptDiff(String amount) {
    return 'Selisih total baris vs nota: $amount';
  }

  @override
  String get addReceiptCamera => 'Foto nota (kamera)';

  @override
  String get addReceiptGallery => 'Dari galeri';

  @override
  String get receiptNo => 'Nomor nota';

  @override
  String get receiptVendor => 'Toko / vendor';

  @override
  String get receiptDate => 'Tanggal nota';

  @override
  String get receiptTime => 'Jam nota';

  @override
  String get receiptAmount => 'Nominal di nota';

  @override
  String get receiptDetailsTitle => 'Data nota';

  @override
  String get photoCompressing => 'Mengompres foto…';

  @override
  String get searchHint => 'Cari…';

  @override
  String get draftNotFound => 'Draft tidak ditemukan.';

  @override
  String get cameraUnavailable => 'Kamera belakang tidak tersedia.';

  @override
  String get cameraPermission => 'Izin kamera ditolak. Aktifkan di Pengaturan HP.';

  @override
  String get takePhoto => 'Ambil foto';

  @override
  String get invalidAmount => 'Nominal tidak valid';

  @override
  String get required => 'Wajib diisi';

  @override
  String get inboxTitle => 'Menunggu Persetujuan';

  @override
  String get inboxEmpty => 'Tidak ada pengajuan yang menunggu Anda.';

  @override
  String get stepAcknowledge => 'Diketahui';

  @override
  String stepApprove(int level) {
    return 'Approval level $level';
  }

  @override
  String flagsCount(int warning, int info) {
    return '$warning peringatan · $info info';
  }

  @override
  String get actionAcknowledge => 'Diketahui';

  @override
  String get actionApprove => 'Setujui';

  @override
  String get actionReject => 'Tolak';

  @override
  String get decisionTitleAcknowledge => 'Tandai diketahui';

  @override
  String get decisionTitleApprove => 'Setujui pengajuan';

  @override
  String get decisionTitleReject => 'Tolak pengajuan';

  @override
  String get rejectReason => 'Alasan penolakan';

  @override
  String get rejectReasonTooShort => 'Alasan wajib diisi (minimal 3 karakter).';

  @override
  String get signatureMode => 'Tanda tangan';

  @override
  String get signatureProfile => 'Pakai tanda tangan profil';

  @override
  String get signatureDraw => 'Tanda tangan di layar';

  @override
  String get signatureClear => 'Ulangi';

  @override
  String get signatureEmpty => 'Tanda tangan belum dibuat.';

  @override
  String get signatureTooLarge => 'Tanda tangan terlalu besar. Ulangi dengan goresan lebih sederhana.';

  @override
  String get confirm => 'Konfirmasi';

  @override
  String get decisionDone => 'Keputusan tersimpan.';

  @override
  String get transferTitle => 'Transfer dari Finance';

  @override
  String get transferNone => 'Belum ada transfer.';

  @override
  String get transferTotal => 'Total ditransfer';

  @override
  String get transferRef => 'Ref. bank';

  @override
  String get transferPosted => 'Tercatat';

  @override
  String get transferVoid => 'Dibatalkan';

  @override
  String transferVoidReason(String reason) {
    return 'Alasan batal: $reason';
  }

  @override
  String get lpjTitle => 'LPJ (Laporan Pertanggungjawaban)';

  @override
  String get lpjStatus => 'Status LPJ';

  @override
  String get lpjReceiptsTotal => 'Total nota';

  @override
  String get lpjVerifiedTotal => 'Nota terverifikasi';

  @override
  String get lpjDifference => 'Selisih';

  @override
  String get lpjSettlement => 'Penyelesaian';

  @override
  String get lpjUsageNotes => 'Keterangan penggunaan dana';

  @override
  String get lpjFinanceNotes => 'Catatan Finance';

  @override
  String get requesterActionsTitle => 'Nota & LPJ';

  @override
  String get addReceiptOnlineCamera => 'Tambah nota (kamera)';

  @override
  String get addReceiptOnlineGallery => 'Tambah nota dari galeri';

  @override
  String get chooseLine => 'Nota ini untuk baris mana?';

  @override
  String get uploadingReceipt => 'Mengunggah nota…';

  @override
  String get receiptSaved => 'Nota tersimpan.';

  @override
  String get receiptRemove => 'Hapus nota';

  @override
  String get receiptRemoveReason => 'Alasan menghapus nota';

  @override
  String get receiptRemoved => 'Nota dihapus.';

  @override
  String get reasonTooShort => 'Wajib diisi (minimal 3 karakter).';

  @override
  String get actionReceiptsComplete => 'Nota sudah lengkap';

  @override
  String get actionReceiptsCompleteConfirm => 'Tandai semua nota sudah lengkap? Setelah itu Anda bisa mengirim LPJ.';

  @override
  String get actionLpjSubmit => 'Kirim LPJ';

  @override
  String get actionLpjResubmit => 'Kirim ulang LPJ';

  @override
  String get lpjUsageNotesHint => 'Jelaskan penggunaan dana (wajib pada pengiriman pertama).';

  @override
  String get actionReceiptsResubmit => 'Kirim ulang nota';

  @override
  String get actionReceiptsResubmitConfirm => 'Kirim ulang nota yang sudah diperbaiki ke Finance?';

  @override
  String get actionComplete => 'Tandai selesai';

  @override
  String get actionCompleteConfirm => 'Dana sudah diterima dan pengajuan ini selesai?';

  @override
  String get actionSaved => 'Tersimpan.';

  @override
  String get notificationsTitle => 'Notifikasi';

  @override
  String get notificationsEmpty => 'Belum ada notifikasi.';

  @override
  String get notificationsReadAll => 'Tandai semua dibaca';

  @override
  String get queueTitle => 'Antrean kirim';

  @override
  String get queueEmpty => 'Tidak ada data yang menunggu dikirim.';

  @override
  String get syncNow => 'Kirim sekarang';

  @override
  String get retryFailed => 'Coba lagi yang gagal';

  @override
  String get syncServerUnsupported => 'Server belum mendukung sinkron offline. Data tetap aman di HP.';

  @override
  String get syncDone => 'Sinkron selesai.';

  @override
  String get queueStatusPending => 'Menunggu';

  @override
  String get queueStatusApplied => 'Terkirim';

  @override
  String get queueStatusRejected => 'Ditolak';

  @override
  String get queueStatusConflict => 'Konflik';

  @override
  String get queueStatusFailed => 'Gagal dikirim';

  @override
  String get queueStatusSuperseded => 'Diganti';

  @override
  String queueUsage(String used) {
    return 'Penyimpanan offline: $used dari 100 MB';
  }

  @override
  String get profileTitle => 'Profil';

  @override
  String get profileRoles => 'Peran';

  @override
  String get profileEmployee => 'Karyawan';

  @override
  String get profileVersion => 'Versi aplikasi';

  @override
  String get profileDevice => 'ID perangkat';

  @override
  String get pushDisabled => 'Notifikasi push belum aktif.';

  @override
  String get logout => 'Keluar';

  @override
  String get logoutConfirm => 'Keluar dari aplikasi?';

  @override
  String logoutPendingWarning(int count) {
    return 'Masih ada $count data belum terkirim. Data tetap tersimpan terenkripsi di HP dan hanya bisa dikirim setelah Anda masuk lagi dengan akun yang sama.';
  }
}
