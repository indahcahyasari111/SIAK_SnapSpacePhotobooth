const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = 3000;

// ======================================================
// SUPABASE CONFIG
// ======================================================
// GANTI DUA BAGIAN DI BAWAH INI DENGAN PUNYA KAMU

const SUPABASE_URL = 'https://lbtiszzodnopmivcfqkd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rRTNMxJmclKV5ey52bcM6Q_CBzccWpe';

// ======================================================
// KONFIGURASI PHOTOBOOTH
// ======================================================

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

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
// HELPER RESPONSE
// ======================================================

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });

  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, {
    success: false,
    message
  });
}

function sendSuccess(res, data = {}) {
  sendJson(res, 200, {
    success: true,
    ...data
  });
}

// ======================================================
// DATE & TIME
// ======================================================

function getTodayJakarta() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta'
  }).format(new Date());
}

function isValidDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || '')) {
    return false;
  }

  const [year, month, day] = dateString
    .split('-')
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidTime(timeString) {
  if (!/^\d{2}:\d{2}$/.test(timeString || '')) {
    return false;
  }

  const [hour, minute] = timeString
    .split(':')
    .map(Number);

  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  );
}

function timeToMinutes(timeString) {
  const [hour, minute] = timeString
    .slice(0, 5)
    .split(':')
    .map(Number);

  return hour * 60 + minute;
}

function minutesToTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return (
    String(hour).padStart(2, '0') +
    ':' +
    String(minute).padStart(2, '0')
  );
}

// ======================================================
// VALIDATION
// ======================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[0-9+\-\s]{8,20}$/.test(phone);
}

// ======================================================
// KODE TRANSAKSI
// ======================================================

function generateBookingCode() {
  return (
    'PB-' +
    Date.now().toString().slice(-8) +
    '-' +
    crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase()
  );
}

function generateReceiptNumber() {
  return (
    'KM-' +
    Date.now().toString().slice(-8) +
    '-' +
    crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()
  );
}

// ======================================================
// SUPABASE REQUEST
// ======================================================

async function supabaseRequest(endpoint, options = {}) {

  if (
    SUPABASE_URL.includes('YOUR-PROJECT-REF') ||
    SUPABASE_PUBLISHABLE_KEY.includes('YOUR_KEY_HERE')
  ) {
    throw new Error(
      'Konfigurasi Supabase belum diisi di backend/app.js.'
    );
  }

  const headers = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization:
      `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json'
  };

  if (options.method === 'POST') {
    headers.Prefer = 'return=representation';
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${endpoint}`,
    {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    }
  );

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
      'Terjadi kesalahan pada Supabase.';

    const error = new Error(message);

    error.status = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

// ======================================================
// DATABASE - PAKET
// ======================================================

async function getPackages() {

  return await supabaseRequest(
    'paket?select=*&status_aktif=eq.true&order=harga.asc'
  );
}

async function getPackageById(idPaket) {

  const data = await supabaseRequest(
    `paket?id_paket=eq.${encodeURIComponent(idPaket)}&select=*`
  );

  return data?.[0] || null;
}

// ======================================================
// DATABASE - PELANGGAN
// ======================================================

async function getCustomerByEmail(email) {

  const data = await supabaseRequest(
    `pelanggan?email=eq.${encodeURIComponent(email)}&select=*`
  );

  return data?.[0] || null;
}

async function createCustomer(customer) {

  const data = await supabaseRequest(
    'pelanggan',
    {
      method: 'POST',
      body: JSON.stringify(customer)
    }
  );

  return data?.[0] || null;
}

