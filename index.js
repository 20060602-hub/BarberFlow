// index.js
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db_json');
const { ensureDataDir } = require('./db_json'); // <--- ADD THIS LINE

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

/* ---------- Customers ---------- */
// ... (Your original customer routes here)

app.get('/api/customers', async (req, res) => {
  try {
    const rows = await db.list('customers');
    rows.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});
// ... (rest of customer routes)

app.get('/api/customers/:id', async (req, res) => {
  try {
    const row = await db.getById('customers', req.params.id);
    if (!row) return res.status(404).json({ error: 'Customer not found' });
    res.json(row);
  } catch(e){ res.status(500).json({ error: e.message }); }
});
// ... (rest of index.js, including Services and Appointments)

/* ---------- Server ---------- */
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  // Call ensureDataDir before starting the server
  ensureDataDir().then(() => {
    app.listen(PORT, () => console.log(`Server (JSON) listening on ${PORT}`));
  }).catch(err => {
    console.error("Fatal Error during setup:", err);
    process.exit(1);
  });
}
module.exports = app;