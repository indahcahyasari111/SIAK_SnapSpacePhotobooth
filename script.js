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
  activeGatewaySession: null,
  gatewayTimerInterval: null
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
  if ($('navReportBtn')) {
    $('navReportBtn').style.display = '';
    $('navReportBtn').textContent = 'Dashboard Pemilik';
  }

  if ($('successReportBtn')) {
    $('successReportBtn').style.display = 'none';
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

function copyTextToClipboard(text, successMessage, silent = false) {
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (!silent && successMessage) showToast(successMessage);
      })
      .catch(() => {
        if (!silent) fallbackCopy(text, successMessage);
      });
  } else if (!silent) {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    if (successMessage) showToast(successMessage);
  } catch {
    showToast('Gagal menyalin teks.');
  }
  document.body.removeChild(textarea);
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
  const [hour, minute] = String(time || '00:00').slice(0, 5).split(':').map(Number);
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

function randomDigits(length) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10);
  }
  return result;
}

function generateBookingCode() {
  return `PB-${Date.now().toString().slice(-8)}-${randomHex(6)}`;
}

function generateReceiptNumber() {
  return `KM-${Date.now().toString().slice(-8)}-${randomHex(4)}`;
}

function generateGatewayRef() {
  return `GW-${Date.now().toString().slice(-6)}-${randomHex(6)}`;
}

function generateVirtualAccount(phone) {
  const digits = String(phone || '').replace(/\D/g, '').slice(-8) || randomDigits(8);
  return `8077 ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
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
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ======================================================
// KOTAK INFO PAYMENT GATEWAY DI FORM BOOKING
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
    margin: 14px 0 18px;
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    font-size: 13px;
    line-height: 1.5;
    color: #334155;
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
  const amountText = pkg ? formatRupiah(pkg.harga) : 'sesuai paket pilihan';
  const methodLabel =
    selected.value === 'M-BANKING'
      ? 'M-Banking (BCA Virtual Account)'
      : 'QRIS Instan';

  box.style.display = 'block';
  box.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <span style="font-size: 18px; line-height: 1;">⚡</span>
      <div>
        <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">
          Verifikasi Otomatis via SnapPay Payment Gateway
        </div>
        <div>
          Metode dipilih: <strong>${methodLabel}</strong> (${amountText}). Klik <strong>Confirm Booking</strong> untuk membuka jendela pembayaran otomatis — status booking & E-Ticket akan langsung aktif setelah pembayaran berhasil.
        </div>
      </div>
    </div>
  `;
}

// ======================================================
// POP-UP PAYMENT GATEWAY (VERIFIKASI OTOMATIS)
// ======================================================

function stopGatewayTimer() {
  if (state.gatewayTimerInterval) {
    clearInterval(state.gatewayTimerInterval);
    state.gatewayTimerInterval = null;
  }
}

function closePaymentGatewayModal() {
  stopGatewayTimer();
  const modal = $('paymentGatewayModal');
  if (modal) modal.style.display = 'none';
  state.activeGatewaySession = null;
}

