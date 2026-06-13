const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newHandler = `  const handleUndoDuplicates = async () => {
    if (!undoableDuplicates || undoableDuplicates.length === 0) return;
    setIsRestoringDuplicates(true);
    try {
      // Upsert the deleted records back into registrations
      const { error: restoreError } = await supabase.from('registrations').upsert(undoableDuplicates);
      
      if (restoreError) throw restoreError;

      // Log the undo action
      await supabase.from('logs').insert({
        action: 'undo_delete_duplicates',
        count: undoableDuplicates.length,
        timestamp: new Date().toISOString(),
        details: 'تم استرداد المشتركين المكررين.'
      });

      setNotification(\`تم التراجع واعاد إدراج \${undoableDuplicates.length} سجل بنجاح!\`);
      setUndoableDuplicates(null);
      fetchParticipantsPage(true, true, debouncedParticipantSearch);
    } catch (err) {
      console.error(err);
      setNotification('حدث خطأ أثناء استرداد التكرارات.');
    } finally {
      setIsRestoringDuplicates(false);
    }
  };

  const handlePurgeDuplicatesSupabase = async () => {
    setIsDeletingDuplicates(true);
    try {
      // Fetch current registrations before deletion to compute diff
      const { data: beforeData } = await supabase.from('registrations').select('*');

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
          const { data: afterData } = await supabase.from('registrations').select('id');
          const afterIds = new Set((afterData || []).map(a => String(a.id)));
          const deletedRecords = (beforeData || []).filter(b => !afterIds.has(String(b.id)));
          
          if (deletedRecords.length > 0) {
             setUndoableDuplicates(deletedRecords);
             try {
                await supabase.from('logs').insert({
                   action: 'delete_duplicates',
                   count: deletedRecords.length,
                   details: JSON.stringify(deletedRecords),
                   timestamp: new Date().toISOString()
                });
             } catch (logErr) {
                console.error("Logging failed:", logErr);
             }
          }

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

// Replace handlePurgeDuplicatesSupabase
code = code.replace(/const handlePurgeDuplicatesSupabase = async \(\) => \{[\s\S]*?setIsDeletingDuplicates\(false\);\n    \}\n  \};/m, newHandler);

// Add undo button UI near the 'فحص وتطهير التكرار' button
const buttonUI = `<button 
                      onClick={handlePurgeDuplicatesSupabase}
                      disabled={isDeletingDuplicates}
                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {isDeletingDuplicates ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />} فحص وتطهير التكرار
                    </button>
                    {undoableDuplicates && undoableDuplicates.length > 0 && (
                      <button 
                        onClick={handleUndoDuplicates}
                        disabled={isRestoringDuplicates}
                        className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-amber-100 transition-colors"
                      >
                        {isRestoringDuplicates ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} استرداد ({undoableDuplicates.length})
                      </button>
                    )}`;

code = code.replace(/<button \n                      onClick=\{handlePurgeDuplicatesSupabase\}[\s\S]*?<\/button>/m, buttonUI);


fs.writeFileSync('src/App.tsx', code);
