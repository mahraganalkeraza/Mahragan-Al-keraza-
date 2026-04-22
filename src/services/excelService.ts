import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Result, Order, Participant, ActivityTeam } from '../types';

const HEADER_BG = '0F172A'; // Slate 900
const HEADER_TEXT = 'FFFFFF';
const ROW_BG = 'F8FAFC'; // Slate 50
const BORDER_COLOR = 'CBD5E1'; // Slate 300

const applyProfessionalStyles = (sheet: ExcelJS.Worksheet, title: string, headers: string[]) => {
  sheet.views = [{ rightToLeft: true }];

  sheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Arial', size: 16, bold: true };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 30;

  const headerRow = sheet.getRow(2);
  headerRow.values = headers;
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: HEADER_TEXT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: BORDER_COLOR } },
      left: { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
      right: { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  });

  return headerRow;
};

const autoFitColumns = (sheet: ExcelJS.Worksheet) => {
  sheet.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell!({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) maxLength = columnLength;
    });
    column.width = Math.min(Math.max(maxLength + 2, 12), 50);
  });
};

const applyDataStyles = (sheet: ExcelJS.Worksheet) => {
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 2) {
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: BORDER_COLOR } },
          left: { style: 'thin', color: { argb: BORDER_COLOR } },
          bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
          right: { style: 'thin', color: { argb: BORDER_COLOR } },
        };
        if (rowNumber % 2 !== 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROW_BG } };
        }
      });
    }
  });
};

export const exportFullDioceseReport = async (results: Result[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('نتائج الإيبارشية');

  const headers = ['م', 'اسم الكنيسة', 'اسم الطالب', 'المرحلة', 'التقدير', 'الحضور', 'ملاحظات'];
  applyProfessionalStyles(sheet, 'مهرجان الكرازة - إيبارشية مغاغة والعدوة', headers);

  const sortedResults = [...results].sort((a, b) => a.stage.localeCompare(b.stage));

  sortedResults.forEach((result, index) => {
    sheet.addRow([
      index + 1,
      result.churchName,
      result.studentName,
      result.stage,
      result.grade,
      result.attendance || '',
      result.notes || ''
    ]);
  });

  applyDataStyles(sheet);
  autoFitColumns(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), 'Full_Diocese_Report.xlsx');
};

export const exportChurchReport = async (churchName: string, results: Result[], orders: Order[]) => {
  const workbook = new ExcelJS.Workbook();
  
  const resultsSheet = workbook.addWorksheet('النتائج');
  const resultsHeaders = ['م', 'اسم الكنيسة', 'اسم الطالب', 'المرحلة', 'التقدير', 'الحضور', 'ملاحظات'];
  applyProfessionalStyles(resultsSheet, `نتائج كنيسة ${churchName}`, resultsHeaders);

  results.filter(r => r.churchName === churchName).forEach((result, index) => {
    resultsSheet.addRow([
      index + 1,
      result.churchName,
      result.studentName,
      result.stage,
      result.grade,
      result.attendance || '',
      result.notes || ''
    ]);
  });
  applyDataStyles(resultsSheet);
  autoFitColumns(resultsSheet);

  const ordersSheet = workbook.addWorksheet('طلبات الكتب');
  const ordersHeaders = ['المرحلة', 'الكمية المطلوبة', 'سعر الوحدة', 'الإجمالي'];
  applyProfessionalStyles(ordersSheet, `طلبات كتب كنيسة ${churchName}`, ordersHeaders);

  const churchOrders = orders.filter(o => o.churchName === churchName);
  churchOrders.forEach((order) => {
    order.details.forEach((detail) => {
      const totalQty = (detail.study || 0) + (detail.memo || 0) + (detail.coptic || 0) + (detail.activity || 0);
      if (totalQty > 0) {
        ordersSheet.addRow([
          detail.stage,
          totalQty,
          (detail.subtotal / totalQty).toFixed(2),
          detail.subtotal
        ]);
      }
    });
  });
  applyDataStyles(ordersSheet);
  autoFitColumns(ordersSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `${churchName}_Results.xlsx`);
};

