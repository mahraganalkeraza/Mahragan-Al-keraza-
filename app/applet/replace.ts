import fs from 'fs';

let text = fs.readFileSync('src/App.tsx', 'utf-8');
text = text.replace(/PRICING_DATA\.map\(p => <option key=\{p\.stage\} value=\{p\.stage\}>\{p\.stage\}<\/option>\)/g, 'dynamicLevels.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)');
text = text.replace(/PRICING_DATA\.findIndex\(p => p\.stage/g, 'dynamicLevels.findIndex((p: any) => p.name');
text = text.replace(/PRICING_DATA\.map\(p => \(/g, 'dynamicLevels.map((p: any) => (');

// Specifically handle the one in the exam link section where p.stage needs to become p.name:
// {PRICING_DATA.map(p => (
//   <div key={p.stage} 
//   ... examLinks[p.stage]
text = text.replace(/key=\{p\.stage\}/g, 'key={p.name}');
text = text.replace(/examLinks\[p\.stage\]/g, 'examLinks[p.name]');
text = text.replace(/>\{p\.stage\}<\/label>/g, '>{p.name}</label>');
text = text.replace(/p\.stage === a\.stage/g, 'p.name === a.stage');
text = text.replace(/p\.stage === b\.stage/g, 'p.name === b.stage');
text = text.replace(/p\.stage === a\)/g, 'p.name === a)');
text = text.replace(/p\.stage === b\)/g, 'p.name === b)');

fs.writeFileSync('src/App.tsx', text);