function ensurePaymentGatewayModal() {
  let modal = $('paymentGatewayModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'paymentGatewayModal';
  modal.style.cssText = `
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(4px);
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
  `;

  modal.innerHTML = `
    <div id="paymentGatewayCard" style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25); font-family: inherit;">
      <div style="background: #111827; color: #ffffff; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 16px; letter-spacing: 0.3px;">SnapPay Gateway</strong>
            <span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: #10b981; color: #ffffff;">
              SECURE
            </span>
          </div>
          <div style="font-size: 12px; color: #9ca3af; margin-top: 2px;">
            SnapSpace Photobooth • Verifikasi Otomatis
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; color: #9ca3af;">Batas Waktu</div>
          <div id="gwCountdown" style="font-size: 15px; font-weight: 700; color: #fde68a;">15:00</div>
        </div>
      </div>

      <div id="gwBody" style="padding: 22px;"></div>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

function openPaymentGatewayModal(sessionData) {
  const modal = ensurePaymentGatewayModal();
  const body = $('gwBody');
  const countdownEl = $('gwCountdown');
  state.activeGatewaySession = sessionData;

  const { booking, customer, package: pkg, payment } = sessionData;
  const isQRIS = payment.method === 'QRIS';
  const vaNumber = generateVirtualAccount(customer.no_hp);
  const vaClean = vaNumber.replace(/\s/g, '');

  let methodContentHtml = '';

  if (isQRIS) {
    const qrPayload = encodeURIComponent(
      `SNAPPAY-GATEWAY|ORDER:${booking.kode_booking}|AMOUNT:${pkg.harga}`
    );
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=${qrPayload}`;

    methodContentHtml = `
      <div style="text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 18px;">
        <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
          Scan QRIS untuk Membayar
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
          Mendukung GoPay, OVO, DANA, ShopeePay, BCA Mobile, Livin', & BRImo
        </div>
        <div style="display: inline-block; padding: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <img src="${qrUrl}" alt="QRIS Payment Gateway" width="175" height="175" style="display: block;" />
        </div>
      </div>
    `;
  } else {
    methodContentHtml = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 18px;">
        <div style="font-size: 12px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          BCA Virtual Account (Otomatis)
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
          <div>
            <div style="font-size: 11px; color: #64748b;">Nomor Virtual Account</div>
            <div style="font-size: 19px; font-weight: 700; letter-spacing: 0.8px; color: #0f172a;">${vaNumber}</div>
          </div>
          <button
            type="button"
            id="gwCopyVaBtn"
            style="padding: 8px 12px; border-radius: 8px; border: 1px solid #111827; background: #111827; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer;"
          >
            Salin VA
          </button>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 10px;">
          Nominal otomatis terdeteksi di aplikasi M-Banking. Tidak perlu kirim bukti transfer.
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb;">
      <div>
        <div style="font-size: 11px; color: #64748b;">Order ID</div>
        <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(booking.kode_booking)}</div>
        <div style="font-size: 12px; color: #475569;">${escapeHtml(pkg.nama_paket)} • ${escapeHtml(booking.outlet)}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #64748b;">Total Bayar</div>
        <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${formatRupiah(pkg.harga)}</div>
      </div>
    </div>

    ${methodContentHtml}

    <div id="gwStatusArea" style="display: none; text-align: center; padding: 14px; margin-bottom: 14px; border-radius: 12px; background: #eff6ff; color: #1e40af; font-size: 13px; font-weight: 600;">
      ⏳ Memverifikasi pembayaran secara otomatis dengan Payment Gateway...
    </div>

    <div id="gwActionButtons" style="display: flex; flex-direction: column; gap: 10px;">
      <button
        type="button"
        id="gwPaySuccessBtn"
        style="width: 100%; padding: 13px 16px; border-radius: 12px; border: none; background: #16a34a; color: #ffffff; font-size: 14px; font-weight: 700; cursor: pointer;"
      >
        ✓ Verifikasi Sekarang
      </button>
      <button
        type="button"
        id="gwCancelBtn"
        style="width: 100%; padding: 11px 16px; border-radius: 12px; border: 1px solid #e2e8f0; background: #ffffff; color: #dc2626; font-size: 13px; font-weight: 600; cursor: pointer;"
      >
        ✕ Batalkan Pembayaran
      </button>
    </div>

    <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 14px;">
      🔒 Secured by SnapPay Payment Gateway • Terverifikasi Otomatis
    </div>
  `;

  modal.style.display = 'flex';

  $('gwCopyVaBtn')?.addEventListener('click', () => {
    copyTextToClipboard(vaClean, `Virtual Account ${vaNumber} berhasil disalin.`);
  });

  $('gwPaySuccessBtn')?.addEventListener('click', () => completeGatewayPayment());
  $('gwCancelBtn')?.addEventListener('click', () => cancelGatewayPayment(false));

  // Countdown 15 menit
  let remainingSeconds = 15 * 60;
  stopGatewayTimer();
  if (countdownEl) countdownEl.textContent = '15:00';
  state.gatewayTimerInterval = setInterval(() => {
    remainingSeconds -= 1;
    if (remainingSeconds <= 0) {
      cancelGatewayPayment(true);
      return;
    }
    const min = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const sec = String(remainingSeconds % 60).padStart(2, '0');
    if (countdownEl) countdownEl.textContent = `${min}:${sec}`;
  }, 1000);
}

async function completeGatewayPayment() {
  const session = state.activeGatewaySession;
  if (!session) return;

  const statusArea = $('gwStatusArea');
  const actionButtons = $('gwActionButtons');
  if (statusArea) statusArea.style.display = 'block';
  if (actionButtons) actionButtons.style.display = 'none';
  stopGatewayTimer();

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const gatewayRef = generateGatewayRef();
    const receiptNo = generateReceiptNumber();

    // 1. Otomatis catat ke tabel penerimaan_kas
    const receiptResult = await supabaseRequest('penerimaan_kas', {
      method: 'POST',
      body: JSON.stringify({
        no_bukti: receiptNo,
        id_penyewaan: session.booking.id_penyewaan,
        metode_pembayaran: session.payment.method,
        jumlah_diterima: session.package.harga,
        keterangan: `Auto-Verified via SnapPay Gateway (Ref: ${gatewayRef})`
      })
    });

    const receipt = receiptResult?.[0] || {
      no_bukti: receiptNo,
      metode_pembayaran: session.payment.method,
      jumlah_diterima: session.package.harga
    };

    // 2. Otomatis perbarui status booking menjadi BOOKED
    await supabaseRequest(
      `penyewaan?id_penyewaan=eq.${encodeURIComponent(session.booking.id_penyewaan)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status_booking: 'BOOKED',
          catatan: `GATEWAY:SNAPPAY|METODE:${session.payment.method}|REF:${gatewayRef}|STATUS:PAID`
        })
      }
    );

    localStorage.setItem('snapspace_last_booking_code', session.booking.kode_booking);
    if ($('lookupBookingCodeInput')) {
      $('lookupBookingCodeInput').value = session.booking.kode_booking;
    }

    const finalData = {
      ...session,
      receipt,
      gatewayRef,
      verificationStatus: 'VERIFIED'
    };

    state.lastBooking = finalData;
    closePaymentGatewayModal();
    fillSuccess(finalData);
    showPage(pages.success);

    // Auto-copy kode booking secara otomatis ke clipboard
    copyTextToClipboard(session.booking.kode_booking, '', true);
    showToast(
      `Pembayaran terverifikasi! Kode booking ${session.booking.kode_booking} otomatis tersalin.`
    );
  } catch (error) {
    if (statusArea) {
      statusArea.style.background = '#fef2f2';
      statusArea.style.color = '#991b1b';
      statusArea.textContent = `Gagal memverifikasi: ${error.message}`;
    }
    if (actionButtons) actionButtons.style.display = 'flex';
  }
}

