// migrate.js
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const files = {
  customers: [],
  services: [],
  appointments: []
};

for (const [name, content] of Object.entries(files)) {
  const filePath = path.join(dataDir, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    console.log(`Created ${filePath}`);
  } else {
    console.log(`${filePath} already exists — skipping`);
  }
}
console.log('Migration (JSON files) complete.');

 
 
 
 
 
