import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { db, doc, setDoc, writeBatch } from '../firebase';
import { generateShortId } from '../lib/utils';
import { X, Users, CheckCircle2, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminBulkRegisterProps {
  isOpen: boolean;
  onClose: () => void;
  publicChurches: { name: string; email: string }[];
  dynamicLevels: { name: string }[];
  onSuccess: (newParticipants: any[]) => void;
  activeYear: string;
}

const DEFAULT_COMPETITIONS = [
  "دراسي",
  "قبطي مستوى أول",
  "محفوظات",
  "قبطي مستوى ثان"
];

export default function AdminBulkRegister({
  isOpen,
  onClose,
  publicChurches,
  dynamicLevels,
  onSuccess,
  activeYear
}: AdminBulkRegisterProps) {
  const [namesText, setNamesText] = useState('');
  const [stage, setStage] = useState('');
  const [gender, setGender] = useState('ذكر');
  const [churchName, setChurchName] = useState('');
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleCheckboxChange = (comp: string) => {
    if (selectedCompetitions.includes(comp)) {
      setSelectedCompetitions(selectedCompetitions.filter(item => item !== comp));
    } else {
      setSelectedCompetitions([...selectedCompetitions, comp]);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namesText.trim() || !stage || !churchName) {
      setStatusMessage({
        type: 'error',
        text: 'من فضلك املأ البيانات الأساسية (الكنيسة، المرحلة) واكتب الأسماء المطلوبة.'
      });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    // Convert text to an array of names and filter out empty rows
    const namesArray = namesText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (namesArray.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'لم يتم العثور على أي أسماء صالحة للتسجيل.'
      });
      setLoading(false);
      return;
    }

    const newParticipants: any[] = [];
    const supabaseInserts: any[] = [];

    // Pre-create participants representation for client-side fallback/sync
    namesArray.forEach(name => {
      const customId = generateShortId();
      const newRecord = {
        id: customId,
        serial: customId,
        name: name,
        churchName: churchName,
        stage: stage,
        gender: gender,
        competitions: selectedCompetitions,
        country: 'مصر',
        year: activeYear || '2026',
        timestamp: new Date().toISOString()
      };
      newParticipants.push(newRecord);
      
      // Map to supabase structure matching the registrations columns
      supabaseInserts.push({
        id: customId,
        name: name,
        churchName: churchName,
        stage: stage,
        gender: gender,
        competitions: selectedCompetitions,
        country: 'مصر',
        timestamp: new Date().toISOString()
      });
    });

    let supabaseSuccess = false;
    let rpcMethodUsed = false;

    // 1. Try Supabase RPC first as requested
    try {
      console.log("Attempting bulk insert via Supabase RPC...");
      const { error: rpcError } = await supabase.rpc('bulk_register_students', {
        student_names: namesArray,
        p_stage: stage,
        p_gender: gender,
        p_church_name: churchName,
        p_competitions: selectedCompetitions
      });

      if (!rpcError) {
        supabaseSuccess = true;
        rpcMethodUsed = true;
        console.log("Supabase RPC registered successfully.");
      } else {
        console.warn("RPC failed or does not exist, falling back to direct table insert:", rpcError);
      }
    } catch (rpcErr) {
      console.warn("RPC call threw error, falling back to direct insertion:", rpcErr);
    }

    // 2. Client-side fallback to direct Supabase Insert if RPC was not resolved/successful
    if (!supabaseSuccess) {
      try {
        console.log("Direct insert of multiple rows into Supabase 'registrations'...");
        const { error: insertErr } = await supabase
          .from('registrations')
          .insert(supabaseInserts);

        if (!insertErr) {
          supabaseSuccess = true;
          console.log("Supabase direct insert completed successfully.");
        } else {
          console.error("Supabase direct insert failed:", insertErr);
        }
      } catch (insertErr) {
        console.error("Supabase direct insert threw error:", insertErr);
      }
    }

    // 3. Sync to Firebase Firestore to maintain absolute double-database consistency
    let firebaseSuccess = false;
    if (!(window as any).firestoreQuotaExceeded) {
      try {
        console.log("Syncing bulk registration to Firebase Firestore...");
        const batch = writeBatch(db);
        newParticipants.forEach(participant => {
          const docRef = doc(db, 'participants', participant.id);
          batch.set(docRef, participant);
        });
        await batch.commit();
        firebaseSuccess = true;
        console.log("Firebase Firestore bulk sync completed.");
      } catch (fbErr: any) {
        console.error("Firebase Firestore bulk sync failed:", fbErr);
        const errMsg = String(fbErr).toLowerCase();
        if (errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('over_quota')) {
          (window as any).firestoreQuotaExceeded = true;
          window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
        }
      }
    }

    // 4. Conclude operations based on storage results (3-server failover logic)
    setLoading(false);

    if (supabaseSuccess || firebaseSuccess) {
      setStatusMessage({
        type: 'success',
        text: `🚀 تم بنجاح تسجيل ${namesArray.length} طالب وحفظ البيانات في السحابة الآمنة!`
      });
      
      // Update parent component state with results
      onSuccess(newParticipants);
      
      // Clear input fields on success
      setNamesText('');
    } else {
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ غير متوقع أثناء محاولة حفظ البيانات، يرجى التحقق من اتصالك بالإنترنت.'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col my-8 border border-slate-100"
      >
        {/* Border Accent Header */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-600" />
        
        {/* Header Grid */}
        <div className="p-6 sm:p-8 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-800">التسجيل الجماعي للمشتركين</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-bold">تسجيل وتوثيق مجمّع للمخدومين مباشرة في ثوانٍ</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleBulkSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[70vh] text-right" style={{ direction: 'rtl' }}>
          
          {/* Status Message Handler */}
          <AnimatePresence>
            {statusMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-2xl flex items-start gap-3 border ${
                  statusMessage.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : statusMessage.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                ) : (
                  <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                )}
                <div className="text-xs sm:text-sm font-black leading-relaxed">
                  {statusMessage.text}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Names Area Input */}
          <div className="space-y-2">
            <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider block">
              أسماء الطلاب (اسم واحد في كل سطر لتمكين الفصل والتوثيق):
            </label>
            <textarea
              rows={6}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold leading-relaxed resize-none shadow-inner"
              placeholder="مثال:&#10;شنودة ماهر جرجس&#10;مارينا نادر صموئيل&#10;كيرلس ايهاب فهمي"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Select Church/Country name */}
            <div className="space-y-2">
              <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider block">
                اختر البلد/الكنيسة (تطبق على الكل):
              </label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                value={churchName} 
                onChange={(e) => setChurchName(e.target.value)}
              >
                <option value="">-- اختر الكنيسة --</option>
                {Array.from(new Set(publicChurches.map((c: any) => c.name))).sort().map(church => (
                  <option key={church} value={church}>{church}</option>
                ))}
              </select>
            </div>

            {/* Select study level/stage */}
            <div className="space-y-2">
              <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider block">
                اختر المرحلة (تطبق على الكل):
              </label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                value={stage} 
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="">-- اختر المرحلة --</option>
                {dynamicLevels.map((l: any) => {
                  const levelName = typeof l === 'string' ? l : l.name;
                  return <option key={levelName} value={levelName}>{levelName}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Select Gender */}
          <div className="space-y-3">
            <span className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider block">
              الجنس (يطبق على المجموعة كاملة):
            </span>
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="bulk_gender" 
                  value="ذكر" 
                  checked={gender === 'ذكر'} 
                  onChange={() => setGender('ذكر')} 
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500" 
                />
                ذكر
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer select-none">
                <input 
                  type="radio" 
                  name="bulk_gender" 
                  value="أنثى" 
                  checked={gender === 'أنثى'} 
                  onChange={() => setGender('أنثى')} 
                  className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                />
                أنثى
              </label>
            </div>
          </div>

          {/* Select system Competitions */}
          <div className="space-y-3">
            <label className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-wider block">
              حدد المسابقات المشتركة (تطبق على الكل):
            </label>
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
              {DEFAULT_COMPETITIONS.map(comp => (
                <label 
                  key={comp} 
                  className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 cursor-pointer select-none py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={selectedCompetitions.includes(comp)}
                    onChange={() => handleCheckboxChange(comp)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-400"
                  /> 
                  {comp}
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button Trigger */}
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-200 transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>جاري تسجيل الطلاب والحفظ الفوري...</span>
                </>
              ) : (
                <>
                  <span>🚀 تسجيل وحفظ الطلاب في السحابة فوراً</span>
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
