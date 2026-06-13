const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Find the modal block. We can just stub out the JSX for the duplicate scan modal
code = code.replace(/\{isDuplicateScanModalOpen && \([\s\S]*? نتائ[\s\S]*?تأكيد تطهير التكرار[\s\S]*?<\/AnimatePresence>/m, '{/* Duplicate Modal Removed */} </AnimatePresence>');

fs.writeFileSync('src/App.tsx', code);
