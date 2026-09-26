// E9 load test — beban default Q-34: 30 pengguna lapangan + 5 pengguna kantor (k6).
// Laporan & cara pakai: docs/proyekkas/qa/s3-e9-qa-report.md §3.
//
// Dua mode (env MODE):
//   anon (default) — tanpa kredensial: jalur publik & jalur yang ditolak auth (health, app/config,
//                    /admin/login SSR, redirect gate /admin, 401 API, unggah multipart tanpa token).
//   auth           — butuh akun uji staging (password grant client proyekkas-mobile, realm drms-staging,
//                    ADR 0012 — HANYA staging). Kredensial lewat env, JANGAN di-commit:
//                      FIELD_USERS='[{"u":"staff.uji@proyekkas.test","p":"…","totp":""}]'   (didaur ulang ke 30 VU)
//                      OFFICE_USERS='[{"u":"finance.uji@proyekkas.test","p":"…"}]'         (didaur ulang ke 5 VU)
//                      PROJECT_ID, STAGE_ID (tahapan PRJ-UJI-01), LAT, LNG (titik geofence project uji)
//                    Membuat data uji: absensi (1× per user per hari — sisanya ditolak ALREADY_CHECKED_IN),
//                    laporan progress (+ foto), draft pengajuan (dibatalkan lagi lewat draft_delete).
//
// Jalankan (dari host VPS, lalu lintas hairpin tiba di Traefik sebagai 10.100.0.1 — IP privat, di-whitelist
// parser crowdsecurity/whitelists; SEMUA VU berbagi satu bucket rate limit Traefik per IP):
//   docker run --rm --network host -v "$PWD/apps/web/tests/load:/load:ro" -e MODE=anon \
//     grafana/k6 run /load/q34-mix.js
// Gambar uji: /load/fixtures/{photo,selfie}.jpg (sintetis, dibuat dengan sharp; bukan foto orang).
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate, Counter } from 'k6/metrics'

const BASE = __ENV.BASE || 'https://drms-kas.staging.bimacreative.tech'
const TOKEN_URL = __ENV.TOKEN_URL || 'https://auth.bimacreative.tech/realms/drms-staging/protocol/openid-connect/token'
const MODE = __ENV.MODE || 'anon'
const DURATION = __ENV.DURATION || '8m'
const RAMP = __ENV.RAMP || '1m'
const FIELD_VUS = Number(__ENV.FIELD_VUS || 30)
const OFFICE_VUS = Number(__ENV.OFFICE_VUS || 5)
const APP_VERSION = __ENV.APP_VERSION || '1.0.0'

const PHOTO = open('./fixtures/photo.jpg', 'b')
const SELFIE = open('./fixtures/selfie.jpg', 'b')

// Satu Trend per aksi utama → p50/p95 per aksi di ringkasan.
const T = {}
for (const n of [
  'health', 'app_config', 'admin_login_page', 'admin_gate', 'api_401', 'upload_anon',
  'token', 'me', 'masters', 'upload_selfie', 'checkin', 'upload_photo', 'progress_report',
  'expense_draft', 'expense_list', 'dashboard', 'approvals_inbox', 'report', 'transfer_queue',
]) T[n] = new Trend(`act_${n}`, true)
const errors = new Rate('act_errors')
const ratelimited = new Counter('http_429')
const wafBlocked = new Counter('http_403_waf')

const stages = (vus) => [
  { duration: RAMP, target: vus },
  { duration: DURATION, target: vus },
  { duration: '30s', target: 0 },
]

