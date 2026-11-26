// ======================================================
// KONFIGURASI SUPABASE & PEMILIK
// ======================================================

const SUPABASE_URL = 'https://lbtiszzodnopmivcfqkd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rRTNMxJmclKV5ey52bcM6Q_CBzccWpe';

// PASSWORD PEMILIK UNTUK AKSES PORTAL OWNER
const OWNER_PASSWORD = 'snapspace2026';

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
  const loggedIn = isOwnerLoggedIn();

  // Sembunyikan tombol Laporan Kas dari pelanggan biasa
  if ($('navReportBtn')) {
    $('navReportBtn').style.display = loggedIn ? '' : 'none';
    if (loggedIn) {
      $('navReportBtn').textContent = 'Dashboard Pemilik';
    }
  }

  // Pelanggan tidak perlu melihat tombol Laporan Kas di halaman Success
  if ($('successReportBtn')) {
    $('successReportBtn').style.display = loggedIn ? '' : 'none';
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
      showToast('Password salah. Akses khusus pemilik.');
      $('ownerPasswordInput').value = '';
      $('ownerPasswordInput').focus();
      return;
    }

    sessionStorage.setItem('snapspace_owner_auth', 'true');
    $('ownerPasswordInput').value = '';
    syncOwnerVisibility();
    showToast('Login pemilik berhasil.');
    showPage(pages.report);
    await loadReport();
  });

  $('ownerLoginBackBtn').addEventListener('click', () => {
    showPage(pages.home);
  });
}

function setupReportNavigationButtons() {
  const refreshBtn = $('refreshReportBtn');
  if (!refreshBtn || $('backToBookingFromReportBtn')) return;

  const btnContainer = refreshBtn.parentElement;
  if (!btnContainer) return;

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.id = 'backToBookingFromReportBtn';
  backBtn.textContent = '← Ke Halaman Sewa';
  backBtn.style.cssText = `
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid #d4d4d4;
    background: #fff;
    color: #111;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  `;

  backBtn.addEventListener('click', async () => {
    showPage(pages.booking);
    updatePaymentInstruction();
    try {
      await Promise.all([loadPackages(), loadOutlets()]);
    } catch (error) {
      showToast(error.message);
    }
  });

  const logoutBtn = document.createElement('button');
  logoutBtn.type = 'button';
  logoutBtn.id = 'ownerLogoutBtn';
  logoutBtn.textContent = 'Logout Pemilik';
  logoutBtn.style.cssText = `
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px solid #dc2626;
    background: #fff;
    color: #dc2626;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  `;

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('snapspace_owner_auth');
    syncOwnerVisibility();
    // Bersihkan parameter ?mode=owner dari URL
    if (window.location.search.includes('owner') || window.location.hash === '#owner') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    showPage(pages.home);
    showToast('Anda telah keluar dari mode pemilik.');
  });

  btnContainer.insertBefore(backBtn, refreshBtn);
  btnContainer.appendChild(logoutBtn);
}

// ======================================================
// KOTAK PEMBAYARAN & INPUT BUKTI BAYAR (QRIS & M-BANKING)
// ======================================================

function getOrCreatePaymentInfoBox() {
  let box = $('paymentInfoBox');
  if (box) return box;

  const submitBtn = document.querySelector('.submit-btn');
  if (!submitBtn || !submitBtn.parentElement) return null;

  box = document.createElement('div');
  box.id = 'paymentInfoBox';
  box.style.cssText = `
    display: none;
    margin: 16px 0 20px;
    padding: 18px;
    border-radius: 14px;
    border: 1px solid #e5e5e5;
    background: #fafafa;
    font-size: 14px;
    line-height: 1.5;
  `;

  submitBtn.parentElement.insertBefore(box, submitBtn);
  return box;
}

