async function loadPenjualan() {
  // ======================
  // 1. AMBIL ELEMENT (ANTI NULL)
  // ======================
  let el = document.getElementById("list")

  let retry = 0
  while (!el && retry < 10) {
    await new Promise(r => setTimeout(r, 50))
    el = document.getElementById("list")
    retry++
  }

  if (!el) {
    console.log("❌ #list tidak ditemukan")
    return
  }

  el.innerHTML = "Loading..."

  try {
    // ======================
    // 2. QUERY DATA
    // ======================
    const { data, error } = await sb
      .from("penjualan")
      .select(`
        id,
        no_ref,
        subtotal,
        pembayaran,
        created_at,

        customers!penjualan_customer_id_fkey (
          nama
        ),

        penjualan_items (
          qty,
          harga,
          produk ( nama )
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // ======================
    // 3. HANDLE KOSONG
    // ======================
    if (!data || data.length === 0) {
      el.innerHTML = "Belum ada data"
      return
    }

    // ======================
    // 4. RENDER UI
    // ======================
    const html = data.map(trx => {
      const items = trx.penjualan_items || []
      const preview = items.slice(0, 2)

      return `
      <div class="card" onclick="openDetail('${trx.id}')">

        <div class="card-top">
          <div class="name">${trx.customers?.nama || '-'}</div>

          <div class="badge ${trx.pembayaran || 'cash'}">
            ${trx.pembayaran || 'cash'}
          </div>
        </div>

        <div class="card-sub">
          ${trx.no_ref || '-'} • ${formatTanggal(trx.created_at)}
        </div>

        ${preview.map(i => `
          <div class="item">
            <div>${i.produk?.nama || '-'} x${i.qty}</div>
            <div>Rp ${formatRupiah(i.qty * i.harga)}</div>
          </div>
        `).join("")}

        ${
          items.length > 2
            ? `<div class="more">+${items.length - 2} item lainnya</div>`
            : ""
        }

        <div class="card-footer">
          <div class="total-wrap">
            <div class="total">
              Rp ${formatRupiah(trx.subtotal || 0)}
            </div>
            <div class="chevron">›</div>
          </div>
        </div>

      </div>
      `
    }).join("")

    el.innerHTML = html

  } catch (err) {
    console.log("ERROR:", err)
    el.innerHTML = "Error load data"
  }
}

// ======================
// FORMAT
// ======================
function formatRupiah(n){
  return "Rp " + (n || 0).toLocaleString("id-ID")
}

function formatTanggal(t){
  if (!t) return "-"
  return new Date(t).toLocaleDateString("id-ID")
}

// ======================
// LOAD DETAIL
// ======================


