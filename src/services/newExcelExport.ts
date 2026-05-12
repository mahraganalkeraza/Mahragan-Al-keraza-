import ExcelJS from 'exceljs';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { saveAs } from 'file-saver';

export const generateMasterExcel = async (churchName: string | null = null) => {
  try {
    const isAdmin = !churchName;
    
    // Define helper to fetch filtered or all data
    const fetchWithScope = async (path: string, collName: string) => {
        let q;
        if (!isAdmin) {
             q = query(collection(db, collName), where('churchName', '==', churchName));
        } else {
             q = collection(db, collName);
        }
        try {
            return await getDocs(q);
        } catch (e) {
            console.error(`Error fetching ${collName}:`, e);
            throw new Error(`تعذر الوصول إلى بيانات ${collName}`);
        }
    };

    // 1. Fetch data
    const [participantsSnap, resultsSnap, teamsSnap] = await Promise.all([
        fetchWithScope('participants', 'participants'),
        fetchWithScope('results', 'results'),
        fetchWithScope('activityTeams', 'activityTeams'),
    ]);

    const participants = participantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const studentData: Record<string, any> = {};

    // Merge logic
    participants.forEach(p => {
        studentData[p.id.toLowerCase().trim()] = {
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

    results.forEach(r => {
        const id = (r.studentId || r.id || '').toLowerCase().trim();
        if (studentData[id]) {
            studentData[id].drasyScore = r.academicScore || r.data?.['دراسي'] || 0;
            studentData[id].mafozatScore = r.memorizationScore || r.data?.['محفوظات'] || 0;
            studentData[id].copticScore = (r.q1Score || 0) + (r.q2Score || 0);
        }
    });

    teams.forEach(t => {
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
    alert(error.message || 'حدث خطأ أثناء تصدير البيانات. يرجى المحاولة لاحقاً.');
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

export const exportOnlineResultsExcel = async () => {
    await generateMasterExcel();
};