function updatePaymentInstruction() {
  const box = getOrCreatePaymentInfoBox();
  if (!box) return;

  const selected = document.querySelector('input[name="payment"]:checked');
  if (!selected) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const prevSender = $('payerName')?.value || '';
  const prevRef = $('paymentRef')?.value || '';
  const prevChecked = $('paymentConfirmedCheck')?.checked || false;

  const pkg = state.selectedPackage;
  const amountText = pkg ? formatRupiah(pkg.harga) : 'Pilih paket terlebih dahulu';
  const method = selected.value;

  box.style.display = 'block';

  let instructionHtml = '';

  if (method === 'QRIS') {
    const qrData = encodeURIComponent(
      `SNAPSPACE-PHOTOBOOTH|QRIS|TOTAL:${pkg ? pkg.harga : 0}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

    instructionHtml = `
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px;">
          Pembayaran QRIS — SnapSpace Photobooth
        </div>
        <div style="color: #666; font-size: 13px; margin-bottom: 12px;">
          Scan QR code di bawah ini menggunakan GoPay, OVO, DANA, ShopeePay, atau M-Banking.
        </div>
        <div style="display: inline-block; padding: 10px; background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; margin-bottom: 10px;">
          <img src="${qrUrl}" alt="QRIS SnapSpace Photobooth" width="170" height="170" style="display: block;" />
        </div>
        <div style="font-size: 14px; margin-top: 4px;">
          Total Bayar: <strong>${amountText}</strong>
        </div>
      </div>
    `;
  } else if (method === 'M-BANKING') {
    instructionHtml = `
      <div style="margin-bottom: 16px;">
        <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px;">
          Transfer M-Banking — Bank BCA (Simulasi)
        </div>
        <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; padding: 12px 14px; margin: 10px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 12px; color: #666;">Nomor Rekening</div>
              <div style="font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">1234-5678-90</div>
              <div style="font-size: 13px; color: #444;">a.n. SnapSpace Photobooth</div>
            </div>
            <button
              type="button"
              id="copyRekBtn"
              style="padding: 8px 12px; border-radius: 8px; border: 1px solid #111; background: #111; color: #fff; font-size: 12px; cursor: pointer;"
            >
              Salin No. Rek
            </button>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 10px 0;" />
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span style="color: #666;">Total Transfer</span>
            <strong>${amountText}</strong>
          </div>
        </div>
      </div>
    `;
  }

  const verificationFormHtml = `
    <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 14px;">
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
        Konfirmasi Bukti Pembayaran
      </div>
      <div style="font-size: 12px; color: #666; margin-bottom: 12px;">
        Salin Nama Pengirim dan No. Referensi dari struk transfer M-Banking atau riwayat transaksi QRIS Anda agar pemilik dapat memverifikasi dana masuk.
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px;">
        <div>
          <label for="payerName" style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
            Nama Pengirim / Akun *
          </label>
          <input
            type="text"
            id="payerName"
            placeholder="Contoh: Indah Nugraheni"
            value="${escapeHtml(prevSender)}"
            required
            style="width: 100%; padding: 9px 11px; border: 1px solid #d4d4d4; border-radius: 8px; font-size: 13px; box-sizing: border-box;"
          />
        </div>
        <div>
          <label for="paymentRef" style="display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px;">
            No. Referensi / ID Transaksi *
          </label>
          <input
            type="text"
            id="paymentRef"
            placeholder="Contoh: TRF-2026112701"
            value="${escapeHtml(prevRef)}"
            required
            style="width: 100%; padding: 9px 11px; border: 1px solid #d4d4d4; border-radius: 8px; font-size: 13px; box-sizing: border-box;"
          />
        </div>
      </div>

      <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; cursor: pointer;">
        <input
          type="checkbox"
          id="paymentConfirmedCheck"
          ${prevChecked ? 'checked' : ''}
          style="margin-top: 3px; width: 16px; height: 16px;"
        />
        <span>
          Saya telah melakukan pembayaran sesuai nominal dan bersedia menunggu verifikasi dari pemilik.
        </span>
      </label>
    </div>
  `;

  box.innerHTML = instructionHtml + verificationFormHtml;

  const copyBtn = $('copyRekBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText('1234567890');
      showToast('Nomor rekening 1234-5678-90 berhasil disalin.');
    });
  }
}

// ======================================================
// SUPABASE DIRECT REQUEST
// ======================================================

async function supabaseRequest(endpoint, options = {}) {
  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json'
  };

  if (options.method === 'POST' || options.method === 'PATCH') {
    headers.Prefer = 'return=representation';
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.hint ||
      data?.details ||
      'Terjadi kesalahan saat menghubungi database Supabase.';
    throw new Error(message);
  }

  return data;
}

// ======================================================
// MINIMUM DATE
// ======================================================

function setMinimumDate() {
  $('date').min = getTodayJakarta();
}

// ======================================================
// LOAD & RENDER PAKET
// ======================================================

async function loadPackages() {
  const packages = await supabaseRequest(
    'paket?select=*&status_aktif=eq.true&order=harga.asc'
  );
  state.packages = packages || [];
  renderPackages();
}

function renderPackages() {
  const container = $('packageList');

  if (!state.packages.length) {
    container.innerHTML = `<div class="loading">Belum ada paket aktif.</div>`;
    return;
  }

  container.innerHTML = state.packages
    .map(
      (pkg) => `
      <label class="package-card ${
        state.selectedPackage?.id_paket === pkg.id_paket ? 'selected' : ''
      }">
        <input
          type="radio"
          name="package"
          value="${pkg.id_paket}"
          ${state.selectedPackage?.id_paket === pkg.id_paket ? 'checked' : ''}
        >
        <div class="package-name">${escapeHtml(pkg.nama_paket)}</div>
        <div class="package-desc">${escapeHtml(pkg.deskripsi || '')}</div>
        <div class="package-meta">
          <span class="package-duration">${pkg.durasi_menit} menit</span>
          <span class="package-price">${formatRupiah(pkg.harga)}</span>
        </div>
      </label>
    `
    )
    .join('');

  container.querySelectorAll('input[name="package"]').forEach((input) => {
    input.addEventListener('change', () => {
      state.selectedPackage = state.packages.find(
        (pkg) => String(pkg.id_paket) === input.value
      );
      renderPackages();
      updateSummary();
      updatePaymentInstruction();
      checkAvailability();
    });
  });
}

// ======================================================
// LOAD OUTLET
// ======================================================

async function loadOutlets() {
  state.outlets = OUTLETS;
  $('outlet').innerHTML = `
    <option value="">Pilih outlet</option>
    ${state.outlets
      .map(
        (outlet) =>
          `<option value="${escapeHtml(outlet)}">${escapeHtml(outlet)}</option>`
      )
      .join('')}
  `;
}

// ======================================================
// UPDATE SUMMARY
// ======================================================

function updateSummary() {
  const pkg = state.selectedPackage;
  const date = $('date').value;
  const time = $('time').value;
  const outlet = $('outlet').value;

  $('summaryPackage').textContent = pkg?.nama_paket || 'Pilih paket';
  $('summaryDuration').textContent = pkg ? `${pkg.durasi_menit} menit` : '—';
  $('summaryDate').textContent = date ? formatDate(date) : '—';

  if (time && pkg) {
    const end = minutesToTime(timeToMinutes(time) + Number(pkg.durasi_menit));
    $('summaryTime').textContent = `${time} – ${end}`;
  } else {
    $('summaryTime').textContent = time || '—';
  }

  $('summaryOutlet').textContent = outlet || '—';
  $('summaryPrice').textContent = pkg ? formatRupiah(pkg.harga) : 'Rp0';
}

// ======================================================
// CEK KETERSEDIAAN JADWAL
// ======================================================

async function getBookedReservations(date, outlet) {
  const endpoint =
    `penyewaan?` +
    `tanggal_reservasi=eq.${encodeURIComponent(date)}` +
    `&outlet=eq.${encodeURIComponent(outlet)}` +
    `&status_booking=neq.CANCELLED` +
    `&select=jam_reservasi,total_harga,paket(durasi_menit),kode_booking,status_booking,catatan`;

  const rows = await supabaseRequest(endpoint);
  return (rows || [])
    .filter((b) => !(b.catatan || '').startsWith('[DITOLAK]'))
    .map((booking) => {
      const duration = Number(booking.paket?.durasi_menit || 0);
      const start = booking.jam_reservasi.slice(0, 5);
      const end = minutesToTime(timeToMinutes(start) + duration);
      return { start, duration, end };
    });
}

async function checkAvailability() {
  const date = $('date').value;
  const outlet = $('outlet').value;
  const time = $('time').value;
  const box = $('availabilityBox');

  if (!date || !outlet) {
    box.className = 'availability-box';
    box.textContent = 'Pilih tanggal dan outlet untuk mengecek jadwal.';
    return;
  }

  try {
    const bookings = await getBookedReservations(date, outlet);

    if (!time || !state.selectedPackage) {
      box.className = 'availability-box';
      box.textContent = `Terdapat ${bookings.length} booking pada tanggal tersebut di ${outlet}. Masukkan jam untuk mengecek bentrok.`;
      return;
    }

    const start = timeToMinutes(time);
    const duration = Number(state.selectedPackage.durasi_menit);
    const end = start + duration;

    if (end > 1440) {
      box.className = 'availability-box bad';
      box.textContent =
        'Jam selesai melewati pukul 24:00. Pilih jam mulai yang lebih awal.';
      return;
    }

    const conflict = bookings.find((booking) => {
      const existingStart = timeToMinutes(booking.start);
      const existingEnd = timeToMinutes(booking.end);
      return start < existingEnd && end > existingStart;
    });

    if (conflict) {
      box.className = 'availability-box bad';
      box.textContent = `Bentrok dengan booking ${conflict.start}–${conflict.end}. Silakan pilih jam lain.`;
    } else {
      box.className = 'availability-box ok';
      box.textContent = `Jadwal tersedia: ${time}–${minutesToTime(end)} (${duration} menit).`;
    }
  } catch (error) {
    box.className = 'availability-box bad';
    box.textContent = error.message;
  }
}

// ======================================================
// SUBMIT BOOKING (MENUNGGU VERIFIKASI — BELUM MASUK KAS)
// ======================================================

async function submitBooking(event) {
  event.preventDefault();

  if (!state.selectedPackage) {
    showToast('Pilih paket terlebih dahulu.');
    return;
  }

  const payment = document.querySelector('input[name="payment"]:checked');
  const name = $('name').value.trim();
  const phone = $('phone').value.trim();
  const email = $('email').value.trim();
  const address = $('address').value.trim();
  const date = $('date').value;
  const time = $('time').value;
  const outlet = $('outlet').value;
  const paymentMethod = payment?.value || '';

  const payerName = $('payerName')?.value.trim() || '';
  const paymentRef = $('paymentRef')?.value.trim() || '';
  const paymentConfirmed = $('paymentConfirmedCheck')?.checked || false;

  if (!name || !phone || !email) {
    showToast('Nama, nomor HP, dan email wajib diisi.');
    return;
  }
  if (!isValidEmail(email)) {
    showToast('Format email tidak valid.');
    return;
  }
  if (!isValidPhone(phone)) {
    showToast('Nomor HP tidak valid.');
    return;
  }
  if (!date || !time || !outlet) {
    showToast('Tanggal, jam, dan outlet wajib diisi.');
    return;
  }
  if (date < getTodayJakarta()) {
    showToast('Tanggal reservasi tidak boleh sebelum hari ini.');
    return;
  }
  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    showToast('Silakan pilih metode pembayaran.');
    return;
  }
  if (!payerName || !paymentRef) {
    showToast('Isi Nama Pengirim dan No. Referensi Transaksi untuk verifikasi.');
    return;
  }
  if (!paymentConfirmed) {
    showToast('Centang konfirmasi bahwa Anda telah melakukan pembayaran.');
    return;
  }

  const submitButton = document.querySelector('.submit-btn');
  submitButton.disabled = true;
  submitButton.textContent = 'Mengirim Pengajuan...';

  try {
    const pkg = state.selectedPackage;
    const duration = Number(pkg.durasi_menit);
    const startMinutes = timeToMinutes(time);
    const endMinutes = startMinutes + duration;

    if (endMinutes > 1440) {
      throw new Error(`Jam ${time} terlalu malam untuk paket ini.`);
    }

    const existingBookings = await getBookedReservations(date, outlet);
    const hasConflict = existingBookings.some((b) => {
      const existingStart = timeToMinutes(b.start);
      const existingEnd = timeToMinutes(b.end);
      return startMinutes < existingEnd && endMinutes > existingStart;
    });

    if (hasConflict) {
      throw new Error(
        'Jam tersebut bentrok dengan booking lain di outlet yang dipilih. Silakan pilih jam lain.'
      );
    }

    const existingCustomers = await supabaseRequest(
      `pelanggan?email=eq.${encodeURIComponent(email)}&select=*`
    );
    let customer = existingCustomers?.[0] || null;

    if (customer) {
      const updated = await supabaseRequest(
        `pelanggan?id_pelanggan=eq.${encodeURIComponent(customer.id_pelanggan)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            nama_pelanggan: name,
            no_hp: phone,
            email,
            alamat: address || null
          })
        }
      );
      customer = updated?.[0] || customer;
    } else {
      const created = await supabaseRequest('pelanggan', {
        method: 'POST',
        body: JSON.stringify({
          nama_pelanggan: name,
          no_hp: phone,
          email,
          alamat: address || null
        })
      });
      customer = created?.[0];
    }

    if (!customer) {
      throw new Error('Data pelanggan gagal disimpan.');
    }

    const bookingCode = generateBookingCode();
    const paymentNote = encodePaymentNote(paymentMethod, payerName, paymentRef);

    const payloadPenyewaan = {
      kode_booking: bookingCode,
      id_pelanggan: customer.id_pelanggan,
      id_paket: pkg.id_paket,
      tanggal_reservasi: date,
      jam_reservasi: `${time}:00`,
      outlet,
      total_harga: pkg.harga,
      status_booking: 'PENDING',
      catatan: paymentNote
    };

    let bookingResult;
    try {
      bookingResult = await supabaseRequest('penyewaan', {
        method: 'POST',
        body: JSON.stringify(payloadPenyewaan)
      });
    } catch (err) {
      if (String(err.message).toLowerCase().includes('constraint')) {
        payloadPenyewaan.status_booking = 'BOOKED';
        bookingResult = await supabaseRequest('penyewaan', {
          method: 'POST',
          body: JSON.stringify(payloadPenyewaan)
        });
      } else {
        throw err;
      }
    }

    const createdBooking = bookingResult?.[0];
    if (!createdBooking) {
      throw new Error('Data penyewaan gagal disimpan.');
    }

    const resultData = {
      booking: createdBooking,
      customer,
      package: pkg,
      payment: {
        method: paymentMethod,
        amount: pkg.harga,
        sender: payerName,
        ref: paymentRef
      },
      schedule: {
        start: time,
        end: minutesToTime(endMinutes),
        duration
      }
    };

    state.lastBooking = resultData;
    fillSuccess(resultData);
    showPage(pages.success);
    showToast('Reservasi dikirim! Menunggu verifikasi pembayaran oleh pemilik.');
  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Confirm Booking →';
  }
}

