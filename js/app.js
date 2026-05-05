// INIT SUPABASE (GLOBAL)
window.sb = window.supabase.createClient(
  "https://eodcoukggohlduxnbwac.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvZGNvdWtnZ29obGR1eG5id2FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDQ1NDYsImV4cCI6MjA5MzQ4MDU0Nn0.w2OSaZyI56dUQR32bsIUZ_3OKS-LOFEZr8KiHKvnAR0"
);

// ======================
// ROUTER
// ======================
async function loadPage(page) {
  const app = document.getElementById("app")

  try {
    const res = await fetch(`pages/${page}`)
    const html = await res.text()

    app.innerHTML = html

    // 🔥 TUNGGU DOM RENDER (lebih aman dari setTimeout random)
    await new Promise(r => setTimeout(r, 50))

    // ======================
    // DASHBOARD
    // ======================
    if (page === "dashboard.html") {
      if (typeof loadDashboard === "function") {
        loadDashboard()
      }
    }

    // ======================
// PENJUALAN LIST
// ======================
if (page === "penjualan.html") {
  setTimeout(() => {
    if (typeof loadPenjualan === "function") {
      loadPenjualan()
    }
  }, 50)
}

// ======================
// DETAIL PENJUALAN
// ======================
if (page === "detail.html") {
  setTimeout(() => {
    if (typeof loadDetail === "function") {
      loadDetail()
    }
  }, 50)
}
//INVOICE
if (page === "invoice.html") {
  setTimeout(() => {
    if (typeof loadInvoice === "function") {
      loadInvoice()
    }
  }, 50)
}






// ======================
// FORM PENJUALAN
// ======================
if (page === "form-penjualan.html") {

  // 🔥 tunggu DOM benar-benar siap
  await new Promise(r => setTimeout(r, 50))

  // ======================
  // LOAD MASTER
  // ======================
  if (typeof loadProduk === "function") {
    await loadProduk()
    await loadCustomer()
  }

  // ======================
  // RESET STATE
  // ======================
  if (typeof items !== "undefined") items = []

  // ======================
  // MODE EDIT / CREATE
  // ======================
  if (window.editId && typeof loadEditPenjualan === "function") {

    await loadEditPenjualan(window.editId)

  } else {

    if (typeof addItem === "function") addItem()

    if (typeof getNoRef === "function") {
      const noRef = await getNoRef()
      const noRefEl = document.getElementById("no_ref")
      if (noRefEl) noRefEl.value = noRef
    }

    // 🔥 FORMAT TANGGAL BENAR
    const tglEl = document.getElementById("tanggal")
    if (tglEl) {
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, "0")
      const dd = String(now.getDate()).padStart(2, "0")
      tglEl.value = `${yyyy}-${mm}-${dd}`
    }
  }
}

    

  } catch (err) {
    console.log("ERROR LOAD PAGE:", err)
    app.innerHTML = "Gagal load halaman"
  }
}

// ======================
// GLOBAL NAV
// ======================
window.go = function (page, title) {
  document.getElementById("title").innerText = title
  loadPage(page)
}

// ======================
// INIT
// ======================
window.onload = () => {
  go("dashboard.html", "Dashboard")
}

