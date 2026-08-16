import { ColumnDefinition } from '../components/ExportColumnSelector';

export const printDataTable = (data: any[], columns: ColumnDefinition[], title: string, subtitle?: string) => {
  const printWindow = window.open('', '_blank', 'height=800,width=1000');
  
  if (!printWindow) {
    alert("الرجاء السماح بالنوافذ المنبثقة (Popups) لهذه الصفحة لعرض شاشة الطباعة.");
    return;
  }

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const headersHTML = columns
    .map(c => `<th style="padding: 12px; border: 1px solid #cbd5e1; background: #f8fafc; font-weight: bold; color: #334155; text-align: right;">${c.label}</th>`)
    .join('');

  const rowsHTML = data.map((item, index) => {
    return `<tr style="${index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
      ${columns.map(col => {
        let val = item[col.key];
        if (val === null || val === undefined) val = '-';
        return `<td style="padding: 10px 12px; border: 1px solid #cbd5e1; color: #475569;">${val}</td>`;
      }).join('')}
    </tr>`;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          
          body { 
            font-family: 'Cairo', system-ui, -apple-system, sans-serif; 
            margin: 40px; 
            color: #0f172a;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .header h1 {
            font-size: 24px;
            font-weight: 900;
            margin: 0 0 10px 0;
            color: #0f172a;
          }
          
          .header p {
            margin: 0;
            color: #64748b;
            font-size: 14px;
          }

          .meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
            margin-top: 10px;
          }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 13px; 
            page-break-inside: auto;
          }
          
          tr { 
            page-break-inside: avoid; 
            page-break-after: auto; 
          }
          
          thead { 
            display: table-header-group; 
          }

          @media print {
            body { 
              margin: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none;
            }
            @page {
              margin: 1.5cm;
              size: auto;
            }
          }
          
          .print-button {
            display: block;
            width: fit-content;
            margin: 0 auto 30px auto;
            padding: 12px 30px;
            background: #0f172a;
            color: white;
            border: none;
            border-radius: 8px;
            font-family: 'Cairo', sans-serif;
            font-weight: 700;
            font-size: 16px;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          }
          .print-button:hover { background: #1e293b; }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center;">
          <button class="print-button" onclick="window.print()">طباعة كملف PDF / طابعة</button>
        </div>
        
        <div class="header">
          <h1>${title}</h1>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
          <div class="meta">
            <span>تاريخ الإصدار: ${currentDate}</span>
            <span>إجمالي السجلات: ${data.length}</span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>${headersHTML}</tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
        
        <script>
          // Auto-trigger print dialog after styles apply
          window.onload = function() {
            setTimeout(() => {
              window.print();
            }, 800);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