// ======================================================
// SUCCESS PAGE & RESET
// ======================================================

function fillSuccess(data) {
  const heading = pages.success.querySelector('h1');
  const subtitle = pages.success.querySelector('p');
  if (heading) heading.textContent = 'Menunggu Verifikasi Pembayaran.';
  if (subtitle) {
    subtitle.textContent =
      'Bukti pembayaran Anda sudah diterima. Pemilik akan memverifikasi dana masuk terlebih dahulu sebelum transaksi dicatat di Laporan Penerimaan Kas.';
  }

  $('successCode').textContent = data.booking.kode_booking;
  $('successName').textContent = data.customer.nama_pelanggan;
  $('successPackage').textContent = data.package.nama_paket;
  $('successDate').textContent = formatDate(data.booking.tanggal_reservasi);
  $('successTime').textContent = `${data.schedule.start} – ${data.schedule.end}`;
  $('successOutlet').textContent = data.booking.outlet;

  const methodLabel =
    data.payment.method === 'M-BANKING' ? 'M-Banking' : 'QRIS';
  $('successPayment').textContent =
    `${methodLabel} (Ref: ${data.payment.ref}) — Menunggu Verifikasi`;
  $('successAmount').textContent = formatRupiah(data.payment.amount);
}

function resetBookingForm() {
  $('bookingForm').reset();
  state.selectedPackage = null;
  renderPackages();
  updateSummary();
  updatePaymentInstruction();
  $('availabilityBox').className = 'availability-box';
  $('availabilityBox').textContent =
    'Pilih tanggal dan outlet untuk mengecek jadwal.';
  setMinimumDate();
}

