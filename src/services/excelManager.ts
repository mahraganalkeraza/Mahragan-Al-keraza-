import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const MASTER_HEADERS = [
  'توقيت التسجيل',
  'الرقم التعريفي',
  'الاسم',
  'الكنيسة/البلد',
  'النوع',
  'دراسي',
  'محفوظات',
  'قبطي مستوى 1',
  'قبطي مستوى 2'
];

export const exportUnifiedExcel = async (isAdmin: boolean = true, churchFilter: string = '') => {
  // Fetch all data
  const [resultsSnap, teamsSnap, ordersSnap, participantsSnap] = await Promise.all([
    getDocs(collection(db, 'results')),
    getDocs(collection(db, 'activityTeams')),
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'participants'))
  ]);

  let results = resultsSnap.docs.map(d => ({id: d.id, ...d.data()})) as any[];
  let activityTeams = teamsSnap.docs.map(d => ({id: d.id, ...d.data()})) as any[];
  let orders = ordersSnap.docs.map(d => ({id: d.id, ...d.data()})) as any[];
  let participants = participantsSnap.docs.map(d => ({id: d.id, ...d.data()})) as any[];

  if (!isAdmin && churchFilter && churchFilter !== 'الكل') {
    results = results.filter(r => r.churchName === churchFilter);
    activityTeams = activityTeams.filter(t => t.churchName === churchFilter);
    orders = orders.filter(o => o.churchName === churchFilter);
    participants = participants.filter(p => p.churchName === churchFilter);
  }

  const workbook = XLSX.utils.book_new();

  // Tab 1: Master Record (السجل الرئيسي)
  const masterData = results.map(r => ({
    'توقيت التسجيل': r.timestamp || '-',
    'كود الطالب (ID)': r.serial || r.id || '-',
    'الاسم': r.studentName || '-',
    'الكنيسة': r.churchName || '-',
    'النوع': r.data?.['النوع'] || r.gender || '-',
    'المرحلة': r.data?.['المرحلة'] || r.stage || '-',
    'دراسي (Score)': r.academicScore ?? r.data?.['دراسي'] ?? '-',
    'محفوظات': r.memorizationScore ?? r.data?.['محفوظات'] ?? '-',
    'قبطي 1': r.q1Score ?? r.data?.['قبطي 1'] ?? '-',
    'قبطي 2': r.q2Score ?? r.qScore ?? r.data?.['قبطي 2'] ?? '-',
    'الأنشطة': r.activities?.join(', ') || '-',
  }));
  
  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  wsMaster['!view'] = { rightToLeft: true };
  XLSX.utils.book_append_sheet(workbook, wsMaster, "السجل الرئيسي");

  // Helper to extract teams
  const buildTeamData = (type: string) => {
    return activityTeams.filter(t => t.activityType === type).flatMap(t => 
      (t.members || []).map((m: any) => ({
        'توقيت التسجيل': t.timestamp || '-',
        'الكنيسة': t.churchName || '-',
        'الاسم': m.name || '-',
        'النوع': m.gender || '-',
        'المرحلة': m.stage || '-',
        'تفاصيل إضافية': t.choirLevel || t.instrumentType || t.performanceType || t.leaderName || '-',
      }))
    );
  };

  const activityTabs = [
    { name: "الفرق - كورال", type: 'كورال' },
    { name: "الفرق - ألحان", type: 'ألحان' },
    { name: "الفرق - عزف", type: 'عزف' },
    { name: "الفرق - ترنيم فردي", type: 'ترنيم فردي' },
  ];

  activityTabs.forEach(tab => {
    const data = buildTeamData(tab.type);
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'الحالة': 'لا يوجد بيانات' }]);
    ws['!view'] = { rightToLeft: true };
    XLSX.utils.book_append_sheet(workbook, ws, tab.name);
  });

  // Tab 6: Statistics (الملخص الإحصائي)
  const churches = Array.from(new Set(results.map(r => r.churchName)));
  const stages = Array.from(new Set(results.map(r => r.data?.['المرحلة'] || r.stage))).filter(Boolean) as string[];
  
  const matrixData = churches.map(church => {
    const churchResults = results.filter(r => r.churchName === church);
    const row: any = { 'الكنيسة': church };
    stages.forEach(stage => {
      row[stage] = churchResults.filter(r => (r.data?.['المرحلة'] || r.stage) === stage).length;
    });
    row['الإجمالي'] = churchResults.length;
    row['المستحق المالي (50 ج.م/طالب)'] = churchResults.length * 50;
    return row;
  });
  
  const wsMatrix = XLSX.utils.json_to_sheet(matrixData.length ? matrixData : [{ 'الحالة': 'لا يوجد بيانات' }]);
  wsMatrix['!view'] = { rightToLeft: true };
  XLSX.utils.book_append_sheet(workbook, wsMatrix, "الملخص الإحصائي");

  // Tab 7: Books Order Summary (طلبات الكتب)
  const ordersSummaryData = orders.map(o => {
    const row: any = {
        'توقيت الطلب': o.timestamp || '-',
        'الكنيسة': o.churchName || '-',
        'البلد': o.country || '-',
        'الإجمالي الكلي': o.grandTotal || 0
    };
    (o.details || []).forEach((d: any) => {
      const stageKey = `${d.stage} - ${d.material}`;
      row[`${stageKey} (عدد)`] = (d.study || 0) + (d.memo || 0) + (d.coptic || 0) + (d.activity || 0);
      row[`${stageKey} (سعر)`] = d.subtotal || 0;
    });
    return row;
  });
  
  const wsOrders = XLSX.utils.json_to_sheet(ordersSummaryData.length ? ordersSummaryData : [{ 'الحالة': 'لا يوجد طلبات' }]);
  wsOrders['!view'] = { rightToLeft: true };
  XLSX.utils.book_append_sheet(workbook, wsOrders, "طلبات الكتب");

  XLSX.writeFile(workbook, `Mahragan_Master_Report_${new Date().getTime()}.xlsx`);
};

