import ExcelJS from 'exceljs';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { saveAs } from 'file-saver';

import ExcelJS from 'exceljs';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { saveAs } from 'file-saver';

export const generateMasterExcel = async (isAdmin: boolean = true, churchFilter: string = '') => {
  try {
    // 1. Fetch data in parallel
    const [participantsSnap, resultsSnap, teamsSnap, onlineResultsSnap] = await Promise.all([
      getDocs(collection(db, 'participants')),
      getDocs(collection(db, 'results')),
      getDocs(collection(db, 'activityTeams')),
      getDocs(collection(db, 'online_results'))
    ]);

    const participants = participantsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const results = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const onlineResults = onlineResultsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // 2. Merge data
    const studentData: Record<string, any> = {};

    // Initialize with participants
    participants.forEach(p => {
        studentData[p.id.toLowerCase().trim()] = {
            id: p.id,
            name: p.name || '-',
            church: p.churchName || '-',
            stage: p.stage || '-',
            teams: [],
            drasyScore: 0,
            copticScore: 0,
            mahfozatScore: 0,
            deviceInfo: '-'
        };
    });

    // Merge results
    results.forEach(r => {
        const id = (r.studentId || r.id || '').toLowerCase().trim();
        if (studentData[id]) {
            studentData[id].drasyScore = r.academicScore || r.data?.['دراسي'] || 0;
            studentData[id].mafozatScore = r.memorizationScore || r.data?.['محفوظات'] || 0;
            studentData[id].copticScore = (r.q1Score || 0) + (r.q2Score || 0);
        }
    });

    // Merge online results
    onlineResults.forEach(r => {
        const id = (r.studentID || r.studentId || '').toLowerCase().trim();
        if (studentData[id]) {
             if (r.deviceFingerprint) {
                 studentData[id].deviceInfo = `${r.deviceFingerprint.os || ''} ${r.deviceFingerprint.browser || ''}`.trim();
             }
        }
    });

    // Merge teams
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
    
    // Tab 1: Students
    const wsStudents = workbook.addWorksheet('Students');
    wsStudents.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Church', key: 'church', width: 20 },
        { header: 'Stage', key: 'stage', width: 15 }
    ];
    wsStudents.addRows(Object.values(studentData));

    // Tab 2: Academic
    const wsAcademic = workbook.addWorksheet('Academic');
    wsAcademic.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Drasy Score', key: 'drasyScore', width: 15 },
        { header: 'Coptic Score', key: 'copticScore', width: 15 },
        { header: 'Mahfozat Score', key: 'mahfozatScore', width: 15 }
    ];
    wsAcademic.addRows(Object.values(studentData));

    // Tab 3: Activities
    const wsActivities = workbook.addWorksheet('Activities');
    wsActivities.columns = [
        { header: 'ID', key: 'id', width: 15 },
        { header: 'Teams', key: 'teams', width: 30 }
    ];
    wsActivities.addRows(Object.values(studentData).map(s => ({...s, teams: s.teams.join(', ')})));

    // Tab 4: Statistics
    const wsStats = workbook.addWorksheet('Statistics');
    wsStats.columns = [
        { header: 'Church', key: 'church', width: 20 },
        { header: 'Count', key: 'count', width: 10 }
    ];
    const stats: Record<string, number> = {};
    Object.values(studentData).forEach(s => {
        stats[s.church] = (stats[s.church] || 0) + 1;
    });
    wsStats.addRows(Object.entries(stats).map(([church, count]) => ({ church, count })));

    // Formatting
    [wsStudents, wsAcademic, wsActivities, wsStats].forEach(ws => {
        ws.getRow(1).font = { bold: true };
        ws.views = [{ rightToLeft: true }];
    });

    // 4. Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'Master_Export.xlsx');

  } catch (error) {
    console.error('Export failed:', error);
    alert('فشل تصدير البيانات. يرجى التحقق من الصلاحيات.');
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
    // Re-use logic for now, but ensure it fetches from Firebase properly now
    await generateMasterExcel(); // Since it has EVERYTHING now.
};
