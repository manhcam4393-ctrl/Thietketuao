const fs = require('fs');
const content = fs.readFileSync('Danh_Sach_Link_Vat_Lieu.txt', 'utf8');
const lines = content.split('\n');
let materials = [];
let currentName = '';

for (let line of lines) {
  if (line.startsWith('Tên: ')) {
    currentName = line.replace('Tên: ', '').trim().replace('.jpg', '');
  } else if (line.startsWith('Link: ')) {
    const url = line.replace('Link: ', '').trim();
    materials.push({ name: currentName, url: url });
  }
}

fs.writeFileSync('src/materials.ts', `export const MATERIAL_LINKS = ${JSON.stringify(materials, null, 2)};`);
console.log('Done parsing ' + materials.length + ' materials');