async function cancelGatewayPayment(isTimeout = false) {
  const session = state.activeGatewaySession;
  if (!session) {
    closePaymentGatewayModal();
    return;
  }

  const cancelBtn = $('gwCancelBtn');
  if (cancelBtn) {
    cancelBtn.disabled = true;
    cancelBtn.textContent = 'Membatalkan...';
  }

  try {
    try {
      await supabaseRequest(
        `penyewaan?id_penyewaan=eq.${encodeURIComponent(session.booking.id_penyewaan)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status_booking: 'CANCELLED',
            catatan: isTimeout ? '[DITOLAK] Waktu pembayaran habis' : '[DITOLAK] Dibatalkan pelanggan'
          })
        }
      );
    } catch {
      await supabaseRequest(
        `penyewaan?id_penyewaan=eq.${encodeURIComponent(session.booking.id_penyewaan)}`,
        { method: 'DELETE' }
      );
    }
  } catch {
    // Abaikan jika gagal hapus
  } finally {
    closePaymentGatewayModal();
    checkAvailability();
    showToast(
      isTimeout
        ? 'Waktu pembayaran habis. Reservasi otomatis dibatalkan.'
        : 'Pembayaran dibatalkan. Jadwal kembali tersedia.'
    );
  }
}

// ======================================================
// KOTAK "CEK STATUS BOOKING" DI HALAMAN HOME (PELANGGAN)
// ======================================================

function createHomeStatusLookupBox() {
  if (!pages.home || $('homeStatusLookupBox')) return;

  const savedCode = localStorage.getItem('snapspace_last_booking_code') || '';

  const box = document.createElement('div');
  box.id = 'homeStatusLookupBox';
  box.style.cssText = `
    margin-top: 28px;
    background: #ffffff;
    border: 1px solid #e8e2d9;
    border-radius: 20px;
    padding: 22px 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  `;

  box.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div style="flex: 1; min-width: 220px;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #c25e3e; text-transform: uppercase;">
          CEK E-TICKET & STATUS RESERVASI
        </div>
        <h3 style="margin: 4px 0 4px; font-size: 18px;">
          Sudah booking? Cek E-Ticket Anda di sini.
        </h3>
        <p style="margin: 0; font-size: 13px; color: #666;">
          Masukkan Kode Booking (PB-...) untuk melihat status pembayaran dan mencetak ulang E-Ticket.
        </p>
      </div>
      <form id="homeCheckStatusForm" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <input
          type="text"
          id="lookupBookingCodeInput"
          placeholder="Masukkan Kode Booking (PB-...)"
          value="${escapeHtml(savedCode)}"
          required
          style="padding: 11px 14px; border: 1px solid #d4d4d4; border-radius: 10px; font-size: 13px; min-width: 220px; text-transform: uppercase;"
        />
        <button
          type="submit"
          id="lookupBookingBtn"
          style="padding: 11px 16px; border-radius: 10px; border: none; background: #111; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;"
        >
          Cek Status →
        </button>
      </form>
    </div>
  `;

  pages.home.appendChild(box);

  $('homeCheckStatusForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = ($('lookupBookingCodeInput')?.value || '').trim().toUpperCase();
    if (!code) {
      showToast('Masukkan kode booking terlebih dahulu.');
      return;
    }

    const btn = $('lookupBookingBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Mencari...';
    }

    try {
      const found = await fetchBookingStatusByCode(code);
      if (!found) {
        showToast(`Kode booking "${code}" tidak ditemukan.`);
        return;
      }

      localStorage.setItem('snapspace_last_booking_code', code);
      state.lastBooking = found;
      fillSuccess(found);
      showPage(pages.success);
    } catch (error) {
      showToast(`Gagal mengecek status: ${error.message}`);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Cek Status →';
      }
    }
  });
}

async function fetchBookingStatusByCode(kodeBooking) {
  const endpoint =
    `penyewaan?` +
    `kode_booking=eq.${encodeURIComponent(kodeBooking)}` +
    `&select=*,paket(*),pelanggan(*)`;

  const bookings = await supabaseRequest(endpoint);
  const booking = bookings?.[0];
  if (!booking) return null;

  const receipts = await supabaseRequest(
    `penerimaan_kas?id_penyewaan=eq.${encodeURIComponent(booking.id_penyewaan)}&select=*`
  );
  const receipt = receipts?.[0] || null;

  const isRejected =
    booking.status_booking === 'CANCELLED' ||
    (booking.catatan || '').startsWith('[DITOLAK]');

  let verificationStatus = 'PENDING';
  if (receipt) {
    verificationStatus = 'VERIFIED';
  } else if (isRejected) {
    verificationStatus = 'REJECTED';
  }

  const pkg = booking.paket || {};
  const customer = booking.pelanggan || {};
  const start = (booking.jam_reservasi || '00:00').slice(0, 5);
  const duration = Number(pkg.durasi_menit || 0);
  const end = minutesToTime(timeToMinutes(start) + duration);

  return {
    booking,
    customer,
    package: pkg,
    receipt,
    verificationStatus,
    payment: {
      method: receipt?.metode_pembayaran || 'QRIS',
      amount: receipt?.jumlah_diterima || booking.total_harga
    },
    schedule: {
      start,
      end,
      duration
    }
  };
}

function getOrCreateCustomerStatusBanner() {
  let banner = $('customerStatusBanner');
  if (banner) return banner;

  banner = document.createElement('div');
  banner.id = 'customerStatusBanner';
  banner.style.cssText = `
    margin: 18px 0;
    padding: 16px 18px;
    border-radius: 14px;
    font-size: 13px;
    line-height: 1.5;
    text-align: left;
  `;

  const subtitle = pages.success?.querySelector('p');
  if (subtitle && subtitle.parentElement) {
    subtitle.parentElement.insertBefore(banner, subtitle.nextSibling);
  } else if (pages.success) {
    pages.success.prepend(banner);
  }

  return banner;
}

function setupSuccessNavigationButtons() {
  const newBookingBtn = $('newBookingBtn');
  if (!newBookingBtn || $('successBackHomeBtn')) return;

  const container = newBookingBtn.parentElement;
  if (!container) return;

  const backHomeBtn = document.createElement('button');
  backHomeBtn.type = 'button';
  backHomeBtn.id = 'successBackHomeBtn';
  backHomeBtn.textContent = '← Kembali ke Home';
  backHomeBtn.style.cssText = `
    padding: 12px 18px;
    border-radius: 999px;
    border: 1px solid #d4d4d4;
    background: #ffffff;
    color: #111111;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  `;

  backHomeBtn.addEventListener('click', () => {
    showPage(pages.home);
  });

  container.insertBefore(backHomeBtn, newBookingBtn);
}

// ======================================================
// DROPDOWN JAM KHUSUS JAM OPERASIONAL (10:00 – 21:00)
// ======================================================

function convertTimeInputToOperatingSelect() {
  const currentEl = $('time');
  if (!currentEl || currentEl.tagName === 'SELECT' || !currentEl.parentNode) return;

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

  if (previousValue && Array.from(select.options).some((o) => o.value === previousValue)) {
    select.value = previousValue;
  } else {
    select.value = '';
  }
}

function setupOperatingHoursUI() {
  populateOperatingTimeOptions();

  const box = $('availabilityBox');
  if (box && (!$('date')?.value || !$('outlet')?.value)) {
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
        Halaman khusus pengelola SnapSpace Photobooth untuk memantau Laporan Penerimaan Kas yang terintegrasi otomatis dengan Payment Gateway.
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

  $('ownerLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('ownerPasswordInput')?.value || '';

    if (input !== OWNER_PASSWORD) {
      showToast('Password salah. Akses khusus pemilik.');
      if ($('ownerPasswordInput')) {
        $('ownerPasswordInput').value = '';
        $('ownerPasswordInput').focus();
      }
      return;
    }

    sessionStorage.setItem('snapspace_owner_auth', 'true');
    if ($('ownerPasswordInput')) $('ownerPasswordInput').value = '';
    syncOwnerVisibility();
    showToast('Login pemilik berhasil.');
    showPage(pages.report);
    await loadReport();
  });

  $('ownerLoginBackBtn')?.addEventListener('click', () => {
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
    setupOperatingHoursUI();
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
    if (window.location.search.includes('owner') || window.location.hash === '#owner') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    showPage(pages.home);
    showToast('Berhasil logout. Klik Dashboard Pemilik untuk login kembali.');
  });

  btnContainer.insertBefore(backBtn, refreshBtn);
  btnContainer.appendChild(logoutBtn);
}

function setupGatewayStatusBannerOnReport() {
  if ($('gatewayActiveBanner') || !pages.report) return;

  const banner = document.createElement('div');
  banner.id = 'gatewayActiveBanner';
  banner.style.cssText = `
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    color: #065f46;
    border-radius: 14px;
    padding: 14px 18px;
    margin: 18px 0;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  `;

  banner.innerHTML = `
    <div>
      <strong>⚡ Integrasi Payment Gateway Aktif (Auto-Verify):</strong>
      Setiap pembayaran QRIS & M-Banking diverifikasi otomatis dan langsung tercatat pada Laporan Penerimaan Kas tanpa approval manual.
    </div>
    <span style="font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #059669; color: #fff;">
      REAL-TIME SYNC
    </span>
  `;

  const tableEl = $('reportTableBody')?.closest('table');
  const tableCard = tableEl?.parentElement?.parentElement;
  if (tableCard && tableCard.parentElement === pages.report) {
    pages.report.insertBefore(banner, tableCard);
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
  if ($('date')) {
    $('date').min = getTodayJakarta();
  }
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
  if (!container) return;

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
      populateOperatingTimeOptions();
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
  if (!$('outlet')) return;
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
  const date = $('date')?.value || '';
  const time = $('time')?.value || '';
  const outlet = $('outlet')?.value || '';

  if ($('summaryPackage')) {
    $('summaryPackage').textContent = pkg?.nama_paket || 'Pilih paket';
  }
  if ($('summaryDuration')) {
    $('summaryDuration').textContent = pkg ? `${pkg.durasi_menit} menit` : '—';
  }
  if ($('summaryDate')) {
    $('summaryDate').textContent = date ? formatDate(date) : '—';
  }

  if ($('summaryTime')) {
    if (time && pkg) {
      const end = minutesToTime(timeToMinutes(time) + Number(pkg.durasi_menit));
      $('summaryTime').textContent = `${time} – ${end} WIB`;
    } else {
      $('summaryTime').textContent = time ? `${time} WIB` : '—';
    }
  }

  if ($('summaryOutlet')) {
    $('summaryOutlet').textContent = outlet || '—';
  }
  if ($('summaryPrice')) {
    $('summaryPrice').textContent = pkg ? formatRupiah(pkg.harga) : 'Rp0';
  }
}

// ======================================================
// CEK KETERSEDIAAN JADWAL & JAM OPERASIONAL
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
  const date = $('date')?.value || '';
  const outlet = $('outlet')?.value || '';
  const time = $('time')?.value || '';
  const box = $('availabilityBox');
  if (!box) return;

  if (time) {
    const duration = Number(state.selectedPackage?.durasi_menit || 0);
    const hoursError = validateOperatingHours(time, duration);
    if (hoursError) {
      box.className = 'availability-box bad';
      box.textContent = hoursError;
      return;
    }
  }

  if (!date || !outlet) {
    box.className = 'availability-box';
    box.textContent = `Jam operasional outlet: ${OPEN_TIME} – ${CLOSE_TIME} WIB. Pilih tanggal dan outlet untuk mengecek jadwal.`;
    return;
  }

  try {
    const bookings = await getBookedReservations(date, outlet);

    if (!time || !state.selectedPackage) {
      box.className = 'availability-box';
      box.textContent = `Jam operasional ${OPEN_TIME}–${CLOSE_TIME} WIB. Terdapat ${bookings.length} booking pada tanggal tersebut di ${outlet}. Pilih paket & jam untuk mengecek bentrok.`;
      return;
    }

    const start = timeToMinutes(time);
    const duration = Number(state.selectedPackage.durasi_menit);
    const end = start + duration;

    const conflict = bookings.find((booking) => {
      const existingStart = timeToMinutes(booking.start);
      const existingEnd = timeToMinutes(booking.end);
      return start < existingEnd && end > existingStart;
    });

    if (conflict) {
      box.className = 'availability-box bad';
      box.textContent = `Bentrok dengan booking ${conflict.start}–${conflict.end} WIB. Silakan pilih jam lain.`;
    } else {
      box.className = 'availability-box ok';
      box.textContent = `Jadwal tersedia: ${time}–${minutesToTime(end)} WIB (${duration} menit).`;
    }
  } catch (error) {
    box.className = 'availability-box bad';
    box.textContent = error.message;
  }
}

// ======================================================
// SUBMIT BOOKING -> BUKA PAYMENT GATEWAY POP-UP
// ======================================================

async function submitBooking(event) {
  event.preventDefault();

  if (!state.selectedPackage) {
    showToast('Pilih paket terlebih dahulu.');
    return;
  }

  const payment = document.querySelector('input[name="payment"]:checked');
  const name = $('name')?.value.trim() || '';
  const phone = $('phone')?.value.trim() || '';
  const email = $('email')?.value.trim() || '';
  const address = $('address')?.value.trim() || '';
  const date = $('date')?.value || '';
  const time = $('time')?.value || '';
  const outlet = $('outlet')?.value || '';
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

  const pkg = state.selectedPackage;
  const duration = Number(pkg.durasi_menit);
  const hoursError = validateOperatingHours(time, duration);
  if (hoursError) {
    showToast(hoursError);
    return;
  }

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    showToast('Silakan pilih metode pembayaran.');
    return;
  }

  const submitButton = document.querySelector('.submit-btn');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Membuka Payment Gateway...';
  }

  try {
    const startMinutes = timeToMinutes(time);
    const endMinutes = startMinutes + duration;

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
    const payloadPenyewaan = {
      kode_booking: bookingCode,
      id_pelanggan: customer.id_pelanggan,
      id_paket: pkg.id_paket,
      tanggal_reservasi: date,
      jam_reservasi: `${time}:00`,
      outlet,
      total_harga: pkg.harga,
      status_booking: 'PENDING',
      catatan: `GATEWAY:SNAPPAY|METODE:${paymentMethod}|STATUS:WAITING_PAYMENT`
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

    openPaymentGatewayModal({
      booking: createdBooking,
      customer,
      package: pkg,
      payment: {
        method: paymentMethod,
        amount: pkg.harga
      },
      schedule: {
        start: time,
        end: minutesToTime(endMinutes),
        duration
      }
    });
  } catch (error) {
    showToast(error.message);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Confirm Booking →';
    }
  }
}

