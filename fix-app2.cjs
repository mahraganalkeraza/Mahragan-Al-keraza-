const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<OmrGenerator \/>/g, "<OmrGenerator allStudents={allChurchParticipants} />");

fs.writeFileSync('src/App.tsx', code);
