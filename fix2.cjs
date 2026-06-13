const fs = require('fs');
let code = fs.readFileSync('src/components/DynamicAdminSettings.tsx', 'utf8');

code = code.replace(/const firebaseDocRef = \(\{\} as any\)\);/g, "const firebaseDocRef = ({} as any);");
code = code.replace(/await setDoc\(\(\{\} as any\)\), \{[\s\S]*?\}, \{ merge: true \}\);/g, "alert('disabled');");
code = code.replace(/await setDoc\(firebaseDocRef, \{[\s\S]*?\}, \{ merge: true \}\);/g, "alert('disabled');");
code = code.replace(/await setDoc\(\(\{\} as any\), \{[\s\S]*?\}, \{ merge: true \}\);/g, "alert('disabled');");
code = code.replace(/alert\('Operation disabled'\), \{[\s\S]*?\}, \{ merge: true \}\);/g, "alert('Operation disabled');");


fs.writeFileSync('src/components/DynamicAdminSettings.tsx', code);
