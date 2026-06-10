import fs from 'fs';
const churches = JSON.parse(fs.readFileSync('./src/data/churches.json', 'utf8'));

let obj = {};
for (const c of churches) {
    obj[c.name] = c.password;
}

const currentFile = fs.readFileSync('./src/constants.ts', 'utf8');

const regex = /export const CHURCH_CREDENTIALS: Record<string, string> = \{[\s\S]*?\};/;
const nextFile = currentFile.replace(regex, `export const CHURCH_CREDENTIALS: Record<string, string> = ${JSON.stringify(obj, null, 2)};`);

fs.writeFileSync('./src/constants.ts', nextFile, 'utf8');
console.log("updated");
