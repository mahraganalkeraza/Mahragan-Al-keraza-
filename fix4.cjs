const fs = require('fs');
let code = fs.readFileSync('src/components/DynamicAdminSettings.tsx', 'utf8');

code = code.replace(/await getDoc\(.*?\)/g, "({ exists: () => false, data: () => ({}) } as any)");
code = code.replace(/await createUserWithEmailAndPassword\(.*?\)/g, "({ user: { uid: 'dummy' } } as any)");
code = code.replace(/getDocs\(usersQuery\)/g, "({ docs: [] } as any)");
code = code.replace(/getDocs\(churchesQuery\)/g, "({ docs: [] } as any)");

fs.writeFileSync('src/components/DynamicAdminSettings.tsx', code);
