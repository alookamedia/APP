async function loadDetail() {
  const id = window.selectedId
  console.log("DETAIL ID:", id)

  if (!id) {
    console.log("❌ ID kosong")
    return
  }

  // ======================
  // ELEMENT
  // ======================
  const noRefEl = document.getElementById("d_no_ref")
  const custEl = document.getElementById("d_customer")
  const tglEl = document.getElementById("d_tanggal")
  const itemsEl = document.getElementById("d_items")
  const totalEl = document.getElementById("d_total")
  const bayarEl = document.getElementById("d_pembayaran")

  if (!noRefEl) {
    console.log("❌ DOM belum siap")
    return
  }

  // ======================
  // LOADING STATE
  // ======================
  noRefEl.innerText = "Loading..."
  custEl.innerText = ""
  tglEl.innerText = ""
  itemsEl.innerHTML = "Loading..."
  totalEl.innerText = "Rp 0"
  if (bayarEl) bayarEl.innerHTML = ""

  try {
    // ======================
    // QUERY HEADER
    // ======================
    const { data: header, error: err1 } = await sb
      .from("penjualan")
      .select(`
        id,
        no_ref,
        tanggal,
        subtotal,
        pembayaran,
        status,
        customers!penjualan_customer_id_fkey (nama)
      `)
      .eq("id", id)
      .maybeSingle()

    if (err1) {
      console.log("ERROR HEADER:", err1)
      return
    }

    if (!header) {
      console.log("DATA TIDAK ADA:", id)
      itemsEl.innerHTML = "Data tidak ditemukan"
      return
    }

    // ======================
    // QUERY ITEMS
    // ======================
    const { data: items, error: err2 } = await sb
      .from("penjualan_items")
      .select(`
        qty,
        harga,
        produk ( nama )
      `)
      .eq("penjualan_id", id)

    if (err2) {
      console.log("ERROR ITEMS:", err2)
      itemsEl.innerHTML = "Error load items"
      return
    }

    // ======================
    // RENDER HEADER
    // ======================
    noRefEl.innerText = header.no_ref || "-"
    custEl.innerText = header.customers?.nama || "-"
    tglEl.innerText = formatTanggal(header.tanggal)

    // ======================
    // 🔥 RENDER PEMBAYARAN (SUDAH FIX POSISI)
    // ======================
    if (bayarEl) {
      bayarEl.innerHTML = `
        <span class="badge ${header.pembayaran || 'cash'}">
          ${header.pembayaran || 'cash'}
        </span>
        <span style="margin-left:6px; font-size:12px;">
          ${header.status === "belum" ? "Belum Bayar" : "Lunas"}
        </span>
      `
    }

    // ======================
    // RENDER ITEMS
    // ======================
    if (!items || items.length === 0) {
      itemsEl.innerHTML = "Tidak ada item"
    } else {
      itemsEl.innerHTML = items.map(it => `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <div>${it.produk?.nama || '-'} x${it.qty}</div>
          <div>Rp ${formatRupiah(it.qty * it.harga)}</div>
        </div>
      `).join("")
    }

    // ======================
    // TOTAL
    // ======================
    totalEl.innerText = "Rp " + formatRupiah(header.subtotal || 0)

  } catch (err) {
    console.log("ERROR DETAIL:", err)
    itemsEl.innerHTML = "Error load detail"
  }
}


// ======================
// NAV
// ======================
function openDetail(id){
  window.selectedId = id
  go("detail.html","Detail")
}

function backToList(){
  window.selectedId = null
  go("penjualan.html","Penjualan")
}

function editTransaksi() {
  const id = window.selectedId
  if (!id) return

  window.editId = id
  go("form-penjualan.html", "Edit Penjualan")
}

async function hapusTransaksi() {
  const id = window.selectedId
  if (!id) return

  if (!confirm("Yakin hapus transaksi ini?")) return

  try {
    // hapus detail dulu
    await sb.from("penjualan_items").delete().eq("penjualan_id", id)

    // hapus header
    await sb.from("penjualan").delete().eq("id", id)

    alert("Berhasil dihapus")

    go("penjualan.html", "Penjualan")
  } catch (err) {
    console.log(err)
    alert("Gagal hapus")
  }
}


//INVOICE
function downloadInvoice(){
  const id = window.selectedId
  if (!id) return

  window.invoiceId = id
  go("invoice.html", "Invoice")
}