// ======================================================
// PANEL VERIFIKASI PEMILIK (FIX FILTER 1-TO-1 SUPABASE)
// ======================================================

function getOrCreatePendingSection() {
  let section = $('pendingVerificationSection');
  if (section) return section;

  section = document.createElement('div');
  section.id = 'pendingVerificationSection';
  section.style.cssText = `
    background: #ffffff;
    border: 1px solid #e8e2d9;
    border-radius: 20px;
    padding: 24px;
    margin: 24px 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  `;

  section.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #c25e3e; text-transform: uppercase;">
          PAYMENT VERIFICATION
        </div>
        <h2 style="margin: 4px 0 0; font-size: 20px;">
          Antrean Verifikasi Pembayaran
        </h2>
        <p style="margin: 4px 0 0; font-size: 13px; color: #666;">
          Cek mutasi rekening/QRIS terlebih dahulu. Klik <strong>Terima</strong> hanya jika dana benar-benar sudah masuk agar tercatat ke Laporan Kas.
        </p>
      </div>
      <span id="pendingCountBadge" style="font-size: 13px; font-weight: 600; color: #b45309; background: #fef3c7; padding: 6px 12px; border-radius: 999px;">
        0 menunggu
      </span>
    </div>
    <div id="pendingListContainer" style="display: flex; flex-direction: column; gap: 12px;">
      <div style="color: #777; font-size: 14px;">Memuat antrean verifikasi...</div>
    </div>
  `;

  const tableEl = $('reportTableBody')?.closest('table');
  const tableCard = tableEl?.parentElement?.parentElement;
  if (tableCard && tableCard.parentElement === pages.report) {
    pages.report.insertBefore(section, tableCard);
  } else {
    pages.report.appendChild(section);
  }

  return section;
}

async function loadPendingVerifications(paidBookingIdSet) {
  getOrCreatePendingSection();
  const container = $('pendingListContainer');
  const badge = $('pendingCountBadge');

  try {
    const endpoint =
      `penyewaan?` +
      `select=id_penyewaan,kode_booking,tanggal_reservasi,jam_reservasi,outlet,total_harga,status_booking,catatan,` +
      `paket(nama_paket,durasi_menit),` +
      `pelanggan(nama_pelanggan,email,no_hp)` +
      `&order=id_penyewaan.desc`;

    const rows = (await supabaseRequest(endpoint)) || [];

    // Filter akurat: cek langsung terhadap Set id_penyewaan yg sudah ada di penerimaan_kas
    const pending = rows.filter((row) => {
      const alreadyPaid = paidBookingIdSet.has(Number(row.id_penyewaan));
      const isCancelled =
        row.status_booking === 'CANCELLED' ||
        (row.catatan || '').startsWith('[DITOLAK]');
      return !alreadyPaid && !isCancelled;
    });

    state.pendingList = pending;
    badge.textContent = `${pending.length} menunggu`;

    if (!pending.length) {
      container.innerHTML = `
        <div style="padding: 16px; border-radius: 12px; background: #f9fafb; color: #666; font-size: 14px; text-align: center;">
          Tidak ada pembayaran yang menunggu verifikasi. Semua transaksi sudah diproses.
        </div>
      `;
      return;
    }

    container.innerHTML = pending
      .map((row) => {
        const pay = parsePaymentNote(row.catatan);
        const customer = row.pelanggan || {};
        const pkg = row.paket || {};
        const jam = row.jam_reservasi ? row.jam_reservasi.slice(0, 5) : '—';

        return `
          <div style="border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; background: #fcfcfb; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div style="flex: 1; min-width: 240px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                <strong style="font-size: 15px;">${escapeHtml(row.kode_booking)}</strong>
                <span style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #fef3c7; color: #92400e;">
                  MENUNGGU VERIFIKASI
                </span>
                <span style="font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: #f3f4f6; color: #111;">
                  ${escapeHtml(pay.method)}
                </span>
              </div>
              <div style="font-size: 13px; color: #333; margin-bottom: 4px;">
                <strong>${escapeHtml(customer.nama_pelanggan || '—')}</strong> • ${escapeHtml(pkg.nama_paket || '—')} • ${formatDate(row.tanggal_reservasi)} (${jam}) • ${escapeHtml(row.outlet || '—')}
              </div>
              <div style="font-size: 13px; color: #555;">
                Pengirim: <strong>${escapeHtml(pay.sender)}</strong> &nbsp;|&nbsp;
                No. Ref: <strong>${escapeHtml(pay.ref)}</strong> &nbsp;|&nbsp;
                Nominal: <strong style="color: #111;">${formatRupiah(row.total_harga)}</strong>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button
                type="button"
                data-approve-id="${row.id_penyewaan}"
                style="padding: 9px 14px; border-radius: 10px; border: none; background: #16a34a; color: #fff; font-weight: 600; font-size: 13px; cursor: pointer;"
              >
                ✓ Terima (Uang Masuk)
              </button>
              <button
                type="button"
                data-reject-id="${row.id_penyewaan}"
                style="padding: 9px 14px; border-radius: 10px; border: 1px solid #dc2626; background: #fff; color: #dc2626; font-weight: 600; font-size: 13px; cursor: pointer;"
              >
                ✕ Tolak
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('[data-approve-id]').forEach((btn) => {
      btn.addEventListener('click', () =>
        approvePayment(Number(btn.dataset.approveId), btn)
      );
    });

    container.querySelectorAll('[data-reject-id]').forEach((btn) => {
      btn.addEventListener('click', () =>
        rejectPayment(Number(btn.dataset.rejectId), btn)
      );
    });
  } catch (error) {
    container.innerHTML = `<div style="color: #dc2626; font-size: 13px;">Gagal memuat antrean: ${escapeHtml(error.message)}</div>`;
  }
}

