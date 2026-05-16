import ExcelJS from 'exceljs';
import { db } from '../firebase';
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
    const participants = pSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    if (!participants || participants.length === 0) {
      alert('لا توجد بيانات متاحة للتصدير لهذه الكنيسة.');
      return;
    }

    let rQuery = isAdmin
      ? collection(db, 'results')
      : query(collection(db, 'results'), where('churchName', '==', churchName));
    const rSnap = await getDocs(rQuery);
    const results = rSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    let tQuery = isAdmin
      ? collection(db, 'activityTeams')
      : query(collection(db, 'activityTeams'), where('churchName', '==', churchName));
    const tSnap = await getDocs(tQuery);
    const teams = tSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    
    // Merge logic
    const studentData: Record<string, any> = {};

    participants.forEach((p: any) => {
        studentData[p.id?.toLowerCase().trim()] = {
            id: p.id,
            name: p.name || '-',
            church: p.churchName || '-',
            stage: p.stage || '-',
            teams: [],
            drasyScore: 0,
            copticScore: 0,
            mahfozatScore: 0
        };
    });

    results.forEach((r: any) => {
        const id = (r.studentId || r.id || '').toLowerCase().trim();
        if (studentData[id]) {
            studentData[id].drasyScore = r.academicScore || r.data?.['دراسي'] || 0;
            studentData[id].mahfozatScore = r.memorizationScore || r.data?.['محفوظات'] || 0;
            studentData[id].copticScore = (r.q1Score || 0) + (r.q2Score || 0);
        }
    });

    teams.forEach((t: any) => {
        t.members?.forEach((m: any) => {
            const id = (m.id || '').toLowerCase().trim();
            if (studentData[id]) {
                studentData[id].teams.push(t.activityType || 'غير محدد');
            }
        });
    });

    // 3. Create Workbook
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('المشتركين');
    ws.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'الاسم', key: 'name', width: 30 },
        { header: 'الكنيسة', key: 'church', width: 20 },
        { header: 'المرحلة', key: 'stage', width: 15 },
        { header: 'دراسي', key: 'drasyScore', width: 15 },
        { header: 'قبطي', key: 'copticScore', width: 15 },
        { header: 'محفوظات', key: 'mahfozatScore', width: 15 },
        { header: 'الفرق', key: 'teams', width: 30 }
    ];
    
    ws.addRows(Object.values(studentData).map(s => ({...s, teams: s.teams.join(', ')})));
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
