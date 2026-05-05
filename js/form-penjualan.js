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
  // ======================
  // ELEMENT
  // ======================
  const tanggalInput = document.getElementById("tanggal")?.value
  const customerEl = document.getElementById('customer')
  const telpEl = document.getElementById('telp')
  const alamatEl = document.getElementById('alamat')

  const customer = (customerEl?.value || '').trim()
  const pembayaran = document.getElementById("pembayaran")?.value || "cash"

  // ======================
  // FIX TANGGAL (FINAL)
  // ======================
  const tanggalFinal = tanggalInput
    ? new Date(tanggalInput).toISOString()
    : new Date().toISOString()

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
        telpEl.value =
          found.telp && found.telp !== "null" ? found.telp : ""
      }

      if (alamatEl) {
        alamatEl.value =
          found.alamat && found.alamat !== "null" ? found.alamat : ""
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
  // TOTAL
  // ======================
  const total = items.reduce((s, i) => s + (i.qty * i.harga), 0)

  // ======================
  // MODE
  // ======================
  const isEdit = !!window.editId
  let penjualanId = window.editId

  // ======================
  // HEADER (UPDATE / INSERT)
  // ======================
  if (isEdit) {
    // UPDATE
    const { error } = await sb
      .from('penjualan')
      .update({
        tanggal: tanggalFinal,
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

    // HAPUS DETAIL LAMA
    await sb
      .from('penjualan_items')
      .delete()
      .eq("penjualan_id", penjualanId)

  } else {
    // INSERT BARU
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
        tanggal: tanggalFinal,
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
  // DETAIL
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
function initFormHeader(noRef, tanggalEdit = null) {
  const noRefEl = document.getElementById('no_ref')
  const tglEl = document.getElementById('tanggal')

  if (noRefEl) noRefEl.value = noRef

  if (!tglEl) return

  // 🔥 kalau edit → pakai tanggal lama
  if (tanggalEdit) {
    const d = new Date(tanggalEdit)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')

    tglEl.value = `${yyyy}-${mm}-${dd}`
    return
  }

  // 🔥 kalau create → default hari ini
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')

  tglEl.value = `${yyyy}-${mm}-${dd}`
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

  if (!id) {
    console.log("❌ ID kosong")
    return
  }

  // ======================
  // TUNGGU DOM SIAP (ANTI NULL)
  // ======================
  let retry = 0
  let ready = document.getElementById("no_ref")

  while (!ready && retry < 10) {
    await new Promise(r => setTimeout(r, 50))
    ready = document.getElementById("no_ref")
    retry++
  }

  if (!ready) {
    console.log("❌ FORM BELUM RENDER")
    return
  }

  try {
    // ======================
    // AMBIL HEADER
    // ======================
    const { data: header, error } = await sb
      .from("penjualan")
      .select(`
        id,
        no_ref,
        tanggal,
        pembayaran,
        customer,
        customer_id,
        customers!penjualan_customer_id_fkey (nama, telp, alamat)
      `)
      .eq("id", id)
      .single()

    if (error || !header) {
      console.log("ERROR HEADER:", error)
      alert("Gagal load data")
      return
    }

    // ======================
    // AMBIL ITEMS
    // ======================
    const { data: detail } = await sb
      .from("penjualan_items")
      .select(`
        produk_id,
        qty,
        harga,
        produk ( nama )
      `)
      .eq("penjualan_id", id)

    // ======================
    // SET GLOBAL EDIT
    // ======================
    window.editId = id
    selectedCustomerId = header.customer_id

    // ======================
    // FILL HEADER FORM
    // ======================
    const noRefEl = document.getElementById("no_ref")
    const tglEl = document.getElementById("tanggal")
    const custEl = document.getElementById("customer")
    const telpEl = document.getElementById("telp")
    const alamatEl = document.getElementById("alamat")
    const bayarEl = document.getElementById("pembayaran")

    if (noRefEl) noRefEl.value = header.no_ref || ""

    // 🔥 FORMAT DATE UNTUK INPUT DATE
    if (tglEl && header.tanggal) {
      const d = new Date(header.tanggal)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, "0")
      const dd = String(d.getDate()).padStart(2, "0")
      tglEl.value = `${yyyy}-${mm}-${dd}`
    }

    if (custEl) custEl.value = header.customers?.nama || header.customer || ""
    if (telpEl) telpEl.value = header.customers?.telp || ""
    if (alamatEl) alamatEl.value = header.customers?.alamat || ""

    if (bayarEl) bayarEl.value = header.pembayaran || "cash"

    // ======================
    // FILL ITEMS
    // ======================
    items = []

    if (detail && detail.length > 0) {
      items = detail.map(d => ({
        produk_id: d.produk_id,
        nama: d.produk?.nama || "-",
        qty: d.qty,
        harga: d.harga
      }))
    }

    renderItems()

    // ======================
    // HITUNG TOTAL
    // ======================
    const total = items.reduce((s, i) => s + (i.qty * i.harga), 0)
    const totalEl = document.getElementById("total")
    if (totalEl) totalEl.innerText = "Rp " + total.toLocaleString("id-ID")

  } catch (err) {
    console.log("ERROR LOAD EDIT:", err)
    alert("Gagal load edit")
  }
}
