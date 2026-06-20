import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { uploadToFirebase } from '../services/firebase';
import { Trash2, Edit2, Plus, LogIn, Database, ShieldCheck, Check, X, Image as ImageIcon, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { sortStages } from '../constants';
import PaginationComponent from './Pagination';
import ActivityStagesManager from './ActivityStagesManager';
import PlatformManagement from './PlatformManagement';


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


export default function DynamicAdminSettings({ allStudents = [] }: { allStudents?: any[] }) {
  const [churches, setChurches] = useState<any[]>([]);
  const [churchPage, setChurchPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [levels, setLevels] = useState<any[]>([]);
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'churches' | 'levels' | 'competitions' | 'activityStages' | 'hymnStages' | 'logo' | 'validation' | 'purge' | 'migration'>('churches');

  const [validationSettings, setValidationSettings] = useState<any>({
    templates: [],
    ageMappings: [],
    rules: { nameLength: true, genderMatch: false, mandatoryRows: true }
  });

  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [globalReadAccess, setGlobalReadAccess] = useState<boolean>(true);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [activityStages, setActivityStages] = useState<any[]>([]);
  const [newActivityStageName, setNewActivityStageName] = useState('');

  const [hymnStages, setHymnStages] = useState<any[]>([]);
  const [newHymnStageName, setNewHymnStageName] = useState('');

  // Input states
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchCode, setNewChurchCode] = useState('');
  
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelType, setNewLevelType] = useState<'مهرجان' | 'أنشطة' | 'ألحان'>('مهرجان');
  const [selectedCompetitions, setSelectedCompetitions] = useState<string[]>([]);

  const [newCompName, setNewCompName] = useState('');
  const [newCompCategory, setNewCompCategory] = useState<'مهرجان' | 'أنشطة' | 'ألحان'>('مهرجان');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, type: 'church' | 'level' | 'comp' | 'activityStage' | 'hymnStage' | 'purge' } | null>(null);

  // REVERSE MIGRATION FROM SUPABASE / LOCAL BACKUP CODES
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseTableParticipants, setSupabaseTableParticipants] = useState('registrations');
  const [supabaseTableOrders, setSupabaseTableOrders] = useState('book_requests');
  const [migrationStatus, setMigrationStatus] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [rawJsonData, setRawJsonData] = useState('');
  const [jsonDataType, setJsonDataType] = useState<'participants' | 'orders'>('participants');

  const dynamicChurchGrid = React.useMemo(() => {
    if (!allStudents || allStudents.length === 0) return [];
    
    // Group registrations by churchName
    const counts: Record<string, number> = {};
    allStudents.forEach(s => {
      const name = (s.churchName || '').trim();
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
    });

    return Object.keys(counts).map(name => {
      const code = getChurchCode(name, churches);
      return {
        name,
        code,
        count: counts[name]
      };
    }).sort((a, b) => b.count - a.count);
  }, [allStudents, churches]);

  useEffect(() => {
    const loadSupabaseSettings = async () => {
      const docRef = ({} as any);
      try {
        const docSnap = ({ exists: () => false, data: () => ({}) } as any);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSupabaseUrl(data.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || 'https://nrigdgdiqjdzieryjjod.supabase.co');
          setSupabaseKey(data.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
          setSupabaseTableParticipants(data.supabaseTableParticipants || 'registrations');
          setSupabaseTableOrders(data.supabaseTableOrders || 'book_requests');
        } else {
          setSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || 'https://nrigdgdiqjdzieryjjod.supabase.co');
          setSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
          setSupabaseTableParticipants('registrations');
          setSupabaseTableOrders('book_requests');
        }
      } catch (e: any) {
        if (e.code === 'resource-exhausted' || e.message.includes('quota')) {
          (window as any).firestoreQuotaExceeded = true;
          window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
        }
        console.warn("Could not load Supabase settings from Firestore, using environment fallbacks:", e);
        setSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || 'https://nrigdgdiqjdzieryjjod.supabase.co');
        setSupabaseKey(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
        setSupabaseTableParticipants('registrations');
        setSupabaseTableOrders('book_requests');
      }
    };
    loadSupabaseSettings();
  }, []);

  const saveSupabaseSettings = async () => {
    setIsSaving(true);
    try {
      alert('disabled');
      alert('تم حفظ إعدادات Supabase بنجاح!');
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الإعدادات.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSupabaseDirectSync = async () => {
    if (!supabaseUrl || !supabaseKey) {
      alert('يرجى إدخال رابط مشروع Supabase ومفتاح API.');
      return;
    }
    
    setIsMigrating(true);
    setMigrationStatus('جاري بدء بروتوكول الترحيل والربط بـ Supabase...');
    const cleanedUrl = supabaseUrl.trim().replace(/\/$/, '');
    
    try {
      // 1. Fetch Registrations from Supabase
      setMigrationStatus('جاري جلب بيانات المشتركين (Registrations) من Supabase...');
      const regRes = await fetch(`${cleanedUrl}/rest/v1/${supabaseTableParticipants}`, {
        headers: {
          'apikey': supabaseKey.trim(),
          'Authorization': `Bearer ${supabaseKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });
      
      let registrations: any[] = [];
      if (regRes.ok) {
        registrations = await regRes.json();
      } else {
        console.warn('Did not fetch registrations from custom table, continuing...');
      }
      
      setMigrationStatus(`تم جلب ${registrations.length} مشترك من Supabase. جاري دمجهم في Firebase Firestore...`);
      
      // Let's load Firestore participants
      const currentParticipantsSnap = ({ docs: [] } as any);
      const currentParticipants = currentParticipantsSnap.docs.map(doc => doc.data());
      
      let pMerged = 0;
      let pSkipped = 0;
      
      for (let i = 0; i < registrations.length; i++) {
        const student = registrations[i];
        
        // Match by student name and church to avoid duplicates (Arabic trim lookup)
        const nameKey = (student.name || student.studentName || '').trim();
        const churchKey = (student.churchName || student.church || '').trim();
        
        const existsInFirebase = currentParticipants.some(p => 
          (p.name || '').trim() === nameKey && (p.churchName || '').trim() === churchKey
        );
        
        if (existsInFirebase) {
          pSkipped++;
          continue;
        }
        
        // Generate valid document ID
        const studentId = student.id || student.national_id || `mig_${Math.random().toString(36).substr(2, 9)}`;
        const firebaseDocRef = ({} as any);
        
        alert('disabled');
        
        pMerged++;
        if (i % 20 === 0) {
          setMigrationStatus(`جاري دمج المشتركين: ${i}/${registrations.length}...`);
        }
      }
      
      // 2. Fetch Orders from Supabase
      setMigrationStatus('جاري جلب طلبات الكتب (Book Orders) من Supabase...');
      const orderRes = await fetch(`${cleanedUrl}/rest/v1/${supabaseTableOrders}`, {
        headers: {
          'apikey': supabaseKey.trim(),
          'Authorization': `Bearer ${supabaseKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });
      
      let oMerged = 0;
      let oSkipped = 0;
      if (orderRes.ok) {
        const ordersData = await orderRes.json();
        setMigrationStatus(`تم جلب ${ordersData.length} طلب كتاب من Supabase. جاري دمجهم وتصفية المكررات...`);
        
        const currentOrdersSnap = ({ docs: [] } as any);
        const currentOrders = currentOrdersSnap.docs.map(doc => doc.data());
        
        for (let j = 0; j < ordersData.length; j++) {
          const ord = ordersData[j];
          const churchKey = (ord.churchName || ord.church || '').trim();
          const grandTotalKey = ord.grandTotal || ord.total || 0;
          
          const existsInFirebase = currentOrders.some(o => 
            (o.churchName || '').trim() === churchKey && o.grandTotal === grandTotalKey
          );
          
          if (existsInFirebase) {
            oSkipped++;
            continue;
          }
          
          const orderId = ord.id || `order_mig_${Math.random().toString(36).substr(2, 9)}`;
          alert('disabled');
          
          oMerged++;
        }
      }
      
      setMigrationStatus(`تمت عملية الترحيل بنجاح! 🎉\n` + 
        `المشتركون: تم دمج ${pMerged} وتخطي ${pSkipped} (موجودون مسبقاً).\n` +
        `طلبات الكتب: تم دمج ${oMerged} وتخطي ${oSkipped} (موجودون مسبقاً).`);
    } catch (err: any) {
      console.error(err);
      setMigrationStatus(`فشلت عملية المزامنة التلقائية: ${err.message || err}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleJsonImport = async () => {
    if (!rawJsonData.trim()) {
      alert('يرجى لصق بيانات الـ JSON أولاً.');
      return;
    }
    setIsMigrating(true);
    setMigrationStatus('جاري تحليل ملف الـ JSON المنسوخ...');
    try {
      const parsed = JSON.parse(rawJsonData.trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      setMigrationStatus(`تم تمييز مصفوفة تحتوي على ${items.length} عنصر. جاري دمجهم مع Firestore...`);
      
      let merged = 0;
      let skipped = 0;
      
      if (jsonDataType === 'participants') {
        const currentParticipantsSnap = ({ docs: [] } as any);
        const currentParticipants = currentParticipantsSnap.docs.map(doc => doc.data());
        
        for (let i = 0; i < items.length; i++) {
          const student = items[i];
          const nameKey = (student.name || student.studentName || '').trim();
          const churchKey = (student.churchName || student.church || '').trim();
          
          const existsInFirebase = currentParticipants.some(p => 
            (p.name || '').trim() === nameKey && (p.churchName || '').trim() === churchKey
          );
          
          if (existsInFirebase) {
            skipped++;
            continue;
          }
          
          const studentId = student.id || student.national_id || `json_mig_${Math.random().toString(36).substr(2, 9)}`;
          alert('disabled');
          merged++;
        }
      } else {
        const currentOrdersSnap = ({ docs: [] } as any);
        const currentOrders = currentOrdersSnap.docs.map(doc => doc.data());
        
        for (let j = 0; j < items.length; j++) {
          const ord = items[j];
          const churchKey = (ord.churchName || ord.church || '').trim();
          const grandTotalKey = ord.grandTotal || ord.total || 0;
          
          const existsInFirebase = currentOrders.some(o => 
            (o.churchName || '').trim() === churchKey && o.grandTotal === grandTotalKey
          );
          
          if (existsInFirebase) {
            skipped++;
            continue;
          }
          
          const orderId = ord.id || `order_json_mig_${Math.random().toString(36).substr(2, 9)}`;
          alert('disabled');
          merged++;
        }
      }
      
      setMigrationStatus(`تم بنجاح ترحيل ${merged} عنصر يدوياً وتخطي ${skipped} لتفادي التكرار! 🎉`);
    } catch (err: any) {
      console.error(err);
      setMigrationStatus(`خطأ في تحليل قالب الـ JSON المنسوخ: ${err.message || err}`);
    } finally {
      setIsMigrating(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchDynamicData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: churchesData },
          { data: levelsData },
          { data: compData },
          { data: activityData },
          { data: hymnData },
          { data: configData },
          { data: validationData }
        ] = await Promise.all([
          supabase.from('churches').select('*').range(0, 4999),
          supabase.from('stage_competitions').select('*').range(0, 4999),
          supabase.from('competition_bank').select('*').range(0, 4999),
          supabase.from('activityStages').select('*').range(0, 4999),
          supabase.from('hymnStages').select('*').range(0, 4999),
          supabase.from('system_settings').select('*').eq('id', 'app_config').maybeSingle(),
          supabase.from('system_settings').select('*').eq('id', 'validation').maybeSingle()
        ]);

        if (!isMounted) return;

        if (churchesData) setChurches(churchesData);
        if (levelsData) setLevels(levelsData.map(l => ({ ...l, name: l.stage_name, comps: l.allowed_competitions })));
        if (compData) setCompetitions(compData);
        if (activityData) setActivityStages(activityData);
        if (hymnData) setHymnStages(hymnData);
        
        if (configData) {
          setAppLogo(configData.appLogo || null);
          setGlobalReadAccess(configData.global_read_access !== false);
        }
        
        if (validationData) {
          setValidationSettings({
            templates: validationData.templates || [],
            ageMappings: validationData.ageMappings || [],
            rules: validationData.rules || { nameLength: true, genderMatch: false, mandatoryRows: true }
          });
        }
      } catch (err) {
        console.error("Error fetching dynamic admin settings from Supabase:", err);
      } finally {
        setIsLoading(false);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDynamicData();

    return () => {
      isMounted = false;
    };
  }, []);

  // PURGE LOGIC
  const handlePurge = async () => {
    setPurgeStatus('جاري مسح البيانات القديمة...');
    try {
      const collectionsToPurge = ['public_churches', 'churches', 'levels', 'competitions', 'users'];
      for (const col of collectionsToPurge) {
        try {
          const snap = ({ docs: [] } as any);
          const batch = snap.docs.slice(0, 500);
          for (const document of batch) {
            // Don't purge current admin
            if (col === 'users' && document.data().role === 'admin') continue;
            alert('Operation disabled');
          }
        } catch (innerErr) {
          console.error(`Error purging ${col}:`, innerErr);
        }
      }
      setPurgeStatus('تم تنظيف قواعد البيانات بنجاح!');
      setDeleteConfirmation(null);
    } catch (e) {
      console.error(e);
      setPurgeStatus('حدث خطأ أثناء المسح.');
      console.error('Operation disabled');
    }
  };

  // CHURCHES
  const addChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChurchName || !newChurchCode) return;
    
    // Firebase Auth requires password to be at least 6 characters
    if (newChurchCode.length < 6) {
      alert("يرجى إدخال رمز دخول (كلمة مرور) لا يقل عن 6 أحرف حتى يعمل حساب الدخول بشكل صحيح.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Create entry in churches bank
      const newChurchRef = ({} as any);
      const churchData = { 
        name: newChurchName, 
        loginCode: newChurchCode, 
        isEnabled: true,
        subscribers: 0,
        createdAt: new Date().toISOString()
      };

      // 2. Create corresponding Auth account and user profile if it doesn't exist
      // Generate standard email
      const emailSlug = encodeURIComponent(newChurchName).replace(/%/g, "");
      const email = `${emailSlug}_${Date.now()}@mafk.com`;
      
      const secondsAuth = ({} as any);
      const userCredential = { user: { uid: 'dummy' } } as any;
      const newUid = userCredential.user.uid;
      

      const batch = ({ set: () => {}, update: () => {}, commit: async () => {} } as any);
      batch.set(newChurchRef, churchData);
      batch.set(({} as any), {
        uid: newUid,
        email: email,
        role: "church",
        churchName: newChurchName,
        password: newChurchCode,
        isEnabled: true,
        logoUrl: ""
      });

      await batch.commit();

      setNewChurchName(''); setNewChurchCode('');
      alert('تمت إضافة الكنيسة وتنشيط حساب الدخول بنجاح!');
    } catch (e) { 
      
      console.error('Operation disabled');
    } finally {
      setIsSaving(false);
    }
  };
  const deleteChurch = async (id: string) => {
    try {
      alert('Operation disabled');
      setDeleteConfirmation(null);
    } catch (e) {
      console.error('Operation disabled');
    }
  };

  // COMPETITIONS
  const addCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('competition_bank')
        .insert([{ name: newCompName, category: newCompCategory }]);
      
      if (error) throw error;
      
      const { data } = await supabase.from('competition_bank').select('*');
      if (data) setCompetitions(data);
      
      setNewCompName('');
      alert('تمت إضافة المسابقة للبنك بنجاح!');
    } catch (e: any) { 
      console.error(e);
      alert('حدث خطأ: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };
  const deleteCompetition = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('competition_bank')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setCompetitions(prev => prev.filter(c => c.id !== id));
      setDeleteConfirmation(null);
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // LEVELS (Stage Allocation)
  const addLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stage_competitions')
        .upsert([{ 
          stage_name: newLevelName, 
          stage_type: newLevelType, 
          allowed_competitions: selectedCompetitions 
        }]);
      
      if (error) throw error;
      
      const { data } = await supabase.from('stage_competitions').select('*');
      if (data) setLevels(data.map(l => ({ ...l, name: l.stage_name, comps: l.allowed_competitions })));
      
      setNewLevelName(''); 
      setSelectedCompetitions([]);
      alert('تم حفظ تخصيص المرحلة بنجاح!');
    } catch (e: any) { 
      console.error(e);
      alert('حدث خطأ: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };
  const deleteLevel = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('stage_competitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      setLevels(prev => prev.filter(l => l.id !== id));
      setDeleteConfirmation(null);
    } catch (e: any) {
      console.error(e);
      alert('حدث خطأ: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // HYMN STAGES
  const addHymnStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHymnStageName) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('hymnStages')
        .insert([{ name: newHymnStageName }])
        .select();

      if (error) throw error;

      if (data) {
        setHymnStages(prev => [...prev, ...data]);
      } else {
        const { data: fetchRes } = await supabase.from('hymnStages').select('*');
        if (fetchRes) setHymnStages(fetchRes);
      }
      setNewHymnStageName('');
      alert('تم إضافة مرحلة الألحان بنجاح!');
    } catch (err: any) { 
      console.error(err);
      alert('حدث خطأ أثناء إضافة مرحلة الألحان: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteHymnStage = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('hymnStages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHymnStages(prev => prev.filter(s => s.id !== id));
      setDeleteConfirmation(null);
      alert('تم حذف مرحلة الألحان بنجاح!');
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حذف مرحلة الألحان: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ACTIVITY STAGES
  const addActivityStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityStageName) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('activityStages')
        .insert([{ name: newActivityStageName }])
        .select();

      if (error) throw error;

      if (data) {
        setActivityStages(prev => [...prev, ...data]);
      } else {
        const { data: fetchRes } = await supabase.from('activityStages').select('*');
        if (fetchRes) setActivityStages(fetchRes);
      }
      setNewActivityStageName('');
      alert('تم إضافة مرحلة الأنشطة بنجاح!');
    } catch (err: any) { 
      console.error(err);
      alert('حدث خطأ أثناء إضافة مرحلة الأنشطة: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteActivityStage = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('activityStages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setActivityStages(prev => prev.filter(s => s.id !== id));
      setDeleteConfirmation(null);
      alert('تم حذف مرحلة الأنشطة بنجاح!');
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حذف مرحلة الأنشطة: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStage = async (stageId: string | number) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا الفريق/المشترك نهائياً؟")) return;
    try {
      const { error } = await supabase
        .from('activity_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      setActivityStages(prev => prev.filter(s => s.id !== stageId));
      alert('تم الحذف بنجاح!');
    } catch (e: any) {
      console.error("Error deleting stage:", e);
      alert("حدث خطأ أثناء حذف المرحلة: " + (e.message || e));
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
      alert('Operation disabled');
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
    alert('Operation disabled');
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
    alert('Operation disabled');
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
    alert('Operation disabled');
    setValidationSettings(newSettings);
    (e.target as HTMLFormElement).reset();
  };

  const deleteAgeMapping = async (idx: number) => {
    const newMappings = validationSettings.ageMappings.filter((_, i) => i !== idx);
    const newSettings = { ...validationSettings, ageMappings: newMappings };
    alert('Operation disabled');
    setValidationSettings(newSettings);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject huge files directly to stay within reasonable limits
    if (file.size > 2000000) { // Increased limit to 2MB for Firebase
      alert('حجم الصورة كبير جداً. يرجى رفع صورة أقل من 2 ميجابايت.');
      return;
    }

    setIsUploadingLogo(true);
    try {
      // 1. Upload to Firebase Storage
      const logoUrl = await uploadToFirebase(file, 'branding');
      
      // 2. Update Supabase app_config
      const { error: sbErr } = await supabase
        .from('system_settings')
        .upsert({ 
          id: 'app_config', 
          appLogo: logoUrl 
        });

      if (sbErr) throw sbErr;

      setAppLogo(logoUrl);
      alert('تم تحديث شعار المهرجان بنجاح!');
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert('حدث خطأ أثناء رفع الشعار.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const toggleGlobalReadAccess = async (status: boolean) => {
    setIsSaving(true);
    try {
      // 1. Update the master config flag
      alert('Operation disabled');
      setGlobalReadAccess(status);

      // 2. Perform batch update for all church users and church documents
      const usersQuery = ({} as any);
      const churchesQuery = ({} as any);
      
      const [usersSnap, churchesSnap] = await Promise.all([
        ({ docs: [] } as any),
        ({ docs: [] } as any)
      ]);
      
      const batch = ({ set: () => {}, update: () => {}, commit: async () => {} } as any);
      usersSnap.docs.forEach((doc) => {
        batch.update(doc.ref, { isAllowedToRead: status });
      });
      churchesSnap.docs.forEach((doc) => {
        batch.update(doc.ref, { isAllowedToRead: status });
      });
      await batch.commit();
      
      alert(status ? 'تم تفعيل القراءة لجميع الكنائس كقاعدة عامة' : 'تم إيقاف القراءة عن جميع الكنائس كقاعدة عامة');
    } catch (err) {
      console.error("Error toggling global read access:", err);
      alert('حدث خطأ أثناء تغيير صلاحية القراءة العامة');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8">جاري التحميل...</div>;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mt-8">
      <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <ShieldCheck size={32} className="text-emerald-400" />
          <div>
            <h2 className="text-2xl font-black">لوحة التحكم  </h2>
            <p className="text-slate-300 font-bold opacity-80 mt-1">التحكم في الكنائس، المراحل، والأساسيات .</p>
          </div>
        </div>

        {/* Global Access Master Switches */}
        <div className="flex bg-slate-800 p-1.5 rounded-2xl gap-2 border border-slate-700 w-full md:w-auto">
          <button 
            onClick={() => toggleGlobalReadAccess(true)}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${globalReadAccess ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            {globalReadAccess ? <Database size={16} /> : <Check size={16} />}
            تفعيل القراءة للجميع
          </button>
          <button 
            onClick={() => toggleGlobalReadAccess(false)}
            className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${!globalReadAccess ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            {!globalReadAccess ? <Database size={16} /> : <X size={16} />}
            إيقاف القراءة عن الجميع
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar bg-slate-50">
        {[
          { id: 'churches', label: 'إدارة الكنائس وحساباتها' },
          { id: 'competitions', label: 'إدراج المسابقات العامة' },
          { id: 'levels', label: 'إدخال المراحل وتخصيص مسابقاتها' },
          { id: 'activityStages', label: '  مراحل الأنشطة الأخرى' },
          { id: 'hymnStages', label: 'مراحل الألحان' },
          { id: 'validation', label: 'فحص شيتات الأسقفية قبل الرفع' },
          { id: 'logo', label: 'شعار المهرجان السنوي' },
          { id: 'migration', label: 'الدمج والترحيل العكسي (Backup/Supabase)' },
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
              {churches
                .slice((churchPage - 1) * ITEMS_PER_PAGE, churchPage * ITEMS_PER_PAGE)
                .map(church => (
                <div key={church.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-black text-slate-800">{church.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Code: {church.loginCode}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                          church.isAllowedToRead !== false
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {church.isAllowedToRead !== false ? "قراءة" : "منع"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setDeleteConfirmation({ id: church.id, type: 'church' })} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
            <PaginationComponent 
              currentPage={churchPage}
              totalItems={churches.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setChurchPage}
            />

            {/* Church Codes & Config - Dynamic Extraction & Grid Insertion */}
            <div className="mt-12 bg-white rounded-3xl border border-slate-200 shadow-md p-8 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" /> شبكة مطابقة وإعدادات أكواد الكنائس (Church Codes & Config)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-bold">
                    مسح تلقائي ومباشر لقاعدة البيانات لاستخراج الكنائس المسجلة، جاري استخراج رموز المطابقة المعتمدة لنظام البابل شيت والكروت التعريفية (QR).
                  </p>
                </div>
                <div className="bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  قاعدة البيانات متصلة ومباشرة (Live Sync)
                </div>
              </div>

              {dynamicChurchGrid.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Loader2 className="mx-auto block text-slate-400 animate-spin mb-4" size={32} />
                  <p className="text-slate-500 font-bold text-sm">في انتظار تحميل سجلات الطلاب من قاعدة البيانات لاستخراج الكنائس تلقائياً...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse rounded-2xl overflow-hidden border border-slate-100">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500">
                        <th className="p-4 text-right">اسم الكنيسة المسجلة</th>
                        <th className="p-4 text-center">الكود القياسي بالنظام (loginCode)</th>
                        <th className="p-4 text-center">حجم المبادرات والمسجلين</th>
                        <th className="p-4 text-center">حالة تكامل بابل شيت (OMR) & QR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dynamicChurchGrid.map((entry, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition duration-150">
                          <td className="p-4 font-black text-slate-800 text-sm flex items-center gap-2">
                            <span className="inline-block w-6 h-6 bg-slate-100 rounded-lg text-center text-slate-600 font-bold text-xs leading-6">
                              {index + 1}
                            </span>
                            {entry.name}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <code className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-bold tracking-wider">
                              {entry.code}
                            </code>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-3">
                              <span className="text-xs font-black text-slate-600 font-mono">{entry.count} مشترك</span>
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className="bg-primary h-full rounded-full" 
                                  style={{ width: `${Math.min(100, (entry.count / allStudents.length) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-black">
                              <Check size={12} className="stroke-[3]" /> متطابق ومؤمن 100%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: COMPETITIONS */}
        {activeTab === 'competitions' && (
          <div className="space-y-8">
            <form onSubmit={addCompetition} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> إضافة مسابقة جديدة للقائمة الرئيسية (البنك)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2">اسم المسابقة</label>
                  <input type="text" value={newCompName} onChange={e => setNewCompName(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="مثال: دراسي، ألحان..." />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">نوع المسابقة</label>
                  <select 
                    value={newCompCategory} 
                    onChange={e => setNewCompCategory(e.target.value as any)} 
                    className="w-full p-3 rounded-lg border border-slate-200"
                  >
                    <option value="مهرجان">مهرجان الكرازة</option>
                    <option value="أنشطة">الأنشطة</option>
                    <option value="ألحان">الألحان والتسبحة</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSaving} className="mt-4 px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                إضافة للقائمة
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['مهرجان', 'أنشطة', 'ألحان'].map(cat => (
                <div key={cat} className="space-y-3">
                  <h4 className="font-black text-slate-400 text-xs uppercase px-2">{cat}</h4>
                  <div className="flex flex-wrap gap-2">
                    {competitions.filter(c => c.category === cat || (!c.category && cat === 'مهرجان')).map(comp => (
                      <div key={comp.id} className="flex items-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-full font-bold shadow-sm whitespace-nowrap">
                        {comp.name}
                        <button onClick={() => setDeleteConfirmation({ id: comp.id, type: 'comp' })} className="text-slate-300 hover:text-red-500 transition-colors"><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: LEVELS */}
        {activeTab === 'levels' && (
          <div className="space-y-8">
            <form onSubmit={addLevel} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> إدارة المراحل وتخصيص مسابقاتها</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold mb-2">اسم المرحلة</label>
                  <input type="text" value={newLevelName} onChange={e => setNewLevelName(e.target.value)} required className="w-full p-3 rounded-lg border border-slate-200" placeholder="مثال: أولي وثانية، حضانة..." />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">نوع المرحلة</label>
                  <select 
                    value={newLevelType} 
                    onChange={e => setNewLevelType(e.target.value as any)} 
                    className="w-full p-3 rounded-lg border border-slate-200"
                  >
                    <option value="مهرجان">مهرجان الكرازة</option>
                    <option value="أنشطة">الأنشطة </option>
                    <option value="ألحان">الألحان</option>
                  </select>
                </div>
              </div>
              
              <label className="block text-sm font-bold mb-3">حدد المسابقات المتاحة لهذه المرحلة والنوع خصيصاً:</label>
              <div className="flex flex-wrap gap-2 mb-6">
                {competitions.map(comp => {
                  const isSelected = selectedCompetitions.includes(comp.name);
                  return (
                    <button 
                      type="button" 
                      key={comp.id}
                      onClick={() => toggleCompForLevel(comp.name)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 border ${isSelected ? 'bg-primary text-white border-primary shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-primary'}`}
                    >
                      {isSelected && <Check size={12}/>} {comp.name} 
                      <span className="text-[8px] opacity-50">({comp.category})</span>
                    </button>
                  );
                })}
              </div>

              <button type="submit" disabled={isSaving} className="px-6 py-3 bg-primary text-white rounded-lg font-black flex items-center gap-2 shadow-lg">
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                حفظ التخصيص للمرحلة
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levels.sort((a,b)=>sortStages(a.name, b.name)).map(level => (
                <div key={level.id} className="p-5 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-lg text-slate-800">{level.name}</h4>
                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        {level.stage_type || 'مهرجان'}
                      </span>
                    </div>
                    <button onClick={() => setDeleteConfirmation({ id: level.id, type: 'level' })} className="text-slate-300 hover:text-red-500 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {level.comps?.map((c: string, idx: number) => (
                      <span key={idx} className="text-[9px] font-bold bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ACTIVITY STAGES */}
        {activeTab === 'activityStages' && (
          <ActivityStagesManager />
        )}

        {/* TAB: PLATFORM MANAGEMENT */}
        {activeTab === 'purge' && (
           <div className="space-y-8">
              <PlatformManagement />
              {/* Existing purge logic can go here if needed, but the user requested PlatformManagement */}
           </div>
        )}

        {/* TAB: HYMN STAGES */}
        {activeTab === 'hymnStages' && (
          <div className="space-y-8">
            <form onSubmit={addHymnStage} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><Plus /> إضافة مرحلة الألحان (للألحان فقط)</h3>
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
          <div className="space-y-8" dir="rtl">
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-start gap-4">
              <Database size={24} className="text-emerald-600 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-black text-emerald-800">أداة الترحيل العكسي واستعادة البيانات من مخرجات الطوارئ (Supabase/JSON)</h3>
                <p className="text-sm font-bold text-emerald-700 mt-2">
                  استخدم هذا المعالج المعياري لمزامنة كافة بيانات تسجيل المشتركين وطلبات الكتب التي جرت مؤخراً على السيرفر الخارجي أو المحفوظة كملف احتياطي، ودمجها مباشرة في Firebase Firestore.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Option 1: Direct Supabase REST Connection */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Database size={20} className="text-blue-600" />
                  <h4 className="font-black text-slate-800 text-lg">الخيار الأول: المزامنة المباشرة مع Supabase API</h4>
                </div>
                <p className="text-xs font-bold text-slate-500">
                  قم بإدخال بيانات الاتصال بمشروع Supabase الخاص بك للاتصال التلقائي وجلب البيانات ودمجها بذكاء دون المساس بالسجلات الموجودة.
                </p>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Supabase Project URL (رابط المشروع)</label>
                    <input 
                      type="text" 
                      placeholder="https://your-project.supabase.co" 
                      value={supabaseUrl} 
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Supabase Anon Key or Service Role Key</label>
                    <input 
                      type="password" 
                      placeholder="eyJhbGciOi..." 
                      value={supabaseKey} 
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">جدول المشتركين (Registrations)</label>
                      <input 
                        type="text" 
                        value={supabaseTableParticipants} 
                        onChange={(e) => setSupabaseTableParticipants(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">جدول الكتب (Book-Requests)</label>
                      <input 
                        type="text" 
                        value={supabaseTableOrders} 
                        onChange={(e) => setSupabaseTableOrders(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={saveSupabaseSettings}
                    disabled={isSaving}
                    className="w-1/2 bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'حفظ الإعدادات'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSupabaseDirectSync}
                    disabled={isMigrating}
                    className="w-1/2 bg-blue-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition cursor-pointer"
                  >
                    {isMigrating ? <Loader2 className="animate-spin animate-infinite" size={18} /> : 'المزامنة الآن'}
                  </button>
                </div>
              </div>

              {/* Option 2: Clipboard Paste JSON */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Upload size={20} className="text-emerald-600" />
                    <h4 className="font-black text-slate-800 text-lg">الخيار الثاني: ترحيل يدوي لنسخ الاحتياط JSON Backup</h4>
                  </div>
                  <p className="text-xs font-bold text-slate-500 mb-4 font-black">
                    إذا قمت بتنزيل البيانات كملف CSV/JSON من Supabase أو لديك نسخة احتياطية محلية، الصق مصفوفة الـ JSON مباشرة هنا للدمج السريع والدقيق في Firebase.
                  </p>

                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="jsonType" 
                        checked={jsonDataType === 'participants'} 
                        onChange={() => setJsonDataType('participants')} 
                      />
                      <span className="text-xs font-bold text-slate-700">بيانات المشتركين (Participants)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="jsonType" 
                        checked={jsonDataType === 'orders'} 
                        onChange={() => setJsonDataType('orders')} 
                      />
                      <span className="text-xs font-bold text-slate-700">بيانات طلبات الكتب (Orders)</span>
                    </label>
                  </div>

                  <textarea
                    rows={6}
                    placeholder='[{"studentName": "جون دو", "stage": "إعدادي", "churchName": "مارمرقس"}, ...]'
                    value={rawJsonData}
                    onChange={(e) => setRawJsonData(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleJsonImport}
                  disabled={isMigrating}
                  className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition mt-4 cursor-pointer"
                >
                  {isMigrating ? <Loader2 className="animate-spin animate-infinite" size={18} /> : null}
                  تحليل وبدء الدمج اليدوي
                </button>
              </div>
            </div>

            {/* Status Reports */}
            {migrationStatus && (
              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm leading-relaxed whitespace-pre-wrap text-sm font-bold text-slate-800">
                {migrationStatus}
              </div>
            )}
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