export const options = {
  scenarios: {
    field: { executor: 'ramping-vus', exec: MODE === 'auth' ? 'fieldAuth' : 'fieldAnon', startVUs: 0, stages: stages(FIELD_VUS), gracefulRampDown: '20s' },
    office: { executor: 'ramping-vus', exec: MODE === 'auth' ? 'officeAuth' : 'officeAnon', startVUs: 0, stages: stages(OFFICE_VUS), gracefulRampDown: '20s' },
  },
  thresholds: {
    // AC E9: p95 < 2 s pada aksi utama (ESTIMASI target).
    act_checkin: ['p(95)<2000'],
    act_progress_report: ['p(95)<2000'],
    act_upload_photo: ['p(95)<2000'],
    act_upload_selfie: ['p(95)<2000'],
    act_expense_draft: ['p(95)<2000'],
    act_dashboard: ['p(95)<2000'],
    act_approvals_inbox: ['p(95)<2000'],
    act_admin_login_page: ['p(95)<2000'],
    act_app_config: ['p(95)<2000'],
    act_errors: ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max', 'count'],
  insecureSkipTLSVerify: false,
  userAgent: 'k6-e9-loadtest/drms-proyekkas-qa',
}

function rec(name, res, okStatuses) {
  T[name].add(res.timings.duration)
  if (res.status === 429) ratelimited.add(1)
  if (res.status === 403 && /crowdsec|appsec|Forbidden/i.test(String(res.body).slice(0, 300)) && !String(res.headers['Content-Type'] || '').includes('json')) wafBlocked.add(1)
  const ok = okStatuses.includes(res.status)
  errors.add(!ok)
  check(res, { [`${name} status ${okStatuses.join('|')}`]: () => ok })
  return ok
}

// Waktu jeda ala manusia (detik): lapangan jarang (aksi per 20–40 s), kantor lebih sering.
const think = (min, max) => sleep(min + Math.random() * (max - min))

// ----------------------------------------------------------------------------- anon
export function fieldAnon() {
  rec('health', http.get(`${BASE}/api/v1/health`, { tags: { name: 'health' } }), [200])
  think(2, 5)
  rec('app_config', http.get(`${BASE}/api/v1/app/config?version=${APP_VERSION}`, { tags: { name: 'app_config' } }), [200])
  think(2, 5)
  rec('api_401', http.get(`${BASE}/api/v1/masters`, { tags: { name: 'masters_401' } }), [401])
  think(5, 15)
  // Unggahan selfie/foto tanpa token: melewati Traefik buffering-pk + parser multipart app → 401.
  const f = Math.random() < 0.5 ? http.file(SELFIE, 'selfie.jpg', 'image/jpeg') : http.file(PHOTO, 'photo.jpg', 'image/jpeg')
  rec('upload_anon', http.post(`${BASE}/api/v1/media/selfies`, { file: f }, { tags: { name: 'upload_anon' } }), [401])
  think(10, 20)
}

export function officeAnon() {
  rec('admin_gate', http.get(`${BASE}/admin`, { redirects: 0, tags: { name: 'admin_gate' } }), [302])
  think(1, 3)
  rec('admin_login_page', http.get(`${BASE}/admin/login`, { tags: { name: 'admin_login_page' } }), [200])
  think(3, 8)
  rec('api_401', http.get(`${BASE}/api/v1/approvals/inbox`, { tags: { name: 'inbox_401' } }), [401])
  think(5, 10)
}

// ----------------------------------------------------------------------------- auth
function uuid() {
  const b = new Uint8Array(16)
  for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

const users = (k) => JSON.parse(__ENV[k] || '[]')
let session = null // per VU

function tokenReq(form) {
  const res = http.post(TOKEN_URL, form, { tags: { name: 'token' } })
  rec('token', res, [200])
  if (res.status !== 200) return null
  const j = res.json()
  return { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in - 30) * 1000 }
}

function login(pool) {
  const list = users(pool)
  if (!list.length) throw new Error(`${pool} kosong — MODE=auth butuh kredensial uji lewat env`)
  const u = list[(__VU - 1) % list.length]
  // Jeda acak agar 35 login tidak melampaui ratelimit-drms-kc-token (60/menit, burst 30).
  sleep(Math.random() * 30)
  const form = { grant_type: 'password', client_id: 'proyekkas-mobile', username: u.u, password: u.p, scope: 'openid' }
  if (u.totp) form.totp = u.totp
  const tok = tokenReq(form)
  if (!tok) return null
  const deviceId = uuid()
  const s = { ...tok, deviceId }
  const r = http.post(`${BASE}/api/v1/devices/register`, JSON.stringify({ deviceId, platform: 'android', model: 'k6-loadtest', appVersion: APP_VERSION }), { headers: hdr(s, true), tags: { name: 'device_register' } })
  check(r, { 'device registered': (x) => x.status === 200 || x.status === 201 })
  return s
}

function hdr(s, jsonBody) {
  const h = { Authorization: `Bearer ${s.at}`, 'X-Device-Id': s.deviceId, 'X-App-Version': APP_VERSION }
  if (jsonBody) h['Content-Type'] = 'application/json'
  return h
}

function ensure(pool) {
  if (!session) session = login(pool)
  if (session && Date.now() > session.exp) {
    // Token reuse: refresh, bukan login ulang (seperti APK).
    const t = tokenReq({ grant_type: 'refresh_token', client_id: 'proyekkas-mobile', refresh_token: session.rt })
    session = t ? { ...session, ...t } : login(pool)
  }
  return session
}

function upload(s, kind, bin, name, metric) {
  const res = http.post(`${BASE}/api/v1/media/${kind}`, { file: http.file(bin, name, 'image/jpeg') }, { headers: hdr(s, false), tags: { name: metric } })
  return rec(metric, res, [201]) ? res.json('id') : null
}

function clock() {
  return { device_time: new Date().toISOString(), elapsed_ms: Math.floor(Date.now() % 1e9), boot_id: `k6-${__VU}` }
}

function syncItem(type, payload) {
  return { client_uuid: uuid(), type, schema_version: 1, offline: false, device_time: new Date().toISOString(), elapsed_ms: Math.floor(Date.now() % 1e9), payload }
}

function sync(s, items, metric) {
  const body = { batch_id: uuid(), device_id: s.deviceId, clock: clock(), items }
  const res = http.post(`${BASE}/api/v1/sync/batch`, JSON.stringify(body), { headers: hdr(s, true), tags: { name: metric } })
  rec(metric, res, [200])
  return res
}

const PROJECT_ID = Number(__ENV.PROJECT_ID || 0)
const STAGE_ID = Number(__ENV.STAGE_ID || 0)
const LAT = Number(__ENV.LAT || 0)
const LNG = Number(__ENV.LNG || 0)

export function fieldAuth() {
  const s = ensure('FIELD_USERS')
  if (!s) { think(10, 20); return }
  rec('me', http.get(`${BASE}/api/v1/me`, { headers: hdr(s), tags: { name: 'me' } }), [200])
  think(2, 5)
  rec('masters', http.get(`${BASE}/api/v1/masters`, { headers: hdr(s), tags: { name: 'masters' } }), [200])
  think(5, 10)
  const r = Math.random()
  if (r < 0.35 && PROJECT_ID) {
    // Absensi: selfie lalu check-in (hanya check-in pertama hari itu diterima; sisanya `rejected`).
    const mid = upload(s, 'selfies', SELFIE, 'selfie.jpg', 'upload_selfie')
    if (mid) sync(s, [syncItem('attendance.check_in', { project_id: PROJECT_ID, lat: LAT, lng: LNG, accuracy_m: 10, is_mocked: false, selfie_media_id: mid, camera_lens: 'front' })], 'checkin')
  } else if (r < 0.65 && PROJECT_ID && STAGE_ID) {
    // Laporan progress dengan 1–3 foto (kamera belakang), pct_after naik sedikit.
    const n = 1 + Math.floor(Math.random() * 3)
    const ids = []
    for (let i = 0; i < n; i++) { const id = upload(s, 'progress-photos', PHOTO, `progress-${i}.jpg`, 'upload_photo'); if (id) ids.push(id); think(1, 3) }
    sync(s, [syncItem('progress_report.draft_upsert', { project_id: PROJECT_ID, stage_id: STAGE_ID, pct_after: 0, work: 'Uji beban k6 E9 (data fiktif)', photo_media_ids: ids })], 'progress_report')
  } else {
    // Draft pengajuan lalu dibatalkan (draft_delete) agar tidak menumpuk.
    const cu = uuid()
    const up = syncItem('expense_request.draft_upsert', { kind: 'reimburse', title: 'Uji beban k6 E9', project_id: PROJECT_ID || null, lines: [{ client_uuid: uuid(), description: 'Konsumsi uji', qty: 1, unit_price: 50000, total: 50000 }] })
    up.client_uuid = cu
    sync(s, [up, { ...syncItem('expense_request.draft_delete', { draft_client_uuid: cu, reason: 'Data uji beban k6 E9' }), depends_on: [cu] }], 'expense_draft')
    rec('expense_list', http.get(`${BASE}/api/v1/expense-requests?limit=20`, { headers: hdr(s), tags: { name: 'expense_list' } }), [200])
  }
  think(20, 40)
}

export function officeAuth() {
  const s = ensure('OFFICE_USERS')
  if (!s) { think(10, 20); return }
  for (const d of ['finance', 'owner']) {
    const res = http.get(`${BASE}/api/v1/dashboard/${d}`, { headers: hdr(s), tags: { name: `dashboard_${d}` } })
    rec('dashboard', res, [200, 403]) // 403 = peran tidak cocok (bukan error beban)
    think(2, 5)
  }
  rec('approvals_inbox', http.get(`${BASE}/api/v1/approvals/inbox`, { headers: hdr(s), tags: { name: 'approvals_inbox' } }), [200])
  think(3, 8)
  rec('transfer_queue', http.get(`${BASE}/api/v1/transfer-queue`, { headers: hdr(s), tags: { name: 'transfer_queue' } }), [200, 403])
  think(3, 8)
  const code = ['rekap-kas', 'rekap-pengajuan', 'anggaran-project', 'absensi'][Math.floor(Math.random() * 4)]
  rec('report', http.get(`${BASE}/api/v1/reports/${code}`, { headers: hdr(s), tags: { name: `report_${code}` } }), [200, 400, 403])
  think(10, 20)
}

export function handleSummary(data) {
  return { stdout: textSummary(data), '/out/summary.json': JSON.stringify(data, null, 1) }
}

function textSummary(data) {
  const lines = [`MODE=${MODE} BASE=${BASE}`]
  for (const [k, m] of Object.entries(data.metrics)) {
    if (!k.startsWith('act_') && !['http_req_duration', 'http_reqs', 'http_req_failed', 'http_429', 'http_403_waf', 'iterations'].includes(k)) continue
    const v = m.values
    if (m.type === 'trend') { if (v.count) lines.push(`${k.padEnd(24)} n=${v.count} p50=${v.med.toFixed(0)}ms p95=${v['p(95)'].toFixed(0)}ms max=${v.max.toFixed(0)}ms`) }
    else lines.push(`${k.padEnd(24)} ${JSON.stringify(v)}`)
  }
  return lines.join('\n') + '\n'
}
