const state = {
  packages: [],
  selectedPackage: null,
  outlets: [],
  lastBooking: null
};


// ======================================================
// HELPER
// ======================================================

const $ = (id) =>
  document.getElementById(id);


const pages = {

  home:
    $('homePage'),

  booking:
    $('bookingPage'),

  success:
    $('successPage'),

  report:
    $('reportPage')

};


// ======================================================
// NAVIGASI HALAMAN
// ======================================================

function showPage(page) {

  Object.values(pages)
    .forEach(
      p =>
        p.classList.remove(
          'active'
        )
    );

  page.classList.add(
    'active'
  );

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


// ======================================================
// FORMAT RUPIAH
// ======================================================

function formatRupiah(value) {

  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}


// ======================================================
// FORMAT TANGGAL
// ======================================================

function formatDate(dateString) {

  if (!dateString) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }
  ).format(
    new Date(
      `${dateString}T00:00:00`
    )
  );
}


// ======================================================
// TIME
// ======================================================

function timeToMinutes(time) {

  const [
    hour,
    minute
  ] =
    time
      .slice(0, 5)
      .split(':')
      .map(Number);

  return (
    hour * 60 +
    minute
  );
}


function minutesToTime(
  totalMinutes
) {

  const hour =
    Math.floor(
      totalMinutes / 60
    );

  const minute =
    totalMinutes % 60;

  return (
    String(hour)
      .padStart(2, '0') +
    ':' +
    String(minute)
      .padStart(2, '0')
  );
}


// ======================================================
// TOAST
// ======================================================

function showToast(message) {

  const toast =
    $('toast');

  toast.textContent =
    message;

  toast.classList.add(
    'show'
  );

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(
      () => {

        toast.classList.remove(
          'show'
        );

      },
      3500
    );
}


// ======================================================
// API
// ======================================================

async function api(
  url,
  options = {}
) {

  const response =
    await fetch(
      url,
      options
    );

  const data =
    await response
      .json()
      .catch(
        () => ({
          success: false,
          message:
            'Response server tidak valid.'
        })
      );

  if (
    !response.ok ||
    !data.success
  ) {

    throw new Error(
      data.message ||
      'Terjadi kesalahan.'
    );
  }

  return data;
}


// ======================================================
// MINIMUM DATE
// ======================================================

function setMinimumDate() {

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      today.getDate()
    ).padStart(2, '0');

  $('date').min =
    `${year}-${month}-${day}`;
}


// ======================================================
// LOAD PAKET
// ======================================================

async function loadPackages() {

  const data =
    await api(
      '/api/packages'
    );

  state.packages =
    data.packages;

  renderPackages();
}


// ======================================================
// RENDER PAKET
// ======================================================

function renderPackages() {

  const container =
    $('packageList');

  if (
    !state.packages.length
  ) {

    container.innerHTML =
      `
      <div class="loading">
        Belum ada paket aktif.
      </div>
      `;

    return;
  }


  container.innerHTML =
    state.packages
      .map(
        pkg => `

        <label
          class="package-card
          ${
            state.selectedPackage?.id_paket ===
            pkg.id_paket
              ? 'selected'
              : ''
          }"
        >

          <input
            type="radio"
            name="package"
            value="${pkg.id_paket}"

            ${
              state.selectedPackage?.id_paket ===
              pkg.id_paket
                ? 'checked'
                : ''
            }
          >

          <div class="package-name">
            ${escapeHtml(
              pkg.nama_paket
            )}
          </div>

          <div class="package-desc">
            ${escapeHtml(
              pkg.deskripsi || ''
            )}
          </div>

          <div class="package-meta">

            <span class="package-duration">
              ${pkg.durasi_menit}
              menit
            </span>

            <span class="package-price">
              ${formatRupiah(
                pkg.harga
              )}
            </span>

          </div>

        </label>

        `
      )
      .join('');


  container
    .querySelectorAll(
      'input[name="package"]'
    )
    .forEach(
      input => {

        input.addEventListener(
          'change',
          () => {

            state.selectedPackage =
              state.packages.find(
                pkg =>
                  String(
                    pkg.id_paket
                  ) ===
                  input.value
              );

            renderPackages();

            updateSummary();

            checkAvailability();

          }
        );

      }
    );
}


