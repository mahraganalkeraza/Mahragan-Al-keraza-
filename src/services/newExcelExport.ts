import ExcelJS from 'exceljs';
import { db, rdb, rdbRef, rdbGet } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { saveAs } from 'file-saver';

export const generateMasterExcel = async (churchName: string | null = null) => {
  try {
    const isAdmin = !churchName;
    console.log(`Exporting for ${isAdmin ? 'Admin' : churchName}`);

    // Fetch sequentially to guarantee resolution
    let pQuery = isAdmin 
      ? collection(db, 'participants') 
      : query(collection(db, 'participants'), where('churchName', '==', churchName));
      
    const pSnap = await getDocs(pQuery);
    const fsParticipants = pSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    let rdbList: any[] = [];
    try {
      const rSnapshot = await rdbGet(rdbRef(rdb, 'participants'));
      const rData = rSnapshot.val();
      if (rData) {
        let temp: any[] = [];
        if (Array.isArray(rData)) {
          temp = rData.filter(p => p).map((p, index) => ({ id: p.id || `rdb-${index}`, ...p }));
        } else {
          temp = Object.entries(rData).map(([id, val]: [string, any]) => ({ id, ...val }));
        }
        
        rdbList = temp.filter(p => {
          return isAdmin || p.churchName === churchName;
        });
      }
    } catch (rdbError) {
      console.error('Error fetching participants from Realtime Database for Excel export:', rdbError);
    }

    const uniqueParticipantsMap = new Map();
    fsParticipants.forEach(p => uniqueParticipantsMap.set(p.id, p));
    rdbList.forEach(p => uniqueParticipantsMap.set(p.id, p));
    const participants = Array.from(uniqueParticipantsMap.values());

    if (!participants || participants.length === 0) {
      alert('لا توجد بيانات متاحة للتصدير لهذه الكنيسة.');
      return;
    }

    // 3. Create Workbook
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('المشتركين');
    ws.columns = [
        { header: 'id', key: 'id', width: 25 },
        { header: 'serial', key: 'serial', width: 20 },
        { header: 'churchName', key: 'churchName', width: 25 },
        { header: 'country', key: 'country', width: 15 },
        { header: 'name', key: 'name', width: 30 },
        { header: 'stage', key: 'stage', width: 20 },
        { header: 'gender', key: 'gender', width: 12 },
        { header: 'competitions', key: 'competitions', width: 35 },
        { header: 'timestamp', key: 'timestamp', width: 25 },
        { header: 'year', key: 'year', width: 15 }
    ];

    const mappedRows = participants.map((row: any) => {
      const rawCompetitions = row.competitions || row.enrolled_subjects;
      const churchNameVal = row.churchName || row.charchName || row.church || row.church_name;
      const nameVal = row.name || row.student_name;
      const timestampVal = row.timestamp || row.created_at;

      return {
        id: row.id || "Null",
        serial: row.serial || row.id || "Null",
        churchName: churchNameVal || "Null",
        country: row.country || "Null",
        name: nameVal || "Null",
        stage: row.stage || "Null",
        gender: row.gender || "Null",
        competitions: Array.isArray(rawCompetitions) ? JSON.stringify(rawCompetitions) : "Null",
        timestamp: timestampVal || "Null",
        year: row.year || "Null"
      };
    });
    
    ws.addRows(mappedRows);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ rightToLeft: true }];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `بيانات_${churchName || 'الكل'}.xlsx`);

  } catch (error: any) {
    console.error('Export failed:', error);
    alert(error.message || 'حدث خطأ غير متوقع أثناء التصدير.');
  }
};


export const downloadMasterTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Template');
    ws.columns = [
        { header: 'توقيت التسجيل', width: 20 },
        { header: 'الرقم التعريفي', width: 20 },
        { header: 'الاسم', width: 30 },
        { header: 'الكنيسة/البلد', width: 20 },
        { header: 'النوع', width: 15 },
        { header: 'دراسي', width: 10 },
        { header: 'محفوظات', width: 10 },
        { header: 'قبطي مستوى 1', width: 15 },
        { header: 'قبطي مستوى 2', width: 15 }
    ];
    ws.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Master_Template.xlsx');
};

export const exportOnlineResultsExcel = async (results: any[]) => {
    try {
        if (!results || results.length === 0) {
            alert('لا توجد نتائج لتصديرها');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Online Results');

        ws.columns = [
            { header: 'الكود', key: 'studentID', width: 15 },
            { header: 'الاسم', key: 'studentName', width: 30 },
            { header: 'النوع', key: 'gender', width: 12 },
            { header: 'الكنيسة', key: 'churchName', width: 25 },
            { header: 'المرحلة', key: 'stage', width: 15 },
            { header: 'دراسي', key: 'drasy', width: 12 },
            { header: 'محفوظات', key: 'mahfozat', width: 12 },
            { header: 'قبطي مستوى أول', key: 'coptic1', width: 15 },
            { header: 'قبطي مستوى ثاني', key: 'coptic2', width: 15 }
        ];

        ws.addRows(results.map(r => ({
            studentID: r.studentID,
            studentName: r.studentName,
            gender: r.gender || '',
            churchName: r.churchName,
            stage: r.stage,
            drasy: r['مسابقة دراسي'] || '-',
            mahfozat: r['مسابقة محفوظات'] || '-',
            coptic1: r['مسابقة قبطي مستوى أول'] || '-',
            coptic2: r['مسابقة قبطي مستوى ثاني'] || '-'
        })));

        ws.getRow(1).font = { bold: true };
        ws.views = [{ rightToLeft: true }];

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Online_Results_${new Date().getTime()}.xlsx`);
    } catch (e: any) {
        console.error('Export failed:', e);
        alert(e.message || 'حدث خطأ أثناء تصدير نتائج الأونلاين');
    }
};
