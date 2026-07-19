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
  Compass,
  Send,
  Users,
  Search,
  Download,
  Lock,
  EyeOff
} from 'lucide-react';
import { AdminHonorsEngine } from './AdminHonorsEngine';
import { supabase } from '../utils/supabaseClient';
import PaginationComponent from './Pagination';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const ResultsViewer: React.FC<{ 
  results?: Result[], 
  onReset?: (id: string) => void,
  isAdmin?: boolean,
  hideNames?: boolean,
  userChurch?: string,
  honorsRanks?: Record<string, { rank: number; colorClass: string; percentage: number; title: string; subject: string }>
}> = ({ results: resultsProp, onReset: onResetProp, isAdmin, hideNames, userChurch, honorsRanks: propHonorsRanks }) => {
  const [supabaseSubmissions, setSupabaseSubmissions] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [resultsPublished, setResultsPublished] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [isPublishLoading, setIsPublishLoading] = useState(false);

  // Advanced PDF Generation States
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatus, setPdfStatus] = useState('');
  const [honorsRanks, setHonorsRanks] = useState<Record<string, { rank: number; colorClass: string; percentage: number; title: string; subject: string }>>({});
  
  // Merge prop honors matrix with the local honors matrix state
  const mergedHonorsRanks = propHonorsRanks || honorsRanks;

  const getCupEmoji = (rank?: number) => {
    if (rank === 1) return '🏆';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'bubble_sheet' | 'paper'>('all');
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [tempScores, setTempScores] = useState({
    darasy: 0,
    mahfoudat: 0,
    qebty1: 0,
    qebty2: 0
  });

  // Bulk Score Entry States
  const [showBulkScoreDashboard, setShowBulkScoreDashboard] = useState(false);
  const [bulkStage, setBulkStage] = useState('الكل');
  const [bulkChurch, setBulkChurch] = useState('الكل');
  const [bulkStudents, setBulkStudents] = useState<any[]>([]);
  const [bulkSearchQuery, setBulkSearchQuery] = useState('');
  const [isBulkStudentsLoading, setIsBulkStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('qebty_lvl1_score');
  const [bulkScoreValue, setBulkScoreValue] = useState('');
  const [existingScores, setExistingScores] = useState<Record<string, any>>({});
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [stageOptions, setStageOptions] = useState<string[]>([]);
  const [churchOptions, setChurchOptions] = useState<string[]>([]);

  const [bulkCurrentPage, setBulkCurrentPage] = useState(1);
  const bulkItemsPerPage = 100;

  const filteredBulkStudents = useMemo(() => {
    if (!bulkSearchQuery.trim()) return bulkStudents;
    const q = bulkSearchQuery.toLowerCase().trim();
    return bulkStudents.filter((student: any) => 
      student.name?.toLowerCase().includes(q)
    );
  }, [bulkStudents, bulkSearchQuery]);

  useEffect(() => {
    setBulkCurrentPage(1);
  }, [bulkStage, bulkChurch, bulkSearchQuery]);

  const totalBulkPages = useMemo(() => {
    return Math.ceil(filteredBulkStudents.length / bulkItemsPerPage) || 1;
  }, [filteredBulkStudents.length, bulkItemsPerPage]);

  const currentBulkStudents = useMemo(() => {
    const indexOfLastBulkItem = bulkCurrentPage * bulkItemsPerPage;
    const indexOfFirstBulkItem = indexOfLastBulkItem - bulkItemsPerPage;
    return filteredBulkStudents.slice(indexOfFirstBulkItem, indexOfLastBulkItem);
  }, [filteredBulkStudents, bulkCurrentPage, bulkItemsPerPage]);
  
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
  const [searchChurch, setSearchChurch] = useState('');
  const [filterStage, setFilterStage] = useState('الكل');
  const [filterCompetition, setFilterCompetition] = useState('الكل');

  const MASTER_HEADERS = useMemo(() => {
    const base = [
      'وقت التسليم',
      ...(hideNames ? [] : ['الاسم']),
      'الكنيسة/البلد',
      'المرحلة',
      'دراسي',
      'محفوظات',
      'قبطي 1',
      'قبطي 2',
      'الدرجة الكلية',
      'نوع الامتحان',
      'النوع',
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

  const fetchSubmissionsFromSupabase = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('exam_submissions')
        .select('student_id, name, churchName, stage, derasy_score, mahfouzat_score, qebty_lvl1_score, qebty_lvl2_score, status, is_published, submitted_at, gender, submission_type, detailed_answers');
      
      if (!isAdmin && activeUserChurch) {
        query = query.eq('is_published', true).eq('churchName', activeUserChurch);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const mapped: Result[] = data.map((sbRow: any) => {
          const d = Number(sbRow.derasy_score || 0);
          const m = Number(sbRow.mahfouzat_score || 0);
          const q1 = Number(sbRow.qebty_lvl1_score || 0);
          const q2 = Number(sbRow.qebty_lvl2_score || 0);
          const total = d + m + q1 + q2;

          return {
            id: sbRow.student_id || sbRow.id || Math.random().toString(),
            studentName: sbRow.name || sbRow.student_id || 'طالب',
            churchName: sbRow.churchName || '',
            stage: sbRow.stage || '',
            derasy_score: d,
            mahfouzat_score: m,
            qebty_lvl1_score: q1,
            qebty_lvl2_score: q2,
            academicScore: total,
            submissionStatus: sbRow.status || (sbRow.is_published ? 'منشور' : 'مسودة'),
            timestamp: sbRow.submitted_at || sbRow.created_at || null,
            gender: sbRow.gender || '',
            submissionType: sbRow.submission_type || 'online',
            detailed_answers: sbRow.detailed_answers || null,
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
      console.error('Error fetching submissions from exam_submissions:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const checkPublishAndFetchData = async () => {
      try {
        setIsCheckingStatus(true);
        // 1. فحص حالة النشر من الداتابيز
        const { data: settings } = await supabase
          .from('system_settings')
          .select('results_published')
          .eq('id', '1')
          .maybeSingle();

        const isPublished = settings?.results_published || false;
        setResultsPublished(isPublished);

        // 2. إذا كانت معلنة، أو كان المستخدم الحالي Admin، يتم جلب البيانات كالمعتاد
        if (isPublished || isAdmin) {
          await fetchSubmissionsFromSupabase();
        }
      } catch (err) {
        console.error("Error checking status & fetching:", err);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkPublishAndFetchData();
  }, [isAdmin, activeUserChurch]);

  // Load distinct options for bulk score filters
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const { data: churchesData } = await supabase.from('church_access_codes').select('church_name');
        if (churchesData) {
          setChurchOptions(Array.from(new Set(churchesData.map((c: any) => c.church_name).filter(Boolean))).sort() as string[]);
        }
        
        const { data: stagesData } = await supabase.from('registrations').select('stage');
        if (stagesData) {
          setStageOptions(Array.from(new Set(stagesData.map((r: any) => r.stage).filter(Boolean))).sort() as string[]);
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };
    if (isAdmin) {
      loadFilterOptions();
    }
  }, [isAdmin]);

  // Fetch student list in bulk for local state (Fetch Once scenario)
  const fetchBulkStudents = async () => {
    setIsBulkStudentsLoading(true);
    try {
      let query = supabase.from('registrations').select('student_id, name, churchName, stage, gender');
      
      if (bulkChurch !== 'الكل') {
        query = query.eq('churchName', bulkChurch);
      }
      if (bulkStage !== 'الكل') {
        query = query.eq('stage', bulkStage);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      setBulkStudents(data || []);
      setSelectedStudentIds([]); // Reset selected checkboxes
      
      if (data && data.length > 0) {
        const studentIds = data.map(s => s.student_id);
        const { data: scoresData, error: scoresErr } = await supabase
          .from('exam_submissions')
          .select('student_id, churchName, stage, gender, qebty_lvl1_score, qebty_lvl2_score, derasy_score, mahfouzat_score')
          .in('student_id', studentIds);
        
        if (!scoresErr && scoresData) {
          const scoresMap: Record<string, any> = {};
          scoresData.forEach(item => {
            scoresMap[item.student_id] = item;
          });
          setExistingScores(scoresMap);
        }
      } else {
        setExistingScores({});
      }
    } catch (err: any) {
      console.error('Error fetching bulk students:', err.message);
    } finally {
      setIsBulkStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (showBulkScoreDashboard && isAdmin) {
      fetchBulkStudents();
    }
  }, [bulkStage, bulkChurch, showBulkScoreDashboard]);

  const getColumnArabicName = (col: string) => {
    switch (col) {
      case 'qebty_lvl1_score': return 'قبطي مستوى أول';
      case 'qebty_lvl2_score': return 'قبطي مستوى ثان';
      case 'derasy_score': return 'دراسي';
      case 'mahfouzat_score': return 'محفوظات';
      default: return col;
    }
  };

  const handleBulkSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      alert('الرجاء تحديد طالب واحد على الأقل من الجدول للرصد.');
      return;
    }
    if (!bulkScoreValue || isNaN(Number(bulkScoreValue))) {
      alert('الرجاء إدخال درجة مناسبة.');
      return;
    }
    const scoreVal = parseFloat(bulkScoreValue);
    if (scoreVal < 0 || scoreVal > 100) {
      alert('الرجاء إدخال درجة بين 0 و 100.');
      return;
    }

    const columnArabic = getColumnArabicName(selectedColumn);
    const confirmMessage = `هل أنت متأكد من رصد درجة [${scoreVal}] لعدد [${selectedStudentIds.length}] من الطلاب في المسابقة المحددة؟`;
    
    if (!window.confirm(confirmMessage)) return;

    setIsBulkSubmitting(true);
    try {
      const bulkPayload = selectedStudentIds.map(id => {
        const student = bulkStudents.find(s => s.student_id === id);
        const existing = existingScores[id] || {};
        const churchNameVal = student?.churchName || existing.churchName || '';
        return {
          student_id: id,
          churchName: churchNameVal,
          stage: student?.stage || existing.stage || '',
          gender: student?.gender || existing.gender || 'ذكر',
          // Safe preservation of other score columns
          derasy_score: selectedColumn === 'derasy_score' ? scoreVal : (existing.derasy_score !== undefined ? existing.derasy_score : null),
          mahfouzat_score: selectedColumn === 'mahfouzat_score' ? scoreVal : (existing.mahfouzat_score !== undefined ? existing.mahfouzat_score : null),
          qebty_lvl1_score: selectedColumn === 'qebty_lvl1_score' ? scoreVal : (existing.qebty_lvl1_score !== undefined ? existing.qebty_lvl1_score : null),
          qebty_lvl2_score: selectedColumn === 'qebty_lvl2_score' ? scoreVal : (existing.qebty_lvl2_score !== undefined ? existing.qebty_lvl2_score : null),
          is_published: true,
          status: 'completed'
        };
      });

      const { error } = await supabase
        .from('exam_submissions')
        .upsert(bulkPayload, { onConflict: 'student_id' });

      if (error) throw error;

      alert(`تم بنجاح رصد درجة [${scoreVal}] في [${columnArabic}] لعدد [${selectedStudentIds.length}] من الطلاب! 🎉`);
      
      await fetchBulkStudents();
      fetchSubmissionsFromSupabase();
    } catch (err: any) {
      console.error('Error submitting bulk scores:', err.message);
      alert('حدث خطأ أثناء رصد الدرجات: ' + err.message);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

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

    // 2. Filter by Church Name
    if (searchChurch.trim() !== '') {
      const cLower = searchChurch.toLowerCase();
      list = list.filter(r => r.churchName?.toLowerCase().includes(cLower));
    }

    // 3. Filter by Stage
    if (filterStage !== 'الكل') {
      list = list.filter(r => r.stage === filterStage);
    }

    // 4. Filter by Competition/Exam Category
    if (filterCompetition !== 'الكل') {
      list = list.filter(r => {
        return r.academicScore !== null && r.academicScore !== undefined;
      });
    }

    return list;
  }, [supabaseSubmissions, isAdmin, activeUserChurch, searchName, searchChurch, filterStage, filterCompetition]);

  const results = filteredResults;

  // Derive dynamic list of churches and stages encountered to help with autocompletes
  const uniqueChurches = useMemo(() => {
    return Array.from(new Set(supabaseSubmissions.map(r => r.churchName).filter(Boolean)));
  }, [supabaseSubmissions]);

  const uniqueStagesList = useMemo(() => {
    return Array.from(new Set(supabaseSubmissions.map(r => r.stage).filter(Boolean)));
  }, [supabaseSubmissions]);

  const finalChurchOptions = useMemo(() => {
    const set = new Set([...churchOptions, ...uniqueChurches]);
    return Array.from(set).filter(Boolean).sort();
  }, [churchOptions, uniqueChurches]);

  const finalStageOptions = useMemo(() => {
    const set = new Set([...stageOptions, ...uniqueStagesList, 'حضونة', 'أولى ابتدائي', 'ثانية ابتدائي', 'ثالثة ابتدائي', 'رابعة ابتدائي', 'خامسة ابتدائي', 'سادسة ابتدائي', 'إعدادي', 'ثانوي', 'جامعة', 'خدام']);
    return Array.from(set).filter(Boolean).sort();
  }, [stageOptions, uniqueStagesList]);

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

      // 2. Also reset live monitoring record back to active - Postponed to next season
      // await supabase
      //   .from('live_monitoring')
      //   .update({
      //     status: 'active',
      //     attempts_count: 0,
      //     is_locked: false,
      //     updated_at: new Date().toISOString()
      //   })
      //   .eq('student_id', id);

      alert('تم إعادة تعيين النتيجة وفتح الامتحان بنجاح في السيرفر!');
      fetchSubmissionsFromSupabase();
    } catch (err: any) {
      console.error('Error in reset operation:', err);
      alert('حدث خطأ أثناء إعادة فتح الامتحان: ' + err.message);
    }
  };

  const handleStartEdit = (row: any) => {
    setEditingRowId(row.id);
    setTempScores({
      darasy: row.derasy_score || 0,
      mahfoudat: row.mahfouzat_score || 0,
      qebty1: row.qebty_lvl1_score || 0,
      qebty2: row.qebty_lvl2_score || 0
    });
  };

  const handleSaveScores = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('exam_submissions')
        .update({
          derasy_score: tempScores.darasy,
          mahfouzat_score: tempScores.mahfoudat,
          qebty_lvl1_score: tempScores.qebty1,
          qebty_lvl2_score: tempScores.qebty2,
        })
        .eq('student_id', rowId);

      if (error) throw error;

      setSupabaseSubmissions(prev => prev.map(r => {
        if (r.id === rowId) {
          const d = Number(tempScores.darasy);
          const m = Number(tempScores.mahfoudat);
          const q1 = Number(tempScores.qebty1);
          const q2 = Number(tempScores.qebty2);
          return {
            ...r,
            derasy_score: d,
            mahfouzat_score: m,
            qebty_lvl1_score: q1,
            qebty_lvl2_score: q2,
            academicScore: d + m + q1 + q2
          };
        }
        return r;
      }));

      setEditingRowId(null);
      alert("تم تحديث الدرجات بنجاح!");
    } catch (err: any) {
      console.error("Error updating scores:", err);
      alert("حدث خطأ أثناء حفظ الدرجات: " + err.message);
    }
  };

  const handleAdvancedExportPDF = async () => {
    if (!results || results?.length === 0) return;
    setIsGeneratingPDF(true);
    setPdfProgress(5);
    setPdfStatus("جاري تحضير البيانات وتقسيم الجداول لملفات متعددة الأوراق...");

    // Wait short time to let the DOM render the hidden element
    setTimeout(async () => {
      try {
        const rowsPerPage = 12;
        const totalPages = Math.ceil((results?.length || 0) / rowsPerPage);
        
        // Setup jsPDF with Landscape orientation
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        for (let i = 0; i < totalPages; i++) {
          setPdfProgress(Math.round((i / totalPages) * 100));
          setPdfStatus(`جاري معالجة وتصدير الصفحة ${i + 1} من ${totalPages}...`);
          
          const element = document.getElementById(`pdf-page-${i}`);
          if (element) {
            // Options for html2canvas
            const canvas = await html2canvas(element, {
              scale: 2, // Sharpness
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            // On A4 Landscape (297mm x 210mm)
            if (i > 0) {
              pdf.addPage('a4', 'landscape');
            }
            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, `page-${i}`, 'FAST');
          }
        }

        setPdfProgress(100);
        setPdfStatus("جاري تحفيظ وتصدير ملف الـ PDF النهائي...");
        
        const timestamp = new Date().toISOString().slice(0, 10);
        const fileName = `تقرير_النتائج_النهائي_${timestamp}.pdf`;
        pdf.save(fileName);
      } catch (err: any) {
        console.error("Advanced export PDF error:", err);
        alert("حدث خطأ أثناء تصدير ملف PDF: " + (err.message || err));
      } finally {
        setIsGeneratingPDF(false);
        setPdfProgress(0);
        setPdfStatus('');
      }
    }, 400);
  };

  const handleExportToExcel = async () => {
    if (!results || results.length === 0) {
      alert("لا توجد نتائج لتصديرها.");
      return;
    }
    setIsExportingExcel(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('نتائج التصفية المحلية OMR');

      // Enable Right-to-Left representation for Arabic institutional reports
      ws.views = [{ rightToLeft: true }];

      // Helper function to format answer values cleanly for the sheet
      const formatAnswerValue = (ans: any): string => {
        if (ans === undefined || ans === null || ans === '') return '';
        if (typeof ans === 'number') {
          const letters = ['أ', 'ب', 'ج', 'د', 'هـ'];
          return letters[ans] || String(ans);
        }
        if (typeof ans === 'string') {
          const s = ans.trim().toUpperCase();
          if (s === 'A') return 'أ';
          if (s === 'B') return 'ب';
          if (s === 'C') return 'ج';
          if (s === 'D') return 'د';
          return ans;
        }
        if (typeof ans === 'object') {
          return JSON.stringify(ans);
        }
        return String(ans);
      };

      // Determine the maximum number of questions dynamically across all filtered student submissions
      let maxQuestionsCount = 0;
      results.forEach(row => {
        if (row.detailed_answers && Array.isArray(row.detailed_answers)) {
          maxQuestionsCount = Math.max(maxQuestionsCount, row.detailed_answers.length);
        }
      });
      if (maxQuestionsCount === 0) {
        maxQuestionsCount = 20; // Default fallback to Q1-Q20 standard columns
      }

      // Configure Base Columns
      const columns = [
        { header: 'كود الطالب / رقم الطالب', key: 'student_id', width: 22 },
        { header: 'اسم الطالب', key: 'student_name', width: 30 },
        { header: 'الكنيسة', key: 'church_name', width: 25 },
        { header: 'المرحلة', key: 'stage', width: 20 },
        { header: 'بيانات الـ QR', key: 'qr_data', width: 22 },
        { header: 'الدرجة الكلية', key: 'total_score', width: 15 },
        { header: 'إجمالي الأسئلة', key: 'total_questions', width: 15 },
        { header: 'الإجابات الصحيحة', key: 'correct_answers', width: 15 },
        { header: 'الإجابات الخاطئة', key: 'wrong_answers', width: 15 },
        { header: 'غير مجاب', key: 'unanswered', width: 15 },
      ];

      // Dynamically append Q1-QN columns
      for (let i = 1; i <= maxQuestionsCount; i++) {
        columns.push({
          header: `س${i} (Q${i})`,
          key: `q${i}`,
          width: 12
        });
      }

      ws.columns = columns;

      // Construct Mapped Rows
      const mappedRows = results.map(row => {
        const hasDetails = row.detailed_answers && Array.isArray(row.detailed_answers) && row.detailed_answers.length > 0;
        
        let totalQuestions: string | number = "N/A";
        let correctCount: string | number = "N/A";
        let wrongCount: string | number = "N/A";
        let blankCount: string | number = "N/A";

        if (hasDetails && row.detailed_answers) {
          totalQuestions = row.detailed_answers.length;
          correctCount = row.detailed_answers.filter(a => a.pts > 0).length;
          blankCount = row.detailed_answers.filter(a => a.ans === undefined || a.ans === null || a.ans === '').length;
          wrongCount = row.detailed_answers.filter(a => a.pts === 0 && a.ans !== undefined && a.ans !== null && a.ans !== '').length;
        }

        const rowData: any = {
          student_id: row.id || "N/A",
          student_name: row.studentName || "N/A",
          church_name: row.churchName || "N/A",
          stage: row.stage || "عام",
          qr_data: row.id || "N/A",
          total_score: row.academicScore ?? 0,
          total_questions: totalQuestions,
          correct_answers: correctCount,
          wrong_answers: wrongCount,
          unanswered: blankCount,
        };

        for (let i = 1; i <= maxQuestionsCount; i++) {
          if (hasDetails && row.detailed_answers && row.detailed_answers[i - 1]) {
            rowData[`q${i}`] = formatAnswerValue(row.detailed_answers[i - 1].ans);
          } else {
            rowData[`q${i}`] = "N/A";
          }
        }

        return rowData;
      });

      ws.addRows(mappedRows);

      // Apply Professional Header Styling (Bold font, light gray pattern fill, taller height)
      const headerRow = ws.getRow(1);
      headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' } // Light slate gray background (slate-100)
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      // Apply Center Alignment to all Student records
      ws.eachRow((r, rowNumber) => {
        if (rowNumber > 1) {
          r.alignment = { vertical: 'middle', horizontal: 'center' };
          // Apply subtle border gridlines for high polished presentation
          r.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        }
      });

      // Export workbook to raw binary stream & trigger save dialog
      const buffer = await workbook.xlsx.writeBuffer();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-");
      const fileName = `Exam_Results_Local_Filtered_${timestamp}.xlsx`;
      
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    } catch (err: any) {
      console.error("Error exporting local results to Excel:", err);
      alert("حدث خطأ أثناء تصدير ملف الإكسل: " + (err.message || err));
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Download OMR bubble sheet Excel template in the specified RTL 6-column schema
  const handleDownloadOmrTemplate = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('نموذج رصد بابل شيت');

      // Enable Right-to-Left representation for Arabic institutional reports
      ws.views = [{ rightToLeft: true }];

      // Define RTL columns precisely as requested (Right to Left):
      // 1. كود الطالب (Student ID)
      // 2. اسم المخدوم / الطالب (Name)
      // 3. الكنيسة (Church)
      // 4. المرحلة / المستوى (Level)
      // 5. مسابقة الدراسي فقط (Score)
      // 6. الحالة - غائب/حاضر/إلخ (Status)
      ws.columns = [
        { header: 'كود الطالب', key: 'student_id', width: 22 },
        { header: 'اسم المخدوم / الطالب', key: 'name', width: 32 },
        { header: 'الكنيسة', key: 'church', width: 25 },
        { header: 'المرحلة / المستوى', key: 'level', width: 22 },
        { header: 'مسابقة الدراسي فقط', key: 'score', width: 22 },
        { header: 'الحالة - غائب/حاضر/إلخ', key: 'status', width: 22 }
      ];

      // Add a couple of realistic placeholder rows
      ws.addRow({
        student_id: '101',
        name: 'جرجس سمير فايز',
        church: 'العذراء مريم',
        level: 'ثالثة ورابعة',
        score: 95,
        status: 'حاضر'
      });
      ws.addRow({
        student_id: '102',
        name: 'مارينا مجدي عادل',
        church: 'العذراء مريم',
        level: 'خامسة وسادسة',
        score: 88,
        status: 'حاضر'
      });
      ws.addRow({
        student_id: '103',
        name: 'كيرلس عماد وجيه',
        church: 'العذراء مريم',
        level: 'ثالثة ورابعة',
        score: 0,
        status: 'غائب'
      });

      // Style Header Row (bold, background color, center alignment)
      const headerRow = ws.getRow(1);
      headerRow.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF1F5F9' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 28;

      // Style Data Rows
      ws.eachRow((r, rowNumber) => {
        if (rowNumber > 1) {
          r.alignment = { vertical: 'middle', horizontal: 'center' };
          r.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `OMR_BubbleSheet_Template.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    } catch (err: any) {
      console.error('Error generating template:', err);
      alert('حدث خطأ أثناء تحميل النموذج: ' + err.message);
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

        // Extract all student IDs from the uploaded file
        const studentIds = json.map((row: any) => {
          const studentIdInput = row['كود الطالب'] || row['Student ID'] || row['student_id'] || row['كود'] || row['رقم الطالب'] || '';
          return studentIdInput ? String(studentIdInput).trim() : '';
        }).filter(Boolean);

        // Fetch real names and other details of these students from registrations table
        const studentMap: Record<string, { name: string; churchName: string; stage: string; gender: string }> = {};
        if (studentIds.length > 0) {
          const { data: studentsList, error: fetchError } = await supabase
            .from('registrations')
            .select('student_id, name, churchName, stage, gender')
            .in('student_id', studentIds);

          if (fetchError) {
            console.error("Error fetching real student names:", fetchError);
          } else if (studentsList) {
            studentsList.forEach((student: any) => {
              if (student.student_id) {
                studentMap[student.student_id] = {
                  name: student.name || '',
                  churchName: student.churchName || '',
                  stage: student.stage || 'عام',
                  gender: student.gender || 'ذكر'
                };
              }
            });
          }
        }

        // Expected RTL Excel columns:
        // 1. Student ID (كود الطالب)
        // 2. Name (اسم المخدوم / الطالب)
        // 3. Church (الكنيسة)
        // 4. Level (المرحلة / المستوى)
        // 5. Score (مسابقة الدراسي فقط - represents the Academic/Study Contest score ONLY)
        // 6. Status (الحالة - غائب/حاضر/إلخ)
        const submissionsToInsert = json.map((row: any) => {
          // Robust checking for Arabic/English headers
          const studentIdInput = row['كود الطالب'] || row['Student ID'] || row['student_id'] || row['كود'] || row['رقم الطالب'] || '';
          const studentId = studentIdInput ? String(studentIdInput).trim() : `bubble-${Math.random().toString(36).substring(2, 11)}`;

          // Look up real name, fall back to Excel row Name column
          const dbStudent = studentMap[studentId];
          const studentName = dbStudent?.name || row['اسم المخدوم / الطالب'] || row['الاسم'] || row['اسم الطالب'] || row['اسم المخدوم'] || row['student_name'] || row['Name'] || '';
          const churchName = dbStudent?.churchName || row['الكنيسة'] || row['church_name'] || row['Church'] || row['الكنيسة/البلد'] || '';
          const stage = dbStudent?.stage || row['المرحلة / المستوى'] || row['المرحلة'] || row['المستوى'] || row['Level'] || row['stage'] || 'عام';
          const gender = dbStudent?.gender || 'ذكر';
          
          // CRITICAL NOTE: The Score column represents Academic/Study Contest score ONLY
          const scoreVal = row['مسابقة الدراسي فقط'] || row['مسابقة الدراسي'] || row['الدرجة'] || row['درجة الدراسي'] || row['derasy_score'] || row['score'] || row['Score'] || 0;
          const derasy = scoreVal !== undefined && scoreVal !== '' ? Number(scoreVal) : 0;

          const statusText = row['الحالة - غائب/حاضر/إلخ'] || row['الحالة'] || row['Status'] || row['status'] || 'حاضر';

          return {
            student_id: studentId,
            name: studentName,
            churchName: churchName,
            stage: stage,
            gender: gender,
            derasy_score: derasy,
            mahfouzat_score: null, // Treat purely as academic score, other parts null
            qebty_lvl1_score: null,
            qebty_lvl2_score: null,
            is_published: true,
            status: statusText === 'غائب' ? 'absent' : 'completed',
            submission_type: 'bubble_sheet',
            submitted_at: new Date().toISOString()
          };
        }).filter(item => item.student_id && item.name);

        if (submissionsToInsert.length === 0) {
          alert('لم يتم العثور على أي صفوف صالحة. تأكد من وجود كود الطالب واسم المخدوم.');
          return;
        }

        console.log("Payload to Supabase (bubble sheet alignment):", submissionsToInsert);

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
        name: manualForm.student_name,
        churchName: manualForm.church_name,
        stage: manualForm.stage,
        gender: manualForm.gender,
        derasy_score: manualForm.derasy_score !== '' ? Number(manualForm.derasy_score) : null,
        mahfouzat_score: manualForm.mahfouzat_score !== '' ? Number(manualForm.mahfouzat_score) : null,
        qebty_lvl1_score: manualForm.qebty_lvl1_score !== '' ? Number(manualForm.qebty_lvl1_score) : null,
        qebty_lvl2_score: manualForm.qebty_lvl2_score !== '' ? Number(manualForm.qebty_lvl2_score) : null,
        is_published: true,
        status: 'completed',
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
        .neq('id', '0'); // Update all rows

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

  const handleTogglePublish = async (publishState: boolean) => {
    setIsPublishLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ results_published: publishState })
        .eq('id', '1');

      if (error) throw error;

      setResultsPublished(publishState);
      alert(publishState ? "تم إعلان النتائج بنجاح لجميع الكنائس! 🚀" : "تم حجب النتائج بنجاح عن الكنائس. 🔒");
    } catch (err: any) {
      console.error("Error updating publish status:", err);
      alert("حدث خطأ أثناء تعديل حالة الإعلان: " + err.message);
    } finally {
      setIsPublishLoading(false);
    }
  };

  const handlePublishChurchResults = async (churchName: string) => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('exam_submissions')
        .update({ is_published: true })
        .eq('churchName', churchName);

      if (error) throw error;

      alert(`تم نشر النتيجة بنجاح لكنيسة: ${churchName}`);
      fetchSubmissionsFromSupabase();
    } catch (err: any) {
      console.error("Publishing failed:", err.message);
      alert('حدث خطأ أثناء النشر: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return <div className="text-center p-12 text-slate-500 font-bold font-arabic" dir="rtl">جاري تحميل البيانات...</div>;
  }

  if (!resultsPublished && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-slate-100 text-center max-w-md mx-auto my-12 font-arabic" dir="rtl">
        <div className="p-4 bg-amber-50 rounded-full text-amber-500 mb-4 border border-amber-100">
          <Lock size={40} className="animate-pulse" />
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2">النتائج قيد المراجعة</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-bold">
          سلام المسيح .. يجرى حاليًا رصد ومراجعة درجات المخدومين. انتظروا إعلان النتائج رسميًا قريبًا جدًا!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
     {/* جعل المحرك يعمل دائماً لتستفيد منه الكنائس، وتمرير صلاحية الأدمن ليرى الواجهة فقط */}
      <AdminHonorsEngine results={supabaseSubmissions} isAdmin={isAdmin} onHonorsUpdate={setHonorsRanks} />
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
            <button 
              onClick={handleDownloadOmrTemplate}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
              title="تحميل نموذج ملف Excel المخصص للبابل شيت OMR"
            >
              <Download size={14} />
              تحميل نموذج بابل شيت (Excel)
            </button>
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
              onClick={() => setShowBulkScoreDashboard(!showBulkScoreDashboard)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm border ${
                showBulkScoreDashboard 
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-900 text-white animate-pulse" 
                  : "bg-indigo-600 border-indigo-500 hover:bg-indigo-700 text-white"
              }`}
            >
              <Award size={14} />
              {showBulkScoreDashboard ? "العودة لجدول النتائج 📋" : "رصد الدرجات الجماعي ⚡"}
            </button>
            {!resultsPublished ? (
              <button
                onClick={() => handleTogglePublish(true)}
                disabled={isPublishLoading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
              >
                <Megaphone size={14} />
                {isPublishLoading ? "جاري الإعلان..." : "إعلان النتائج للكنائس"}
              </button>
            ) : (
              <button
                onClick={() => handleTogglePublish(false)}
                disabled={isPublishLoading}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer"
              >
                <EyeOff size={14} />
                {isPublishLoading ? "جاري الحجب..." : "تراجع / حجب النتائج عن الكنائس"}
              </button>
            )}

            <span className={`flex items-center justify-center px-3 py-2.5 rounded-xl text-[10px] font-black ${resultsPublished ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
              {resultsPublished ? "● النتائج حالياً: معلنة للكنائس" : "● النتائج حالياً: محجوبة"}
            </span>
          </div>
        </div>
      )}

      {!showBulkScoreDashboard ? (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-arabic" id="results-table-main-wrapper">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4" dir="rtl">
          <h4 className="text-lg font-black text-slate-800">
            نتائج التصفية المحلية {(!isAdmin && activeUserChurch) ? `(كنيسة ${activeUserChurch})` : ''}
          </h4>
          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
            {results.length > 0 && (
              <>
                <button 
                  onClick={handleExportToExcel}
                  disabled={isExportingExcel}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="تصدير كشف النتائج كملف Excel مخصص (OMR)"
                >
                  <FileSpreadsheet size={15} />
                  <span>{isExportingExcel ? 'جاري تصدير Excel...' : 'تصدير كشف Excel (OMR) 📊'}</span>
                </button>
                <button 
                  onClick={handleAdvancedExportPDF}
                  disabled={isGeneratingPDF}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  title="تصدير كشف النتائج كملف PDF"
                >
                  <FileSpreadsheet size={15} />
                  <span>تصدير تقرير PDF متعدد الصفحات (Landscape) 📑</span>
                </button>
              </>
            )}
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

        {/* Real-time Filter Controls (4 filters) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 mb-6 flex flex-col md:flex-row gap-4 text-right" dir="rtl" id="results-realtime-filters">
          {/* 1. فلتر البحث بالاسم */}
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

          {/* 2. فلتر البحث بالكنيسة */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-black text-slate-500 mb-1.5">البحث بالكنيسة</label>
            <input 
              type="text"
              placeholder="ابحث باسم الكنيسة..."
              value={searchChurch}
              onChange={(e) => {
                setSearchChurch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>

          {/* 3. تصفية بالمرحلة */}
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

          {/* 4. تصفية بالمسابقة */}
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
              <option value="قبطي مستوى ثان">قبطي مستوى ثان</option>
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
                    'دراسي': row.derasy_score ?? 0,
                    'محفوظات': row.mahfouzat_score ?? 0,
                    'قبطي 1': row.qebty_lvl1_score ?? 0,
                    'قبطي 2': row.qebty_lvl2_score ?? 0,
                    'نوع الامتحان': row.submissionType || 'online',
                    'النوع': row.gender || '',
                    'الدرجة الكلية': row.academicScore !== null && row.academicScore !== undefined ? row.academicScore : '-',
                    'حالة التسليم': (row as any).submissionStatus || 'تم التسليم'
                  };
                  
                  const hasScore = row.academicScore !== undefined && row.academicScore !== null;
                  const rowClass = 'hover:bg-slate-50 transition-colors';

                  return (
                    <tr key={row.id || index} className={rowClass}>
                      <td className="p-4 font-bold text-slate-400 text-sm whitespace-nowrap border-l border-slate-50 relative">
                       {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
</td>
{isAdmin && (
  <td className="p-4 border-l border-slate-50">
    {hasScore && (
      <div className="flex gap-2 items-center flex-wrap">
        {/* زر إعادة الامتحان */}
        <button 
          onClick={() => handleResetRow(row.id!)}
          title="إعادة الامتحان"
          className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all border border-rose-100"
        >
          <RefreshCcw size={14} />
        </button>
        
        {/* هنا الشرط السحري: لو السطر في وضع التعديل اعرض أزرار الحفظ والإلغاء */}
        {editingRowId === row.id ? (
          <>
            <button 
              onClick={() => handleSaveScores(row.id!)}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black transition-all"
            >
              حفظ
            </button>
            <button 
              onClick={() => setEditingRowId(null)}
              className="px-3 py-1 bg-slate-400 hover:bg-slate-500 text-white rounded-lg text-[10px] font-black transition-all"
            >
              إلغاء
            </button>
          </>
        ) : (
          /* لو السطر في الوضع العادي اعرض زرار تعديل الدرجات */
          <button 
            onClick={() => handleStartEdit(row)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black transition-all"
          >
            تعديل الدرجات
          </button>
        )}
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

                        // Edit Mode inputs for score columns
                        if (editingRowId === row.id) {
                          if (header === 'دراسي') {
                            return (
                              <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                                <input
                                  type="number"
                                  value={tempScores.darasy}
                                  onChange={(e) => setTempScores({ ...tempScores, darasy: Number(e.target.value) })}
                                  className="w-16 p-1 border border-amber-300 rounded text-center text-black focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </td>
                            );
                          }
                          if (header === 'محفوظات') {
                            return (
                              <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                                <input
                                  type="number"
                                  value={tempScores.mahfoudat}
                                  onChange={(e) => setTempScores({ ...tempScores, mahfoudat: Number(e.target.value) })}
                                  className="w-16 p-1 border border-amber-300 rounded text-center text-black focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </td>
                            );
                          }
                          if (header === 'قبطي 1') {
                            return (
                              <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                                <input
                                  type="number"
                                  value={tempScores.qebty1}
                                  onChange={(e) => setTempScores({ ...tempScores, qebty1: Number(e.target.value) })}
                                  className="w-16 p-1 border border-amber-300 rounded text-center text-black focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </td>
                            );
                          }
                          if (header === 'قبطي 2') {
                            return (
                              <td key={idx} className="p-4 whitespace-nowrap border-l border-slate-50 text-right">
                                <input
                                  type="number"
                                  value={tempScores.qebty2}
                                  onChange={(e) => setTempScores({ ...tempScores, qebty2: Number(e.target.value) })}
                                  className="w-16 p-1 border border-amber-300 rounded text-center text-black focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                              </td>
                            );
                          }
                        }
                        if (header === 'الدرجة الكلية' && editingRowId === row.id) {
                          const currentTotal = Number(tempScores.darasy) + Number(tempScores.mahfoudat) + Number(tempScores.qebty1) + Number(tempScores.qebty2);
                          return (
                            <td key={idx} className="p-4 font-bold whitespace-nowrap border-l border-slate-50 text-indigo-600 font-black text-lg text-right">
                              {currentTotal}
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

                        const subjectMapping: Record<string, string> = {
                          'دراسي': 'دراسي',
                          'محفوظات': 'محفوظات',
                          'قبطي 1': 'قبطي مستوى أول',
                          'قبطي 2': 'قبطي مستوى ثاني'
                        };

                        if (subjectMapping[header]) {
                          const currentSubject = subjectMapping[header];
                          const scoreVal = rowData[header];
                          const scoreNum = Number(scoreVal) || 0;
                          
                          const uniqueRankKey = row.id ? `${row.id}_${currentSubject}` : '';
                          const honorInfo = (uniqueRankKey && scoreNum > 0) ? mergedHonorsRanks?.[uniqueRankKey] : null;
                          const cellBg = honorInfo ? honorInfo.colorClass : '';
                          
                          let cupEmoji = '';
                          if (honorInfo) {
                            if (honorInfo.rank === 1) cupEmoji = '🏆';
                            else if (honorInfo.rank === 2) cupEmoji = '🥈';
                            else if (honorInfo.rank === 3) cupEmoji = '🥉';
                          }

                          return (
                            <td 
                              key={idx} 
                              className={`p-4 font-bold whitespace-nowrap border-l border-slate-50 text-right transition-colors ${cellBg || 'text-slate-700'}`}
                            >
                              <div className="flex flex-col items-center justify-center gap-1 min-w-[80px]">
                                <span>{scoreVal !== undefined && scoreVal !== null ? scoreVal : '-'}</span>
                                {honorInfo && (
                                  <span 
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-white/95 border border-black/5 shadow-sm text-slate-800 whitespace-nowrap mt-1"
                                    title={`${honorInfo.title} (${honorInfo.percentage?.toFixed(1) || 0}%)`}
                                  >
                                    <span>{cupEmoji}</span>
                                    <span>{honorInfo.title}</span>
                                  </span>
                                )}
                              </div>
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
              <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                < Award className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-800 font-black text-lg">
                  {!isAdmin ? 'جاري رصد الدرجات، لم يتم نشر النتيجة بعد لهذه الكنيسة.' : 'بانتظار رصد وتسجيل درجات الامتحانات...'}
                </p>
                {!isAdmin && <p className="text-slate-500 font-bold mt-2">يرجى العودة لاحقاً فور اعتماد النتيجة رسمياً من الإدارة.</p>}
              </div>
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
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-arabic" id="bulk-score-dashboard-wrapper">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4" dir="rtl">
            <div>
              <h4 className="text-xl font-black text-indigo-900">
                ⚡ لوحة رصد الدرجات الجماعية والاستثنائية (Bulk Score Entry)
              </h4>
              <p className="text-xs text-slate-500 font-bold mt-1">رصد درجات جماعي وسريع لكافة الطلاب المحددين في المسابقات المختلفة</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchBulkStudents}
                disabled={isBulkStudentsLoading}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
                title="تحديث البيانات"
              >
                <RefreshCcw size={16} className={isBulkStudentsLoading ? 'animate-spin' : ''} />
              </button>
              <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-black">
                المطابقين: {bulkStudents.length} مشترك
              </span>
            </div>
          </div>

          {/* Top Filters Block (bounds stage_name and church_name) */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 text-right animate-fade-in" dir="rtl">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-black text-slate-600 mb-1.5">تصفية بالكنيسة / البلد</label>
              <select 
                value={bulkChurch}
                onChange={(e) => setBulkChurch(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
              >
                <option value="الكل">جميع الكنائس والبلاد (الكل)</option>
                {finalChurchOptions.map((church, idx) => (
                  <option key={idx} value={church}>{church}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-64">
              <label className="block text-xs font-black text-slate-600 mb-1.5">تصفية بالمرحلة الدراسية</label>
              <select 
                value={bulkStage}
                onChange={(e) => setBulkStage(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
              >
                <option value="الكل">جميع المراحل (الكل)</option>
                {finalStageOptions.map((stage, idx) => (
                  <option key={idx} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Column Control Bar & Execution Panel */}
          <div className="bg-gradient-to-r from-indigo-50 to-slate-100 p-5 rounded-2xl border border-indigo-150 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 text-right animate-fade-in" dir="rtl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
              
              {/* Target Dropdown [ اختار المسابقة] */}
              <div className="flex flex-col min-w-[200px]">
                <label className="block text-xs font-black text-indigo-700 mb-1.5">[ اختار المسابقة]</label>
                <select 
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm cursor-pointer"
                >
                  <option value="qebty_lvl1_score">قبطي مستوى أول</option>
                  <option value="qebty_lvl2_score">قبطي مستوى ثان</option>
                  <option value="derasy_score">دراسي</option>
                  <option value="mahfouzat_score">محفوظات</option>
                </select>
              </div>

              {/* Bulk Score Input */}
              <div className="flex flex-col w-full sm:w-32">
                <label className="block text-xs font-black text-indigo-700 mb-1.5">الدرجة المستهدفة</label>
                <input 
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0 - 100"
                  value={bulkScoreValue}
                  onChange={(e) => setBulkScoreValue(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            </div>

            {/* Execute Button [ حفظ وإرسال للكل] */}
            <div className="shrink-0 w-full md:w-auto">
              <button 
                onClick={handleBulkSubmit}
                disabled={isBulkSubmitting || isBulkStudentsLoading || selectedStudentIds.length === 0}
                className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                {isBulkSubmitting ? (
                  <>
                    <Loader className="animate-spin" size={14} />
                    جاري الحفظ والرفع للسيرفر...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    [ حفظ وإرسال للكل]
                  </>
                )}
              </button>
            </div>
          </div>

          {/* instant Name Search Bar */}
          <div className="mb-4 text-right" dir="rtl">
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="🔍 ابحث عن اسم الطالب هنا للرصد السريع ..."
                value={bulkSearchQuery}
                onChange={(e) => setBulkSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-xs font-black outline-none shadow-sm transition-all text-slate-800 placeholder-slate-400"
              />
              {bulkSearchQuery && (
                <button
                  onClick={() => setBulkSearchQuery('')}
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-rose-500 transition-colors"
                  title="مسح البحث السريع"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Multi-selection bar and quick-actions */}
          <div className="flex items-center justify-between bg-slate-100 rounded-xl px-4 py-2.5 mb-4 text-xs font-bold text-slate-700" dir="rtl">
            <div>
              تم تحديد <span className="text-indigo-600 font-extrabold">{selectedStudentIds.length}</span> من أصل <span className="text-slate-800 font-extrabold">{bulkStudents.length}</span> طالب للمزامنة الجماعية.
              {bulkSearchQuery && (
                <span className="text-slate-500 mr-2">
                  (المطابق للبحث: <span className="text-indigo-600 font-extrabold">{filteredBulkStudents.length}</span>)
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const visibleIds = currentBulkStudents.map(s => s.student_id);
                  setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                }}
                className="text-indigo-600 hover:underline font-black"
              >
                تحديد الكل بالصفحة ☑️
              </button>
              <span className="text-slate-300">|</span>
              <button 
                onClick={() => {
                  const visibleIds = filteredBulkStudents.map(s => s.student_id);
                  setSelectedStudentIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                }}
                className="text-indigo-600 hover:underline font-black"
              >
                تحديد كل نتائج البحث 🎯
              </button>
              <span className="text-slate-300">|</span>
              <button 
                onClick={() => setSelectedStudentIds([])}
                className="text-rose-600 hover:underline font-black"
              >
                إلغاء التحديد ✖️
              </button>
            </div>
          </div>

          {/* Student Selection Data Table Checklist */}
          {isBulkStudentsLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader className="animate-spin text-indigo-600 mb-4" size={32} />
              <p className="text-slate-500 text-sm font-bold">جاري تحميل المشتركين من قاعدة البيانات...</p>
            </div>
          ) : bulkStudents.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Users className="mx-auto text-slate-300 mb-3" size={44} />
              <p className="text-slate-800 font-black text-sm">
                لم يتم رصد أي طلاب مطابقين لهذه التصفية في جدول التسجيلات.
              </p>
              <p className="text-slate-500 text-xs mt-1">الرجاء ضبط الفلاتر أو إعادة المحاولة بفلتر آخر.</p>
            </div>
          ) : filteredBulkStudents.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Search className="mx-auto text-indigo-500 mb-3 animate-bounce" size={44} />
              <p className="text-slate-800 font-black text-sm">
                لا توجد نتائج تطابق البحث الحالي "{bulkSearchQuery}".
              </p>
              <p className="text-slate-500 text-xs mt-1">يرجى تعديل كلمة البحث للتصفية بشكل صحيح.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse" dir="rtl">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase whitespace-nowrap border-b border-slate-150">
                    <th className="p-3 w-16 text-center">[ حدد]</th>
                    <th className="p-3">اسم الطالب (المشترك)</th>
                    <th className="p-3">الكنيسة/البلد</th>
                    <th className="p-3 font-black text-slate-500">المرحلة</th>
                    <th className="p-3 text-center">الدرجات الحالية في السيرفر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentBulkStudents.map((student, idx) => {
                    const isSelected = selectedStudentIds.includes(student.student_id);
                    const scores = existingScores[student.student_id] || {};
                    return (
                      <tr 
                        key={student.student_id} 
                        className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-55/35' : ''}`}
                      >
                        {/* Custom Checkbox Column [ حدد] */}
                        <td className="p-3 text-center border-l border-slate-50">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, student.student_id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.student_id));
                              }
                            }}
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-350 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Name */}
                        <td className="p-3 font-bold text-slate-800 text-sm">{student.name}</td>

                        {/* Church */}
                        <td className="p-3 text-slate-500 text-xs font-bold">{student.churchName}</td>

                        {/* Stage */}
                        <td className="p-3 text-slate-600 text-xs font-bold">
                          <span className="bg-slate-100 px-2.5 py-1 rounded-full text-[10px] font-black text-slate-700">
                            {student.stage || 'عام'}
                          </span>
                        </td>

                        {/* Existing Scores Capsules */}
                        <td className="p-3 text-center border-r border-slate-50">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-105">
                              قبطي1: {scores.qebty_lvl1_score !== undefined && scores.qebty_lvl1_score !== null ? scores.qebty_lvl1_score : '-'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-105">
                              قبطي2: {scores.qebty_lvl2_score !== undefined && scores.qebty_lvl2_score !== null ? scores.qebty_lvl2_score : '-'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-105">
                              دراسي: {scores.derasy_score !== undefined && scores.derasy_score !== null ? scores.derasy_score : '-'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-105">
                              محفوظات: {scores.mahfouzat_score !== undefined && scores.mahfouzat_score !== null ? scores.mahfouzat_score : '-'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination controls */}
              {totalBulkPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 border-t border-slate-150 rounded-b-2xl font-arabic" dir="rtl">
                  <div className="text-xs text-slate-500 font-bold">
                    يعرض <span className="text-slate-800 font-black">{Math.min((bulkCurrentPage - 1) * bulkItemsPerPage + 1, filteredBulkStudents.length)}</span> - <span className="text-slate-800 font-black">{Math.min(bulkCurrentPage * bulkItemsPerPage, filteredBulkStudents.length)}</span> من أصل <span className="text-indigo-600 font-extrabold">{filteredBulkStudents.length}</span> مشترك (الصفحة {bulkCurrentPage} من {totalBulkPages})
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBulkCurrentPage(1)}
                      disabled={bulkCurrentPage === 1}
                      className="px-2.5 py-1.5 text-[10px] font-black bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                      title="الصفحة الأولى"
                    >
                      الأولى
                    </button>
                    <button
                      onClick={() => setBulkCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={bulkCurrentPage === 1}
                      className="px-3 py-1.5 text-[10px] font-black bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      السابق
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalBulkPages) }, (_, i) => {
                        let pageNum = bulkCurrentPage - 2 + i;
                        if (bulkCurrentPage <= 2) {
                          pageNum = i + 1;
                        } else if (bulkCurrentPage >= totalBulkPages - 1) {
                          pageNum = totalBulkPages - 4 + i;
                        }
                        if (pageNum < 1 || pageNum > totalBulkPages) return null;

                        const isCurrent = pageNum === bulkCurrentPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setBulkCurrentPage(pageNum)}
                            className={`w-8 h-8 flex items-center justify-center text-xs font-black rounded-lg transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setBulkCurrentPage(prev => Math.min(prev + 1, totalBulkPages))}
                      disabled={bulkCurrentPage === totalBulkPages}
                      className="px-3 py-1.5 text-[10px] font-black bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      التالي
                    </button>
                    <button
                      onClick={() => setBulkCurrentPage(totalBulkPages)}
                      disabled={bulkCurrentPage === totalBulkPages}
                      className="px-2.5 py-1.5 text-[10px] font-black bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer"
                      title="الصفحة الأخيرة"
                    >
                      الأخيرة
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
                      <div className="flex items-center justify-between gap-2">
                        <span>{church}</span>
                        {isAdmin && (
                          <button 
                            onClick={() => handlePublishChurchResults(church)}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded text-[9px] font-black border border-emerald-100 transition-all ml-4"
                            title="نشر النتائج لهذه الكنيسة فقط"
                          >
                            نشر
                          </button>
                        )}
                      </div>
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
                    <label className="block text-xs font-bold text-slate-500 mb-1"> دراسي</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
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
                      step="0.5"
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
                      step="0.5"
                      value={manualForm.qebty_lvl1_score}
                      onChange={(e) => setManualForm({...manualForm, qebty_lvl1_score: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="الدرجة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">قبطي مستوى ثان</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
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

      {/* Hidden container designed to match exact A4 Landscape aspect ratio for html2canvas extraction */}
      {isGeneratingPDF && (
        <div 
          style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '1122px', overflow: 'hidden' }}
          className="bg-white font-arabic" 
          dir="rtl"
        >
          {Array.from({ length: Math.ceil((results?.length || 0) / 12) }).map((_, pageIndex) => {
            const rowsPerPage = 12;
            const startIdx = pageIndex * rowsPerPage;
            const pageResults = (results || []).slice(startIdx, startIdx + rowsPerPage);
            const totalPagesNum = Math.ceil((results?.length || 0) / rowsPerPage);

            return (
              <div 
                key={pageIndex}
                id={`pdf-page-${pageIndex}`}
                style={{ width: '1122px', height: '794px' }}
                className="bg-white p-[38px] flex flex-col justify-between border-b border-gray-100"
              >
                <div>
                  {/* Page Header */}
                  <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-3 mb-4 text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-sm">
                        م
                      </div>
                      <div className="text-right">
                        <h3 className="text-base font-black text-indigo-950">بيان رصد الدرجات وتحليل نتائج الامتحانات</h3>
                        <p className="text-[10px] font-bold text-slate-500">مهرجان الكرازة المرقسية ٢٠٢٦</p>
                      </div>
                    </div>
                    
                    <div className="text-left">
                      <span className="inline-block bg-indigo-50 text-indigo-800 px-3 py-1 rounded-full text-[10px] font-black border border-indigo-150">
                        صفحة {pageIndex + 1} من {totalPagesNum}
                      </span>
                      <p className="text-[9px] font-bold text-slate-400 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>

                  {/* Active Filters Metadata Card */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-4 text-[10px] font-black text-slate-600">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-slate-400 font-extrabold ml-1">كنيسة / جهة:</span>
                        <span className="text-slate-800 font-black">{!isAdmin && activeUserChurch ? activeUserChurch : "جميع الكنائس"}</span>
                      </div>
                      <div className="w-[1px] h-3 bg-slate-200"></div>
                      <div>
                        <span className="text-slate-400 font-extrabold ml-1">التصفية الحالية:</span>
                        <span className="text-slate-800 font-black">{filterStage === "الكل" ? "كل المراحل" : filterStage}</span>
                      </div>
                      <div className="w-[1px] h-3 bg-slate-200"></div>
                      <div>
                        <span className="text-slate-400 font-extrabold ml-1">نوع المسابقة:</span>
                        <span className="text-slate-800 font-black">{filterCompetition === "الكل" ? "كل المسابقات" : filterCompetition}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-extrabold ml-1">إجمالي المقيدين في الكشف:</span>
                      <span className="text-indigo-600 font-black">{(results?.length || 0)} طالب</span>
                    </div>
                  </div>

                  {/* Table with fixed layout */}
                  <table className="w-full text-right border-collapse border border-slate-300" style={{ tableLayout: 'fixed' }}>
                    <thead>
                      <tr className="bg-slate-100 text-[11px] font-black text-slate-700 uppercase whitespace-nowrap border-b border-slate-350 text-slate-900">
                        <th style={{ width: '55px' }} className="p-2.5 text-center border-l border-slate-300">م</th>
                        <th style={{ width: '230px' }} className="p-2.5 border-l border-slate-300">اسم الطالب</th>
                        <th style={{ width: '220px' }} className="p-2.5 border-l border-slate-300">الكنيسة/البلد</th>
                        <th style={{ width: '130px' }} className="p-2.5 border-l border-slate-300">المرحلة</th>
                        <th style={{ width: '65px' }} className="p-2.5 text-center border-l border-slate-300">دراسي</th>
                        <th style={{ width: '65px' }} className="p-2.5 text-center border-l border-slate-300">محفوظات</th>
                        <th style={{ width: '65px' }} className="p-2.5 text-center border-l border-slate-300">قبطي 1</th>
                        <th style={{ width: '65px' }} className="p-2.5 text-center border-l border-slate-300">قبطي 2</th>
                        <th style={{ width: '85px' }} className="p-2.5 text-center border-l border-slate-300 font-extrabold text-indigo-900 bg-indigo-50/40">الدرجة الكلية</th>
                        <th style={{ width: '100px' }} className="p-2 text-center text-[10px]">الامتحان</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {pageResults.map((row, rowIdx) => {
                        const globalIdx = startIdx + rowIdx + 1;
                        const d = row.derasy_score ?? 0;
                        const m = row.mahfouzat_score ?? 0;
                        const q1 = row.qebty_lvl1_score ?? 0;
                        const q2 = row.qebty_lvl2_score ?? 0;
                        const total = row.academicScore ?? (d + m + q1 + q2);
                        
                        return (
                          <tr key={row.id || rowIdx} className="hover:bg-slate-50/50 text-[11px] font-bold text-slate-800">
                            {/* # (index) */}
                            <td className="p-2 text-center border-l border-slate-200 font-extrabold text-slate-400">
                              {globalIdx}
                            </td>
                            {/* Student Name */}
                            <td className="p-2 border-l border-slate-200 font-black text-slate-900 truncate">
                              {row.studentName}
                            </td>
                            {/* Church Name */}
                            <td className="p-2 border-l border-slate-200 truncate text-slate-600">
                              {row.churchName}
                            </td>
                            {/* Stage */}
                            <td className="p-2 border-l border-slate-200 text-slate-600">
                              {row.stage || 'عام'}
                            </td>
                            {/* score derasy */}
                            {(() => {
                              const keyDerasy = row.id ? `${row.id}_دراسي` : '';
                              const honorDerasy = (keyDerasy && d > 0) ? mergedHonorsRanks?.[keyDerasy] : null;
                              const cellBg = honorDerasy ? honorDerasy.colorClass : '';
                              return (
                                <td className={`p-2 text-center border-l border-slate-200 transition-colors ${cellBg}`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span>{d}</span>
                                    {honorDerasy && (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-white/90 border border-black/5 shadow-xs text-slate-800 whitespace-nowrap">
                                        <span>{getCupEmoji(honorDerasy.rank)}</span>
                                        <span>{honorDerasy.title}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })()}
                            {/* score mahfouzat */}
                            {(() => {
                              const keyMahfouzat = row.id ? `${row.id}_محفوظات` : '';
                              const honorMahfouzat = (keyMahfouzat && m > 0) ? mergedHonorsRanks?.[keyMahfouzat] : null;
                              const cellBg = honorMahfouzat ? honorMahfouzat.colorClass : '';
                              return (
                                <td className={`p-2 text-center border-l border-slate-200 transition-colors ${cellBg}`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span>{m}</span>
                                    {honorMahfouzat && (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-white/90 border border-black/5 shadow-xs text-slate-800 whitespace-nowrap">
                                        <span>{getCupEmoji(honorMahfouzat.rank)}</span>
                                        <span>{honorMahfouzat.title}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })()}
                            {/* score qebty 1 */}
                            {(() => {
                              const keyQebty1 = row.id ? `${row.id}_قبطي مستوى أول` : '';
                              const honorQebty1 = (keyQebty1 && q1 > 0) ? mergedHonorsRanks?.[keyQebty1] : null;
                              const cellBg = honorQebty1 ? honorQebty1.colorClass : '';
                              return (
                                <td className={`p-2 text-center border-l border-slate-200 transition-colors ${cellBg}`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span>{q1}</span>
                                    {honorQebty1 && (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-white/90 border border-black/5 shadow-xs text-slate-800 whitespace-nowrap">
                                        <span>{getCupEmoji(honorQebty1.rank)}</span>
                                        <span>{honorQebty1.title}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })()}
                            {/* score qebty 2 */}
                            {(() => {
                              const keyQebty2 = row.id ? `${row.id}_قبطي مستوى ثاني` : '';
                              const honorQebty2 = (keyQebty2 && q2 > 0) ? mergedHonorsRanks?.[keyQebty2] : null;
                              const cellBg = honorQebty2 ? honorQebty2.colorClass : '';
                              return (
                                <td className={`p-2 text-center border-l border-slate-200 transition-colors ${cellBg}`}>
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span>{q2}</span>
                                    {honorQebty2 && (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black bg-white/90 border border-black/5 shadow-xs text-slate-800 whitespace-nowrap">
                                        <span>{getCupEmoji(honorQebty2.rank)}</span>
                                        <span>{honorQebty2.title}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })()}
                            {/* Total score */}
                            <td className="p-2 text-center border-l border-slate-200 font-black text-xs text-indigo-700 bg-indigo-50/10">
                              {total}
                            </td>
                            {/* Exam Type */}
                            <td className="p-2 text-center whitespace-nowrap">
                              {row.submissionType === 'bubble_sheet' ? (
                                <span className="text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5">بابل شيت</span>
                              ) : row.submissionType === 'paper' ? (
                                <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5">ورقي</span>
                              ) : (
                                <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5">أونلاين</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Page Footer */}
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-t border-slate-200 pt-3 mt-4">
                  <p>   الكنترول - مهرجان الكرازة المرقسية</p>
                  <p className="text-indigo-650 font-black">    • كشف النتائج   10mm</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress Dialog Overlay for Premium Export Experience */}
      {isGeneratingPDF && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 font-arabic text-center border-0 outline-none" dir="rtl">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 mx-4">
            <div className="flex flex-col items-center">
              <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full border-4 border-slate-100"></span>
                <span className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></span>
                <FileSpreadsheet className="text-indigo-600 animate-pulse" size={28} />
              </div>

              <h4 className="text-lg font-black text-slate-900 mb-2">تصدير  النتائج كـ PDF</h4>
              <p className="text-xs text-slate-500 font-bold mb-6 line-clamp-2 min-h-[2.5rem]">{pdfStatus}</p>

              {/* Progress Slider Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden border border-slate-200/50">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${pdfProgress}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between w-full text-[10px] font-black text-slate-400 px-1">
                <span>جاري التنزيل...</span>
                <span className="text-indigo-600">{pdfProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResultsViewer;
