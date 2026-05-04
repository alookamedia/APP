async function loadInvoice() {
  const id = window.invoiceId
  if (!id) return

  // ======================
  // HEADER
  // ======================
  const { data: header } = await sb
    .from("penjualan")
    .select(`
      no_ref,
      tanggal,
      subtotal,
      pembayaran,
      customers!penjualan_customer_id_fkey (nama, alamat)
    `)
    .eq("id", id)
    .single()

  // ======================
  // ITEMS
  // ======================
  const { data: items } = await sb
    .from("penjualan_items")
    .select(`
      qty,
      harga,
      produk ( nama )
    `)
    .eq("penjualan_id", id)

  // ======================
  // RENDER HEADER
  // ======================
  document.getElementById("inv_no").innerText = header.no_ref
  document.getElementById("inv_customer").innerText = header.customers?.nama || "-"
  document.getElementById("inv_alamat").innerText = header.customers?.alamat || "-"
  document.getElementById("inv_tanggal").innerText =
    new Date(header.tanggal).toLocaleDateString("id-ID")

  // ======================
  // TABLE
  // ======================
  const tbody = document.getElementById("inv_items")

  let subtotal = 0

  tbody.innerHTML = items.map(it => {
    const total = it.qty * it.harga
    subtotal += total

    return `
      <tr>
        <td>${it.produk?.nama || "-"}</td>
        <td class="right">Rp ${it.harga.toLocaleString("id-ID")}</td>
        <td class="right">${it.qty}</td>
        <td class="right">Rp ${total.toLocaleString("id-ID")}</td>
      </tr>
    `
  }).join("")

  // ======================
  // TOTAL
  // ======================
  document.getElementById("inv_subtotal").innerText =
    "Rp " + subtotal.toLocaleString("id-ID")

  document.getElementById("inv_sisa").innerText =
    "Rp " + subtotal.toLocaleString("id-ID")
}