async function approvePayment(idPenyewaan, button) {
  const row = state.pendingList.find(
    (item) => Number(item.id_penyewaan) === Number(idPenyewaan)
  );
  if (!row) return;

  const pay = parsePaymentNote(row.catatan);
  const ok = window.confirm(
    `Konfirmasi Verifikasi Pembayaran:\n\n` +
      `Kode Booking: ${row.kode_booking}\n` +
      `Metode: ${pay.method}\n` +
      `Pengirim: ${pay.sender}\n` +
      `No. Ref: ${pay.ref}\n` +
      `Nominal: ${formatRupiah(row.total_harga)}\n\n` +
      `Apakah dana sudah benar-benar masuk dan siap dicatat ke Laporan Penerimaan Kas?`
  );
  if (!ok) return;

  button.disabled = true;
  button.textContent = 'Memproses...';

  try {
    try {
      await supabaseRequest('penerimaan_kas', {
        method: 'POST',
        body: JSON.stringify({
          no_bukti: generateReceiptNumber(),
          id_penyewaan: row.id_penyewaan,
          metode_pembayaran: pay.method,
          jumlah_diterima: row.total_harga,
          keterangan: `Terverifikasi (${pay.sender} | Ref: ${pay.ref})`
        })
      });
    } catch (err) {
      // Jika ternyata sudah tercatat sebelumnya, lanjutkan sinkronisasi status
      if (!String(err.message).toLowerCase().includes('duplicate key')) {
        throw err;
      }
    }

    await supabaseRequest(
      `penyewaan?id_penyewaan=eq.${encodeURIComponent(row.id_penyewaan)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status_booking: 'BOOKED'
        })
      }
    );

    showToast(`Pembayaran ${row.kode_booking} terverifikasi & masuk Laporan Kas.`);
    await loadReport();
  } catch (error) {
    showToast(`Gagal verifikasi: ${error.message}`);
    button.disabled = false;
    button.textContent = '✓ Terima (Uang Masuk)';
  }
}

async function rejectPayment(idPenyewaan, button) {
  const row = state.pendingList.find(
    (item) => Number(item.id_penyewaan) === Number(idPenyewaan)
  );
  if (!row) return;

  const ok = window.confirm(
    `Tolak pembayaran untuk ${row.kode_booking}?\n\n` +
      `Booking akan dibatalkan, jadwal akan dibuka kembali, dan transaksi TIDAK dicatat di Laporan Kas.`
  );
  if (!ok) return;

  button.disabled = true;
  button.textContent = 'Membatalkan...';

  try {
    try {
      await supabaseRequest(
        `penyewaan?id_penyewaan=eq.${encodeURIComponent(row.id_penyewaan)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status_booking: 'CANCELLED',
            catatan: `[DITOLAK] ${row.catatan || ''}`
          })
        }
      );
    } catch {
      await supabaseRequest(
        `penyewaan?id_penyewaan=eq.${encodeURIComponent(row.id_penyewaan)}`,
        { method: 'DELETE' }
      );
    }

    showToast(`Booking ${row.kode_booking} ditolak & tidak dicatat ke kas.`);
    await loadReport();
  } catch (error) {
    showToast(`Gagal menolak: ${error.message}`);
    button.disabled = false;
    button.textContent = '✕ Tolak';
  }
}

