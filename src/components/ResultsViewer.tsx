import React, { useMemo, useState, useEffect } from 'react';
import { Result } from '../types';
import { 
  RefreshCcw, 
  ShieldAlert, 
  Loader, 
  Upload, 
  Plus, 
  X, 
  Award, 
  ShoppingCart, 
  Activity, 
  FileSpreadsheet, 
  BookOpen,
  Megaphone,
  Compass
} from 'lucide-react';
import { AdminHonorsEngine } from './AdminHonorsEngine';
import { supabase } from '../utils/supabaseClient';
import PaginationComponent from './Pagination';
import * as XLSX from 'xlsx';

export const ResultsViewer: React.FC<{ 
  results?: Result[], 
  onReset?: (id: string) => void,
  isAdmin?: boolean,
  hideNames?: boolean,
  userChurch?: string
}> = ({ results: resultsProp, onReset: onResetProp, isAdmin, hideNames, userChurch }) => {
  const [supabaseSubmissions, setSupabaseSubmissions] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [honorsRanks, setHonorsRanks] = useState<Record<string, { rank: number; colorClass: string, percentage: number, title: string }>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'bubble_sheet' | 'paper'>('all');
  const [showManualModal, setShowManualModal] = useState(false);
  
  const [manualForm, setManualForm] = useState({
    student_name: '',
    church_name: '',
    stage: '',
    gender: 'ذكر',
    derasy_score: '',
    mahfouzat_score: '',
    qebty_lvl1_score: '',
    qebty_lvl2_score: '',
  });

  const ITEMS_PER_PAGE = 20;

  const [searchName, setSearchName] = useState('');
  const [filterStage, setFilterStage] = useState('الكل');
  const [filterCompetition, setFilterCompetition] = useState('الكل');

  const MASTER_HEADERS = useMemo(() => {
    const base = [
      'وقت التسليم',
      ...(hideNames ? [] : ['الاسم']),
      'الكنيسة/البلد',
      'المرحلة',
      'نوع الامتحان',
      'النوع',
      'الدرجة الكلية',
      'حالة التسليم'
    ];
    return base;
  }, [hideNames]);

  // Determine user church name for non-admins to ensure isolation
  const activeUserChurch = useMemo(() => {
    if (userChurch) return userChurch;
    try {
      const sessionStr = localStorage.getItem('church_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session && session.isAuthenticated) {
          return session.church;
        }
      }
      const cached = localStorage.getItem('userProfileCache');
      if (cached) {
        return JSON.parse(cached)?.churchName;
      }
    } catch (_) {}
    return '';
  }, [userChurch]);

  // Fetch results dynamically from database view 'view_central_filtered_results'
  const fetchSubmissionsFromSupabase = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('view_central_filtered_results')
        .select('*');

      if (error) throw error;

      if (data) {
        const mapped: Result[] = data.map((sbRow: any) => {
          return {
            id: sbRow.student_id || sbRow.id || Math.random().toString(),
            studentName: sbRow.student_name || sbRow.name || 'طالب',
            churchName: sbRow.church || sbRow.church_name || '',
            stage: sbRow.stage || '',
            academicScore: sbRow.total_score !== undefined && sbRow.total_score !== null ? Number(sbRow.total_score) : null,
            submissionStatus: sbRow.submission_status || '',
            timestamp: sbRow.submitted_at || sbRow.created_at || null,
            gender: sbRow.gender || '',
            submissionType: sbRow.submission_type || 'online',
          };
        });

        // Data Isolation: Strict filter at query level for non-admins matching their church name
        let finalData = mapped;
        if (!isAdmin && activeUserChurch) {
          finalData = mapped.filter(r => r.churchName === activeUserChurch);
        }

        setSupabaseSubmissions(finalData);
      }
    } catch (err: any) {
      console.error('Error fetching submissions from view_central_filtered_results:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionsFromSupabase();
  }, [activeUserChurch, isAdmin]);

  // Combined client-side filtering utilizing useMemo for live updates
  const filteredResults = useMemo(() => {
    let list = supabaseSubmissions;

    // Security check: restrict results for logged-in user's church
    if (!isAdmin && activeUserChurch) {
      list = list.filter(r => r.churchName === activeUserChurch);
    }

    // 1. Filter by Search Name
    if (searchName.trim() !== '') {
      const sLower = searchName.toLowerCase();
      list = list.filter(r => r.studentName?.toLowerCase().includes(sLower));
    }

    // 2. Filter by Stage
    if (filterStage !== 'الكل') {
      list = list.filter(r => r.stage === filterStage);
    }

    // 3. Filter by Competition/Exam Category
    if (filterCompetition !== 'الكل') {
      list = list.filter(r => {
        return r.academicScore !== null && r.academicScore !== undefined;
      });
    }

    return list;
  }, [supabaseSubmissions, isAdmin, activeUserChurch, searchName, filterStage, filterCompetition]);

  const results = filteredResults;

  // Derive dynamic list of churches and stages encountered to help with autocompletes
  const uniqueChurches = useMemo(() => {
    return Array.from(new Set(supabaseSubmissions.map(r => r.churchName).filter(Boolean)));
  }, [supabaseSubmissions]);

  const uniqueStagesList = useMemo(() => {
    return Array.from(new Set(supabaseSubmissions.map(r => r.stage).filter(Boolean)));
  }, [supabaseSubmissions]);

  // Discover dynamic headers
  const dynamicHeaders = useMemo(() => {
    return [] as string[];
  }, []);

  const allHeaders = [...MASTER_HEADERS, ...dynamicHeaders];

  // Derive Church vs Stages Matrix
  const matrix = useMemo(() => {
    const churches = Array.from(new Set(results.map(r => r.churchName).filter(Boolean)));
    const stages = Array.from(new Set(results.map(r => r.stage).filter(Boolean))) as string[];
    
    return { churches, stages };
  }, [results]);

  // Handle local user reset in Supabase
  const handleResetRow = async (id: string) => {
    if (!confirm('هل تريد فعلاً إعادة تعيين وحذف النتيجة وإعادة فتح الامتحان في السيرفر')) return;
    try {
      // 1. Delete submission record from Supabase
      const { error } = await supabase
        .from('exam_submissions')
        .delete()
        .eq('student_id', id);

      if (error) throw error;

      // 2. Also reset live monitoring record back to active
      await supabase
        .from('live_monitoring')
        .update({
          status: 'active',
          attempts_count: 0,
          is_locked: false,
          updated_at: new Date().toISOString()
        })
        .eq('student_id', id);

      alert('تم إعادة تعيين النتيجة وفتح الامتحان بنجاح في السيرفر!');
      fetchSubmissionsFromSupabase();
    } catch (err: any) {
      console.error('Error in reset operation:', err);
      alert('حدث خطأ أثناء إعادة فتح الامتحان: ' + err.message);
    }
  };

  // Upload bubble sheet results from Excel
  const handleEmergencyToggle = () => {
    console.log("Emergency path triggered by admin");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json: any[] = XLSX.utils.sheet_to_json(ws);

        if (json.length === 0) {
          alert('الملف فارغ أو يحتوي على تنسيق غير صحيح.');
          return;
        }

        // Expected Excel columns: student_name, church_name, stage, derasy_score, mahfouzat_score, qebty_lvl1_score, qebty_lvl2_score
        const submissionsToInsert = json.map((row: any) => {
          const studentName = row.student_name || row['الاسم'] || row['اسم الطالب'] || '';
          const churchName = row.church_name || row['الكنيسة'] || row['الكنيسة/البلد'] || '';
          const stage = row.stage || row.stage_name || row['المرحلة'] || 'عام';
          const gender = row.gender || row['النوع'] || 'ذكر';
          const derasy = row.derasy_score !== undefined ? Number(row.derasy_score) : null;
          const mahfouzat = row.mahfouzat_score !== undefined ? Number(row.mahfouzat_score) : null;
          const qebtyL1 = row.qebty_lvl1_score !== undefined ? Number(row.qebty_lvl1_score) : null;
          const qebtyL2 = row.qebty_lvl2_score !== undefined ? Number(row.qebty_lvl2_score) : null;

          const studentId = `bubble-${Math.random().toString(36).substring(2, 11)}`;

          return {
            student_id: studentId,
            student_name: studentName,
            church_name: churchName,
            stage: stage,
            gender: gender,
            derasy_score: derasy,
            mahfouzat_score: mahfouzat,
            qebty_lvl1_score: qebtyL1,
            qebty_lvl2_score: qebtyL2,
            submission_type: 'bubble_sheet',
            submitted_at: new Date().toISOString()
          };
        }).filter(item => item.student_name && item.church_name);

        if (submissionsToInsert.length === 0) {
          alert('لم يتم العثور على أي صفوف صالحة. تأكد من وجود أعمدة (student_name) و(church_name) و(stage).');
          return;
        }

        console.log("Payload to Supabase (bubble sheet):", submissionsToInsert);

        const { error } = await supabase
          .from('exam_submissions')
          .insert(submissionsToInsert);

        if (error) throw error;

        alert(`تم رفع عدد ${submissionsToInsert.length} نتيجة بابل شيت بنجاح!`);
        fetchSubmissionsFromSupabase();
      } catch (err: any) {
        console.error('Error parsing/inserting Excel bubble sheet data:', err);
        alert('حدث خطأ أثناء معالجة ملف الإكسل: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    // clear input value so the same file name can be uploaded again
    e.target.value = '';
  };

  // Submit manual paper result
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.student_name || !manualForm.church_name || !manualForm.stage) {
      alert('يرجى ملء جميع الحقول المطلوبة المتمثلة بالنجمه (*).');
      return;
    }

    try {
      const studentId = `paper-${Math.random().toString(36).substring(2, 11)}`;
      const payload = {
        student_id: studentId,
        student_name: manualForm.student_name,
        church_name: manualForm.church_name,
        stage: manualForm.stage,
        gender: manualForm.gender,
        derasy_score: manualForm.derasy_score !== '' ? Number(manualForm.derasy_score) : null,
        mahfouzat_score: manualForm.mahfouzat_score !== '' ? Number(manualForm.mahfouzat_score) : null,
        qebty_lvl1_score: manualForm.qebty_lvl1_score !== '' ? Number(manualForm.qebty_lvl1_score) : null,
        qebty_lvl2_score: manualForm.qebty_lvl2_score !== '' ? Number(manualForm.qebty_lvl2_score) : null,
        submission_type: 'paper',
        submitted_at: new Date().toISOString()
      };

      console.log("Payload to Supabase (manual):", payload);

      const { error } = await supabase
        .from('exam_submissions')
        .insert(payload);

      if (error) throw error;

      alert('تم حفظ نتيجة الامتحان الورقي بنجاح!');
      setShowManualModal(false);
      setManualForm({
        student_name: '',
        church_name: '',
        stage: '',
        gender: 'ذكر',
        derasy_score: '',
        mahfouzat_score: '',
        qebty_lvl1_score: '',
        qebty_lvl2_score: '',
      });
      fetchSubmissionsFromSupabase();
    } catch (err: any) {
      console.error('Error inserting manual paper result:', err);
      alert('حدث خطأ أثناء حفظ النتيجة: ' + err.message);
    }
  };

  const handlePublishResults = async () => {
    if (!confirm('هل أنت متأكد من مراجعة كافة الدرجات ونشرها رسميًا للكنائس؟')) return;
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('exam_submissions')
        .update({ is_published: true })
        .neq('student_id', '');

      if (error) throw error;

      alert('تم إعلان ونشر كافة نتائج الامتحانات للكنائس بنجاح! 🚀');
      fetchSubmissionsFromSupabase();
    } catch (err: any) {
      console.error('Error publishing results:', err);
      alert('حدث خطأ أثناء نشر النتائج للكنائس: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Honors Engine (Admin Only) */}
      <AdminHonorsEngine results={results} enabled={isAdmin} onHonorsUpdate={setHonorsRanks} />

      {/* Admin Action Bar (Only visible if isAdmin is true) */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 p-6 border border-slate-200 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm font-arabic text-right animate-fade-in" dir="rtl" id="admin-actions-bar">
          <div className="flex-1">
            <h5 className="font-black text-slate-800 text-base mb-1 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-600" />
              التحكم ورصد النتائج المتعددة
            </h5>
            <p className="text-xs text-slate-500 font-bold">رصد نتائج امتحانات المهرجان بمختلف التقنيات (تصحيح ورقي، بابل شيت، أونلاين)</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 animate-fade-in">
            {/* File upload input hidden */}
            <label className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-sm">
              <Upload size={14} />
              رفع نتائج بابل شيت (Excel)
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                onChange={handleExcelUpload} 
                className="hidden" 
              />
            </label>
            <button 
              onClick={() => setShowManualModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <Plus size={14} />
              إضافة نتيجة يدوي (ورقي)
            </button>
            <button 
              onClick={handlePublishResults}
              disabled={isLoading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm disabled:opacity-50"
            >
              <Megaphone size={14} />
              إعلان النتائج للكنائس
            </button>
          </div>
        </div>
      )}

      {/* Real-time Master Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-arabic" id="results-table-main-wrapper">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4" dir="rtl">
          <h4 className="text-lg font-black text-slate-800">
            نتائج التصفية المحلية {(!isAdmin && activeUserChurch) ? `(كنيسة ${activeUserChurch})` : ''}
          </h4>
          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
            
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchSubmissionsFromSupabase}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all"
                title="تحديث البيانات"
              >
                <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <span className="bg-slate-100 px-4 py-1.5 rounded-full text-xs font-black text-slate-800">إجمالي: {results.length}</span>
            </div>
          </div>
        </div>

        {/* Real-time Filter Controls (3 filters) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 mb-6 flex flex-col md:flex-row gap-4 text-right" dir="rtl" id="results-realtime-filters">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-black text-slate-500 mb-1.5">البحث بالاسم</label>
            <input 
              type="text"
              placeholder="ابحث باسم الطالب..."
              value={searchName}
              onChange={(e) => {
                setSearchName(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>
          <div className="w-full md:w-52">
            <label className="block text-xs font-black text-slate-500 mb-1.5">تصفية بالمرحلة</label>
            <select
              value={filterStage}
              onChange={(e) => {
                setFilterStage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="الكل">كل المراحل</option>
              {uniqueStagesList.sort().map(stg => (
                <option key={stg} value={stg}>{stg}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-52">
            <label className="block text-xs font-black text-slate-500 mb-1.5">تصفية بالمسابقة</label>
            <select
              value={filterCompetition}
              onChange={(e) => {
                setFilterCompetition(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              <option value="الكل">كل المسابقات</option>
              <option value="دراسي">دراسي</option>
              <option value="محفوظات">محفوظات</option>
              <option value="قبطي مستوى أول">قبطي مستوى أول</option>
              <option value="قبطي مستوى ثاني">قبطي مستوى ثاني</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-slate-500 text-sm font-bold">جاري جلب النتائج النشطة من Supabase...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase whitespace-nowrap">
                  <th className="p-4 border-b border-slate-100">م</th>
                  {isAdmin && <th className="p-4 border-b border-slate-100">تحكم</th>}
                  {allHeaders.map((header, idx) => {
                    if (header === 'المرحلة') {
                      return <th key={idx} className="p-4 border-b border-slate-100 text-slate-500 font-black">المرحلة</th>;
                    }
                    return (
                      <th key={idx} className="p-4 border-b border-slate-100">{header}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {results.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((row, index) => {
                  const rowData: Record<string, any> = {
                    'وقت التسليم': row.timestamp ? new Date(row.timestamp).toLocaleString('ar-EG') : '',
                    'الاسم': row.studentName,
                    'الكنيسة/البلد': row.churchName,
                    'المرحلة': row.stage,
                    'نوع الامتحان': row.submissionType || 'online',
                    'النوع': row.gender || '',
                    'الدرجة الكلية': row.academicScore !== null && row.academicScore !== undefined ? row.academicScore : '-',
                    'حالة التسليم': (row as any).submissionStatus || 'تم التسليم'
                  };
                  
                  const hasScore = row.academicScore !== undefined && row.academicScore !== null;
                  const honorData = row.id ? honorsRanks[row.id] : null;
                  const rowClass = honorData ? honorData.colorClass : 'hover:bg-slate-50 transition-colors';

                  return (
                    <tr key={row.id || index} className={rowClass}>
                      <td className="p-4 font-bold text-slate-400 text-sm whitespace-nowrap border-l border-slate-50 relative">
                        {honorData && (
                          <div className="absolute top-1 right-2 text-[9px] font-black bg-white/50 px-1 py-0.5 rounded text-slate-700 border border-black/10">
                            {honorData.title} ({honorData.percentage.toFixed(1)}%)
                          </div>
                        )}
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      {isAdmin && (
                        <td className="p-4 border-l border-slate-50">
                          {hasScore && (
                            <div className="flex gap-2 items-center flex-wrap">
                              <button 
                                onClick={() => handleResetRow(row.id!)}
                                title="إعادة الامتحان وتصفير محتواه"
                                className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all border border-rose-100"
                              >
                                <RefreshCcw size={14} />
                              </button>
                              
                              <button onClick={handleEmergencyToggle} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all" title="أيقونة البوصلة">
                                <Compass className="w-5 h-5 text-indigo-500" />
                              </button>

                              <button className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black transition-all">
                                تعديل الدرجات
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                      {allHeaders.map((header, idx) => {
                        if (header === 'المرحلة') {
                          return (
                            <td key={idx} className="p-4 font-bold whitespace-nowrap border-l border-slate-50 text-slate-700 text-right">
                              {row.stage}
                            </td>
                          );
                        }
                        const isDerasi = header === 'الدرجة الكلية';
                        const isExamType = header === 'نوع الامتحان';
                        
                        if (isExamType) {
                          const typeVal = rowData[header];
                          if (typeVal === 'bubble_sheet') {
                            return (
                              <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                                <span className="inline-flex items-center gap-1 font-sans px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100">
                                  بابل شيت 📊
                                </span>
                              </td>
                            );
                          }
                          if (typeVal === 'paper') {
                            return (
                              <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                                <span className="inline-flex items-center gap-1 font-sans px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-100">
                                  ورقي 📝
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                              <span className="inline-flex items-center gap-1 font-sans px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                                أونلاين 🌐
                              </span>
                            </td>
                          );
                        }

                        if (header === 'حالة التسليم') {
                          const statusVal = rowData[header];
                          const bgClass = statusVal === 'validated' || statusVal === 'تم التسليم' || statusVal === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100';
                          return (
                            <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${bgClass}`}>
                                {statusVal}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={idx} className={`p-4 font-bold whitespace-nowrap border-l border-slate-50 ${isDerasi ? 'text-indigo-600 font-black text-lg' : 'text-slate-700'}`}>
                            {rowData[header] !== undefined && rowData[header] !== null ? rowData[header] : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {results.length === 0 && (
              <div className="text-center py-12 text-slate-400 italic">بانتظار رصد وتسجيل درجات الامتحانات...</div>
            )}

            <PaginationComponent 
              currentPage={currentPage}
              totalItems={results.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Admin Analytics: Church vs Stages Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-arabic">
        <h4 className="text-xl font-black text-indigo-800 mb-6 border-b border-slate-100 pb-4">
          مصفوفة مشاركة الكنائس والبلدان وفقاً للمراحل
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-indigo-50 text-[10px] font-black text-indigo-500 uppercase whitespace-nowrap border-b-2 border-indigo-100">
                <th className="p-4">الكنيسة</th>
                {matrix.stages.map((stage, idx) => (
                  <th key={idx} className="p-4">{stage}</th>
                ))}
                <th className="p-4 border-r border-indigo-100">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {matrix.churches.map((church, idx) => {
                const churchResults = results.filter(r => r.churchName === church);
                return (
                  <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-indigo-700 text-sm border-l border-indigo-50">
                      {church}
                    </td>
                    {matrix.stages.map((stage, sIdx) => {
                      const count = churchResults.filter(r => (r.data?.['دراسي'] || r.stage) === stage).length;
                      return (
                        <td key={sIdx} className="p-4 text-slate-600 font-bold text-sm border-l border-indigo-50">
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                    <td className="p-4 font-black text-slate-800 border-r border-indigo-100">
                      {churchResults.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Insert Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative font-arabic text-right border border-slate-100 flex flex-col max-h-[90vh]" dir="rtl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
              <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span>📝 إضافة نتيجة امتحان يدوي (ورقي)</span>
              </h4>
              <button 
                onClick={() => {
                  setShowManualModal(false);
                  setManualForm({
                    student_name: '',
                    church_name: '',
                    stage: '',
                    gender: 'ذكر',
                    derasy_score: '',
                    mahfouzat_score: '',
                    qebty_lvl1_score: '',
                    qebty_lvl2_score: '',
                  });
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">اسم الطالب *</label>
                  <input 
                    type="text"
                    required
                    value={manualForm.student_name}
                    onChange={(e) => setManualForm({...manualForm, student_name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="الاسم الثلاثي أو الرباعي"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">الكنيسة/البلد *</label>
                  <input
                    list="church-list"
                    type="text"
                    required
                    value={manualForm.church_name}
                    onChange={(e) => setManualForm({ ...manualForm, church_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="اسم الكنيسة أو المنطقة"
                  />
                  <datalist id="church-list">
                    {uniqueChurches.map((church, idx) => (
                      <option key={idx} value={church} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">المرحلة *</label>
                  <input
                    list="stage-list"
                    type="text"
                    required
                    value={manualForm.stage}
                    onChange={(e) => setManualForm({ ...manualForm, stage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="اختر أو اكتب اسم المرحلة"
                  />
                  <datalist id="stage-list">
                    <option value="أنشطة الطفولة" />
                    <option value="أنشطة إعدادي وثانوي" />
                    <option value="أنشطة من جامعة:خدام" />
                    {uniqueStagesList.map((stg, idx) => (
                      <option key={idx} value={stg} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-1.5">النوع (الجنس) *</label>
                  <select
                    value={manualForm.gender}
                    onChange={(e) => setManualForm({...manualForm, gender: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <h5 className="font-extrabold text-xs text-indigo-600 mb-3">رصد درجات الامتحان الورقي (علامات من 100)</h5>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">التحصيل الدراسي</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={manualForm.derasy_score}
                      onChange={(e) => setManualForm({...manualForm, derasy_score: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="الدرجة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">محفوظات</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={manualForm.mahfouzat_score}
                      onChange={(e) => setManualForm({...manualForm, mahfouzat_score: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="الدرجة"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">قبطي مستوى أول</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={manualForm.qebty_lvl1_score}
                      onChange={(e) => setManualForm({...manualForm, qebty_lvl1_score: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="الدرجة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">قبطي مستوى ثاني</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={manualForm.qebty_lvl2_score}
                      onChange={(e) => setManualForm({...manualForm, qebty_lvl2_score: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="الدرجة"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualModal(false);
                    setManualForm({
                      student_name: '',
                      church_name: '',
                      stage: '',
                      gender: 'ذكر',
                      derasy_score: '',
                      mahfouzat_score: '',
                      qebty_lvl1_score: '',
                      qebty_lvl2_score: '',
                    });
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                >
                  حفظ النتيجة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResultsViewer;
