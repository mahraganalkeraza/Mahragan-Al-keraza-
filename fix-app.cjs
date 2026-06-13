const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/await generateMasterExcel\(userRole === 'admin' \? null : churchName\);/g, "await generateMasterExcel(allChurchParticipants, userRole === 'admin' ? null : churchName);");
code = code.replace(/onClick=\{\(\) => generateMasterExcel\(churchName\)\}/g, "onClick={() => generateMasterExcel(allChurchParticipants, churchName)}");
code = code.replace(/onClick=\{\(\) => \{ generateMasterExcel\(userRole === 'admin' \? null : churchName\); \}\}/g, "onClick={() => generateMasterExcel(allChurchParticipants, userRole === 'admin' ? null : churchName)}");
code = code.replace(/onClick=\{\(\) => generateMasterExcel\(userRole === 'admin' \? null : churchName\)\}/g, "onClick={() => generateMasterExcel(allChurchParticipants, userRole === 'admin' ? null : churchName)}");
code = code.replace(/onClick=\{\(\) => \{ generateMasterExcel\(churchName\); \}\}/g, "onClick={() => generateMasterExcel(allChurchParticipants, churchName)}");

fs.writeFileSync('src/App.tsx', code);
