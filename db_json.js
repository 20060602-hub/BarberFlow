// db_json.js
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, 'data');

async function readRaw(name) {
  const p = path.join(dataDir, `${name}.json`);
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}