async function updateCustomer(
  idPelanggan,
  customer
) {

  const data = await supabaseRequest(
    `pelanggan?id_pelanggan=eq.${encodeURIComponent(idPelanggan)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(customer)
    }
  );

  return data?.[0] || null;
}

// ======================================================
// CEK BOOKING YANG SUDAH ADA
// ======================================================

async function getBookedReservations(
  date,
  outlet
) {

  const endpoint =
    `penyewaan?` +
    `tanggal_reservasi=eq.${encodeURIComponent(date)}` +
    `&outlet=eq.${encodeURIComponent(outlet)}` +
    `&status_booking=eq.BOOKED` +
    `&select=jam_reservasi,total_harga,paket(durasi_menit),kode_booking`;

  return await supabaseRequest(endpoint);
}

// ======================================================
// CEK BENTROK WAKTU
// ======================================================

function hasTimeConflict(
  startTime,
  durationMinutes,
  existingBookings
) {

  const newStart =
    timeToMinutes(startTime);

  const newEnd =
    newStart + durationMinutes;

  return existingBookings.some(
    booking => {

      const existingStart =
        timeToMinutes(
          booking.jam_reservasi
        );

      const existingDuration =
        Number(
          booking.paket?.durasi_menit || 0
        );

      const existingEnd =
        existingStart +
        existingDuration;

      return (
        newStart < existingEnd &&
        newEnd > existingStart
      );
    }
  );
}

// ======================================================
// CREATE BOOKING
// ======================================================

async function createBooking(data) {

  const {
    name,
    phone,
    email,
    address,
    packageId,
    date,
    time,
    outlet,
    paymentMethod
  } = data;

  // -----------------------------
  // VALIDASI DATA
  // -----------------------------

  if (!name || !phone || !email) {
    throw new Error(
      'Nama, nomor HP, dan email wajib diisi.'
    );
  }

  if (!packageId) {
    throw new Error(
      'Silakan pilih paket photobooth.'
    );
  }

  if (!date || !time || !outlet) {
    throw new Error(
      'Tanggal, jam, dan outlet wajib diisi.'
    );
  }

  if (!paymentMethod) {
    throw new Error(
      'Silakan pilih metode pembayaran.'
    );
  }

  if (!isValidEmail(email)) {
    throw new Error(
      'Format email tidak valid.'
    );
  }

  if (!isValidPhone(phone)) {
    throw new Error(
      'Nomor HP tidak valid.'
    );
  }

  if (!isValidDate(date)) {
    throw new Error(
      'Format tanggal tidak valid.'
    );
  }

  if (!isValidTime(time)) {
    throw new Error(
      'Format jam harus HH:MM.'
    );
  }

  if (date < getTodayJakarta()) {
    throw new Error(
      'Tanggal reservasi tidak boleh sebelum hari ini.'
    );
  }

  if (!OUTLETS.includes(outlet)) {
    throw new Error(
      'Outlet tidak tersedia.'
    );
  }

  if (
    !ALLOWED_PAYMENT_METHODS.includes(
      paymentMethod
    )
  ) {
    throw new Error(
      'Metode pembayaran tidak tersedia.'
    );
  }

  // -----------------------------
  // AMBIL PAKET
  // -----------------------------

  const packageData =
    await getPackageById(packageId);

  if (!packageData) {
    throw new Error(
      'Paket photobooth tidak ditemukan.'
    );
  }

  if (!packageData.status_aktif) {
    throw new Error(
      'Paket sedang tidak tersedia.'
    );
  }

  const duration =
    Number(packageData.durasi_menit);

  // -----------------------------
  // HITUNG JAM SELESAI
  // -----------------------------

  const startMinutes =
    timeToMinutes(time);

  const endMinutes =
    startMinutes + duration;

  if (endMinutes > 1440) {
    throw new Error(
      `Jam ${time} terlalu malam untuk paket ini.`
    );
  }

  // -----------------------------
  // CEK BENTROK
  // -----------------------------

  const existingBookings =
    await getBookedReservations(
      date,
      outlet
    );

  if (
    hasTimeConflict(
      time,
      duration,
      existingBookings
    )
  ) {
    throw new Error(
      'Jam tersebut bentrok dengan booking lain di outlet yang dipilih. Silakan pilih jam lain.'
    );
  }

  // -----------------------------
  // SIMPAN PELANGGAN
  // -----------------------------

  let customer =
    await getCustomerByEmail(email);

  if (customer) {

    customer =
      await updateCustomer(
        customer.id_pelanggan,
        {
          nama_pelanggan: name,
          no_hp: phone,
          email,
          alamat: address || null
        }
      );

  } else {

    customer =
      await createCustomer({
        nama_pelanggan: name,
        no_hp: phone,
        email,
        alamat: address || null
      });
  }

  if (!customer) {
    throw new Error(
      'Data pelanggan gagal disimpan.'
    );
  }

  // -----------------------------
  // SIMPAN PENYEWAAN
  // -----------------------------

  const bookingCode =
    generateBookingCode();

  const bookingData = {

    kode_booking:
      bookingCode,

    id_pelanggan:
      customer.id_pelanggan,

    id_paket:
      packageData.id_paket,

    tanggal_reservasi:
      date,

    jam_reservasi:
      `${time}:00`,

    outlet:
      outlet,

    total_harga:
      packageData.harga,

    status_booking:
      'BOOKED',

    catatan:
      null
  };

  let booking = null;

  try {

    const bookingResult =
      await supabaseRequest(
        'penyewaan',
        {
          method: 'POST',
          body:
            JSON.stringify(bookingData)
        }
      );

    booking =
      bookingResult?.[0];

    if (!booking) {
      throw new Error(
        'Data penyewaan gagal disimpan.'
      );
    }

    // -----------------------------
    // SIMPAN PENERIMAAN KAS
    // -----------------------------

    const receiptData = {

      no_bukti:
        generateReceiptNumber(),

      id_penyewaan:
        booking.id_penyewaan,

      metode_pembayaran:
        paymentMethod,

      jumlah_diterima:
        packageData.harga,

      keterangan:
        `Pembayaran booking ${bookingCode}`
    };

    const receiptResult =
      await supabaseRequest(
        'penerimaan_kas',
        {
          method: 'POST',
          body:
            JSON.stringify(receiptData)
        }
      );

    const receipt =
      receiptResult?.[0];

    if (!receipt) {
      throw new Error(
        'Data penerimaan kas gagal disimpan.'
      );
    }

    return {

      booking,

      customer,

      package:
        packageData,

      receipt,

      payment: {
        method:
          paymentMethod,

        amount:
          packageData.harga
      },

      schedule: {
        start:
          time,

        end:
          minutesToTime(endMinutes),

        duration
      }
    };

  } catch (error) {

    // Kalau penerimaan gagal,
    // booking juga dibersihkan.

    if (booking?.id_penyewaan) {

      try {

        await supabaseRequest(
          `penyewaan?id_penyewaan=eq.${encodeURIComponent(
            booking.id_penyewaan
          )}`,
          {
            method: 'DELETE'
          }
        );

      } catch {}
    }

    throw error;
  }
}

// ======================================================
// LAPORAN PENERIMAAN KAS
// ======================================================

async function getCashReport() {

  const endpoint =
    `penerimaan_kas?` +
    `select=` +
    `id_penerimaan,no_bukti,tanggal_bayar,metode_pembayaran,jumlah_diterima,keterangan,` +
    `penyewaan(` +
    `kode_booking,tanggal_reservasi,jam_reservasi,outlet,` +
    `paket(nama_paket,durasi_menit),` +
    `pelanggan(nama_pelanggan,email)` +
    `)` +
    `&order=tanggal_bayar.desc`;

  const rows =
    await supabaseRequest(endpoint);

  const transactions =
    rows || [];

  const totalCash =
    transactions.reduce(
      (sum, item) =>
        sum +
        Number(
          item.jumlah_diterima || 0
        ),
      0
    );

  const totalQRIS =
    transactions
      .filter(
        item =>
          item.metode_pembayaran ===
          'QRIS'
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.jumlah_diterima || 0
          ),
        0
      );

  const totalMBanking =
    transactions
      .filter(
        item =>
          item.metode_pembayaran ===
          'M-BANKING'
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.jumlah_diterima || 0
          ),
        0
      );

  return {

    totalTransactions:
      transactions.length,

    totalCash,

    totalQRIS,

    totalMBanking,

    transactions
  };
}

// ======================================================
// BACA BODY REQUEST
// ======================================================

function readRequestBody(req) {

  return new Promise(
    (resolve, reject) => {

      let body = '';

      req.on(
        'data',
        chunk => {

          body +=
            chunk.toString();

          if (
            body.length >
            1000000
          ) {
            reject(
              new Error(
                'Request terlalu besar.'
              )
            );

            req.destroy();
          }
        }
      );

      req.on(
        'end',
        () => {

          if (!body) {
            resolve({});
            return;
          }

          try {

            resolve(
              JSON.parse(body)
            );

          } catch {

            reject(
              new Error(
                'Format JSON tidak valid.'
              )
            );
          }
        }
      );

      req.on(
        'error',
        reject
      );
    }
  );
}

// ======================================================
// STATIC FILE
// ======================================================

const MIME_TYPES = {

  '.html':
    'text/html; charset=utf-8',

  '.css':
    'text/css; charset=utf-8',

  '.js':
    'application/javascript; charset=utf-8',

  '.json':
    'application/json; charset=utf-8',

  '.png':
    'image/png',

  '.jpg':
    'image/jpeg',

  '.jpeg':
    'image/jpeg',

  '.svg':
    'image/svg+xml',

  '.ico':
    'image/x-icon'
};

function serveStaticFile(
  req,
  res,
  pathname
) {

  let filePath;

  if (pathname === '/') {

    filePath =
      path.join(
        FRONTEND_DIR,
        'index.html'
      );

  } else {

    const cleanPath =
      decodeURIComponent(
        pathname
      ).replace(/^\/+/, '');

    filePath =
      path.join(
        FRONTEND_DIR,
        cleanPath
      );
  }

  const normalizedPath =
    path.normalize(filePath);

  if (
    !normalizedPath.startsWith(
      path.normalize(
        FRONTEND_DIR
      )
    )
  ) {

    sendError(
      res,
      403,
      'Akses file tidak diizinkan.'
    );

    return;
  }

  fs.stat(
    normalizedPath,
    (error, stats) => {

      if (
        error ||
        !stats.isFile()
      ) {

        sendError(
          res,
          404,
          'File tidak ditemukan.'
        );

        return;
      }

      const extension =
        path.extname(
          normalizedPath
        ).toLowerCase();

      const contentType =
        MIME_TYPES[extension] ||
        'application/octet-stream';

      res.writeHead(
        200,
        {
          'Content-Type':
            contentType
        }
      );

      fs
        .createReadStream(
          normalizedPath
        )
        .pipe(res);
    }
  );
}

// ======================================================
// SERVER
// ======================================================

const server =
  http.createServer(
    async (req, res) => {

      try {

        const requestUrl =
          new URL(
            req.url,
            `http://${
              req.headers.host ||
              'localhost'
            }`
          );

        const pathname =
          requestUrl.pathname;

        // -----------------------------
        // OPTIONS
        // -----------------------------

        if (
          req.method ===
          'OPTIONS'
        ) {

          res.writeHead(
            204,
            {
              'Access-Control-Allow-Origin':
                '*',

              'Access-Control-Allow-Methods':
                'GET, POST, PATCH, DELETE, OPTIONS',

              'Access-Control-Allow-Headers':
                'Content-Type'
            }
          );

          res.end();

          return;
        }

        // -----------------------------
        // HEALTH CHECK
        // -----------------------------

        if (
          req.method === 'GET' &&
          pathname === '/api/health'
        ) {

          sendSuccess(
            res,
            {
              message:
                'Sistem Informasi Akuntansi Photobooth aktif.',

              serverTime:
                new Date().toISOString()
            }
          );

          return;
        }

        // -----------------------------
        // OUTLETS
        // -----------------------------

        if (
          req.method === 'GET' &&
          pathname === '/api/outlets'
        ) {

          sendSuccess(
            res,
            {
              outlets:
                OUTLETS
            }
          );

          return;
        }

        // -----------------------------
        // PACKAGES
        // -----------------------------

        if (
          req.method === 'GET' &&
          pathname === '/api/packages'
        ) {

          sendSuccess(
            res,
            {
              packages:
                await getPackages()
            }
          );

          return;
        }

        // -----------------------------
        // AVAILABILITY
        // -----------------------------

        if (
          req.method === 'GET' &&
          pathname ===
            '/api/availability'
        ) {

          const date =
            requestUrl.searchParams
              .get('date');

          const outlet =
            requestUrl.searchParams
              .get('outlet');

          if (!date || !outlet) {

            sendError(
              res,
              400,
              'Tanggal dan outlet wajib diisi.'
            );

            return;
          }

          if (!isValidDate(date)) {

            sendError(
              res,
              400,
              'Format tanggal tidak valid.'
            );

            return;
          }

          if (
            !OUTLETS.includes(
              outlet
            )
          ) {

            sendError(
              res,
              400,
              'Outlet tidak tersedia.'
            );

            return;
          }

          const bookings =
            await getBookedReservations(
              date,
              outlet
            );

          sendSuccess(
            res,
            {
              date,
              outlet,

              bookings:
                bookings.map(
                  booking => {

                    const duration =
                      Number(
                        booking.paket
                          ?.durasi_menit ||
                        0
                      );

                    const start =
                      booking.jam_reservasi
                        .slice(0, 5);

                    const end =
                      minutesToTime(
                        timeToMinutes(
                          start
                        ) + duration
                      );

                    return {
                      start,
                      duration,
                      end
                    };
                  }
                )
            }
          );

          return;
        }

        // -----------------------------
        // GET BOOKING BY CODE
        // -----------------------------

        if (
          req.method === 'GET' &&
          pathname === '/api/bookings'
        ) {

          const code =
            requestUrl.searchParams
              .get('code');

          if (!code) {

            sendError(
              res,
              400,
              'Kode booking wajib diisi.'
            );

            return;
          }

          const endpoint =
            `penyewaan?` +
            `kode_booking=eq.${encodeURIComponent(code)}` +
            `&select=*,pelanggan(*),paket(*),penerimaan_kas(*)`;

          const bookings =
            await supabaseRequest(
              endpoint
            );

          if (!bookings?.length) {

            sendError(
              res,
              404,
              'Booking tidak ditemukan.'
            );

            return;
          }

          sendSuccess(
            res,
            {
              booking:
                bookings[0]
            }
          );

          return;
        }

        // -----------------------------
        // CASH REPORT
        // -----------------------------

        if (
          req.method === 'GET' &&
          pathname ===
            '/api/reports/cash'
        ) {

          sendSuccess(
            res,
            {
              report:
                await getCashReport()
            }
          );

          return;
        }

        // -----------------------------
        // CREATE BOOKING
        // -----------------------------

        if (
          req.method === 'POST' &&
          pathname === '/api/bookings'
        ) {

          const body =
            await readRequestBody(
              req
            );

          sendSuccess(
            res,
            await createBooking(body)
          );

          return;
        }

        // -----------------------------
        // FRONTEND
        // -----------------------------

        if (
          req.method === 'GET' &&
          !pathname.startsWith('/api/')
        ) {

          serveStaticFile(
            req,
            res,
            pathname
          );

          return;
        }

        sendError(
          res,
          404,
          'Endpoint tidak ditemukan.'
        );

      } catch (error) {

        console.error(
          'SERVER ERROR:',
          error
        );

        sendError(
          res,
          error.status || 500,
          error.message ||
            'Terjadi kesalahan pada server.'
        );
      }
    }
  );

// ======================================================
// START SERVER
// ======================================================

server.listen(
  PORT,
  () => {

    console.log('');
    console.log(
      '=========================================='
    );

    console.log(
      '      SIA PHOTOBOOTH - SERVER AKTIF'
    );

    console.log(
      '=========================================='
    );

    console.log(
      `Buka: http://localhost:${PORT}`
    );

    console.log(
      'Tekan CTRL + C untuk menghentikan server.'
    );

    console.log(
      '=========================================='
    );

    console.log('');
  }
);