// ======================================================
// AKSES PORTAL PEMILIK & LAPORAN PENERIMAAN KAS
// ======================================================

async function openOwnerPortal() {
  if (!isOwnerLoggedIn()) {
    showPage(pages.ownerLogin);
    setTimeout(() => $('ownerPasswordInput')?.focus(), 100);
    return;
  }

  showPage(pages.report);
  await loadReport();
}

async function loadReport() {
  $('reportStatus').textContent = 'Memuat...';

  try {
    const endpoint =
      `penerimaan_kas?` +
      `select=id_penerimaan,id_penyewaan,no_bukti,tanggal_bayar,metode_pembayaran,jumlah_diterima,keterangan,` +
      `penyewaan(kode_booking,tanggal_reservasi,jam_reservasi,outlet,` +
      `paket(nama_paket,durasi_menit),pelanggan(nama_pelanggan,email))` +
      `&order=tanggal_bayar.desc`;

    const rows = (await supabaseRequest(endpoint)) || [];

    // Kumpulkan semua id_penyewaan yang sudah masuk kas untuk memfilter antrean
    const paidBookingIdSet = new Set(
      rows.map((item) => Number(item.id_penyewaan)).filter(Boolean)
    );
    await loadPendingVerifications(paidBookingIdSet);

    const totalCash = rows.reduce(
      (sum, item) => sum + Number(item.jumlah_diterima || 0),
      0
    );
    const totalQRIS = rows
      .filter((item) => item.metode_pembayaran === 'QRIS')
      .reduce((sum, item) => sum + Number(item.jumlah_diterima || 0), 0);
    const totalMBanking = rows
      .filter((item) => item.metode_pembayaran === 'M-BANKING')
      .reduce((sum, item) => sum + Number(item.jumlah_diterima || 0), 0);

    $('totalTransactions').textContent = rows.length;
    $('totalCash').textContent = formatRupiah(totalCash);
    $('totalQRIS').textContent = formatRupiah(totalQRIS);
    $('totalMBanking').textContent = formatRupiah(totalMBanking);

    renderReportTable(rows);
    $('reportStatus').textContent = `${rows.length} transaksi terverifikasi`;
  } catch (error) {
    $('reportStatus').textContent = 'Gagal memuat laporan.';
    showToast(error.message);
  }
}