// ======================================================
// LOAD OUTLET
// ======================================================

async function loadOutlets() {

  const data =
    await api(
      '/api/outlets'
    );

  state.outlets =
    data.outlets;

  $('outlet').innerHTML =
    `
    <option value="">
      Pilih outlet
    </option>

    ${
      state.outlets
        .map(
          outlet =>
            `
            <option
              value="${escapeHtml(
                outlet
              )}"
            >
              ${escapeHtml(
                outlet
              )}
            </option>
            `
        )
        .join('')
    }
    `;
}


// ======================================================
// UPDATE SUMMARY
// ======================================================

function updateSummary() {

  const pkg =
    state.selectedPackage;

  const date =
    $('date').value;

  const time =
    $('time').value;

  const outlet =
    $('outlet').value;


  $('summaryPackage')
    .textContent =
    pkg?.nama_paket ||
    'Pilih paket';


  $('summaryDuration')
    .textContent =
    pkg
      ? `${pkg.durasi_menit} menit`
      : '—';


  $('summaryDate')
    .textContent =
    date
      ? formatDate(date)
      : '—';


  if (
    time &&
    pkg
  ) {

    const end =
      minutesToTime(
        timeToMinutes(time) +
        Number(
          pkg.durasi_menit
        )
      );

    $('summaryTime')
      .textContent =
      `${time} – ${end}`;

  } else {

    $('summaryTime')
      .textContent =
      time || '—';
  }


  $('summaryOutlet')
    .textContent =
    outlet || '—';


  $('summaryPrice')
    .textContent =
    pkg
      ? formatRupiah(
          pkg.harga
        )
      : 'Rp0';
}


// ======================================================
// CEK KETERSEDIAAN
// ======================================================

async function checkAvailability() {

  const date =
    $('date').value;

  const outlet =
    $('outlet').value;

  const time =
    $('time').value;

  const box =
    $('availabilityBox');


  if (
    !date ||
    !outlet
  ) {

    box.className =
      'availability-box';

    box.textContent =
      'Pilih tanggal dan outlet untuk mengecek jadwal.';

    return;
  }


  try {

    const data =
      await api(
        `/api/availability?date=${
          encodeURIComponent(date)
        }&outlet=${
          encodeURIComponent(outlet)
        }`
      );


    if (
      !time ||
      !state.selectedPackage
    ) {

      box.className =
        'availability-box';

      box.textContent =
        `Terdapat ${
          data.bookings.length
        } booking pada tanggal tersebut di ${outlet}. Masukkan jam untuk mengecek bentrok.`;

      return;
    }


    const start =
      timeToMinutes(
        time
      );

    const duration =
      Number(
        state.selectedPackage
          .durasi_menit
      );

    const end =
      start + duration;


    if (
      end > 1440
    ) {

      box.className =
        'availability-box bad';

      box.textContent =
        'Jam selesai melewati pukul 24:00. Pilih jam mulai yang lebih awal.';

      return;
    }


    const conflict =
      data.bookings.find(
        booking => {

          const existingStart =
            timeToMinutes(
              booking.start
            );

          const existingEnd =
            timeToMinutes(
              booking.end
            );

          return (
            start <
              existingEnd &&
            end >
              existingStart
          );
        }
      );


    if (conflict) {

      box.className =
        'availability-box bad';

      box.textContent =
        `Bentrok dengan booking ${
          conflict.start
        }–${
          conflict.end
        }. Silakan pilih jam lain.`;

    } else {

      box.className =
        'availability-box ok';

      box.textContent =
        `Jadwal tersedia: ${
          time
        }–${
          minutesToTime(end)
        } (${
          state.selectedPackage
            .durasi_menit
        } menit).`;
    }


  } catch (error) {

    box.className =
      'availability-box bad';

    box.textContent =
      error.message;
  }
}


