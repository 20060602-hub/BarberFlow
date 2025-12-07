// index.js - BarberFlow backend (full CRUD)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db_json');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Helper to validate id
function isValidId(id) {
  return id !== undefined && id !== null && String(id).length > 0;
}

function mapRoutes(resource) {
  const base = `/api/${resource}`;

  // list
  app.get(base, async (req, res) => {
    try {
      const items = await db.list(resource);
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // get by id
  app.get(`${base}/:id`, async (req, res) => {
    try {
      const item = await db.getById(resource, req.params.id);
      if (!item) return res.status(404).json({ error: `${resource.slice(0,-1)} not found` });
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // create
  app.post(base, async (req, res) => {
    try {
      const created = await db.create(resource, req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // update
  app.put(`${base}/:id`, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const updated = await db.update(resource, req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      if (/not found/i.test(err.message)) return res.status(404).json({ error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // delete
  app.delete(`${base}/:id`, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const result = await db.remove(resource, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// Create routes for the three collections
['customers', 'services', 'appointments'].forEach(mapRoutes);

// Serve index
app.get('/', (req, res) => res.sendFile('index.html', { root: 'public' }));

const PORT = process.env.PORT || 3000;
db.ensureDataDir()
  .then(() => {
    app.listen(PORT, () => console.log(`BarberFlow listening on ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to prepare data folder:', err);
    process.exit(1);
  });

module.exports = app;
