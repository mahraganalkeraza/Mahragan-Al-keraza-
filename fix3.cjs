const fs = require('fs');
let code = fs.readFileSync('src/components/DynamicAdminSettings.tsx', 'utf8');

code = code.replace(/const usersQuery = \(\{\} as any\), \(\{\} as any\)\);/g, "const usersQuery = ({} as any);");

fs.writeFileSync('src/components/DynamicAdminSettings.tsx', code);
