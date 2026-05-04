let items = []
let produkList = []
let selectedCustomerId = null
let customerList = []

/* ======================
   LOAD PRODUK
====================== */
async function loadProduk() {
  const { data, error } = await sb.from('produk').select('*')
  if (error) {
    console.log(error)
    return
  }
  produkList = data || []
}

/* ======================
   TAMBAH ITEM
====================== */
function addItem() {
  items.push({
    produk_id: '',
    nama: '',
    qty: 1,
    harga: 0
  })
  renderItems()
}

/* ======================
   RENDER ITEM
====================== */
function renderItems() {
  const el = document.getElementById('items')
  el.innerHTML = ''

  items.forEach((it, i) => {
    el.innerHTML += `
      <div class="card">

        <div class="autocomplete">
          <input 
            type="text"
            placeholder="Cari produk..."
            value="${it.nama || ''}"
            oninput="searchProduk(${i}, this.value)"
          />
          <div id="dropdown-${i}" class="dropdown"></div>
        </div>

        <div style="display:flex; gap:8px; margin-top:6px;">

          <input 
            type="number"
            value="${it.qty}"
            oninput="updateQty(${i}, this.value)"
            style="flex:1;"
          >

          <input 
            id="harga-${i}"
            type="text"
            value="${formatAngka(it.harga)}"
            oninput="updateHarga(${i}, this.value)"
            style="flex:1;"
          >

        </div>

        <div id="subtotal-${i}" style="margin-top:6px; font-weight:600;">
          Rp ${(it.qty * it.harga).toLocaleString('id-ID')}
        </div>

        <button onclick="removeItem(${i})">Hapus</button>

      </div>
    `
  })

  hitungTotal()
}

/* ======================
   SEARCH PRODUK
====================== */
let timer

function searchProduk(i, keyword) {
  clearTimeout(timer)

  timer = setTimeout(() => {
    const el = document.getElementById(`dropdown-${i}`)

    if (!keyword) {
      el.innerHTML = ''
      return
    }

    const list = produkList
      .filter(p => p.nama.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, 5)

    el.innerHTML = list.map(p => `
      <div class="option" onclick="selectProduk(${i}, '${p.id}')">
        ${p.nama}
      </div>
    `).join('')
  }, 200)
}

/* ======================
   PILIH PRODUK
====================== */
function selectProduk(i, id) {
  const p = produkList.find(x => x.id == id)
  if (!p) return

  items[i].produk_id = id
  items[i].nama = p.nama

  renderItems()
}

/* ======================
   UPDATE QTY
====================== */
function updateQty(i, val) {
  items[i].qty = parseInt(val) || 0
  updateSubtotal(i)
  hitungTotal()
}

/* ======================
   UPDATE HARGA (NO RENDER)
====================== */
function updateHarga(i, val) {
  const angka = parseInt(val.replace(/\D/g, '')) || 0
  items[i].harga = angka

  const input = document.getElementById(`harga-${i}`)
  if (input) {
    input.value = formatAngka(angka)
  }

  updateSubtotal(i)
  hitungTotal()
}

/* ======================
   UPDATE SUBTOTAL
====================== */
function updateSubtotal(i) {
  const el = document.getElementById(`subtotal-${i}`)
  if (!el) return

  el.innerText =
    'Rp ' + (items[i].qty * items[i].harga).toLocaleString('id-ID')
}

