// db_json.js - simple JSON file store with full CRUD
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataDir = process.env.NODE_ENV === 'production' ? '/tmp/data' : path.join(__dirname, 'data');

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
  const files = ['customers', 'services', 'appointments'];
  for (const name of files) {
    const p = path.join(dataDir, `${name}.json`);
    try {
      await fs.access(p);
    } catch {
      await fs.writeFile(p, '[]', 'utf8');
      console.log(`Created empty ${name}.json in ${dataDir}`);
    }
  }
}

async function readRaw(name) {
  const p = path.join(dataDir, `${name}.json`);
  try {
    const txt = await fs.readFile(p, 'utf8');
    return JSON.parse(txt || '[]');
  } catch (err) {
    if (err.code === 'ENOENT') {
      await ensureDataDir();
      return readRaw(name);
    }
    throw err;
  }
}

async function writeRaw(name, arr) {
  const p = path.join(dataDir, `${name}.json`);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(arr, null, 2), 'utf8');
  return true;
}

async function list(name) {
  return await readRaw(name);
}

async function getById(name, id) {
  const arr = await readRaw(name);
  return arr.find(x => String(x.id) === String(id)) || null;
}

async function create(name, obj) {
  const arr = await readRaw(name);
  const item = Object.assign({}, obj);
  item.id = item.id || uuidv4();
  item.createdAt = new Date().toISOString();
  arr.push(item);
  await writeRaw(name, arr);
  return item;
}

async function update(name, id, patch) {
  const arr = await readRaw(name);
  const idx = arr.findIndex(x => String(x.id) === String(id));
  if (idx === -1) throw new Error(`${name.slice(0,-1)} not found`);
  const updated = Object.assign({}, arr[idx], patch);
  updated.id = arr[idx].id;
  updated.updatedAt = new Date().toISOString();
  arr[idx] = updated;
  await writeRaw(name, arr);
  return updated;
}

async function remove(name, id) {
  const arr = await readRaw(name);
  const newArr = arr.filter(x => String(x.id) !== String(id));
  await writeRaw(name, newArr);
  return { success: true };
}

module.exports = {
  ensureDataDir,
  readRaw,
  writeRaw,
  list,
  getById,
  create,
  update,
  remove
};
