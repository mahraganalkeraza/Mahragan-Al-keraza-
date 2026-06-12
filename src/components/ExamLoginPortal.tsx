import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  QrCode, Search, Smartphone, Sparkles, CheckCircle2, 
  AlertTriangle, ArrowRight, Settings, Link2, UserCheck, 
  RefreshCw, Sliders, List, X, Loader, HelpCircle, Check, ChevronRight
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { QRScanner } from './QRScanner';

interface Participant {
  id: string;
  name: string;
  stage: string;
  churchName: string;
  serial?: string;
  year?: string;
}

interface ExamLink {
  stage: string;
  url: string;
}

export const ExamLoginPortal: React.FC = () => {
  // State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [examLinks, setExamLinks] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [totalCount, setTotalCount] = useState(0);

  // Active view
  const [activeTab, setActiveTab] = useState<'qr' | 'search'>('qr');
  
  // Settings & Configuration
  const [showSettings, setShowSettings] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // Form Entry IDs Config
  const [idEntryId, setIdEntryId] = useState(() => localStorage.getItem('form_entry_id') || 'entry.1000001');
  const [nameEntryId, setNameEntryId] = useState(() => localStorage.getItem('form_entry_name') || 'entry.1000002');
  const [stageEntryId, setStageEntryId] = useState(() => localStorage.getItem('form_entry_stage') || 'entry.1000003');
  const [churchEntryId, setChurchEntryId] = useState(() => localStorage.getItem('form_entry_church') || 'entry.1000004');

  // Cache for search
  const participantsRef = useRef<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('الكل');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);

  // Scan state
  const [scannedResult, setScannedResult] = useState<Participant | null>(null);
  const [scanResultSource, setScanResultSource] = useState<'mode_a' | 'mode_b' | 'manual'>('mode_a');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(false);

  // Load Exam Links and Participants from Supabase
  const loadData = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    try {
      // 1. Fetch Google Form Links from Supabase (or use default ones as safety)
      const { data: linksData, error: linksError } = await supabase
        .from('exam_links')
        .select('*');

      const links: Record<string, string> = {
        'دراسي': 'https://docs.google.com/forms/d/e/1FAIpQLSfD_g0q2O_exam1/viewform',
        'محفوظات': 'https://docs.google.com/forms/d/e/1FAIpQLSfD_g0q2O_exam2/viewform',
        'قبطي مستوى أول': 'https://docs.google.com/forms/d/e/1FAIpQLSfD_g0q2O_exam3/viewform',
        'قبطي مستوى ثاني': 'https://docs.google.com/forms/d/e/1FAIpQLSfD_g0q2O_exam4/viewform'
      };

      if (linksData && !linksError) {
        linksData.forEach((d: any) => {
          if (d.stage && d.url) {
            links[d.stage] = d.url;
          }
        });
      }
      setExamLinks(links);

      // 2. Fetch Student Registrations from Supabase
      const { data: sbSubmissions, error: sbSubmissionsError } = await supabase
        .from('registrations')
        .select('id, name, stage, churchName, gender');

      if (sbSubmissionsError) throw sbSubmissionsError;

      const mappedParticipants: Participant[] = (sbSubmissions || []).map((sbRow: any) => ({
        id: sbRow.id,
        name: sbRow.name || '',
        stage: sbRow.stage || '',
        churchName: sbRow.churchName || '',
        serial: sbRow.id,
        country: 'مصر',
        competitions: sbRow.competitions || [],
        timestamp: sbRow.timestamp || new Date().toISOString()
      }));

      // 3. Fast count exact total live registered count
      const { count, error: countError } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true });

      participantsRef.current = mappedParticipants;
      setParticipants(mappedParticipants);
      setTotalCount(count || mappedParticipants.length);
      setSyncStatus('success');
    } catch (err: any) {
      console.error("Failed to load data for Exam Portal from Supabase:", err);
      // Fallback fallback to empty or cached state
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mode A parser helper
  const parseModeAPayload = (text: string): Participant | null => {
    if (text.includes('|')) {
      const parts = text.split('|');
      const payload: Record<string, string> = {};
      for (const part of parts) {
        const idx = part.indexOf(':');
        if (idx !== -1) {
          const key = part.substring(0, idx).trim().toLowerCase();
          const value = part.substring(idx + 1).trim();
          payload[key] = value;
        }
      }
      const id = payload['id'] || payload['serial'] || '';
      const name = payload['name'] || '';
      const stage = payload['stage'] || payload['level'] || '';
      const church = payload['church'] || payload['churchname'] || '';
      
      if (id && name) {
        return {
          id,
          name,
          stage,
          churchName: church,
          serial: id
        };
      }
    }
    return null;
  };

  // QR Scan Success logic
  const handleQRScanSuccess = async (decodedText: string) => {
    if (cooldown || isSubmitting || submitSuccess) return;

    // Throttle / Cooldown for scanner input
    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    setErrorMessage('');
    const modeAPayload = parseModeAPayload(decodedText);

    if (modeAPayload) {
      // MODE A: Payload extracted offline. 
      setScannedResult(modeAPayload);
      setScanResultSource('mode_a');
    } else {
      // MODE B: Scanned Text is a Student ID/Serial. Resolve using local cache.
      const searchId = decodedText.trim();
      const match = participantsRef.current.find(
        p => p.id === searchId || p.serial === searchId
      );

      if (match) {
        setScannedResult(match);
        setScanResultSource('mode_b');
      } else {
        setErrorMessage(`لم يتم العثور على مشترك بالرقم: "${searchId}". يرجى استخدام البحث اليدوي.`);
        setScannedResult(null);
      }
    }
  };

  // Optimized Client-Side Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = participantsRef.current.filter(p => {
      const matchName = p.name.toLowerCase().includes(term);
      const matchCode = p.id.toLowerCase().includes(term) || (p.serial && p.serial.toLowerCase().includes(term));
      const matchStage = selectedStageFilter === 'الكل' || p.stage === selectedStageFilter;
      return (matchName || matchCode) && matchStage;
    });

    // Limit to top 15 results to prevent React UI rendering lag
    setSearchResults(results.slice(0, 15));
  }, [searchTerm, selectedStageFilter]);

  // Handle Enter Exam & Record Attendance in Supabase
  const handleEnterExam = async (student: Participant) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const customId = `attendance-${student.id}-${Date.now()}`;
      
      // 1. Log direct attendance in Supabase
      const { error: attendanceError } = await supabase
        .from('exam_attendance')
        .insert({
          id: customId,
          studentId: student.id,
          name: student.name,
          stage: student.stage,
          church: student.churchName,
          timestamp: new Date().toISOString(),
          method: scanResultSource === 'mode_a' ? 'QR_Direct' : 'Search',
          year: '2026'
        });

      // 2. Stream dynamic status / enrollment in live proctor proctor monitoring
      await supabase
        .from('live_monitoring')
        .upsert({
          student_id: student.id,
          student_name: student.name,
          church_name: student.churchName,
          stage: student.stage,
          status: 'active',
          ip_address: '127.0.0.1',
          updated_at: new Date().toISOString()
        });

      setSubmitSuccess(true);

      // Generate pre-filled Google Forms URL
      const baseUrl = examLinks[student.stage] || examLinks['الكل'] || '';
      
      if (!baseUrl) {
        setErrorMessage(`مكتمل الحضور! ولكن لم يتم العثور على رابط لـ "${student.stage}". يرجى مراجعة المسؤول.`);
        setIsSubmitting(false);
        return;
      }

      // Build url with prefilled fields
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set(idEntryId, student.id);
      urlObj.searchParams.set(nameEntryId, student.name);
      urlObj.searchParams.set(stageEntryId, student.stage);
      urlObj.searchParams.set(churchEntryId, student.churchName);

      const finalPrefilledUrl = urlObj.toString();

      // Smooth redirect
      setTimeout(() => {
        window.location.href = finalPrefilledUrl;
      }, 1500);

    } catch (err: any) {
      console.error("Supabase attendance write failed:", err);
      // Fallback
      const baseUrl = examLinks[student.stage] || '';
      if (baseUrl) {
        window.location.href = baseUrl;
      } else {
        setErrorMessage('حدث خطأ أثناء تسجيل حضور الطالب بـ Supabase.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset current scan / search selection
  const handleReset = () => {
    setScannedResult(null);
    setSubmitSuccess(false);
    setErrorMessage('');
  };

  // Settings helpers
  const handleSaveSettings = () => {
    localStorage.setItem('form_entry_id', idEntryId);
    localStorage.setItem('form_entry_name', nameEntryId);
    localStorage.setItem('form_entry_stage', stageEntryId);
    localStorage.setItem('form_entry_church', churchEntryId);
    setShowSettings(false);
  };

  const handleUnlockSettings = () => {
    if (passcode === '2026') {
      setIsUnlocked(true);
      setPasscode('');
    } else {
      alert('الرمز السري غير صحيح!');
    }
  };

  // Stages computed for dropdown
  const stagesList = useMemo(() => {
    const list = new Set<string>();
    participants.forEach(p => { if (p.stage) list.add(p.stage); });
    return ['الكل', ...Array.from(list)];
  }, [participants]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Upper Brand / Stats Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
            <Smartphone className="text-amber-400" size={20} />
          </div>
          <div>
            <span className="font-sans font-black text-amber-400 text-lg block tracking-tight">بوابة اختبار الكرازة 2026 (Supabase)</span>
            <span className="text-[10px] text-slate-400">بوابة الدخول الفوري للامتحانات وبدء رصد الحضور</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
            <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'success' ? 'bg-emerald-500 animate-pulse' : syncStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[11px] font-bold text-slate-300">
              {syncStatus === 'success' ? `متصل بالكامل (${totalCount.toLocaleString('ar-EG')} مشترك)` : syncStatus === 'syncing' ? 'جاري التحضير...' : 'عدم استقرار'}
            </span>
          </div>

          <button 
            onClick={() => loadData()}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-750"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-750"
            title="الإعدادات المتقدمة"
          >
            <Settings size={16} />
          </button>

          <button 
            onClick={() => window.location.href = '/'}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
          >
            الرجوع للرئيسية
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Loader className="animate-spin text-amber-500 mb-4" size={40} />
              <p className="text-slate-400 text-sm font-bold">جاري تحميل المشتركين من Supabase...</p>
              <p className="text-slate-500 text-xs mt-1">يتم تحضير المزامنة الثنائية الفورية للحد من التكلفة والضغط</p>
            </motion.div>
          ) : scannedResult ? (
            /* VERIFY / ATTENDANCE TRIGGER PANEL */
            <motion.div
              key="verification"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500" />
              
              <div className="flex flex-col items-center text-center">
                {submitSuccess ? (
                  <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                    <CheckCircle2 size={44} className="animate-bounce" />
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
                    <UserCheck size={44} />
                  </div>
                )}

                <span className="text-xs text-slate-400 tracking-widest uppercase font-bold mb-1">تأكيد هوية المشترك</span>
                <h3 className="text-2xl font-black text-white mb-6 leading-tight">{scannedResult.name}</h3>

                {/* Details grid layout */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-md bg-slate-950 p-5 rounded-2xl border border-slate-800 mb-8">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-550 block">رقم المشترك (ID)</span>
                    <span className="font-mono text-sm text-yellow-500 font-bold">{scannedResult.id}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-550 block">المرحلة الدراسية</span>
                    <span className="text-sm text-slate-200 font-bold">{scannedResult.stage}</span>
                  </div>
                  <div className="text-right col-span-2 border-t border-slate-850 pt-3">
                    <span className="text-[10px] text-slate-550 block">الكنيسة</span>
                    <span className="text-sm text-slate-200 font-bold">{scannedResult.churchName}</span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="w-full max-w-md bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs flex items-center gap-3 mb-6">
                    <AlertTriangle size={18} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                  <button
                    onClick={handleReset}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-2xl transition-all border border-slate-755 disabled:opacity-50"
                  >
                    إلغاء وإعادة المسح
                  </button>

                  <button
                    onClick={() => handleEnterExam(scannedResult)}
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg hover:shadow-emerald-900/40 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        <span>جاري التحقق...</span>
                      </>
                    ) : submitSuccess ? (
                      <>
                        <Check size={18} />
                        <span>جاري التحويل التلقائي...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>تسجيل الحضور وبدء الاختبار</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* SELECTION TABS */
            <motion.div key="tabs" className="space-y-6">
              
              {/* Dual Selector header */}
              <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto">
                <button
                  onClick={() => { setActiveTab('qr'); setErrorMessage(''); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'qr' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                  <QrCode size={16} />
                  <span>ماسح الكاميرا الفوري (Supabase)</span>
                </button>
                <button
                  onClick={() => { setActiveTab('search'); setErrorMessage(''); }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'search' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'text-slate-400 hover:text-white'}`}
                >
                  <Search size={16} />
                  <span>البحث بالاسم الكودي</span>
                </button>
              </div>

              {/* TAB PANELS CONTAINER */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {errorMessage && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-400 text-xs flex items-center gap-3 mb-6">
                      <AlertTriangle size={18} className="shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {activeTab === 'qr' ? (
                    <motion.div
                      key="qr-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6 flex flex-col items-center"
                    >
                      <div className="text-center max-w-md mx-auto">
                        <h4 className="text-lg font-black text-slate-100 flex items-center justify-center gap-2 mb-2">
                           وجه باركود الـ QR الخاص بك نحو الكاميرا
                        </h4>
                        <p className="text-slate-400 text-xs">
                          يتم فك تشفير البيانات من الباركود فورياً للمطابقة والتأكيد دون أي زمن تأخر.
                        </p>
                      </div>

                      {/* Frame containing the scanning widget */}
                      <div className="w-full max-w-sm rounded-2xl overflow-hidden border-2 border-slate-800 relative shadow-inner">
                        <QRScanner onScanSuccess={handleQRScanSuccess} />
                      </div>

                      <div className="text-slate-500 text-[10px] text-center flex items-center gap-1.5 max-w-sm">
                        <HelpCircle size={12} />
                        <span>إذا واجهتك مشاكل في فك الرمز، يرجى الاستعانة بالبحث اليدوي.</span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="search-panel"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      <div className="text-center max-w-md mx-auto mb-6">
                        <h4 className="text-lg font-black text-slate-100 flex items-center justify-center gap-2 mb-2">
                          البحث الفوري بالاسم
                        </h4>
                        <p className="text-slate-400 text-xs">
                          تتم التصفية على الذاكرة المحلية لضمان استقرار كامل وموثوقية في الدخول.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 relative">
                          <span className="absolute inset-y-0 right-3 flex items-center text-slate-500">
                            <Search size={16} />
                          </span>
                          <input
                            type="text"
                            placeholder="اكتب الاسم أو كود المشترك..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-bold placeholder-slate-650"
                          />
                        </div>

                        <div>
                          <select
                            value={selectedStageFilter}
                            onChange={(e) => setSelectedStageFilter(e.target.value)}
                            className="w-full px-3 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 outline-none focus:border-amber-500 transition-all font-bold"
                          >
                            {stagesList.map(st => (
                              <option key={st} value={st}>{st === 'الكل' ? 'كل المراحل' : st}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Display Search results with virtualization limits */}
                      <div className="space-y-2 mt-4 max-h-[350px] overflow-y-auto pr-1.5 custom-scrollbar">
                        {searchResults.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setScannedResult(p);
                              setScanResultSource('manual');
                            }}
                            className="p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
                          >
                            <div className="text-right">
                              <p className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">{p.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-550 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md">{p.stage}</span>
                                <span className="text-[10px] text-slate-400">{p.churchName}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs text-yellow-500/80 bg-slate-900 px-2 py-1 rounded border border-slate-800">{p.id}</span>
                              <ChevronRight className="text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" size={16} />
                            </div>
                          </div>
                        ))}

                        {searchTerm && searchResults.length === 0 && (
                          <div className="text-center py-8 text-slate-500 text-xs">
                             لا يوجد مشتركين يطابقون مدخلات البحث.
                          </div>
                        )}

                        {!searchTerm && (
                          <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                            <List className="text-slate-700 hover:scale-110 transition-transform" size={24} />
                            <span>تفضل بالبحث بالاسم لاسترداد تفاصيله كاملة</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="py-4 border-t border-slate-805 bg-slate-900/40 text-center text-slate-550 text-[10px] select-none flex items-center justify-between px-6">
        <span>قاعدة البيانات النشطة: Supabase Engine Only</span>
        <span>جميع الحقوق محفوظة لمهرجان الكرازة 2026</span>
      </footer>

      {/* CONFIG MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-md w-full relative"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <div className="space-y-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Sliders className="text-amber-400" size={20} /> إعدادات البوابة المتقدمة
                </h3>

                {!isUnlocked ? (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 space-y-3">
                    <p className="text-xs text-slate-400">يرجى إدخال رمز التحقق الخاص باللجنة الكرازية:</p>
                    <input
                      type="password"
                      placeholder="****"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="w-full text-center tracking-widest py-2 bg-slate-900 border border-slate-800 rounded-xl outline-none text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-bold"
                    />
                    <button
                      onClick={handleUnlockSettings}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                    >
                      فك قفل الإعدادات
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-emerald-400 text-[10px] flex items-center gap-2">
                      <CheckCircle2 size={12} />
                      <span>تم فك قفل إعدادات الربط التلقائي!</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      تعديل معلمات prefilled الخاصة بنماذج Google Forms:
                    </p>

                    <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div>
                        <label className="text-[10px] text-slate-550 block mb-1">اسم معلمة ID رقم المشترك (ID)</label>
                        <input
                          type="text"
                          value={idEntryId}
                          onChange={(e) => setIdEntryId(e.target.value)}
                          placeholder="entry.1000001"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none text-white focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-550 block mb-1">اسم معلمة الاسم (Name)</label>
                        <input
                          type="text"
                          value={nameEntryId}
                          onChange={(e) => setNameEntryId(e.target.value)}
                          placeholder="entry.1000002"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none text-white focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-550 block mb-1">اسم معلمة المرحلة (Stage)</label>
                        <input
                          type="text"
                          value={stageEntryId}
                          onChange={(e) => setStageEntryId(e.target.value)}
                          placeholder="entry.1000003"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none text-white focus:border-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-550 block mb-1">اسم معلمة الكنيسة (Church)</label>
                        <input
                          type="text"
                          value={churchEntryId}
                          onChange={(e) => setChurchEntryId(e.target.value)}
                          placeholder="entry.1000004"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs outline-none text-white focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveSettings}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                    >
                      حفظ التغييرات
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
