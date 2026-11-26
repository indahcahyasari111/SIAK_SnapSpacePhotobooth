// ======================================================
// KONFIGURASI SUPABASE, PEMILIK & JAM OPERASIONAL
// ======================================================

const SUPABASE_URL = 'https://lbtiszzodnopmivcfqkd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rRTNMxJmclKV5ey52bcM6Q_CBzccWpe';

// PASSWORD PEMILIK UNTUK AKSES DASHBOARD PEMILIK
const OWNER_PASSWORD = 'snapspace2026';

// JAM OPERASIONAL OUTLET (OTOMATIS MEMBATASI PILIHAN JAM)
const OPEN_TIME = '10:00';
const CLOSE_TIME = '21:00';
const TIME_SLOT_INTERVAL = 15; // Pilihan jam per 15 menit

const OUTLETS = [
  'Outlet Semarang',
  'Outlet Surabaya',
  'Outlet Malang',
  'Outlet Yogyakarta'
];

const ALLOWED_PAYMENT_METHODS = [
  'QRIS',
  'M-BANKING'
];

// ======================================================
// STATE
// ======================================================

const state = {
  packages: [],
  selectedPackage: null,
  outlets: [],
  lastBooking: null,
  pendingList: []
};

// ======================================================
// HELPER
// ======================================================

const $ = (id) => document.getElementById(id);

const pages = {
  home: $('homePage'),
  booking: $('bookingPage'),
  success: $('successPage'),
  report: $('reportPage'),
  ownerLogin: null
};

function isOwnerLoggedIn() {
  return sessionStorage.getItem('snapspace_owner_auth') === 'true';
}

function syncOwnerVisibility() {
  // Tombol Dashboard Pemilik selalu tampil di pojok kanan atas (wajib password jika belum login)
  if ($('navReportBtn')) {
    $('navReportBtn').style.display = '';$('navReportBtn').textContent = 'Dashboard Pemilik';
  }

  // Halaman Menunggu Verifikasi pelanggan TIDAK menampilkan tombol Laporan Kas sama sekali
  if ($('successReportBtn')) {$('successReportBtn').style.display = 'none';
  }
}

function showPage(page) {
  Object.values(pages).forEach((p) => {
    if (p) p.classList.remove('active');
  });
  if (page) {
    page.classList.add('active');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getTodayJakarta() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta'
  }).format(new Date());
}

function timeToMinutes(time) {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9+\-\s]{8,20}$/.test(phone);
}

