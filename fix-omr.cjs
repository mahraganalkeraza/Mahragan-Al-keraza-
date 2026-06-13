const fs = require('fs');
let code = fs.readFileSync('src/components/OmrGenerator.tsx', 'utf8');

const replacement = `let students: Participant[] = [];
      const search = searchQuery.trim();
      
      if (allStudents && allStudents.length > 0) {
        if (search) {
          const searchVariations = [search, search.toUpperCase(), search.toLowerCase()];
          students = allStudents.filter(p => 
            searchVariations.includes(p.serial) || searchVariations.includes(p.id)
          ).map(d => ({...d, name: d.name || d.studentName || 'بدون اسم'}));
          
          if (students.length === 0) {
             setError("لم يتم العثور على طالب بهذا الرقم.");
             setIsGenerating(false);
             return;
          }
        } else {
          students = allStudents.filter(p => {
             const passChurch = selectedChurch === 'الكل' || p.churchName === selectedChurch;
             const passStage = selectedStage === 'الكل' || p.stage === selectedStage;
             return passChurch && passStage;
          }).map(d => ({...d, name: d.name || d.studentName || 'بدون اسم'}));
        }
      }`;

code = code.replace(/let students: Participant\[\] = \[\];[\s\S]*?if \(\!error && data\) \{[\s\S]*?name: d\.name \|\| d\.studentName \|\| 'بدون اسم'\s*\}\)\);\s*\}/m, replacement);

fs.writeFileSync('src/components/OmrGenerator.tsx', code);
