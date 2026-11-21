// ======================================================
// KONFIGURASI SUPABASE & PEMILIK
// ======================================================

const SUPABASE_URL = 'https://lbtiszzodnopmivcfqkd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rRTNMxJmclKV5ey52bcM6Q_CBzccWpe';

// GANTI PASSWORD PEMILIK DI BAWAH INI SESUAI KEINGINANMU
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
  lastBooking: null
};

// ======================================================
// HELPER
// ======================================================

const $ = (id) => document.getElementById(id);

const pages = {
  home: $('homePage'),
  booking: $('bookingPage'),
  success: $('successPage'),
  report: $('reportPage')
};

function showPage(page) {
  Object.values(pages).forEach((p) => p.classList.remove('active'));
  page.classList.add('active');
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

// ======================================================
// KOTAK INSTRUKSI PEMBAYARAN (QRIS & M-BANKING)
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

  const pkg = state.selectedPackage;
  const amountText = pkg ? formatRupiah(pkg.harga) : 'Pilih paket terlebih dahulu';
  const method = selected.value;

  box.style.display = 'block';

  if (method === 'QRIS') {
    const qrData = encodeURIComponent(
      `SNAPSPACE-PHOTOBOOTH|QRIS|TOTAL:${pkg ? pkg.harga : 0}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

    box.innerHTML = `
      <div style="text-align: center;">
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
        <div style="font-size: 12px; color: #777; margin-top: 6px;">
          *Simulasi pembayaran. Setelah scan, klik <strong>Confirm Booking</strong> untuk menyelesaikan transaksi.
        </div>
      </div>
    `;
  } else if (method === 'M-BANKING') {
    box.innerHTML = `
      <div>
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
        <div style="font-size: 12px; color: #777;">
          *Simulasi pembayaran. Setelah transfer sesuai nominal, klik <strong>Confirm Booking</strong> untuk konfirmasi.
        </div>
      </div>
    `;

    const copyBtn = $('copyRekBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText('1234567890');
        showToast('Nomor rekening 1234-5678-90 berhasil disalin.');
      });
    }
  }
}

// ======================================================
// SUPABASE DIRECT REQUEST (TANPA SERVER BACKEND)
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
    `&status_booking=eq.BOOKED` +
    `&select=jam_reservasi,total_harga,paket(durasi_menit),kode_booking`;

  const rows = await supabaseRequest(endpoint);
  return (rows || []).map((booking) => {
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
// SUBMIT BOOKING KE SUPABASE
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

  const submitButton = document.querySelector('.submit-btn');
  submitButton.disabled = true;
  submitButton.textContent = 'Memproses Pembayaran...';

  let createdBooking = null;

  try {
    const pkg = state.selectedPackage;
    const duration = Number(pkg.durasi_menit);
    const startMinutes = timeToMinutes(time);
    const endMinutes = startMinutes + duration;

    if (endMinutes > 1440) {
      throw new Error(`Jam ${time} terlalu malam untuk paket ini.`);
    }

    // 1. Cek bentrok jadwal
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

    // 2. Simpan / Update Pelanggan
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

    // 3. Simpan Penyewaan
    const bookingCode = generateBookingCode();
    const bookingResult = await supabaseRequest('penyewaan', {
      method: 'POST',
      body: JSON.stringify({
        kode_booking: bookingCode,
        id_pelanggan: customer.id_pelanggan,
        id_paket: pkg.id_paket,
        tanggal_reservasi: date,
        jam_reservasi: `${time}:00`,
        outlet,
        total_harga: pkg.harga,
        status_booking: 'BOOKED',
        catatan: null
      })
    });

    createdBooking = bookingResult?.[0];
    if (!createdBooking) {
      throw new Error('Data penyewaan gagal disimpan.');
    }

    // 4. Simpan Penerimaan Kas
    const receiptResult = await supabaseRequest('penerimaan_kas', {
      method: 'POST',
      body: JSON.stringify({
        no_bukti: generateReceiptNumber(),
        id_penyewaan: createdBooking.id_penyewaan,
        metode_pembayaran: paymentMethod,
        jumlah_diterima: pkg.harga,
        keterangan: `Pembayaran booking ${bookingCode}`
      })
    });

    const receipt = receiptResult?.[0];
    if (!receipt) {
      throw new Error('Data penerimaan kas gagal disimpan.');
    }

    const resultData = {
      booking: createdBooking,
      customer,
      package: pkg,
      receipt,
      payment: {
        method: paymentMethod,
        amount: pkg.harga
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
    showToast('Pembayaran berhasil & booking tersimpan ke database.');
  } catch (error) {
    if (createdBooking?.id_penyewaan) {
      try {
        await supabaseRequest(
          `penyewaan?id_penyewaan=eq.${encodeURIComponent(
            createdBooking.id_penyewaan
          )}`,
          { method: 'DELETE' }
        );
      } catch {}
    }
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
  $('successCode').textContent = data.booking.kode_booking;
  $('successName').textContent = data.customer.nama_pelanggan;
  $('successPackage').textContent = data.package.nama_paket;
  $('successDate').textContent = formatDate(data.booking.tanggal_reservasi);
  $('successTime').textContent = `${data.schedule.start} – ${data.schedule.end}`;
  $('successOutlet').textContent = data.booking.outlet;
  $('successPayment').textContent =
    data.payment.method === 'M-BANKING'
      ? 'M-Banking — LUNAS ✓'
      : 'QRIS — LUNAS ✓';
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
// PROTEKSI PEMILIK & LAPORAN PENERIMAAN KAS
// ======================================================

async function openOwnerReport() {
  const isUnlocked = sessionStorage.getItem('snapspace_owner_auth') === 'true';

  if (!isUnlocked) {
    const input = window.prompt(
      'Khusus Pemilik SnapSpace\nMasukkan password untuk membuka Laporan Penerimaan Kas:'
    );

    if (input === null) return;

    if (input !== OWNER_PASSWORD) {
      showToast('Password salah. Akses Laporan Kas khusus pemilik.');
      return;
    }

    sessionStorage.setItem('snapspace_owner_auth', 'true');
    showToast('Login pemilik berhasil.');
  }

  showPage(pages.report);
  await loadReport();
}

async function loadReport() {
  $('reportStatus').textContent = 'Memuat...';

  try {
    const endpoint =
      `penerimaan_kas?` +
      `select=id_penerimaan,no_bukti,tanggal_bayar,metode_pembayaran,jumlah_diterima,keterangan,` +
      `penyewaan(kode_booking,tanggal_reservasi,jam_reservasi,outlet,` +
      `paket(nama_paket,durasi_menit),pelanggan(nama_pelanggan,email))` +
      `&order=tanggal_bayar.desc`;

    const rows = (await supabaseRequest(endpoint)) || [];

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
    $('reportStatus').textContent = `${rows.length} transaksi`;
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
          Belum ada transaksi. Buat booking terlebih dahulu.
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

$('navReportBtn').addEventListener('click', openOwnerReport);

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
  $('successReportBtn').addEventListener('click', openOwnerReport);
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

// ======================================================
// INIT
// ======================================================

setMinimumDate();
updatePaymentInstruction();
