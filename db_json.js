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

// atomic write: write to temp then rename
async function writeRaw(name, data) {
  const p = path.join(dataDir, `${name}.json`);
  const temp = p + '.tmp';
  await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(temp, p);
  return true;
}

async function list(name) {
  return await readRaw(name);
}

async function getById(name, id) {
  const arr = await readRaw(name);
  return arr.find(x => String(x.id) === String(id));
}

async function create(name, obj) {
  const arr = await readRaw(name);
  const id = uuidv4();
  const now = new Date().toISOString();
  const item = { id, ...obj, created_at: now };
  arr.push(item);
  await writeRaw(name, arr);
  return item;
}

async function update(name, id, patch) {
  const arr = await readRaw(name);
  const idx = arr.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...patch };
  await writeRaw(name, arr);
  return arr[idx];
}

async function remove(name, id) {
  const arr = await readRaw(name);
  const newArr = arr.filter(x => String(x.id) !== String(id));
  await writeRaw(name, newArr);
  return { success: true };
}

module.exports = {
  list, getById, create, update, remove, writeRaw
};