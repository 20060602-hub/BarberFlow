// index.js
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db_json');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

/* ---------- Customers ---------- */
app.get('/api/customers', async (req, res) => {
  try {
    const rows = await db.list('customers');
    rows.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const row = await db.getById('customers', req.params.id);
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    res.json(row);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const customer = await db.create('customers', { name, phone: phone||null, email: email||null });
    res.status(201).json(customer);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const updated = await db.update('customers', req.params.id, { name, phone, email });
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.remove('customers', req.params.id);
    // cascade-delete appointments referencing this customer
    const appts = await db.list('appointments');
    const remaining = appts.filter(a => String(a.customer_id) !== String(req.params.id));
    await db.writeRaw('appointments', remaining);
    res.json({ success: true });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

/* ---------- Services ---------- */
app.get('/api/services', async (req, res) => {
  try {
    const rows = await db.list('services');
    rows.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    res.json(rows);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.get('/api/services/:id', async (req, res) => {
  try {
    const row = await db.getById('services', req.params.id);
    if (!row) return res.status(404).json({ error: 'Service not found' });
    res.json(row);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.post('/api/services', async (req, res) => {
  try {
    const { title, duration_min, price } = req.body;
    if (!title || !duration_min || price == null) return res.status(400).json({ error: 'Missing fields' });
    const service = await db.create('services', { title, duration_min, price });
    res.status(201).json(service);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.put('/api/services/:id', async (req, res) => {
  try {
    const { title, duration_min, price } = req.body;
    const updated = await db.update('services', req.params.id, { title, duration_min, price });
    if (!updated) return res.status(404).json({ error: 'Service not found' });
    res.json(updated);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.delete('/api/services/:id', async (req, res) => {
  try {
    await db.remove('services', req.params.id);
    // cascade-delete appointments referencing this service
    const appts = await db.list('appointments');
    const remaining = appts.filter(a => String(a.service_id) !== String(req.params.id));
    await db.writeRaw('appointments', remaining);
    res.json({ success: true });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

/* ---------- Appointments ---------- */
function isValidDate(str) {
  // simple YYYY-MM-DD check
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}
function isValidTime(str) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(str);
}

app.get('/api/appointments', async (req, res) => {
  try {
    const { date, customerId } = req.query;
    let rows = await db.list('appointments');
    const customers = await db.list('customers');
    const services = await db.list('services');

    if (date) rows = rows.filter(r => r.appointment_date === date);
    if (customerId) rows = rows.filter(r => String(r.customer_id) === String(customerId));

    rows = rows.map(a => {
      const customer = customers.find(c => String(c.id) === String(a.customer_id)) || {};
      const service = services.find(s => String(s.id) === String(a.service_id)) || {};
      return {
        ...a,
        customer_name: customer.name || null,
        service_title: service.title || null,
        duration_min: service.duration_min || null
      };
    });

    rows.sort((a,b) => (a.appointment_date + ' ' + a.start_time).localeCompare(b.appointment_date + ' ' + b.start_time));
    res.json(rows);
  } catch(e){ res.status(500).json({ error: e.message }); }
});


app.get('/api/appointments/:id', async (req, res) => {
  try {
    const row = await db.getById('appointments', req.params.id);
    if (!row) return res.status(404).json({ error: 'Appointment not found' });
    res.json(row);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { customerId, serviceId, appointment_date, start_time } = req.body;
    if (!customerId || !serviceId || !appointment_date || !start_time)
      return res.status(400).json({ error: 'Missing fields' });
    if (!isValidDate(appointment_date)) return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    if (!isValidTime(start_time)) return res.status(400).json({ error: 'Invalid time format (HH:MM)' });

    const cust = await db.getById('customers', customerId);
    const serv = await db.getById('services', serviceId);
    if (!cust) return res.status(400).json({ error: 'Customer not found' });
    if (!serv) return res.status(400).json({ error: 'Service not found' });

    // conflict check: same date & start_time (single-barber assumption)
    const appts = await db.list('appointments');
    const conflict = appts.find(a => a.appointment_date === appointment_date && a.start_time === start_time);
    if (conflict) return res.status(409).json({ error: 'Time slot already taken' });

    const appointment = await db.create('appointments', {
      customer_id: customerId,
      service_id: serviceId,
      appointment_date,
      start_time,
      status: 'booked'
    });
    res.status(201).json(appointment);
  } catch(e){ res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', async (req, res) => {
  try {
    const { customerId, serviceId, appointment_date, start_time, status } = req.body;
    const row = await db.getById('appointments', req.params.id);
    if (!row) return res.status(404).json({ error: 'Appointment not found' });

    if ((appointment_date && appointment_date !== row.appointment_date) || (start_time && start_time !== row.start_time)) {
      const all = await db.list('appointments');
      const conflict = all.find(a => a.id !== row.id && a.appointment_date === (appointment_date||row.appointment_date) && a.start_time === (start_time||row.start_time));
      if (conflict) return res.status(409).json({ error: 'Time slot already taken' });
    }

    const updated = await db.update('appointments', req.params.id, {
      customer_id: customerId || row.customer_id,
      service_id: serviceId || row.service_id,
      appointment_date: appointment_date || row.appointment_date,
      start_time: start_time || row.start_time,
      status: status || row.status
    });
    res.json(updated);
  } catch(e){ res.status(500).json({ error: e.message }); }
});