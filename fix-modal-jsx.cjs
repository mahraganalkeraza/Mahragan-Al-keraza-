const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove `<DuplicateScanModal />`
code = code.replace(/<DuplicateScanModal \/>/g, '');

// Remove `const DuplicateScanModal = () => ( ... );`
// The block starts around 4488 and ends with `</AnimatePresence>);`
code = code.replace(/const DuplicateScanModal = \(\) => \([\s\S]*?<\/AnimatePresence>\s*\);/m, '');

fs.writeFileSync('src/App.tsx', code);