// ======================================================
// HALAMAN E-TICKET / STATUS PELANGGAN
// ======================================================

function fillSuccess(data) {
  const status = data.verificationStatus || 'VERIFIED';
  const heading = pages.success?.querySelector('h1');
  const subtitle = pages.success?.querySelector('p');
  const banner = getOrCreateCustomerStatusBanner();
  const kode = data.booking?.kode_booking || '';

  if ($('successReportBtn')) {
    $('successReportBtn').style.display = 'none';
  }

  const methodLabel =
    data.payment.method === 'M-BANKING' ? 'M-Banking (VA)' : 'QRIS';

  if (status === 'VERIFIED') {
    if (heading) heading.textContent = 'Booking Sukses & Terverifikasi!';
    if (subtitle) {
      subtitle.textContent =
        'Pembayaran Anda telah terverifikasi secara otomatis melalui Payment Gateway. Tunjukkan E-Ticket dan kode booking ini saat tiba di outlet.';
    }

    if (banner) {
      banner.style.background = '#ecfdf5';
      banner.style.border = '1px solid #a7f3d0';
      banner.style.color = '#065f46';
      banner.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">
              ✓ PEMBAYARAN TERVERIFIKASI OTOMATIS (LUNAS)
            </div>
            <div>
              No. Bukti Resmi: <strong>${escapeHtml(data.receipt?.no_bukti || '—')}</strong>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button
              type="button"
              id="copyBookingCodeBtn"
              style="padding: 9px 14px; border-radius: 10px; border: 1px solid #059669; background: #ffffff; color: #065f46; font-size: 13px; font-weight: 600; cursor: pointer;"
            >
              📋 Salin Kode Booking
            </button>
            <button
              type="button"
              id="printTicketBtn"
              style="padding: 9px 14px; border-radius: 10px; border: none; background: #059669; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;"
            >
              🖨️ Cetak / Simpan E-Ticket
            </button>
          </div>
        </div>
      `;

      $('copyBookingCodeBtn')?.addEventListener('click', () => {
        copyTextToClipboard(kode, `Kode booking ${kode} berhasil disalin.`);
      });

      $('printTicketBtn')?.addEventListener('click', () => {
        window.print();
      });
    }

    if ($('successPayment')) {
      $('successPayment').textContent = `${methodLabel} — LUNAS (Auto-Verified ✓)`;
    }
  } else if (status === 'REJECTED') {
    if (heading) heading.textContent = 'Pembayaran Dibatalkan.';
    if (subtitle) {
      subtitle.textContent =
        'Transaksi pembayaran dibatalkan atau melewati batas waktu. Silakan buat reservasi baru untuk memilih jadwal kembali.';
    }

    if (banner) {
      banner.style.background = '#fef2f2';
      banner.style.border = '1px solid #fecaca';
      banner.style.color = '#991b1b';
      banner.innerHTML = `
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">
          ✕ PEMBAYARAN DIBATALKAN / KEDALUWARSA
        </div>
        <div>
          Silakan klik tombol buat booking baru di bawah untuk mengulangi reservasi.
        </div>
      `;
    }

    if ($('successPayment')) {
      $('successPayment').textContent = `${methodLabel} — Dibatalkan`;
    }
  } else {
    if (heading) heading.textContent = 'Menunggu Pembayaran.';
    if (subtitle) {
      subtitle.textContent =
        'Reservasi ini belum menyelesaikan pembayaran di Payment Gateway.';
    }

    if (banner) {
      banner.style.background = '#fffbeb';
      banner.style.border = '1px solid #fde68a';
      banner.style.color = '#92400e';
      banner.innerHTML = `
        <div style="font-weight: 700; font-size: 14px;">
          ⏳ MENUNGGU PEMBAYARAN GATEWAY
        </div>
      `;
    }

    if ($('successPayment')) {
      $('successPayment').textContent = `${methodLabel} — Belum Dibayar`;
    }
  }

  if ($('successCode')) {
    $('successCode').textContent = kode;
    $('successCode').title = 'Klik untuk menyalin kode booking';
    $('successCode').style.cursor = 'pointer';
    $('successCode').onclick = () => {
      copyTextToClipboard(kode, `Kode booking ${kode} berhasil disalin.`);
    };
  }
  if ($('successName')) $('successName').textContent = data.customer.nama_pelanggan || '—';
  if ($('successPackage')) $('successPackage').textContent = data.package.nama_paket || '—';
  if ($('successDate')) $('successDate').textContent = formatDate(data.booking.tanggal_reservasi);
  if ($('successTime')) $('successTime').textContent = `${data.schedule.start} – ${data.schedule.end} WIB`;
  if ($('successOutlet')) $('successOutlet').textContent = data.booking.outlet || '—';
  if ($('successAmount')) $('successAmount').textContent = formatRupiah(data.payment.amount);
}

function resetBookingForm() {
  $('bookingForm')?.reset();
  state.selectedPackage = null;
  renderPackages();
  populateOperatingTimeOptions();
  updateSummary();
  updatePaymentInstruction();
  if ($('availabilityBox')) {
    $('availabilityBox').className = 'availability-box';
  }
  setupOperatingHoursUI();
  setMinimumDate();
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
  if ($('reportStatus')) $('reportStatus').textContent = 'Memuat...';
  setupGatewayStatusBannerOnReport();

  try {
    const endpoint =
      `penerimaan_kas?` +
      `select=id_penerimaan,id_penyewaan,no_bukti,tanggal_bayar,metode_pembayaran,jumlah_diterima,keterangan,` +
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

    if ($('totalTransactions')) $('totalTransactions').textContent = rows.length;
    if ($('totalCash')) $('totalCash').textContent = formatRupiah(totalCash);
    if ($('totalQRIS')) $('totalQRIS').textContent = formatRupiah(totalQRIS);
    if ($('totalMBanking')) $('totalMBanking').textContent = formatRupiah(totalMBanking);

    renderReportTable(rows);
    if ($('reportStatus')) {
      $('reportStatus').textContent = `${rows.length} transaksi terverifikasi`;
    }
  } catch (error) {
    if ($('reportStatus')) $('reportStatus').textContent = 'Gagal memuat laporan.';
    showToast(error.message);
  }
}

function renderReportTable(rows) {
  const body = $('reportTableBody');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="8" class="empty-table">
          Belum ada transaksi. Transaksi yang lunas melalui Payment Gateway akan otomatis muncul di sini.
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
          <td>
            <strong>${escapeHtml(row.no_bukti)}</strong>
            <div style="font-size: 12px; color: #666; margin-top: 2px;">
              ${escapeHtml(booking.kode_booking || '—')}
            </div>
          </td>
          <td>${formatDateTime(row.tanggal_bayar)}</td>
          <td>${escapeHtml(customer.nama_pelanggan || '—')}</td>
          <td>${escapeHtml(pkg.nama_paket || '—')}</td>
          <td>${reservationDate}<br>${reservationTime} WIB</td>
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

$('startBookingBtn')?.addEventListener('click', async () => {
  showPage(pages.booking);
  updatePaymentInstruction();
  setupOperatingHoursUI();
  try {
    await Promise.all([loadPackages(), loadOutlets()]);
  } catch (error) {
    showToast(error.message);
  }
});

$('navReportBtn')?.addEventListener('click', openOwnerPortal);

$('backHomeBtn')?.addEventListener('click', () => {
  showPage(pages.home);
});

$('bookingForm')?.addEventListener('submit', submitBooking);

$('date')?.addEventListener('change', () => {
  updateSummary();
  checkAvailability();
});

$('outlet')?.addEventListener('change', () => {
  updateSummary();
  checkAvailability();
});

document.querySelectorAll('input[name="payment"]').forEach((radio) => {
  radio.addEventListener('change', updatePaymentInstruction);
});

$('newBookingBtn')?.addEventListener('click', async () => {
  resetBookingForm();
  showPage(pages.booking);
  try {
    await Promise.all([loadPackages(), loadOutlets()]);
  } catch (error) {
    showToast(error.message);
  }
});

$('refreshReportBtn')?.addEventListener('click', loadReport);

$('printReportBtn')?.addEventListener('click', () => {
  window.print();
});

// ======================================================
// INIT
// ======================================================

try {
  createOwnerLoginPage();
  createHomeStatusLookupBox();
  setupSuccessNavigationButtons();
  setupReportNavigationButtons();
  syncOwnerVisibility();
  setMinimumDate();
  setupOperatingHoursUI();
  updatePaymentInstruction();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'owner' || window.location.hash === '#owner') {
    openOwnerPortal();
  }
} catch (err) {
  console.error('Init error:', err);
}
