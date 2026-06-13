const fs = require('fs');
let code = fs.readFileSync('src/components/DynamicAdminSettings.tsx', 'utf8');

code = code.replace(/const userCredential = await createUserWithEmailAndPassword\([\s\S]*?\);/g, "const userCredential = { user: { uid: 'dummy' } } as any;");

fs.writeFileSync('src/components/DynamicAdminSettings.tsx', code);
