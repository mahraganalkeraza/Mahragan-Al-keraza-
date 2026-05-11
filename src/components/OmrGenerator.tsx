import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Download, Loader2, AlertCircle, FileScan, Users, LayoutGrid, QrCode, Search, CheckCircle2 } from 'lucide-react';
import appLogo from '../by-logo.jpeg';

const BATCH_SIZE = 500;

interface Participant {
  id: string;
  name: string;
  churchName: string;
  stage: string;
  serial?: string;
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
  
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { 
    errorCorrectionLevel: 'H', 
    margin: 4,
    width: 600,
    color: { dark: '#000000', light: '#ffffff' }
  });
  
  qrImg.src = qrDataUrl;
  qrImg.style.width = '28mm'; 
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
  await new Promise(r => setTimeout(r, 200));
  return wrapper;
};

export default function OmrGenerator() {
  const [mode, setMode] = useState<'omr' | 'qr'>('omr');
  const [churches, setChurches] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<string>('الكل');
  const [selectedStage, setSelectedStage] = useState<string>('الكل');
  const [numQuestions, setNumQuestions] = useState<number>(40);
  
  const [searchQuery, setSearchQuery] = useState('');
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
    if (mode === 'omr' && (numQuestions <= 0 || numQuestions > 120)) {
      setError("عدد الأسئلة يجب أن يكون بين 1 و 120.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      let students: Participant[] = [];
      
      if (searchQuery.trim()) {
        // Individual Search
        const participantsRef = collection(db, 'participants');
        const q = query(participantsRef, where('serial', '==', searchQuery.trim()), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) {
            // Try by ID directly as fallback
            const snap2 = await getDocs(query(participantsRef, where('id', '==', searchQuery.trim()), limit(1)));
            if (snap2.empty) {
                setError("لم يتم العثور على طالب بهذا الرقم.");
                setIsGenerating(false);
                return;
            }
            students = snap2.docs.map(d => ({ id: d.id, ...d.data() })) as Participant[];
        } else {
            students = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Participant[];
        }
      } else {
        // Filtered Search
        let conditions = [];
        if (selectedChurch !== 'الكل') conditions.push(where('churchName', '==', selectedChurch));
        if (selectedStage !== 'الكل') conditions.push(where('stage', '==', selectedStage));

        const participantsRef = collection(db, 'participants');
        const q = conditions.length > 0 ? query(participantsRef, ...conditions) : query(participantsRef);
        const snap = await getDocs(q);
        students = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Participant[];
      }

      if (mode === 'omr') {
        students = students.filter(s => /إعدادي|اعدادي|إعدادى|اعدادى|ثانوي|ثانوى|خريجين|جامعة|جامعه/i.test(s.stage));
      }

      if (students.length === 0) {
        setError("لا يوجد طلاب يطابقون خيارات البحث.");
        setIsGenerating(false);
        return;
      }

      if (mode === 'omr') {
        await generateOMRPDF(students);
      } else {
        await generateQRPDF(students);
      }

    } catch (err) {
      console.error("Error generating files:", err);
      setError("حدث خطأ أثناء الإنشاء. تأكد من ثبات الاتصال والبيانات.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateOMRPDF = async (students: Participant[]) => {
    const churchLogos = await fetchPublicChurches();
    const totalStudents = students.length;
    const totalBatchesNum = Math.ceil(totalStudents / BATCH_SIZE);
    setProgress({ current: 0, total: totalStudents, batch: 1, totalBatches: totalBatchesNum });

    for (let batchIndex = 0; batchIndex < totalBatchesNum; batchIndex++) {
      const batchList = students.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });

      for (let j = 0; j < batchList.length; j++) {
        const student = batchList[j];
        const domElement = await createOMRSheetElement(student, numQuestions, churchLogos);
        const canvas = await html2canvas(domElement, { scale: 3, useCORS: true, allowTaint: true });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        doc.addImage(imgData, 'JPEG', 0, 0, 148, 210);
        document.body.removeChild(domElement);

        if (j < batchList.length - 1) doc.addPage();
        if (j % 5 === 0) {
          setProgress(p => ({ ...p, current: (batchIndex * BATCH_SIZE) + j + 1 }));
          await new Promise(resolve => setTimeout(resolve, 0)); 
        }
      }
      setProgress(p => ({ ...p, current: Math.min((batchIndex + 1) * BATCH_SIZE, totalStudents) }));
      const timeStamp = new Date().getTime();
      doc.save(`OMR_${selectedChurch}_B${batchIndex + 1}_${timeStamp}.pdf`);
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }
  };

  const generateQRPDF = async (students: Participant[]) => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const totalStudents = students.length;
    setProgress({ current: 0, total: totalStudents, batch: 1, totalBatches: 1 });

    const cols = 4;
    const rows = 5;
    const cardWidth = 45;
    const cardHeight = 55;
    const marginX = 10;
    const marginY = 10;

    for (let i = 0; i < students.length; i++) {
        const s = students[i];
        const pageIdx = i % (cols * rows);
        const col = pageIdx % cols;
        const row = Math.floor(pageIdx / cols);

        if (i > 0 && pageIdx === 0) doc.addPage();

        const x = marginX + col * (cardWidth + 2);
        const y = marginY + row * (cardHeight + 2);

        // Card Border
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3);

        // QR
        const qrPayload = JSON.stringify({
            studentID: s.id,
            fullName: s.name,
            churchName: s.churchName,
            stage: s.stage
        });
        const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 200 });
        doc.addImage(qrDataUrl, 'PNG', x + 7.5, y + 5, 30, 30);

        // Text labels
        doc.setR2L(true);
        doc.setFontSize(8);
        doc.setFont('Arial', 'bold');
        doc.setTextColor(50, 50, 50);
        doc.text(s.name.substring(0, 25), x + cardWidth/2, y + 40, { align: 'center' });
        doc.setFontSize(6);
        doc.text(`ID: ${s.serial || s.id.substring(0, 8)}`, x + cardWidth/2, y + 44, { align: 'center' });
        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text(`${s.churchName} - ${s.stage}`, x + cardWidth/2, y + 48, { align: 'center' });

        if (i % 10 === 0) {
            setProgress(p => ({ ...p, current: i + 1 }));
            await new Promise(r => setTimeout(r, 0));
        }
    }

    setProgress(p => ({ ...p, current: totalStudents }));
    const timeStamp = new Date().getTime();
    doc.save(`Student_QRs_${selectedChurch}_${timeStamp}.pdf`);
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl max-w-5xl mx-auto mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            {mode === 'omr' ? <FileScan size={32} /> : <QrCode size={32} />}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">البابل شيت والكيو أر</h2>
            <p className="text-slate-500 font-bold mt-1">توليد أوراق الامتحانات وبطاقات التعريف الرقمية للمشتركين</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          <button 
            onClick={() => setMode('omr')} 
            className={`px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 ${mode === 'omr' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <FileScan size={18} /> بابل شيت
          </button>
          <button 
            onClick={() => setMode('qr')} 
            className={`px-6 py-2.5 rounded-xl font-black transition-all flex items-center gap-2 ${mode === 'qr' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
          >
            <QrCode size={18} /> كروت QR
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold mb-6 flex items-center gap-2 animate-shake">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-2 relative">
          <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest whitespace-nowrap overflow-hidden">
            <Search size={14} className="inline ml-1"/> بحث عن متسابق (اختياري)
          </label>
          <div className="relative">
            <input 
                type="text"
                placeholder="أدخل كود الطالب لاستخراج كارت منفرد..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
            <Users size={14} className="inline ml-1"/> الكنيسة
          </label>
          <select 
            disabled={!!searchQuery}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
            value={selectedChurch}
            onChange={(e) => setSelectedChurch(e.target.value)}
          >
            <option value="الكل">جميع الكنائس</option>
            {churches.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
            <LayoutGrid size={14} className="inline ml-1"/> المرحلة
          </label>
          <select 
            disabled={!!searchQuery}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="الكل">كل المراحل</option>
            {levels.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {mode === 'omr' ? (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl mb-8">
           <div className="flex items-center gap-3 mb-4">
              <LayoutGrid className="text-indigo-600" size={24}/>
              <h4 className="font-black text-indigo-800">إعدادات ورقة الإجابة</h4>
           </div>
           <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 w-full">
                <label className="block text-sm font-bold text-indigo-600 mb-2">إجمالي عدد الأسئلة (من 1 إلى 120)</label>
                <input 
                    type="number" 
                    className="w-full p-4 bg-white border border-indigo-200 rounded-xl font-bold focus:ring-2 focus:ring-primary outline-none"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                />
              </div>
              <div className="flex-[2] text-sm font-bold text-indigo-500 leading-relaxed">
                 ورقة A5 عالية الدقة، تحتوي على 4 نقاط معايرة ميكانيكية وQR كود مدمج للتعرف الفوري على هوية المتسابق. 
                 <span className="block mt-1 text-xs text-indigo-400 opacity-80">* مخصص لمرحلة إعدادي فما فوق فقط.</span>
              </div>
           </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl mb-8 flex items-start gap-4">
           <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
             <QrCode size={24} />
           </div>
           <div>
             <h4 className="font-black text-emerald-800">توليد بطاقات تعريف المسابقين (QR Cards)</h4>
             <p className="text-sm font-bold text-emerald-600 mt-1">توليد ملف PDF جاهز للطباعة يحتوي على شبكة من الكروت التعريفية. كل كارت يحتوي على QR كود يحمل هوية الطالب المشفرة لاستخدامها في بوابة الامتحانات.</p>
             <div className="flex gap-4 mt-3">
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700/60 bg-emerald-700/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10}/> Grid 4x5
                </span>
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700/60 bg-emerald-700/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={10}/> high resolution
                </span>
             </div>
           </div>
        </div>
      )}

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
              جاري معالجة البيانات وتوليد الملفات... 
            </span>
            <span> {progress.current} من {progress.total}</span>
          </div>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          className={`w-full text-white p-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl hover:-translate-y-1 ${mode === 'omr' ? 'bg-indigo-600 hover:shadow-indigo-200' : 'bg-emerald-600 hover:shadow-emerald-200'}`}
        >
          <Download size={24} /> 
          {mode === 'omr' ? 'بناء وتحميل كراسات البابل شيت' : 'استخراج وتوليد كروت الـ QR للمتسابقين'}
        </button>
      )}
    </div>
  );
}

