import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { ChurchQualificationFeesCard } from './ChurchQualificationFeesCard';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  QrCode, 
  Users, 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import PaginationComponent from './Pagination';
import * as XLSX from 'xlsx';

interface ChurchOnlineExamsViewProps {
  churchName: string;
  onOpenPortal?: () => void;
  allParticipants?: any[];
}

// Arabic normalization helper
const normalizeArabic = (str: any): string => {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/ـ+/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const stripChurchPrefix = (name: string): string => {
  return normalizeArabic(name)
    .replace(/^(كنيسه|كنسيه|مقر|دير|قطاع)\s+/, '')
    .trim();
};

export const ChurchOnlineExamsView: React.FC<ChurchOnlineExamsViewProps> = ({
  churchName,
  onOpenPortal,
  allParticipants = []
}) => {
  const [activeTab, setActiveTab] = useState<'subscriptions_fees' | 'online_students'>('subscriptions_fees');
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('الكل');
  const [currentPage, setCurrentPage] = useState(1);
  const [examSubmissions, setExamSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const ITEMS_PER_PAGE = 15;

  const targetNormChurch = normalizeArabic(churchName || '');
  const targetStrippedChurch = stripChurchPrefix(churchName || '');

  const isMatchingChurch = (subChurchName: string) => {
    if (!targetNormChurch) return true;
    if (!subChurchName) return false;
    const normSub = normalizeArabic(subChurchName);
    const strippedSub = stripChurchPrefix(subChurchName);
    if (normSub === targetNormChurch || strippedSub === targetStrippedChurch) return true;
    if (targetStrippedChurch && (normSub.includes(targetStrippedChurch) || strippedSub.includes(targetStrippedChurch))) return true;
    if (normSub.includes(targetNormChurch) || targetNormChurch.includes(normSub)) return true;
    return false;
  };

  // Fetch online exam submissions for this church to show submission status
  const fetchOnlineSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('exam_submissions')
        .select('*');
      
      if (!error && data) {
        const filtered = data.filter((s: any) => {
          const rawChurch = s.churchName || s.church || s.data?.['الكنيسة'] || '';
          return isMatchingChurch(rawChurch);
        });
        setExamSubmissions(filtered);
      }
    } catch (e) {
      console.warn('Could not fetch online submissions for church view:', e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchOnlineSubmissions();
  }, [churchName, refreshTrigger]);

  // Filter church participants
  const churchStudents = useMemo(() => {
    const students = allParticipants.filter((p: any) => {
      const rawChurch = p.churchName || p.church || p.data?.['الكنيسة'] || '';
      return isMatchingChurch(rawChurch);
    });
    return students;
  }, [allParticipants, churchName]);

  // Unique stages for filter
  const uniqueStages = useMemo(() => {
    const stages = new Set<string>();
    churchStudents.forEach((s: any) => {
      if (s.stage) stages.add(s.stage);
    });
    return Array.from(stages).sort();
  }, [churchStudents]);

  // Submissions map by student ID or Name
  const submissionStatusMap = useMemo(() => {
    const map: Record<string, any> = {};
    examSubmissions.forEach(sub => {
      const idKey = String(sub.student_id || sub.id || '').trim().toLowerCase();
      const nameKey = normalizeArabic(sub.studentName || sub.name || '');
      if (idKey) map[idKey] = sub;
      if (nameKey) map[nameKey] = sub;
    });
    return map;
  }, [examSubmissions]);

  // Filtered students for list
  const filteredStudents = useMemo(() => {
    return churchStudents.filter((student: any) => {
      const normSearch = normalizeArabic(searchTerm);
      const studentNameNorm = normalizeArabic(student.name || student.studentName || '');
      const studentCode = String(student.id || student.code || student.student_id || '').toLowerCase();
      
      const matchesSearch = !searchTerm || 
        studentNameNorm.includes(normSearch) || 
        studentCode.includes(searchTerm.toLowerCase());

      const matchesStage = stageFilter === 'الكل' || student.stage === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [churchStudents, searchTerm, stageFilter]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const displayedStudents = filteredStudents.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Export church exam logins to Excel
  const handleExportExamCredentials = () => {
    if (churchStudents.length === 0) return;
    
    const rows = churchStudents.map((s: any, idx: number) => {
      const sub = submissionStatusMap[String(s.id || '').toLowerCase()] || submissionStatusMap[normalizeArabic(s.name || '')];
      const comps = Array.isArray(s.competitions) ? s.competitions.join(' ، ') : (s.competitions || 'عام');
      return {
        'م': idx + 1,
        'اسم الطالب': s.name || s.studentName || '',
        'المرحلة': s.stage || '',
        'كود الدخول / المعرف': s.id || s.code || '',
        'الكنيسة': s.churchName || churchName,
        'المسابقات المسجلة': comps,
        'حالة تأدية الامتحان': sub ? 'تم التسليم' : 'لم يؤد بعد'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'بيانات دخول الامتحانات');
    XLSX.writeFile(workbook, `بيانات_دخول_الامتحانات_كنيسة_${churchName || 'المهرجان'}.xlsx`);
  };

  return (
    <div className="space-y-8 font-arabic" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-indigo-900 via-indigo-800 to-indigo-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <BookOpen className="text-indigo-300" size={32} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-bold mb-2 border border-indigo-400/30">
                <QrCode size={14} /> بوابة امتحانات واشتراكات الأونلاين
              </div>
              <h3 className="text-2xl font-black">امتحانات الأونلاين واشتراكات الكنيسة</h3>
              <p className="text-indigo-200/80 text-sm font-bold mt-1">
                كنيسة: {churchName || 'غير محددة'} • إدارة الدخول ومتابعة رسوم واشتراكات التصعيد
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenPortal && (
              <button
                onClick={onOpenPortal}
                className="px-6 py-3.5 bg-white text-indigo-950 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                <QrCode size={18} className="text-indigo-600" />
                بدء دخول الامتحان الإلكتروني (QR)
              </button>
            )}
            <button
              onClick={handleExportExamCredentials}
              className="px-5 py-3.5 bg-indigo-700/60 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black flex items-center gap-2 border border-indigo-400/30 transition-all shadow-sm cursor-pointer"
            >
              <FileSpreadsheet size={18} className="text-emerald-300" />
              تصدير أكواد الدخول (Excel)
            </button>
            <button
              onClick={() => {
                setRefreshTrigger(prev => prev + 1);
                fetchOnlineSubmissions();
              }}
              className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer border border-white/10"
              title="تحديث البيانات"
            >
              <RefreshCw size={18} className={isLoadingSubmissions ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('subscriptions_fees')}
          className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'subscriptions_fees'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Award size={18} />
          <span>رسوم واشتراكات التصعيد للمهرجان</span>
        </button>

        <button
          onClick={() => setActiveTab('online_students')}
          className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'online_students'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users size={18} />
          <span>قائمة المخدومين وأكواد الدخول ({churchStudents.length})</span>
        </button>
      </div>

      {/* Tab 1: Subscriptions & Qualification Fees */}
      {activeTab === 'subscriptions_fees' && (
        <div className="transition-all animate-fade-in">
          <ChurchQualificationFeesCard 
            churchName={churchName} 
            refreshTrigger={refreshTrigger} 
          />
        </div>
      )}

      {/* Tab 2: Online Students List & Credentials */}
      {activeTab === 'online_students' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-black text-slate-800">بيانات مخدومي الكنيسة للامتحانات الإلكترونية</h4>
              <p className="text-xs text-slate-400 font-bold mt-0.5">استعرض أكواد الدخول الفردية وحالة تسليم الامتحانات</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px]">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الكود..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={stageFilter}
                onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="الكل">كل المراحل</option>
                {uniqueStages.map(stg => (
                  <option key={stg} value={stg}>{stg}</option>
                ))}
              </select>
            </div>
          </div>

          {displayedStudents.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Users className="mx-auto text-slate-300 mb-2" size={40} />
              <p className="text-sm font-black text-slate-600">لا يوجد مخدومين مسجلين مطابقين للتصفية</p>
              <p className="text-xs text-slate-400 font-bold mt-1">تأكد من تسجيل المشتركين من قسم "تسجيل المشتركين"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase border-b border-slate-100">
                    <th className="p-3.5">م</th>
                    <th className="p-3.5">اسم المخدوم</th>
                    <th className="p-3.5">المرحلة</th>
                    <th className="p-3.5">كود الدخول / المعرف</th>
                    <th className="p-3.5">المسابقات</th>
                    <th className="p-3.5 text-center">حالة الامتحان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {displayedStudents.map((student: any, idx: number) => {
                    const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    const studentId = student.id || student.code || student.student_id;
                    const sub = submissionStatusMap[String(studentId || '').toLowerCase()] || submissionStatusMap[normalizeArabic(student.name || '')];
                    const comps = Array.isArray(student.competitions) 
                      ? student.competitions.filter(Boolean) 
                      : (student.competitions ? [student.competitions] : ['عام']);

                    return (
                      <tr key={studentId || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 text-slate-400 font-black">{globalIdx}</td>
                        <td className="p-3.5 font-black text-slate-900">{student.name || student.studentName || 'غير مسجل'}</td>
                        <td className="p-3.5 text-slate-600">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-black">
                            {student.stage || 'عام'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <code className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-mono text-[11px] font-bold">
                            {studentId || '-'}
                          </code>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1">
                            {comps.map((c: string, ci: number) => (
                              <span key={ci} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          {sub ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-black">
                              <CheckCircle2 size={13} /> تم التسليم
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-black">
                              <Clock size={13} /> في الانتظار
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="mt-6">
                  <PaginationComponent
                    currentPage={currentPage}
                    totalItems={filteredStudents.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
