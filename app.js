/* Aplikasi Kasir PRO - frontend logic
Swal.fire({
title:'Metode Kredit', html:`<input id='c_ang' class='swal2-input' type='number' placeholder='Angsuran per bulan'>
<input id='c_bln' class='swal2-input' type='number' placeholder='Lama bulan'>`, preConfirm: ()=>({angs: Number(document.getElementById('c_ang').value)||0, bln: Number(document.getElementById('c_bln').value)||0})
}).then(res=>{
if(res.isConfirmed){ finalizePayment(total, metode, 0, null, res.value); }
});
return;
}


finalizePayment(total, metode, uang, null);
}


function finalizePayment(total, metode, uang, buktiBase64=null, kreditInfo=null){
const invoice = 'INV-'+Date.now();
const kembalian = (metode==='cash')? (uang - total) : 0;


// kurangi stok
keranjang.forEach(item=>{
const p = produk.find(x=>x.id===item.id);
if(p) p.stok -= item.qty;
});
saveProdukLocal(); renderProdukTable();


// kirim tiap item ke Sheets (POST)
keranjang.forEach(item=>{
const payload = { nama:item.nama, harga:item.harga, qty:item.qty, subtotal:item.subtotal, total:total, uang:uang, kembalian:kembalian, invoice:invoice, metode:metode, bukti:buktiBase64 || '', kredit: kreditInfo || null };
if(API_URL && API_URL!=='PASTE_WEB_APP_URL_ANDA'){
fetch(API_URL, { method:'POST', body: JSON.stringify(payload) })
.catch(e=>console.warn('Gagal kirim ke Sheets', e));
} else {
// fallback: simpan di localStorage sebagai "TransaksiLocal"
const logs = JSON.parse(localStorage.getItem('kasir_transaksi')||'[]'); logs.push(Object.assign({tanggal: new Date().toISOString()}, payload)); localStorage.setItem('kasir_transaksi', JSON.stringify(logs));
}
});


// tampilkan struk
let html = `<div><strong>Invoice: ${invoice}</strong><br><small>${new Date().toLocaleString()}</small><hr>`;
keranjang.forEach(it=>{ html += `<div>${it.nama} (${it.qty} x Rp ${fmt(it.harga)}) = Rp ${fmt(it.subtotal)}</div>` });
html += `<hr><div><strong>Total: Rp ${fmt(total)}</strong></div>`;
if(metode==='cash') html += `<div>Uang: Rp ${fmt(uang)} - Kembalian: Rp ${fmt(kembalian)}</div>`;
html += `<div>Metode: ${metode}</div></div>`;


document.getElementById('strukContent').innerHTML = html;
document.getElementById('strukCard').classList.remove('d-none');


// clear keranjang
keranjang = []; renderKeranjang(); document.getElementById('uang').value='';
Swal.fire('Sukses','Transaksi berhasil disimpan','success');
renderChart();
}


function printStruk(){ window.print(); }


// --- EXPORT CSV ---
function exportCSV(){
const html = document.getElementById('strukContent').innerText;
const blob = new Blob([html], { type: 'text/csv' });
const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'struk.csv'; a.click(); URL.revokeObjectURL(url);
}


// --- SYNC PRODUK KE SHEETS (opsional) ---
function syncToSheets(){
if(!(API_URL && API_URL!=='PASTE_WEB_APP_URL_ANDA')){ Swal.fire('Gagal','Set API_URL terlebih dahulu untuk sync ke Sheets','error'); return; }
// kirim produk sebagai POST khusus (opsional implementasi server-side harus menampung)
fetch(API_URL, { method:'POST', body: JSON.stringify({type:'sync_products', products: produk}) })
.then(()=>Swal.fire('Sukses','Produk akan disinkronkan (tergantung Apps Script)','success'))
.catch(()=>Swal.fire('Gagal','Terjadi error saat sync','error'));
}


// --- CHART ---
function renderChart(){
// ambil transaksi dari local atau dari Sheets (sederhana: gunakan local)
const logs = JSON.parse(localStorage.getItem('kasir_transaksi')||'[]');
// aggregate per hari
const map = {};
logs.forEach(l=>{ const d = new Date(l.tanggal).toLocaleDateString(); map[d] = (map[d]||0) + (Number(l.total)||0); });
const labels = Object.keys(map).slice(-7);
const data = labels.map(ld=>map[ld]);
const ctx = document.getElementById('chartSales');
if(!ctx) return;
if(window._chart) window._chart.destroy();
window._chart = new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label:'Pendapatan', data }] }, options:{ responsive:true } });
document.getElementById('totalPendapatan').innerText = fmt(Object.values(map).reduce((a,b)=>a+b,0));
}


// init
window.addEventListener('load', ()=>{
initApp();
});
