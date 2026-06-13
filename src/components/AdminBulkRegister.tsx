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

  const [lastInsertedIds, setLastInsertedIds] = useState<string[]>([]);
  const [wipeChurchName, setWipeChurchName] = useState('');
  const [wipeStage, setWipeStage] = useState('');
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');

  const handleCheckboxChange = (comp: string) => {
    if (selectedCompetitions.includes(comp)) {
      setSelectedCompetitions(selectedCompetitions.filter(item => item !== comp));
    } else {
      setSelectedCompetitions([...selectedCompetitions, comp]);
    }
  };

  const handleUndo = async () => {
    if (lastInsertedIds.length === 0) return;
    
    setLoading(true);
    setStatusMessage(null);
    
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .in('id', lastInsertedIds);
        
      if (error) throw error;
      
      // Attempt Firebase cleanup to stay consistent (best effort)
      try {
        if (!(window as any).firestoreQuotaExceeded) {
          const batch = writeBatch(db);
          lastInsertedIds.forEach(id => {
            const docRef = doc(db, 'participants', id);
            batch.delete(docRef);
          });
          await batch.commit();
        }
      } catch (fbErr) {
        console.error("Firebase undo cleanup failed, but Supabase succeed:", fbErr);
      }
      
      setStatusMessage({
        type: 'success',
        text: `تم التراجع بنجاح: إزالة ${lastInsertedIds.length} اسم تم إضافتهم مؤخراً.`
      });
      
      setLastInsertedIds([]);
    } catch (err: any) {
      console.error("Undo failed:", err);
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء التراجع عن الإدخال الأخير.'
      });
    }
    
    setLoading(false);
  };

  const handleWipeStageData = async () => {
    if (wipeConfirmText !== 'DELETE') return;
    
    setLoading(true);
    setShowWipeModal(false);
    setWipeConfirmText('');
    setStatusMessage(null);
    
    try {
      const { error: sbError } = await supabase
        .from('registrations')
        .delete()
        .eq('churchName', wipeChurchName)
        .eq('stage', wipeStage);
        
      if (sbError) throw sbError;
      
      setStatusMessage({
        type: 'success',
        text: `تم مسح جميع بيانات مرحلة "${wipeStage}" لـ "${wipeChurchName}" بنجاح.`
      });
      
      setWipeChurchName('');
      setWipeStage('');
    } catch (err: any) {
      console.error("Wipe failed:", err);
      setStatusMessage({
        type: 'error',
        text: 'حدث خطأ أثناء محاولة مسح البيانات.'
      });
    }
    
    setLoading(false);
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
      
      setLastInsertedIds(supabaseInserts.map(i => i.id));
      
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
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-4 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-200 transition-all active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  <span>جاري التسجيل...</span>
                </>
              ) : (
                <>
                  <span>🚀 تسجيل وحفظ فوري</span>
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={handleUndo}
              disabled={loading || lastInsertedIds.length === 0}
              className="px-4 py-4 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
            >
              تراجع عن الإدخال الأخير
            </button>
            <button 
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-4 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>

          {/* Danger Zone */}
          <div className="mt-8 pt-8 border-t border-rose-100 bg-rose-50/50 rounded-2xl p-6">
            <h4 className="text-rose-700 font-black text-lg mb-4 flex items-center gap-2">
              <AlertTriangle className="text-rose-600" size={20} />
              منطقة خطر: مسح مرحلة لبلد معينة
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <select 
                className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                value={wipeChurchName} 
                onChange={(e) => setWipeChurchName(e.target.value)}
              >
                <option value="">-- اختر البلد/الكنيسة --</option>
                {Array.from(new Set(publicChurches.map((c: any) => c.name))).sort().map(church => (
                  <option key={church} value={church}>{church}</option>
                ))}
              </select>

              <select 
                className="w-full px-4 py-3 bg-white border border-rose-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                value={wipeStage} 
                onChange={(e) => setWipeStage(e.target.value)}
              >
                <option value="">-- اختر المرحلة --</option>
                {dynamicLevels.map((l: any) => {
                  const levelName = typeof l === 'string' ? l : l.name;
                  return <option key={levelName} value={levelName}>{levelName}</option>;
                })}
              </select>
            </div>
            
            <button
              type="button"
              onClick={() => setShowWipeModal(true)}
              disabled={!wipeChurchName || !wipeStage}
              className="w-full px-6 py-3 bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-700 rounded-xl font-black text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              مسح هذه المرحلة بالكامل
            </button>
          </div>
        </form>

        {/* Wipe Confirmation Modal */}
        {showWipeModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl w-full max-w-md p-6 sm:p-8 text-center space-y-6 shadow-2xl relative"
              style={{ direction: 'rtl' }}
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-rose-600">تحذير! إجراء لا يمكن التراجع عنه</h3>
              <p className="text-sm font-bold text-slate-600 leading-relaxed">
                أنت على وشك حذف جميع الطلاب المسجلين في مرحلة 
                <span className="text-rose-600 mx-1">"{wipeStage}"</span>
                التابعين لـ 
                <span className="text-rose-600 mx-1">"{wipeChurchName}"</span>.
              </p>
              
              <div className="space-y-2 mt-4 text-right">
                <label className="text-xs font-black text-slate-700 mb-1 block">للتأكيد، اكتب كلمة "DELETE":</label>
                <input 
                  type="text"
                  value={wipeConfirmText}
                  onChange={(e) => setWipeConfirmText(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                  placeholder="DELETE"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={handleWipeStageData}
                  disabled={wipeConfirmText !== 'DELETE' || loading}
                  className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-sm transition-all disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'جاري المسح...' : 'تأكيد المسح النهائي'}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowWipeModal(false);
                    setWipeConfirmText('');
                  }}
                  disabled={loading}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