// ======================================================
// SUBMIT BOOKING
// ======================================================

async function submitBooking(
  event
) {

  event.preventDefault();


  if (
    !state.selectedPackage
  ) {

    showToast(
      'Pilih paket terlebih dahulu.'
    );

    return;
  }


  const payment =
    document.querySelector(
      'input[name="payment"]:checked'
    );


  const payload = {

    name:
      $('name')
        .value
        .trim(),

    phone:
      $('phone')
        .value
        .trim(),

    email:
      $('email')
        .value
        .trim(),

    address:
      $('address')
        .value
        .trim(),

    packageId:
      Number(
        state.selectedPackage
          .id_paket
      ),

    date:
      $('date').value,

    time:
      $('time').value,

    outlet:
      $('outlet').value,

    paymentMethod:
      payment?.value || ''
  };


  const submitButton =
    document.querySelector(
      '.submit-btn'
    );


  submitButton.disabled =
    true;

  submitButton.textContent =
    'Saving...';


  try {

    const data =
      await api(
        '/api/bookings',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );


    state.lastBooking =
      data;

    fillSuccess(
      data
    );

    showPage(
      pages.success
    );

    showToast(
      'Booking berhasil disimpan ke database.'
    );


  } catch (error) {

    showToast(
      error.message
    );

  } finally {

    submitButton.disabled =
      false;

    submitButton.textContent =
      'Confirm Booking →';
  }
}


// ======================================================
// SUCCESS PAGE
// ======================================================

function fillSuccess(data) {

  $('successCode')
    .textContent =
    data.booking
      .kode_booking;


  $('successName')
    .textContent =
    data.customer
      .nama_pelanggan;


  $('successPackage')
    .textContent =
    data.package
      .nama_paket;


  $('successDate')
    .textContent =
    formatDate(
      data.booking
        .tanggal_reservasi
    );


  $('successTime')
    .textContent =
    `${data.schedule.start} – ${
      data.schedule.end
    }`;


  $('successOutlet')
    .textContent =
    data.booking
      .outlet;


  $('successPayment')
    .textContent =
    data.payment.method ===
    'M-BANKING'
      ? 'M-Banking'
      : 'QRIS';


  $('successAmount')
    .textContent =
    formatRupiah(
      data.payment.amount
    );
}


// ======================================================
// RESET FORM
// ======================================================

function resetBookingForm() {

  $('bookingForm')
    .reset();

  state.selectedPackage =
    null;

  renderPackages();

  updateSummary();


  $('availabilityBox')
    .className =
    'availability-box';


  $('availabilityBox')
    .textContent =
    'Pilih tanggal dan outlet untuk mengecek jadwal.';


  setMinimumDate();
}


// ======================================================
// LOAD REPORT
// ======================================================

async function loadReport() {

  $('reportStatus')
    .textContent =
    'Memuat...';


  try {

    const data =
      await api(
        '/api/reports/cash'
      );

    const report =
      data.report;


    $('totalTransactions')
      .textContent =
      report.totalTransactions;


    $('totalCash')
      .textContent =
      formatRupiah(
        report.totalCash
      );


    $('totalQRIS')
      .textContent =
      formatRupiah(
        report.totalQRIS
      );


    $('totalMBanking')
      .textContent =
      formatRupiah(
        report.totalMBanking
      );


    renderReportTable(
      report.transactions
    );


    $('reportStatus')
      .textContent =
      `${report.totalTransactions} transaksi`;


  } catch (error) {

    $('reportStatus')
      .textContent =
      'Gagal memuat laporan.';

    showToast(
      error.message
    );
  }
}