function renderReportTable(rows) {
  const body = $('reportTableBody');

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table">
          Belum ada transaksi terverifikasi. Verifikasi pembayaran pada antrean di atas.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = rows
    .map((row) => {
      const booking = row.penyewaan || {};
      const customer = booking.pelanggan || {};
      const pkg = booking.paket || {};
      const reservationDate = booking.tanggal_reservasi
        ? formatDate(booking.tanggal_reservasi)
        : '—';
      const reservationTime = booking.jam_reservasi
        ? booking.jam_reservasi.slice(0, 5)
        : '—';

      return `
        <tr>
          <td><strong>${escapeHtml(row.no_bukti)}</strong></td>
          <td>${formatDateTime(row.tanggal_bayar)}</td>
          <td>${escapeHtml(customer.nama_pelanggan || '—')}</td>
          <td>${escapeHtml(pkg.nama_paket || '—')}</td>
          <td>${reservationDate}<br>${reservationTime}</td>
          <td>${escapeHtml(booking.outlet || '—')}</td>
          <td>${escapeHtml(row.metode_pembayaran)}</td>
          <td><strong>${formatRupiah(row.jumlah_diterima)}</strong></td>
        </tr>
      `;
    })
    .join('');
}

// ======================================================
// EVENT LISTENERS
// ======================================================

