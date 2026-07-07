import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
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
  studentName?: string;
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
      const { data, error } = await supabase.from('churches').select('name, logoUrl').range(0, 4999);
      if (error) throw error;
      const logos: Record<string, string> = {};
      data?.forEach(row => {
          if (row.name && row.logoUrl) {
              logos[row.name] = row.logoUrl;
          }
      });
      return logos;
  } catch {
      return {};
  }
};

const getChurchCode = (churchName: string, databaseChurches?: any[]): string => {
  const cleanName = (churchName || '').trim();
  if (!cleanName) return '';

  if (databaseChurches && databaseChurches.length > 0) {
    const foundDb = databaseChurches.find(c => (c.name || '').trim().toLowerCase() === cleanName.toLowerCase());
    if (foundDb) {
      return foundDb.loginCode || foundDb.code || String(foundDb.id);
    }
  }

  const CHURCH_CREDENTIALS: Record<string, string> = {
    "العباسية": "Lk2*951",
    "المطرانية": "Vp7@385",
    "نزلة عصر": "Zw2#398",
    "المداور": "Kf1@638",
    "نزلة رمضان": "Nb7_264",
    "البسقلون": "Rt5#930",
    "عباد شارونة": "Mx2@901",
    "علي باشا": "Js3@452",
    "عزبة رزق": "Kz5#259",
    "صفانية": "Dx1#924",
    "الملاك ميخائيل - مغاغة": "Km1@245",
    "عزبة بطرس": "Tr4#739",
    "قصر لملوم": "Lk5_441",
    "بني عامر": "Vz1#827",
    "قفادة": "Jh4_333",
    "عزبة سمعان": "Ty3@682",
    "بلهاسة": "Bn6#218",
    "بني خالد": "Xj7*195",
    "شارونة": "Bm1*627",
    "الشيخ زياد": "Dp2#118",
    "أبو غطاس": "Xj9_803",
    "طنبدي": "Jn5#572",
    "ميانة": "Lk9*118",
    "صعايدة الكوم الأخضر": "Qw9_106",
    "الشيخ مسعود": "Sm7_134",
    "كفر عبد الخالق": "Vn4@538",
    "عطف حيدر": "Gx6_193",
    "عزبة مهدي": "Kf4#819",
    "الكوم الأخضر": "Bf3#614",
    "الجزيرة": "Np8_423",
    "شم القبلية": "Mr8*508",
    "مارمينا مغاغة": "Gh8_682",
    "برطباط": "Bt4@717",
    "عزبة إسحق": "Rf1*860",
    "صعايدة الساوي": "Tp2#742",
    "العذراء مغاغة": "Gh9*515",
    "شمس الدين": "Rt8*485",
    "آبا البلد": "Jn2@551",
    "دهروط": "Ts6*304",
    "الساوي": "Lv6*373",
    "بني واللمس": "Xz8_402",
    "كوم الحاصل": "Tr8*704",
    "دير الجرنوس": "Rf5#472",
    "الزورة": "Wq3#490",
    "إشنين": "Mb4@952",
    "إبراهيم عبد السيد": "Qw4@316",
    "القديسة دميانة": "Vz9@624",
    "برمشا": "Wq2@714",
    "القايات": "Zw7*291",
    "محمد بيه": "Bt3*815",
    "العدوة": "Vp3_726"
  };

  if (CHURCH_CREDENTIALS[cleanName]) {
    return CHURCH_CREDENTIALS[cleanName];
  }

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const numericCode = Math.abs(hash % 10000).toString().padStart(4, '0');
  return `CH-${numericCode}`;
};