// ======================================================
// RENDER REPORT TABLE
// ======================================================

function renderReportTable(
  rows
) {

  const body =
    $('reportTableBody');


  if (!rows.length) {

    body.innerHTML =
      `
      <tr>

        <td
          colspan="8"
          class="empty-table"
        >

          Belum ada transaksi.
          Buat booking terlebih dahulu.

        </td>

      </tr>
      `;

    return;
  }


  body.innerHTML =
    rows
      .map(
        row => {

          const booking =
            row.penyewaan ||
            {};

          const customer =
            booking.pelanggan ||
            {};

          const pkg =
            booking.paket ||
            {};


          const reservationDate =
            booking.tanggal_reservasi
              ? formatDate(
                  booking.tanggal_reservasi
                )
              : '—';


          const reservationTime =
            booking.jam_reservasi
              ? booking
                  .jam_reservasi
                  .slice(0, 5)
              : '—';


          return `

          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  row.no_bukti
                )}
              </strong>
            </td>


            <td>
              ${formatDateTime(
                row.tanggal_bayar
              )}
            </td>


            <td>
              ${escapeHtml(
                customer
                  .nama_pelanggan ||
                '—'
              )}
            </td>


            <td>
              ${escapeHtml(
                pkg.nama_paket ||
                '—'
              )}
            </td>


            <td>
              ${reservationDate}
              <br>
              ${reservationTime}
            </td>


            <td>
              ${escapeHtml(
                booking.outlet ||
                '—'
              )}
            </td>


            <td>
              ${escapeHtml(
                row.metode_pembayaran
              )}
            </td>


            <td>
              <strong>
                ${formatRupiah(
                  row.jumlah_diterima
                )}
              </strong>
            </td>

          </tr>

          `;
        }
      )
      .join('');
}


// ======================================================
// FORMAT TANGGAL + JAM
// ======================================================

function formatDateTime(
  value
) {

  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(date);
}


// ======================================================
// SECURITY HTML
// ======================================================

function escapeHtml(value) {

  return String(
    value ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );
}


// ======================================================
// EVENT
// ======================================================

$('startBookingBtn')
  .addEventListener(
    'click',
    async () => {

      showPage(
        pages.booking
      );

      try {

        await Promise.all([
          loadPackages(),
          loadOutlets()
        ]);

      } catch (error) {

        showToast(
          error.message
        );
      }
    }
  );


$('navReportBtn')
  .addEventListener(
    'click',
    async () => {

      showPage(
        pages.report
      );

      await loadReport();
    }
  );


$('backHomeBtn')
  .addEventListener(
    'click',
    () => {

      showPage(
        pages.home
      );
    }
  );


$('bookingForm')
  .addEventListener(
    'submit',
    submitBooking
  );


$('date')
  .addEventListener(
    'change',
    () => {

      updateSummary();
      checkAvailability();

    }
  );


$('time')
  .addEventListener(
    'input',
    () => {

      updateSummary();
      checkAvailability();

    }
  );


$('outlet')
  .addEventListener(
    'change',
    () => {

      updateSummary();
      checkAvailability();

    }
  );


$('successReportBtn')
  .addEventListener(
    'click',
    async () => {

      showPage(
        pages.report
      );

      await loadReport();
    }
  );


$('newBookingBtn')
  .addEventListener(
    'click',
    async () => {

      resetBookingForm();

      showPage(
        pages.booking
      );

      try {

        await Promise.all([
          loadPackages(),
          loadOutlets()
        ]);

      } catch (error) {

        showToast(
          error.message
        );
      }
    }
  );


$('refreshReportBtn')
  .addEventListener(
    'click',
    loadReport
  );


$('printReportBtn')
  .addEventListener(
    'click',
    () => {

      window.print();

    }
  );


// ======================================================
// INIT
// ======================================================

setMinimumDate();