export const downloadMasterTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const headers = [
      'توقيت التسجيل',
      'الرقم التعريفي',
      'الاسم',
      'الكنيسة/البلد',
      'النوع',
      'دراسي',
      'محفوظات',
      'قبطي مستوى 1',
      'قبطي مستوى 2'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    ws['!view'] = { rightToLeft: true };
    XLSX.utils.book_append_sheet(workbook, ws, "السجل الرئيسي");
    XLSX.writeFile(workbook, `Master_Template.xlsx`);
};

export const exportOnlineResultsExcel = async () => {
    const onlineSnap = await getDocs(collection(db, 'online_results'));
    const onlineResults = onlineSnap.docs.map(d => d.data());
    
    if (onlineResults.length === 0) {
        alert('لا يوجد نتائج أونلاين حتى الآن.');
        return;
    }
    
    const consolidated = onlineResults.reduce((acc: any, cur: any) => {
        const id = cur.studentID || cur.studentId;
        if (!id) return acc;
        if (!acc[id]) acc[id] = { ...cur };
        else {
           Object.keys(cur).forEach(k => { if (cur[k] !== undefined && cur[k] !== null) acc[id][k] = cur[k]; });
        }
        return acc;
    }, {});

    const formattedData = Object.values(consolidated).map((r: any) => {
        let drasy = r['مسابقة دراسي'] ?? (r.competition === 'دراسي' ? r.finalScore : '-');
        let mahfozat = r['مسابقة محفوظات'] ?? (r.competition === 'محفوظات' ? r.finalScore : '-');
        let coptic1 = r['مسابقة قبطي مستوى أول'] ?? (r.competition === 'قبطي مستوى أول' ? r.finalScore : '-');
        let coptic2 = r['مسابقة قبطي مستوى ثاني'] ?? (r.competition === 'قبطي مستوى ثاني' ? r.finalScore : '-');

        let total = 0;
        if (typeof drasy === 'number') total += drasy;
        if (typeof mahfozat === 'number') total += mahfozat;
        if (typeof coptic1 === 'number') total += coptic1;
        if (typeof coptic2 === 'number') total += coptic2;

        let deviceSig = typeof r.deviceFingerprint === 'string' 
            ? r.deviceFingerprint 
            : (r.deviceFingerprint ? `${r.deviceFingerprint?.os || 'Unknown'} - ${r.deviceFingerprint?.browser || 'Browser'}` : '-');

        return {
            'الكود': r.studentID || r.studentId || '-',
            'الاسم': r.studentName || '-',
            'الكنيسة': r.churchName || '-',
            'المرحلة': r.stage || '-',
            'مسابقة دراسي': drasy,
            'مسابقة محفوظات': mahfozat,
            'قبطي - مستوى أول': coptic1,
            'قبطي - مستوى ثانِ': coptic2,
            'إجمالي الدرجات': total || '-',
            'بصمة الجهاز': deviceSig
        };
    });

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);
    ws['!view'] = { rightToLeft: true };
    XLSX.utils.book_append_sheet(workbook, ws, "النتائج المجمعة");
    XLSX.writeFile(workbook, `Comprehensive_Results_2026.xlsx`);
};