const createOMRSheetElement = async (
  student: Participant, 
  numQuestions: number, 
  churchLogos: Record<string, string>,
  rawChurches?: any[]
) => {
  const wrapper = document.createElement('div');
  wrapper.style.width = '210mm';
  wrapper.style.height = '297mm';
  wrapper.style.backgroundColor = 'white';
  wrapper.style.position = 'fixed'; // offscreen
  wrapper.style.top = '-9999px';
  wrapper.style.left = '-9999px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.fontFamily = 'Arial, sans-serif';
  wrapper.style.zIndex = '-9999';

  const style = document.createElement('style');
  style.innerHTML = `@media print { @page { size: A4 portrait; margin: 0; } }`;
  wrapper.appendChild(style);

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
  const qrPayload = student.id.toString();
  
  // Use SVG for infinite resolution and optimized settings for scanning
  const svgString = await QRCode.toString(qrPayload, {
    type: 'svg',
    errorCorrectionLevel: 'L',
    margin: 4,
    width: 256,
    color: { dark: '#000000', light: '#ffffff' }
  });
  const qrDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
  
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
  nameTitle.style.fontSize = '20px';
  nameTitle.style.fontWeight = 'bold';
  infoBlock.appendChild(nameTitle);

  const stageChurch = document.createElement('h4');
  stageChurch.innerText = `${student.churchName} - ${student.stage}`;
  stageChurch.style.margin = '0';
  stageChurch.style.fontSize = '16px';
  stageChurch.style.color = '#333';
  infoBlock.appendChild(stageChurch);
  
  wrapper.appendChild(infoBlock);

  // Dynamic OMR Grid
  const tableContainer = document.createElement('div');
  tableContainer.style.position = 'absolute';
  tableContainer.style.top = '75mm';
  tableContainer.style.left = '30mm';
  tableContainer.style.right = '30mm'; 
  
  const layoutWrapper = document.createElement('div');
  layoutWrapper.className = 'flex flex-row justify-center gap-12 w-full max-w-[150mm] mx-auto';
  layoutWrapper.dir = 'rtl';
  
  const columnsWrapper = document.createElement('div');
  columnsWrapper.className = 'flex flex-row gap-8 md:gap-12';
  
  const questionsPerColumn = 10;
  const numColumns = Math.ceil(numQuestions / questionsPerColumn);
  const rowsInColumn = Math.min(numQuestions, questionsPerColumn);
  
  const availableHeightMm = 110; 
  const rowHeight = Math.min(availableHeightMm / rowsInColumn, 12);

  for (let c = 0; c < numColumns; c++) {
      const colDiv = document.createElement('div');
      colDiv.className = 'flex flex-col space-y-2';
      
      const startQ = c * questionsPerColumn + 1;
      const endQ = Math.min((c + 1) * questionsPerColumn, numQuestions);
      
      for (let q = startQ; q <= endQ; q++) {
          const qContainer = document.createElement('div');
          qContainer.style.display = 'flex';
          qContainer.style.alignItems = 'center';
          qContainer.style.direction = 'ltr';
          qContainer.style.gap = '8px';
          qContainer.style.height = `${rowHeight}mm`;
          
          const qNum = document.createElement('span');
          qNum.innerText = `${q}.`;
          qNum.style.fontSize = '16px';
          qNum.style.fontWeight = 'bold';
          qNum.style.width = '24px';
          qNum.style.textAlign = 'right';
          qContainer.appendChild(qNum);

          ['أ', 'ب', 'ج'].forEach(opt => {
              const bubble = document.createElement('div');
              bubble.style.width = '24px';
              bubble.style.height = '24px';
              bubble.style.borderRadius = '50%';
              bubble.style.border = '2.5px solid black';
              bubble.style.display = 'flex';
              bubble.style.alignItems = 'center';
              bubble.style.justifyContent = 'center';
              bubble.style.fontSize = '8px';
              bubble.style.fontWeight = 'bold';
              bubble.innerText = opt;
              qContainer.appendChild(bubble);
          });
          colDiv.appendChild(qContainer);
      }
      columnsWrapper.appendChild(colDiv);
  }
  
  const tmColumn = document.createElement('div');
  tmColumn.className = 'flex flex-col space-y-2';
  
  for (let r = 0; r < rowsInColumn; r++) {
      const tmWrap = document.createElement('div');
      tmWrap.style.height = `${rowHeight}mm`;
      tmWrap.style.width = '6mm';
      tmWrap.style.display = 'flex';
      tmWrap.style.alignItems = 'center';
      tmWrap.style.justifyContent = 'flex-end';
      
      const tm = document.createElement('div');
      tm.style.width = '6mm';
      tm.style.height = '3.5mm';
      tm.style.backgroundColor = 'black';
      
      tmWrap.appendChild(tm);
      tmColumn.appendChild(tmWrap);
  }
  
  layoutWrapper.appendChild(tmColumn);
  layoutWrapper.appendChild(columnsWrapper);
  tableContainer.appendChild(layoutWrapper);
  
  wrapper.appendChild(tableContainer);
  document.body.appendChild(wrapper);
  await new Promise(r => setTimeout(r, 200));
  return wrapper;
};

