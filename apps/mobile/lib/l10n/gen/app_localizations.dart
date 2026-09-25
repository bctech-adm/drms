import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_id.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('id')];

  /// No description provided for @appTitle.
  ///
  /// In id, this message translates to:
  /// **'ProyekKas'**
  String get appTitle;

  /// No description provided for @loading.
  ///
  /// In id, this message translates to:
  /// **'Memuat…'**
  String get loading;

  /// No description provided for @retry.
  ///
  /// In id, this message translates to:
  /// **'Coba lagi'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In id, this message translates to:
  /// **'Batal'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In id, this message translates to:
  /// **'Simpan'**
  String get save;

  /// No description provided for @close.
  ///
  /// In id, this message translates to:
  /// **'Tutup'**
  String get close;

  /// No description provided for @delete.
  ///
  /// In id, this message translates to:
  /// **'Hapus'**
  String get delete;

  /// No description provided for @yes.
  ///
  /// In id, this message translates to:
  /// **'Ya'**
  String get yes;

  /// No description provided for @no.
  ///
  /// In id, this message translates to:
  /// **'Tidak'**
  String get no;

  /// No description provided for @next.
  ///
  /// In id, this message translates to:
  /// **'Lanjut'**
  String get next;

  /// No description provided for @needsInternet.
  ///
  /// In id, this message translates to:
  /// **'Butuh koneksi internet'**
  String get needsInternet;

  /// No description provided for @offlineBanner.
  ///
  /// In id, this message translates to:
  /// **'Offline — data disimpan di HP dan dikirim otomatis saat online.'**
  String get offlineBanner;

  /// No description provided for @pendingQueue.
  ///
  /// In id, this message translates to:
  /// **'{count} data menunggu dikirim'**
  String pendingQueue(int count);

  /// No description provided for @failedQueue.
  ///
  /// In id, this message translates to:
  /// **'{count} data gagal dikirim — buka Antrean'**
  String failedQueue(int count);

  /// No description provided for @loginTitle.
  ///
  /// In id, this message translates to:
  /// **'Masuk ke ProyekKas'**
  String get loginTitle;

  /// No description provided for @loginSubtitle.
  ///
  /// In id, this message translates to:
  /// **'Gunakan akun DRMS Anda. Halaman masuk dibuka di browser HP.'**
  String get loginSubtitle;

  /// No description provided for @loginButton.
  ///
  /// In id, this message translates to:
  /// **'Masuk'**
  String get loginButton;

  /// No description provided for @loginCancelled.
  ///
  /// In id, this message translates to:
  /// **'Login dibatalkan. Jika halaman login tidak kembali ke aplikasi, tutup browser lalu tekan Masuk lagi.'**
  String get loginCancelled;

  /// No description provided for @loginFailed.
  ///
  /// In id, this message translates to:
  /// **'Login gagal. Coba lagi.'**
  String get loginFailed;

  /// No description provided for @loginNeedsInternet.
  ///
  /// In id, this message translates to:
  /// **'Login pertama kali butuh koneksi internet.'**
  String get loginNeedsInternet;

  /// No description provided for @sessionEnded.
  ///
  /// In id, this message translates to:
  /// **'Sesi berakhir atau perangkat dicabut. Silakan masuk kembali.'**
  String get sessionEnded;

  /// No description provided for @stagingBadge.
  ///
  /// In id, this message translates to:
  /// **'STAGING'**
  String get stagingBadge;

  /// No description provided for @loginSubtitlePassword.
  ///
  /// In id, this message translates to:
  /// **'Gunakan akun DRMS Anda.'**
  String get loginSubtitlePassword;

  /// No description provided for @loginUsernameLabel.
  ///
  /// In id, this message translates to:
  /// **'Email atau username'**
  String get loginUsernameLabel;

  /// No description provided for @loginUsernameRequired.
  ///
  /// In id, this message translates to:
  /// **'Isi email atau username.'**
  String get loginUsernameRequired;

  /// No description provided for @loginPasswordLabel.
  ///
  /// In id, this message translates to:
  /// **'Kata sandi'**
  String get loginPasswordLabel;

  /// No description provided for @loginPasswordRequired.
  ///
  /// In id, this message translates to:
  /// **'Isi kata sandi.'**
  String get loginPasswordRequired;

  /// No description provided for @loginShowPassword.
  ///
  /// In id, this message translates to:
  /// **'Tampilkan kata sandi'**
  String get loginShowPassword;

  /// No description provided for @loginHidePassword.
  ///
  /// In id, this message translates to:
  /// **'Sembunyikan kata sandi'**
  String get loginHidePassword;

  /// No description provided for @loginForgotPassword.
  ///
  /// In id, this message translates to:
  /// **'Lupa kata sandi? Hubungi Admin.'**
  String get loginForgotPassword;

  /// No description provided for @updateRequiredTitle.
  ///
  /// In id, this message translates to:
  /// **'Perbarui aplikasi'**
  String get updateRequiredTitle;

  /// No description provided for @updateRequiredBody.
  ///
  /// In id, this message translates to:
  /// **'Versi aplikasi ini ({current}) sudah tidak didukung. Versi minimal: {minimum}.'**
  String updateRequiredBody(String current, String minimum);

  /// No description provided for @updateDownloadHint.
  ///
  /// In id, this message translates to:
  /// **'Unduh versi terbaru dari:'**
  String get updateDownloadHint;

  /// No description provided for @copyLink.
  ///
  /// In id, this message translates to:
  /// **'Salin tautan'**
  String get copyLink;

  /// No description provided for @updateContactAdmin.
  ///
  /// In id, this message translates to:
  /// **'Hubungi admin untuk mendapatkan APK terbaru.'**
  String get updateContactAdmin;

  /// No description provided for @updateAvailable.
  ///
  /// In id, this message translates to:
  /// **'Versi baru tersedia ({version}).'**
  String updateAvailable(String version);

  /// No description provided for @navHome.
  ///
  /// In id, this message translates to:
  /// **'Beranda'**
  String get navHome;

  /// No description provided for @navRequests.
  ///
  /// In id, this message translates to:
  /// **'Pengajuan'**
  String get navRequests;

  /// No description provided for @navInbox.
  ///
  /// In id, this message translates to:
  /// **'Persetujuan'**
  String get navInbox;

  /// No description provided for @navQueue.
  ///
  /// In id, this message translates to:
  /// **'Antrean'**
  String get navQueue;

  /// No description provided for @navProfile.
  ///
  /// In id, this message translates to:
  /// **'Profil'**
  String get navProfile;

  /// No description provided for @greeting.
  ///
  /// In id, this message translates to:
  /// **'Halo, {name}'**
  String greeting(String name);

  /// No description provided for @actionNewAdvance.
  ///
  /// In id, this message translates to:
  /// **'Ajukan Uang Muka'**
  String get actionNewAdvance;

  /// No description provided for @actionNewReimburse.
  ///
  /// In id, this message translates to:
  /// **'Ajukan Reimburse'**
  String get actionNewReimburse;

  /// No description provided for @actionMyRequests.
  ///
  /// In id, this message translates to:
  /// **'Pengajuan Saya'**
  String get actionMyRequests;

  /// No description provided for @actionInbox.
  ///
  /// In id, this message translates to:
  /// **'Menunggu Persetujuan'**
  String get actionInbox;

  /// No description provided for @actionAttendance.
  ///
  /// In id, this message translates to:
  /// **'Absensi (segera hadir)'**
  String get actionAttendance;

  /// No description provided for @actionAllRequests.
  ///
  /// In id, this message translates to:
  /// **'Semua Pengajuan'**
  String get actionAllRequests;

  /// No description provided for @financeHint.
  ///
  /// In id, this message translates to:
  /// **'Antrian transfer, verifikasi nota, dan kas dikerjakan di web admin.'**
  String get financeHint;

  /// No description provided for @inboxCount.
  ///
  /// In id, this message translates to:
  /// **'{count} menunggu'**
  String inboxCount(int count);

  /// No description provided for @requestsTitle.
  ///
  /// In id, this message translates to:
  /// **'Pengajuan'**
  String get requestsTitle;

  /// No description provided for @tabDrafts.
  ///
  /// In id, this message translates to:
  /// **'Draft di HP'**
  String get tabDrafts;

  /// No description provided for @tabSent.
  ///
  /// In id, this message translates to:
  /// **'Terkirim'**
  String get tabSent;

  /// No description provided for @noDrafts.
  ///
  /// In id, this message translates to:
  /// **'Belum ada draft.'**
  String get noDrafts;

  /// No description provided for @noRequests.
  ///
  /// In id, this message translates to:
  /// **'Belum ada pengajuan.'**
  String get noRequests;

  /// No description provided for @loadMore.
  ///
  /// In id, this message translates to:
  /// **'Muat lagi'**
  String get loadMore;

  /// No description provided for @draftUntitled.
  ///
  /// In id, this message translates to:
  /// **'(tanpa judul)'**
  String get draftUntitled;

  /// No description provided for @syncStateLocal.
  ///
  /// In id, this message translates to:
  /// **'Belum dikirim'**
  String get syncStateLocal;

  /// No description provided for @syncStateQueued.
  ///
  /// In id, this message translates to:
  /// **'Menunggu sinkron'**
  String get syncStateQueued;

  /// No description provided for @syncStateSynced.
  ///
  /// In id, this message translates to:
  /// **'Tersimpan di server'**
  String get syncStateSynced;

  /// No description provided for @syncStateConflict.
  ///
  /// In id, this message translates to:
  /// **'Konflik — diubah di web'**
  String get syncStateConflict;

  /// No description provided for @syncStateRejected.
  ///
  /// In id, this message translates to:
  /// **'Ditolak server'**
  String get syncStateRejected;

  /// No description provided for @syncStateSubmitted.
  ///
  /// In id, this message translates to:
  /// **'Sudah diajukan'**
  String get syncStateSubmitted;

  /// No description provided for @detailTitle.
  ///
  /// In id, this message translates to:
  /// **'Detail Pengajuan'**
  String get detailTitle;

  /// No description provided for @turnLabel.
  ///
  /// In id, this message translates to:
  /// **'Giliran'**
  String get turnLabel;

  /// No description provided for @timelineTitle.
  ///
  /// In id, this message translates to:
  /// **'Posisi tanda tangan'**
  String get timelineTitle;

  /// No description provided for @linesTitle.
  ///
  /// In id, this message translates to:
  /// **'Baris item'**
  String get linesTitle;

  /// No description provided for @receiptsTitle.
  ///
  /// In id, this message translates to:
  /// **'Nota'**
  String get receiptsTitle;

  /// No description provided for @flagsTitle.
  ///
  /// In id, this message translates to:
  /// **'Flag validasi'**
  String get flagsTitle;

  /// No description provided for @grandTotal.
  ///
  /// In id, this message translates to:
  /// **'Grand total'**
  String get grandTotal;

  /// No description provided for @approvedAmount.
  ///
  /// In id, this message translates to:
  /// **'Disetujui'**
  String get approvedAmount;

  /// No description provided for @neededDate.
  ///
  /// In id, this message translates to:
  /// **'Tanggal dibutuhkan'**
  String get neededDate;

  /// No description provided for @requestDate.
  ///
  /// In id, this message translates to:
  /// **'Tanggal pengajuan'**
  String get requestDate;

  /// No description provided for @requesters.
  ///
  /// In id, this message translates to:
  /// **'Diajukan oleh'**
  String get requesters;

  /// No description provided for @createdBy.
  ///
  /// In id, this message translates to:
  /// **'Dibuat oleh'**
  String get createdBy;

  /// No description provided for @bankAccount.
  ///
  /// In id, this message translates to:
  /// **'Rekening tujuan'**
  String get bankAccount;

  /// No description provided for @scopeLabel.
  ///
  /// In id, this message translates to:
  /// **'Project / pusat biaya'**
  String get scopeLabel;

  /// No description provided for @rejectReasonLabel.
  ///
  /// In id, this message translates to:
  /// **'Alasan ditolak'**
  String get rejectReasonLabel;

  /// No description provided for @budgetImpact.
  ///
  /// In id, this message translates to:
  /// **'Dampak anggaran'**
  String get budgetImpact;

  /// No description provided for @budgetNone.
  ///
  /// In id, this message translates to:
  /// **'Tanpa anggaran'**
  String get budgetNone;

  /// No description provided for @budgetChange.
  ///
  /// In id, this message translates to:
  /// **'{before} → {after}'**
  String budgetChange(String before, String after);

  /// No description provided for @receiptThumbFailed.
  ///
  /// In id, this message translates to:
  /// **'Gambar tidak dapat dimuat'**
  String get receiptThumbFailed;

  /// No description provided for @totalPreview.
  ///
  /// In id, this message translates to:
  /// **'Total (pratinjau)'**
  String get totalPreview;

  /// No description provided for @previewNote.
  ///
  /// In id, this message translates to:
  /// **'Nilai final dihitung server.'**
  String get previewNote;

  /// No description provided for @editorNewTitle.
  ///
  /// In id, this message translates to:
  /// **'Pengajuan baru'**
  String get editorNewTitle;

  /// No description provided for @editorEditTitle.
  ///
  /// In id, this message translates to:
  /// **'Ubah draft'**
  String get editorEditTitle;

  /// No description provided for @fieldType.
  ///
  /// In id, this message translates to:
  /// **'Jenis'**
  String get fieldType;

  /// No description provided for @fieldTitle.
  ///
  /// In id, this message translates to:
  /// **'Judul'**
  String get fieldTitle;

  /// No description provided for @fieldProject.
  ///
  /// In id, this message translates to:
  /// **'Project'**
  String get fieldProject;

  /// No description provided for @fieldCostCenter.
  ///
  /// In id, this message translates to:
  /// **'Pusat biaya'**
  String get fieldCostCenter;

  /// No description provided for @fieldNeededDate.
  ///
  /// In id, this message translates to:
  /// **'Tanggal dibutuhkan'**
  String get fieldNeededDate;

  /// No description provided for @fieldNotes.
  ///
  /// In id, this message translates to:
  /// **'Keterangan'**
  String get fieldNotes;

  /// No description provided for @fieldRequesters.
  ///
  /// In id, this message translates to:
  /// **'Diajukan oleh (pemohon)'**
  String get fieldRequesters;

  /// No description provided for @fieldBankAccount.
  ///
  /// In id, this message translates to:
  /// **'Rekening tujuan'**
  String get fieldBankAccount;

  /// No description provided for @scopeProject.
  ///
  /// In id, this message translates to:
  /// **'Project'**
  String get scopeProject;

  /// No description provided for @scopeCostCenter.
  ///
  /// In id, this message translates to:
  /// **'Pusat biaya'**
  String get scopeCostCenter;

  /// No description provided for @none.
  ///
  /// In id, this message translates to:
  /// **'— Tidak ada —'**
  String get none;

  /// No description provided for @choose.
  ///
  /// In id, this message translates to:
  /// **'Pilih…'**
  String get choose;

  /// No description provided for @addLine.
  ///
  /// In id, this message translates to:
  /// **'Tambah baris'**
  String get addLine;

  /// No description provided for @saveDraft.
  ///
  /// In id, this message translates to:
  /// **'Simpan draft'**
  String get saveDraft;

  /// No description provided for @submit.
  ///
  /// In id, this message translates to:
  /// **'Ajukan'**
  String get submit;

  /// No description provided for @submitConfirm.
  ///
  /// In id, this message translates to:
  /// **'Ajukan pengajuan ini? Setelah diajukan, nomor dokumen dibuat server dan draft tidak bisa diubah bebas.'**
  String get submitConfirm;

  /// No description provided for @submitted.
  ///
  /// In id, this message translates to:
  /// **'Pengajuan berhasil diajukan.'**
  String get submitted;

  /// No description provided for @draftSaved.
  ///
  /// In id, this message translates to:
  /// **'Draft disimpan di HP.'**
  String get draftSaved;

  /// No description provided for @draftSavedQueued.
  ///
  /// In id, this message translates to:
  /// **'Draft disimpan dan akan dikirim saat online.'**
  String get draftSavedQueued;

  /// No description provided for @deleteDraftConfirm.
  ///
  /// In id, this message translates to:
  /// **'Hapus draft ini dari HP?'**
  String get deleteDraftConfirm;

  /// No description provided for @mastersMissing.
  ///
  /// In id, this message translates to:
  /// **'Data master belum tersedia. Buka aplikasi saat online sekali untuk mengunduhnya.'**
  String get mastersMissing;

  /// No description provided for @lineTitle.
  ///
  /// In id, this message translates to:
  /// **'Baris {no}'**
  String lineTitle(int no);

  /// No description provided for @fieldDescription.
  ///
  /// In id, this message translates to:
  /// **'Uraian'**
  String get fieldDescription;

  /// No description provided for @fieldQty.
  ///
  /// In id, this message translates to:
  /// **'Jumlah'**
  String get fieldQty;

  /// No description provided for @fieldUom.
  ///
  /// In id, this message translates to:
  /// **'Satuan'**
  String get fieldUom;

  /// No description provided for @fieldUnitPrice.
  ///
  /// In id, this message translates to:
  /// **'Harga satuan'**
  String get fieldUnitPrice;

  /// No description provided for @fieldTotal.
  ///
  /// In id, this message translates to:
  /// **'Total'**
  String get fieldTotal;

  /// No description provided for @fieldCategory.
  ///
  /// In id, this message translates to:
  /// **'Kategori'**
  String get fieldCategory;

  /// No description provided for @fieldVehicle.
  ///
  /// In id, this message translates to:
  /// **'Kendaraan'**
  String get fieldVehicle;

  /// No description provided for @fieldLineNotes.
  ///
  /// In id, this message translates to:
  /// **'Keterangan baris'**
  String get fieldLineNotes;

  /// No description provided for @unitPriceHint.
  ///
  /// In id, this message translates to:
  /// **'Informasi saja — total tidak dihitung otomatis.'**
  String get unitPriceHint;

  /// No description provided for @receiptDiff.
  ///
  /// In id, this message translates to:
  /// **'Selisih total baris vs nota: {amount}'**
  String receiptDiff(String amount);

  /// No description provided for @addReceiptCamera.
  ///
  /// In id, this message translates to:
  /// **'Foto nota (kamera)'**
  String get addReceiptCamera;

  /// No description provided for @addReceiptGallery.
  ///
  /// In id, this message translates to:
  /// **'Dari galeri'**
  String get addReceiptGallery;

  /// No description provided for @receiptNo.
  ///
  /// In id, this message translates to:
  /// **'Nomor nota'**
  String get receiptNo;

  /// No description provided for @receiptVendor.
  ///
  /// In id, this message translates to:
  /// **'Toko / vendor'**
  String get receiptVendor;

  /// No description provided for @receiptDate.
  ///
  /// In id, this message translates to:
  /// **'Tanggal nota'**
  String get receiptDate;

  /// No description provided for @receiptTime.
  ///
  /// In id, this message translates to:
  /// **'Jam nota'**
  String get receiptTime;

  /// No description provided for @receiptAmount.
  ///
  /// In id, this message translates to:
  /// **'Nominal di nota'**
  String get receiptAmount;

  /// No description provided for @receiptDetailsTitle.
  ///
  /// In id, this message translates to:
  /// **'Data nota'**
  String get receiptDetailsTitle;

  /// No description provided for @photoCompressing.
  ///
  /// In id, this message translates to:
  /// **'Mengompres foto…'**
  String get photoCompressing;

  /// No description provided for @searchHint.
  ///
  /// In id, this message translates to:
  /// **'Cari…'**
  String get searchHint;

  /// No description provided for @draftNotFound.
  ///
  /// In id, this message translates to:
  /// **'Draft tidak ditemukan.'**
  String get draftNotFound;

  /// No description provided for @cameraUnavailable.
  ///
  /// In id, this message translates to:
  /// **'Kamera belakang tidak tersedia.'**
  String get cameraUnavailable;

  /// No description provided for @cameraPermission.
  ///
  /// In id, this message translates to:
  /// **'Izin kamera ditolak. Aktifkan di Pengaturan HP.'**
  String get cameraPermission;

  /// No description provided for @takePhoto.
  ///
  /// In id, this message translates to:
  /// **'Ambil foto'**
  String get takePhoto;

  /// No description provided for @invalidAmount.
  ///
  /// In id, this message translates to:
  /// **'Nominal tidak valid'**
  String get invalidAmount;

  /// No description provided for @required.
  ///
  /// In id, this message translates to:
  /// **'Wajib diisi'**
  String get required;

  /// No description provided for @inboxTitle.
  ///
  /// In id, this message translates to:
  /// **'Menunggu Persetujuan'**
  String get inboxTitle;

  /// No description provided for @inboxEmpty.
  ///
  /// In id, this message translates to:
  /// **'Tidak ada pengajuan yang menunggu Anda.'**
  String get inboxEmpty;

  /// No description provided for @stepAcknowledge.
  ///
  /// In id, this message translates to:
  /// **'Diketahui'**
  String get stepAcknowledge;

  /// No description provided for @stepApprove.
  ///
  /// In id, this message translates to:
  /// **'Approval level {level}'**
  String stepApprove(int level);

  /// No description provided for @flagsCount.
  ///
  /// In id, this message translates to:
  /// **'{warning} peringatan · {info} info'**
  String flagsCount(int warning, int info);

  /// No description provided for @actionAcknowledge.
  ///
  /// In id, this message translates to:
  /// **'Diketahui'**
  String get actionAcknowledge;

  /// No description provided for @actionApprove.
  ///
  /// In id, this message translates to:
  /// **'Setujui'**
  String get actionApprove;

  /// No description provided for @actionReject.
  ///
  /// In id, this message translates to:
  /// **'Tolak'**
  String get actionReject;

  /// No description provided for @decisionTitleAcknowledge.
  ///
  /// In id, this message translates to:
  /// **'Tandai diketahui'**
  String get decisionTitleAcknowledge;

  /// No description provided for @decisionTitleApprove.
  ///
  /// In id, this message translates to:
  /// **'Setujui pengajuan'**
  String get decisionTitleApprove;

  /// No description provided for @decisionTitleReject.
  ///
  /// In id, this message translates to:
  /// **'Tolak pengajuan'**
  String get decisionTitleReject;

  /// No description provided for @rejectReason.
  ///
  /// In id, this message translates to:
  /// **'Alasan penolakan'**
  String get rejectReason;

  /// No description provided for @rejectReasonTooShort.
  ///
  /// In id, this message translates to:
  /// **'Alasan wajib diisi (minimal 3 karakter).'**
  String get rejectReasonTooShort;

  /// No description provided for @signatureMode.
  ///
  /// In id, this message translates to:
  /// **'Tanda tangan'**
  String get signatureMode;

  /// No description provided for @signatureProfile.
  ///
  /// In id, this message translates to:
  /// **'Pakai tanda tangan profil'**
  String get signatureProfile;

  /// No description provided for @signatureDraw.
  ///
  /// In id, this message translates to:
  /// **'Tanda tangan di layar'**
  String get signatureDraw;

  /// No description provided for @signatureClear.
  ///
  /// In id, this message translates to:
  /// **'Ulangi'**
  String get signatureClear;

  /// No description provided for @signatureEmpty.
  ///
  /// In id, this message translates to:
  /// **'Tanda tangan belum dibuat.'**
  String get signatureEmpty;

  /// No description provided for @signatureTooLarge.
  ///
  /// In id, this message translates to:
  /// **'Tanda tangan terlalu besar. Ulangi dengan goresan lebih sederhana.'**
  String get signatureTooLarge;

  /// No description provided for @confirm.
  ///
  /// In id, this message translates to:
  /// **'Konfirmasi'**
  String get confirm;

  /// No description provided for @decisionDone.
  ///
  /// In id, this message translates to:
  /// **'Keputusan tersimpan.'**
  String get decisionDone;

  /// No description provided for @queueTitle.
  ///
  /// In id, this message translates to:
  /// **'Antrean kirim'**
  String get queueTitle;

  /// No description provided for @queueEmpty.
  ///
  /// In id, this message translates to:
  /// **'Tidak ada data yang menunggu dikirim.'**
  String get queueEmpty;

  /// No description provided for @syncNow.
  ///
  /// In id, this message translates to:
  /// **'Kirim sekarang'**
  String get syncNow;

  /// No description provided for @retryFailed.
  ///
  /// In id, this message translates to:
  /// **'Coba lagi yang gagal'**
  String get retryFailed;

  /// No description provided for @syncServerUnsupported.
  ///
  /// In id, this message translates to:
  /// **'Server belum mendukung sinkron offline. Data tetap aman di HP.'**
  String get syncServerUnsupported;

  /// No description provided for @syncDone.
  ///
  /// In id, this message translates to:
  /// **'Sinkron selesai.'**
  String get syncDone;

  /// No description provided for @queueStatusPending.
  ///
  /// In id, this message translates to:
  /// **'Menunggu'**
  String get queueStatusPending;

  /// No description provided for @queueStatusApplied.
  ///
  /// In id, this message translates to:
  /// **'Terkirim'**
  String get queueStatusApplied;

  /// No description provided for @queueStatusRejected.
  ///
  /// In id, this message translates to:
  /// **'Ditolak'**
  String get queueStatusRejected;

  /// No description provided for @queueStatusConflict.
  ///
  /// In id, this message translates to:
  /// **'Konflik'**
  String get queueStatusConflict;

  /// No description provided for @queueStatusFailed.
  ///
  /// In id, this message translates to:
  /// **'Gagal dikirim'**
  String get queueStatusFailed;

  /// No description provided for @queueStatusSuperseded.
  ///
  /// In id, this message translates to:
  /// **'Diganti'**
  String get queueStatusSuperseded;

  /// No description provided for @queueUsage.
  ///
  /// In id, this message translates to:
  /// **'Penyimpanan offline: {used} dari 100 MB'**
  String queueUsage(String used);

  /// No description provided for @profileTitle.
  ///
  /// In id, this message translates to:
  /// **'Profil'**
  String get profileTitle;

  /// No description provided for @profileRoles.
  ///
  /// In id, this message translates to:
  /// **'Peran'**
  String get profileRoles;

  /// No description provided for @profileEmployee.
  ///
  /// In id, this message translates to:
  /// **'Karyawan'**
  String get profileEmployee;

  /// No description provided for @profileVersion.
  ///
  /// In id, this message translates to:
  /// **'Versi aplikasi'**
  String get profileVersion;

  /// No description provided for @profileDevice.
  ///
  /// In id, this message translates to:
  /// **'ID perangkat'**
  String get profileDevice;

  /// No description provided for @pushDisabled.
  ///
  /// In id, this message translates to:
  /// **'Notifikasi push belum aktif.'**
  String get pushDisabled;

  /// No description provided for @logout.
  ///
  /// In id, this message translates to:
  /// **'Keluar'**
  String get logout;

  /// No description provided for @logoutConfirm.
  ///
  /// In id, this message translates to:
  /// **'Keluar dari aplikasi?'**
  String get logoutConfirm;

  /// No description provided for @logoutPendingWarning.
  ///
  /// In id, this message translates to:
  /// **'Masih ada {count} data belum terkirim. Data tetap tersimpan terenkripsi di HP dan hanya bisa dikirim setelah Anda masuk lagi dengan akun yang sama.'**
  String logoutPendingWarning(int count);
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['id'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'id':
      return AppLocalizationsId();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
