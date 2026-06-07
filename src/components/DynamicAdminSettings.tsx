import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, writeBatch } from 'firebase/firestore';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, storage, ref, uploadBytesResumable, getDownloadURL, handleFirestoreError, OperationType, firebaseConfig } from '../firebase';
import { Trash2, Edit2, Plus, LogIn, Database, ShieldCheck, Check, X, Image as ImageIcon, Upload, Loader2, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { sortStages } from '../constants';
import { runOneTimeCollectionMigration, MIGRATABLE_COLLECTIONS, MigrationStatus } from '../utils/oneTimeMigration';
import { supabase } from '../lib/supabaseClient';

// Initialize secondary app for creating user accounts from the bank
const getSecondaryAuth = () => {
  try {
    const app = getApp("SecondaryBank");
    return getAuth(app);
  } catch (e) {
    const app = initializeApp(firebaseConfig, "SecondaryBank");
    return getAuth(app);
  }
};

export default function DynamicAdminSettings() {
  const [churches, setChurches] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'churches' | 'levels' | 'competitions' | 'activityStages' | 'hymnStages' | 'logo' | 'validation' | 'purge' | 'migration'>('churches');

  // Migration panel states
  const [migrationStatuses, setMigrationStatuses] = useState<Record<string, any>>({});
  const [isMigrating, setIsMigrating] = useState(false);

  const [validationSettings, setValidationSettings] = useState<any>({
    templates: [],
    ageMappings: [],
    rules: { nameLength: true, genderMatch: false, mandatoryRows: true }
  });

  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [activityStages, setActivityStages] = useState<any[]>([]);
  const [newActivityStageName, setNewActivityStageName] = useState('');

  const [hymnStages, setHymnStages] = useState<any[]>([]);
  const [newHymnStageName, setNewHymnStageName] = useState('');

  // Input states
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchCode, setNewChurchCode] = useState('');
  
  const [newLevelName, setNewLevelName] = useState('');
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>([]);

  const [newCompName, setNewCompName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, type: 'church' | 'level' | 'comp' | 'activityStage' | 'hymnStage' | 'purge' } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }

      // 1. Fetch churches
      const { data: dbChurches, error: errCh } = await supabase.from('churches').select('*');
      if (!errCh && dbChurches) {
        setChurches(dbChurches.map(c => ({
          id: c.id,
          name: c.name,
          loginCode: c.password || c.loginCode || "",
          isEnabled: c.isEnabled !== false,
          logoUrl: c.logoUrl || "",
          subscribers: c.subscribers || 0,
          createdAt: c.createdAt || c.created_at
        })));
      }

      // 2. Fetch stages/levels
      const { data: dbStages, error: errStg } = await supabase.from('stages').select('*');
      const { data: dbLevels, error: errLvl } = await supabase.from('levels').select('*');
      const combinedStages = dbStages || dbLevels || [];
      setLevels(combinedStages.map(s => ({
        id: s.id,
        name: s.name,
        allowedCompetitions: s.allowedCompetitions || s.allowed_competitions || []
      })).sort((a: any, b: any) => sortStages(a.name, b.name)));

      // 3. Fetch competitions
      const { data: dbCompetitions, error: errComp } = await supabase.from('competitions').select('*');
      if (!errComp && dbCompetitions) {
        setCompetitions(dbCompetitions.map(c => ({
          id: c.id,
          name: c.name
        })));
      }

      // 4. Fetch activity stages
      const { data: dbActStages, error: errAct } = await supabase.from('activityStages').select('*');
      if (!errAct && dbActStages) {
        setActivityStages(dbActStages.map(s => ({ id: s.id, name: s.name })));
      }

      // 5. Fetch hymn stages
      const { data: dbHymnStages, error: errHymn } = await supabase.from('hymnStages').select('*');
      if (!errHymn && dbHymnStages) {
        setHymnStages(dbHymnStages.map(s => ({ id: s.id, name: s.name })));
      }

      // Fetch config & validation from Firestore (keeping non-maxed settings)
      const configSnap = await getDoc(doc(db, 'settings', 'app_config'));
      if (configSnap.exists()) {
        setAppLogo(configSnap.data().appLogo || null);
      }

      const valSnap = await getDoc(doc(db, 'settings', 'validation'));
      if (valSnap.exists()) {
        setValidationSettings({
          templates: valSnap.data().templates || [],
          ageMappings: valSnap.data().ageMappings || [],
          rules: valSnap.data().rules || { nameLength: true, genderMatch: false, mandatoryRows: true }
        });
      }
    } catch (e) {
      console.error("Error fetching data from Supabase:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSingleMigration = async (colId: string) => {
    setIsMigrating(true);
    setMigrationStatuses(prev => ({
      ...prev,
      [colId]: { status: 'running', message: 'جاري جلب البيانات من Firebase والتحقق من عدم تكرارها في Supabase...' }
    }));
    try {
      const res = await runOneTimeCollectionMigration(colId);
      setMigrationStatuses(prev => ({
        ...prev,
        [colId]: {
          status: res.success ? 'success' : 'failed',
          totalFirebase: res.totalFirebase,
          alreadyInSupabase: res.alreadyInSupabase,
          migratedCount: res.migratedCount,
          message: res.message || 'اكتمل وبانتظار الملاحظة',
          error: res.error
        }
      }));
    } catch (err: any) {
      setMigrationStatuses(prev => ({
        ...prev,
        [colId]: { status: 'failed', error: err.message || String(err) }
      }));
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateAll = async () => {
    setIsMigrating(true);
    // Initialize statuses
    const initial: Record<string, any> = {};
    for (const item of MIGRATABLE_COLLECTIONS) {
      initial[item.id] = { status: 'pending', message: 'بانتظار الدور...' };
    }
    setMigrationStatuses(initial);

    for (const item of MIGRATABLE_COLLECTIONS) {
      setMigrationStatuses(prev => ({
        ...prev,
        [item.id]: { status: 'running', message: 'جاري الترحيل حالياً...' }
      }));
      try {
        const res = await runOneTimeCollectionMigration(item.id);
        setMigrationStatuses(prev => ({
          ...prev,
          [item.id]: {
            status: res.success ? 'success' : 'failed',
            totalFirebase: res.totalFirebase,
            alreadyInSupabase: res.alreadyInSupabase,
            migratedCount: res.migratedCount,
            message: res.message || '',
            error: res.error
          }
        }));
      } catch (err: any) {
        setMigrationStatuses(prev => ({
          ...prev,
          [item.id]: { status: 'failed', error: err.message || String(err) }
        }));
      }
    }
    setIsMigrating(false);
  };

  // PURGE LOGIC
  const handlePurge = async () => {
    setPurgeStatus('جاري مسح البيانات القديمة...');
    try {
      const collectionsToPurge = ['public_churches', 'churches', 'levels', 'competitions', 'users'];
      for (const col of collectionsToPurge) {
        try {
          const snap = await getDocs(collection(db, col));
          const batch = snap.docs.slice(0, 500);
          for (const document of batch) {
            // Don't purge current admin
            if (col === 'users' && document.data().role === 'admin') continue;
            await deleteDoc(doc(db, col, document.id));
          }
        } catch (innerErr) {
          console.error(`Error purging ${col}:`, innerErr);
        }
      }
      setPurgeStatus('تم تنظيف قواعد البيانات بنجاح!');
      setDeleteConfirmation(null);
      fetchData();
    } catch (e) {
      console.error(e);
      setPurgeStatus('حدث خطأ أثناء المسح.');
      handleFirestoreError(e, OperationType.DELETE, 'purge_all');
    }
  };

  // CHURCHES
  const addChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurchName || !newChurchCode) return;
    
    if (newChurchCode.length < 6) {
      alert("يرجى إدخال رمز دخول (كلمة مرور) لا يقل عن 6 أحرف حتى يعمل حساب الدخول بشكل صحيح.");
      return;
    }

    setIsSaving(true);
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }

      const churchData = { 
        name: newChurchName, 
        password: newChurchCode, 
        loginCode: newChurchCode, 
        isEnabled: true,
        subscribers: 0,
        created_at: new Date().toISOString()
      };

      const { error: insErr } = await supabase.from('churches').insert([churchData]);
      if (insErr) throw insErr;

      setNewChurchName(''); setNewChurchCode('');
      
      // Dispatch global refresh event
      window.dispatchEvent(new Event('supabase-metadata-updated'));

      fetchData();
      alert('تمت إضافة الكنيسة وتنشيط حساب الدخول بنجاح!');
    } catch (e: any) { 
      console.error("Add Church Bank error:", e);
      alert('فشل إضافة الكنيسة: ' + (e.message || String(e)));
    } finally {
      setIsSaving(false);
    }
  };
  const deleteChurch = async (id: string) => {
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const { error } = await supabase.from('churches').delete().eq('id', id);
      if (error) throw error;

      // Dispatch global refresh event
      window.dispatchEvent(new Event('supabase-metadata-updated'));

      setDeleteConfirmation(null);
      fetchData();
    } catch (e: any) {
      alert('فشل الحذف: ' + (e.message || String(e)));
    }
  };

  // COMPETITIONS
  const addCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName) return;
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const { error } = await supabase.from('competitions').insert([{ name: newCompName }]);
      if (error) throw error;

      setNewCompName('');

      // Dispatch global refresh event
      window.dispatchEvent(new Event('supabase-metadata-updated'));

      fetchData();
    } catch (e: any) { 
      console.error(e);
      alert('خطأ: ' + (e.message || String(e)));
    }
  };
  const deleteCompetition = async (id: string) => {
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const { error } = await supabase.from('competitions').delete().eq('id', id);
      if (error) throw error;

      // Dispatch global refresh event
      window.dispatchEvent(new Event('supabase-metadata-updated'));

      setDeleteConfirmation(null);
      fetchData();
    } catch (e: any) {
      alert('خطأ: ' + (e.message || String(e)));
    }
  };

  // LEVELS
  const addLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName) return;
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const payload = { 
        name: newLevelName, 
        allowedCompetitions: selectedCompetitions,
        allowed_competitions: selectedCompetitions
      };

      await supabase.from('stages').insert([payload]);
      await supabase.from('levels').insert([payload]);

      setNewLevelName(''); setSelectedCompetitions([]);

      // Dispatch global refresh event
      window.dispatchEvent(new Event('supabase-metadata-updated'));

      fetchData();
    } catch (e: any) { 
      console.error(e);
      alert('خطأ: ' + (e.message || String(e)));
    }
  };
  const deleteLevel = async (id: string) => {
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }

      const stageToDel = levels.find(l => l.id === id);
      if (stageToDel) {
        await supabase.from('stages').delete().eq('name', stageToDel.name);
        await supabase.from('levels').delete().eq('name', stageToDel.name);
      }

      await supabase.from('stages').delete().eq('id', id);
      await supabase.from('levels').delete().eq('id', id);

      // Dispatch global refresh event
      window.dispatchEvent(new Event('supabase-metadata-updated'));

      setDeleteConfirmation(null);
      fetchData();
    } catch (e: any) {
      alert('خطأ: ' + (e.message || String(e)));
    }
  };

  // HYMN STAGES
  const addHymnStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHymnStageName) return;
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const { error } = await supabase.from('hymnStages').insert([{ name: newHymnStageName }]);
      if (error) throw error;

      setNewHymnStageName('');
      fetchData();
    } catch (e: any) { 
      console.error(e);
      alert('خطأ: ' + (e.message || String(e)));
    }
  };
  const deleteHymnStage = async (id: string) => {
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const { error } = await supabase.from('hymnStages').delete().eq('id', id);
      if (error) throw error;

      setDeleteConfirmation(null);
      fetchData();
    } catch (e: any) {
      alert('خطأ: ' + (e.message || String(e)));
    }
  };

  // ACTIVITY STAGES
  const addActivityStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityStageName) return;
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const { error } = await supabase.from('activityStages').insert([{ name: newActivityStageName }]);
      if (error) throw error;

      setNewActivityStageName('');
      fetchData();
    } catch (e: any) { 
      console.error(e);
      alert('خطأ: ' + (e.message || String(e)));
    }
  };
  const deleteActivityStage = async (id: string) => {
    try {
      if (!supabase) {
        throw new Error("سيرفر قاعدة البيانات غير متصل");
      }
      const { error } = await supabase.from('activityStages').delete().eq('id', id);
      if (error) throw error;

      setDeleteConfirmation(null);
      fetchData();
    } catch (e: any) {
      alert('خطأ: ' + (e.message || String(e)));
    }
  };

  const toggleCompForLevel = (compName: string) => {
    if (selectedCompetitions.includes(compName)) {
      setSelectedCompetitions(selectedCompetitions.filter(c => c !== compName));
    } else {
      setSelectedCompetitions([...selectedCompetitions, compName]);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
      
      const newTemplate = {
        filename: file.name,
        headers: headers.filter(h => !!h).map(h => String(h).trim())
      };

      const newSettings = { ...validationSettings, templates: [...(validationSettings.templates || []), newTemplate] };
      await setDoc(doc(db, 'settings', 'validation'), newSettings, { merge: true });
      setValidationSettings(newSettings);
      alert('تم إضافة قالب البيانات بنجاح!');
    } catch (err) {
      console.error(err);
      alert('فشل في قراءة الملف. تأكد أنه ملف Excel صالح.');
    }
    // reset input
    e.target.value = '';
  };

  const deleteTemplate = async (idx: number) => {
    const newTemplates = validationSettings.templates.filter((_, i) => i !== idx);
    const newSettings = { ...validationSettings, templates: newTemplates };
    await setDoc(doc(db, 'settings', 'validation'), newSettings, { merge: true });
    setValidationSettings(newSettings);
  };

  const handleToggleRule = async (ruleKey: string) => {
    const newSettings = { 
      ...validationSettings, 
      rules: { 
        ...validationSettings.rules, 
        [ruleKey]: !validationSettings.rules[ruleKey] 
      } 
    };
    await setDoc(doc(db, 'settings', 'validation'), newSettings, { merge: true });
    setValidationSettings(newSettings);
  };

  const handleAddAgeMapping = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const stage = fd.get('stage') as string;
    const minYear = parseInt(fd.get('minYear') as string);
    const maxYear = parseInt(fd.get('maxYear') as string);

    if (!stage || !minYear || !maxYear) return;

    const newMappings = [...(validationSettings.ageMappings || []), { stage, minYear, maxYear }];
    const newSettings = { ...validationSettings, ageMappings: newMappings };
    await setDoc(doc(db, 'settings', 'validation'), newSettings, { merge: true });
    setValidationSettings(newSettings);
    (e.target as HTMLFormElement).reset();
  };

  const deleteAgeMapping = async (idx: number) => {
    const newMappings = validationSettings.ageMappings.filter((_, i) => i !== idx);
    const newSettings = { ...validationSettings, ageMappings: newMappings };
    await setDoc(doc(db, 'settings', 'validation'), newSettings, { merge: true });
    setValidationSettings(newSettings);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject huge files directly to stay within reasonable limits
    if (file.size > 800000) { // ~800KB
      alert('حجم الصورة كبير جداً. يرجى رفع صورة أقل من 800 كيلوبايت.');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await setDoc(doc(db, 'settings', 'app_config'), { appLogo: base64String }, { merge: true });
          setAppLogo(base64String);
          alert('تم تحديث شعار المهرجان بنجاح!');
        } catch (innerError) {
          console.error("Firestore write error for logo:", innerError);
          alert('حدث خطأ أثناء حفظ الشعار في قاعدة البيانات.');
        } finally {
          setIsUploadingLogo(false);
        }
      };
      
      reader.onerror = () => {
        alert("حدث خطأ أثناء قراءة الملف");
        setIsUploadingLogo(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert('حدث خطأ أثناء رفع الشعار.');
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mt-8">
      <div className="bg-slate-900 text-white p-6 md:p-8 flex items-center gap-4">
        <ShieldCheck size={32} className="text-emerald-400" />
        <div>
          <h2 className="text-2xl font-black">نظام الإدارة الديناميكي</h2>
          <p className="text-slate-300 font-bold opacity-80 mt-1">التحكم في الكنائس، المراحل، والأساسيات بدون برمجة ثابتة.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-slate-50">
        {[
          { id: 'churches', label: 'إدارة الكنائس وحساباتها' },
          { id: 'competitions', label: 'بنك المسابقات' },
          { id: 'levels', label: 'إدارة المراحل وتخصيص مسابقاتها' },
          { id: 'activityStages', label: 'مراحل الأنشطة' },
          { id: 'hymnStages', label: 'مراحل الألحان' },
          { id: 'validation', label: 'محرك التحقق وإدارة الملفات' },
          { id: 'logo', label: 'شعار المهرجان السنوي' },
          { id: 'migration', label: 'ترحيل البيانات التاريخية (Migration)' },
          { id: 'purge', label: 'تنظيف البيانات القديمة (Wipe)' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 font-black transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6 md:p-8">
        {/* TAB: CHURCHES */}
        {activeTab === 'churches' && (
          <div className="space-y-8">
            <form onSubmit={addChurch} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> إضافة كنيسة جديدة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">اسم الكنيسة</label>
                  <input type="text" value={newChurchName} onChange={e => setNewChurchName(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="مثال: القديس مارجرجس..." />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">كود الدخول (كلمة المرور)</label>
                  <input type="text" value={newChurchCode} onChange={e => setNewChurchCode(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="رمز الدخول الفريد..." />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isSaving}
                className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                إضافة الكنيسة
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {churches.map(church => (
                <div key={church.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="font-black text-slate-800">{church.name}</h4>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded mt-1 inline-block">Code: {church.loginCode}</span>
                  </div>
                  <button onClick={() => setDeleteConfirmation({ id: church.id, type: 'church' })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: COMPETITIONS */}
        {activeTab === 'competitions' && (
          <div className="space-y-8">
            <form onSubmit={addCompetition} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> إضافة مسابقة جديدة للقائمة الرئيسية</h3>
              <div>
                <label className="block text-sm font-bold mb-2">اسم المسابقة</label>
                <input type="text" value={newCompName} onChange={e => setNewCompName(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="مثال: دراسي، ألحان..." />
              </div>
              <button type="submit" className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2">إضافة للقائمة</button>
            </form>

            <div className="flex flex-wrap gap-3">
              {competitions.map(comp => (
                <div key={comp.id} className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold">
                  {comp.name}
                  <button onClick={() => setDeleteConfirmation({ id: comp.id, type: 'comp' })} className="text-indigo-400 hover:text-red-500"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: LEVELS */}
        {activeTab === 'levels' && (
          <div className="space-y-8">
            <form onSubmit={addLevel} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> إضافة مرحلة تعليمية (والمسابقات المسموحة لها)</h3>
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">اسم المرحلة</label>
                <input type="text" value={newLevelName} onChange={e => setNewLevelName(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="مثال: أولي وثانية، حضانة..." />
              </div>
              
              <label className="block text-sm font-bold mb-3">حدد المسابقات المتاحة لهذه المرحلة خصيصاً:</label>
              <div className="flex flex-wrap gap-2 mb-6">
                {competitions.map(comp => {
                  const isSelected = selectedCompetitions.includes(comp.name);
                  return (
                    <button 
                      type="button" 
                      key={comp.id}
                      onClick={() => toggleCompForLevel(comp.name)}
                      className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 border ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-primary'}`}
                    >
                      {isSelected && <Check size={14}/>} {comp.name}
                    </button>
                  );
                })}
              </div>

              <button type="submit" className="px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2">اعتماد المرحلة</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {levels.map(level => (
                <div key={level.id} className="p-5 border border-slate-200 rounded-xl flex flex-col justify-between shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-black text-lg text-slate-800">{level.name}</h4>
                    <button onClick={() => setDeleteConfirmation({ id: level.id, type: 'level' })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {level.allowedCompetitions?.map((c: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ACTIVITY STAGES */}
        {activeTab === 'activityStages' && (
          <div className="space-y-8">
            <form onSubmit={addActivityStage} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> إضافة مرحلة أنشطة (لفرق الكورال، الألحان، والعزف)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">اسم المرحلة</label>
                  <input type="text" value={newActivityStageName} onChange={e => setNewActivityStageName(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="مثال: ابتدائي، إعدادي، مستوى أول..." />
                </div>
              </div>
              <button 
                type="submit" 
                className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة المرحلة
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activityStages.map(stage => (
                <div key={stage.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-slate-800">{stage.name}</h4>
                  </div>
                  <button onClick={() => setDeleteConfirmation({ id: stage.id, type: 'activityStage' as any })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: HYMN STAGES */}
        {activeTab === 'hymnStages' && (
          <div className="space-y-8">
            <form onSubmit={addHymnStage} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> صياغة مرحلة الألحان (للألحان فقط)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">اسم المرحلة</label>
                  <input type="text" value={newHymnStageName} onChange={e => setNewHymnStageName(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="مثال: Nursery, Grade 3..." />
                </div>
              </div>
              <button 
                type="submit" 
                className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2"
              >
                <Plus size={20} />
                إضافة المرحلة
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hymnStages.map(stage => (
                <div key={stage.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="font-black text-lg text-slate-800">{stage.name}</h4>
                  </div>
                  <button onClick={() => setDeleteConfirmation({ id: stage.id, type: 'hymnStage' as any })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: LOGO */}
        {activeTab === 'logo' && (
          <div className="space-y-8 max-w-2xl mx-auto py-8">
            <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <div className="relative inline-block mb-6">
                <div className="w-48 h-48 rounded-full bg-white shadow-2xl flex items-center justify-center p-4 border-4 border-white overflow-hidden">
                  {appLogo ? (
                    <img 
                      src={appLogo} 
                      alt="App Logo" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <ImageIcon size={64} className="text-slate-300" />
                  )}
                </div>
                <label className="absolute bottom-2 right-2 p-3 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  {isUploadingLogo ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </label>
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-2">شعار المهرجان السنوي الرئيسي</h3>
              <p className="text-slate-500 font-bold text-sm mb-6">
                هذا الشعار سيظهر في شاشة الدخول، رأس الصفحة، والتقارير الرسمية. 
                <br />يفضل استخدام صورة مفرغة (PNG) وبأبعاد مربعة.
              </p>
              
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-bold">
                * عند تحديث الشعار، سيتم استبدال الشعار القديم تلقائياً في كافة أنحاء التطبيق.
              </div>
            </div>
          </div>
        )}

        {/* TAB: VALIDATION */}
        {activeTab === 'validation' && (
          <div className="space-y-8">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2"><FileSpreadsheet className="text-primary" /> قوالب Excel الرئيسية (Master Templates)</h3>
              <p className="text-sm text-slate-600 mb-6 font-bold">ارفع ملفات قوالب Excel بحد أقصى 3 ليتم استخدامهم كمرجعية لأعمدة الملفات المرفوعة من الكنائس.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {(validationSettings.templates || []).map((t: any, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
                    <button onClick={() => deleteTemplate(idx)} className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded-full"><X size={16}/></button>
                    <div className="flex items-center gap-3 mb-2">
                      <FileSpreadsheet className="text-emerald-600" />
                      <h4 className="font-black text-slate-800 truncate" title={t.filename}>{t.filename}</h4>
                    </div>
                    <p className="text-xs text-slate-500 font-bold mb-2">{t.headers.length} أعمدة</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                       {t.headers.slice(0, 3).map((h: string, i: number) => <span key={i} className="text-[9px] bg-slate-100 px-1 py-0.5 rounded">{h}</span>)}
                       {t.headers.length > 3 && <span className="text-[9px] bg-slate-100 px-1 py-0.5 rounded">+{t.headers.length - 3}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {(validationSettings.templates || []).length < 3 && (
                <label className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-primary transition-all w-fit font-black text-slate-600">
                  <Upload size={20} className="text-primary" /> 
                  رفع قالب جديد (Excel)
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleTemplateUpload} />
                </label>
              )}
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-xl font-black text-slate-800 mb-6">قواعد توافق العمر مع المرحلة</h3>
              <form onSubmit={handleAddAgeMapping} className="flex flex-wrap gap-4 items-end mb-6">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold mb-1">المرحلة</label>
                  <select name="stage" className="w-full p-3 rounded-lg border border-slate-200" required>
                    <option value="">-- اختر --</option>
                    {levels.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-xs font-bold mb-1">من سنة</label>
                  <input type="number" name="minYear" min="1900" max="2100" className="w-full p-3 rounded-lg border border-slate-200" required placeholder="مثال: 2018" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-bold mb-1">إلى سنة</label>
                  <input type="number" name="maxYear" min="1900" max="2100" className="w-full p-3 rounded-lg border border-slate-200" required placeholder="مثال: 2020" />
                </div>
                <button type="submit" className="px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2 hover:bg-primary/90">
                  <Plus size={20} /> إضافة قاعدة
                </button>
              </form>
              <div className="flex flex-wrap gap-3">
                {(validationSettings.ageMappings || []).map((mapping: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-200 rounded-lg shadow-sm">
                    <span className="font-bold text-sm text-slate-700">{mapping.stage}</span>
                    <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 rounded-full">{mapping.minYear} - {mapping.maxYear}</span>
                    <button onClick={() => deleteAgeMapping(idx)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-xl font-black text-slate-800 mb-4">قواعد التحقق الصارمة (Strict Rules)</h3>
              <label className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={validationSettings.rules?.nameLength} onChange={() => handleToggleRule('nameLength')} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                <div>
                  <h4 className="font-black text-slate-800">طول الاسم والتكوين</h4>
                  <p className="text-xs font-bold text-slate-500">رفض الاسم إذا كان أقل من 3 كلمات أو أكثر من 5 كلمات.</p>
                </div>
              </label>
              <label className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={validationSettings.rules?.genderMatch} onChange={() => handleToggleRule('genderMatch')} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                <div>
                  <h4 className="font-black text-slate-800">تطابق الجنس (اختياري)</h4>
                  <p className="text-xs font-bold text-slate-500">استخدام مكتبة أسماء عربية بسيطة لتنبيه عند عدم تطابق الاسم مع الجنس المختار.</p>
                </div>
              </label>
              <label className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={validationSettings.rules?.mandatoryRows} onChange={() => handleToggleRule('mandatoryRows')} className="w-5 h-5 rounded text-primary focus:ring-primary" />
                <div>
                  <h4 className="font-black text-slate-800">تكامل الصفوف (Row Integrity)</h4>
                  <p className="text-xs font-bold text-slate-500">إذا كان الصف يحتوي على أي بيانات، يجب تعبئة كافة الخلايا الأساسية.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* TAB: MIGRATION */}
        {activeTab === 'migration' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-800 to-indigo-950 text-white p-6 rounded-2xl border border-slate-700 shadow-md">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-300">
                  <ArrowLeftRight size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black mb-1">أداة ترحيل البيانات التاريخية (معالجة لمرة واحدة)</h3>
                  <p className="text-sm font-bold text-slate-300">
                    هذه الأداة تقوم بنسخ كافة البيانات المخزنة قديماً على خوادم Google Firebase Firestore ونقلها تلقائياً إلى خوادم Supabase PostgreSQL الجديدة.
                  </p>
                  <ul className="list-disc leading-relaxed text-xs text-slate-450 mt-3 mr-5 space-y-1">
                    <li>تعمل الأداة بنظام المقارنة الذكي: تقوم تلقائياً بفحص معرّفات البيانات لمنع تكرار أي سجل تم نقله سابقاً.</li>
                    <li>لا تؤثر هذه العملية نهائياً على البيانات الأصلية في Firebase ولا تقوم بمسحها.</li>
                    <li><strong>تأكيد حصري:</strong> ينصح بتشغيل الأداة في الأوقات التي تكون فيها حصص Firebase (Quotas) متاحة أو معادة التهيئة بالكامل (بعد الساعة 10:00 صباحاً بتوقيت مصر).</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 items-center">
                <button
                  onClick={handleMigrateAll}
                  disabled={isMigrating}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-705 text-white rounded-xl font-black text-sm flex items-center gap-2 shadow-sm transition"
                >
                  {isMigrating ? <Loader2 className="animate-spin" size={18} /> : <ArrowLeftRight size={18} />}
                  ترحيل كافة الجداول دفعة واحدة (Bulk Migrate)
                </button>
                {isMigrating && (
                  <span className="text-amber-400 text-xs font-bold animate-pulse">
                    جاري ترحيل الجداول، يرجى عدم إغلاق نافذة المتصفح حتى الاكتمال...
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h4 className="font-black text-slate-800 text-lg mb-4">قائمة الجداول المتاحة للنقل بالتفصيل</h4>
              <div className="space-y-3">
                {MIGRATABLE_COLLECTIONS.map(item => {
                  const statusInfo = migrationStatuses[item.id];
                  return (
                    <div 
                      key={item.id} 
                      className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                          <h5 className="font-bold text-slate-800 text-sm md:text-base">{item.name}</h5>
                        </div>
                        {statusInfo?.status === 'success' && (
                          <div className="text-xs text-slate-500 font-bold flex flex-wrap gap-3 mt-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                            <span>السجل القديم (Firebase): {statusInfo.totalFirebase}</span>
                            <span>•</span>
                            <span>منقول مسبقاً (Supabase): {statusInfo.alreadyInSupabase}</span>
                            <span>•</span>
                            <span>تم نقله الآن: {statusInfo.migratedCount}</span>
                          </div>
                        )}
                        {statusInfo?.message && statusInfo.status !== 'success' && (
                          <p className="text-xs text-indigo-600 font-bold mt-1 bg-indigo-50 px-2 py-1 rounded w-fit">
                            {statusInfo.message}
                          </p>
                        )}
                        {statusInfo?.error && (
                          <p className="text-xs text-red-600 font-bold mt-1 bg-red-50 p-2 rounded border border-red-100 max-w-xl">
                            خطأ: {statusInfo.error}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        {statusInfo?.status === 'running' && (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg border border-amber-100">
                            <Loader2 className="animate-spin" size={14} />
                            جاري العمل...
                          </div>
                        )}
                        {statusInfo?.status === 'success' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                            <Check size={14} />
                            {statusInfo.migratedCount > 0 ? 'مكتمل بنجاح' : 'جاهز ومتطابق'}
                          </div>
                        )}
                        {statusInfo?.status === 'failed' && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-100">
                            <X size={14} />
                            فشل الترحيل
                          </div>
                        )}

                        <button
                          disabled={isMigrating}
                          onClick={() => handleSingleMigration(item.id)}
                          className="px-4 py-2 bg-slate-900 text-white disabled:bg-slate-300 rounded-lg text-xs font-black transition hover:bg-slate-800 shrink-0"
                        >
                          ترحيل الجدول فردياً
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: PURGE */}
        {activeTab === 'purge' && (
          <div className="text-center p-12 bg-red-50 rounded-2xl border border-red-100">
            <Database size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-red-700 mb-2">أداة مسح البيانات القديمة</h3>
            <p className="text-red-600 font-bold mb-8">استخدم هذه الأداة بحذر. سيتم تفريغ كافة قواعد البيانات القديمة للكنائس الثابتة لتهيئة النظام لمرحلة الإدارة الديناميكية.</p>
            <button 
              onClick={() => setDeleteConfirmation({ id: 'all', type: 'purge' })}
              className="bg-red-600 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg hover:bg-red-700 transition"
            >
              تشغيل كود التنظيف Wipe Out
            </button>
            {purgeStatus && <p className="mt-6 text-slate-800 font-black">{purgeStatus}</p>}
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="text-2xl font-black text-slate-800 mb-4">تأكيد الحذف</h3>
            <p className="text-slate-600 font-bold mb-8">
              {deleteConfirmation.type === 'purge' 
                ? 'تحذير: سيتم مسح الكنائس، والمراحل، والمسابقات القديمة بشكل نهائي. هل أنت متأكد؟'
                : 'هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.'}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if (deleteConfirmation.type === 'church') deleteChurch(deleteConfirmation.id);
                  else if (deleteConfirmation.type === 'comp') deleteCompetition(deleteConfirmation.id);
                  else if (deleteConfirmation.type === 'level') deleteLevel(deleteConfirmation.id);
                  else if (deleteConfirmation.type === 'activityStage') deleteActivityStage(deleteConfirmation.id);
                  else if (deleteConfirmation.type === 'hymnStage') deleteHymnStage(deleteConfirmation.id);
                  else if (deleteConfirmation.type === 'purge') handlePurge();
                }}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all"
              >
                تأكيد الحذف
              </button>
              <button 
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