function randomHex(length) {
  let result = '';
  const chars = '0123456789ABCDEF';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateBookingCode() {
  return `PB-${Date.now().toString().slice(-8)}-${randomHex(6)}`;
}

function generateReceiptNumber() {
  return `KM-${Date.now().toString().slice(-8)}-${randomHex(4)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function encodePaymentNote(method, sender, ref) {
  const cleanSender = sender.replaceAll('|', '/').slice(0, 60);
  const cleanRef = ref.replaceAll('|', '/').slice(0, 60);
  return `METODE:${method}|PENGIRIM:${cleanSender}|REF:${cleanRef}`;
}

function parsePaymentNote(note) {
  const result = { method: 'QRIS', sender: '—', ref: '—' };
  if (!note) return result;

  note.split('|').forEach((part) => {
    const idx = part.indexOf(':');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key === 'METODE' && ALLOWED_PAYMENT_METHODS.includes(val)) {
      result.method = val;
    } else if (key === 'PENGIRIM') {
      result.sender = val || '—';
    } else if (key === 'REF') {
      result.ref = val || '—';
    }
  });

  return result;
}

// ======================================================
// DROPDOWN JAM KHUSUS JAM OPERASIONAL (10:00 – 21:00)
// ======================================================

function convertTimeInputToOperatingSelect() {
  const currentEl = $('time');
  if (!currentEl || currentEl.tagName === 'SELECT') return;

  const select = document.createElement('select');
  select.id = 'time';
  select.name = currentEl.name || 'time';
  select.required = true;
  select.className = $('outlet')?.className || currentEl.className || '';

  currentEl.parentNode.replaceChild(select, currentEl);

  select.addEventListener('change', () => {
    updateSummary();
    checkAvailability();
  });
}

function populateOperatingTimeOptions() {
  convertTimeInputToOperatingSelect();
  const select = $('time');
  if (!select || select.tagName !== 'SELECT') return;

  const previousValue = select.value;
  const openMin = timeToMinutes(OPEN_TIME);
  const closeMin = timeToMinutes(CLOSE_TIME);
  const duration = Number(state.selectedPackage?.durasi_menit || TIME_SLOT_INTERVAL);
  const lastStartMin = closeMin - duration;

  const options = [`<option value="">Pilih jam (${OPEN_TIME} – ${CLOSE_TIME} WIB)</option>`];

  for (let m = openMin; m <= lastStartMin; m += TIME_SLOT_INTERVAL) {
    const startStr = minutesToTime(m);
    const label = state.selectedPackage
      ? `${startStr} – ${minutesToTime(m + duration)} WIB`
      : `${startStr} WIB`;
    options.push(`<option value="${startStr}">${label}</option>`);
  }

  select.innerHTML = options.join('');

  // Pertahankan jam yang dipilih jika masih masuk jam operasional paket baru
  if (previousValue && Array.from(select.options).some((o) => o.value === previousValue)) {
    select.value = previousValue;
  } else {
    select.value = '';
  }
}

function setupOperatingHoursUI() {
  populateOperatingTimeOptions();

  const box = $('availabilityBox');
  if (box && (!$('date')?.value \vert{}\vert{} !$('outlet')?.value)) {
    box.textContent = `Jam operasional outlet: ${OPEN_TIME} – ${CLOSE_TIME} WIB. Pilih tanggal dan outlet untuk mengecek jadwal.`;
  }
}

function validateOperatingHours(startTime, durationMinutes = 0) {
  const openMin = timeToMinutes(OPEN_TIME);
  const closeMin = timeToMinutes(CLOSE_TIME);
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + Number(durationMinutes || 0);

  if (startMin < openMin || endMin > closeMin) {
    return `Jam reservasi harus berada di dalam jam operasional outlet (${OPEN_TIME} – ${CLOSE_TIME} WIB).`;
  }
  return null;
}

// ======================================================
// HALAMAN LOGIN PEMILIK (TERPISAH DARI PELANGGAN)
// ======================================================

function createOwnerLoginPage() {
  if ($('ownerLoginPage')) {
    pages.ownerLogin = $('ownerLoginPage');
    return;
  }

  const mainEl = pages.home?.parentElement || document.querySelector('main');
  if (!mainEl) return;

  const baseClass = (pages.home?.className || 'page')
    .replace(/\bactive\b/g, '')
    .trim();

  const section = document.createElement('section');
  section.id = 'ownerLoginPage';
  section.className = baseClass || 'page';

  section.innerHTML = `
    <div style="max-width: 440px; margin: 48px auto; background: #ffffff; border: 1px solid #e8e2d9; border-radius: 22px; padding: 32px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.2px; color: #c25e3e; text-transform: uppercase; margin-bottom: 6px;">
        OWNER PORTAL
      </div>
      <h1 style="margin: 0 0 8px; font-size: 26px;">
        Login Pemilik
      </h1>
      <p style="margin: 0 0 22px; font-size: 14px; color: #666; line-height: 1.5;">
        Halaman khusus pengelola SnapSpace Photobooth untuk verifikasi pembayaran dan memantau Laporan Penerimaan Kas.
      </p>

      <form id="ownerLoginForm">
        <div style="margin-bottom: 16px;">
          <label for="ownerPasswordInput" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
            Password Pemilik
          </label>
          <input
            type="password"
            id="ownerPasswordInput"
            placeholder="Masukkan password pemilik"
            required
            style="width: 100%; padding: 12px 14px; border: 1px solid #d4d4d4; border-radius: 10px; font-size: 14px; box-sizing: border-box;"
          />
        </div>

        <button
          type="submit"
          style="width: 100%; padding: 12px 16px; border-radius: 10px; border: none; background: #111; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-bottom: 10px;"
        >
          Masuk Dashboard Pemilik →
        </button>

        <button
          type="button"
          id="ownerLoginBackBtn"
          style="width: 100%; padding: 11px 16px; border-radius: 10px; border: 1px solid #d4d4d4; background: #fff; color: #333; font-size: 13px; font-weight: 600; cursor: pointer;"
        >
          ← Kembali ke Halaman Sewa
        </button>
      </form>
    </div>
  `;

  mainEl.appendChild(section);
  pages.ownerLogin = section;

  $('ownerLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('ownerPasswordInput').value;

    if (input !== OWNER_PASSWORD) {
      showToast('Password salah
