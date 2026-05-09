import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Download, Loader2, AlertCircle, FileScan, Users, LayoutGrid } from 'lucide-react';
import appLogo from '../by-logo.jpeg';

const BATCH_SIZE = 500;

interface Participant {
  id: string;
  name: string;
  churchName: string;
  stage: string;
}

const preloadImage = (src: string): Promise<string> => {
  return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(src);
      img.onerror = () => resolve(appLogo);
      img.src = src;
  });
};

const fetchPublicChurches = async () => {
  try {
      const snap = await getDocs(collection(db, 'public_churches'));
      const logos: Record<string, string> = {};
      snap.forEach(doc => {
          const data = doc.data();
          if (data.name && data.logoUrl) {
              logos[data.name] = data.logoUrl;
          }
      });
      return logos;
  } catch {
      return {};
  }
};

const createOMRSheetElement = async (
  student: Participant, 
  numQuestions: number, 
  churchLogos: Record<string, string>
) => {
  const wrapper = document.createElement('div');
  wrapper.style.width = '148mm';
  wrapper.style.height = '210mm';
  wrapper.style.backgroundColor = 'white';
  wrapper.style.position = 'fixed'; // offscreen
  wrapper.style.top = '-9999px';
  wrapper.style.left = '-9999px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.fontFamily = 'Arial, sans-serif';
  wrapper.style.zIndex = '-9999';

  // 4 Corner Anchor Points (Timing Marks) - black squares 8mm
  const anchorSize = '8mm';
  const anchors = [
      { top: '10mm', left: '10mm' },
      { top: '10mm', right: '10mm' },
      { bottom: '10mm', left: '10mm' },
      { bottom: '10mm', right: '10mm' }
  ];
  anchors.forEach(pos => {
      const mark = document.createElement('div');
      mark.style.position = 'absolute';
      mark.style.width = anchorSize;
      mark.style.height = anchorSize;
      mark.style.backgroundColor = 'black';
      if (pos.top) mark.style.top = pos.top;
      if (pos.left) mark.style.left = pos.left;
      if (pos.right) mark.style.right = pos.right;
      if (pos.bottom) mark.style.bottom = pos.bottom;
      wrapper.appendChild(mark);
  });

  // Header Area
  const header = document.createElement('div');
  header.style.position = 'absolute';
  header.style.top = '10mm';
  header.style.left = '25mm';
  header.style.right = '25mm';
  header.style.height = '35mm';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';

  const chLogoSrc = churchLogos[student.churchName] || appLogo;
  const verifiedLogoSrc = await preloadImage(chLogoSrc);

  const logoImg = document.createElement('img');
  logoImg.src = verifiedLogoSrc;
  logoImg.crossOrigin = 'anonymous';
  logoImg.style.maxHeight = '25mm';
  logoImg.style.maxWidth = '35mm';
  logoImg.style.objectFit = 'contain';
  header.appendChild(logoImg);

  const qrImg = document.createElement('img');
  const qrPayload = JSON.stringify({
    id: student.id,
    name: student.name,
    church: student.churchName,
    stage: student.stage
  });
  
  // Set width to 600 for high resolution source, margin 4 for quiet zone, EC Level H for 30% recovery
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { 
    errorCorrectionLevel: 'H', 
    margin: 4,
    width: 600,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
  
  qrImg.src = qrDataUrl;
  qrImg.style.width = '28mm'; // Slightly larger for better readability of high-density QR
  qrImg.style.height = '28mm';
  header.appendChild(qrImg);

  wrapper.appendChild(header);

  // Student Info Area
  const infoBlock = document.createElement('div');
  infoBlock.style.position = 'absolute';
  infoBlock.style.top = '48mm';
  infoBlock.style.left = '20mm';
  infoBlock.style.right = '20mm';
  infoBlock.style.textAlign = 'center';
  infoBlock.style.direction = 'rtl';
  
  const nameTitle = document.createElement('h2');
  nameTitle.innerText = student.name;
  nameTitle.style.margin = '0 0 5px 0';
  nameTitle.style.fontSize = '32px';
  nameTitle.style.fontWeight = 'bold';
  infoBlock.appendChild(nameTitle);

  const stageChurch = document.createElement('h4');
  stageChurch.innerText = `${student.churchName} - ${student.stage}`;
  stageChurch.style.margin = '0';
  stageChurch.style.fontSize = '20px';
  stageChurch.style.color = '#333';
  infoBlock.appendChild(stageChurch);
  
  wrapper.appendChild(infoBlock);

  // Dynamic OMR Grid
  const tableContainer = document.createElement('div');
  tableContainer.style.position = 'absolute';
  tableContainer.style.top = '75mm';
  tableContainer.style.left = '18mm';
  tableContainer.style.right = '12mm'; 
  tableContainer.style.display = 'flex';
  tableContainer.style.flexDirection = 'column';

  let maxCols = 2;
  if (numQuestions > 60) maxCols = 3;
  if (numQuestions <= 20) maxCols = 1;

  const rowCount = Math.ceil(numQuestions / maxCols);
  const availableHeightMm = 110; 
  const rowHeight = Math.min(availableHeightMm / rowCount, 12);

  for (let r = 0; r < rowCount; r++) {
      const rowDiv = document.createElement('div');
      rowDiv.style.height = `${rowHeight}mm`;
      rowDiv.style.display = 'flex';
      rowDiv.style.flexDirection = 'row-reverse';
      rowDiv.style.alignItems = 'center';
      rowDiv.style.justifyContent = 'space-between';
      
      const tmWrap = document.createElement('div');
      tmWrap.style.width = '6mm';
      tmWrap.style.display = 'flex';
      tmWrap.style.justifyContent = 'flex-end';
      
      const tm = document.createElement('div');
      tm.style.width = '6mm';
      tm.style.height = '3.5mm';
      tm.style.backgroundColor = 'black';
      tmWrap.appendChild(tm);
      rowDiv.appendChild(tmWrap);
      
      const qWrap = document.createElement('div');
      qWrap.style.flex = '1';
      qWrap.style.display = 'flex';
      qWrap.style.flexDirection = 'row-reverse';
      qWrap.style.justifyContent = 'space-around';
      qWrap.style.marginRight = '10mm';

      for (let c = 0; c < maxCols; c++) {
          const q = r * maxCols + c + 1;
          const qContainer = document.createElement('div');
          qContainer.style.display = 'flex';
          qContainer.style.alignItems = 'center';
          qContainer.style.direction = 'ltr';
          qContainer.style.gap = '8px';
          qContainer.style.visibility = q <= numQuestions ? 'visible' : 'hidden'; 
          
          const qNum = document.createElement('span');
          qNum.innerText = `${q}.`;
          qNum.style.fontSize = '16px';
          qNum.style.fontWeight = 'bold';
          qNum.style.width = '24px';
          qNum.style.textAlign = 'right';
          qContainer.appendChild(qNum);

          ['A', 'B', 'C', 'D'].forEach(opt => {
              const bubble = document.createElement('div');
              bubble.style.width = '24px';
              bubble.style.height = '24px';
              bubble.style.borderRadius = '50%';
              bubble.style.border = '2.5px solid black';
              bubble.style.display = 'flex';
              bubble.style.alignItems = 'center';
              bubble.style.justifyContent = 'center';
              bubble.style.fontSize = '12px';
              bubble.style.fontWeight = 'bold';
              bubble.innerText = opt;
              qContainer.appendChild(bubble);
          });
          qWrap.appendChild(qContainer);
      }
      rowDiv.appendChild(qWrap);
      tableContainer.appendChild(rowDiv);
  }
  
  wrapper.appendChild(tableContainer);
  document.body.appendChild(wrapper);
  
  // Brief delay to ensure fonts/layout are fully settled
  await new Promise(r => setTimeout(r, 200));
  
  return wrapper;
};

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

      const churchLogos = await fetchPublicChurches();

      const totalStudents = students.length;
      const totalBatchesNum = Math.ceil(totalStudents / BATCH_SIZE);
      setProgress({ current: 0, total: totalStudents, batch: 1, totalBatches: totalBatchesNum });

      for (let batchIndex = 0; batchIndex < totalBatchesNum; batchIndex++) {
        const batchList = students.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });

        for (let j = 0; j < batchList.length; j++) {
          const student = batchList[j];

          // Create standard DOM element representing the A5 sheet
          const domElement = await createOMRSheetElement(student, numQuestions, churchLogos);

          // Render DOM element to high-res 300 DPI Canvas
          const canvas = await html2canvas(domElement, { scale: 3, useCORS: true, allowTaint: true });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          
          // Add generated image exactly mapping to A5 dimensions
          doc.addImage(imgData, 'JPEG', 0, 0, 148, 210);

          // Cleanup DOM element
          document.body.removeChild(domElement);

          if (j < batchList.length - 1) {
            doc.addPage();
          }

          if (j % 5 === 0) {
            setProgress(p => ({ ...p, current: (batchIndex * BATCH_SIZE) + j + 1 }));
            await new Promise(resolve => setTimeout(resolve, 0)); 
          }
        }

        setProgress(p => ({ ...p, current: Math.min((batchIndex + 1) * BATCH_SIZE, totalStudents) }));

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
          <p className="text-slate-500 font-bold mt-1">توليد أوراق الامتحانات مخصصة التخطيط تلقائياً بجودة 300 DPI</p>
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
          <FileScan size={18} /> تخطيط متناسق لـ {numQuestions} سؤال A5 High-Res (300 DPI)
        </h4>
        <ul className="list-disc pl-5 rtl:pr-5 text-sm font-bold text-indigo-600 space-y-1">
          <li><strong>معمارية رياضية:</strong> يتم توزيع الأسئلة في أعمدة متساوية استناداً إلى العدد، لتوسيط النطاق كلياً.</li>
          <li><strong>المحاذاة الميكانيكية:</strong> توفير 4 نقاط ارتكاء حادة (Reference Marks) لتوجيه برامج الماسح الضوئي (FormScanner) بشكل موثوق.</li>
          <li>يتم حقن بيانات الطالب الكاملة (JSON) في <strong>شفرة QR</strong> معيارية (Level H) يميناً، لسهولة وسرعة التعرّف على الطالب الكترونياً عبر محركات OMR.</li>
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
              جاري توليد الملفات بدقة 300 DPI... 
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