/* ======================
   FORMAT ANGKA
====================== */
function formatAngka(angka) {
  if (!angka) return ''
  return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/* ======================
   TOTAL
====================== */
function hitungTotal() {
  const total = items.reduce((s, i) => s + i.qty * i.harga, 0)
  document.getElementById('total').innerText =
    'Rp ' + total.toLocaleString('id-ID')
}

/* ======================
   HAPUS ITEM
====================== */
function removeItem(i) {
  items.splice(i, 1)
  renderItems()
}

/* ======================
   SIMPAN
====================== */
async function simpan() {
  const customerEl = document.getElementById('customer')
  const telpEl = document.getElementById('telp')
  const alamatEl = document.getElementById('alamat')

  const customer = (customerEl?.value || '').trim()
  const pembayaran = document.getElementById("pembayaran")?.value || "cash"

  // ======================
  // AUTO MATCH CUSTOMER
  // ======================
  if (!selectedCustomerId && customer) {
    const found = customerList.find(
      c => (c.nama || "").toLowerCase() === customer.toLowerCase()
    )

    if (found) {
      selectedCustomerId = found.id

      if (telpEl) {
        telpEl.value = found.telp && found.telp !== "null" ? found.telp : ""
      }

      if (alamatEl) {
        alamatEl.value = found.alamat && found.alamat !== "null" ? found.alamat : ""
      }
    }
  }

  // ======================
  // VALIDASI
  // ======================
  if (!customer) {
    alert('Customer kosong')
    return
  }

  if (!selectedCustomerId) {
    alert('Customer tidak ditemukan, pilih dari dropdown')
    return
  }

  if (!items || !items.length) {
    alert('Item kosong')
    return
  }

  for (let it of items) {
    if (!it.produk_id) {
      alert('Produk belum dipilih')
      return
    }
    if (!it.qty || it.qty <= 0) {
      alert('Qty tidak valid')
      return
    }
  }

  // ======================
  // HITUNG TOTAL
  // ======================
  const total = items.reduce((s, i) => s + (i.qty * i.harga), 0)

  // ======================
  // CEK MODE
  // ======================
  const isEdit = !!window.editId
  let penjualanId = window.editId

  // ======================
  // HEADER (INSERT / UPDATE)
  // ======================
  if (isEdit) {
    // 🔥 UPDATE
    const { error } = await sb
      .from('penjualan')
      .update({
        tanggal: new Date().toISOString(),
        customer_id: selectedCustomerId,
        customer: customer,
        pembayaran: pembayaran,
        status: pembayaran === "tempo" ? "belum" : "lunas",
        subtotal: total
      })
      .eq("id", penjualanId)

    if (error) {
      console.log("ERROR UPDATE:", error)
      alert("Gagal update")
      return
    }

    // 🔥 HAPUS DETAIL LAMA
    await sb
      .from('penjualan_items')
      .delete()
      .eq("penjualan_id", penjualanId)

  } else {
    // 🔥 INSERT BARU
    let noRef = ''
    try {
      noRef = await getNoRef()
    } catch (e) {
      alert('Gagal generate nomor')
      return
    }

    const { data, error } = await sb
      .from('penjualan')
      .insert([{
        no_ref: noRef,
        tanggal: new Date().toISOString(),
        customer_id: selectedCustomerId,
        customer: customer,
        pembayaran: pembayaran,
        status: pembayaran === "tempo" ? "belum" : "lunas",
        subtotal: total
      }])
      .select()
      .single()

    if (error || !data) {
      console.log('ERROR INSERT HEADER:', error)
      alert('Gagal simpan')
      return
    }

    penjualanId = data.id
  }

  // ======================
  // INSERT DETAIL BARU
  // ======================
  const detail = items.map(it => ({
    penjualan_id: penjualanId,
    produk_id: it.produk_id,
    qty: it.qty,
    harga: it.harga
  }))

  const { error: errDetail } = await sb
    .from('penjualan_items')
    .insert(detail)

  if (errDetail) {
    console.log('ERROR DETAIL:', errDetail)
    alert('Gagal simpan detail')
    return
  }

  // ======================
  // RESET
  // ======================
  items = []
  renderItems()

  selectedCustomerId = null
  window.editId = null

  if (customerEl) customerEl.value = ''
  if (telpEl) telpEl.value = ''
  if (alamatEl) alamatEl.value = ''

  const totalEl = document.getElementById('total')
  if (totalEl) totalEl.innerText = 'Rp 0'

  alert(isEdit ? "Berhasil update" : "Berhasil simpan")

  go('penjualan.html', 'Penjualan')
}
// NO REF
// ambil no_ref dari Supabase RPC (generate_no_ref)
async function getNoRef() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `INV-${y}${m}`

  const { data, error } = await sb.rpc('generate_no_ref', { p_prefix: prefix })
  if (error) {
    console.log('ERROR NO REF:', error)
    throw new Error('Gagal generate nomor')
  }
  return data // contoh: INV-202605-001
}

