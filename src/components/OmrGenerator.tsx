import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Download, Loader2, AlertCircle, FileScan, Users, LayoutGrid } from 'lucide-react';

const BATCH_SIZE = 500;

interface Participant {
  id: string;
  name: string;
  churchName: string;
  stage: string;
}

/**
 * High-quality canvas generator for rendering perfect connected Arabic in jsPDF.
 */
function createArabicTextDataURL(text: string, fontSizePx: number = 40): { dataUrl: string, widthMm: number, heightMm: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { dataUrl: '', widthMm: 0, heightMm: 0 };

  const fontStr = `bold ${fontSizePx}px Arial, Tahoma, 'sans-serif'`;
  ctx.font = fontStr;
  const textWidth = Math.ceil(ctx.measureText(text).width);
  const textHeight = Math.ceil(fontSizePx * 1.5);

  canvas.width = textWidth + 30; // Horizontal padding
  canvas.height = textHeight + 20; // Vertical padding

  ctx.font = fontStr;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw perfectly centered in the virtual canvas
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return {
    dataUrl: canvas.toDataURL('image/png', 1.0),
    // Standard pixel to mm conversion mapping at 96 dpi
    widthMm: canvas.width * 0.264583,
    heightMm: canvas.height * 0.264583
  };
}

export default function OmrGenerator() {
  const [churches, setChurches] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<string>('الكل');
  const [selectedStage, setSelectedStage] = useState<string>('الكل');
  const [numQuestions, setNumQuestions] = useState<number>(40);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, batch: 0, totalBatches: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDynamics = async () => {
      try {
        const churchesSnap = await getDocs(collection(db, 'churches'));
        setChurches(churchesSnap.docs.map(doc => doc.data().name).filter(Boolean));

        const levelsSnap = await getDocs(collection(db, 'levels'));
        setLevels(levelsSnap.docs.map(doc => doc.data().name).filter(Boolean));
      } catch (err) {
        console.error("Error fetching dynamics:", err);
      }
    };
    fetchDynamics();
  }, []);

  const handleGenerate = async () => {
    if (numQuestions <= 0 || numQuestions > 120) {
      setError("عدد الأسئلة يجب أن يكون بين 1 و 120.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      let conditions = [];
      if (selectedChurch !== 'الكل') {
        conditions.push(where('churchName', '==', selectedChurch));
      }
      if (selectedStage !== 'الكل') {
        conditions.push(where('stage', '==', selectedStage));
      }

      const participantsRef = collection(db, 'participants');
      const q = conditions.length > 0 ? query(participantsRef, ...conditions) : query(participantsRef);
      
      const snap = await getDocs(q);
      const students = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'بدون اسم',
        churchName: doc.data().churchName || 'غير محدد',
        stage: doc.data().stage || 'غير محدد'
      })) as Participant[];

      if (students.length === 0) {
        setError("لا يوجد طلاب يطابقون خيارات البحث.");
        setIsGenerating(false);
        return;
      }

      const totalStudents = students.length;
      const totalBatchesNum = Math.ceil(totalStudents / BATCH_SIZE);
      setProgress({ current: 0, total: totalStudents, batch: 1, totalBatches: totalBatchesNum });

      for (let batchIndex = 0; batchIndex < totalBatchesNum; batchIndex++) {
        const batchList = students.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

        for (let j = 0; j < batchList.length; j++) {
          const student = batchList[j];

          // ==========================================
          // A. DRAW FORMSCANNER ANCHORS
          // ==========================================
          doc.setFillColor(0, 0, 0); // Solid black
          const mSize = 8;
          doc.rect(10, 10, mSize, mSize, 'F'); // Top-Left
          doc.rect(210 - 10 - mSize, 10, mSize, mSize, 'F'); // Top-Right
          doc.rect(10, 297 - 10 - mSize, mSize, mSize, 'F'); // Bottom-Left
          doc.rect(210 - 10 - mSize, 297 - 10 - mSize, mSize, mSize, 'F'); // Bottom-Right

          // ==========================================
          // B. GENERATE QR CODE
          // ==========================================
          const qrPayload = JSON.stringify({
            id: student.id,
            n: student.name,
            c: student.churchName,
            l: student.stage
          });

          const qrDataUrl = await QRCode.toDataURL(qrPayload, { 
            errorCorrectionLevel: 'H', 
            margin: 0,
            scale: 5
          });
          const qrSize = 30; // Large and readable
          const qrX = 210 - 15 - qrSize; // Top-Right, slightly inside the anchor
          const qrY = 22;
          doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

          // ==========================================
          // C. HUMAN READABLE INFO
          // ==========================================
          const nameData = createArabicTextDataURL(student.name, 54);
          if (nameData.dataUrl) {
            const drawX = (210 - nameData.widthMm) / 2;
            doc.addImage(nameData.dataUrl, 'PNG', drawX, 20, nameData.widthMm, nameData.heightMm);
          }

          const detailsData = createArabicTextDataURL(`(${student.churchName} - ${student.stage})`, 32);
          if (detailsData.dataUrl) {
            const drawX = (210 - detailsData.widthMm) / 2;
            doc.addImage(detailsData.dataUrl, 'PNG', drawX, 36, detailsData.widthMm, detailsData.heightMm);
          }

          // ==========================================
          // D. DYNAMIC OMR GRID GENERATION (WITH SYMMETRY)
          // ==========================================
          let maxCols = 2;
          if (numQuestions > 60) maxCols = 3;
          if (numQuestions <= 20) maxCols = 1;

          const totalRows = Math.ceil(numQuestions / maxCols);
          const colWidth = 55; // Spread columns nicely
          const startX = 105 - ((maxCols * colWidth) / 2); // Perfectly center the grid horizontally

          // Vertical Distribution
          const availableHeight = 200; // Total height reserved for the grid
          let rowHeight = availableHeight / Math.max(totalRows, 1);
          
          // Cap the row height so bubbles don't look awkwardly separated if questions are few
          const maxRowHeight = 12;
          if (rowHeight > maxRowHeight) {
             rowHeight = maxRowHeight;
          }
          
          const gridTotalHeight = rowHeight * Math.max(totalRows, 1);
          const startY = 60 + (availableHeight - gridTotalHeight) / 2; // Center vertically within the available space
          
          doc.setLineWidth(0.35); // Slightly thicker stroke for bubbles
          
          for (let q = 1; q <= numQuestions; q++) {
            const rowIndex = Math.floor((q - 1) / maxCols);
            const colIndex = (q - 1) % maxCols;

            const cx = startX + (colIndex * colWidth);
            const cy = startY + (rowIndex * rowHeight);

            // Print Question Number
            doc.setFontSize(10);
            doc.text(`${q}.`, cx, cy + 1, { align: 'right' }); // Right align numbers for cleaner look

            // Print Accurate Answer Bubbles
            const bubbleSpacing = 8; // Extra padding between bubbles
            const options = ['A', 'B', 'C', 'D'];
            options.forEach((opt, oIdx) => {
              const bX = cx + 4 + (oIdx * bubbleSpacing);
              const bY = cy - 0.5;
              doc.circle(bX, bY, 2.5, 'S'); // Larger radius
              
              doc.setFontSize(7.5);
              doc.text(opt, bX, bY + 1.2, { align: 'center' }); // Centered internal letters
            });
          }

          // ==========================================
          // E. VERTICAL TIMING MARKS (FormScanner Sync)
          // ==========================================
          doc.setFillColor(0, 0, 0);
          const timingMarkX = 210 - 12; // Far right edge row
          for (let r = 0; r < totalRows; r++) {
            const rowY = startY + (r * rowHeight) - 1.5;
            doc.rect(timingMarkX, rowY, 5, 2.5, 'F'); // Substantial solid rectangles
          }

          if (j < batchList.length - 1) {
            doc.addPage();
          }

          if (j % 5 === 0) {
            setProgress(p => ({ ...p, current: (batchIndex * BATCH_SIZE) + j + 1 }));
            await new Promise(resolve => setTimeout(resolve, 0)); 
          }
        }

        setProgress(p => ({ ...p, current: Math.min((batchIndex + 1) * BATCH_SIZE, totalStudents) }));

        // Use standard browser file download
        const timeStamp = new Date().getTime();
        const fileName = `OMR_${selectedChurch === 'الكل' ? 'All' : selectedChurch}_Q${numQuestions}_B${batchIndex + 1}_${timeStamp}.pdf`;
        doc.save(fileName);
        
        await new Promise(resolve => setTimeout(resolve, 500)); 
      }

    } catch (err) {
      console.error("Error generating OMR:", err);
      setError("حدث خطأ أثناء الإنشاء. تأكد من أن الذاكرة كافية وأن البيانات صحيحة.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-4xl mx-auto mt-8">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <FileScan size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">مولد البابل شيت الديناميكي</h2>
          <p className="text-slate-500 font-bold mt-1">توليد أوراق الامتحانات مخصصة التخطيط تلقائياً</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
            <Users size={16}/> استهداف كنيسة معينة
          </label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            value={selectedChurch}
            onChange={(e) => setSelectedChurch(e.target.value)}
          >
            <option value="الكل">جميع الكنائس (حزم 500 طالب)</option>
            {churches.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
            <Users size={16}/> استهداف مرحلة معينة
          </label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="الكل">كل المراحل</option>
            {levels.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
            <LayoutGrid size={16}/> عدد الأسئلة
          </label>
          <input 
            type="number" 
            min="1"
            max="120"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            placeholder="مثال: 40"
          />
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl mb-8 flex flex-col gap-2">
        <h4 className="font-black text-indigo-800 flex items-center gap-2 mb-1">
          <FileScan size={18} /> تخطيط متناسق متكيف لـ {numQuestions} سؤال
        </h4>
        <ul className="list-disc pl-5 rtl:pr-5 text-sm font-bold text-indigo-600 space-y-1">
          <li><strong>معمارية رياضية:</strong> يتم توزيع الأسئلة في أعمدة متساوية استناداً إلى العدد، لتوسيط النطاق كلياً.</li>
          <li><strong>تناسب المسافات:</strong> تزداد مساحة الأسطر تلقائياً لتغطية ورقة الـ A4 بشكل مريح للعين إذا كان عدد الأسئلة يسيراً.</li>
          <li>يتم حقن اسم الطالب و إعداداته في <strong>شفرة QR</strong> عالية التباين يميناً: <code className="bg-white px-2 py-0.5 rounded text-xs">{"{"}id, n, c, l{"}"}</code>.</li>
        </ul>
      </div>

      {isGenerating ? (
        <div className="space-y-4">
          <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden relative">
            <div 
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(progress.current / Math.max(progress.total, 1)) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-sm font-black text-slate-500">
            <span className="flex items-center gap-2 text-primary">
              <Loader2 className="animate-spin" size={16} /> 
              جاري توليد الملفات... 
            </span>
            <span>طالب {progress.current} من {progress.total}</span>
          </div>
          <p className="text-center text-xs font-bold text-slate-400 mt-2">
            جاري حفظ الحزمة {progress.batch} من {progress.totalBatches}
          </p>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          className="w-full bg-primary text-white p-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-xl hover:shadow-primary/20 hover:-translate-y-1"
        >
          <Download size={24} /> بناء وتحميل كراسات الإجابة (بابل شيت)
        </button>
      )}
    </div>
  );
}
