// app.js — frontend (works with the backend endpoints)
const API = {
  customers: '/api/customers',
  services: '/api/services',
  appointments: '/api/appointments'
};

function $id(id){ return document.getElementById(id); }
function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

async function fetchJSON(url, opts){
  const res = await fetch(url, opts);
  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`${res.status} ${res.statusText} ${txt}`);
  }
  return res.status === 204 ? null : res.json();
}

/* --------- Customers --------- */
async function loadCustomers(){
  try {
    const list = await fetchJSON(API.customers);
    const wrap = $id('customers-list');
    if (!list.length) { wrap.innerHTML = '<em>No customers yet</em>'; return; }

    let html = '<table class="table"><thead><tr><th>Name</th><th>Phone</th><th></th></tr></thead><tbody>';
    for (const c of list) {
      html += `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.phone||'')}</td><td><button class="btn del-cust" data-id="${c.id}">Delete</button></td></tr>`;
    }
    html += '</tbody></table>';
    wrap.innerHTML = html;
    qsa('.del-cust', wrap).forEach(b=>b.addEventListener('click', async ()=>{
      if (!confirm('Delete customer?')) return;
      await fetchJSON(API.customers + '/' + b.dataset.id, { method:'DELETE' });
      await populateSelects();
      await loadCustomers();
    }));
  } catch (err) {
    $id('customers-list').innerHTML = `<pre>Error: ${err.message}</pre>`;
  }
}

async function submitCustomer(ev){
  ev.preventDefault();
  const f = ev.currentTarget;
  const name = f.name.value.trim();
  const phone = f.phone.value.trim();
  if (!name) return alert('Name required');
  await fetchJSON(API.customers, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, phone }) });
  f.reset();
  await populateSelects();
  await loadCustomers();
}

/* --------- Services --------- */
async function loadServices(){
  try {
    const list = await fetchJSON(API.services);
    const wrap = $id('services-list');
    if (!list.length) { wrap.innerHTML = '<em>No services yet</em>'; return; }

    let html = '<table class="table"><thead><tr><th>Title</th><th>Duration</th><th>Price</th><th></th></tr></thead><tbody>';
    for (const s of list) {
      html += `<tr><td>${escapeHtml(s.title)}</td><td>${escapeHtml(s.duration)}</td><td>€ ${Number(s.price||0).toFixed(2)}</td><td><button class="btn del-svc" data-id="${s.id}">Delete</button></td></tr>`;
    }
    html += '</tbody></table>';
    wrap.innerHTML = html;
    qsa('.del-svc', wrap).forEach(b=>b.addEventListener('click', async ()=>{
      if (!confirm('Delete service?')) return;
      await fetchJSON(API.services + '/' + b.dataset.id, { method:'DELETE' });
      await populateSelects();
      await loadServices();
    }));
  } catch (err) {
    $id('services-list').innerHTML = `<pre>Error: ${err.message}</pre>`;
  }
}

async function submitService(ev){
  ev.preventDefault();
  const f = ev.currentTarget;
  const title = f.title.value.trim();
  const duration = Number(f.duration.value) || 30;
  const price = Number(f.price.value) || 0;
  if (!title) return alert('Title required');
  await fetchJSON(API.services, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, duration, price }) });
  f.reset();
  await populateSelects();
  await loadServices();
}

/* --------- Appointments --------- */
async function populateSelects(){
  const customers = await fetchJSON(API.customers);
  const services = await fetchJSON(API.services);
  const custSel = document.querySelector('select[name="customerId"]');
  const svcSel = document.querySelector('select[name="serviceId"]');
  custSel.innerHTML = '<option value="">-- select customer --</option>' + customers.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  svcSel.innerHTML = '<option value="">-- select service --</option>' + services.map(s=>`<option value="${s.id}">${escapeHtml(s.title)}</option>`).join('');
}

async function loadAppointments(filterDate = null){
  try {
    const list = await fetchJSON(API.appointments);
    const wrap = $id('appointments-list');
    if (!list.length) { wrap.innerHTML = '<em>No appointments</em>'; return; }

    // group by date
    const grouped = list.reduce((acc, a)=>{
      const date = (a.date || (a.datetime ? a.datetime.slice(0,10) : '')).slice(0,10);
      if (!date) return acc;
      (acc[date] = acc[date]||[]).push(a);
      return acc;
    }, {});
    const dates = Object.keys(grouped).sort((a,b)=>b.localeCompare(a));
    let html = '';
    for (const d of dates) {
      if (filterDate && filterDate !== d) continue;
      html += `<h4 style="margin-bottom:8px">${d}</h4><table class="table"><thead><tr><th>Customer</th><th>Service</th><th>Time</th><th>Notes</th><th></th></tr></thead><tbody>`;
      for (const a of grouped[d]) {
        const cust = await (async ()=>{ try{ const c = await fetchJSON(API.customers + '/' + a.customerId); return c.name||'-'; }catch{return '-'} })();
        const svc = await (async ()=>{ try{ const s = await fetchJSON(API.services + '/' + a.serviceId); return s.title||'-'; }catch{return '-'} })();
        const time = a.time || (a.datetime ? (new Date(a.datetime)).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '');
        html += `<tr><td>${escapeHtml(cust)}</td><td>${escapeHtml(svc)}</td><td>${escapeHtml(time)}</td><td>${escapeHtml(a.notes||'')}</td><td><button class="btn del-appt" data-id="${a.id}">Cancel</button></td></tr>`;
      }
      html += '</tbody></table>';
    }
    wrap.innerHTML = html || '<em>No appointments for selected date</em>';

    qsa('.del-appt', wrap).forEach(b=>b.addEventListener('click', async ()=>{
      if (!confirm('Cancel appointment?')) return;
      await fetchJSON(API.appointments + '/' + b.dataset.id, { method:'DELETE' });
      await loadAppointments(document.getElementById('filter-date').value || null);
    }));
  } catch (err) {
    $id('appointments-list').innerHTML = `<pre>Error: ${err.message}</pre>`;
  }
}

async function submitAppointment(ev){
  ev.preventDefault();
  const f = ev.currentTarget;
  const customerId = f.customerId.value;
  const serviceId = f.serviceId.value;
  const date = f.date.value;
  const time = f.time.value;
  if (!customerId || !serviceId || !date || !time) return alert('All fields required');
  const datetime = new Date(date + 'T' + time).toISOString();
  await fetchJSON(API.appointments, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ customerId, serviceId, datetime, date, time, notes:'' }) });
  f.reset();
  await loadAppointments();
}

/* ---------- init ---------- */
function bindUI(){
  document.getElementById('customer-form').addEventListener('submit', submitCustomer);
  document.getElementById('service-form').addEventListener('submit', submitService);
  document.getElementById('appointment-form').addEventListener('submit', submitAppointment);
  document.getElementById('btn-filter').addEventListener('click', ()=>loadAppointments(document.getElementById('filter-date').value || null));
  document.getElementById('btn-showall').addEventListener('click', ()=>{ document.getElementById('filter-date').value = ''; loadAppointments(); });
}

async function init(){
  bindUI();
  await populateSelects();
  await loadCustomers();
  await loadServices();
  await loadAppointments();
}

init().catch(err=>console.error('Init error', err));