// isi field header (no_ref + tanggal)
function initFormHeader(noRef) {
  const noRefEl = document.getElementById('no_ref')
  const tglEl = document.getElementById('tanggal')

  if (noRefEl) noRefEl.value = noRef

  const now = new Date()
  const tgl = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  if (tglEl) tglEl.value = tgl
}

//lCUSTOMER BASE


async function loadCustomer() {
  const { data, error } = await sb
    .from("customers")
    .select("*")
    .order("nama", { ascending: true })

  if (error) {
    console.log("ERROR CUSTOMER:", error)
    return
  }

  customerList = data || []
  console.log("CUSTOMER LOADED:", customerList) // 🔥 cek ini muncul
}
function searchCustomer(keyword = "") {
  const el = document.getElementById("customerDropdown")

  if (!el) {
    console.log("DROPDOWN TIDAK ADA")
    return
  }

  if (!customerList.length) {
    console.log("CUSTOMER LIST KOSONG")
    return
  }

  let list = customerList

  if (keyword) {
    list = list.filter(c =>
      (c.nama || "").toLowerCase().includes(keyword.toLowerCase())
    )
  }

  list = list.slice(0, 3)

  if (!list.length && keyword) {
    el.innerHTML = `
      <div class="option" onclick="tambahCustomer('${keyword}')">
        + Tambah "${keyword}"
      </div>
    `
    return
  }

  el.innerHTML = list.map(c => `
    <div class="option" onclick="selectCustomer('${c.nama}','${c.telp}','${c.alamat}')">
      ${c.nama}
    </div>
  `).join("")
}

function selectCustomer(nama, telpVal, alamatVal) {
  document.getElementById("customer").value = nama
  document.getElementById("telp").value = telpVal || ""
  document.getElementById("alamat").value = alamatVal || ""

  document.getElementById("customerDropdown").innerHTML = ""
}

async function tambahCustomer(nama) {
  const telp = prompt("No Telp:")
  const alamat = prompt("Alamat:")

  const { data, error } = await sb
    .from("customers") // ✅ FIX
    .insert([{
      nama,
      telp: telp || "",
      alamat: alamat || ""
    }])
    .select()
    .single()

  if (error) {
    console.log(error)
    alert("Gagal tambah customer")
    return
  }

  customerList.push(data)

  selectCustomer(data.nama, data.telp, data.alamat)
}
//EDIT PENJUALAN
async function loadEditPenjualan(id) {
  console.log("EDIT MODE:", id)

  // ===== HEADER
  const { data: header, error: e1 } = await sb
    .from("penjualan")
    .select(`
      id,
      no_ref,
      tanggal,
      pembayaran,
      customer_id,
      customers!penjualan_customer_id_fkey (nama, telp, alamat)
    `)
    .eq("id", id)
    .single()

  if (e1 || !header) {
    console.log("ERROR HEADER:", e1)
    alert("Gagal load data")
    return
  }

  // ===== ITEMS
  const { data: rows, error: e2 } = await sb
    .from("penjualan_items")
    .select(`
      produk_id,
      qty,
      harga,
      produk (nama)
    `)
    .eq("penjualan_id", id)

  if (e2) {
    console.log("ERROR ITEMS:", e2)
    alert("Gagal load item")
    return
  }

  // ===== SET HEADER UI
  document.getElementById("no_ref").value = header.no_ref || ""
  document.getElementById("tanggal").value =
    new Date(header.tanggal).toLocaleDateString("id-ID")

  // customer
  selectedCustomerId = header.customer_id || null
  document.getElementById("customer").value =
    header.customers?.nama || ""

  document.getElementById("telp").value =
    header.customers?.telp || ""

  document.getElementById("alamat").value =
    header.customers?.alamat || ""

  // pembayaran
  const bayarEl = document.getElementById("pembayaran")
  if (bayarEl) bayarEl.value = header.pembayaran || "cash"

  // ===== SET ITEMS
  items = (rows || []).map(r => ({
    produk_id: r.produk_id,
    nama: r.produk?.nama || "",
    qty: r.qty,
    harga: r.harga
  }))

  renderItems()
}