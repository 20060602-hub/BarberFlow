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