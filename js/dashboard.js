
// ======================
// LABEL FILTER
// ======================
const labelMap = {
  today: "Hari Ini",
  month: "Bulan Ini",
  all: "Semua"
}





async function loadDashboard() {
  const el = document.getElementById("dashboard")
  if (!el) return

  el.innerHTML = "Loading..."

  try {
    const filter = document.getElementById("filter")?.value || "today"
    const { start, end } = getDateRange(filter)

    // ======================
    // QUERY PENJUALAN
    // ======================
    let query = sb
      .from("penjualan")
      .select("id, subtotal, status, tanggal")

    if (start) {
      query = query.gte("tanggal", start.toISOString())
    }

    if (end) {
      query = query.lte("tanggal", end.toISOString())
    }

    const { data: penjualan, error: err1 } = await query
    if (err1) throw err1

    // ======================
    // QUERY ITEMS (OPTIONAL FILTER)
    // ======================
    let itemQuery = sb
      .from("penjualan_items")
      .select("qty, penjualan_id")

    const { data: items, error: err2 } = await itemQuery
    if (err2) throw err2

    // ======================
    // FILTER ITEMS SESUAI PENJUALAN
    // ======================
    const ids = penjualan.map(p => p.id)

    const filteredItems = items.filter(i =>
      ids.includes(i.penjualan_id)
    )

    // ======================
    // HITUNG KPI
    // ======================
    const omzet = penjualan.reduce(
      (s, i) => s + (i.subtotal || 0), 0
    )

    const totalNota = penjualan.length

    const piutang = penjualan
      .filter(i => i.status === "belum")
      .reduce((s, i) => s + (i.subtotal || 0), 0)

    const produkTerjual = filteredItems.reduce(
      (s, i) => s + (i.qty || 0), 0
    )

    // ======================
    // RENDER
    // ======================
      el.innerHTML = `
  <div class="kpi-list">

    <div class="kpi-card">
      <div class="kpi-label">Omzet</div>
      <div class="kpi-value">Rp ${omzet.toLocaleString("id-ID")}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Total Nota</div>
      <div class="kpi-value">${totalNota}</div>
    </div>

    <div class="kpi-card danger">
      <div class="kpi-label">Piutang</div>
      <div class="kpi-value">Rp ${piutang.toLocaleString("id-ID")}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">Produk Terjual</div>
      <div class="kpi-value">${produkTerjual}</div>
    </div>

  </div>
`

  } catch (err) {
    console.log("ERROR DASHBOARD:", err)
    el.innerHTML = "Error dashboard"
  }
}

//FILTER TANGGAL DASBOR
function getDateRange(type) {
  const now = new Date()

  let start = null
  let end = new Date()

  if (type === "today") {
    start = new Date()
    start.setHours(0,0,0,0)
  }

  if (type === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  return { start, end }
}