$('startBookingBtn').addEventListener('click', async () => {
  showPage(pages.booking);
  updatePaymentInstruction();
  try {
    await Promise.all([loadPackages(), loadOutlets()]);
  } catch (error) {
    showToast(error.message);
  }
});

if ($('navReportBtn')) {
  $('navReportBtn').addEventListener('click', openOwnerPortal);
}

$('backHomeBtn').addEventListener('click', () => {
  showPage(pages.home);
});

$('bookingForm').addEventListener('submit', submitBooking);

$('date').addEventListener('change', () => {
  updateSummary();
  checkAvailability();
});

$('time').addEventListener('input', () => {
  updateSummary();
  checkAvailability();
});

$('outlet').addEventListener('change', () => {
  updateSummary();
  checkAvailability();
});

document.querySelectorAll('input[name="payment"]').forEach((radio) => {
  radio.addEventListener('change', updatePaymentInstruction);
});

if ($('successReportBtn')) {
  $('successReportBtn').addEventListener('click', openOwnerPortal);
}

$('newBookingBtn').addEventListener('click', async () => {
  resetBookingForm();
  showPage(pages.booking);
  try {
    await Promise.all([loadPackages(), loadOutlets()]);
  } catch (error) {
    showToast(error.message);
  }
});

$('refreshReportBtn').addEventListener('click', loadReport);

$('printReportBtn').addEventListener('click', () => {
  window.print();
});

// Pintasan rahasia pemilik: klik 2x logo SnapSpace di pojok kiri atas
const headerBrand = document.querySelector('header > div');
if (headerBrand) {
  headerBrand.style.cursor = 'pointer';
  headerBrand.addEventListener('dblclick', openOwnerPortal);
}

// ======================================================
// INIT
// ======================================================

createOwnerLoginPage();
setupReportNavigationButtons();
syncOwnerVisibility();
setMinimumDate();
updatePaymentInstruction();

// Cek apakah dibuka lewat link khusus pemilik (?mode=owner atau #owner)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'owner' || window.location.hash === '#owner') {
  openOwnerPortal();
}
