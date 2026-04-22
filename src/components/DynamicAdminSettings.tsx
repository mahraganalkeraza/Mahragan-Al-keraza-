import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, storage, ref, uploadBytes, getDownloadURL } from '../firebase';
import { Trash2, Edit2, Plus, LogIn, Database, ShieldCheck, Check, X, Image as ImageIcon, Upload, Loader2 } from 'lucide-react';

export default function DynamicAdminSettings() {
  const [churches, setChurches] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'churches' | 'levels' | 'competitions' | 'logo' | 'purge'>('churches');

  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Input states
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchCode, setNewChurchCode] = useState('');
  
  const [newLevelName, setNewLevelName] = useState('');
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>([]);

  const [newCompName, setNewCompName] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [purgeStatus, setPurgeStatus] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const churchesSnap = await getDocs(collection(db, 'churches'));
      setChurches(churchesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const levelsSnap = await getDocs(collection(db, 'levels'));
      setLevels(levelsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const compSnap = await getDocs(collection(db, 'competitions'));
      setCompetitions(compSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const configSnap = await getDoc(doc(db, 'settings', 'app_config'));
      if (configSnap.exists()) {
        setAppLogo(configSnap.data().appLogo || null);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // PURGE LOGIC
  const handlePurge = async () => {
    if (!window.confirm("تحذير: سيتم مسح الكنائس، والمراحل، والمسابقات القديمة بشكل لا رجعة فيه. هل أنت متأكد؟")) return;
    setPurgeStatus('جاري مسح البيانات القديمة...');
    try {
      const collectionsToPurge = ['public_churches', 'churches', 'levels', 'competitions'];
      for (const col of collectionsToPurge) {
        const snap = await getDocs(collection(db, col));
        for (const document of snap.docs) {
          await deleteDoc(doc(db, col, document.id));
        }
      }
      setPurgeStatus('تم تنظيف قواعد البيانات القديمة والكاملة بنجاح!');
      fetchData();
    } catch (e) {
      console.error(e);
      setPurgeStatus('حدث خطأ أثناء المسح.');
    }
  };

  // CHURCHES
  const addChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurchName || !newChurchCode) return;
    try {
      await addDoc(collection(db, 'churches'), { name: newChurchName, loginCode: newChurchCode });
      setNewChurchName(''); setNewChurchCode('');
      fetchData();
    } catch (e) { console.error(e); }
  };
  const deleteChurch = async (id: string) => {
    if (!window.confirm("متأكد من الحذف؟")) return;
    await deleteDoc(doc(db, 'churches', id));
    fetchData();
  };

  // COMPETITIONS
  const addCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName) return;
    try {
      await addDoc(collection(db, 'competitions'), { name: newCompName });
      setNewCompName('');
      fetchData();
    } catch (e) { console.error(e); }
  };
  const deleteCompetition = async (id: string) => {
    if (!window.confirm("متأكد من الحذف؟")) return;
    await deleteDoc(doc(db, 'competitions', id));
    fetchData();
  };

  // LEVELS
  const addLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName) return;
    try {
      await addDoc(collection(db, 'levels'), { name: newLevelName, allowedCompetitions: selectedCompetitions });
      setNewLevelName(''); setSelectedCompetitions([]);
      fetchData();
    } catch (e) { console.error(e); }
  };
  const deleteLevel = async (id: string) => {
    if (!window.confirm("متأكد من الحذف؟")) return;
    await deleteDoc(doc(db, 'levels', id));
    fetchData();
  };
  const toggleCompForLevel = (compName: string) => {
    if (selectedCompetitions.includes(compName)) {
      setSelectedCompetitions(selectedCompetitions.filter(c => c !== compName));
    } else {
      setSelectedCompetitions([...selectedCompetitions, compName]);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const storageRef = ref(storage, `app/logo_${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await setDoc(doc(db, 'settings', 'app_config'), { appLogo: downloadURL }, { merge: true });
      setAppLogo(downloadURL);
      alert('تم تحديث شعار المهرجان بنجاح!');
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert('حدث خطأ أثناء رفع الشعار.');
    } finally {
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
          { id: 'logo', label: 'شعار المهرجان السنوي' },
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
              <button type="submit" className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2">إضافة الكنيسة</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {churches.map(church => (
                <div key={church.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <h4 className="font-black text-slate-800">{church.name}</h4>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded mt-1 inline-block">Code: {church.loginCode}</span>
                  </div>
                  <button onClick={() => deleteChurch(church.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
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
                  <button onClick={() => deleteCompetition(comp.id)} className="text-indigo-400 hover:text-red-500"><X size={16} /></button>
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
                    <button onClick={() => deleteLevel(level.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
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

        {/* TAB: PURGE */}
        {activeTab === 'purge' && (
          <div className="text-center p-12 bg-red-50 rounded-2xl border border-red-100">
            <Database size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-red-700 mb-2">أداة مسح البيانات القديمة</h3>
            <p className="text-red-600 font-bold mb-8">استخدم هذه الأداة بحذر. سيتم تفريغ كافة قواعد البيانات القديمة للكنائس الثابتة لتهيئة النظام لمرحلة الإدارة الديناميكية.</p>
            <button 
              onClick={handlePurge}
              className="bg-red-600 text-white px-8 py-4 rounded-xl font-black text-lg shadow-lg hover:bg-red-700 transition"
            >
              تشغيل كود التنظيف Wipe Out
            </button>
            {purgeStatus && <p className="mt-6 text-slate-800 font-black">{purgeStatus}</p>}
          </div>
        )}

      </div>
    </div>
  );
}
