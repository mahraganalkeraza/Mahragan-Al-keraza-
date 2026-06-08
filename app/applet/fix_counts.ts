import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace(/setTotalParticipantsCount\(count\);/g, 'setTotalParticipantsCount(count || 0);');
content = content.replace(/setTotalOrdersCount\(count\);/g, 'setTotalOrdersCount(count || 0);');
content = content.replace(/setTotalResultsCount\(count\);/g, 'setTotalResultsCount(count || 0);');
content = content.replace(/setTotalTeamsCount\(count\);/g, 'setTotalTeamsCount(count || 0);');

content = content.replace(/count !== null/g, 'count != null');
fs.writeFileSync('src/App.tsx', content);
