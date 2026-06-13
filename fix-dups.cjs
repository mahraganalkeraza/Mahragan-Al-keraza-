const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newHandler = `  const handlePurgeDuplicatesSupabase = async () => {
    setIsDeletingDuplicates(true);
    try {
      const { data, error } = await supabase.rpc('delete_duplicate_students');
      if (error) {
        console.error(error);
        setNotification('حدث خطأ أثناء حذف التكرارات.');
      } else {
        let count = 0;
        if (Array.isArray(data) && data.length > 0) {
          count = data[0].deleted_count;
        } else if (typeof data === 'number') {
          count = data;
        }

        if (count > 0) {
          setNotification(\`تم مسح \${count} من الأسماء المكررة بنجاح!\`);
          fetchParticipantsPage(true, true, debouncedParticipantSearch);
        } else {
          setNotification('لا يوجد أسماء مكررة بالتطابق التام حالياً.');
        }
      }
    } catch (err) {
      console.error(err);
      setNotification('حدث خطأ أثناء حذف التكرارات.');
    } finally {
      setIsDeletingDuplicates(false);
    }
  };`;

// Insert the new handler where handleScanDuplicates was
code = code.replace(/const handleScanDuplicates = async \(\) => \{[\s\S]*?const handleDeleteDuplicates = async \(\) => \{[\s\S]*?setIsDeletingDuplicates\(false\);\n    \}\n  \};/m, newHandler);

// Replace button onClick and structure
code = code.replace(/<button \n                      onClick=\{\(\) => setIsDuplicateScanModalOpen\(true\)\}\n                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-rose-100 transition-colors"\n                    >\n                      <Layers size=\{14\} \/> فحص وتطهير التكرار\n                    <\/button>/m, `<button 
                      onClick={handlePurgeDuplicatesSupabase}
                      disabled={isDeletingDuplicates}
                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {isDeletingDuplicates ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />} فحص وتطهير التكرار
                    </button>`);

fs.writeFileSync('src/App.tsx', code);