export const exportParticipantsReport = async (participants: Participant[], title: string = 'بيانات المشتركين') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('المشتركين');

  const headers = ['م', 'الاسم', 'المرحلة', 'المسابقات', 'اسم الكنيسة', 'تاريخ التسجيل'];
  applyProfessionalStyles(sheet, title, headers);

  participants.forEach((p, index) => {
    sheet.addRow([
      index + 1,
      p.name,
      p.stage,
      p.competitions.join(' - '),
      p.churchName,
      new Date(p.timestamp).toLocaleDateString('ar-EG')
    ]);
  });

  applyDataStyles(sheet);
  autoFitColumns(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Participants_Report_${new Date().getTime()}.xlsx`);
};

export const exportAllDataReport = async (participants: Participant[], activityTeams: ActivityTeam[], orders: Order[]) => {
  const workbook = new ExcelJS.Workbook();
  
  // Participants Sheet
  const pSheet = workbook.addWorksheet('المشتركين');
  const pHeaders = ['م', 'اسم الكنيسة', 'البلد/القرية', 'الاسم', 'المرحلة', 'المسابقة 1', 'المسابقة 2', 'المسابقة 3', 'المسابقة 4', 'تاريخ التسجيل'];
  applyProfessionalStyles(pSheet, 'بيانات المشتركين التفصيلية', pHeaders);
  
  participants.forEach((p, index) => {
    pSheet.addRow([
      index + 1,
      p.churchName,
      p.country,
      p.name,
      p.stage,
      p.competitions[0] || '-',
      p.competitions[1] || '-',
      p.competitions[2] || '-',
      p.competitions[3] || '-',
      new Date(p.timestamp).toLocaleDateString('ar-EG')
    ]);
  });
  applyDataStyles(pSheet);
  autoFitColumns(pSheet);

  // Teams Sheet
  const tSheet = workbook.addWorksheet('فرق الأنشطة');
  const tHeaders = ['م', 'اسم الكنيسة', 'نوع النشاط', 'المستوى/الآلة', 'عدد البنين', 'عدد البنات', 'اسم العضو', 'النوع', 'المرحلة', 'تاريخ التسجيل'];
  applyProfessionalStyles(tSheet, 'بيانات فرق الأنشطة التفصيلية', tHeaders);
  
  let tIndex = 1;
  activityTeams.forEach(t => {
    t.members.forEach((m: any) => {
      tSheet.addRow([
        tIndex++,
        t.churchName,
        t.activityType,
        t.choirLevel || t.instrumentType || '-',
        t.maleCount || 0,
        t.femaleCount || 0,
        m.name,
        m.gender,
        m.stage,
        new Date(t.timestamp).toLocaleDateString('ar-EG')
      ]);
    });
  });
  applyDataStyles(tSheet);
  autoFitColumns(tSheet);

  // Orders Sheet
  const oSheet = workbook.addWorksheet('طلبات الكتب');
  const oHeaders = ['م', 'اسم الكنيسة', 'البلد/القرية', 'المرحلة', 'دراسي', 'محفوظات', 'قبطي', 'أنشطة', 'الإجمالي للمرحلة', 'الإجمالي الكلي للطلب', 'تاريخ الطلب'];
  applyProfessionalStyles(oSheet, 'بيانات طلبات الكتب التفصيلية', oHeaders);
  
  let oIndex = 1;
  orders.forEach(o => {
    o.details.forEach(d => {
      oSheet.addRow([
        oIndex++,
        o.churchName,
        o.country,
        d.stage,
        d.study || 0,
        d.memo || 0,
        d.coptic || 0,
        d.activity || 0,
        d.subtotal,
        o.grandTotal,
        new Date(o.timestamp).toLocaleDateString('ar-EG')
      ]);
    });
  });
  applyDataStyles(oSheet);
  autoFitColumns(oSheet);

  // Summary Sheet
  const sSheet = workbook.addWorksheet('ملخص الإحصائيات');
  const sHeaders = ['البيان', 'العدد/القيمة'];
  applyProfessionalStyles(sSheet, 'ملخص إحصائيات المهرجان', sHeaders);
  
  sSheet.addRow(['إجمالي عدد المشتركين', participants.length]);
  sSheet.addRow(['إجمالي عدد الفرق', activityTeams.length]);
  sSheet.addRow(['إجمالي عدد الطلبات', orders.length]);
  sSheet.addRow(['إجمالي قيمة المبيعات', orders.reduce((acc, curr) => acc + curr.grandTotal, 0)]);
  
  applyDataStyles(sSheet);
  autoFitColumns(sSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `All_Registrations_Report_${new Date().getTime()}.xlsx`);
};

export const exportResultsToExcel = async (results: Result[], title: string = 'نتائج المهرجان') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('النتائج');

  const headers = [
    'م', 
    'اسم الكنيسة', 
    'اسم الطالب', 
    'المرحلة', 
    'الدرجة الدراسية', 
    'درجة المحفوظات', 
    'درجة القبطي', 
    'درجة الأنشطة', 
    'الإجمالي', 
    'النسبة المئوية (%)',
    'التقدير'
  ];
  
  applyProfessionalStyles(sheet, title, headers);

  // Sort by score descending (Live Leaderboard)
  const sortedResults = [...results].sort((a, b) => b.score - a.score);

  sortedResults.forEach((r, index) => {
    sheet.addRow([
      index + 1,
      r.churchName,
      r.studentName,
      r.stage,
      r.academicScore || 0,
      r.memorizationScore || 0,
      r.q1Score || 0,
      r.qScore || 0,
      r.score,
      `${r.score}%`,
      r.grade
    ]);
  });

  applyDataStyles(sheet);
  autoFitColumns(sheet);

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), `Results_Report_${new Date().getTime()}.xlsx`);
};