const createQRCardPageElement = async (students: Participant[], rawChurches?: any[]) => {
  const wrapper = document.createElement('div');
  wrapper.style.width = '210mm'; 
  wrapper.style.height = '297mm'; 
  wrapper.style.backgroundColor = 'white';
  wrapper.style.position = 'fixed'; 
  wrapper.style.top = '-9999px';
  wrapper.style.left = '-9999px';
  wrapper.style.opacity = '1';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.padding = '10mm 10mm';
  wrapper.style.display = 'flex';
  wrapper.style.flexWrap = 'wrap';
  wrapper.style.justifyContent = 'space-between';
  wrapper.style.alignContent = 'flex-start';
  wrapper.style.gap = '0';
  wrapper.style.direction = 'rtl';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.fontFamily = "'Cairo', sans-serif";
  wrapper.style.zIndex = '-9999';

  const style = document.createElement('style');
  style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
    #qr-card-wrapper * { 
      font-family: 'Cairo', sans-serif !important; 
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .card-item {
      border: 0.5px solid #cbd5e1;
      border-right: 0.5px dashed #94a3b8;
      border-bottom: 0.5px dashed #94a3b8;
    }
  `;
  wrapper.id = 'qr-card-wrapper';
  wrapper.appendChild(style);

  // Buffer for fonts
  await document.fonts.ready;
  await new Promise(r => setTimeout(r, 1500));

  for (const s of students) {
    const card = document.createElement('div');
    card.className = 'card-item';
    card.style.padding = '2mm';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between';
    card.style.backgroundColor = 'white';
    card.style.boxSizing = 'border-box';
    card.style.overflow = 'hidden';
    card.style.height = '53.4mm';
    card.style.width = '47.5mm';
    card.style.position = 'relative';

    // QR Section (approx 50% height)
    const qrContainer = document.createElement('div');
    qrContainer.style.display = 'flex';
    qrContainer.style.justifyContent = 'center';
    qrContainer.style.alignItems = 'center';
    qrContainer.style.height = '28mm';
    qrContainer.style.width = '100%';

    const qrImg = document.createElement('img');
    const qrPayload = s.id.toString();
    // Optimized QR for scanability and print resolution
    const svgString = await QRCode.toString(qrPayload, {
        type: 'svg',
        errorCorrectionLevel: 'L',
        margin: 4,
        width: 256,
        color: { dark: '#000000', light: '#ffffff' }
    });
    qrImg.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    qrImg.style.height = '26mm';
    qrImg.style.width = '26mm';
    qrContainer.appendChild(qrImg);
    card.appendChild(qrContainer);

    // Data Section
    const dataContainer = document.createElement('div');
    dataContainer.style.display = 'flex';
    dataContainer.style.flexDirection = 'column';
    dataContainer.style.alignItems = 'center';
    dataContainer.style.justifyContent = 'center';
    dataContainer.style.width = '100%';
    dataContainer.style.flex = '1';

    // Name (Large & Bold)
    const nameLabel = document.createElement('div');
    nameLabel.innerText = s.name;
    const nameLength = s.name.length;
    let fontSize = '14px';
    if (nameLength > 40) fontSize = '8px';
    else if (nameLength > 30) fontSize = '10px';
    else if (nameLength > 20) fontSize = '12px';
    
    nameLabel.style.fontSize = fontSize;
    nameLabel.style.fontWeight = '900';
    nameLabel.style.textAlign = 'center';
    nameLabel.style.width = '100%';
    nameLabel.style.lineHeight = '1.1';
    nameLabel.style.color = '#0f172a';
    nameLabel.style.marginBottom = '0.5mm';
    dataContainer.appendChild(nameLabel);

    // ID & Stage (Medium)
    const subLabel = document.createElement('div');
    subLabel.innerText = `${s.serial || s.id.substring(0, 8)} • ${s.stage}`;
    subLabel.style.fontSize = '9px';
    subLabel.style.fontWeight = '700';
    subLabel.style.color = '#475569';
    subLabel.style.marginBottom = '0.5mm';
    dataContainer.appendChild(subLabel);

    // Church (Small)
    const churchLabel = document.createElement('div');
    churchLabel.innerText = s.churchName;
    churchLabel.style.fontSize = '8px';
    churchLabel.style.fontWeight = '600';
    churchLabel.style.color = '#94a3b8';
    dataContainer.appendChild(churchLabel);

    card.appendChild(dataContainer);
    wrapper.appendChild(card);
  }

  document.body.appendChild(wrapper);
  // Wait for fonts to load properly - expanded check for Arabic
  try {
    await document.fonts.load('1em Cairo');
    await document.fonts.ready;
  } catch (e) {
    console.warn('Font loading check failed, proceeding with timeout', e);
  }
  await new Promise(r => setTimeout(r, 2000)); 
  return wrapper;
};

export default function OmrGenerator({ allStudents }: { allStudents?: any[] }) {
  const [mode, setMode] = useState<'omr' | 'qr'>('omr');
  const [rawChurches, setRawChurches] = useState<any[]>([]);
  const [churches, setChurches] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<string>('الكل');
  const [selectedStage, setSelectedStage] = useState<string>('الكل');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('الكل');
  const [numQuestions, setNumQuestions] = useState<number>(40);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, batch: 0, totalBatches: 0 });
  const [error, setError] = useState<string | null>(null);

  // Dynamically extract unique values from allStudents
  const extractedChurches = React.useMemo(() => {
    if (!allStudents || allStudents.length === 0) return [];
    return Array.from(new Set(allStudents.map(s => s.churchName).filter(Boolean))).sort();
  }, [allStudents]);

  const extractedLevels = React.useMemo(() => {
    if (!allStudents || allStudents.length === 0) return [];
    return Array.from(new Set(allStudents.map(s => s.stage).filter(Boolean))).sort();
  }, [allStudents]);

  const extractedCompetitions = React.useMemo(() => {
    if (!allStudents || allStudents.length === 0) return [];
    return Array.from(new Set(allStudents.flatMap(s => s.competitions || []).filter(Boolean))).sort();
  }, [allStudents]);

  const finalChurches = React.useMemo(() => {
    const combined = new Set([...extractedChurches, ...churches]);
    return Array.from(combined).sort();
  }, [extractedChurches, churches]);

  const finalLevels = React.useMemo(() => {
    const combined = new Set([...extractedLevels, ...levels]);
    return Array.from(combined).sort();
  }, [extractedLevels, levels]);

  const finalCompetitions = React.useMemo(() => {
    return extractedCompetitions;
  }, [extractedCompetitions]);

  useEffect(() => {
    const fetchDynamics = async () => {
      try {
        const { data: churchesData } = await supabase.from('churches').select('name, loginCode').range(0, 4999);
        if (churchesData) {
          setRawChurches(churchesData);
          setChurches(churchesData.map((doc: any) => doc.name).filter(Boolean));
        }

        const { data: levelsData } = await supabase.from('levels').select('name').range(0, 4999);
        if (levelsData) {
          setLevels(levelsData.map((doc: any) => doc.name).filter(Boolean));
        }
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
      const search = searchQuery.trim();
      
      if (allStudents && allStudents.length > 0) {
        if (search) {
          const searchVariations = [search, search.toUpperCase(), search.toLowerCase()];
          students = allStudents.filter(p => 
            searchVariations.includes(p.serial) || searchVariations.includes(p.id)
          ).map(d => ({...d, name: d.name || d.studentName || 'بدون اسم'}));
          
          if (students.length === 0) {
             setError("لم يتم العثور على طالب بهذا الرقم.");
             setIsGenerating(false);
             return;
          }
        } else {
          students = allStudents.filter(p => {
             const passChurch = selectedChurch === 'الكل' || p.churchName === selectedChurch;
             const passStage = selectedStage === 'الكل' || p.stage === selectedStage;
             const passComp = selectedCompetition === 'الكل' || (p.competitions && p.competitions.includes(selectedCompetition));
             return passChurch && passStage && passComp;
          }).map(d => ({...d, name: d.name || d.studentName || 'بدون اسم'}));
        }
      }

      if (mode === 'omr') {
        students = students.filter(s => /|خدام وإعداد الخدام|إعدادي|اعدادي|إعدادى|اعدادى|ثانوي|ثانوى|خريجون|جامعة|جامعه/i.test(s.stage));
      }

      // Sort alphabetically by name
      students.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

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
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      for (let j = 0; j < batchList.length; j++) {
        const student = batchList[j];
        try {
          const domElement = await createOMRSheetElement(student, numQuestions, churchLogos, rawChurches);
          const canvas = await html2canvas(domElement, { scale: 3, useCORS: true, allowTaint: true });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
          document.body.removeChild(domElement);
        } catch (e) {
          console.error('Error generating OMR page:', e);
        }

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
    const cardsPerPage = 20; // 4x5
    const totalPagesNum = Math.ceil(totalStudents / cardsPerPage);
    
    setProgress({ current: 0, total: totalStudents, batch: 1, totalBatches: 1 });

    for (let pIdx = 0; pIdx < totalPagesNum; pIdx++) {
        const batch = students.slice(pIdx * cardsPerPage, (pIdx + 1) * cardsPerPage);
        try {
          const domElement = await createQRCardPageElement(batch, rawChurches);
          
          // Use html2canvas to render the entire page of cards
          const canvas = await html2canvas(domElement, { 
              scale: 2.5, // Slightly lower scale to avoid memory issues on large PDFs
              useCORS: true, 
              allowTaint: true,
              logging: true, // Enable logging for troubleshooting
              backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.9); 
          doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

          document.body.removeChild(domElement);
        } catch (e) {
          console.error('Error rendering QR page:', e);
        }

        if (pIdx < totalPagesNum - 1) doc.addPage();
        
        setProgress(prev => ({ ...prev, current: Math.min((pIdx + 1) * cardsPerPage, totalStudents) }));
        await new Promise(r => setTimeout(r, 100)); // UI responsiveness
    }

    const timeStamp = new Date().getTime();
    doc.save(`QR_ID_Cards_${selectedChurch === 'الكل' ? 'All' : selectedChurch}_${timeStamp}.pdf`);
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
            <p className="text-slate-500 font-bold mt-1">استخراج أوراق الامتحانات والكود للمشتركين</p>
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
        <div className="md:col-span-3 relative">
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

        <div className="md:col-span-3">
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
            {finalChurches.map((c, i) => <option key={i} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="md:col-span-3">
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
            {finalLevels.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">
            <LayoutGrid size={14} className="inline ml-1"/> المسابقة
          </label>
          <select 
            disabled={!!searchQuery}
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
            value={selectedCompetition}
            onChange={(e) => setSelectedCompetition(e.target.value)}
          >
            <option value="الكل">كل المسابقات</option>
            {finalCompetitions.map((c, i) => <option key={i} value={c}>{c}</option>)}
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
                 ورقة A5 عالية الدقة، تحتوي على 4 نقاط معايرة QR كود مدمج للتعرف الفوري على هوية المتسابق. 
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
             <h4 className="font-black text-emerald-800">استخراج أكواد المسابقين (QR Cards)</h4>
             <p className="text-sm font-bold text-emerald-600 mt-1">استخراج ملف PDF جاهز للطباعة يحتوي على شبكة  تحتوي على QR كود يحمل هوية الطالب المشفرة لاستخدامها في بوابة الامتحانات.</p>
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
              جاري معالجة البيانات واستخراج الملفات... 
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
          {mode === 'omr' ? 'بناء وتحميل أوراق البابل شيت' : 'واستخراج كروت الـ QR للمتسابقين'}
        </button>
      )}
    </div>
  );
}

