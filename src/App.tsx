/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UAParser } from 'ua-parser-js';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Check,
  User,
  Trophy,
  Calculator, 
  FileText, 
  Calendar, 
  UserPlus, 
  Download, 
  Church, 
  MapPin,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  CheckCircle2,
  Phone,
  Home,
  Info,
  ChevronLeft,
  LogIn,
  LogOut,
  Lock,
  ShieldCheck,
  MessageSquare,
  RotateCcw,
  RotateCw,
  Send,
  History,
  LayoutDashboard,
  UserCircle,
  Search,
  Users,
  Plus,
  Trash2,
  Link2,
  QrCode,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  Newspaper,
  Award,
  Eye,
  EyeOff,
  Settings,
  Loader2,
  Save,
  Pencil,
  ShoppingCart,
  Activity,
  Wallet,
  TrendingUp,
  Clock,
  BarChart3,
  FileScan,
  FileSpreadsheet,
  Sliders,
  ChevronUp,
  ChevronDown,
  Layers,
  Printer,
  AlertTriangle,
  Bell,
  ShieldAlert,
  RefreshCw
} from 'lucide-react';
import QuickActionsHub from './components/QuickActionsHub';
import { ExamBuilder, LiveExamGateway } from './components/ExamEngine';
import { ExamModelsDashboard } from './components/ExamModelsDashboard';
import { ResultsViewer } from './components/ResultsViewer';
import PaginationComponent from './components/Pagination';
import Notification from './components/Notification';
import OmrGenerator from './components/OmrGenerator';
import { downloadStudentQRCode } from './utils/qrCodeGenerator';
import { ExamLoginPortal } from './components/ExamLoginPortal';
import { TemplateExcelExporter } from './components/TemplateExcelExporter';
import AdminDisplayGate from './components/AdminDisplayGate';
import { getDailyExamToken, validateHourlyExamToken } from './utils/dailyToken';
import { setupForceRefreshListener } from './utils/forceRefreshManager';
import { supabase } from './lib/supabaseClient';
import { getCustomActivities } from './utils/activitiesService';
import { getDeviceFingerprint } from './lib/deviceTracking';
import { uploadToFirebase } from './services/firebase';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore - html2pdf.js doesn't have great types but works
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination, EffectCreative } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/effect-creative';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { withStylesCleaned, replaceOklchInString } from './utils/oklchCleaner';


import ErrorBoundary from './components/ErrorBoundary';
import WidgetErrorBoundary from './components/WidgetErrorBoundary';


import UserManagement from './components/UserManagement';
import { 
  Inquiry, 
  Order, 
  Participant, 
  ActivityTeam, 
  TeamMember, 
  Result, 
  News, 
  ExamLink,
  Schedule,
  SiteSettings,
  AboutContent,
  CarouselItem
} from './types';

import { 
  PRICING_DATA, 
  CAROUSEL_IMAGES, 
  ADMIN_PASSWORD,
  CHURCH_CREDENTIALS,
  STAGE_ORDER,
  sortStages,
  CURRENT_YEAR
  } from './constants';

import { generateMasterExcel, downloadMasterTemplate, exportOnlineResultsExcel } from './services/newExcelExport';
import { generateShortId } from './lib/utils';
import DynamicAdminSettings from './components/DynamicAdminSettings';
import AdminBulkRegister from './components/AdminBulkRegister';
import ExportColumnSelector, { ColumnDefinition } from './components/ExportColumnSelector';
import { printDataTable } from './utils/printHelper';
// @ts-ignore
import logo from './by-logo.jpeg';

interface LiveNotification {
  id: string;
  sourceTable: 'registrations' | 'academic_registrations' | 'book_orders';
  churchName: string;
  message: string;
  timestamp: Date;
  read: boolean;
}


function NewsHeroSlider({ news, carouselItems, appLogo }: { news: News[], carouselItems: CarouselItem[], appLogo: string | null }) {
  const [selectedSlide, setSelectedSlide] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = useMemo(() => {
    const baseSlides = carouselItems && carouselItems.length > 0 
      ? carouselItems.map(item => ({
          id: item.id,
          title: item.title,
          subtitle: 'إعلان',
          image: item.url,
          content: '',
          isLogo: false
        }))
      : news.filter(n => n.imageUrl).map(n => ({
          id: n.id,
          title: n.title,
          subtitle: 'خبر جديد',
          image: n.imageUrl,
          content: n.content,
          isLogo: false
        }));

    if (appLogo) {
      return [{
        id: 'theme-logo',
        title: 'شعار المهرجان السنوي',
        subtitle: 'الشعار الرسمي',
        image: appLogo,
        content: '',
        isLogo: true
      }, ...baseSlides];
    }
    return baseSlides;
  }, [news, carouselItems, appLogo]);

  // Keyboard controls for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSlide) return;
      if (e.key === 'Escape') setSelectedSlide(null);
      if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % slides.length;
        setCurrentIndex(nextIndex);
        setSelectedSlide(slides[nextIndex]);
      }
      if (e.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
        setCurrentIndex(prevIndex);
        setSelectedSlide(slides[prevIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlide, currentIndex, slides]);

  if (slides.length === 0) {
    return (
      <div className="relative h-[250px] md:h-[400px] w-full overflow-hidden rounded-[2rem] shadow-xl mb-12 flex items-center justify-center bg-slate-50 border border-slate-200">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-slate-200 rounded-2xl mx-auto mb-6 flex items-center justify-center animate-pulse">
            <ImageIcon size={32} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-500 mb-2">في انتظار التحديثات</h2>
          <p className="text-slate-400 font-bold">لا يوجد أخبار أو إعلانات حالياً.</p>
        </div>
      </div>
    );
  }

  return (
    <div data-slider="true" className="slider-container relative h-[400px] md:h-[650px] w-full overflow-hidden rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] mb-16 group border-8 border-white/5">
      <Swiper
        modules={[Autoplay, EffectCreative, Navigation, Pagination]}
        grabCursor={true}
        effect={'creative'}
        creativeEffect={{
          prev: {
            shadow: true,
            translate: ['-20%', 0, -1],
            opacity: 0,
          },
          next: {
            translate: ['100%', 0, 0],
          },
        }}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        navigation={{
          nextEl: '.swiper-button-next-custom',
          prevEl: '.swiper-button-prev-custom',
        }}
        pagination={{ 
          clickable: true, 
          bulletActiveClass: 'swiper-pagination-bullet-active-custom',
          renderBullet: (index, className) => {
            return `<span class="${className}"></span>`;
          }
        }}
        loop={true}
        className="h-full w-full"
      >
        {slides.map((item, index) => (
          <SwiperSlide key={item.id}>
            <div 
              className="relative h-full w-full cursor-zoom-in"
              onClick={() => {
                setSelectedSlide(item);
                setCurrentIndex(index);
              }}
            >
              <img 
                src={item.image} 
                alt={item.title} 
                className={`w-full h-full ${item.isLogo ? 'object-contain bg-slate-900/10 p-12' : 'object-cover'} transition-transform duration-[10s] group-hover:scale-110`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
              
              {/* Subtle visual hint */}
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                  <Eye size={20} />
                </div>
                <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.3em]">اضغط للتفاصيل</span>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation Arrows - Gold Theme */}
      <button className="swiper-button-prev-custom absolute left-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-black/20 hover:bg-[#D4AF37] text-white hover:text-black rounded-2xl flex items-center justify-center transition-all backdrop-blur-md opacity-0 group-hover:opacity-100 border border-white/10 shadow-2xl">
        <ChevronLeft size={32} />
      </button>
      <button className="swiper-button-next-custom absolute right-8 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-black/20 hover:bg-[#D4AF37] text-white hover:text-black rounded-2xl flex items-center justify-center transition-all backdrop-blur-md opacity-0 group-hover:opacity-100 border border-white/10 shadow-2xl">
        <ChevronRight size={32} />
      </button>

      {/* Lightbox Overlay */}
      <AnimatePresence>
        {selectedSlide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-12"
          >
            <button 
              onClick={() => setSelectedSlide(null)}
              className="absolute top-8 right-8 w-14 h-14 bg-white/10 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all z-[110] border border-white/10"
            >
              <X size={32} />
            </button>

            <div className="relative w-full max-w-6xl h-full flex flex-col items-center justify-center gap-8">
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative w-full aspect-video md:aspect-[16/9] rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(212,175,55,0.2)] border-4 border-[#D4AF37]/30"
              >
                <img 
                  src={selectedSlide.image} 
                  alt={selectedSlide.title} 
                  className="w-full h-full object-contain bg-black"
                  referrerPolicy="no-referrer"
                />
                
                {/* Caption Overlay */}
                <motion.div 
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute bottom-0 inset-x-0 p-8 md:p-12 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-sm"
                >
                  <span className="inline-block px-4 py-1.5 bg-[#D4AF37] text-black text-[10px] font-black rounded-full mb-4 uppercase tracking-[0.2em]">
                    {selectedSlide.subtitle}
                  </span>
                  <h2 className="text-2xl md:text-4xl font-black text-white mb-4 leading-tight">
                    {selectedSlide.title}
                  </h2>
                  <p className="text-slate-300 text-sm md:text-lg font-bold leading-relaxed max-w-4xl">
                    {selectedSlide.content}
                  </p>
                </motion.div>
              </motion.div>

              {/* Lightbox Navigation */}
              <div className="flex items-center gap-8">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
                    setCurrentIndex(prevIndex);
                    setSelectedSlide(slides[prevIndex]);
                  }}
                  className="w-16 h-16 rounded-full bg-white/5 hover:bg-[#D4AF37] text-white hover:text-black flex items-center justify-center transition-all border border-white/10"
                >
                  <ChevronLeft size={36} />
                </button>
                <div className="text-white/60 font-black tracking-widest text-sm">
                  {currentIndex + 1} / {slides.length}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextIndex = (currentIndex + 1) % slides.length;
                    setCurrentIndex(nextIndex);
                    setSelectedSlide(slides[nextIndex]);
                  }}
                  className="w-16 h-16 rounded-full bg-white/5 hover:bg-[#D4AF37] text-white hover:text-black flex items-center justify-center transition-all border border-white/10"
                >
                  <ChevronRight size={36} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .swiper-pagination-bullet {
          background: white !important;
          opacity: 0.3;
          width: 8px;
          height: 8px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          margin: 0 6px !important;
        }
        .swiper-pagination-bullet-active-custom {
          background: #D4AF37 !important;
          opacity: 1 !important;
          width: 32px !important;
          border-radius: 4px !important;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
        }
        .swiper-pagination {
          bottom: 30px !important;
        }
      `}</style>
    </div>
  );
}

const ALL_ADMIN_TABS = [
  { id: 'dashboard', label: 'Data Analysis', icon: LayoutDashboard },
  { id: 'news', label: 'الأخبار والـ Slider', icon: Newspaper },
  { id: 'participants', label: 'إدارة المشتركين', icon: Users },
  { id: 'activity_teams', label: 'إدارة الفرق', icon: Users },
  { id: 'results', label: 'نتائج التصفية المحلية', icon: Award },
  { id: 'omr', label: ' Babble sheets & QR  ', icon: FileScan },
  { id: 'orders', label: 'طلبات الكتب', icon: ShoppingCart },
  { id: 'inquiries', label: 'الاستفسارات', icon: MessageSquare },
  { id: 'schedules', label: 'جدول المواعيد', icon: Calendar },
  { id: 'calculator', label: 'تسعير الكتب', icon: Calculator },
  { id: 'exams_management', label: 'وضع نماذج الامتحانات', icon: BookOpen },
  { id: 'rotating_gate', label: ' Daily QR  ', icon: QrCode },
  { id: 'users_management', label: 'المستخدمين والكنائس', icon: Users },
  { id: 'dynamic_management', label: 'إعدادات المهرجان ', icon: Settings },
  { id: 'official_templates', label: 'تصدير القوالب الرسمية', icon: FileSpreadsheet },
  { id: 'system_settings', label: 'إعدادات الموقع', icon: Settings }
];

const getValidLogoUrl = (url: string | null | undefined, fallback: string | null = null): string => {
  let finalUrl = url || fallback;
  if (!finalUrl) return logo;
  if (finalUrl.startsWith('data:image')) {
    // Clean base64 string
    finalUrl = finalUrl.replace(/[\n\r\s]/g, '');
  }
  return finalUrl;
};

const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
};

const EarlyGateGuard = ({ targetType, targetName, actionType, children, fallbackMessage, userRole }: { targetType: 'church' | 'stage', targetName: string, actionType: 'registration' | 'orders', children: React.ReactNode, fallbackMessage: string, userRole: string }) => {
  const [status, setStatus] = useState<'loading' | 'blocked' | 'open'>('loading');

  useEffect(() => {
    const checkGate = async () => {
      setStatus('loading');
      if (userRole === 'admin') { setStatus('open'); return; }
      if (!targetName) { setStatus('open'); return; }
      
      try {
        const { data: sys } = await supabase.from('system_settings').select('*').single();
        const { data: granular } = await supabase.from('granular_controls').select('*').eq('target_name', targetName).eq('target_type', targetType);
        
        let blocked = false;
        
        if (actionType === 'registration') {
           if (sys?.is_registration_locked) blocked = true;
           if (granular?.some(g => g.is_registration_disabled)) blocked = true;
        } else if (actionType === 'orders') {
           if (sys?.is_book_orders_locked) blocked = true;
           if (granular?.some(g => g.is_registration_disabled)) blocked = true;
        }
        
        setStatus(blocked ? 'blocked' : 'open');
      } catch (err) {
        setStatus('open');
      }
    };
    checkGate();
  }, [targetName, targetType, actionType, userRole]);

  if (status === 'loading') return <div className="py-20 text-center font-bold text-slate-500 animate-pulse">جاري التحقق من صلاحيات الدخول... ⏳</div>;

  if (status === 'blocked') {
     return (
       <div className="py-20 my-8 bg-rose-50 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 font-arabic shadow-inner border border-rose-100">
         <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-2 shadow-sm">
           <Lock size={32} className="text-rose-600" />
         </div>
         <h2 className="text-3xl font-black text-rose-700">التسجيل مغلق حالياً</h2>
         <p className="text-rose-600 font-bold max-w-md">{fallbackMessage}</p>
       </div>
     );
  }

  return <>{children}</>;
};

function AppComponent() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dbChurches, setDbChurches] = useState<string[]>([]);

  const getInitialProfile = () => {
    try {
      const sessionStr = localStorage.getItem('church_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session && session.isAuthenticated) {
          return {
            uid: session.church || 'church-session',
            role: session.role || 'church',
            churchName: session.church,
            email: `${session.church}@mafk.com`
          };
        }
      }
      const stored = localStorage.getItem('userProfileCache');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  };
  const initialProfile = getInitialProfile();

  const [refreshCountdown, setRefreshCountdown] = useState<number | null>(null);
  const [targetRefreshUrl, setTargetRefreshUrl] = useState<string>('');

  useEffect(() => {
    if (refreshCountdown === null) return;
    
    if (refreshCountdown <= 0) {
      window.location.href = targetRefreshUrl || window.location.href;
      return;
    }

    const timer = setTimeout(() => {
      setRefreshCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [refreshCountdown, targetRefreshUrl]);

  useEffect(() => {
    const sessionStr = localStorage.getItem('church_session');
    if (!sessionStr) return;

    const session = JSON.parse(sessionStr);
    const currentChurchId = session.church || null;

    if (!currentChurchId) return;

    const churchSubscription = supabase
      .channel('church-lock-channel')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Church_access_codes'
        },
        (payload: any) => {
          const updatedChurch = payload.new;
          
          if (updatedChurch.id === Number(currentChurchId) && updatedChurch.is_active === false) {
            localStorage.clear();
            sessionStorage.clear();
            
            alert("تنبيه أمني: تم غلق صلاحية الوصول لهذه الكنيسة من قِبل الإدارة.");
            window.location.href = '/login'; 
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(churchSubscription);
    };
  }, []);

  // Global Unconditional Broadcast Listener for Force Hard Refresh / Cache Busting
  useEffect(() => {
    const handleHardRefresh = (payload: any) => {
      sessionStorage.clear();
      const currentUrl = window.location.origin + window.location.pathname;
      const timestamp = (payload && payload.timestamp) || Date.now();
      const cacheBusterUrl = `${currentUrl}?bust=${timestamp}${window.location.hash}`;
      
      setTargetRefreshUrl(cacheBusterUrl);
      setRefreshCountdown(5);
    };

    const globalLockChannel = supabase
      .channel('church-lock-channel')
      .on(
        'broadcast',
        { event: 'FORCE_HARD_REFRESH' },
        (envelope: any) => {
          handleHardRefresh(envelope.payload);
        }
      )
      .subscribe();

    const globalUpdatesChannel = supabase
      .channel('global-updates')
      .on(
        'broadcast',
        { event: 'FORCE_HARD_REFRESH' },
        (envelope: any) => {
          handleHardRefresh(envelope.payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(globalLockChannel);
      supabase.removeChannel(globalUpdatesChannel);
    };
  }, []);
  
  const [userProfile, setUserProfile] = useState<any>(initialProfile);
  const [dynamicLevels, setDynamicLevels] = useState<any[]>([]);
  const [activityStages, setActivityStages] = useState<any[]>([]);
  const [allActivityStages, setAllActivityStages] = useState<any[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>(['ألحان', 'كورال', 'ترنيم فردي', 'عزف', 'ثقافية', 'أدبية', 'فنون تشكيلية', 'كمبيوتر']);
  const [hymnStages, setHymnStages] = useState<any[]>([]);

  // Customization State
  const [isCustomizeTabsModalOpen, setIsCustomizeTabsModalOpen] = useState(false);
  const [tempTabsConfig, setTempTabsConfig] = useState<{order: string[], hidden: string[]}>({order: [], hidden: []});

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [churchName, setChurchName] = useState(initialProfile?.churchName || '');
  const [location, setLocation] = useState(initialProfile?.country || '');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined') {
      if (
        window.location.pathname === '/exam-login' || 
        window.location.search.includes('gateway_token=') ||
        window.location.hash.includes('gateway_token=') ||
        window.location.hash.includes('/exam-login')
      ) {
        return 'exam-login';
      }
      if (
        window.location.pathname === '/admin/display-gate' ||
        window.location.hash.includes('/admin/display-gate')
      ) {
        return 'admin-display-gate';
      }
    }
    return 'home';
  });
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!initialProfile);
  const [userRole, setUserRole] = useState<'admin' | 'church' | 'guest' | 'super_admin'>(initialProfile?.role || 'guest');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  
  // Standalone useEffect for Silent Guard (Checking QR rollover, emergency lock, and seed modifier)
  useEffect(() => {
    const checkTokenAndLock = async () => {
      try {
        // 1. Fetch global lock state and seed modifier from database row with id: 1
        const { data: sysData } = await supabase
          .from('system_settings')
          .select('is_exam_locked, content')
          .eq('id', 1)
          .maybeSingle();

        const isLocked = sysData ? !!sysData.is_exam_locked : false;
        
        // Update globalSettings state optimistically for UI sync
        setGlobalSettings(prev => ({ ...prev, is_exam_locked: isLocked }));
        localStorage.setItem('portal_locked_by_admin', isLocked ? 'true' : 'false');

        if (sysData) {
          const seedVal = sysData.content || '';
          const currentSeed = localStorage.getItem('manual_seed_modifier') || '';
          if (seedVal !== currentSeed) {
            console.log("Silent Guard: Seed modifier updated, synchronizing.");
            localStorage.setItem('manual_seed_modifier', seedVal);
          }
        }

        const cachedToken = localStorage.getItem('gate_access_granted_hourly');
        const isTokenInvalid = cachedToken ? !validateHourlyExamToken(cachedToken) : false;

        // If either the portal is locked or the token is expired/invalid
        if (isLocked || isTokenInvalid) {
          console.log("Silent Guard: Kick-out triggered. Lock status:", isLocked, "Token invalid:", isTokenInvalid);
          
          // Clear only student/exam specific tokens and session from storage (Isolated Cache Clearing)
          localStorage.removeItem('gate_access_granted_hourly');
          localStorage.removeItem('gate_access_granted');
          localStorage.removeItem('gateway_exam_token');
          localStorage.removeItem('active_student_session');
          localStorage.removeItem('active_student_id');
          
          // Only redirect if the user is currently accessing the student exam views (Targeted View Redirection)
          const isCurrentlyInStudentPortal = 
            showExamGateway || 
            isPortalOpen || 
            activeSection === 'exam-login' || 
            activeSection === 'student-exam';

          if (isCurrentlyInStudentPortal) {
            setShowExamGateway(false);
            setIsPortalOpen(true);
            setActiveSection('exam-login');
          }
        }
      } catch (err) {
        console.error("Error in Silent Guard:", err);
      }
    };

    // Run immediately on mount
    checkTokenAndLock();
  }, []);

  useEffect(() => {
    console.log("Current User Role:", userRole);
  }, [userRole]);

  useEffect(() => {
    const loadDynamicActivities = async () => {
      try {
        const list = await getCustomActivities();
        // Use only active activities
        const activeNames = list.filter(a => a.is_active).map(a => a.name);
        if (activeNames.length > 0) {
          setActivities(activeNames);
        }
      } catch (err) {
        console.error("Failed to load custom activities:", err);
      }
    };

    loadDynamicActivities();

    window.addEventListener('custom-activities-updated', loadDynamicActivities);
    return () => {
      window.removeEventListener('custom-activities-updated', loadDynamicActivities);
    };
  }, []);

  const [notification, setNotification] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);
  const [appLogo, setAppLogo] = useState<string | null>(() => localStorage.getItem('appLogoCache'));
  const [globalReadAccess, setGlobalReadAccess] = useState<boolean>(true);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [isUpdatingYear, setIsUpdatingYear] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);
  const previousSubscribersRef = useRef<Record<string, number>>({});
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfExportProgress, setPdfExportProgress] = useState<string>('');
  const [validationSettings, setValidationSettings] = useState<any>({
    templates: [],
    ageMappings: [],
    rules: { nameLength: true, genderMatch: false, mandatoryRows: true }
  });

  useEffect(() => {
    const loadLogoAsBase64 = async () => {
      const targetUrl = getValidLogoUrl(userProfile?.logoUrl, appLogo);
      if (!targetUrl) return;
      if (targetUrl.startsWith('data:image')) {
        setLogoBase64(targetUrl);
        return;
      }
      try {
        const response = await fetch(targetUrl, { mode: 'cors' });
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setLogoBase64(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.warn("CORS fetch failed for logo, trying fallback to loaded image canvas", err);
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              setLogoBase64(canvas.toDataURL('image/jpeg'));
            }
          };
          img.src = targetUrl;
        } catch (subErr) {
          console.error("Subsequent canvas draw failed", subErr);
        }
      }
    };
    loadLogoAsBase64();
  }, [userProfile?.logoUrl, appLogo]);

  useEffect(() => {
    // Fetch app_config and festival_settings from Supabase
    const fetchAppConfig = async () => {
      try {
        let logoUrl: string | null = null;
        try {
          const { data: logoSetting, error: logoError } = await supabase
            .from('festival_settings')
            .select('value')
            .eq('key', 'annual_logo')
            .maybeSingle();
          if (logoSetting && logoSetting.value) {
            logoUrl = logoSetting.value;
          }
        } catch (err) {
          console.error("Error fetching annual logo from festival_settings:", err);
        }

        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .eq('id', 'app_config')
          .maybeSingle();

        if (data) {
          setActiveYear(data.activeYear || CURRENT_YEAR);
          setGlobalReadAccess(data.global_read_access !== false);
          
          if (!logoUrl && data.appLogo) {
            logoUrl = data.appLogo;
          }
        }

        if (logoUrl) {
          localStorage.setItem('appLogoCache', logoUrl);
          setAppLogo(logoUrl);
        } else {
          localStorage.removeItem('appLogoCache');
          setAppLogo(null);
        }
      } catch (err) {
        console.error("Error fetching app config from Supabase:", err);
      }
    };
    fetchAppConfig();

    // Fetch Stages and Competitions from Supabase
    const fetchStagesAndCompetitions = async () => {
      try {
        const { data: stagesData, error: stagesError } = await supabase
          .from('stage_competitions')
          .select('*');
        
        if (stagesError) throw stagesError;

        if (stagesData) {
          const allStages = stagesData.map(l => ({
            id: l.id,
            name: l.stage_name,
            comps: l.allowed_competitions || [],
            stage_type: l.stage_type || 'مهرجان'
          }));
          
          setDynamicLevels(allStages.filter(s => s.stage_type === 'مهرجان' || !s.stage_type).sort((a: any, b: any) => sortStages(a.name, b.name)));
        }
      } catch (err) {
        console.error("Error fetching stages from Supabase:", err);
      }
    };
    fetchStagesAndCompetitions();

    // Fetch Hymn Stages and Activity Stages dynamically from their respective new tables
    const fetchHymnAndActivityStages = async () => {
      try {
        const { data: actData, error: actErr } = await supabase
          .from('activity_stages')
          .select('id, activity_type, stage_name, form_type')
          .order('stage_name', { ascending: true });

        if (!actErr && actData) {
          setAllActivityStages(actData);
          const uniqueTypes = Array.from(new Set(actData.map((item: any) => item.activity_type))).filter(Boolean) as string[];
          if (!uniqueTypes.includes('ألحان')) {
            uniqueTypes.push('ألحان');
          }
          setAvailableActivities(uniqueTypes);
        } else if (actErr) {
          console.error("Error fetching activity stages:", actErr);
        }
      } catch (err) {
        console.error("Error in fetchHymnAndActivityStages:", err);
      }
    };
    fetchHymnAndActivityStages();

    const fetchChurches = async () => {
      try {
        const { data, error } = await supabase
          .from('church_access_codes')
          .select('church_name, is_active, isEnabled')
          .order('church_name', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setPublicChurches(data.map((d: any) => ({ 
            name: d.church_name, 
            email: '', 
            isEnabled: d.is_active !== false && d.isEnabled !== false,
            logoUrl: ''
          })).filter(c => c.isEnabled));
        } else {
          // Fallback to checking the other table if any
          const { data: fallbackData } = await supabase.from('churches').select('*');
          if (fallbackData && fallbackData.length > 0) {
            setPublicChurches(fallbackData.map(d => ({ 
              name: d.name, 
              email: '', 
              isEnabled: d.isEnabled !== false,
              logoUrl: d.logoUrl || ''
            })).filter(c => c.isEnabled));
          } else {
            setPublicChurches([]);
          }
        }
      } catch (err) {
        console.error("Error fetching churches in fetchChurches:", err);
      }
    };
    fetchChurches();

    const fetchSettings = async () => {
      const { data: valData } = await supabase.from('system_settings').select('*').eq('id', 'validation').maybeSingle();
      if (valData) {
        setValidationSettings({
          templates: valData.templates || [],
          ageMappings: valData.ageMappings || [],
          rules: valData.rules || { nameLength: true, genderMatch: false, mandatoryRows: true }
        });
      }

      // Load master global settings
      try {
        const { data: globalRow } = await supabase.from('system_settings').select('*').eq('id', '1').maybeSingle();
        if (globalRow) {
          setGlobalSettings({
            is_exam_locked: !!globalRow.is_exam_locked,
            is_registration_locked: !!globalRow.is_registration_locked,
            is_book_orders_locked: !!globalRow.is_book_orders_locked,
            is_site_disabled: !!globalRow.is_site_disabled,
          });
        } else {
          const defaultGlobal = {
            id: '1',
            is_exam_locked: false,
            is_registration_locked: false,
            is_book_orders_locked: false,
            is_site_disabled: false
          };
          await supabase.from('system_settings').upsert(defaultGlobal);
          setGlobalSettings({
            is_exam_locked: false,
            is_registration_locked: false,
            is_book_orders_locked: false,
            is_site_disabled: false
          });
        }
      } catch (e) {
        console.error("Failed to fetch global system settings:", e);
      }

      // Load granular exceptions controls
      try {
        const { data: granularData } = await supabase.from('granular_controls').select('*');
        if (granularData) {
          setGranularControls(granularData);
        }
      } catch (e) {
        console.error("Failed to fetch granular controls:", e);
      }

      // Check System Lock in registrations table
      const { data: lockRow } = await supabase.from('registrations').select('name').eq('name', 'SYSTEM_LOCK').maybeSingle();
      const isCurrentlyLocked = !!lockRow;

      const { data: ctrlData } = await supabase.from('system_settings').select('*').eq('id', 'system_controls').maybeSingle();
      if (ctrlData) {
        setSystemControls({
          isRegistrationOpen: !isCurrentlyLocked,
          isBookCalculatorOpen: ctrlData.isBookCalculatorOpen !== false
        });
      } else {
        setSystemControls(prev => ({
          ...prev,
          isRegistrationOpen: !isCurrentlyLocked
        }));
      }

      const { data: examData } = await supabase.from('system_settings').select('*').eq('id', 'exam_config').maybeSingle();
      if (examData) {
        setExamConfig({
          isExamLive: examData.isExamLive !== false,
          churchOverrides: examData.churchOverrides || {},
          stageOverrides: examData.stageOverrides || {},
          autoCloseTime: examData.autoCloseTime
        });
      }
    };
    fetchSettings();

    return () => {};
  }, []);

  useEffect(() => {
    if (!isLoggedIn || userRole !== 'church') return;
    // Removed Firebase news real-time listener
  }, [isLoggedIn, userRole]);
  const [loginChurch, setLoginChurch] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [loginHoneypot, setLoginHoneypot] = useState('');
  const [registerHoneypot, setRegisterHoneypot] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [adminFilterChurch, setAdminFilterChurch] = useState('الكل');
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  const [examsManagementSubTab, setExamsManagementSubTab] = useState<'electronic' | 'paper_models'>('electronic');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsFilterDate, setNewsFilterDate] = useState('');
  const [newsPage, setNewsPage] = useState(1);
  const [inquiryPage, setInquiryPage] = useState(1);
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [printingPage, setPrintingPage] = useState(1);
  const [printingViewPart, setPrintingViewPart] = useState<1 | 2>(1);
  const [resultsFilterStage, setResultsFilterStage] = useState('الكل');
  const [resultsFilterGrade, setResultsFilterGrade] = useState('الكل');
  const [isScanning, setIsScanning] = useState(false);

  // 1. Verify Auth Version with Server on Initialization (Strict Session Invalidation Check)
  useEffect(() => {
    const checkAuthVersionAndInvalidate = async () => {
      try {
        let serverVersion: string | null = null;
        try {
          const response = await fetch('/api/auth-version');
          if (response.ok) {
            const resData = await response.json();
            if (resData && resData.auth_version) {
              serverVersion = String(resData.auth_version);
            }
          }
        } catch (fetchErr) {
          // Direct Supabase fallback if local API route is unreachable or pending
          const { data: versionRow } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 'auth_version')
            .maybeSingle();

          if (versionRow && versionRow.content) {
            try {
              const parsed = JSON.parse(versionRow.content);
              if (parsed.version) {
                serverVersion = String(parsed.version);
              }
            } catch (e) {}
          }
        }

        if (serverVersion) {
          const cachedVersion = localStorage.getItem('cached_auth_version');
          
          const hasActiveSession = !!localStorage.getItem('church_session') || 
                                   !!localStorage.getItem('userProfileCache') || 
                                   !!localStorage.getItem('gate_access_granted_hourly') || 
                                   !!localStorage.getItem('gate_access_granted');
                                   
          if (hasActiveSession) {
            if (!cachedVersion) {
              // Lock in the current server version on first run
              localStorage.setItem('cached_auth_version', serverVersion);
            } else if (cachedVersion !== serverVersion) {
              console.warn(`[Security Alert] Auth version mismatch! Client cached: ${cachedVersion}, Server current: ${serverVersion}`);
              
              // Clear everything
              localStorage.clear();
              sessionStorage.clear();
              
              // Clear cookies
              const cookies = document.cookie.split(";");
              for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              }
              
              alert("تنبيه أمني: تم تحديث رموز أو صلاحيات الدخول للنظام. يرجى إعادة تسجيل الدخول لتنشيط جلستك آمنًا.");
              window.location.reload();
            }
          } else {
            // Keep the cached version in sync anyway
            localStorage.setItem('cached_auth_version', serverVersion);
          }
        }
      } catch (err) {
        console.warn("Auth version check handled:", err);
      }
    };
    
    checkAuthVersionAndInvalidate();
  }, []);

  // Global Realtime Force Refresh & DB Persistence Listener for All Devices
  useEffect(() => {
    const cleanup = setupForceRefreshListener();
    return () => {
      cleanup();
    };
  }, []);

  // 2. Automated Service Worker Update-Check on Route/Section Change
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update().then(() => {
            if (registration.waiting) {
              // Force hard refresh if a waiting worker is detected
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }).catch(err => console.warn("SW update call failed:", err));
        }
      });
    }
  }, [activeSection, adminActiveTab]);

  const handleScanSuccess = async (decodedText: string) => {
    setIsScanning(false);
    // 1. Fetch student data by ID
    // 2. Validate submitted status
    // 3. Save log to Firestore
    // 4. Redirect to pre-filled Google Form
    console.log("Scanned:", decodedText);
    alert("Scanned: " + decodedText);
  };
  const [participantSearch, setParticipantSearch] = useState('');
  const [partChurchFilter, setPartChurchFilter] = useState('الكل');
  const [partStageFilter, setPartStageFilter] = useState('الكل');
  const [partCompFilter, setPartCompFilter] = useState('الكل');

  // PDF Export States
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfData, setPdfData] = useState<any[]>([]);
  const [pdfColumns, setPdfColumns] = useState<ColumnDefinition[]>([]);
  const [pdfTitle, setPdfTitle] = useState('');


  useEffect(() => {
    setCurrentPage(1);
  }, [participantSearch, partChurchFilter, partStageFilter, partCompFilter]);
  
  const [isDuplicateScanModalOpen, setIsDuplicateScanModalOpen] = useState(false);
  const [isAdminBulkRegisterOpen, setIsAdminBulkRegisterOpen] = useState(false);
  const [duplicateRecords, setDuplicateRecords] = useState<Participant[][]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);
  const [undoableDuplicates, setUndoableDuplicates] = useState<Participant[] | null>(null);
  const [isRestoringDuplicates, setIsRestoringDuplicates] = useState(false);
  const [detectedDuplicates, setDetectedDuplicates] = useState<any[] | null>(null);
  
  const [teamSearch, setTeamSearch] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [calculatorSettings, setCalculatorSettings] = useState<any[]>([]);
  const [isCalculatorLoading, setIsCalculatorLoading] = useState(true);
  const [isSubmittingCalculator, setIsSubmittingCalculator] = useState(false);
  const [newCalculatorSetting, setNewCalculatorSetting] = useState({ stage: '', material: '', price: 0 });
  
  const calculatorFilteredStages = useMemo(() => {
    const material = newCalculatorSetting.material;
    
    // Explicitly requested stages for the Book Calculator
    const additionalStages = [
      "أنشطة الطفولة",
      "أنشطة إعدادي وثانوي",
      "أنشطة من جامعة:خدام"
    ];
    
    let baseList: string[] = [];
    if (!material) {
      baseList = dynamicLevels.map(l => l.name);
    } else {
      const matched = dynamicLevels.filter(level => {
        const list = level.comps || [];
        return list.some((c: string) => {
          const norm = c.toLowerCase();
          const actNorm = material.toLowerCase();
          if (norm.includes(actNorm)) return true;
          if (actNorm === 'قبطي' && norm.includes('قبطي')) return true;
          if (actNorm === 'دراسي' && norm.includes('دراسي')) return true;
          if (actNorm === 'محفوظات' && norm.includes('محفوظات')) return true;
          if (actNorm === 'تطبيقات' && norm.includes('تطبيقات')) return true;
          if (actNorm === 'أنشطة' && (norm.includes('أنشطة') || norm.includes('نشاط') || norm.includes('كشافة') || norm.includes('رياضية') || norm.includes('مسرح' ) || norm.includes('فنون') || norm.includes('إبتكارات'))) return true;
          return false;
        });
      }).map(level => level.name);
      
      baseList = matched.length > 0 ? matched : dynamicLevels.map(l => l.name);
    }
    
    // Combine base dynamic list with the new hardcoded options, then remove duplicates and sort
    return Array.from(new Set([...baseList, ...additionalStages])).sort(sortStages);
  }, [newCalculatorSetting.material, dynamicLevels]);

  const handleCalculatorMaterialChange = async (material: string) => {
    setNewCalculatorSetting(prev => ({ ...prev, material, stage: '' }));
    if (!material) return;
    try {
      const { data, error } = await supabase
        .from('stage_competitions')
        .select('stage_name, allowed_competitions');
      if (!error && data) {
        console.log("Dynamically fetched/verified stages for material:", material, data.length);
      }
    } catch (e) {
      console.error("Error fetching calculator stages on material change:", e);
    }
  };
  const [showDeleteCalculatorModal, setShowDeleteCalculatorModal] = useState(false);
  const [calculatorSettingToDelete, setCalculatorSettingToDelete] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteScheduleModal, setShowDeleteScheduleModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [lastResultDoc, setLastResultDoc] = useState<any>(null);
  const [resultPageCount, setResultPageCount] = useState(1);
  const [isResultsEnd, setIsResultsEnd] = useState(false);
  const [isResultsLoading, setIsResultsLoading] = useState(false);


  const [activityTeams, setActivityTeams] = useState<ActivityTeam[]>([]);
  const [lastTeamDoc, setLastTeamDoc] = useState<any>(null);
  const [teamPageCount, setTeamPageCount] = useState(1);
  const [isTeamsEnd, setIsTeamsEnd] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);

  useEffect(() => {
    if (activityTeams && activityTeams.length > 0) {
      try {
        localStorage.setItem('fallback_activity_teams', JSON.stringify(activityTeams));
      } catch (err) {
        console.error("Error writing fallback activity teams:", err);
      }
    }
  }, [activityTeams]);

  const [news, setNews] = useState<News[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [lastOrderDoc, setLastOrderDoc] = useState<any>(null);
  const [orderPageCount, setOrderPageCount] = useState(1);
  const [churchOrderPage, setChurchOrderPage] = useState(1);
  const [churchInquiryPage, setChurchInquiryPage] = useState(1);
  const [isOrdersEnd, setIsOrdersEnd] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allChurchParticipants, setAllChurchParticipants] = useState<Participant[]>([]);
  const [supabaseParticipants, setSupabaseParticipants] = useState<Participant[]>([]);
  const [totalParticipantsCount, setTotalParticipantsCount] = useState<number>(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [totalTeamsCount, setTotalTeamsCount] = useState<number>(0);
  const [totalResultsCount, setTotalResultsCount] = useState<number>(0);
  const [totalOnlineCount, setTotalOnlineCount] = useState<number>(0);
  const [trendViewMode, setTrendViewMode] = useState<'both' | 'cumulative' | 'daily'>('both');
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const [debouncedParticipantSearch, setDebouncedParticipantSearch] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedParticipantSearch(participantSearch);
    }, 500);
    return () => clearTimeout(handler);
  }, [participantSearch]);

  useEffect(() => {
    if (isLoggedIn) {
       fetchParticipantsPage(true, true, debouncedParticipantSearch);
    }
  }, [debouncedParticipantSearch, isLoggedIn]);

  const fetchRecentNotifications = async () => {
    setIsLoadingNotifications(true);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let tempNotifs: LiveNotification[] = [];

    // 1. Fetch registrations
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('id, student_id, churchName, timestamp')
        .neq('name', 'SYSTEM_LOCK')
        .gt('timestamp', oneDayAgo)
        .order('timestamp', { ascending: false })
        .limit(30);

      if (!error && data) {
        data.forEach((item: any) => {
          tempNotifs.push({
            id: `reg-${item.id || item.student_id || Math.random()}`,
            sourceTable: 'registrations',
            churchName: item.churchName || 'كنيسة غير معروفة',
            message: `كنيسة ${item.churchName || 'كنيسة غير معروفة'} تقوم بالتسجيل في الأنشطة`,
            timestamp: new Date(item.timestamp),
            read: true
          });
        });
      }
    } catch (err) {
      console.warn('Error fetching recent registrations for notifications:', err);
    }

    // 2. Fetch book orders
    try {
      const { data, error } = await supabase
        .from('book_orders')
        .select('id, church_name, created_at')
        .gt('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        data.forEach((item: any) => {
          tempNotifs.push({
            id: `book-${item.id}`,
            sourceTable: 'book_orders',
            churchName: item.church_name || 'كنيسة غير معروفة',
            message: `كنيسة ${item.church_name || 'كنيسة غير معروفة'} طلبت كتب للمهرجان`,
            timestamp: new Date(item.created_at || Date.now()),
            read: true
          });
        });
      }
    } catch (err) {
      console.warn('Error fetching recent book orders for notifications:', err);
    }

    // 3. Fetch academic registrations
    try {
      const { data, error } = await supabase
        .from('academic_registrations')
        .select('*')
        .limit(30);

      if (!error && data) {
        data.forEach((item: any) => {
          const itemTime = item.created_at || item.timestamp;
          if (itemTime && new Date(itemTime).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
            const church = item.church_name || item.churchName || 'كنيسة غير معروفة';
            tempNotifs.push({
              id: `acad-${item.id}`,
              sourceTable: 'academic_registrations',
              churchName: church,
              message: `كنيسة ${church} تقوم بالتسجيل في المسابقة الدراسية`,
              timestamp: new Date(itemTime),
              read: true
            });
          }
        });
      }
    } catch (err) {
      console.warn('Error fetching academic registrations for notifications:', err);
    }

    // Mix in local storage unread notifications
    const stored = localStorage.getItem('admin_notifications');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as any[];
        parsed.forEach((item: any) => {
          const parsedTime = new Date(item.timestamp);
          if (!item.read && (Date.now() - parsedTime.getTime() < 24 * 60 * 60 * 1000)) {
            if (!tempNotifs.some(n => n.id === item.id)) {
              tempNotifs.push({
                ...item,
                timestamp: parsedTime
              });
            }
          }
        });
      } catch (_) {}
    }

    // Sort descending
    tempNotifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Filter to only those younger than 24 hours
    tempNotifs = tempNotifs.filter(n => (Date.now() - n.timestamp.getTime()) < 24 * 60 * 60 * 1000);

    setNotifications(tempNotifs);
    setIsLoadingNotifications(false);
  };

  useEffect(() => {
    if (activeSection !== 'admin_dashboard' || !isLoggedIn || userRole !== 'admin') return;

    fetchRecentNotifications();

    const notificationsChannel = supabase
      .channel('realtime-dashboard-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'registrations' },
        (payload) => {
          console.log('Realtime registration INSERT:', payload);
          const record = payload.new;
          if (record && record.name !== 'SYSTEM_LOCK') {
            const church = record.churchName || record.church_name || 'كنيسة غير معروفة';
            const newNotif: LiveNotification = {
              id: `reg-live-${record.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              sourceTable: 'registrations',
              churchName: church,
              message: `كنيسة ${church} تقوم بالتسجيل في الأنشطة`,
              timestamp: new Date(),
              read: false
            };
            setNotifications(prev => {
              const updated = [newNotif, ...prev.filter(n => n.id !== newNotif.id && (Date.now() - n.timestamp.getTime() < 24 * 60 * 60 * 1000))];
              localStorage.setItem('admin_notifications', JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'academic_registrations' },
        (payload) => {
          console.log('Realtime academic_registrations INSERT:', payload);
          const record = payload.new;
          if (record) {
            const church = record.church_name || record.churchName || 'كنيسة غير معروفة';
            const newNotif: LiveNotification = {
              id: `acad-live-${record.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              sourceTable: 'academic_registrations',
              churchName: church,
              message: `كنيسة ${church} تقوم بالتسجيل في المسابقة الدراسية`,
              timestamp: new Date(),
              read: false
            };
            setNotifications(prev => {
              const updated = [newNotif, ...prev.filter(n => n.id !== newNotif.id && (Date.now() - n.timestamp.getTime() < 24 * 60 * 60 * 1000))];
              localStorage.setItem('admin_notifications', JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'book_orders' },
        (payload) => {
          console.log('Realtime book_orders INSERT:', payload);
          const record = payload.new;
          if (record) {
            const church = record.church_name || record.churchName || 'كنيسة غير معروفة';
            const newNotif: LiveNotification = {
              id: `book-live-${record.id || Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              sourceTable: 'book_orders',
              churchName: church,
              message: `كنيسة ${church} طلبت كتب للمهرجان`,
              timestamp: new Date(),
              read: false
            };
            setNotifications(prev => {
              const updated = [newNotif, ...prev.filter(n => n.id !== newNotif.id && (Date.now() - n.timestamp.getTime() < 24 * 60 * 60 * 1000))];
              localStorage.setItem('admin_notifications', JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Supabase Realtime notifications status:', status);
      });

    const cleanupInterval = setInterval(() => {
      setNotifications(prev => {
        const filtered = prev.filter(n => (Date.now() - n.timestamp.getTime()) < 24 * 60 * 60 * 1000);
        localStorage.setItem('admin_notifications', JSON.stringify(filtered));
        return filtered;
      });
    }, 60000);

    return () => {
      supabase.removeChannel(notificationsChannel);
      clearInterval(cleanupInterval);
    };
  }, [activeSection, isLoggedIn, userRole]);

  const [lastParticipantDoc, setLastParticipantDoc] = useState<any>(null);
  const [isParticipantsLoading, setIsParticipantsLoading] = useState(false);
  const [isParticipantsEnd, setIsParticipantsEnd] = useState(false);
  const [participantPageCount, setParticipantPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [examLinks, setExamLinks] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [publicChurches, setPublicChurches] = useState<{name: string, email: string, logoUrl?: string}[]>([]);
  const [churchOptions, setChurchOptions] = useState<string[]>([]);

  useEffect(() => {
    const fetchChurchOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('church_access_codes')
          .select('church_name')
          .order('church_name', { ascending: true });
        
        if (!error && data) {
          const uniqueNames = Array.from(
            new Set(data.map((d: any) => d.church_name).filter(Boolean))
          ) as string[];
          setChurchOptions(uniqueNames);
        }
      } catch (err) {
        console.error("Error fetching church options:", err);
      }
    };
    fetchChurchOptions();
  }, []);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<{src: string}[]>([]);
  const [examConfig, setExamConfig] = useState<{
    isExamLive: boolean;
    autoCloseTime?: string;
    churchOverrides: Record<string, boolean>;
    stageOverrides: Record<string, boolean>;
  }>({
    isExamLive: true,
    churchOverrides: {},
    stageOverrides: {}
  });

  const [globalSettings, setGlobalSettings] = useState<{
    is_exam_locked: boolean;
    is_registration_locked: boolean;
    is_book_orders_locked: boolean;
    is_site_disabled: boolean;
  }>({
    is_exam_locked: false,
    is_registration_locked: false,
    is_book_orders_locked: false,
    is_site_disabled: false
  });

  const [granularControls, setGranularControls] = useState<any[]>([]);
  const [granularTargetType, setGranularTargetType] = useState<'church' | 'stage'>('church');
  const [granularTargetName, setGranularTargetName] = useState<string>('');
  const [granularIsExamDisabled, setGranularIsExamDisabled] = useState<boolean>(false);
  const [granularIsRegistrationDisabled, setGranularIsRegistrationDisabled] = useState<boolean>(false);
  const [granularExamStartAt, setGranularExamStartAt] = useState<string>('');
  const [granularExamEndAt, setGranularExamEndAt] = useState<string>('');
  const [granularRegistrationStartAt, setGranularRegistrationStartAt] = useState<string>('');
  const [granularRegistrationEndAt, setGranularRegistrationEndAt] = useState<string>('');

  const [systemControls, setSystemControls] = useState<{
    isRegistrationOpen: boolean;
    isBookCalculatorOpen: boolean;
  }>({
    isRegistrationOpen: true,
    isBookCalculatorOpen: true
  });

  const FORCE_OPEN_REGISTRATION = false; // Emergency Override disabled to allow dynamic toggle

  const isRegistrationDisabledForCurrent = (tChurch: string, tStage: string) => {
    if (userRole === 'admin') return false; // Admin bypasses global & granular blocks
    if (globalSettings.is_registration_locked) return true;
    if (!systemControls.isRegistrationOpen) return true;
    const churchException = (granularControls || []).find(c => c.target_type === 'church' && c.target_name === tChurch);
    if (churchException?.is_registration_disabled) return true;
    if (tStage) {
      const stageException = (granularControls || []).find(c => c.target_type === 'stage' && c.target_name === tStage);
      if (stageException?.is_registration_disabled) return true;
    }
    return false;
  };

  const isExamDisabledForCurrent = (tChurch: string, tStage: string) => {
    if (userRole === 'admin') return false; // Admin bypasses global & granular blocks
    if (globalSettings.is_exam_locked) return true;
    const churchException = (granularControls || []).find(c => c.target_type === 'church' && c.target_name === tChurch);
    if (churchException?.is_exam_disabled) return true;
    if (tStage) {
      const stageException = (granularControls || []).find(c => c.target_type === 'stage' && c.target_name === tStage);
      if (stageException?.is_exam_disabled) return true;
    }
    return false;
  };


  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    phone: '',
    facebook: '',
    telegram: '',
    copyright: 'جميع الحقوق محفوظة © مهرجان الكرازة المرقسية'
  });
  const [aboutContent, setAboutContent] = useState<AboutContent>({
    vision: '',
    mission: '',
    aboutText: ''
  });
  const [editingCalculatorSetting, setEditingCalculatorSetting] = useState<any>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [editingResult, setEditingResult] = useState<Result | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [newResult, setNewResult] = useState({
    studentName: '',
    churchName: '',
    stage: '',
    academicScore: 0,
    memorizationScore: 0,
    q1Score: 0,
    qScore: 0,
    score: 0,
    grade: ''
  });
  const [isSubmittingParticipant, setIsSubmittingParticipant] = useState(false);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [newParticipant, setNewParticipant] = useState({ 
    name: '', 
    stage: '', 
    gender: '',
    country: '',
    competitions: ['', '', ''] 
  });

  // Background check on Firestore to warn with real-time duplicate checks in church context
  const [participantDuplicateWarning, setParticipantDuplicateWarning] = useState<string | null>(null);
  const [isCheckingParticipantDuplicate, setIsCheckingParticipantDuplicate] = useState(false);

  // Helper to normalize Arabic names for smarter matching (typos, hamzas, etc.)
  const normalizeArabic = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/[أإآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/ئ/g, 'ي')
      .replace(/ؤ/g, 'و')
      .replace(/[\u064B-\u0652]/g, '') // Remove diacritics
      .trim()
      .replace(/\s+/g, ' ');
  };

  // Helper to compute Levenshtein Distance
  const getLevenshteinDistance = (s1: string, s2: string): number => {
    const len1 = s1.length;
    const len2 = s2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[len1][len2];
  };

  // Check name similarity using Arabic normalization & Levenshtein & word overlap
  const checkNameSimilarity = (name1: string, name2: string): { similarity: number, matches: boolean } => {
    const norm1 = normalizeArabic(name1);
    const norm2 = normalizeArabic(name2);
    
    if (norm1 === norm2) {
      return { similarity: 1.0, matches: true };
    }

    const words1 = norm1.split(' ');
    const words2 = norm2.split(' ');
    
    const commonWords = words1.filter(w => words2.includes(w));
    const overlapRatio = commonWords.length / Math.min(words1.length, words2.length);

    const maxLen = Math.max(norm1.length, norm2.length);
    if (maxLen === 0) return { similarity: 1.0, matches: true };
    const distance = getLevenshteinDistance(norm1, norm2);
    const levSim = 1.0 - distance / maxLen;

    // Matches if Levenshtein similarity is >= 0.78 OR high word overlap (at least 2 words match and 66% overlap)
    const isSimilar = levSim >= 0.78 || (commonWords.length >= 2 && overlapRatio >= 0.66);

    return {
      similarity: Math.max(levSim, overlapRatio),
      matches: isSimilar
    };
  };

  // Handle onBlur of the name input field in registration form
  const handleNameBlur = async () => {
    const trimmedName = newParticipant.name ? newParticipant.name.trim() : '';
    if (!trimmedName || trimmedName.length < 3 || !churchName) {
      return;
    }

    if (editingParticipant && editingParticipant.name.trim() === trimmedName) {
      return;
    }

    setIsCheckingParticipantDuplicate(true);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('name, stage')
        .eq('churchName', churchName);

      if (error) throw error;

      if (data && data.length > 0) {
        // First look for exact duplicate
        const exactDuplicate = data.find(item => item.name.trim() === trimmedName);
        if (exactDuplicate) {
          setParticipantDuplicateWarning(
            `تنبيه: هذا الاسم مسجل بالفعل في كنيستك للمرحلة: ${exactDuplicate.stage || 'غير محددة'}.`
          );
          return;
        }

        // Look for similar duplicate
        const similarName = data.find(item => {
          const simResult = checkNameSimilarity(trimmedName, item.name);
          return simResult.matches && item.name.trim() !== trimmedName;
        });

        if (similarName) {
          setParticipantDuplicateWarning(
            `⚠️ تنبيه: الاسم المُدخل متشابه جداً مع الاسم المسجل مسبقاً "${similarName.name}" (مرحلة: ${similarName.stage || 'غير محددة'}). يرجى التأكد من الاسم ثلاثياً لتجنب التكرار.`
          );
        } else {
          setParticipantDuplicateWarning(null);
        }
      } else {
        setParticipantDuplicateWarning(null);
      }
    } catch (err) {
      console.warn("Error running similarity check onBlur:", err);
    } finally {
      setIsCheckingParticipantDuplicate(false);
    }
  };

  useEffect(() => {
    const trimmedName = newParticipant.name ? newParticipant.name.trim() : '';
    if (!trimmedName || trimmedName.length < 3 || !churchName) {
      setParticipantDuplicateWarning(null);
      setIsCheckingParticipantDuplicate(false);
      return;
    }

    // Skip warning if editing same participant with same unchanged name
    if (editingParticipant && editingParticipant.name.trim() === trimmedName) {
      setParticipantDuplicateWarning(null);
      setIsCheckingParticipantDuplicate(false);
      return;
    }

    const delayDebounceId = setTimeout(async () => {
      setIsCheckingParticipantDuplicate(true);
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('name, stage')
          .eq('churchName', churchName);

        if (error) throw error;

        if (data && data.length > 0) {
          const exactDuplicate = data.find(item => item.name.trim() === trimmedName);
          if (exactDuplicate) {
            setParticipantDuplicateWarning(
              `تنبيه: هذا الاسم مسجل بالفعل في كنيستك للمرحلة: ${exactDuplicate.stage || 'غير محددة'}.`
            );
            return;
          }

          const similarName = data.find(item => {
            const simResult = checkNameSimilarity(trimmedName, item.name);
            return simResult.matches && item.name.trim() !== trimmedName;
          });

          if (similarName) {
            setParticipantDuplicateWarning(
              `⚠️ تنبيه: الاسم المُدخل متشابه جداً مع الاسم المسجل مسبقاً "${similarName.name}" (مرحلة: ${similarName.stage || 'غير محددة'}). يرجى التأكد من الاسم ثلاثياً لتجنب التكرار.`
            );
          } else {
            setParticipantDuplicateWarning(null);
          }
        } else {
          setParticipantDuplicateWarning(null);
        }
      } catch (err) {
        console.warn("Error running participant duplicate background check:", err);
        setParticipantDuplicateWarning(null);
      } finally {
        setIsCheckingParticipantDuplicate(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceId);
  }, [newParticipant.name, churchName, editingParticipant]);
  const [batchUploadStatus, setBatchUploadStatus] = useState<string | null>(null);
  const [batchUploadErrors, setBatchUploadErrors] = useState<{row: number, error: string}[]>([]);
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);

  const [registrationStep, setRegistrationStep] = useState(1);
  const [activity_type, setActivity_type] = useState('');
  const [newTeam, setNewTeam] = useState<Partial<ActivityTeam>>({
    activityType: '',
    members: [{ name: '', gender: 'ذكر', stage: '' }],
    choirLevel: '',
    instrumentType: '',
    maleCount: 0,
    femaleCount: 0
  });

   const [activeActivityPath, setActiveActivityPath] = useState<'new' | 'existing'>('existing');
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityLinkSuccess, setActivityLinkSuccess] = useState('');

  const [individualParticipantName, setIndividualParticipantName] = useState('');
  const [matchingParticipants, setMatchingParticipants] = useState<any[]>([]);
  const [linkedParticipantMessage, setLinkedParticipantMessage] = useState('');
  const [linkedParticipantId, setLinkedParticipantId] = useState<string | null>(null);

  const handleIndividualNameChange = async (val: string) => {
    setIndividualParticipantName(val);
    setLinkedParticipantId(null);
    setLinkedParticipantMessage('');

    // Update the first member with this typed name
    const updatedMembers = [...(newTeam.members || [{ name: '', gender: 'ذكر', stage: '' }])];
    if (updatedMembers[0]) {
      updatedMembers[0].name = val;
      if (!updatedMembers[0].stage) {
        updatedMembers[0].stage = newTeam.choirLevel || '';
      }
    }
    setNewTeam(prev => ({ ...prev, members: updatedMembers }));

    if (val.trim().length >= 2) {
      // 1. Filter locally first
      const localMatches = participants.filter(p => 
        p.churchName === churchName && 
        p.name.toLowerCase().includes(val.toLowerCase())
      );

      // 2. Query 'registrations' to look up participants in database as a fail-safe
      try {
        const { data: dbMatches, error } = await supabase
          .from('registrations')
          .select('*')
          .eq('churchName', churchName)
          .ilike('name', `%${val}%`)
          .limit(10);
        
        if (!error && dbMatches) {
          const merged: any[] = [...localMatches];
          dbMatches.forEach(dbP => {
            if (!merged.some(m => m.id === dbP.student_id || m.name.trim() === dbP.name.trim())) {
              merged.push({
                id: dbP.student_id || dbP.id,
                name: dbP.name,
                churchName: dbP.churchName,
                stage: dbP.stage,
                gender: dbP.gender as 'ذكر' | 'أنثى'
              });
            }
          });
          setMatchingParticipants(merged);
        } else {
          setMatchingParticipants(localMatches);
        }
      } catch (err) {
        console.error("Error querying registrations for team registration lookup:", err);
        setMatchingParticipants(localMatches);
      }
    } else {
      setMatchingParticipants([]);
    }
  };

  const selectMatchingParticipant = (p: any) => {
    setIndividualParticipantName(p.name);
    setLinkedParticipantId(p.id);
    setLinkedParticipantMessage(`تم ربط المشترك بنجاح بكود: ${p.id}`);
    setMatchingParticipants([]);

    const updatedMembers = [...(newTeam.members || [{ name: '', gender: 'ذكر', stage: '' }])];
    updatedMembers[0] = {
      ...updatedMembers[0],
      id: p.id,
      name: p.name,
      stage: p.stage || newTeam.choirLevel || '',
      gender: p.gender || 'ذكر',
    };
    setNewTeam(prev => ({
      ...prev,
      members: updatedMembers
    }));
  };

  const debouncedActivitySearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (value: string) => {
      setActivitySearchTerm(value);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const found = participants.find(p => p.name.trim() === value.trim() && p.churchName === churchName);
        if (found) {
          const updatedMembers = [...(newTeam.members || [])];
          updatedMembers[0] = { ...updatedMembers[0], name: found.name, stage: found.stage };
          setNewTeam({ ...newTeam, members: updatedMembers });
          setActivityLinkSuccess(`تم ربط بيانات المشترك بنجاح: ${found.name}`);
          setTimeout(() => setActivityLinkSuccess(''), 3000);
        }
      }, 500);
    };
  }, [participants, churchName, newTeam]);
  const [dashboardBg, setDashboardBg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [newNews, setNewNews] = useState({ title: '', content: '', image: null as File | null });
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [newSchedule, setNewSchedule] = useState({ examName: 'دراسي ومحفوظات وقبطي', date: '', time: '', location: '' });
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [newCarousel, setNewCarousel] = useState({ title: '', image: null as File | null, order: 0 });
  const [editingCarousel, setEditingCarousel] = useState<CarouselItem | null>(null);

  // Global Filtration States
  const [globalNameFilter, setGlobalNameFilter] = useState('');
  const [globalStageFilter, setGlobalStageFilter] = useState('الكل');
  const [globalChurchFilter, setGlobalChurchFilter] = useState('الكل');
  const [globalCompetitionFilter, setGlobalCompetitionFilter] = useState('الكل');

  const filteredParticipantsList = useMemo(() => {
    return (allChurchParticipants || []).filter(p => {
      const matchChurch = (userRole === 'admin' || (userRole === 'church' && churchName)) ? (globalChurchFilter === 'الكل' || p.churchName === (userRole === 'admin' ? globalChurchFilter : churchName)) : true;
      const matchName = p.name?.toLowerCase().includes(globalNameFilter.toLowerCase());
      const matchStage = globalStageFilter === 'الكل' || p.stage === globalStageFilter;
      const matchComp = globalCompetitionFilter === 'الكل' || (p.competitions && p.competitions.some(c => c === globalCompetitionFilter));
      return (userRole === 'admin' ? true : p.churchName === churchName) && matchChurch && matchName && matchStage && matchComp;
    });
  }, [allChurchParticipants, globalNameFilter, globalStageFilter, globalChurchFilter, globalCompetitionFilter, churchName, userRole]);

  const filteredTeamsList = useMemo(() => {
    return (activityTeams || []).filter(t => {
      const matchChurch = (userRole === 'admin' || (userRole === 'church' && churchName)) ? (globalChurchFilter === 'الكل' || t.churchName === (userRole === 'admin' ? globalChurchFilter : churchName)) : true;
      const matchName = t.members?.some(m => m.name?.toLowerCase().includes(globalNameFilter.toLowerCase())) || t.activityType?.includes(globalNameFilter);
      const matchStage = globalStageFilter === 'الكل' || t.choirLevel === globalStageFilter || t.members?.some(m => m.stage === globalStageFilter);
      const matchType = globalCompetitionFilter === 'الكل' || t.activityType === globalCompetitionFilter;
      return (userRole === 'admin' ? true : t.churchName === churchName) && matchChurch && matchName && matchStage && matchType;
    });
  }, [activityTeams, globalNameFilter, globalStageFilter, globalChurchFilter, globalCompetitionFilter, churchName, userRole]);

  const filteredResultsList = useMemo(() => {
    return (results || []).filter(r => {
      const matchChurch = (userRole === 'admin' || (userRole === 'church' && churchName)) ? (globalChurchFilter === 'الكل' || r.churchName === (userRole === 'admin' ? globalChurchFilter : churchName)) : true;
      const matchName = r.studentName?.toLowerCase().includes(globalNameFilter.toLowerCase());
      const matchStage = globalStageFilter === 'الكل' || r.stage === globalStageFilter;
      const matchGrade = resultsFilterGrade === 'الكل' || r.grade === resultsFilterGrade;
      return (userRole === 'admin' ? true : r.churchName === churchName) && matchChurch && matchName && matchStage && matchGrade;
    });
  }, [results, globalNameFilter, globalStageFilter, globalChurchFilter, resultsFilterGrade, churchName, userRole]);

  const aggregatedChurchPrintingData = useMemo(() => {
    const groups: Record<string, any> = {};

    allChurchParticipants.forEach(p => {
      if (globalChurchFilter !== 'الكل' && p.churchName !== globalChurchFilter && userRole === 'admin') return;
      if (userRole === 'church' && p.churchName !== churchName) return;

      const church = p.churchName || 'غير محدد';
      const stage = p.stage || 'غير محدد';

      if (!groups[church]) {
        groups[church] = {
          church,
          totalSubscribers: 0,
          stages: {}
        };
      }

      const churchData = groups[church];

      if (!churchData.stages[stage]) {
        churchData.stages[stage] = {
           subscribers: 0,
           darasi: 0,
           mahfouthat: 0,
           coptic1: 0,
           coptic2: 0,
        };
      }

      // De-duplicate stage level subscriber counting
      const stg = churchData.stages[stage];
      if (p.competitions && p.competitions.length > 0) {
        let hasCountedSub = false;
        const normalizedComps = p.competitions.map((c: string) => normalizeArabic(c));
        
        if (normalizedComps.some((c: string) => c.includes(normalizeArabic('دراسي')))) { stg.darasi++; hasCountedSub = true; }
        if (normalizedComps.some((c: string) => c.includes(normalizeArabic('محفوظات')))) { stg.mahfouthat++; hasCountedSub = true; }
        if (normalizedComps.some((c: string) => c.includes(normalizeArabic('قبطي مستوى أول')) || c.includes(normalizeArabic('مستوى اول')))) { stg.coptic1++; hasCountedSub = true; }
        if (normalizedComps.some((c: string) => c.includes(normalizeArabic('قبطي مستوى ثاني')) || c.includes(normalizeArabic('مستوى ثاني')))) { stg.coptic2++; hasCountedSub = true; }
        
        if (hasCountedSub) {
           stg.subscribers++;
           churchData.totalSubscribers++;
        }
      } else {
        // Missing fields defaulting: If they have no specific competitions listed, count them as one generic subscriber if they are active
        stg.subscribers++;
        churchData.totalSubscribers++;
      }
    });

    return Object.values(groups).sort((a: any, b: any) => a.church.localeCompare(b.church));
  }, [allChurchParticipants, globalChurchFilter, userRole, churchName]);

  const aggregatedChurchPrintingTotals = useMemo(() => {
    const totals: any = { subscribers: 0, stages: {} };
    STAGE_ORDER.forEach(stg => {
        totals.stages[stg] = { subscribers: 0, darasi: 0, mahfouthat: 0, coptic1: 0, coptic2: 0 };
    });

    aggregatedChurchPrintingData.forEach(row => {
      totals.subscribers += row.totalSubscribers;
      STAGE_ORDER.forEach(stg => {
         if (row.stages[stg]) {
             totals.stages[stg].subscribers += row.stages[stg].subscribers;
             totals.stages[stg].darasi += row.stages[stg].darasi;
             totals.stages[stg].mahfouthat += row.stages[stg].mahfouthat;
             totals.stages[stg].coptic1 += row.stages[stg].coptic1;
             totals.stages[stg].coptic2 += row.stages[stg].coptic2;
         }
      });
    });
    return totals;
  }, [aggregatedChurchPrintingData]);

  const activeStagesCols = useMemo(() => {
    const cols: Record<string, ('darasi' | 'mahfouthat' | 'coptic1' | 'coptic2')[]> = {};
    STAGE_ORDER.forEach(stg => {
        const subCols: ('darasi' | 'mahfouthat' | 'coptic1' | 'coptic2')[] = [];
        const stgTotal = aggregatedChurchPrintingTotals.stages[stg];
        
        if (stgTotal && stgTotal.subscribers > 0) {
            if (stgTotal.darasi > 0) subCols.push('darasi');
            if (stgTotal.mahfouthat > 0) subCols.push('mahfouthat');
            if (stgTotal.coptic1 > 0) subCols.push('coptic1');
            if (stgTotal.coptic2 > 0) subCols.push('coptic2');
            
            if (subCols.length === 0) subCols.push('darasi');
        }
        
        cols[stg] = subCols;
    });
    return cols;
  }, [aggregatedChurchPrintingTotals]);

  const flatActiveColumns = useMemo(() => {
    const list: { stage: string; col: 'darasi' | 'mahfouthat' | 'coptic1' | 'coptic2' }[] = [];
    STAGE_ORDER.forEach(stg => {
      const subCols = activeStagesCols[stg] || [];
      subCols.forEach(col => {
        list.push({ stage: stg, col });
      });
    });
    return list;
  }, [activeStagesCols]);

  const part1Columns = useMemo(() => {
    return flatActiveColumns.slice(0, 20);
  }, [flatActiveColumns]);

  const part2Columns = useMemo(() => {
    return flatActiveColumns.slice(20);
  }, [flatActiveColumns]);

  const getStageHeaderGroups = (cols: { stage: string; col: string }[]) => {
    const groups: { stage: string; colSpan: number }[] = [];
    cols.forEach(c => {
      const last = groups[groups.length - 1];
      if (last && last.stage === c.stage) {
        last.colSpan++;
      } else {
        groups.push({ stage: c.stage, colSpan: 1 });
      }
    });
    return groups;
  };

  // Analytical Metrics for the Advanced Dashboard
  const analyticsData = useMemo(() => {
    // Helper function to safely parse variations of the competitions field
    const parseCompetitionsSafely = (competitions: any): string[] => {
      if (!competitions) return [];
      if (Array.isArray(competitions)) {
        return competitions.map(c => typeof c === 'string' ? c : String(c)).filter(Boolean);
      }
      if (typeof competitions === 'string') {
        const trimmed = competitions.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed.map(c => typeof c === 'string' ? c : String(c)).filter(Boolean);
            }
          } catch (e) {
            // handle error gracefully
          }
        }
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
      }
      return [];
    };

    // Filtered participants based on current selected church / scope
    const activeParticipants = allChurchParticipants.filter(p => {
      const matchChurch = (userRole === 'admin') 
        ? (globalChurchFilter === 'الكل' || p.churchName === globalChurchFilter)
        : (p.churchName === churchName);
      return matchChurch;
    });

    const totalParticipants = activeParticipants.length;

    // Filtered orders count
    const activeOrders = (orders || []).filter(o => {
      const matchChurch = (userRole === 'admin')
        ? (globalChurchFilter === 'الكل' || o.churchName === globalChurchFilter)
        : (o.churchName === churchName);
      return matchChurch;
    });
    const totalOrders = activeOrders.length;

    // Filtered teams count
    const activeTeamsCount = totalTeamsCount;

    const demographicsData = STAGE_ORDER.map(stg => ({
      name: stg,
      "المشتركين": activeParticipants.filter(p => p.stage === stg).length
    })).filter(d => d["المشتركين"] > 0);

    const booksPerStage: Record<string, number> = {};
    activeOrders.forEach(order => {
        (order.details || []).forEach((item: any) => {
            const stg = item.stage;
            if (stg) {
               booksPerStage[stg] = (booksPerStage[stg] || 0) + (item.quantity || 0);
            }
        });
    });

    const retentionData = (userRole === 'admin' ? (globalChurchFilter === 'الكل' ? publicChurches.map(c => c.name) : [globalChurchFilter]) : [churchName]).map(cName => {
        let competitionsDemand = 0;
        let orderedBooks = 0;
        
        // Sum competitions enrollments for this church
        const churchParticipants = allChurchParticipants.filter(p => p.churchName === cName);
        churchParticipants.forEach(p => {
             const parsedComps = parseCompetitionsSafely(p.competitions);
             competitionsDemand += parsedComps.length;
        });

        // Sum ordered books for this church
        (orders || []).forEach(order => {
            if (order.churchName === cName) {
                (order.details || []).forEach((item: any) => {
                    orderedBooks += (item.quantity || 0);
                });
            }
        });
        
        return {
           name: cName || 'غير محدد',
           "الاحتياج الفعلي": competitionsDemand,
           "كتب تم طلبها": orderedBooks,
        };
    }).filter(d => d["الاحتياج الفعلي"] > 0 || d["كتب تم طلبها"] > 0);

    let compsCount: any = { "مادة واحدة": 0, "مادتين": 0, "٣ مواد أو أكثر": 0 };
    const compTypesMap: Record<string, number> = {};
    let maleCount = 0;
    let femaleCount = 0;
    
    activeParticipants.forEach(p => {
       const parsedComps = parseCompetitionsSafely(p.competitions);
       const len = parsedComps.length;
       if (len === 1) compsCount["مادة واحدة"]++;
       else if (len === 2) compsCount["مادتين"]++;
       else if (len >= 3) compsCount["٣ مواد أو أكثر"]++;

       parsedComps.forEach((c: string) => {
           compTypesMap[c] = (compTypesMap[c] || 0) + 1;
       });

       // Gender tracking
       const g = String(p.gender || '').trim();
       if (g === 'ذكر' || g.toLowerCase() === 'male' || g.toLowerCase() === 'm' || g === 'بنين') {
         maleCount++;
       } else if (g === 'أنثى' || g.toLowerCase() === 'female' || g.toLowerCase() === 'f' || g === 'بنات') {
         femaleCount++;
       }
    });

    const engagementData = [
       { name: 'مادة واحدة', value: compsCount["مادة واحدة"] },
       { name: 'مادتين', value: compsCount["مادتين"] },
       { name: '٣ مواد أو أكثر', value: compsCount["٣ مواد أو أكثر"] }
     ].filter(d => d.value > 0);

    const genderData = [
       { name: 'ذكور', value: maleCount },
       { name: 'إناث', value: femaleCount }
    ].filter(d => d.value > 0);

    const competitionTypesData = Object.keys(compTypesMap).map(k => ({
       name: k,
       value: compTypesMap[k]
    })).filter(d => d.value > 0);

    // Calculate registration trends over time
    const parseLocalDate = (ts: string) => {
      try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return 'غير معروف';
        return d.toISOString().split('T')[0]; // Extract YYYY-MM-DD
      } catch (e) {
        return 'غير معروف';
      }
    };

    const formatDateArabic = (dateStr: string) => {
      if (dateStr === 'غير معروف') return 'غير معروف';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      
      const monthNamesArabic = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${monthNamesArabic[mIdx] || parts[1]}`;
    };

    const validParticipantsForTrend = activeParticipants.filter(p => p && p.name !== 'SYSTEM_LOCK' && p.timestamp);
    
    const dailyRegistrationsGroup: Record<string, number> = {};
    validParticipantsForTrend.forEach(p => {
      const dKey = parseLocalDate(p.timestamp);
      if (dKey !== 'غير معروف') {
        dailyRegistrationsGroup[dKey] = (dailyRegistrationsGroup[dKey] || 0) + 1;
      }
    });

    const sortedTrendDates = Object.keys(dailyRegistrationsGroup).sort();
    
    let cumSum = 0;
    const growthTrendData = sortedTrendDates.map(dStr => {
      const count = dailyRegistrationsGroup[dStr];
      cumSum += count;
      return {
        date: dStr,
        formattedDate: formatDateArabic(dStr),
        "التسجيلات اليومية": count,
        "إجمالي المشتركين": cumSum
      };
    });

    // --- Sub-Activities Analytics (Teams & Individuals) ---
    const activeSubActivities = (activityTeams || []).filter(t => {
      return (userRole === 'admin') 
        ? (globalChurchFilter === 'الكل' || t.churchName === globalChurchFilter)
        : (t.churchName === churchName);
    });

    const subActivityStatsMap: Record<string, { isGroup: boolean, count: number }> = {};
    const churchSubActivitiesMatrixMap: Record<string, Set<string>> = {};

    activeSubActivities.forEach(t => {
      const actType = t.activityType || t.activity_type || 'نشاط غير محدد';
      const cName = t.churchName || t.church_name || 'غير محدد';
      const isGroup = actType === 'كورال' || actType.includes('جماعي') || t.choirLevel?.includes('جماعي') || actType === 'مسرح' || actType === 'ألحان';

      if (!subActivityStatsMap[actType]) {
        subActivityStatsMap[actType] = { isGroup, count: 0 };
      }
      subActivityStatsMap[actType].count++;

      if (!churchSubActivitiesMatrixMap[cName]) {
        churchSubActivitiesMatrixMap[cName] = new Set<string>();
      }
      churchSubActivitiesMatrixMap[cName].add(actType);
    });

    const subActivityStats = Object.keys(subActivityStatsMap).map(k => ({
      name: k,
      isGroup: subActivityStatsMap[k].isGroup,
      count: subActivityStatsMap[k].count
    })).sort((a, b) => b.count - a.count);

    const churchMatrix = Object.keys(churchSubActivitiesMatrixMap).map(cName => ({
      churchName: cName,
      activities: Array.from(churchSubActivitiesMatrixMap[cName]).join('، ')
    })).sort((a, b) => a.churchName.localeCompare(b.churchName));

    return { 
      demographicsData, 
      retentionData, 
      engagementData, 
      competitionTypesData,
      totalParticipants,
      totalOrders,
      totalTeams: activeTeamsCount,
      growthTrendData,
      genderData,
      subActivityStats,
      churchMatrix
    };
  }, [allChurchParticipants, orders, activityTeams, totalTeamsCount, STAGE_ORDER, globalChurchFilter, churchName, userRole]);

  const COLORS = ['#0f172a', '#d97706', '#e11d48', '#059669', '#2563eb', '#8b5cf6'];

  const exportComprehensivePDF = async () => {
    const element = document.getElementById('comprehensive-analytics-report');
    if (!element) return;
    
    setIsExportingPDF(true);
    setPdfExportProgress('جاري تحضير هيكل البيانات والمخططات...');
    
    // Give some time for the loading overlay to render fully
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      await withStylesCleaned(async () => {
        const pages = Array.from(element.querySelectorAll('.pdf-page')) as HTMLElement[];
        if (pages.length === 0) {
          throw new Error('لم يتم العثور على صفحات التقرير (.pdf-page)');
        }
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = 210;
        const pdfHeight = 297;
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          setPdfExportProgress(`جاري معالجة وتجهيز الصفحة ${i + 1} من ${pages.length}...`);
          
          // Wait specifically to let event loop settle
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // Capture the target page in HD quality (300 DPI)
          const canvas = await html2canvas(page, {
            scale: 3.0, // Scale 3.0 ensures high-definition text and chart rendering, perfectly clear even at high zoom
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (i > 0) {
            pdf.addPage();
          }
          
          // Append current page drawing to PDF document
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          
          // Free canvas resource immediately
          canvas.width = 0;
          canvas.height = 0;
        }
        
        setPdfExportProgress('جاري الانتهاء وحفظ ملف التقرير...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const fileName = `التقرير_التحليلي_الشامل_${churchName || 'مهرجان_الكرازة'}_${new Date().toLocaleDateString('ar-EG')}.pdf`;
        pdf.save(fileName);
        setNotification('تم تصدير التقرير التحليلي الشامل بنجاح!');
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setNotification('حدث خطأ أثناء تصدير التقرير بصيغة PDF. يرجى مراجعة الإدارة.');
    } finally {
      setIsExportingPDF(false);
      setPdfExportProgress('');
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const visibleAdminTabs = useMemo(() => {
    const customConfig = userProfile?.adminTabsConfig;
    let tabs = [...ALL_ADMIN_TABS];

    if (customConfig) {
      if (customConfig.hidden && Array.isArray(customConfig.hidden)) {
        tabs = tabs.filter(t => !customConfig.hidden.includes(t.id));
      }
      if (customConfig.order && Array.isArray(customConfig.order)) {
         tabs.sort((a, b) => {
           const idxA = customConfig.order.indexOf(a.id);
           const idxB = customConfig.order.indexOf(b.id);
           if (idxA === -1 && idxB === -1) return 0;
           if (idxA === -1) return 1;
           if (idxB === -1) return -1;
           return idxA - idxB;
         });
      }
    }
    return tabs;
  }, [userProfile]);

  const openCustomizeModal = () => {
    const currentOrder = userProfile?.adminTabsConfig?.order || ALL_ADMIN_TABS.map(t => t.id);
    const currentHidden = userProfile?.adminTabsConfig?.hidden || [];
    const missingTabs = ALL_ADMIN_TABS.map(t => t.id).filter(id => !currentOrder.includes(id));
    
    setTempTabsConfig({
      order: [...currentOrder, ...missingTabs].filter(id => ALL_ADMIN_TABS.some(t => t.id === id)),
      hidden: currentHidden
    });
    setIsCustomizeTabsModalOpen(true);
  };

  const handleSaveTabsConfig = async () => {
    if (!user || userRole !== 'admin') return;
    try {
      await supabase
        .from('users')
        .update({ adminTabsConfig: tempTabsConfig })
        .eq('id', user.uid);
      setIsCustomizeTabsModalOpen(false);
      if (tempTabsConfig.hidden.includes(adminActiveTab)) {
        const firstVisible = tempTabsConfig.order.find((id: string) => !tempTabsConfig.hidden.includes(id));
        if (firstVisible) setAdminActiveTab(firstVisible);
      }
    } catch (error) {
      console.error("Error saving tabs config", error);
    }
  };

  // Supabase Auth and User Profile Logic
  useEffect(() => {
    // Fetch live church names from DB if available
    const fetchChurchesFromDB = async () => {
      try {
        const { data, error } = await supabase
          .from('church_access_codes')
          .select('church_name')
          .order('church_name', { ascending: true });
        if (data && data.length > 0) {
          setDbChurches(data.map((d: any) => d.church_name));
        }
      } catch (err) {
        console.error("Error fetching church names from DB on mount:", err);
      }
    };
    fetchChurchesFromDB();

    const checkAuth = async () => {
      const sessionStr = localStorage.getItem('church_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session && session.isAuthenticated) {
            const profile = {
              uid: session.church || 'church-session',
              role: session.role === 'admin' ? 'admin' : 'church',
              churchName: session.church,
              church_id: session.church_id || session.id,
              id: session.id || session.church_id,
              email: `${encodeURIComponent(session.church).replace(/%/g, '').toLowerCase()}_2026@mafk.com`
            };
            setUserProfile(profile);
            setUserRole(profile.role as any);
            setChurchName(profile.churchName || '');
            setIsLoggedIn(true);
            setIsAuthReady(true);
            return;
          }
        } catch (e) {}
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        // Check for local fallback if no active session
        const cached = localStorage.getItem('userProfileCache');
        if (cached) {
          try {
            const profile = JSON.parse(cached);
            setUserProfile(profile);
            setUserRole(profile.role);
            setChurchName(profile.churchName || '');
            setIsLoggedIn(true);
          } catch (e) {}
        }
        setIsAuthReady(true);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // If we are authenticated via custom local session, ignore Supabase changes
      const sessionStr = localStorage.getItem('church_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session && session.isAuthenticated) {
            return;
          }
        } catch (e) {}
      }

      if (session) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
        localStorage.removeItem('userProfileCache');
        setIsLoggedIn(false);
        setUserRole('guest');
        setChurchName('');
        setIsAuthReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 1️⃣ Route Guard on Page Load / Init to fix Authorization Bypass
  useEffect(() => {
    let activeQuery = true;
    const runRouteGuard = async () => {
      if (!isLoggedIn || !churchName || userRole === 'admin') return;

      try {
        let currentChurchId = userProfile?.church_id || userProfile?.id;
        let churchCheck: any = null;

        // Try 'church_id' query first
        if (currentChurchId) {
          try {
            const { data, error } = await supabase
              .from('church_access_codes')
              .select('is_locked, registration_status, is_active, isEnabled')
              .eq('church_id', currentChurchId)
              .maybeSingle();
            if (!error && data) churchCheck = data;
          } catch (e) {}
        }

        // Fallback to 'id' or 'church_name'
        if (!churchCheck && activeQuery) {
          try {
            let query = supabase.from('church_access_codes').select('is_locked, registration_status, is_active, isEnabled');
            if (currentChurchId) {
              query = query.eq('id', currentChurchId);
            } else if (churchName) {
              query = query.eq('church_name', churchName);
            } else {
              query = null;
            }
            if (query) {
              const { data, error } = await query.maybeSingle();
              if (!error && data) churchCheck = data;
            }
          } catch (e) {}
        }

        if (churchCheck && activeQuery) {
          const isReallyLocked = churchCheck.is_locked === true || 
                                 churchCheck.registration_status === 'closed' || 
                                 churchCheck.is_active === false || 
                                 churchCheck.isEnabled === false;

          if (isReallyLocked) {
            alert("عذراً، تم إغلاق التسجيل أو قفل الحساب الخاص بكنيستكم من قبل لجنة المهرجان بقرار مركزي سيادي!");
            // 1. Clear Supabase Auth Session
            await supabase.auth.signOut().catch(() => {});
            // 2. Clear local storages to prevent stale states
            localStorage.clear();
            sessionStorage.clear();
            // 3. Hard redirect to the absolute login/locked gate
            window.location.href = '/login';
            return;
          }
        }
      } catch (err) {
        console.error("Route guard error:", err);
      }
    };

    if (isLoggedIn && churchName && userRole !== 'admin') {
      runRouteGuard();
    }

    return () => {
      activeQuery = false;
    };
  }, [isLoggedIn, churchName, userRole, userProfile]);

  const fetchUserProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();
      
      if (data) {
        setUserProfile(data);
        setUserRole(data.role);
        setChurchName(data.churchName || '');
        setIsLoggedIn(true);
      }
    } catch (e) {
      console.error("Profile fetch failed:", e);
    } finally {
      setIsAuthReady(true);
    }
  };

  // Data Fetches formerly from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        try {
          const { data: schedulesData, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('year', activeYear);
            
          if (error) {
            console.warn("Schedules table warning:", error.message);
          } else if (schedulesData) {
            setSchedules(schedulesData);
          }
        } catch (err) {
          console.error("Non-blocking schedules fetch error caught:", err);
        }

        const { data: linksData } = await supabase
          .from('examLinks')
          .select('*')
          .eq('year', activeYear);
        if (linksData) {
          const links: Record<string, string> = {};
          linksData.forEach(d => {
            links[d.stage] = d.url;
          });
          setExamLinks(links);
        }
      } catch (err) {
        console.error("Error fetching data from Supabase:", err);
      }
    };
    fetchData();
  }, [activeYear]);

  const fetchBooksFromSupabase = async () => {
    setIsCalculatorLoading(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*');
      if (error) throw error;
      
      const mapped = (data || []).map((b: any) => ({
        id: String(b.id),
        stage: b.stage,
        competition: b.competition,
        material: b.competition || b.material,
        price: Number(b.price) || 0
      }));
      setCalculatorSettings(mapped);
    } catch (err: any) {
      console.error("Error fetching books from Supabase:", err);
      setNotification("حدث خطأ أثناء جلب قائمة الكتب.");
    } finally {
      setIsCalculatorLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn) return;
    
    // For church users, wait until churchName is loaded to avoid permission errors on filtered queries
    if (userRole === 'church' && !churchName) return;

    async function fetchStaticData() {
        try {
            // 🚨 EMERGENCY FIX: Removed await fetchAllChurchParticipants() from automatic fetch to prevent Supabase Egress Explosion.
            // It is now lazy-loaded via fetchLargeData manually.
            
            // News
            const { data: newsData } = await supabase
              .from('news')
              .select('*')
              .eq('year', activeYear)
              .order('timestamp', { ascending: false })
              .limit(10);
            if (newsData) setNews(newsData as News[]);

            // Carousel
            const { data: carouselData } = await supabase
              .from('carousel')
              .select('*')
              .eq('year', activeYear);
            if (carouselData) {
              setCarouselItems((carouselData as CarouselItem[]).sort((a, b) => (a.order || 0) - (b.order || 0)));
            }

            await fetchBooksFromSupabase();

            // Settings
            const { data: footerData } = await supabase.from('system_settings').select('*').eq('id', 'footer').maybeSingle();
            if (footerData && footerData.details) setSiteSettings(footerData.details as SiteSettings);

            const { data: aboutData } = await supabase.from('system_settings').select('*').eq('id', 'about').maybeSingle();
            if (aboutData && aboutData.details) setAboutContent(aboutData.details as AboutContent);

            const { data: examData } = await supabase.from('system_settings').select('*').eq('id', 'exam_config').maybeSingle();
            if (examData && examData.details) {
                // ... update exam config if needed ...
            }
        } catch (error) {
            console.error("Supabase load static data error:", error);
        }
    }
    fetchStaticData();
  }, [isAuthReady, isLoggedIn, userRole, churchName, activeYear]);

  const updateChurchSubscribers = async (cName: string) => {
    if (!cName) return;
    try {
      const { count, error } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('churchName', cName);
      
      if (error) throw error;

      await supabase
        .from('churches')
        .update({ subscribers: count || 0 })
        .eq('name', cName);
    } catch (err) {
      console.error('Error updating church subscribers:', err);
    }
  };

  useEffect(() => {
    if (userRole === 'admin') {
      // 1. solicitar permisos de notificación al admin (Admin Permission & Initialization)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'default') {
          window.Notification.requestPermission();
        }
      }

      const fetchAdminData = async () => {
        try {
          const { data: usersData } = await supabase.from('users').select('*');
          if (usersData) setAllUsers(usersData);
          
          const { data: churchesData } = await supabase.from('churches').select('*');
          if (churchesData) {
            churchesData.forEach(c => {
              if (c.name) previousSubscribersRef.current[c.name] = c.subscribers || 0;
            });
          }
        } catch (err) {
          console.error("Error fetching admin data from Supabase:", err);
        }
      };
      fetchAdminData();

      return () => {};
    }
  }, [userRole]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const dataURLToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleNewsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNews.title || !newNews.content || (!newNews.image && !editingNews)) {
      alert('يرجى ملء كافة الحقول واختيار صورة');
      return;
    }

    setIsLoading(true);
    try {
      let imageUrl = editingNews?.imageUrl || '';
      if (newNews.image) {
        const compressedDataUrl = await compressImage(newNews.image);
        const compressedBlob = dataURLToBlob(compressedDataUrl);
        imageUrl = await uploadToFirebase(compressedBlob, 'news');
      }

      if (editingNews) {
        await supabase
          .from('news')
          .update({
            title: newNews.title,
            content: newNews.content,
            imageUrl,
            year: activeYear
          })
          .eq('id', editingNews.id);
        setEditingNews(null);
      } else {
        await supabase
          .from('news')
          .insert([{
            title: newNews.title,
            content: newNews.content,
            imageUrl,
            timestamp: new Date().toISOString(),
            year: activeYear
          }]);
      }

      setNewNews({ title: '', content: '', image: null });
      alert(editingNews ? 'تم تحديث الخبر بنجاح!' : 'تم نشر الخبر بنجاح!');
    } catch (error) {
      console.error("Error publishing news:", error);
      alert('حدث خطأ أثناء نشر الخبر. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingSchedule) {
        await supabase
          .from('schedules')
          .update({ ...newSchedule, year: activeYear })
          .eq('id', editingSchedule.id);
        setEditingSchedule(null);
      } else {
        await supabase
          .from('schedules')
          .insert([{ ...newSchedule, year: activeYear }]);
      }
      setNewSchedule({ examName: 'دراسي ومحفوظات وقبطي', date: '', time: '', location: '' });
      alert('تم حفظ الجدول بنجاح!');
    } catch (error) {
      console.error("Error saving schedule:", error);
      alert('حدث خطأ أثناء حفظ الجدول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCarouselSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCarousel.title || (!newCarousel.image && !editingCarousel)) {
      alert('يرجى ملء كافة الحقول واختيار صورة');
      return;
    }

    setIsLoading(true);
    try {
      let url = editingCarousel?.url || '';
      if (newCarousel.image) {
        const compressedDataUrl = await compressImage(newCarousel.image);
        const compressedBlob = dataURLToBlob(compressedDataUrl);
        url = await uploadToFirebase(compressedBlob, 'slider');
      }

      if (editingCarousel) {
        await supabase
          .from('carousel')
          .update({
            title: newCarousel.title,
            url,
            order: newCarousel.order,
            year: activeYear
          })
          .eq('id', editingCarousel.id);
        setEditingCarousel(null);
      } else {
        await supabase
          .from('carousel')
          .insert([{
            title: newCarousel.title,
            url,
            order: newCarousel.order,
            year: activeYear
          }]);
      }

      setNewCarousel({ title: '', image: null, order: 0 });
      alert('تم حفظ صورة السلايدر بنجاح!');
    } catch (error) {
      console.error("Error saving carousel item:", error);
      alert('حدث خطأ أثناء حفظ صورة السلايدر');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await supabase
        .from('system_settings')
        .upsert({ id: 'footer', ...siteSettings });
      alert('تم حفظ إعدادات الموقع بنجاح!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSystemControls = async (newControls: any) => {
    setIsLoading(true);
    try {
      // If isRegistrationOpen changed, handle SYSTEM_LOCK in registrations table
      if (newControls.isRegistrationOpen !== systemControls.isRegistrationOpen) {
        if (!newControls.isRegistrationOpen) {
          // Lock the system
          await supabase.from('registrations').insert([{ name: 'SYSTEM_LOCK', churchName: 'SYSTEM' }]);
        } else {
          // Unlock the system
          await supabase.from('registrations').delete().eq('name', 'SYSTEM_LOCK');
        }
      }

      await supabase
        .from('system_settings')
        .upsert({
          id: 'system_controls',
          isBookCalculatorOpen: newControls.isBookCalculatorOpen,
          updatedAt: new Date().toISOString()
        });
      
      setSystemControls(newControls);
      setNotification('تم تحديث إعدادات النظام بنجاح');
    } catch (e: any) {
      console.error(e);
      setNotification('خطأ في التحديث عبر Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGlobalToggle = async (field: string, newValue: boolean) => {
    // Optimistic UI state update
    setGlobalSettings(prev => ({ ...prev, [field]: newValue }));
    
    // As required by the spec: trigger an .update() on the master row with id 1
    const { error } = await supabase
      .from('system_settings')
      .update({ [field]: newValue })
      .eq('id', '1'); // Updates the single master configuration row
      
    if (error) {
      // rollback state
      setGlobalSettings(prev => ({ ...prev, [field]: !newValue }));
      alert(`Failed to update system state: ${error.message}`);
    } else {
      setNotification('تم تحديث إعدادات النظام بنجاح');
    }
  };

  const handleSaveGranularControl = async (
    targetType: 'church' | 'stage', 
    targetName: string, 
    config: { 
      is_exam_disabled: boolean; 
      is_registration_disabled: boolean;
      exam_start_at: string | null;
      exam_end_at: string | null;
      registration_start_at: string | null;
      registration_end_at: string | null;
    }
  ) => {
    setIsLoading(true);
    try {
      const existing = granularControls.find(c => c.target_type === targetType && c.target_name === targetName);
      let res;
      if (existing) {
        res = await supabase
          .from('granular_controls')
          .update(config)
          .eq('id', existing.id);
      } else {
        res = await supabase
          .from('granular_controls')
          .insert([{
            target_type: targetType,
            target_name: targetName,
            ...config
          }]);
      }
      if (res.error) throw res.error;

      // Refresh state
      const { data } = await supabase.from('granular_controls').select('*');
      if (data) {
        setGranularControls(data);
      }
      setNotification('تم حفظ الإستثناء والمواعيد بنجاح');
    } catch (e: any) {
      console.error(e);
      alert(`فشل تحديث إستثناءات التحكم: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGranularControl = async (id: any) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('granular_controls').delete().eq('id', id);
      if (error) throw error;
      setGranularControls(prev => prev.filter(c => c.id !== id));
      setNotification('تم حذف الإستثناء بنجاح');
    } catch (e: any) {
      console.error(e);
      alert(`فشل حذف الإستثناء: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExamConfig = async (newConfig: any) => {
    setIsLoading(true);
    try {
      await supabase
        .from('system_settings')
        .upsert({
          id: 'exam_config',
          ...newConfig,
          updatedAt: new Date().toISOString()
        });
      
      setExamConfig(newConfig);
      setNotification('تم تحديث إعدادات الامتحانات بنجاح');
    } catch (e: any) {
      console.error(e);
      setNotification('خطأ في التحديث عبر Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAboutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await supabase
        .from('system_settings')
        .upsert({ id: 'about', content: aboutContent });
      alert('تم حفظ محتوى "عن المهرجان" بنجاح!');
    } catch (error) {
      console.error("Error saving about content:", error);
      alert('حدث خطأ أثناء حفظ المحتوى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCalculatorSetting = async () => {
    if (!newCalculatorSetting.stage?.trim() || !newCalculatorSetting.material?.trim()) {
      alert('يرجى إدخال المرحلة والمادة');
      return;
    }
    
    setIsSubmittingCalculator(true);
    try {
      const stage = newCalculatorSetting.stage.trim();
      const competition = newCalculatorSetting.material.trim();
      const price = Number(newCalculatorSetting.price) || 0;
      
      if (editingCalculatorSetting) {
        // Update existing book
        const { error } = await supabase
          .from('books')
          .update({ stage, competition, price })
          .eq('id', editingCalculatorSetting.id);
        if (error) throw error;
      } else {
        // Insert new book
        const { error } = await supabase
          .from('books')
          .insert([{ stage, competition, price }]);
        if (error) throw error;
      }
      
      setNewCalculatorSetting({ stage: '', material: '', price: 0 });
      setEditingCalculatorSetting(null);
      alert('تم حفظ الإعداد بنجاح');
      await fetchBooksFromSupabase();
    } catch (error) {
      console.error('Error saving book setting:', error);
      alert('خطأ في حفظ الإعداد');
    } finally {
      setIsSubmittingCalculator(false);
    }
  };

  const handleDeleteCalculatorSetting = async (id: string) => {
    setCalculatorSettingToDelete(id);
    setShowDeleteCalculatorModal(true);
  };

  const confirmDeleteCalculatorSetting = async () => {
    if (!calculatorSettingToDelete) return;
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', calculatorSettingToDelete);
      if (error) throw error;

      alert('تم حذف الإعداد بنجاح');
      setShowDeleteCalculatorModal(false);
      setCalculatorSettingToDelete(null);
      await fetchBooksFromSupabase();
    } catch (error) {
      console.error('Error deleting book setting:', error);
      alert('خطأ في حذف الإعداد');
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الخبر؟', async () => {
      try {
        await supabase.from('news').delete().eq('id', newsId);
      } catch (error) {
        console.error("Error deleting news:", error);
      }
    });
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    try {
      await supabase.from('schedules').delete().eq('id', scheduleToDelete);
      setShowDeleteScheduleModal(false);
      setScheduleToDelete(null);
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert('حدث خطأ أثناء حذف الجدول');
    }
  };

  const handleDeleteCarousel = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذه الصورة؟', async () => {
      try {
        await supabase.from('carousel').delete().eq('id', id);
      } catch (error) {
        console.error("Error deleting carousel item:", error);
      }
    });
  };

  const exportToExcel = async (data: any[], fileName: string) => {
    if (fileName === 'participants') {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      
      const churches = Array.from(new Set(data.map(p => p.churchName || 'Unknown')));
      
      for (const church of churches) {
        const safeSheetName = church.replace(/[\\\/?*\[\]]/g, '').substring(0, 31);
        const sheet = workbook.addWorksheet(safeSheetName);
        sheet.views = [{ rightToLeft: true }];
        
        sheet.columns = [
          { header: 'Student ID', key: 'id', width: 25 },
          { header: 'Triple Name', key: 'name', width: 30 },
          { header: 'Gender', key: 'gender', width: 12 },
          { header: 'Stage/Level', key: 'stage', width: 20 },
          { header: 'Church Name', key: 'churchName', width: 25 },
          { header: 'Competition Type', key: 'competitions', width: 30 },
          { header: 'Registration Date', key: 'timestamp', width: 20 },
        ];
        
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };

        const churchData = data.filter(p => (p.churchName || 'Unknown') === church);
        
        churchData.forEach(p => {
          sheet.addRow({
            id: String(p.id),
            name: p.name || '',
            gender: p.gender || '',
            stage: p.stage || '',
            churchName: p.churchName || '',
            competitions: Array.isArray(p.competitions) ? p.competitions.join(' - ') : (p.competitions || ''),
            timestamp: p.timestamp ? new Date(p.timestamp).toLocaleDateString('ar-EG') : ''
          });
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${fileName}_${new Date().getTime()}.xlsx`);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
        type: "text/csv;charset=utf-8;"
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const EXPECTED_HEADERS = [
    'توقيت التسجيل',
    'الرقم التعريفي',
    'الاسم',
    'الكنيسة/البلد',
    'النوع',
    'دراسي',
    'محفوظات',
    'قبطي مستوى 1',
    'قبطي مستوى 2'
  ];

  const handleResultsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0]; // Master sheet
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];
          const headers = XLSX.utils.sheet_to_json(ws, { header: 1 })[0] as string[];
          
          if (!headers || headers.length < EXPECTED_HEADERS.length) {
            alert('Invalid Schema: Please use the updated Master Template.');
            e.target.value = '';
            return;
          }

          for (let i = 0; i < EXPECTED_HEADERS.length; i++) {
            if (headers[i] !== EXPECTED_HEADERS[i]) {
               alert(`Invalid Schema: Expected ${EXPECTED_HEADERS[i]} at column ${i + 1}, found ${headers[i]}. Please use the updated Master Template.`);
               e.target.value = '';
               return;
            }
          }
          
          if (headers && headers.length > 0) {
            await supabase.from('system_settings').upsert({
              id: 'results_headers',
              details: { headers, updatedForYear: activeYear }
            });
          }
          
          // Filter out rows without student name
          const validData = data
            .filter((row: any) => String(row['الاسم'] || '').trim() !== '')
            .map((row: any) => {
              const studentId = String(row['الرقم التعريفي'] || '') || `excel-${Math.random().toString(36).substring(2, 11)}`;
              
              const derasy = row['دراسي'] !== undefined && row['دراسي'] !== '' ? Number(row['دراسي']) : null;
              const mahfouzat = row['محفوظات'] !== undefined && row['محفوظات'] !== '' ? Number(row['محفوظات']) : null;
              const qebtyL1 = (row['قبطي مستوى 1'] !== undefined && row['قبطي مستوى 1'] !== '') 
                ? Number(row['قبطي مستوى 1']) 
                : ((row['قبطي مستوى أول'] !== undefined && row['قبطي مستوى أول'] !== '') ? Number(row['قبطي مستوى أول']) : null);
              const qebtyL2 = (row['قبطي مستوى 2'] !== undefined && row['قبطي مستوى 2'] !== '') 
                ? Number(row['قبطي مستوى 2']) 
                : ((row['قبطي مستوى ثاني'] !== undefined && row['قبطي مستوى ثاني'] !== '') ? Number(row['قبطي مستوى ثاني']) : null);

              const stage = row['المرحلة'] || row['stage'] || '';
              const gender = row['النوع'] || row['gender'] || 'ذكر';

              return {
                student_id: studentId,
                churchName: String(row['الكنيسة/البلد'] || ''),
                stage: stage,
                gender: gender,
                derasy_score: derasy,
                mahfouzat_score: mahfouzat,
                qebty_lvl1_score: qebtyL1,
                qebty_lvl2_score: qebtyL2,
                submitted_at: row['توقيت التسجيل'] ? new Date(row['توقيت التسجيل']).toISOString() : new Date().toISOString(),
                is_published: true,
                status: 'completed',
                duration_seconds: 0,
                detailed_answers: null
              };
            });

          const { error: sbErr } = await supabase
            .from('exam_submissions')
            .upsert(validData, { onConflict: 'student_id' });
            
          if (sbErr) throw sbErr;
          alert('تم رفع النتائج بنجاح!');
        } catch (error: any) {
          console.error("Supabase results bulk upload error:", error);
          alert('حدث خطأ أثناء رفع النتائج.');
        } finally {
          e.target.value = ''; // Reset input
        }
      };
      reader.readAsBinaryString(file);
    } catch (e) {
      console.error(e);
      e.target.value = '';
    }
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBatchUploadStatus("جاري الفحص (Firewall)...");
    setBatchUploadErrors([]);
    setIsUploadingBatch(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      const templates = validationSettings.templates || [];
      const ageMappings = validationSettings.ageMappings || [];
      const rules = validationSettings.rules || { nameLength: true, genderMatch: false, mandatoryRows: true };

      // 1. Filename Enforcement
      const matchedTemplate = templates.find((t: any) => t.filename === file.name);
      if (!matchedTemplate) {
        setBatchUploadStatus("خطأ: تم الرفض! (Wrong File Name)");
        setBatchUploadErrors([{ row: 0, error: `الاسم غير مطابق للقوالب الأساسية. اسم الملف هو: ${file.name}` }]);
        setIsUploadingBatch(false);
        e.target.value = '';
        return;
      }

      // 2. Validate Headers
      const templateHeaders = matchedTemplate.headers;
      const headersMatch = templateHeaders.every((th: string) => headers.map(h=>String(h).trim()).includes(th));
      if (!headersMatch) {
         setBatchUploadStatus("خطأ: تم الرفض! (Header Mismatch)");
         setBatchUploadErrors([{ row: 0, error: `أعمدة الملف غير مطابقة للقالب الأساسي.` }]);
         setIsUploadingBatch(false);
         e.target.value = '';
         return;
      }

      const errors: {row: number, error: string}[] = [];
      const parsedParticipants: any[] = [];

      // Helper to detect generic gender Arabic (basic)
      const isLikelyMale = (namePart: string) => !['ة', 'اء'].some(suffix => namePart.endsWith(suffix));

      // Validate each row
      rawData.forEach((row: any, idx: number) => {
        const rowNum = idx + 2; // +1 for 0-index, +1 for header
        const name = String(row['الاسم'] || row['Participant Name'] || row['اسم المشترك'] || '').trim();
        const stage = String(row['المرحلة'] || row['Stage'] || '').trim();
        const birthYearRaw = row['سنة الميلاد'] || row['تاريخ الميلاد'] || row['Birth Year'];
        const birthYear = parseInt(birthYearRaw);
        
        let comps: string[] = [];
        if (row['دراسي']) comps.push('دراسي');
        if (row['محفوظات']) comps.push('محفوظات');
        if (row['قبطي ١'] || row['قبطي مستوى أول'] || row['قبطي مستوى 1']) comps.push('قبطي مستوى أول');
        if (row['قبطي ٢'] || row['قبطي مستوى ثاني'] || row['قبطي مستوى 2']) comps.push('قبطي مستوى ثاني');

        // Rule: Mandatory Rows
        if (rules.mandatoryRows) {
           if (!name || !stage || !birthYearRaw) {
             errors.push({ row: rowNum, error: 'البيانات غير مكتملة (Null Check Failed).' });
           }
        }

        // Rule: Name Length
        if (rules.nameLength && name) {
          const words = name.split(' ');
          if (words.length < 3 || words.length > 5) {
            errors.push({ row: rowNum, error: `الاسم يجب أن يكون من 3 إلى 5 كلمات (الاسم الحالي فيه ${words.length} كلمات).` });
          }
        }

        // Rule: Gender Matching (Basic fallback using first name)
        if (rules.genderMatch && name) {
           const firstName = name.split(' ')[0];
           const gender = row['الجنس'] || row['النوع'] || row['Gender'];
           if (gender === 'ذكر' && !isLikelyMale(firstName)) {
               // Soft warning, but let's make it an error per requirements
               errors.push({ row: rowNum, error: `عدم تطابق الجنس: الاسم الأول ${firstName} يبدو كأنثى ولكن تم اختيار 'ذكر'.` });
           }
        }

        // Cross-validation: Age-to-Stage
        if (birthYear && stage) {
          const mapping = ageMappings.find((m: any) => m.stage === stage);
          if (mapping) {
            if (birthYear < mapping.minYear || birthYear > mapping.maxYear) {
              errors.push({ row: rowNum, error: `سنة الميلاد (${birthYear}) غير متوافقة مع المرحلة (${stage}). النطاق المسموح: ${mapping.minYear}-${mapping.maxYear}.` });
            }
          }
        }

        // Cross-validation: Competition-to-Stage
        if (stage) {
           const levelConfig = dynamicLevels.find(l => l.name === stage);
           if (levelConfig) {
             comps.forEach(c => {
               if (!levelConfig.comps.includes(c)) {
                 errors.push({ row: rowNum, error: `المسابقة (${c}) غير متاحة للمرحلة (${stage}).` });
               }
             });
           }
        }

        if (name && stage) {
           const rowGender = row['النوع'] || row['الجنس'] || row['Gender'] || (name.startsWith('مريم') || name.endsWith('ة') ? 'أنثى' : 'ذكر');
           const customId = generateShortId();
           parsedParticipants.push({
             student_id: customId,
             name,
             stage,
             gender: rowGender,
             competitions: comps,
             churchName: churchName,
             year: activeYear,
             timestamp: new Date().toISOString()
           });
        }
      });

      if (errors.length > 0) {
        setBatchUploadStatus(`تم الرفض! الملف يحتوي على اخطاء.`);
        setBatchUploadErrors(errors);
        setIsUploadingBatch(false);
      } else {
        setBatchUploadStatus("تم اجتياز الفحص بنجاح! جاري الحفظ...");
        
        // Chunk parsedParticipants into groups of 400
        // Supabase Bulk Upload
        const { error: sbErr } = await supabase
          .from('registrations')
          .upsert(parsedParticipants.map(p => ({
            student_id: p.student_id,
            name: p.name,
            churchName: p.churchName,
            stage: p.stage,
            gender: p.gender,
            competitions: p.competitions,
            timestamp: p.timestamp || new Date().toISOString()
          })));

        if (sbErr) throw sbErr;

        // Instant state sync
        setParticipants(prev => [...prev, ...parsedParticipants]);
        setTotalParticipantsCount(prev => prev + parsedParticipants.length);

        setBatchUploadStatus("تم رفع البيانات بنجاح!");
        setTimeout(() => setBatchUploadStatus(null), 3000);
        setIsUploadingBatch(false);
        await updateChurchSubscribers(churchName);
      }

    } catch (err) {
      console.error(err);
      setBatchUploadStatus("فشل في قراءة الملف. تأكد من صحة الملف.");
      setIsUploadingBatch(false);
    }

    e.target.value = '';
  };

  const handleUpdateExamLink = async (stage: string, url: string) => {
    try {
      const { data, error: selectError } = await supabase
        .from('examLinks')
        .select('id')
        .eq('stage', stage)
        .eq('year', activeYear)
        .maybeSingle();
      
      if (selectError) throw selectError;

      if (!data) {
        await supabase
          .from('examLinks')
          .insert([{ stage, url, year: activeYear }]);
      } else {
        await supabase
          .from('examLinks')
          .update({ url })
          .eq('id', data.id);
      }
      alert('تم تحديث الرابط بنجاح');
    } catch (error) {
      console.error("Error updating exam link:", error);
      alert('حدث خطأ أثناء تحديث الرابط');
    }
  };

  const exportParticipantsPDF = async () => {
    const element = document.getElementById('participants-table-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `participants_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };
    await withStylesCleaned(async () => {
      await html2pdf().set(opt).from(element).save();
    });
  };

  const exportOrdersPDF = async () => {
    const element = document.getElementById('orders-table-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `orders_summary_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };
    await withStylesCleaned(async () => {
      await html2pdf().set(opt).from(element).save();
    });
  };

  const exportOrdersDetailedPDF = async () => {
    const element = document.getElementById('detailed-orders-report-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `detailed_orders_report_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    await withStylesCleaned(async () => {
      await html2pdf().set(opt).from(element).save();
    });
  };

  const exportInquiriesPDF = async () => {
    const element = document.getElementById('inquiries-list-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `inquiries_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    await withStylesCleaned(async () => {
      await html2pdf().set(opt).from(element).save();
    });
  };

  const exportPrintingStatementPartPDF = async (part: 1 | 2) => {
    const element = document.getElementById(`printing-statement-table-part${part}`);
    if (!element) return;
    const opt = {
      margin: [5, 5, 5, 5] as [number, number, number, number],
      filename: `بيان_طباعة_الجزء_${part === 1 ? 'الأول_أول_20' : 'الثاني_آخر_20'}_${churchName || 'مهرجان_الكرازة'}_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };
    await withStylesCleaned(async () => {
      await html2pdf().set(opt).from(element).save();
    });
  };

  const exportPrintingStatementExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const workbook = new ExcelJS.Workbook();
      
      STAGE_ORDER.forEach(stg => {
         const stgTotal = aggregatedChurchPrintingTotals.stages[stg];
         if (!stgTotal || stgTotal.subscribers === 0) return; // Skip empty stages entirely if desired, or we can keep it. The prompt says 13 sheets, so we might want to keep it. But wait, if a stage is totally empty, no need to print a blank sheet. "up to 13 stages". Let's retain all 13 as requested or if it has any data to be clean.
         
         const sheet = workbook.addWorksheet(stg.substring(0, 31)); // Excel tab name max 31 chars
         sheet.views = [{ rightToLeft: true }];
         
         sheet.columns = [
          { header: 'الكنيسة', key: 'church', width: 25 },
          { header: 'إجمالي المشتركين', key: 'subscribers', width: 20 },
          { header: 'دراسي', key: 'darasi', width: 15 },
          { header: 'محفوظات', key: 'mahfouthat', width: 15 },
          { header: 'قبطي 1', key: 'coptic1', width: 15 },
          { header: 'قبطي 2', key: 'coptic2', width: 15 },
         ];

         // Add Header Style
         sheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
         sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
         sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D3B66' } }; // Coptic Blue

         aggregatedChurchPrintingData.forEach(churchRow => {
            const stgObj = churchRow.stages[stg];
            // Only add churches that have participants in this stage OR add all? "Exactly 52 rows for 52 churches".
            sheet.addRow({
               church: churchRow.church,
               subscribers: stgObj?.subscribers || 0,
               darasi: stgObj?.darasi || 0,
               mahfouthat: stgObj?.mahfouthat || 0,
               coptic1: stgObj?.coptic1 || 0,
               coptic2: stgObj?.coptic2 || 0,
            });
         });

         // Add Totals Row
         const totalsRow = sheet.addRow({
           church: 'الإجمالي العام',
           subscribers: stgTotal.subscribers,
           darasi: stgTotal.darasi,
           mahfouthat: stgTotal.mahfouthat,
           coptic1: stgTotal.coptic1,
           coptic2: stgTotal.coptic2,
         });

         totalsRow.font = { bold: true, size: 12 };
         totalsRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100
         
         // Center all cells
         sheet.eachRow((row) => {
           row.eachCell((cell) => {
             cell.alignment = { horizontal: 'center', vertical: 'middle' };
           });
         });
      });

      if (workbook.worksheets.length === 0) {
          alert('لا توجد بيانات متاحة للتصدير');
          return;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `بيان_طباعة_${churchName || 'المهرجان'}_${new Date().toLocaleDateString()}.xlsx`;
      saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    } catch (error) {
      console.error('Error exporting statement to excel', error);
      alert('حدث خطأ أثناء تصدير الملف');
    }
  };

  const exportOrdersToExcelDetailed = (ordersList: Order[]) => {
    const flattenedData: any[] = [];
    
    // SSOT: Use calculatorSettings sorted
    const orderedSettings = [...calculatorSettings].sort((a, b) => sortStages(a.stage, b.stage) || a.material.localeCompare(b.material));

    ordersList.forEach(order => {
      orderedSettings.forEach(setting => {
        const detail = order.details.find((d: any) => d.settingId === setting.id || (d.stage === setting.stage && d.material === setting.material));
        
        if (detail && detail.quantity > 0) {
          flattenedData.push({
            "الكنيسة": order.churchName,
            "المكان": order.country,
            "التاريخ": order.timestamp,
            "المرحلة": setting.stage,
            "المادة": setting.material,
            "الكمية": detail.quantity,
            "سعر الوحدة": setting.price,
            "الإجمالي للمرحلة": detail.quantity * setting.price,
            "الإجمالي الكلي للطلب": order.grandTotal
          });
        }
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `detailed_orders_${new Date().toLocaleDateString('en-CA')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

      const handleUndoDuplicates = async () => {
    if (!undoableDuplicates || undoableDuplicates.length === 0) return;
    setIsRestoringDuplicates(true);
    try {
      // Upsert the deleted records back into registrations
      const { error: restoreError } = await supabase.from('registrations').upsert(undoableDuplicates);
      
      if (restoreError) throw restoreError;

      // Log the undo action
      await supabase.from('logs').insert({
        action: 'undo_delete_duplicates',
        count: undoableDuplicates.length,
        timestamp: new Date().toISOString(),
        details: 'تم استرداد المشتركين المكررين.'
      });

      setNotification(`تم التراجع واعاد إدراج ${undoableDuplicates.length} سجل بنجاح!`);
      setUndoableDuplicates(null);
      fetchParticipantsPage(true, true, debouncedParticipantSearch);
    } catch (err) {
      console.error(err);
      setNotification('حدث خطأ أثناء استرداد التكرارات.');
    } finally {
      setIsRestoringDuplicates(false);
    }
  };

  const handleDetectDuplicates = async () => {
    setIsScanningDuplicates(true);
    setDetectedDuplicates(null);
    try {
      let allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 4000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase.from('registrations').select('*').range(from, from + PAGE_SIZE - 1);
        if (error) {
          console.error("Error fetching students for deduplication:", error);
          setNotification('حدث خطأ أثناء فحص البيانات.');
          setIsScanningDuplicates(false);
          return;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += PAGE_SIZE;

          if (data.length < PAGE_SIZE) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const data = allData;

      if (!data || data.length === 0) {
        setDetectedDuplicates([]);
        return;
      }

      // Sort by ID or original array order to keep the first (earliest) record
      const sortedRecords = [...data].sort((a, b) => {
        const idA = String(a.id);
        const idB = String(b.id);
        return idA.localeCompare(idB, undefined, { numeric: true });
      });

      const seenNames = new Map<string, any>();
      const duplicates: any[] = [];

      for (const record of sortedRecords) {
        const rawName = record.name || '';
        const normalized = rawName.trim().replace(/\s+/g, ' ');
        if (!normalized) continue;

        if (seenNames.has(normalized)) {
          // Trailing duplicate record with ALL fields so it can be restored on undo
          duplicates.push(record);
        } else {
          seenNames.set(normalized, record);
        }
      }

      setDetectedDuplicates(duplicates);
      if (duplicates.length === 0) {
        setNotification('قاعدة البيانات نظيفة تماماً! لم يتم العثور على أي أسماء مكررة.');
      } else {
        setNotification(`تم العثور على ${duplicates.length} أسماء مكررة.`);
      }
    } catch (err) {
      console.error(err);
      setNotification('حدث خطأ أثناء فحص البيانات.');
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const handleConfirmDeleteDuplicates = async () => {
    if (!detectedDuplicates || detectedDuplicates.length === 0) return;
    
    const confirmMessage = `هل أنت متأكد من رغبتك في حذف السجلات المكررة بالتطابق التام؟ سيتم حذف ${detectedDuplicates.length} سجل مكرر بشكل نهائي.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeletingDuplicates(true);
    try {
      const idsToDelete = detectedDuplicates.map(d => d.student_id || d.id);
      
      const { error } = await supabase
        .from('registrations')
        .delete()
        .in('student_id', idsToDelete);

      if (error) {
        console.error("Error deleting duplicates:", error);
        setNotification('حدث خطأ أثناء حذف السجلات المكررة.');
        return;
      }

      // Log to logs table in Supabase
      try {
        await supabase.from('logs').insert({
          action: 'delete_duplicates_v2',
          count: detectedDuplicates.length,
          details: JSON.stringify(detectedDuplicates),
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.error("Failed to insert log:", logErr);
      }

      // Save to undo state
      setUndoableDuplicates(detectedDuplicates);
      setNotification(`تم مسح ${detectedDuplicates.length} من الأسماء المكررة بنجاح!`);
      setDetectedDuplicates(null);

      // Refresh both states so dashboard updates sync up
      fetchParticipantsPage(true, true, debouncedParticipantSearch);
      if (typeof fetchSupabaseParticipants === 'function') {
        fetchSupabaseParticipants();
      }
    } catch (err) {
      console.error(err);
      setNotification('حدث خطأ أثناء حذف السجلات المكررة.');
    } finally {
      setIsDeletingDuplicates(false);
    }
  };

  const exportAllRegistrationsToExcel = async () => {
    await generateMasterExcel(allChurchParticipants, userRole === 'admin' ? null : churchName);
  };

  const openParticipantsPdfExport = () => {
    // Determine data based on current filters
    let filteredData = allChurchParticipants;
    if (userRole !== 'admin') {
      filteredData = filteredData.filter(p => p.churchName === churchName);
    } else {
      if (partChurchFilter !== 'الكل') filteredData = filteredData.filter(p => p.churchName === partChurchFilter);
    }
    
    if (partStageFilter !== 'الكل') filteredData = filteredData.filter(p => p.stage === partStageFilter);
    if (partCompFilter !== 'الكل') filteredData = filteredData.filter(p => (p.competitions || []).includes(partCompFilter));
    if (participantSearch.trim()) {
      const qs = participantSearch.trim().toLowerCase();
      filteredData = filteredData.filter(p => p.name.toLowerCase().includes(qs) || p.serial?.includes(qs));
    }

    const columns: ColumnDefinition[] = [
      { key: 'serial', label: 'كود المشترك' },
      { key: 'name', label: 'الاسم رباعي' },
      { key: 'churchName', label: 'الكنيسة', defaultSelected: userRole === 'admin' },
      { key: 'stage', label: 'المرحلة' },
      { key: 'gender', label: 'الجنس' },
      { key: 'competitions', label: 'المسابقات' }
    ];

    const mappedData = filteredData.map(p => ({
      ...p,
      competitions: p.competitions?.join('، ') || 'لا يوجد'
    }));

    setPdfData(mappedData);
    setPdfColumns(columns);
    setPdfTitle('بيانات المشتركين');
    setIsPdfModalOpen(true);
  };

  const openOrdersPdfExport = () => {
    let filteredOrders = orders || [];
    if (adminFilterChurch !== 'الكل') {
      filteredOrders = filteredOrders.filter(o => o.churchName === adminFilterChurch);
    }
    
    const columns: ColumnDefinition[] = [
      { key: 'churchName', label: 'الكنيسة', defaultSelected: true },
      { key: 'timestamp', label: 'التاريخ' },
      { key: 'grandTotal', label: 'الإجمالي (ج.م)' },
      { key: 'details_info', label: 'تفاصيل الطلب' }
    ];

    const mappedData = filteredOrders.map(o => {
       const detailsStr = Array.isArray(o.details) 
          ? o.details.map(d => `${d.stage} (${d.quantity} كتاب)`).join(' | ') 
          : 'لا يوجد تفاصيل';
       return {
          ...o,
          details_info: detailsStr
       };
    });

    setPdfData(mappedData);
    setPdfColumns(columns);
    setPdfTitle('طلبات الكتب');
    setIsPdfModalOpen(true);
  };

  const fetchSupabaseParticipants = async () => {
    try {
      let allData: any[] = [];
      let from = 0;
      const PAGE_SIZE = 4000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase.from('registrations').select('*').range(from, from + PAGE_SIZE - 1);
        if (userRole !== 'admin' && churchName) {
          query = query.eq('churchName', churchName);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += PAGE_SIZE;

          if (data.length < PAGE_SIZE) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
      
      const mapped: Participant[] = allData.map((p: any) => ({
        id: p.student_id || p.id,
        serial: p.student_id || p.id,
        name: p.name || '',
        churchName: p.churchName || '',
        stage: p.stage || '',
        gender: p.gender || '',
        competitions: p.competitions || [],
        timestamp: p.timestamp || new Date().toISOString(),
        country: p.country || 'مصر'
      }));
      setSupabaseParticipants(mapped);
    } catch (e) {
      console.error("Error fetching Supabase participants:", e);
    }
  };

  useEffect(() => {
    const handleQuotaExceeded = () => {
      fetchSupabaseParticipants();
      if (isLoggedIn) {
        fetchParticipantsPage(true, true, debouncedParticipantSearch);
      }
    };

    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    
    // If it's already flagged on mount
    if ((window as any).firestoreQuotaExceeded) {
      handleQuotaExceeded();
    }

    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, [isLoggedIn, userRole, churchName, debouncedParticipantSearch]);

  const fetchParticipantsPage = async (isNext: boolean = true, isFirst: boolean = false, search: string = '') => {
    if (!isLoggedIn) return;
    setIsParticipantsLoading(true);

    try {
      let offset = 0;
      if (isNext && !isFirst && participants.length > 0) {
        offset = participants.length;
      }

      let queryBuilder = supabase.from('registrations').select('*', { count: 'exact' });
      
      // Admin Church Filter
      if (userRole === 'admin') {
        if (partChurchFilter !== 'الكل') {
          queryBuilder = queryBuilder.eq('churchName', partChurchFilter);
        }
      } else {
        queryBuilder = queryBuilder.eq('churchName', churchName);
      }

      // Stage Filter
      if (partStageFilter !== 'الكل') {
        queryBuilder = queryBuilder.eq('stage', partStageFilter);
      }

      // Name Search Filter
      if (search) {
        queryBuilder = queryBuilder.ilike('name', `%${search}%`);
      }

      // Competition Filter (if partCompFilter is used)
      if (typeof partCompFilter !== 'undefined' && partCompFilter !== 'الكل') {
         queryBuilder = queryBuilder.contains('competitions', [partCompFilter]);
      }

      const { data, count, error } = await queryBuilder
        .order('name')
        .range(offset, offset + 49);

      if (error) throw error;

      const mapped: Participant[] = (data || []).map((p: any) => ({
        id: p.student_id || p.id,
        serial: p.student_id || p.id,
        name: p.name || '',
        churchName: p.churchName || '',
        stage: p.stage || '',
        gender: p.gender || '',
        competitions: p.competitions || [],
        timestamp: p.timestamp || new Date().toISOString(),
        country: p.country || 'مصر'
      }));

      if (isFirst) {
        setParticipants(mapped);
        setParticipantPageCount(1);
      } else if (isNext) {
        setParticipants(prev => [...prev, ...mapped]);
        setParticipantPageCount(prev => prev + 1);
      } else {
        setParticipants(mapped);
      }

      if (count !== null) setTotalParticipantsCount(count);
      setIsParticipantsEnd((data || []).length < 50);
    } catch (err: any) {
      console.error("Supabase load participants error: ", err.message);
      setNotification('حدث خطأ أثناء تحميل بيانات المشتركين.');
    } finally {
      setIsParticipantsLoading(false);
    }
  };

  const fetchAllChurchParticipants = async () => {
    if (!isLoggedIn) return;
    try {
      let allData: any[] = [];
      let errorOccurred = false;
      let from = 0;
      const PAGE_SIZE = 4000; // نسحب 4000 بـ 4000 عشان نتفادى ليميت السيرفر
      let hasMore = true;

      while (hasMore) {
        let query = supabase.from('registrations').select('*').range(from, from + PAGE_SIZE - 1);
        if (userRole !== 'admin' && churchName) {
          query = query.eq('churchName', churchName);
        }

        const { data, error } = await query;

        if (error) {
          console.error(error);
          errorOccurred = true;
          break;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += PAGE_SIZE;
          
          // لو السطور اللي رجعت أقل من الحجم المطلوب، يبقى كدة البيانات خلصت
          if (data.length < PAGE_SIZE) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      if (!errorOccurred) {
        const mapped: Participant[] = allData.map((p: any) => {
          let competitionsArr: string[] = [];
          if (Array.isArray(p.competitions)) {
            competitionsArr = p.competitions;
          } else if (typeof p.competitions === 'string') {
            try {
              const parsed = JSON.parse(p.competitions);
              if (Array.isArray(parsed)) {
                competitionsArr = parsed;
              } else {
                competitionsArr = [p.competitions];
              }
            } catch (e) {
              competitionsArr = p.competitions ? [p.competitions] : [];
            }
          }
          return {
            id: p.student_id || p.id,
            serial: p.student_id || p.id,
            name: p.name || '',
            churchName: p.churchName || '',
            stage: p.stage || '',
            gender: p.gender || '',
            competitions: competitionsArr,
            timestamp: p.timestamp || new Date().toISOString(),
            country: p.country || 'مصر',
            year: p.year || activeYear || '2026'
          };
        });

        // Sort final data by timestamp descending
        const sortedData = mapped.sort((a, b) => {
          const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tB - tA;
        });

        setAllChurchParticipants(sortedData);
        setTotalParticipantsCount(sortedData.length);
        setParticipants(sortedData);
        console.log("إجمالي البيانات المسحوبة فعلياً:", allData.length);
      }
    } catch (err: any) {
      console.error("Supabase fetch all participants error: ", err);
    }
  };

  const fetchLargeData = async (toast = true) => {
    if (!isLoggedIn) return;
    if (userRole === 'church' && !churchName) return;
    
    try {
      if (toast) setNotification('جاري تحديث البيانات...');
      
      const promises = [
        fetchParticipantsPage(true, true),
        fetchOrdersPage(true, true),
        fetchTeamsPage(true, true),
        fetchResultsPage(true, true),
        fetchAllChurchParticipants()
      ];
      
      await Promise.all(promises);
      
      if (toast) {
        setNotification('تم تحديث جميع مؤشرات البيانات بنجاح.');
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err: any) {
      console.error('Error in fetchLargeData:', err);
      if (toast) setNotification('حدث خطأ أثناء جلب مؤشرات البيانات.');
    }
  };

  const fetchOrdersPage = async (isNext = true, isFirst = false) => {
    if (!isLoggedIn) return;
    setIsOrdersLoading(true);
    try {
      let querySb = supabase
        .from('book_orders')
        .select(`
          id,
          book_id,
          church_name,
          ordered_by,
          quantity,
          created_at,
          books (
            id,
            stage,
            competition,
            price
          )
        `);

      if (userRole !== 'admin' && churchName) {
        querySb = querySb.eq('church_name', churchName);
      }

      const { data, error } = await querySb;
      if (error) throw error;

      const grouped: Record<string, Order> = {};

      (data || []).forEach((row: any) => {
        const cName = row.church_name;
        const bookSub = row.books || {};
        const price = Number(bookSub.price) || 0;
        const quantity = Number(row.quantity) || 0;
        const subtotal = price * quantity;
        const bookIdStr = String(row.book_id || '');

        if (!grouped[cName]) {
          const dateStr = row.created_at ? new Date(row.created_at).toLocaleString('ar-EG') : 'بدون تاريخ';
          grouped[cName] = {
            id: String(row.id),
            churchName: cName,
            country: '',
            timestamp: dateStr,
            grandTotal: 0,
            details: []
          };
        }

        grouped[cName].grandTotal += subtotal;
        grouped[cName].details.push({
          settingId: bookIdStr,
          id: bookIdStr,
          stage: bookSub.stage || 'غير محدد',
          material: bookSub.competition || 'غير محدد',
          price: price,
          quantity: quantity,
          subtotal: subtotal
        });
      });

      const newList = Object.values(grouped);
      setOrders(newList);
      setTotalOrdersCount(newList.length);
      setIsOrdersEnd(true);
      
      if (isFirst) setOrderPageCount(1);
      else if (isNext) setOrderPageCount(prev => prev + 1);
      
    } catch (err: any) { 
      console.error("Supabase Book Orders Error: ", err.message); 
    } finally { 
      setIsOrdersLoading(false); 
    }
  };

  const fetchResultsPage = async (isNext: boolean = true, isFirst: boolean = false, search: string = '') => {
    if (!isLoggedIn) return;
    setIsResultsLoading(true);
    let offset = 0;
    if (isNext && !isFirst && results.length > 0) {
      offset = results.length;
    }

    try {
      let queryBuilder = supabase.from('exam_submissions').select('*', { count: 'exact' });
      
      if (userRole === 'admin') {
        if (globalChurchFilter !== 'الكل') {
          queryBuilder = queryBuilder.eq('churchName', globalChurchFilter);
        }
      } else {
        queryBuilder = queryBuilder.eq('churchName', churchName).eq('is_published', true);
      }

      if (globalStageFilter !== 'الكل') {
        queryBuilder = queryBuilder.eq('stage', globalStageFilter);
      }

      if (search) {
        queryBuilder = queryBuilder.ilike('student_id', `%${search}%`);
      }

      const { data, count, error } = await queryBuilder
        .order('submitted_at', { ascending: false })
        .range(offset, offset + 49);

      if (error) throw error;

      const mappedData = (data || []).map((row: any) => ({
        id: row.student_id || row.id,
        studentName: row.name, // Fixed: map from name
        churchName: row.churchName,
        stage: row.stage,
        academicScore: row.derasy_score ?? null,
        memorizationScore: row.mahfouzat_score ?? null,
        copticL1Score: row.qebty_lvl1_score ?? null,
        copticL2Score: row.qebty_lvl2_score ?? null,
        timestamp: row.submitted_at || null,
        gender: row.gender || '',
        submissionType: row.submission_type || 'online',
        grade: row.grade || (row.derasy_score !== null && row.derasy_score !== undefined ? (row.derasy_score >= 90 ? 'ممتاز' : row.derasy_score >= 80 ? 'جيد جداً' : row.derasy_score >= 65 ? 'جيد' : 'مقبول') : '')
      }));

      if (isFirst) {
        setResults(mappedData);
      } else {
        setResults(prev => [...prev, ...mappedData]);
      }
      
      if (count !== null) setTotalResultsCount(count);
      setIsResultsEnd((data || []).length < 50);
      
      if (isFirst) setResultPageCount(1);
      else if (isNext) setResultPageCount(prev => prev + 1);
      
    } catch (err: any) { 
      console.error("Supabase load results error: ", err.message); 
    } finally { 
      setIsResultsLoading(false); 
    }
  };

  const fetchTeamsPage = async (isNext: boolean = true, isFirst: boolean = false, search: string = '') => {
    if (!isLoggedIn) return;
    setIsTeamsLoading(true);

    try {
      let queryBuilder = supabase.from('activity_teams').select('id, team_name, stage_name, church_name, created_at, members_number, activity_type', { count: 'exact' });
      
      if (userRole === 'admin') {
        if (globalChurchFilter !== 'الكل') {
          queryBuilder = queryBuilder.eq('church_name', globalChurchFilter);
        }
      } else {
        queryBuilder = queryBuilder.eq('church_name', churchName);
      }

      if (search) {
        queryBuilder = queryBuilder.ilike('team_name', `%${search}%`);
      }

      const { data, count, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .range(0, 4999);

      if (error) throw error;

      const mappedData = (data || []).map((row: any) => {
        const isIndividual = row.stage_name && row.stage_name.includes('فردي');
        const foundStage = allActivityStages.find((s: any) => s.stage_name === row.stage_name || s.name === row.stage_name);
        const inferredType = foundStage ? foundStage.activity_type : (row.stage_name?.includes('ألحان') ? 'ألحان' : (row.stage_name?.includes('كورال') ? 'كورال' : (row.stage_name?.includes('عزف') ? 'عزف' : 'ترنيم فردي')));
        return {
          id: row.id,
          team_name: row.team_name,
          stage_name: row.stage_name,
          church_name: row.church_name,
          churchName: row.church_name,
          activityType: inferredType,
          choirLevel: row.stage_name,
          members: isIndividual && row.team_name ? [{ name: row.team_name, gender: 'ذكر' as const, stage: row.stage_name }] : [],
          maleCount: 0,
          femaleCount: 0,
          members_number: row.members_number || 0,
          timestamp: row.created_at || new Date().toISOString(),
          activity_type: row.activity_type
        } as ActivityTeam;
      });

      setActivityTeams(mappedData);
      
      if (count !== null) setTotalTeamsCount(count);
      setIsTeamsEnd(true);
      
      setTeamPageCount(1);
      
    } catch (err: any) { 
      console.error("Supabase load teams error: ", err?.message || err); 
      // FALLBACK: Load from local storage if Supabase fails (e.g. Failed to fetch)
      try {
        const saved = localStorage.getItem('fallback_activity_teams');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setActivityTeams(parsed);
            setTotalTeamsCount(parsed.length);
          }
        }
      } catch (storageErr) {
        console.error("Error reading fallback activity teams from localStorage:", storageErr);
      }
    } finally { 
      setIsTeamsLoading(false); 
    }
  };

  // 🚨 EMERGENCY FIX: Removed automatic fetchLargeData (Mission Standby) to stop Supabase Egress Explosion.
  // It is now strictly lazy-loaded and will ONLY execute when the user clicks the explicit UI button.
  useEffect(() => {
    // fetchLargeData(false); 
  }, [userRole, churchName, activeYear, isLoggedIn]);

  // 🚨 EMERGENCY FIX: Added strict if (data) checks to prevent re-execution if data is already present.
  // Dependencies reduced to prevent infinite loops on filter changes. Fetches trigger on mount/tab-switch ONLY.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeSection === 'admin_dashboard') {
      if (adminActiveTab === 'dashboard') {
        if (activityTeams.length === 0) fetchTeamsPage(true, true);
        if (orders.length === 0) fetchOrdersPage(true, true);
      }
      if (adminActiveTab === 'participants' && participants.length === 0) fetchParticipantsPage(true, true, participantSearch);
      if (adminActiveTab === 'results' && results.length === 0) fetchResultsPage(true, true);
      if (adminActiveTab === 'orders' && orders.length === 0) fetchOrdersPage(true, true);
      if (adminActiveTab === 'activity_teams' && activityTeams.length === 0) fetchTeamsPage(true, true, teamSearch);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminActiveTab, activeSection, isLoggedIn, activeYear]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    if (loginHoneypot.trim() !== '') {
      setTimeout(() => {
        setIsLoading(false);
        setLoginError('خطأ غير متوقع في جدار الحماية الرقمي 0x80070005');
      }, 800);
      return;
    }
    
    if (!loginChurch) {
      setLoginError('يرجى اختيار الكنيسة');
      setIsLoading(false);
      return;
    }

    const code = loginCode.trim();

    if (loginChurch === 'مسئول') {
      if (code !== ADMIN_PASSWORD) {
        setLoginError('كود المسئول غير صحيح');
        setIsLoading(false);
        return;
      }
      
      const adminProfile = {
        uid: 'admin-session-id',
        email: 'admin@mafk.com',
        role: 'admin' as const,
        churchName: 'اللجنة المركزية منطقة18',
        dashboardBg: ''
      };

      setUserProfile(adminProfile);
      setChurchName('اللجنة المركزية منطقة18');
      setUserRole('admin');
      setIsLoggedIn(true);

      localStorage.setItem('church_session', JSON.stringify({ 
        church: 'اللجنة المركزية منطقة18', 
        isAuthenticated: true, 
        role: 'admin' 
      }));
      localStorage.setItem('userProfileCache', JSON.stringify(adminProfile));
      
      // Sync auth version on successful admin login
      fetch('/api/auth-version')
        .then(res => res.json())
        .then(resData => {
          if (resData && resData.auth_version) {
            localStorage.setItem('cached_auth_version', String(resData.auth_version));
          }
        })
        .catch(err => console.warn("Initial auth version sync handled (admin):", err))
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    try {
      // Direct, ultra-fast query to our new table 'church_access_codes'
      const { data, error } = await supabase
        .from('church_access_codes')
        .select('*')
        .eq('church_name', loginChurch)
        .eq('access_code', code)
        .single();

      if (error || !data) {
        setLoginError('الكود السري غير صحيح، يرجى المحاولة مرة أخرى');
        setIsLoading(false);
        return;
      }

      if (data && (data.is_active === false || data.isEnabled === false || data.is_locked === true || data.registration_status === 'closed')) {
        setLoginError('هذا الحساب معطل أو مغلق حالياً من قِبل لجنة المهرجان');
        setIsLoading(false);
        return;
      }

      // Success!
      const profile = {
        uid: data.church_name,
        email: `${encodeURIComponent(data.church_name).replace(/%/g, '').toLowerCase()}_2026@mafk.com`,
        role: 'church' as const,
        churchName: data.church_name,
        church_id: data.id,
        id: data.id,
        dashboardBg: ''
      };

      setUserProfile(profile);
      setChurchName(data.church_name);
      setUserRole('church');
      setIsLoggedIn(true);

      localStorage.setItem('church_session', JSON.stringify({ 
        church: data.church_name, 
        church_id: data.id,
        id: data.id,
        isAuthenticated: true, 
        role: 'servant' 
      }));
      localStorage.setItem('userProfileCache', JSON.stringify(profile));

      // Sync auth version on successful church login
      fetch('/api/auth-version')
        .then(res => res.json())
        .then(resData => {
          if (resData && resData.auth_version) {
            localStorage.setItem('cached_auth_version', String(resData.auth_version));
          }
        })
        .catch(err => console.warn("Initial auth version sync handled (church):", err));

    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError('الكود السري غير صحيح، يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الطلب؟', async () => {
      try {
        const orderToDelete = orders.find(o => o.id === id);
        if (!orderToDelete) return;

        const { error } = await supabase
          .from('book_orders')
          .delete()
          .eq('church_name', orderToDelete.churchName);

        if (error) throw error;
        
        setNotification('تم حذف الطلب بنجاح.');
        await fetchOrdersPage(true, true);
      } catch (error) {
        console.error("Error deleting book orders:", error);
        alert('حدث خطأ أثناء حذف طلب الكتب.');
      }
    });
  };

  const handleDeleteInquiry = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الاستفسار؟', async () => {
      try {
        await supabase.from('inquiries').delete().eq('id', id);
      } catch (error) {
        console.error("Supabase delete inquiry failed:", error);
      }
    });
  };

  const handleDeleteResult = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذه النتيجة؟', async () => {
      try {
        await supabase.from('exam_submissions').delete().or(`student_id.eq.${id},id.eq.${id}`);
      } catch (error) {
        console.error("Supabase delete result failed:", error);
      }
    });
  };

  const handleEditResult = (result: Result) => {
    setNewResult({
      studentName: result.studentName,
      churchName: result.churchName,
      stage: result.stage,
      academicScore: result.academicScore || 0,
      memorizationScore: result.memorizationScore || 0,
      q1Score: result.q1Score || result.copticL1Score || 0,
      qScore: result.qScore || result.copticL2Score || 0,
      score: result.score,
      grade: result.grade
    });
    setEditingResult(result);
    // Scroll to results form
    const element = document.getElementById('results-management-section');
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleResultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResult.studentName || !newResult.churchName) return;
    setIsSubmittingResult(true);
    try {
      const payload = {
        student_id: editingResult ? editingResult.id : `manual-${Math.random().toString(36).substring(2, 11)}`,
        churchName: newResult.churchName,
        stage: newResult.stage || 'عام',
        gender: 'ذكر',
        derasy_score: newResult.academicScore !== undefined ? Number(newResult.academicScore) : null,
        mahfouzat_score: newResult.memorizationScore !== undefined ? Number(newResult.memorizationScore) : null,
        qebty_lvl1_score: newResult.q1Score !== undefined ? Number(newResult.q1Score) : null,
        qebty_lvl2_score: newResult.qScore !== undefined ? Number(newResult.qScore) : null,
        submitted_at: new Date().toISOString(),
        is_published: true,
        status: 'completed',
        duration_seconds: 0,
        detailed_answers: null
      };

      if (editingResult) {
        await supabase
          .from('exam_submissions')
          .update(payload)
          .eq('student_id', editingResult.id);
        setEditingResult(null);
        alert('تم تحديث النتيجة بنجاح');
      } else {
        await supabase
          .from('exam_submissions')
          .insert([payload]);
        alert('تم إضافة النتيجة بنجاح');
      }
      setNewResult({ 
        studentName: '', 
        churchName: '', 
        stage: '', 
        academicScore: 0, 
        memorizationScore: 0, 
        q1Score: 0, 
        qScore: 0, 
        score: 0, 
        grade: '' 
      });
    } catch (error: any) {
      console.error("Supabase Results save error:", error);
      alert('حدث خطأ أثناء حفظ النتيجة');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  const handleYearChange = async (newYear: string) => {
    if (!newYear) return;
    setIsUpdatingYear(true);
    try {
      await supabase
        .from('system_settings')
        .upsert({ id: 'app_config', activeYear: newYear });
      setNotification(`تم تغيير سنة المهرجان بنجاح إلى ${newYear}`);
    } catch (error) {
      console.error('Error updating year:', error);
      setNotification('حدث خطأ أثناء تغيير السنة');
    } finally {
      setIsUpdatingYear(false);
    }
  };

  const handleClearResults = async () => {
    confirmAction('تأكيد مسح النتائج', 'هل أنت متأكد من مسح جميع نتائج هذا العام؟ لا يمكن التراجع عن هذه الخطوة.', async () => {
      try {
        await supabase.from('exam_submissions').delete().neq('student_id', '');
        setResults([]);
        setTotalResultsCount(0);
        alert('تم مسح النتائج بنجاح');
      } catch (error) {
        console.error("Supabase clear results failed:", error);
      }
    });
  };

  const toggleGlobalReadAccess = async (status: boolean) => {
    try {
      // 1. Update master state in Supabase system_settings
      const { error: sbError } = await supabase
        .from('system_settings')
        .update({ global_read_access: status })
        .eq('id', 'app_config');
        
      if (sbError) {
        // Fallback to insert if the row doesn't exist yet
        await supabase.from('system_settings').insert([{ id: 'app_config', global_read_access: status }]);
      }
      
      setGlobalReadAccess(status);
      setNotification(`تم ${status ? 'تفعيل' : 'إيقاف'} القراءة للجميع (تحديث شامل بنجاح)`);
    } catch (err) {
      console.error("Error toggling global access:", err);
      setNotification("حدث خطأ أثناء تغيير صلاحية القراءة العامة");
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('church_session');
      localStorage.removeItem('userProfileCache');
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setIsLoggedIn(false);
      setUserRole('guest');
      setChurchName('');
      setActiveSection('home');
    } catch (error) {
      console.error(error);
    }
  };

  const [inquiryMessage, setInquiryMessage] = useState('');
  const handleSendInquiry = async () => {
    if (!inquiryMessage.trim()) return;
    const newInquiry = {
      churchName,
      message: inquiryMessage,
      timestamp: new Date().toISOString(),
      reply: '',
      year: activeYear
    };
    try {
      await supabase.from('inquiries').insert([newInquiry]);
      setInquiryMessage('');
      alert('تم إرسال استفسارك بنجاح، سيقوم المسئول بالرد عليك قريباً.');
    } catch (error) {
      console.error("Supabase inquiry save failed:", error);
    }
  };

  const handleAdminReply = async (id: string, reply: string) => {
    try {
      await supabase.from('inquiries').update({ reply }).eq('id', id);
    } catch (error) {
      console.error("Supabase inquiry reply failed:", error);
    }
  };

  const handleAddTeamMember = () => {
    setNewTeam({
      ...newTeam,
      members: [...(newTeam.members || []), { name: '', gender: 'ذكر', stage: '' }]
    });
  };

  const handleRemoveTeamMember = (index: number) => {
    const newMembers = [...(newTeam.members || [])];
    newMembers.splice(index, 1);
    setNewTeam({ ...newTeam, members: newMembers });
  };

  const handleTeamMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    const newMembers = [...(newTeam.members || [])];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setNewTeam({ ...newTeam, members: newMembers });
  };

  const fetchStagesForActivity = async (type: string) => {
    if (!type) {
      setHymnStages([]);
      setActivityStages([]);
      return;
    }
    try {
      if (type === 'ألحان') {
        const { data, error } = await supabase
          .from('hymnStages')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (!error && data) {
          setHymnStages(data);
          setActivityStages([]);
        } else if (error) {
          console.error("Error fetching hymn stages:", error);
        }
      } else {
        const { data, error } = await supabase
          .from('activity_stages')
          .select('id, activity_type, stage_name, form_type')
          .eq('activity_type', type)
          .order('stage_name', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setActivityStages(data);
          setHymnStages([]);
        } else {
          // Fallback to standard local stages to prevent crashes
          const standardStages = [
            { id: '1', name: 'ابتدائي', stage_name: 'ابتدائي' },
            { id: '2', name: 'إعدادي', stage_name: 'إعدادي' },
            { id: '3', name: 'ثانوي', stage_name: 'ثانوي' },
            { id: '4', name: 'جامعة', stage_name: 'جامعة' },
            { id: '5', name: 'خريجين', stage_name: 'خريجين' },
          ];
          setActivityStages(standardStages);
          setHymnStages([]);
        }
      }
    } catch (err) {
      console.error("Error in fetchStagesForActivity:", err);
      // Fallback on catch
      const standardStages = [
        { id: '1', name: 'ابتدائي', stage_name: 'ابتدائي' },
        { id: '2', name: 'إعدادي', stage_name: 'إعدادي' },
        { id: '3', name: 'ثانوي', stage_name: 'ثانوي' },
        { id: '4', name: 'جامعة', stage_name: 'جامعة' },
        { id: '5', name: 'خريجين', stage_name: 'خريجين' },
      ];
      setActivityStages(standardStages);
      setHymnStages([]);
    }
  };

  const handleActivityTypeChange = async (type: string) => {
    setNewTeam(prev => ({
      ...prev,
      activityType: type,
      choirLevel: '',
      maleCount: 0,
      femaleCount: 0,
      members: [{ name: '', gender: 'ذكر', stage: '' }],
      team_name: ''
    }));
    setIndividualParticipantName('');
    setActivitySearchTerm('');
    setActivityLinkSuccess('');

    await fetchStagesForActivity(type);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.activityType || !newTeam.choirLevel) {
      alert('يرجى اختيار نوع النشاط والمرحلة');
      return;
    }

    const selectedStageId = newTeam.choirLevel || '';
    const selectedStage = newTeam.activityType === 'ألحان'
      ? hymnStages.find((stage: any) => String(stage.id) === String(selectedStageId) || String(stage.name) === String(selectedStageId))
      : activityStages.find((stage: any) => String(stage.id) === String(selectedStageId) || String(stage.stage_name) === String(selectedStageId));
    
    const selectedStageName = selectedStage?.stage_name || selectedStage?.name || selectedStageId;

    if (isRegistrationDisabledForCurrent(churchName, selectedStageName)) {
      alert('خطأ: التسجيل مغلق حالياً لهذه المرحلة الدراسية أو الكنيسة بقرار مركزي سيادي 🔒');
      return;
    }
    
    let formType = selectedStage?.form_type || '';
    if (newTeam.activityType === 'عزف') {
      formType = 'عزف';
    } else if (['ترنيم فردي', 'ثقافية', 'أدبية', 'فنون تشكيلية', 'كمبيوتر', 'الأدبية', 'الثقافية', 'الفنون التشكيلية'].includes(newTeam.activityType || '')) {
      formType = 'فردي';
    } else if (newTeam.activityType === 'كورال') {
      formType = 'جماعي';
    } else if (newTeam.activityType === 'ألحان') {
      formType = selectedStageName.includes('فردي') ? 'فردي' : 'جماعي';
    } else if (!formType) {
      formType = 'فردي';
    }

    const isGroupActivity = formType === 'جماعي';

    // Strict limit of TWO teams per stage per church
    const stageTeams = activityTeams.filter(t => t.churchName === churchName && t.choirLevel === newTeam.choirLevel && t.activityType === newTeam.activityType);
    if (!editingTeam && stageTeams.length >= 2) {
      alert('Limit Reached: Only 2 teams per stage allowed.');
      return;
    }

    if (formType !== 'جماعي') {
      const typedName = individualParticipantName || newTeam.members?.[0]?.name || '';
      if (!typedName.trim()) {
        alert('يرجى إدخال اسم المشترك');
        return;
      }
    }
    
    setIsSubmittingTeam(true);

    let currentTeamName = '';
    if (formType === 'جماعي') {
      currentTeamName = newTeam.team_name?.trim() || `فريق ${newTeam.activityType || 'نشاط'} - ${selectedStageName}`;
    } else if (formType === 'عزف') {
      const pName = (individualParticipantName || newTeam.members?.[0]?.name || '').trim();
      currentTeamName = `${pName} - ${newTeam.instrumentType || 'عزف'}`;
    } else {
      currentTeamName = (individualParticipantName || newTeam.members?.[0]?.name || 'مشترك فردي').trim();
    }

    const totalMembersCount = formType === 'جماعي'
      ? ((Number(newTeam.maleCount) || 0) + (Number(newTeam.femaleCount) || 0))
      : 1;

    if (!Number.isInteger(totalMembersCount) || totalMembersCount <= 0) {
      alert('يرجى التأكد من إدخال صحيح لعدد الأعضاء وأن يكون أكبر من الصفر.');
      setIsSubmittingTeam(false);
      return;
    }

    const dbPayload = {
      team_name: currentTeamName,
      stage_name: selectedStageName,
      church_name: churchName,
      members_number: totalMembersCount,
      activity_type: activity_type
    };

    try {
      if (editingTeam) {
        const { error } = await supabase
          .from('activity_teams')
          .update(dbPayload)
          .eq('id', editingTeam.id);
        
        if (error) throw error;
        
        // Instant state sync
        const updatedTeam: ActivityTeam = {
          ...editingTeam,
          id: editingTeam.id,
          team_name: currentTeamName,
          stage_name: selectedStageName,
          church_name: churchName,
          churchName: churchName,
          activityType: newTeam.activityType || '',
          choirLevel: newTeam.choirLevel || '',
          members: isGroupActivity ? [] : (newTeam.members as TeamMember[]),
          maleCount: isGroupActivity ? (Number(newTeam.maleCount) || 0) : 0,
          femaleCount: isGroupActivity ? (Number(newTeam.femaleCount) || 0) : 0,
          members_number: totalMembersCount,
          timestamp: new Date().toISOString(),
          activity_type: activity_type
        } as any;
        setActivityTeams(prev => prev.map(t => t.id === editingTeam.id ? updatedTeam : t));

        setEditingTeam(null);
        alert('تم تحديث النشاط بنجاح.');
      } else {
        const { data, error } = await supabase
          .from('activity_teams')
          .insert([dbPayload])
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const row = data[0];
          const isIndividual = formType !== 'جماعي';
          const foundStage = allActivityStages.find((s: any) => s.stage_name === row.stage_name || s.name === row.stage_name);
          const inferredType = newTeam.activityType || (foundStage ? foundStage.activity_type : (row.stage_name?.includes('ألحان') ? 'ألحان' : (row.stage_name?.includes('كورال') ? 'كورال' : (row.stage_name?.includes('عزف') ? 'عزف' : 'ترنيم فردي'))));
          const createdTeam: ActivityTeam = {
            id: row.id,
            team_name: row.team_name,
            stage_name: row.stage_name,
            church_name: row.church_name,
            churchName: row.church_name,
            activityType: inferredType,
            choirLevel: row.stage_name,
            members: isIndividual && row.team_name ? [{ name: row.team_name, gender: 'ذكر', stage: row.stage_name }] : [],
            maleCount: isIndividual ? 0 : (Number(newTeam.maleCount) || 0),
            femaleCount: isIndividual ? 0 : (Number(newTeam.femaleCount) || 0),
            members_number: row.members_number || totalMembersCount,
            timestamp: row.created_at || new Date().toISOString(),
            activity_type: row.activity_type
          } as any;
          setActivityTeams(prev => [createdTeam, ...prev]);
          setTotalTeamsCount(prev => prev + 1);
        }

        // Auto-register new student in registrations table
        if (!isGroupActivity && activeActivityPath === 'new' && newTeam.members?.[0]?.name) {
          const memberName = newTeam.members[0].name.trim();
          const dbParticipant = participants.find(p => p.name.trim() === memberName && p.churchName === churchName);
          if (!dbParticipant) {
             const customId = generateShortId();
             await supabase.from('registrations').insert([{
               student_id: customId,
               name: memberName,
               churchName,
               stage: newTeam.members[0].stage || selectedStageName,
               gender: newTeam.members[0].gender,
               timestamp: new Date().toISOString()
             }]);
             if (churchName) await updateChurchSubscribers(churchName);
          }
        }
        alert('تم تسجيل النشاط بنجاح.');
      }
      
      setNewTeam({ 
        activityType: '', 
        members: [{ name: '', gender: 'ذكر', stage: '' }],
        choirLevel: '', 
        instrumentType: '',
        performanceType: '',
        maleCount: 0,
        femaleCount: 0,
        team_name: ''
      });
      setActivity_type('');
      setActivitySearchTerm('');
      setIndividualParticipantName('');
      setLinkedParticipantId(null);
      setLinkedParticipantMessage('');
    } catch (error: any) {
      console.error("Supabase activity team save failed:", error);
      alert('حدث خطأ أثناء حفظ النشاط');
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const handleReplyInquiry = async (id: string, reply: string) => {
    try {
      await supabase.from('inquiries').update({ reply }).eq('id', id);
      alert('تم إرسال الرد بنجاح');
    } catch (error) {
      console.error("Supabase reply inquiry failed:", error);
    }
  };

  const handleEditTeam = async (team: any) => {
    const sName = team.stage_name || team.choirLevel || '';
    const isIndiv = sName.includes('فردي');

    const foundStage = allActivityStages.find((s: any) => s.stage_name === sName || s.name === sName);
    const inferredActType = team.activityType || (foundStage ? foundStage.activity_type : (sName.includes('ألحان') ? 'ألحان' : (sName.includes('كورال') ? 'كورال' : (sName.includes('عزف') ? 'عزف' : 'ترنيم فردي'))));

    await fetchStagesForActivity(inferredActType);

    setNewTeam({
      activityType: inferredActType,
      members: team.members?.length ? team.members : [{ name: team.team_name || '', gender: 'ذكر', stage: sName }],
      choirLevel: team.choirLevel || sName,
      instrumentType: team.instrumentType || '',
      performanceType: team.performanceType || '',
      maleCount: team.maleCount || 0,
      femaleCount: team.femaleCount || 0,
      team_name: team.team_name || ''
    });
    setActivity_type(team.activity_type || '');
    
    if (isIndiv) {
      setIndividualParticipantName(team.team_name || '');
    } else {
      setIndividualParticipantName('');
    }
    setEditingTeam(team);
    setActiveSection('activities');
    // Scroll to form
    const formElement = document.getElementById('activity-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteTeam = async (teamId: string | number) => {
    const isConfirmed = window.confirm("هل أنت متأكد من رغبتك في حذف هذا الفريق/المشترك نهائياً؟");
    if (!isConfirmed) return;
    try {
      const { error } = await supabase
        .from('activity_teams')
        .delete()
        .eq('id', teamId);
      
      if (error) {
        throw error;
      }
      
      setActivityTeams(prev => prev.filter(t => t.id !== teamId));
      setTotalTeamsCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Supabase delete team failed:", error);
      alert("حدث خطأ أثناء حذف الفريق/المشترك");
    }
  };

  const handleEditParticipant = (participant: Participant) => {
    setNewParticipant({
      name: participant.name,
      stage: participant.stage,
      gender: (participant as any).gender || '',
      country: participant.country,
      competitions: [...(participant.competitions || []), '', '', ''].slice(0, 3)
    });
    setEditingParticipant(participant);
    setRegistrationStep(1);
    // Scroll to form
    const formElement = document.getElementById('registration-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteParticipant = async (id: string) => {
    try {
      const deletedParticipant = participants.find(p => p.id === id) || allChurchParticipants.find(p => p.id === id);
      const targetChurch = deletedParticipant?.churchName || churchName;

      // Use Supabase delete
      const { error: sbErr } = await supabase
        .from('registrations')
        .delete()
        .eq('student_id', id);
      
      if (sbErr) throw sbErr;

      // Instant local state sync
      setParticipants(prev => prev.filter(p => p.id !== id));
      setAllChurchParticipants(prev => prev.filter(p => p && p.id !== id));
      setTotalParticipantsCount(prev => Math.max(0, prev - 1));

      setShowDeleteModal(false);
      setParticipantToDelete(null);
      setDeleteConfirmText('');

      if (targetChurch) await updateChurchSubscribers(targetChurch);
      alert('تم حذف المشترك بنجاح.');
    } catch (error: any) {
      console.error("Supabase delete participant failed:", error);
      alert('حدث خطأ أثناء الحذف: ' + (error.message || 'فشل الاتصال'));
    }
  };

  const confirmAndDeleteParticipant = async (id: string) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المخدوم نهائياً؟")) {
      await handleDeleteParticipant(id);
    }
  };

  const [showExamGateway, setShowExamGateway] = useState(false);
  const [showDevicePermissionModal, setShowDevicePermissionModal] = useState(false);
  const [pendingDeviceIp, setPendingDeviceIp] = useState('');
  const [isCheckingDevice, setIsCheckingDevice] = useState(false);

  const handleOpenExams = () => {
    setIsPortalOpen(true);
  };

  const handleDeleteSchedule = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الموعد؟', async () => {
      try {
        await supabase.from('schedules').delete().eq('id', id);
        setSchedules(prev => prev.filter(s => s.id !== id));
      } catch (error) {
        console.error("Supabase delete schedule failed:", error);
      }
    });
  };

  const handleApproveDevice = async () => {
    try {
      setIsCheckingDevice(true);
      const parser = new UAParser();
      const result = parser.getResult();
      const osName = result.os.name || 'Unknown OS';
      const deviceType = result.device.type || 'Desktop';
      const deviceModelRaw = result.device.model || result.browser.name || 'Unknown Device';
      const fp = getDeviceFingerprint();
      const displayBrowser = fp.browser === 'Netscape' ? 'Browser' : fp.browser;
      const finalDeviceModel = deviceModelRaw === 'Netscape' ? displayBrowser : deviceModelRaw;

      localStorage.setItem('exam_session', JSON.stringify({ deviceApproved: true, savedIp: pendingDeviceIp }));
      setShowDevicePermissionModal(false);
      setShowExamGateway(true);
    } catch (e) {
      console.error('Device approval error:', e);
      // Let them in anyway if network failed
      setShowDevicePermissionModal(false);
      setShowExamGateway(true);
    } finally {
      setIsCheckingDevice(false);
    }
  };

  const handleResetExam = async (studentId: string, studentName?: string) => {
    console.log('Admin calling handleResetExam:', { studentId, studentName });
    if (!confirm(`هل أنت متأكد من إعادة فتح الامتحان للطالب ${studentName || ''}؟ سيؤدي ذلك لمسح المحاولة الحالية وأرشفتها.`)) return;
    setIsLoading(true);
    try {
      const { data: resData, error: fetchErr } = await supabase
        .from('exam_submissions')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      
      if (resData) {
        // 1. Archive Old Attempt
        await supabase.from('previous_attempts').insert([{
           ...resData,
           original_result_id: studentId,
           archivedAt: new Date().toISOString(),
           archivedBy: (user as any)?.email || 'admin'
        }]);
        
        // 2. Clear primary fields in exam_submissions
        await supabase.from('exam_submissions').delete().eq('student_id', studentId);
      }
      
      // 3. Unlock Gateway / Reset Session
      // removed exam_device_logs operations

      const successMsg = `تمت إعادة فتح الامتحان بنجاح للطالب: ${studentName || studentId}`;
      setNotification(successMsg);
      alert(successMsg);
    } catch (e: any) {
      console.error('Reset Exam Error:', e);
      setNotification('خطأ في إعادة فتح الامتحان');
      alert('فشل في إعادة فتح الامتحان. تحقق من الصلاحيات.');
    } finally {
      setIsLoading(false);
    }
  };

  const bulkInsertParticipants = async () => {
    const participantsList = [
      "ديانا طلعت حلمي", "ايلاريا رضا ابراهيم", "كرستينا محفوظ جرجس", "مرثا محفوظ جرجس",
      "انجي عايد صموئيل", "مارينا عايد ناجح", "فاديه فهيم رمزي", "رفقه اشرف جرجس",
      "مارتينا حنا ملاك", "شيرين بسام مكسيموس", "دينا هاني فوزي", "مهرائيل اشرف ميلاد",
      "مادونا نبيل جرجس", "ميرنا مجدي ميلاد", "مريم عيد رزق", "كرستينا يوسف عياد",
      "مارينا وافي ملاك", "ساره نبيل صدقي", "مريم عادل ابراهيم", "ماريان لياس بشري"
    ];

    try {
      const dataToInsert = participantsList.map(name => {
         const customId = generateShortId();
         return {
            student_id: customId,
            name: name,
            churchName: "دير الجرنوس",
            stage: "جامعة",
            competitions: ["دراسي"],
            timestamp: new Date().toISOString()
         }
      });

      const { error } = await supabase.from('registrations').insert(dataToInsert);
      if (error) throw error;
      alert("تم إضافة 20 مشترك بنجاح إلى Supabase!");
    } catch (e: any) {
      console.error("Bulk insert failed:", e);
      alert("فشل في الإضافة: " + e.message);
    }
  };

  const handleBulkRegisterSuccess = (newParticipants: any[]) => {
    setParticipants(prev => [...prev, ...newParticipants]);
    setTotalParticipantsCount(prev => prev + newParticipants.length);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerHoneypot.trim() !== '') {
      setIsSubmittingParticipant(true);
      setTimeout(() => {
        setIsSubmittingParticipant(false);
        alert('تم تسجيل المشترك بنجاح.');
        setNewParticipant({ 
          ...newParticipant, 
          name: '', 
          gender: '',
          competitions: ['دراسي', '', ''] 
        });
      }, 500);
      return;
    }

    if (!newParticipant.name || !newParticipant.stage || !newParticipant.gender) {
      alert('يرجى ملء جميع الحقول المطلوبة (الاسم، المرحلة، النوع)');
      return;
    }

    if (isRegistrationDisabledForCurrent(churchName, newParticipant.stage)) {
      alert('خطأ: التسجيل مغلق حالياً لهذه المرحلة الدراسية أو الكنيسة بقرار مركزي سيادي 🔒');
      return;
    }
    
    if (!editingParticipant) {
      const isDuplicate = participants.some(p => 
        p.churchName === churchName && 
        p.name.trim() === newParticipant.name.trim()
      );

      if (isDuplicate) {
        alert('هذا الاسم مسجل بالفعل في كنيستك. يرجى التأكد من الاسم ثلاثياً.');
        return;
      }
    }

    setIsSubmittingParticipant(true);

    try {
      // 2️⃣ Submit Form Guard (The Ultimate Lock) to fix Authorization Bypass
      if (userRole !== 'admin') {
        let dbData: any = null;
        let dbErr: any = null;
        const currentChurchId = userProfile?.church_id || userProfile?.id;

        try {
          if (currentChurchId) {
            const { data: qData, error: qErr } = await supabase
              .from('church_access_codes')
              .select('is_locked, registration_status')
              .eq('church_id', currentChurchId)
              .maybeSingle();
            dbData = qData;
            dbErr = qErr;
          }
        } catch (err) {
          console.warn("Query with church_id failed, will try fallback:", err);
        }

        // Fallback to id / church_name if needed
        if (!dbData) {
          try {
            let query = supabase.from('church_access_codes').select('is_locked, registration_status');
            if (currentChurchId) {
              query = query.eq('id', currentChurchId);
            } else if (churchName) {
              query = query.eq('church_name', churchName);
            } else {
              query = null;
            }
            if (query) {
              const { data: qData } = await query.maybeSingle();
              dbData = qData;
            }
          } catch (err) {
            console.error("Fallback query in Submit Guard failed:", err);
          }
        }

        if (dbData?.is_locked || dbData?.registration_status === 'closed') {
          alert("عذرًا، تم إغلاق التسجيل أو قفل الحساب من قبل لجنة المهرجان!");
          setIsSubmittingParticipant(false);
          // 1. Clear Supabase Auth Session
          await supabase.auth.signOut().catch(() => {});
          // 2. Clear local storages to prevent stale states
          localStorage.clear();
          sessionStorage.clear();
          // 3. Hard redirect to the absolute login/locked gate
          window.location.href = '/login';
          return;
        }
      }

      if (editingParticipant) {
        const updatedFields = {
          name: newParticipant.name,
          stage: newParticipant.stage,
          gender: newParticipant.gender,
          competitions: newParticipant.competitions.filter(c => c !== ''),
          timestamp: new Date().toISOString()
        };
        
        const { error: sbErr } = await supabase
          .from('registrations')
          .upsert({
            student_id: editingParticipant.id,
            name: updatedFields.name,
            churchName: editingParticipant.churchName || churchName,
            stage: updatedFields.stage,
            gender: updatedFields.gender,
            competitions: updatedFields.competitions || [],
            timestamp: updatedFields.timestamp
          });
        
        if (sbErr) throw sbErr;
        
        const updatedParticipant: Participant = {
          ...editingParticipant,
          ...updatedFields
        };
        setParticipants(prev => prev.map(p => p.id === editingParticipant.id ? updatedParticipant : p));

        setEditingParticipant(null);
        alert('تم تحديث بيانات المشترك بنجاح.');
      } else {
        const customId = generateShortId();
        
        const newRecord = {
          student_id: customId,
          name: newParticipant.name,
          churchName: churchName,
          stage: newParticipant.stage,
          gender: newParticipant.gender,
          competitions: newParticipant.competitions.filter(c => c !== ''),
          timestamp: new Date().toISOString()
        };

        const { error: sbErr } = await supabase
          .from('registrations')
          .insert([newRecord]);
        
        if (sbErr) throw sbErr;
        
        const newStudent: Participant = { ...newRecord, serial: customId } as any as Participant;
        setParticipants(prev => [...prev, newStudent]);
        setTotalParticipantsCount(prev => prev + 1);

        alert('تم تسجيل المشترك بنجاح.');
      }
      
      setNewParticipant({ 
        ...newParticipant, 
        name: '', 
        gender: '',
        competitions: ['دراسي', '', ''] 
      });
      await updateChurchSubscribers(churchName);
    } catch (error: any) {
      console.error("Supabase Save Error: ", error);
      setNotification('حدث خطأ أثناء حفظ بيانات المشترك: ' + (error.message || 'فشل الاتصال'));
    } finally {
      setIsSubmittingParticipant(false);
    }
  };

  const invoiceRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleQuantityChange = (settingId: string, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setQuantities(prev => ({
      ...prev,
      [settingId]: numValue
    }));
  };

  const handleClearQuantities = () => {
    confirmAction('تأكيد مسح الكميات', 'هل أنت متأكد من مسح جميع الكميات؟', () => {
      setQuantities({});
    });
  };

  const handleImageClick = (imageUrl: string) => {
    setLightboxImages([{ src: imageUrl }]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  };

  const calculations = useMemo(() => {
    let grandTotal = 0;
    const rows = calculatorSettings.map(setting => {
      const q = quantities[setting.id] || 0;
      const subtotal = q * setting.price;
      grandTotal += subtotal;
      return { ...setting, quantity: q, subtotal };
    });
    return { rows, grandTotal };
  }, [quantities, calculatorSettings]);

  const filteredNews = useMemo(() => {
    return news.filter(n => {
      const matchesSearch = n.title?.toLowerCase().includes(newsSearch.toLowerCase());
      const dateStr = new Date(n.timestamp).toLocaleDateString('ar-EG');
      const matchesDate = !newsFilterDate || dateStr.includes(newsFilterDate);
      return matchesSearch && matchesDate;
    });
  }, [news, newsSearch, newsFilterDate]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesSearch = r.studentName?.toLowerCase().includes(resultSearch.toLowerCase());
      const matchesStage = resultsFilterStage === 'الكل' || r.stage === resultsFilterStage;
      const matchesGrade = resultsFilterGrade === 'الكل' || r.grade === resultsFilterGrade;
      return matchesSearch && matchesStage && matchesGrade;
    });
  }, [results, resultSearch, resultsFilterStage, resultsFilterGrade]);

  const extractedStagesFromParticipants = useMemo(() => {
    if (!allChurchParticipants || allChurchParticipants.length === 0) return [];
    return Array.from(new Set(allChurchParticipants.map(s => s.stage).filter(Boolean))).sort();
  }, [allChurchParticipants]);

  const extractedCompetitionsFromParticipants = useMemo(() => {
    if (!allChurchParticipants || allChurchParticipants.length === 0) return [];
    return Array.from(new Set(allChurchParticipants.flatMap(s => {
      const comps = s.competitions || [];
      return Array.isArray(comps) ? comps : [comps];
    }).filter(Boolean))).sort();
  }, [allChurchParticipants]);

  const groupedSettings = useMemo(() => {
    console.log('Calculator settings:', calculatorSettings);
    const groups: Record<string, Record<string, any[]>> = {};
    calculatorSettings.forEach(setting => {
      if (!groups[setting.stage]) groups[setting.stage] = {};
      if (!groups[setting.stage][setting.material]) groups[setting.stage][setting.material] = [];
      groups[setting.stage][setting.material].push(setting);
    });
    console.log('Grouped settings:', groups);
    return groups;
  }, [calculatorSettings]);

  const orderSummaryByChurch = useMemo(() => {
    const summary: Record<string, { totalBooks: number, totalCost: number }> = {};
    const filteredOrders = (orders || []).filter(o => adminFilterChurch === 'الكل' || o.churchName === adminFilterChurch);
    
    filteredOrders.forEach(order => {
      if (!summary[order.churchName]) {
        summary[order.churchName] = { totalBooks: 0, totalCost: 0 };
      }
      summary[order.churchName].totalCost += order.grandTotal || 0;
      
      let booksCount = 0;
      (order.details || []).forEach(detail => {
        booksCount += Number(detail.quantity) || 0;
      });
      summary[order.churchName].totalBooks += booksCount;
    });

    return Object.entries(summary)
      .map(([churchName, data]) => ({
        churchName,
        totalBooks: data.totalBooks,
        totalCost: data.totalCost
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [orders, adminFilterChurch]);

  const handleSubmitOrder = async () => {
    if (!churchName) {
      alert('اسم الكنيسة مفقود');
      return;
    }

    const activeRows = calculations.rows.filter(r => r.subtotal > 0);
    if (activeRows.length === 0) {
      alert('يرجى إضافة كميات للكتب أولاً');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Clear previous orders for this church to prevent duplication
      await supabase
        .from('book_orders')
        .delete()
        .eq('church_name', churchName);

      // 2. Prepare items for insertion
      const ordersToInsert = activeRows.map(r => ({
        book_id: Number(r.id),
        church_name: churchName,
        ordered_by: user?.email || 'مستخدم الكنيسة',
        quantity: Number(r.quantity)
      }));

      const { error: insertError } = await supabase
        .from('book_orders')
        .insert(ordersToInsert);

      if (insertError) throw insertError;

      // 3. Trigger immediate page sync
      await fetchOrdersPage(true, true);
      
      setSubmitStatus('success');
      alert('تم إرسال طلب الكتب للجنة بنجاح!');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error: any) {
      console.error('Error submitting order on Supabase:', error);
      setSubmitStatus('error');
      alert('حدث خطأ أثناء إرسال الطلب. يرجى مراجعة الاتصال بالإنترنت.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToPDF = async () => {
    if (!invoiceRef.current) return;
    
    const element = invoiceRef.current;
    const opt = {
      margin: 10,
      filename: `طلب_كتب_مهرجان_${churchName || 'المهرجان'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as any;

    await withStylesCleaned(async () => {
      await html2pdf().set(opt).from(element).save();
    });
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => { 
        if (id === 'exams_portal' || id === 'exam-login') {
          setIsPortalOpen(true);
        } else {
          setActiveSection(id); 
        }
        setIsMenuOpen(false); 
      }}
      className={`no-gold-btn flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 w-full text-right ${
        activeSection === id 
          ? 'bg-primary text-white shadow-lg scale-[1.02]' 
          : 'text-slate-600 hover:bg-accent/10 hover:text-primary'
      }`}
    >
      <Icon size={22} className={activeSection === id ? 'text-accent' : 'text-slate-400'} />
      <span className="font-bold">{label}</span>
    </button>
  );

  const BackButton = () => {
    const isDashboard = activeSection === 'admin_dashboard' || activeSection === 'church_dashboard';
    const targetSection = isDashboard ? 'home' : (userRole === 'admin' ? 'admin_dashboard' : (userRole === 'church' ? 'church_dashboard' : 'home'));
    
    return (
      <button 
        onClick={() => setActiveSection(targetSection)}
        className="no-gold-btn flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-6 group"
      >
        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        <span className="font-bold text-sm">{isDashboard ? 'العودة للرئيسية' : 'العودة لمركز التحكم'}</span>
      </button>
    );
  };

  const DeleteScheduleModal = () => (
    <AnimatePresence>
      {showDeleteScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteScheduleModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="text-red-500" size={40} />
            </div>
            <h3 className="text-xl font-black text-primary mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 text-sm mb-8">هل أنت متأكد من حذف هذا الجدول؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-4">
              <button 
                onClick={confirmDeleteSchedule}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
              >
                حذف
              </button>
              <button 
                onClick={() => setShowDeleteScheduleModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const DeleteCalculatorModal = () => (
    <AnimatePresence>
      {showDeleteCalculatorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteCalculatorModal(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="text-red-500" size={40} />
            </div>
            <h3 className="text-xl font-black text-primary mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 text-sm mb-8">هل أنت متأكد من حذف هذا الإعداد؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-4">
              <button 
                onClick={confirmDeleteCalculatorSetting}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
              >
                حذف
              </button>
              <button 
                onClick={() => setShowDeleteCalculatorModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const OrderDetailsModal = () => (
    <AnimatePresence>
      {viewingOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingOrder(null)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-800">عرض تفاصيل الطلب</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">{viewingOrder.churchName} - {viewingOrder.timestamp}</p>
              </div>
              <button 
                onClick={() => setViewingOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full hover:bg-slate-100 transition-colors shadow-sm"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {calculatorSettings.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold">
                  لا توجد كتب مضافة حالياً بحاسبة الكتب
                </div>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4 border-b border-slate-100 whitespace-nowrap">المرحلة</th>
                          <th className="p-4 border-b border-slate-100 whitespace-nowrap">المادة</th>
                          <th className="p-4 border-b border-slate-100 whitespace-nowrap">سعر الوحدة</th>
                          <th className="p-4 border-b border-slate-100 text-center whitespace-nowrap">الكمية المطلوبة</th>
                          <th className="p-4 border-b border-slate-100 whitespace-nowrap">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...calculatorSettings].sort((a, b) => sortStages(a.stage, b.stage) || a.material.localeCompare(b.material)).map(setting => {
                          const detail = viewingOrder.details.find((d: any) => d.settingId === setting.id || (d.stage === setting.stage && d.material === setting.material));
                          const quantity = detail ? Number(detail.quantity) : 0;
                          const subtotal = quantity * setting.price;
                          return (
                            <tr key={setting.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">{setting.stage}</td>
                              <td className="p-4 font-bold text-slate-600 text-sm whitespace-nowrap">{setting.material}</td>
                              <td className="p-4 font-black text-slate-400 text-sm whitespace-nowrap">{setting.price} ج.م</td>
                              <td className="p-4 text-center whitespace-nowrap">
                                {quantity > 0 ? (
                                  <span className="inline-block px-3 py-1 bg-coptic-blue/10 text-coptic-blue rounded-lg font-black">{quantity}</span>
                                ) : (
                                  <span className="text-slate-300 font-bold">-</span>
                                )}
                              </td>
                              <td className="p-4 font-black text-coptic-red whitespace-nowrap">{subtotal} ج.م</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-3 text-right">
                    {[...calculatorSettings]
                      .sort((a, b) => sortStages(a.stage, b.stage) || a.material.localeCompare(b.material))
                      .filter(setting => {
                        const detail = viewingOrder.details.find((d: any) => d.settingId === setting.id || (d.stage === setting.stage && d.material === setting.material));
                        return detail && Number(detail.quantity) > 0; // only show requested items in mobile list to save space
                      })
                      .map(setting => {
                        const detail = viewingOrder.details.find((d: any) => d.settingId === setting.id || (d.stage === setting.stage && d.material === setting.material));
                        const quantity = detail ? Number(detail.quantity) : 0;
                        const subtotal = quantity * setting.price;
                        return (
                          <div key={setting.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="inline-block px-2 py-0.5 bg-blue-50 text-coptic-blue rounded-lg text-[10px] font-bold mb-1">
                                  {setting.stage}
                                </span>
                                <h6 className="font-bold text-slate-800 text-xs">{setting.material}</h6>
                              </div>
                              <span className="font-black text-coptic-red text-sm">{subtotal} ج.م</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2">
                              <span>سعر الوحدة: <span className="font-black text-slate-700">{setting.price} ج.م</span></span>
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg font-black">الكمية: {quantity}</span>
                            </div>
                          </div>
                        );
                      })}
                    {[...calculatorSettings]
                      .filter(setting => {
                        const detail = viewingOrder.details.find((d: any) => d.settingId === setting.id || (d.stage === setting.stage && d.material === setting.material));
                        return !detail || Number(detail.quantity) === 0;
                      }).length === calculatorSettings.length && (
                        <div className="py-6 text-center text-slate-400 font-bold text-xs">
                          لم يتم طلب أي كتب في هذا الطلب
                        </div>
                      )}
                  </div>
                </>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="font-bold text-slate-500">إجمالي الطلب</span>
              <span className="text-2xl font-black text-coptic-red">{viewingOrder.grandTotal} ج.م</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const DeleteConfirmationModal = () => (
    <AnimatePresence>
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="text-red-500" size={40} />
            </div>
            <h3 className="text-xl font-black text-primary mb-2">تأكيد الحذف</h3>
            <p className="text-slate-700 text-sm mb-6 leading-relaxed bg-red-50 p-4 rounded-xl border border-red-100 font-bold">
              هل أنت متأكد تماماً من حذف هذا المشترك؟ هذا الإجراء سيؤدي لحذف بيانات الطالب وأكواده نهائياً من السيستم ولا يمكن التراجع عنه!
            </p>
            <div className="mb-6 text-right">
              <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">للتأكيد، اكتب كلمة "حذف"</label>
              <input 
                type="text"
                placeholder="حذف"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 font-bold text-center"
              />
            </div>
            <div className="flex gap-4">
              <button 
                disabled={deleteConfirmText !== 'حذف'}
                onClick={() => {
                  if (participantToDelete) {
                    handleDeleteParticipant(participantToDelete);
                  }
                }}
                className="flex-1 py-3 bg-red-500 text-white disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-bold hover:bg-opacity-90 transition-all"
              >
                حذف
              </button>
              <button 
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  
  if (globalSettings.is_site_disabled && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center select-none" dir="rtl">
        <div className="max-w-md w-full p-8 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-600" />
          <div className="mx-auto w-20 h-20 bg-rose-950/50 text-rose-500 rounded-full flex items-center justify-center border border-rose-900/50 animate-pulse">
            <ShieldAlert size={40} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-rose-500">عذراً، المنصة مغلقة مؤقتاً</h1>
            <p className="text-slate-400 font-bold text-sm leading-relaxed">
              لقد جرى إيقاف الموقع بالكامل للصيانة الإدارية وتحديث البيانات بقرار مركزي من الكنترول.
            </p>
          </div>
          <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-xs font-mono text-slate-500 max-w-xs mx-auto">
            SYSTEM_STATUS: MAINTENANCE_LOCK
          </div>
          <div className="pt-2">
            <p className="text-xs text-slate-400">يرجى المحاولة مرة أخرى لاحقاً بعد انتهاء فترة الصيانة.</p>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Shared exam-login portal is accessible to all users directly without admin role check
  }, [activeSection, userRole]);

  if (activeSection === 'admin-display-gate') {
    return (
      <AdminDisplayGate 
        onClose={() => {
          if (isLoggedIn && (userRole === 'admin' || userRole === 'super_admin')) {
            setActiveSection('admin_dashboard');
          } else {
            setActiveSection('home');
          }
        }} 
      />
    );
  }

  if (showExamGateway) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#4a000b] via-[#6b0311] to-[#2b0006] relative z-[9999]" dir="rtl">
        <LiveExamGateway 
          setCurrentScreen={(screen) => {
            if (screen === 'student-exam') {
              setShowExamGateway(false);
              setIsPortalOpen(true);
              setActiveSection('exam-login');
            }
          }}
          setCurrentStudent={() => {}}
          setActiveExam={() => {}}
        />
      </div>
    );
  }

  if (activeSection === 'exam-login' || activeSection === 'student-exam' || isPortalOpen) {
    return (
      <ExamLoginPortal 
        onClose={() => {
          setIsPortalOpen(false);
          setActiveSection('home');
        }}
        onSuccess={(student, examData) => {
          // 1. Build student profile matching LiveExamGateway properties
          let copticLevel: number | null = null;
          const comps = student.competitions;
          if (comps) {
            let compsArr: any[] = [];
            if (Array.isArray(comps)) {
              compsArr = comps;
            } else if (typeof comps === 'string') {
              try {
                compsArr = JSON.parse(comps);
              } catch (e) {
                compsArr = [comps];
              }
            }
            compsArr.forEach((item: any) => {
              const nameStr = typeof item === 'string' ? item : (item.activity || item.competition || item.name || '');
              const lvlStr = typeof item === 'object' ? (item.level || '') : '';
              if (nameStr.includes('ثاني') || lvlStr.includes('ثاني') || lvlStr.includes('2')) {
                copticLevel = 2;
              } else if (nameStr.includes('أول') || nameStr.includes('اول') || lvlStr.includes('أول') || lvlStr.includes('اول') || lvlStr.includes('1')) {
                copticLevel = 1;
              }
            });
          }

          const studentProfile = {
            id: student.id,
            studentName: student.name,
            churchName: student.churchName,
            stage: student.stage,
            gender: student.gender,
            coptic_level: copticLevel,
            enrolled_subjects: student.competitions
          };

          // 2. Put it in localStorage so the LiveExamGateway component can instantly restore the user session
          localStorage.setItem('active_student_id', student.id);
          localStorage.setItem(`student_profile_${student.id}`, JSON.stringify(studentProfile));

          // 3. Clear transient scores or cached values from any expired session
          localStorage.removeItem(`completed_subjects_${student.id}`);
          localStorage.removeItem(`all_answers_${student.id}`);

          // 4. Open the live exam gateway instantly
          setIsPortalOpen(false);
          setShowExamGateway(true);
          setActiveSection('home');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-bg-soft font-sans selection:bg-accent/30 relative" dir="rtl">
      {/* Forced Remote Refresh Countdown Toast */}
      <AnimatePresence>
        {refreshCountdown !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-2xl z-[1000] p-5 rounded-2xl flex items-center gap-4 border border-orange-500/30 max-w-lg min-w-[320px] sm:min-w-[400px] select-none"
            dir="rtl"
          >
            <div className="bg-white/20 p-3 rounded-full flex items-center justify-center animate-bounce">
              <RefreshCw size={24} className="animate-spin text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-base mb-1">تحديث إجباري للنظام 🔄</h4>
              <p className="text-xs text-orange-50/90 leading-relaxed font-black">
                سيتم تحديث النظام خلال لحظات لضمان أفضل تجربة...
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-bold">
                  جاري إعادة التشغيل تلقائياً خلال:
                </span>
                <span className="text-sm font-black text-white bg-black/30 px-2.5 py-0.5 rounded-lg animate-pulse">
                  {refreshCountdown} ثوانٍ
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Watermark */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url(${appLogo || logo})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundSize: 'min(500px, 90%)'
        }}
      />

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-50 p-6 border-l border-slate-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                    <Church className="text-accent" size={24} />
                  </div>
                  <span className="font-black text-primary text-xl">القائمة</span>
                </div>
                <div className="px-3 py-1 bg-coptic-gold/20 text-coptic-gold rounded-full text-[10px] font-black border border-coptic-gold/30">
                  مهرجان {activeYear}
                </div>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <nav className="space-y-2">
                <NavItem id="home" icon={Home} label="الرئيسية" />
                {userRole === 'admin' && <NavItem id="admin_dashboard" icon={ShieldCheck} label="مركز التحكم " />}
                {userRole === 'church' && <NavItem id="church_dashboard" icon={LayoutDashboard} label="صفحة الكنيسة" />}
                <NavItem id="calculator" icon={Calculator} label="حاسبة الكتب" />
                <NavItem id="inquiries" icon={MessageSquare} label="الاستفسارات والشكاوي" />
                <NavItem id="exam-login" icon={QrCode} label="بوابة دخول الامتحانات" />
                <NavItem id="info" icon={Info} label="عن المهرجان" />
                {isLoggedIn && (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 w-full text-right text-primary hover:bg-primary/5"
                  >
                    <LogOut size={20} />
                    <span className="font-bold">تسجيل الخروج</span>
                  </button>
                )}
              </nav>

              <div className="absolute bottom-8 right-6 left-6">
                <div className="p-4 bg-bg-soft rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">للتواصل السريع</p>
                  {siteSettings.phone && (
                    <a href={`tel:${siteSettings.phone}`} className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Phone size={14} />
                      <span dir="ltr">{siteSettings.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-md no-print w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-2xl transition-colors text-primary"
            >
              <Menu size={28} />
            </button>
            <div className="flex items-center gap-3">
              {userRole === 'church' ? (
                <div className="flex items-center gap-3">
                  <img 
                    src={getValidLogoUrl(userProfile?.logoUrl, appLogo)} 
                    alt="Church Logo" 
                    className="h-10 w-10 rounded-full object-contain shadow-md border border-slate-100 bg-white" 
                    onError={(e) => { e.currentTarget.src = logo; }}
                  />
                  <span className="text-sm font-black text-primary">{churchName}</span>
                  <button onClick={() => setActiveSection('settings')} className="p-2 text-primary hover:bg-slate-100 rounded-full">
                    <Settings size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <img src={getValidLogoUrl(null, appLogo)} alt="Logo" onError={(e) => { e.currentTarget.src = logo; }} className="h-10 w-10 rounded-full object-contain shadow-md border border-slate-100 bg-white" />
                  <div className="hidden sm:block">
                    <h1 className="text-xl font-black text-primary leading-none">مهرجان الكرازة {activeYear}</h1>
                    <p className="text-accent text-xs font-bold mt-1">يعظم انتصارنا بالذي أحبنا</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn && (
              <div className="flex items-center gap-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {userRole === 'admin' ? 'أدمن' : (userRole === 'church' ? 'كنيسة' : 'رتبة')}
                  </span>
                  <span className="text-sm font-black text-primary">
                    {user?.displayName || ((userRole === 'admin' && churchName === 'المطرانية') ? 'اللجنة المركزية منطقة18' : (churchName || 'اللجنة المركزية منطقة18'))}
                  </span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 bg-primary/5 text-primary rounded-2xl hover:bg-primary/10 transition-all shadow-sm"
                  title="تسجيل الخروج"
                >
                  <LogOut size={20} />
                </button>
              </div>
            )}
            {/* Removed redundant Menu button as requested */}
          </div>
        </div>
      </header>

      {!isLoggedIn && activeSection !== 'schedule' ? (
        activeSection === 'locked' ? (
          <main className="w-full min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 bg-slate-50">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 sm:p-10 rounded-2xl shadow-md border border-slate-100 text-center space-y-6 flex flex-col items-center justify-center font-arabic w-full max-w-md my-auto"
                dir="rtl"
              >
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                  <Lock size={40} className="stroke-[2.5]" />
                </div>
                <div className="space-y-2 col-span-full">
                  <h2 className="text-2xl font-black text-slate-800">الحساب مغلق 🔒</h2>
                  <p className="text-slate-500 font-bold leading-relaxed text-sm">
                    عذرًا، تم إغلاق التسجيل أو قفل الحساب الخاص بكنيستكم من قبل لجنة المهرجان بقرار مركزي سيادي!
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold text-slate-600 leading-relaxed">
                  يرجى مراجعة الكنترول العام أو الدعم الفني للمهرجان لإنهاء الإجراءات وطلب فك القفل اللوجستي.
                </div>
                <button
                  onClick={() => {
                    setActiveSection('home');
                  }}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-850 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <span>العودة للرئيسية</span>
                </button>
              </motion.div>
            </div>
          </main>
        ) : (
          <main className="w-full min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 bg-slate-50">
            <div className="w-full max-w-7xl mx-auto flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md my-auto shadow-slate-200/50"
              >
              <div className="text-center mb-10">
                <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-20 h-20 rounded-full mx-auto mb-6 object-contain shadow-sm border border-slate-50 bg-white" />
                <h2 className="text-2xl font-black text-slate-800">تسجيل الدخول</h2>
                <p className="text-slate-500 text-sm mt-2 font-bold">يرجى اختيار الكنيسة وإدخال الكود الخاص بها</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-8">
                {/* Honeypot Anti-Bot Field */}
                <input
                  type="text"
                  name="_sub_backend_version_gate"
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: 'auto',
                    width: '1px',
                    height: '1px',
                    overflow: 'hidden',
                    opacity: 0
                  }}
                  tabIndex={-1}
                  autoComplete="new-password"
                  aria-hidden="true"
                  value={loginHoneypot}
                  onChange={(e) => setLoginHoneypot(e.target.value)}
                />
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                    اسم الكنيسة
                  </label>
                  <select
                    value={loginChurch}
                    onChange={(e) => setLoginChurch(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary focus:ring-0 transition-all shadow-none appearance-none"
                    required
                  >
                    <option value="">اختر الكنيسة</option>
                    <option value="مسئول">دخول مسئول (Admin)</option>
                    {Array.from(new Set([
                      ...dbChurches,
                      ...publicChurches.map(c => c.name)
                    ])).sort().map(church => (
                      <option key={church} value={church}>{church}</option>
                    ))}
                  </select>
                  {loginChurch && loginChurch !== 'مسئول' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 mt-4 p-2 bg-slate-50 rounded-xl border border-slate-200"
                    >
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                        {publicChurches.find(c => c.name === loginChurch)?.logoUrl ? (
                          <img 
                            src={getValidLogoUrl(publicChurches.find(c => c.name === loginChurch)?.logoUrl, null)} 
                            onError={(e) => { e.currentTarget.src = logo; }}
                            alt="Church Logo" 
                            className="w-full h-full object-contain bg-white"
                          />
                        ) : (
                          <Church size={20} className="text-slate-300" />
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-700">{loginChurch}</span>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                    كود الكنيسة
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value)}
                      placeholder="أدخل الكود الخاص بالكنيسة"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary focus:ring-0 transition-all shadow-none text-center font-mono"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="rememberMe" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="rememberMe" className="text-xs font-black text-slate-500 cursor-pointer">تذكرني على هذا الجهاز</label>
                </div>

                {loginError && (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-red-500 text-xs font-bold text-center bg-red-50 py-3 rounded-lg border border-red-100"
                  >
                    {loginError}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-primary text-white rounded-lg font-black text-lg shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={20} />
                      <span>دخول</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
            </div>
          </main>
        )
      ) : (
        <div 
          className={`min-h-screen w-full max-w-full overflow-x-hidden transition-all duration-500 ${dashboardBg ? 'bg-fixed bg-cover bg-center' : 'bg-slate-50'}`}
          style={dashboardBg ? { backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.9), rgba(248, 250, 252, 0.9)), url(${dashboardBg})` } : {}}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-w-0">
          {notification && (
          <Notification message={notification} onClose={() => setNotification(null)} />
        )}
        <AnimatePresence mode="wait">
        {activeSection === 'home' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <NewsHeroSlider news={news} carouselItems={carouselItems} appLogo={appLogo} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div 
                onClick={() => setActiveSection(userRole === 'admin' ? 'admin_dashboard' : 'church_dashboard')}
                className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-coptic-blue/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <LayoutDashboard className="text-coptic-blue" size={32} />
                </div>
                <h3 className="text-xl font-black text-coptic-blue mb-2">{userRole === 'admin' ? 'مركز المسئول' : 'صفحة الكنيسة'}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">اطلع على كافة البيانات والطلبات الخاصة بك.</p>
              </div>

              <div 
                onClick={() => setActiveSection('news')}
                className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Newspaper className="text-emerald-600" size={32} />
                </div>
                <h3 className="text-xl font-black text-coptic-blue mb-2">آخر الأخبار</h3>
                <p className="text-slate-500 text-sm leading-relaxed">تابع أحدث أخبار وتنبيهات المهرجان أولاً بأول.</p>
              </div>

              {/* Removed calculator section */}
              
              <div 
                onClick={() => setActiveSection('exams')}
                className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-coptic-gold/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="text-coptic-gold" size={32} />
                </div>
                <h3 className="text-xl font-black text-coptic-blue mb-2">الامتحانات الإلكترونية</h3>
                <p className="text-slate-500 text-sm leading-relaxed">ادخل على لينكات الامتحانات الإلكترونية المتاحة حالياً.</p>
              </div>

              <div 
                onClick={() => setActiveSection('inquiries')}
                className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare className="text-slate-600" size={32} />
                </div>
                <h3 className="text-xl font-black text-coptic-blue mb-2">الاستفسارات والشكاوي</h3>
                <p className="text-slate-500 text-sm leading-relaxed">تواصل مع اللجنة المركزية لأي استفسار أو شكوى.</p>
              </div>
            </div>

            {/* Latest News Preview */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-coptic-blue">آخر الأخبار</h3>
                <button 
                  onClick={() => setActiveSection('news')}
                  className="text-coptic-blue font-bold text-sm hover:underline"
                >
                  عرض الكل
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {news.slice(0, 4).map(item => (
                  <div key={item.id} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                    {item.imageUrl && (
                      <div 
                        className="h-48 w-full overflow-hidden cursor-pointer"
                        onClick={() => handleImageClick(item.imageUrl!)}
                      >
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="p-6 relative">
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-wider">خبر جديد</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(item.timestamp).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <h4 className="text-lg font-black text-slate-800 mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
                      <div className="relative">
                        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">{item.content}</p>
                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                      </div>
                    </div>
                  </div>
                ))}
                {news.length === 0 && (
                  <div className="col-span-2 text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">لا توجد أخبار حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'exams' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <BackButton />
            <div className="max-w-4xl mx-auto">
              <LiveExamGateway 
                setCurrentScreen={(screen) => {
                  if (screen === 'student-exam') {
                    setActiveSection('exam-login');
                  }
                }}
                setCurrentStudent={() => {}}
                setActiveExam={() => {}}
              />
            </div>
          </motion.div>
        )}

        {activeSection === 'news' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <BackButton />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100%] z-0" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-100 p-2 overflow-hidden transform hover:rotate-3 transition-transform">
                  <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-coptic-blue">أخبار المهرجان</h3>
                  <p className="text-emerald-600 font-bold mt-1">تابع كافة التنبيهات والأخبار الرسمية لعام {activeYear}</p>
                </div>
              </div>
              <div className="relative z-10 hidden lg:block">
                <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black border border-emerald-100 animate-pulse">
                  تحديثات لحظية ⚡
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {news.map(item => (
                <div key={item.id} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-300">
                  {item.imageUrl && (
                    <div 
                      className="h-64 w-full overflow-hidden cursor-pointer"
                      onClick={() => handleImageClick(item.imageUrl!)}
                    >
                      <img 
                        src={item.imageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="text-2xl font-black text-slate-800 group-hover:text-primary transition-colors">{item.title}</h4>
                      <span className="text-xs font-bold text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full shadow-sm">{new Date(item.timestamp).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-lg">{item.content}</p>
                  </div>
                </div>
              ))}
              {news.length === 0 && (
                <div className="col-span-full text-center py-20 bg-white rounded-3xl shadow-xl border border-slate-100">
                  <Newspaper className="mx-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-400 font-bold text-lg">لا توجد أخبار منشورة بعد</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeSection === 'results' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <BackButton />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <Award className="text-indigo-600" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-coptic-blue">نظام النتائج</h3>
                <p className="text-slate-400 font-bold">استعلم عن نتائج مخدوميك في المسابقات</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              {userProfile?.isAllowedToRead === false ? (
                <div className="text-center py-20 bg-amber-50 rounded-3xl border border-amber-100">
                  <Lock className="mx-auto text-amber-500 mb-4" size={48} />
                  <h3 className="text-2xl font-black text-amber-800">عذراً، عرض النتائج متوقف حالياً</h3>
                  <p className="text-amber-600 font-bold mt-2">يرجى التواصل مع الإدارة للمزيد من التفاصيل.</p>
                </div>
              ) : (
                <>
                  <ResultsViewer isAdmin={userRole === 'admin'} />
                </>
              )}
            </div>
          </motion.div>
        )}

        {activeSection === 'church_dashboard' && (
          <motion.div data-admin-dashboard="true" className="admin-dashboard-container space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between">
              <BackButton />
              <button 
                onClick={() => fetchLargeData(true)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 flex flex-row gap-2 transition"
              >
                 تحديث البيانات
              </button>
            </div>

            {/* Universal Filter Engine - Church View */}
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Search size={20} className="text-primary" />
                    <h4 className="font-black text-slate-800 text-lg">محرك البحث الشامل</h4>
                  </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="ابحث بالاسم..."
                    value={globalNameFilter}
                    onChange={(e) => setGlobalNameFilter(e.target.value)}
                    className="w-full pr-4 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary font-bold"
                  />
                </div>
                <select 
                  value={globalStageFilter}
                  onChange={(e) => setGlobalStageFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary font-bold"
                >
                  <option value="الكل">كل المراحل</option>
                  {dynamicLevels.map(l => <option key={l.id || (typeof l === 'string' ? l : l.name)} value={typeof l === 'string' ? l : l.name}>{typeof l === 'string' ? l : l.name}</option>)}
                </select>
                <select 
                  value={globalCompetitionFilter}
                  onChange={(e) => setGlobalCompetitionFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary font-bold"
                >
                  <option value="الكل">كل المسابقات</option>
                  {['دراسي', 'محفوظات', 'قبطي مستوى أول', 'قبطي مستوى ثان'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <QuickActionsHub userRole={userRole === 'super_admin' ? 'admin' : userRole} onAction={(action) => {
              if (action === 'exams_portal') {
                handleOpenExams();
              } else {
                setActiveSection(action);
              }
            }} />
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-coptic-blue/10 rounded-2xl flex items-center justify-center">
                    <UserCircle className="text-coptic-blue" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-coptic-blue">بيانات كنيسة {churchName}</h3>
                    <p className="text-slate-400 font-bold">هنا يمكنك متابعة كافة طلباتك واستفساراتك</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={handleOpenExams}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl hover:scale-105 active:scale-95"
                  >
                    <BookOpen size={18} /> بدء دخول الامتحان (QR Scan)
                  </button>
                  <button 
                    onClick={() => generateMasterExcel(allChurchParticipants, churchName)}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-xl hover:scale-105 active:scale-95"
                  >
                    <Download size={18} /> التصدير الشامل الموحد (Excel)
                  </button>
                </div>
              </div>

              {/* Local Church Analytics Dashboard */}
              <div className="mb-8 space-y-6">
                <h4 className="font-black text-slate-800 text-xl flex items-center gap-2 mb-6">
                    <Layers size={24} className="text-coptic-blue" /> إحصائيات وتتبع الكنيسة
                </h4>
                
                {(() => {
                  const localParticipants = allChurchParticipants.length > 0 ? allChurchParticipants : participants.filter(p => p.churchName === churchName);
                  const totalSubscribers = localParticipants.length;
                  
                  // Card A: Educational Stages
                  const stageCounts = STAGE_ORDER.map(stg => ({
                    name: stg,
                    count: localParticipants.filter(p => p.stage === stg).length
                  })).filter(d => d.count > 0);

                  // Card B: Total Competitions
                  const totalCompetitionsEnrollments = localParticipants.reduce((acc, p) => acc + (p.competitions ? p.competitions.filter(c => c).length : 0), 0);

                  // Insight D: Top Competitions
                  const compCounts: Record<string, number> = {};
                  localParticipants.forEach(p => {
                      (p.competitions || []).forEach(c => {
                          if (c) compCounts[c] = (compCounts[c] || 0) + 1;
                      });
                  });
                  const topComps = Object.entries(compCounts)
                    .sort((a,b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([name, value]) => ({ name, value }));

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Card A: Subscribers by Educational Stage */}
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col shadow-sm">
                        <h5 className="font-bold text-slate-700 bg-white px-4 py-2 rounded-xl mb-4 text-center border border-slate-100 shadow-sm inline-flex items-center justify-center gap-2">
                          <Users size={16} className="text-coptic-blue"/> توزيع المخدومين حسب المراحل
                        </h5>
                        {stageCounts.length > 0 ? (
                          <div className="space-y-3 mt-2">
                            {stageCounts.map((stage, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                <span className="font-bold text-slate-700">{stage.name}</span>
                                <span className="font-black text-coptic-blue bg-blue-50 px-3 py-1 rounded-lg text-sm">{stage.count} مشترك</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <span className="text-slate-400 text-sm font-bold italic">لا يوجد مشتركين بعد</span>
                          </div>
                        )}
                      </div>

                      {/* Card B: True Competition Enrollment Metrics */}
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-center items-center shadow-sm text-center">
                        <h5 className="font-bold text-slate-700 bg-white px-4 py-2 rounded-xl mb-6 border border-slate-100 shadow-sm w-full inline-flex items-center justify-center gap-2">
                          <BookOpen size={16} className="text-emerald-600"/> إجمالي الاشتراكات في المسابقات
                        </h5>
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md">
                          <span className="text-3xl font-black text-emerald-600 tabular-nums">{totalCompetitionsEnrollments}</span>
                        </div>
                        <p className="text-lg font-black text-slate-800">إجمالي المسابقات المسجلة</p>
                        <p className="text-sm font-bold text-slate-500 mt-2 bg-white px-4 py-1.5 rounded-full border border-slate-100">
                          من إجمالي: {totalSubscribers} مشترك
                        </p>
                      </div>

                      {/* Insight D: Top Enrolled Competitions */}
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 items-center justify-center flex flex-col shadow-sm">
                        <h5 className="font-bold text-slate-700 bg-white px-4 py-2 rounded-xl mb-2 text-center border border-slate-100 shadow-sm w-full inline-flex items-center justify-center gap-2">
                          <Trophy size={16} className="text-coptic-gold"/> المسابقات الأكثر إقبالاً
                        </h5>
                        <div className="h-48 w-full relative">
                          {topComps.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={topComps} innerRadius={45} outerRadius={70} stroke="none" dataKey="value" paddingAngle={5}>
                                  {topComps.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Tajawal'}} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-slate-400 text-sm font-bold italic">لا توجد اشتراكات بعد</span>
                            </div>
                          )}
                        </div>
                        {topComps.length > 0 && (
                          <div className="w-full mt-4 space-y-2">
                            {topComps.map((comp, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                                  <span className="truncate max-w-[120px]" title={comp.name}>{comp.name}</span>
                                </div>
                                <span>{comp.value} مشترك</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <History size={20} className="text-coptic-gold" /> سجل طلبات الكتب
                  </h4>
                  {userProfile?.isAllowedToRead === false ? (
                    <div className="p-8 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                      <Lock className="mx-auto text-amber-500 mb-2" size={24} />
                      <p className="text-xs text-amber-700 font-bold">تم إيقاف عرض القوائم مؤقتاً</p>
                    </div>
                  ) : orders.filter(o => o.churchName === churchName).length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {orders
                          .filter(o => o.churchName === churchName)
                          .slice((churchOrderPage - 1) * ITEMS_PER_PAGE, churchOrderPage * ITEMS_PER_PAGE)
                          .map(order => (
                          <div key={order.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex justify-between mb-2">
                              <span className="text-xs font-bold text-coptic-blue">{order.timestamp}</span>
                              <span className="font-bold text-coptic-red">{order.grandTotal} ج.م</span>
                            </div>
                            <p className="text-xs text-slate-500">عدد المراحل: {order.details.length}</p>
                          </div>
                        ))}
                      </div>
                      <PaginationComponent 
                        currentPage={churchOrderPage}
                        totalItems={orders.filter(o => o.churchName === churchName).length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setChurchOrderPage}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">لا توجد طلبات سابقة</p>
                  )}
                </div>



                  <div className="space-y-4">


                         <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                           <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
                           <p className="text-sm text-slate-800 font-black">جميع المشتركين مسجلين بنجاح</p>
                           <p className="text-[10px] text-slate-500 font-bold mt-1">يمكنك إدارة البيانات الفردية من قسم "إدارة المشتركين"</p>
                         </div>
                    </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <MessageSquare size={20} className="text-coptic-blue" /> ردود الاستفسارات
                  </h4>
                  {userProfile?.isAllowedToRead === false ? (
                    <div className="p-8 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                      <Lock className="mx-auto text-amber-500 mb-2" size={24} />
                      <p className="text-xs text-amber-700 font-bold">تم إيقاف عرض القوائم مؤقتاً</p>
                    </div>
                  ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {(inquiries || [])
                        .filter(inq => inq.churchName === churchName)
                        .slice((churchInquiryPage - 1) * ITEMS_PER_PAGE, churchInquiryPage * ITEMS_PER_PAGE)
                        .map(inq => (
                        <div key={inq.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <p className="text-sm font-bold text-slate-700 mb-2">{inq.message}</p>
                          {inq.reply ? (
                            <div className="mt-2 p-3 bg-coptic-blue/5 rounded-xl border-r-4 border-coptic-blue">
                              <p className="text-xs font-black text-coptic-blue mb-1">رد المسئول:</p>
                              <p className="text-sm text-slate-600">{inq.reply}</p>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">في انتظار الرد...</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <PaginationComponent 
                      currentPage={churchInquiryPage}
                      totalItems={(inquiries || []).filter(inq => inq.churchName === churchName).length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setChurchInquiryPage}
                    />
                  </div>
                )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'settings' && userRole === 'church' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <BackButton />
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <h2 className="text-2xl font-black text-primary mb-6">إعدادات الكنيسة</h2>
              <p className="text-slate-600">يرجى التواصل مع اللجنة المركزية لتعديل إعدادات الكنيسة.</p>
            </div>
          </motion.div>
        )}

        {activeSection === 'admin_dashboard' && (
          <motion.div data-admin-dashboard="true" className="admin-dashboard-container space-y-8 w-full min-w-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print w-full">
              <div className="flex items-center gap-2">
                <BackButton />
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                  <button 
                    onClick={() => toggleGlobalReadAccess(true)}
                    className={`px-4 py-2 rounded-lg font-black text-[10px] transition-all flex items-center gap-2 ${globalReadAccess ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <Check size={14} /> تفعيل القراءة للجميع
                  </button>
                  <button 
                    onClick={() => toggleGlobalReadAccess(false)}
                    className={`px-4 py-2 rounded-lg font-black text-[10px] transition-all flex items-center gap-2 ${!globalReadAccess ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}
                  >
                    <X size={14} /> إيقاف القراءة عن الجميع
                  </button>
                </div>
              </div>
              <button 
                onClick={() => fetchLargeData(true)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 flex flex-row gap-2 transition"
              >
                 تحديث البيانات
              </button>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[700px] flex flex-col lg:flex-row w-full min-w-0">
              {/* Sidebar Navigation */}
              <div className="w-full lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-l border-slate-700 flex flex-col no-print min-h-full">
                <div className="p-6 border-b border-slate-800">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-coptic-red text-white rounded-xl flex items-center justify-center shadow-lg">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white leading-tight">مركز الإدارة</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">المنطقة ١٨</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">تصفية حسب الكنيسة</label>
                    <select 
                      value={globalChurchFilter === 'الكل' ? '' : globalChurchFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGlobalChurchFilter(val === '' || val === 'all' ? 'الكل' : val);
                      }}
                      className="w-full px-4 py-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary font-bold shadow-sm"
                    >
                      <option value="" className="bg-slate-800 text-white">عرض الكل</option>
                      {churchOptions.map(church => (
                        <option key={church} value={church} className="bg-slate-800 text-white">{church}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 mt-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase">بحث بالاسم</label>
                    <input 
                      type="text"
                      placeholder="ابحث بالاسم..."
                      value={globalNameFilter}
                      onChange={(e) => setGlobalNameFilter(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary font-bold shadow-sm placeholder-slate-400"
                    />
                  </div>
                  <div className="mt-6">
                    <button 
                      onClick={() => generateMasterExcel(allChurchParticipants, userRole === 'admin' ? null : churchName)}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Download size={14} />  تحميل بيانات المشتركين (Excel)
                    </button>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2 h-auto lg:h-full overflow-x-auto lg:overflow-y-auto no-scrollbar lg:custom-scrollbar">
                  <div className="flex gap-2 lg:flex-col lg:space-y-1">
                    {visibleAdminTabs.map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setAdminActiveTab(tab.id)}
                        className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-sm text-right cursor-pointer ${
                          adminActiveTab === tab.id 
                            ? 'bg-primary text-white shadow-md transform lg:scale-[1.02]' 
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
                        }`}
                      >
                        <tab.icon size={18} className={adminActiveTab === tab.id ? 'text-white' : 'text-slate-400'} />
                        <span className="flex-1 whitespace-nowrap">{tab.label}</span>
                        {adminActiveTab === tab.id && <ChevronLeft size={16} className="text-white/50 hidden lg:block" />}
                      </button>
                    ))}
                  </div>
                  
                  {/* Customization Button */}
                  <div className="border-t border-slate-800 lg:border-none mt-auto pt-4 pb-2 lg:pt-8 w-full flex justify-center">
                    <button 
                      onClick={openCustomizeModal}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 hover:text-white transition-colors font-black text-xs min-w-[200px] lg:min-w-0 border border-slate-700/60 cursor-pointer"
                    >
                      <Sliders size={16} /> خصص مركز التحكم
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-4 sm:p-6 md:p-8 min-w-0 bg-white overflow-y-auto w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={adminActiveTab}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="w-full min-w-0"
                  >

              {adminActiveTab === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0 mb-12">
                <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm w-full">
                  <p className="text-[10px] font-black text-coptic-blue uppercase mb-1">المشتركين ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {analyticsData.totalParticipants}
                  </p>
                </div>
                <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm w-full">
                  <p className="text-[10px] font-black text-coptic-gold uppercase mb-1">طلبات الكتب ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {analyticsData.totalOrders}
                  </p>
                </div>
                <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm w-full">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">الفرق ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {analyticsData.totalTeams}
                  </p>
                </div>
                <div className="p-6 bg-white rounded-xl border border-gray-100 shadow-sm w-full">
                  <p className="text-[10px] font-black text-coptic-red uppercase mb-1">الاستفسارات ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {(inquiries || []).filter(i => globalChurchFilter === 'الكل' || i.churchName === globalChurchFilter).length}
                  </p>
                </div>
              </div>

                  <div className="mb-12 p-6 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                    <div>
                      <h4 className="font-black text-slate-800">تصدير البيانات المجمعة</h4>
                      <p className="text-xs text-slate-400 font-bold">تحميل كافة بيانات التسجيل (مشتركين + فرق) في ملف واحد</p>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-2">
                      <button 
                        onClick={() => downloadMasterTemplate()}
                        className="px-6 py-3 bg-coptic-red text-white rounded-2xl font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                      >
                        <Award size={20} /> تحميل قالب التسجيل المعتمد
                      </button>
                      <button 
                        onClick={() => generateMasterExcel(allChurchParticipants, userRole === 'admin' ? null : churchName)}
                        className="px-6 py-3 bg-coptic-blue text-white rounded-2xl font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                      >
                        <Download size={20} /> {userRole === 'admin' ? 'تصدير كل بيانات التسجيل الموحد (Excel)' : 'تحميل بيانات المشتركين بصيغة XLSX'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {adminActiveTab === 'news' && (
                <div className="grid grid-cols-1 gap-16">
                  <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                      <Newspaper className="text-coptic-red" /> إدارة الأخبار العاجلة
                    </h4>
                    {/* ... Existing News Form ... */}
                  
                  <form onSubmit={handleNewsSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">عنوان الخبر</label>
                        <input 
                          type="text"
                          value={newNews.title}
                          onChange={(e) => setNewNews({...newNews, title: e.target.value})}
                          placeholder="أدخل عنواناً جذاباً..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">محتوى الخبر</label>
                        <textarea 
                          value={newNews.content}
                          onChange={(e) => setNewNews({...newNews, content: e.target.value})}
                          placeholder="اكتب تفاصيل الخبر هنا..."
                          rows={4}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold resize-none"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">صورة الخبر</label>
                        <div className="relative h-48 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-primary transition-colors cursor-pointer overflow-hidden group">
                          {isLoading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3">
                              <Loader2 className="animate-spin text-coptic-red" size={32} />
                              <p className="text-xs font-black text-slate-600">جاري معالجة الصورة...</p>
                            </div>
                          )}
                          {newNews.image ? (
                            <>
                              <img 
                                src={URL.createObjectURL(newNews.image)} 
                                alt="Preview" 
                                className="absolute inset-0 w-full h-full object-cover opacity-50"
                              />
                              <div className="relative z-10 text-center">
                                <CheckCircle2 className="text-emerald-500 mx-auto mb-2" size={32} />
                                <p className="text-xs font-black text-slate-800">{newNews.image.name}</p>
                              </div>
                            </>
                          ) : editingNews ? (
                            <>
                              <img 
                                src={editingNews.imageUrl} 
                                alt="Current" 
                                className="absolute inset-0 w-full h-full object-cover opacity-50"
                              />
                              <div className="relative z-10 text-center">
                                <ImageIcon className="text-primary mx-auto mb-2" size={32} />
                                <p className="text-xs font-black text-slate-800">تغيير الصورة الحالية</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <Upload className="text-slate-300 group-hover:text-primary transition-colors" size={32} />
                              <p className="text-xs font-black text-slate-400">اسحب الصورة هنا أو اضغط للاختيار</p>
                            </>
                          )}
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewNews({...newNews, image: e.target.files?.[0] || null})}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 py-4 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-lg disabled:opacity-50"
                        >
                          {isLoading ? 'جاري الحفظ...' : <><Send size={20} /> {editingNews ? 'تحديث الخبر' : 'نشر الخبر الآن'}</>}
                        </button>
                        {editingNews && (
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingNews(null);
                              setNewNews({ title: '', content: '', image: null });
                            }}
                            className="px-6 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black hover:bg-slate-300 transition-all"
                          >
                            إلغاء
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <h5 className="text-sm font-black text-slate-400 uppercase">الأخبار المنشورة مؤخراً</h5>
                      <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="text" 
                            placeholder="بحث في الأخبار..."
                            value={newsSearch}
                            onChange={(e) => setNewsSearch(e.target.value)}
                            className="w-full pr-10 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-primary transition-all outline-none shadow-sm"
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="فلترة بالتاريخ..."
                          value={newsFilterDate}
                          onChange={(e) => setNewsFilterDate(e.target.value)}
                          className="w-full md:w-40 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:border-primary transition-all outline-none shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredNews
                        .slice((newsPage - 1) * 20, newsPage * 20)
                        .map((item) => (
                        <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex gap-4 items-center shadow-sm">
                          <img 
                            src={item.imageUrl} 
                            alt="" 
                            className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                            referrerPolicy="no-referrer"
                            onClick={() => item.imageUrl && handleImageClick(item.imageUrl)}
                          />
                          <div className="flex-1 min-w-0">
                            <h6 className="font-black text-slate-800 truncate">{item.title}</h6>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(item.timestamp).toLocaleDateString('ar-EG')}</p>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                setEditingNews(item);
                                setNewNews({ title: item.title, content: item.content, image: null });
                              }}
                              className="p-2 text-slate-300 hover:text-primary transition-colors"
                            >
                              <FileText size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteNews(item.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <PaginationComponent 
                      currentPage={newsPage}
                      totalItems={filteredNews.length}
                      itemsPerPage={20}
                      onPageChange={setNewsPage}
                    />
                  </div>
                </section>

                <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                    <ImageIcon className="text-primary" /> إدارة صور السلايدر (Slider)
                  </h4>
                  
                  <form onSubmit={handleCarouselSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">عنوان الصورة</label>
                        <input 
                          type="text"
                          value={newCarousel.title}
                          onChange={(e) => setNewCarousel({...newCarousel, title: e.target.value})}
                          placeholder="أدخل عنواناً للصورة..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">الترتيب</label>
                        <input 
                          type="number"
                          value={newCarousel.order}
                          onChange={(e) => setNewCarousel({...newCarousel, order: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">الصورة</label>
                        <div className="relative h-40 bg-white border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-primary transition-colors cursor-pointer overflow-hidden group">
                          {newCarousel.image ? (
                            <>
                              <img 
                                src={URL.createObjectURL(newCarousel.image)} 
                                alt="Preview" 
                                className="absolute inset-0 w-full h-full object-cover opacity-50"
                              />
                              <p className="relative z-10 text-xs font-black text-slate-800">{newCarousel.image.name}</p>
                            </>
                          ) : editingCarousel ? (
                            <>
                              <img 
                                src={editingCarousel.url} 
                                alt="Current" 
                                className="absolute inset-0 w-full h-full object-cover opacity-50"
                              />
                              <p className="relative z-10 text-xs font-black text-slate-800">تغيير الصورة</p>
                            </>
                          ) : (
                            <>
                              <Upload className="text-slate-300 group-hover:text-primary transition-colors" size={32} />
                              <p className="text-xs font-black text-slate-400">اختر صورة</p>
                            </>
                          )}
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewCarousel({...newCarousel, image: e.target.files?.[0] || null})}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 py-3 bg-primary text-white rounded-2xl font-black hover:bg-opacity-90 transition-all shadow-lg"
                        >
                          {editingCarousel ? 'تحديث' : 'إضافة للسلايدر'}
                        </button>
                        {editingCarousel && (
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingCarousel(null);
                              setNewCarousel({ title: '', image: null, order: 0 });
                            }}
                            className="px-4 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black"
                          >
                            إلغاء
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {carouselItems.map(item => (
                      <div key={item.id} className="relative group rounded-2xl overflow-hidden aspect-video shadow-md">
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 text-center">
                          <p className="text-white text-[10px] font-black">{item.title}</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditingCarousel(item);
                                setNewCarousel({ title: item.title, image: null, order: item.order || 0 });
                              }}
                              className="p-1.5 bg-white text-primary rounded-lg hover:bg-accent hover:text-white transition-colors"
                            >
                              <FileText size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteCarousel(item.id)}
                              className="p-1.5 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {adminActiveTab === 'participants' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Users className="text-coptic-blue" /> إدارة المشتركين
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => setIsAdminBulkRegisterOpen(true)}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 hover:from-emerald-600 hover:to-teal-700 transition-all hover:scale-105 active:scale-95 animate-fade-in"
                    >
                      <UserPlus size={14} /> التسجيل الجماعي (Bulk)
                    </button>
                    <button 
                      onClick={handleDetectDuplicates}
                      disabled={isScanningDuplicates}
                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      {isScanningDuplicates ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />} فحص الأسماء المكررة
                    </button>
                    {undoableDuplicates && undoableDuplicates.length > 0 && (
                      <button 
                        onClick={handleUndoDuplicates}
                        disabled={isRestoringDuplicates}
                        className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-amber-100 transition-colors"
                      >
                        {isRestoringDuplicates ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} استرداد ({undoableDuplicates.length})
                      </button>
                    )}
                    <button 
                      onClick={exportAllRegistrationsToExcel}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
                    >
                      <Download size={14} /> Excel
                    </button>
                    <button 
                      onClick={openParticipantsPdfExport}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm"
                    >
                      <Printer size={14} /> طباعة / PDF
                    </button>
                  </div>
                </div>

                {/* Deduplication & Preview Panel */}
                {detectedDuplicates !== null && (
                  <div className="mb-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all animate-fade-in">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <h5 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                          معاينة وتطهير الأسماء المكررة (Deduplication Preview)
                        </h5>
                        <p className="text-xs text-slate-500 mt-1">
                          {detectedDuplicates.length === 0 
                            ? "قاعدة البيانات نظيفة تماماً! لم يتم العثور على أي أسماء مكررة بالتطابق التام." 
                            : `وجدنا عدد ${detectedDuplicates.length} من الأسماء المسجلة مكررة بالتطابق التام (مع تجاهل المسافات الزائدة).`
                          }
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {detectedDuplicates.length > 0 && (
                          <button
                            onClick={handleConfirmDeleteDuplicates}
                            disabled={isDeletingDuplicates}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all"
                          >
                            {isDeletingDuplicates ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            تأكيد مسح {detectedDuplicates.length} أسماء مكررة
                          </button>
                        )}
                        <button
                          onClick={() => setDetectedDuplicates(null)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all"
                        >
                          إلغاء المعاينة
                        </button>
                      </div>
                    </div>

                    {detectedDuplicates.length > 0 && (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <label className="text-[10px] font-black text-slate-400 block mb-2">قائمة السجلات التابعة (Trailing Duplicates) المقترح حذفها:</label>
                        <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-600">
                          {detectedDuplicates.map((dup, index) => (
                            <div key={dup.id || index} className="py-2.5 px-3 flex items-center justify-between hover:bg-white rounded-lg transition-colors">
                              <span className="text-slate-700">وجدنا اسم <strong className="text-rose-600">'{dup.name}'</strong> مكرر</span>
                              <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md font-mono">
                                {dup.churchName || 'بدون كنيسة'} • {dup.stage || 'بدون مرحلة'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
                  {/* 1. فلتر الكنيسة */}
                  {userRole === 'admin' && (
                    <div className="flex-1 w-full flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400">البلد/الكنيسة</label>
                      <select 
                        value={partChurchFilter}
                        onChange={(e) => setPartChurchFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                      >
                        <option value="الكل">كل الكنائس</option>
                        {Array.from(new Set(publicChurches.map((c: any) => c.name))).sort().map(church => (
                          <option key={church} value={church}>{church}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* 2. فلتر المرحلة */}
                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400">المرحلة</label>
                    <select 
                      value={partStageFilter}
                      onChange={(e) => setPartStageFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                    >
                      <option value="الكل">كل المراحل</option>
                      {dynamicLevels.map(l => (
                        <option key={l.id || (typeof l === 'string' ? l : l.name)} value={typeof l === 'string' ? l : l.name}>
                          {typeof l === 'string' ? l : l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. فلتر المسابقة */}
                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400">المسابقة</label>
                    <select 
                      value={partCompFilter}
                      onChange={(e) => setPartCompFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                    >
                      <option value="الكل">مسابقة (الكل)</option>
                      {['دراسي', 'محفوظات', 'قبطي مستوى أول', 'قبطي مستوى ثان'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* 4. البحث بالاسم */}
                  <div className="flex-2 w-full flex flex-col gap-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400">البحث بالاسم</label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text"
                        placeholder="ابحث بالاسم واضغط Enter..."
                        className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            fetchParticipantsPage(true, true, participantSearch);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* 5. زر بحث */}
                  <button 
                    onClick={() => fetchParticipantsPage(true, true, participantSearch)}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow-md hover:bg-slate-800 transition-colors w-full md:w-auto mt-2 md:mt-0"
                  >
                    بحث
                  </button>
                </div>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-white text-[10px] font-black text-slate-500 uppercase">
                          <th className="p-4 border-b border-slate-100">كود المخدوم</th>
                          <th className="p-4 border-b border-slate-100">الاسم</th>
                          <th className="p-4 border-b border-slate-100">النوع</th>
                          <th className="p-4 border-b border-slate-100">الكنيسة</th>
                          <th className="p-4 border-b border-slate-100">المرحلة</th>
                          <th className="p-4 border-b border-slate-100">المسابقات</th>
                          <th className="p-4 border-b border-slate-100 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredParticipantsList
                          .slice((participantPageCount - 1) * 20, participantPageCount * 20)
                          .map(p => (
                            <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                              
                              {/* 1. كود المخدوم */}
                              <td className="p-4 font-mono text-slate-500 bg-slate-50/50 rounded-md text-right text-xs">
                                {p.id}
                              </td>

                              {/* 2. الاسم */}
                              <td className="p-4 font-bold text-slate-800 text-sm">{p.name}</td>

                              {/* 3. النوع */}
                              <td className="p-4 text-slate-600 text-xs">{p.gender || '--'}</td>

                              {/* 4. الكنيسة */}
                              <td className="p-4 text-slate-600 text-xs">{p.churchName}</td>

                              {/* 5. المرحلة */}
                              <td className="p-4 text-slate-600 text-xs">{p.stage}</td>

                              {/* 6. المسابقات */}
                              <td className="p-4">
                                <div className="flex flex-wrap gap-1">
                                  {(p.competitions || []).map((c, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-[9px] font-black">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </td>

                              {/* 7. الإجراءات */}
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => downloadStudentQRCode(p)}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                    title="تحميل كود QR"
                                  >
                                    <QrCode size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleResetExam(p.id, p.name)}
                                    className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors border border-transparent hover:border-orange-100"
                                    title="إعادة فتح الامتحان"
                                  >
                                    <RotateCcw size={18} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setActiveSection('registration');
                                      handleEditParticipant(p);
                                    }}
                                    className="p-2 text-slate-400 hover:text-coptic-blue transition-colors"
                                    title="تعديل"
                                  >
                                    <Pencil size={18} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      confirmAndDeleteParticipant(p.id);
                                    }}
                                    className="p-2 text-slate-400 hover:text-coptic-red transition-colors"
                                    title="حذف"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>

                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-4">
                    {filteredParticipantsList
                      .slice((participantPageCount - 1) * 20, participantPageCount * 20)
                      .map(p => (
                        <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 text-right">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-mono font-bold mb-1">
                                {p.id}
                              </span>
                              <h5 className="font-bold text-slate-900 text-sm">{p.name}</h5>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.gender === 'أنثى' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                              {p.gender || 'ذكر'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <div className="bg-slate-50/50 p-2 rounded-xl">
                              <span className="block text-[10px] text-slate-400 font-bold mb-0.5">الكنيسة</span>
                              <span className="font-bold text-slate-700">{p.churchName}</span>
                            </div>
                            <div className="bg-slate-50/50 p-2 rounded-xl">
                              <span className="block text-[10px] text-slate-400 font-bold mb-0.5">المرحلة</span>
                              <span className="font-bold text-slate-700">{p.stage}</span>
                            </div>
                          </div>

                          {p.competitions && p.competitions.length > 0 && (
                            <div className="space-y-1">
                              <span className="block text-[10px] text-slate-400 font-bold">المسابقات المسجلة:</span>
                              <div className="flex flex-wrap gap-1">
                                {p.competitions.map((c, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-[9px] font-black">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-50 flex items-center justify-end gap-2 flex-wrap">
                            <button 
                              onClick={() => downloadStudentQRCode(p)}
                              className="px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all font-black flex items-center gap-1 cursor-pointer"
                            >
                              <QrCode size={14} />
                              تحميل QR
                            </button>
                            <button 
                              onClick={() => handleResetExam(p.id, p.name)}
                              className="px-3 py-1.5 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all font-black flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={14} />
                              إعادة فتح الامتحان
                            </button>
                            <button 
                              onClick={() => {
                                setActiveSection('registration');
                                handleEditParticipant(p);
                              }}
                              className="p-2 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                              title="تعديل"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => confirmAndDeleteParticipant(p.id)}
                              className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                              title="حذف"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-slate-400">
                  <PaginationComponent 
                    currentPage={participantPageCount}
                    totalItems={filteredParticipantsList.length}
                    itemsPerPage={20}
                    onPageChange={setParticipantPageCount}
                  />
                  {isParticipantsLoading && (
                    <div className="flex items-center gap-2 text-coptic-blue font-black animate-pulse text-xs">
                       <Loader2 className="animate-spin" size={14} /> جاري التحميل...
                    </div>
                  )}
                  {!isParticipantsLoading && <span className="text-[10px]">عرض ٢٠ مشترك في الصفحة</span>}
                </div>
              </section>
            )}

            {adminActiveTab === 'activity_teams' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Users className="text-emerald-500" /> إدارة الفرق والأنشطة
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
                      <input 
                        type="text"
                        placeholder="ابحث باسم الفريق..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchTeamsPage(true, true, teamSearch)}
                        className="pr-12 pl-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all w-72"
                      />
                    </div>
                    <button 
                      onClick={() => fetchTeamsPage(true, true, teamSearch)}
                      className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/20"
                    >
                      بحث
                    </button>
                    <button 
                      onClick={() => fetchTeamsPage(true, true, teamSearch)}
                      disabled={isTeamsLoading}
                      className="px-4 py-3 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2"
                    >
                      <RotateCw size={18} className={isTeamsLoading ? 'animate-spin' : ''} /> تحديث
                    </button>
                  </div>
                </div>
                  {/* Desktop View Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-white text-[10px] font-black text-slate-500 uppercase">
                          <th className="p-4 border-b border-slate-100 text-right">رقم التعريف (ID)</th>
                          <th className="p-4 border-b border-slate-100 text-right">اسم الفريق / المشترك</th>
                          <th className="p-4 border-b border-slate-100 text-right">النشاط</th>
                          <th className="p-4 border-b border-slate-100 text-right">الكنيسة</th>
                          <th className="p-4 border-b border-slate-100 text-right">عدد الأعضاء</th>
                          <th className="p-4 border-b border-slate-100 text-right">تاريخ التسجيل</th>
                          <th className="p-4 border-b border-slate-100 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activityTeams
                          .slice((teamPageCount - 1) * 20, teamPageCount * 20)
                          .map(t => (
                            <tr key={t.id} className="bg-white hover:bg-slate-50 transition-colors">
                              <td className="p-4 text-slate-400 font-mono text-[10px] select-all">{t.id}</td>
                              <td className="p-4 font-bold text-slate-855 text-xs">{t.team_name || '-'}</td>
                              <td className="p-4 text-slate-700 text-xs font-bold">{(t as any).stage_name || t.activityType || '-'}</td>
                              <td className="p-4 text-slate-600 text-xs">{t.church_name || t.churchName || '-'}</td>
                              <td className="p-4 text-slate-600 text-xs font-bold">{t.members_number ?? (t.members?.length || 0)}</td>
                              <td className="p-4 text-slate-505 text-xs font-mono">{t.timestamp ? new Date(t.timestamp).toLocaleDateString('ar-EG') : '-'}</td>
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => handleEditTeam(t)}
                                    className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                                    title="تعديل"
                                  >
                                    <FileText size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteTeam(t.id)}
                                    className="p-2 text-slate-400 hover:text-coptic-red transition-colors"
                                    title="حذف"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="block md:hidden space-y-4">
                    {activityTeams
                      .slice((teamPageCount - 1) * 20, teamPageCount * 20)
                      .map(t => (
                        <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 text-right">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-650 rounded-lg text-[9px] font-mono font-bold mb-1">
                                ID: {t.id}
                              </span>
                              <h5 className="font-bold text-slate-900 text-sm">{t.team_name || '-'}</h5>
                            </div>
                            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                              {(t as any).stage_name || t.activityType || '-'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <span className="block text-[10px] text-slate-400 font-bold mb-0.5">الكنيسة</span>
                              <span className="font-bold text-slate-700">{t.church_name || t.churchName || '-'}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-xl">
                              <span className="block text-[10px] text-slate-400 font-bold mb-0.5">عدد الأعضاء</span>
                              <span className="font-bold text-slate-700">{t.members_number ?? (t.members?.length || 0)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                            <span className="text-[10px] text-slate-400 font-mono">
                              سُجل في: {t.timestamp ? new Date(t.timestamp).toLocaleDateString('ar-EG') : '-'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleEditTeam(t)}
                                className="p-2 text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                                title="تعديل"
                              >
                                <FileText size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteTeam(t.id)}
                                className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                                title="حذف"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-slate-400">
                  <PaginationComponent 
                    currentPage={teamPageCount}
                    totalItems={activityTeams.length}
                    itemsPerPage={20}
                    onPageChange={setTeamPageCount}
                  />
                  {isTeamsLoading && (
                    <div className="flex items-center gap-2 text-coptic-blue font-black animate-pulse text-xs">
                       <Loader2 className="animate-spin" size={14} /> جاري التحميل...
                    </div>
                  )}
                  {!isTeamsLoading && <span className="text-[10px]">عرض ٢٠ فريق في الصفحة</span>}
                </div>
              </section>
            )}

            {adminActiveTab === 'omr' && (
              <OmrGenerator allStudents={allChurchParticipants} />
            )}

            {adminActiveTab === 'rotating_gate' && (
              <AdminDisplayGate isInline={true} />
            )}

            {adminActiveTab === 'results' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <ResultsViewer isAdmin={userRole === 'admin'} onReset={(id) => handleResetExam(id)} />
              </section>
            )}



            {adminActiveTab === 'orders' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="text-coptic-red" /> إدارة طلبات الكتب
                  </h4>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={openOrdersPdfExport}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm"
                    >
                      <Printer size={14} /> طباعة / PDF
                    </button>
                    <button 
                      onClick={() => fetchOrdersPage(true, true)}
                      disabled={isOrdersLoading}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition flex items-center gap-2"
                    >
                      <RotateCw size={18} className={isOrdersLoading ? 'animate-spin' : ''} /> تحديث
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] font-black text-slate-500 uppercase">
                        <th className="p-4 border-b border-slate-100">الكنيسة</th>
                        <th className="p-4 border-b border-slate-100">التاريخ</th>
                        <th className="p-4 border-b border-slate-100">الإجمالي</th>
                        <th className="p-4 border-b border-slate-100 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(orders || [])
                        .filter(o => adminFilterChurch === 'الكل' || o.churchName === adminFilterChurch)
                        .slice((orderPageCount - 1) * 20, orderPageCount * 20)
                        .map(o => (
                          <tr key={o.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 text-sm">{o.churchName}</td>
                            <td className="p-4 text-slate-600 text-xs">{o.timestamp}</td>
                            <td className="p-4 font-black text-coptic-red">{o.grandTotal} ج.م</td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => setViewingOrder(o)}
                                  className="p-2 text-slate-400 hover:text-coptic-blue transition-colors"
                                  title="عرض تفاصيل الطلب"
                                >
                                  <Eye size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteOrder(o.id)}
                                  className="p-2 text-slate-400 hover:text-coptic-red transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-slate-400">
                  <PaginationComponent 
                    currentPage={orderPageCount}
                    totalItems={(orders || []).filter(o => adminFilterChurch === 'الكل' || o.churchName === adminFilterChurch).length}
                    itemsPerPage={20}
                    onPageChange={setOrderPageCount}
                  />
                  {isOrdersLoading && (
                    <div className="flex items-center gap-2 text-coptic-blue font-black animate-pulse text-xs">
                       <Loader2 className="animate-spin" size={14} /> جاري التحميل...
                    </div>
                  )}
                  {!isOrdersLoading && <span className="text-[10px]">عرض ٢٠ طلب في الصفحة</span>}
                </div>
              </section>
            )}

            {adminActiveTab === 'inquiries' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <MessageSquare className="text-coptic-blue" /> إدارة الاستفسارات
                  </h4>
                </div>
                <div className="space-y-6">
                  {(inquiries || [])
                    .filter(i => adminFilterChurch === 'الكل' || i.churchName === adminFilterChurch)
                    .slice((inquiryPage - 1) * 20, inquiryPage * 20)
                    .map(i => (
                      <div key={i.id} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="font-black text-slate-800">{i.churchName}</p>
                            <p className="text-xs text-slate-400 font-bold">{i.timestamp}</p>
                          </div>
                          <button 
                            onClick={() => handleDeleteInquiry(i.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <p className="text-slate-600 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-100">{i.message}</p>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="اكتب الرد هنا..."
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue"
                            id={`reply-${i.id}`}
                            defaultValue={i.reply || ''}
                          />
                          <button 
                            onClick={() => {
                              const reply = (document.getElementById(`reply-${i.id}`) as HTMLInputElement).value;
                              handleReplyInquiry(i.id, reply);
                            }}
                            className="px-4 py-2 bg-coptic-blue text-white rounded-xl text-xs font-black hover:bg-opacity-90 transition-all"
                          >
                            إرسال الرد
                          </button>
                        </div>
                      </div>
                    ))}
                  <PaginationComponent 
                    currentPage={inquiryPage}
                    totalItems={(inquiries || []).filter(i => adminFilterChurch === 'الكل' || i.churchName === adminFilterChurch).length}
                    itemsPerPage={20}
                    onPageChange={setInquiryPage}
                  />
                </div>
              </section>
            )}

            {adminActiveTab === 'schedules' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                  <Calendar className="text-accent" /> إدارة جداول الامتحانات
                </h4>
                
                <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">اسم الامتحان</label>
                    <select 
                      value={newSchedule.examName}
                      onChange={(e) => setNewSchedule({...newSchedule, examName: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    >
                      <option value="">-- اختر المسابقة --</option>
                      <option value="دراسي ومحفوظات وقبطي">دراسي ومحفوظات وقبطي</option>
                      {Array.from(new Set(dynamicLevels.flatMap(l => l.comps || []))).sort().map(comp => (
                        <option key={comp} value={comp}>{comp}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">التاريخ</label>
                    <input 
                      type="text"
                      value={newSchedule.date}
                      onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                      placeholder="مثال: الجمعة 20 مارس"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">الوقت</label>
                    <input 
                      type="text"
                      value={newSchedule.time}
                      onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                      placeholder="مثال: 4:00 م - 6:00 م"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المكان</label>
                    <input 
                      type="text"
                      value={newSchedule.location}
                      onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                      placeholder="مثال: قاعة القديس مارمرقس"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                  <div className="flex items-end gap-2 lg:col-span-2">
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3 bg-primary text-white rounded-2xl font-black hover:bg-opacity-90 transition-all shadow-lg"
                    >
                      {editingSchedule ? 'تحديث' : 'إضافة'}
                    </button>
                    {editingSchedule && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingSchedule(null);
                          setNewSchedule({ examName: 'دراسي ومحفوظات وقبطي', date: '', time: '', location: '' });
                        }}
                        className="px-4 py-3 bg-slate-200 text-slate-600 rounded-2xl font-black"
                      >
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white text-xs font-black text-slate-500 uppercase">
                        <th className="p-4">الامتحان</th>
                        <th className="p-4">التاريخ والوقت</th>
                        <th className="p-4">المكان</th>
                        <th className="p-4">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schedules.map(s => (
                        <tr key={s.id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-primary">{s.examName}</td>
                          <td className="p-4 text-slate-600">{s.date} | {s.time}</td>
                          <td className="p-4 text-slate-600">{s.location}</td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  setEditingSchedule(s);
                                  setNewSchedule({ ...s });
                                }}
                                className="p-2 text-slate-300 hover:text-primary transition-colors"
                              >
                                <FileText size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteSchedule(s.id)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {adminActiveTab === 'exams_management' && (
              <section className="space-y-6">
                {/* Sub-tabs Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4 font-arabic" dir="rtl">
                  <div className="flex items-center gap-2">
                    <BookOpen className="text-primary" size={24} />
                    <h4 className="text-xl font-black text-slate-800">
                      بناء وتوليد نماذج الامتحانات
                    </h4>
                  </div>
                  
                  <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto shadow-inner">
                    <button
                      onClick={() => setExamsManagementSubTab('electronic')}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        examsManagementSubTab === 'electronic'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      الامتحانات الإلكترونية 💻
                    </button>
                    <button
                      onClick={() => setExamsManagementSubTab('paper_models')}
                      className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        examsManagementSubTab === 'paper_models'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      النماذج الورقية الذكية (أوفلاين) 📝
                    </button>
                  </div>
                </div>

                {examsManagementSubTab === 'electronic' ? (
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                    <ExamBuilder stages={dynamicLevels} />
                  </div>
                ) : (
                  <ExamModelsDashboard />
                )}
              </section>
            )}

            {adminActiveTab === 'calculator' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200 font-arabic">
                <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                  <Calculator className="text-primary" /> إدارة حاسبة الكتب
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المادة (النشاط)</label>
                    <select 
                      value={newCalculatorSetting.material}
                      onChange={(e) => handleCalculatorMaterialChange(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold font-arabic"
                    >
                      <option value="">-- اختر المادة --</option>
                      {['دراسي', 'محفوظات', 'قبطي', 'تطبيقات', 'أنشطة'].map((act) => (
                        <option key={act} value={act}>{act}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المرحلة</label>
                    <select 
                      value={newCalculatorSetting.stage}
                      onChange={(e) => setNewCalculatorSetting({...newCalculatorSetting, stage: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold font-arabic"
                      required
                    >
                      <option value="">-- اختر المرحلة --</option>
                      {calculatorFilteredStages.map((lvl) => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">السعر</label>
                    <input 
                      type="number"
                      value={newCalculatorSetting.price}
                      onChange={(e) => setNewCalculatorSetting({...newCalculatorSetting, price: Number(e.target.value)})}
                      placeholder="0"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold tabular-nums font-arabic"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveCalculatorSetting}
                  disabled={isSubmittingCalculator}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-opacity-90 transition-all mb-8 font-arabic"
                >
                  {isSubmittingCalculator ? 'جاري الحفظ...' : 'حفظ الإعداد'}
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-arabic">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800">الكتب المضافة</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-900 text-[11px] uppercase font-black border-b border-slate-100">
                          <th className="px-6 py-4 border-l border-slate-100">المرحلة</th>
                          <th className="px-6 py-4 border-l border-slate-100">المادة</th>
                          <th className="px-6 py-4 border-l border-slate-100">السعر</th>
                          <th className="px-6 py-4 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {isCalculatorLoading ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center">
                              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                            </td>
                          </tr>
                        ) : calculatorSettings.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold">
                              لا توجد كتب مضافة حالياً
                            </td>
                          </tr>
                        ) : (
                          calculatorSettings
                            .sort((a, b) => sortStages(a.stage, b.stage))
                            .map((setting) => (
                            <tr key={setting.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-800 border-l border-slate-100">{setting.stage}</td>
                              <td className="px-6 py-4 font-bold text-slate-600 border-l border-slate-100">{setting.material}</td>
                              <td className="px-6 py-4 font-black text-primary border-l border-slate-100 tabular-nums">{setting.price} ج.م</td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingCalculatorSetting(setting);
                                      setNewCalculatorSetting({
                                        stage: setting.stage,
                                        material: setting.material,
                                        price: setting.price
                                      });
                                    }}
                                    className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                                    title="تعديل"
                                  >
                                    <FileText size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCalculatorSetting(setting.id)}
                                    className="p-2 text-coptic-red hover:bg-red-50 rounded-lg transition-colors"
                                    title="حذف"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}



            {adminActiveTab === 'users_management' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <UserManagement />
              </section>
            )}

            {adminActiveTab === 'dynamic_management' && (
              <div className="space-y-12">
                <DynamicAdminSettings allStudents={allChurchParticipants} />
                
                {/* BATCH UPLOAD FIREWALL SECTION */}
                {userRole === 'admin' && (
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-8 rounded-3xl mb-12">
                  <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div>
                      <h4 className="font-black text-xl text-slate-800 flex items-center gap-2 mb-2">
                        <FileSpreadsheet className="text-primary" /> رفع ملف المشتركين المجمع (Batch Upload)
                      </h4>
                      <p className="text-sm font-bold text-slate-500 max-w-xl">
                        يتم فحص الملفات المرفوعة عن طريق <span className="text-primary">محرك التحقق الجداري (Firewall)</span> للتأكد من مطابقة الأسماء والكنائس مع القالب المعتمد المخصص.
                        تتم مطابقة الأعمدة تلقائياً والتأكد من المراحل الدراسية لتجنب الأخطاء. لم يتم حفظ أي داتا إذا إحتوى الملف أخطاء.
                      </p>
                    </div>
                    <label className="shrink-0 flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-xl font-black cursor-pointer hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95">
                      {isUploadingBatch ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                      <span>تصفح ورفع الملف (Excel)</span>
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleBatchUpload} disabled={isUploadingBatch} />
                    </label>
                  </div>

                  {batchUploadStatus && (
                    <div className={`mt-6 p-4 rounded-xl font-bold flex items-center gap-3 ${batchUploadErrors.length > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {batchUploadErrors.length > 0 ? <X size={20} /> : <Check size={20} />}
                      {batchUploadStatus}
                    </div>
                  )}

                  {batchUploadErrors.length > 0 && (
                    <div className="mt-4 max-h-[300px] overflow-y-auto bg-white border border-red-100 rounded-xl p-4 shadow-inner">
                      <h5 className="font-black text-red-600 mb-4 border-b border-red-100 pb-2">تقرير أخطاء القبول (Rejection Report)</h5>
                      <ul className="space-y-3">
                        {batchUploadErrors.map((err, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold shrink-0 mt-0.5">صف {err.row}</span>
                            <span className="text-slate-700 font-bold">{err.error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}

            {adminActiveTab === 'official_templates' && (
              <section className="space-y-8">
                <TemplateExcelExporter 
                  participants={allChurchParticipants} 
                  userChurch={churchName} 
                  isAdmin={userRole === 'admin'} 
                />
              </section>
            )}

            {adminActiveTab === 'system_settings' && (
              <div className="space-y-12">
                {/* 1. Global Sovereign Controls Card */}
                <section className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 inset-x-0 h-2 bg-rose-600" />
                  <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-8">
                    <ShieldAlert className="text-rose-600" /> مركز التحكم السيادية العامة (قاعدة البيانات والاتصال المباشر)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Site Disabled */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div className="mb-4">
                        <h5 className="text-lg font-black text-slate-800 flex items-center gap-2">🛠️ قفل الموقع بالكامل</h5>
                        <p className="text-sm text-slate-500 font-bold mt-1">يقوم بتحويل كافة صفحات المشتركين والطلاب والخدام فوراً إلى صفحة الصيانة والقفل العام</p>
                      </div>
                      <button 
                        onClick={() => handleGlobalToggle('is_site_disabled', !globalSettings.is_site_disabled)}
                        className={`px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg w-full flex items-center justify-center gap-2 ${globalSettings.is_site_disabled ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                      >
                        {globalSettings.is_site_disabled ? 'الموقع مغلق بالكامل 🔒' : 'الموقع مفتوح ومستقر للجميع 🔓'}
                      </button>
                    </div>

                    {/* Registration Locked */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div className="mb-4">
                        <h5 className="text-lg font-black text-slate-800 flex items-center gap-2">📝 قفل تسجيل المشتركين</h5>
                        <p className="text-sm text-slate-500 font-bold mt-1">يمنع بشكل جداري إدخال أو تعديل استمارات التسجيل على مستوى كافة الكنائس والمراحل</p>
                      </div>
                      <button 
                        onClick={() => handleGlobalToggle('is_registration_locked', !globalSettings.is_registration_locked)}
                        className={`px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg w-full flex items-center justify-center gap-2 ${globalSettings.is_registration_locked ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                      >
                        {globalSettings.is_registration_locked ? 'التسجيل مغلق بالكامل 🔒' : 'التسجيل مفتوح للجميع 🔓'}
                      </button>
                    </div>

                    {/* Exam Locked */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div className="mb-4">
                        <h5 className="text-lg font-black text-slate-800 flex items-center gap-2">📝 قفل الامتحانات الإلكترونية</h5>
                        <p className="text-sm text-slate-500 font-bold mt-1">يغلق ويحظر تقديم أو إرسال أي إجابة امتحان جديدة لكافة الطلاب بقرار مركزي سيادي</p>
                      </div>
                      <button 
                        onClick={() => handleGlobalToggle('is_exam_locked', !globalSettings.is_exam_locked)}
                        className={`px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg w-full flex items-center justify-center gap-2 ${globalSettings.is_exam_locked ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                      >
                        {globalSettings.is_exam_locked ? 'الامتحانات مغلقة بالكامل 🔒' : 'الامتحانات مفتوحة للجميع 🔓'}
                      </button>
                    </div>

                    {/* Book Orders Locked */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div className="mb-4">
                        <h5 className="text-lg font-black text-slate-800 flex items-center gap-2">📚 قفل طلبات وحاسبة الكتب</h5>
                        <p className="text-sm text-slate-500 font-bold mt-1">يمنع إضافة أو إرسال أو تسليم أي طلبات كتب أو مبيعات مخصصة في حاسبة الإيبارشية</p>
                      </div>
                      <button 
                        onClick={() => handleGlobalToggle('is_book_orders_locked', !globalSettings.is_book_orders_locked)}
                        className={`px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg w-full flex items-center justify-center gap-2 ${globalSettings.is_book_orders_locked ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                      >
                        {globalSettings.is_book_orders_locked ? 'طلبات الكتب مغلقة 🔒' : 'طلبات الكتب مفتوحة 🔓'}
                      </button>
                    </div>
                  </div>
                </section>

                {/* 2. Granular Controls Exceptions Settings Card */}
                <section className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600" />
                  <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-8">
                    <Sliders className="text-indigo-600" /> مركز التحكم التفصيلية والاستثناءات الجغرافية والدراسية (Granular Controls)
                  </h4>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Exclusions Setup Form */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <h5 className="text-lg font-black text-slate-800">إضافة أو تحديث إستثناء مخصص</h5>

                      {/* Target Type Selector */}
                      <div>
                        <label className="text-xs font-black text-slate-400 mb-2 block">نوع المستهدف</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setGranularTargetType('church');
                              setGranularTargetName('');
                            }}
                            className={`py-2 rounded-xl font-bold border transition-all ${granularTargetType === 'church' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                          >
                            كنيسة بعينها
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGranularTargetType('stage');
                              setGranularTargetName('');
                            }}
                            className={`py-2 rounded-xl font-bold border transition-all ${granularTargetType === 'stage' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                          >
                            مرحلة بعينها
                          </button>
                        </div>
                      </div>

                      {/* Target Name Selector */}
                      <div>
                        <label className="text-xs font-black text-slate-400 mb-2 block">اسم المستهدف المجدول</label>
                        <select
                          value={granularTargetName}
                          onChange={(e) => setGranularTargetName(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                        >
                          <option value="">-- اختر من القائمة --</option>
                          {granularTargetType === 'church' ? (
                            Array.from(new Set([
                              ...dbChurches,
                              ...publicChurches.map(c => c.name)
                            ])).sort().map(church => (
                              <option key={church} value={church}>{church}</option>
                            ))
                          ) : (
                            (STAGE_ORDER || []).map(stage => (
                              <option key={stage} value={stage}>{stage}</option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Exceptions Switches */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 col-span-2">
                          <input
                            type="checkbox"
                            id="exam_disabled_cb"
                            checked={granularIsExamDisabled}
                            onChange={(e) => setGranularIsExamDisabled(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                          />
                          <label htmlFor="exam_disabled_cb" className="text-xs font-black text-slate-700 cursor-pointer">تعطيل الامتحان</label>
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-400 mb-1 block">وقت بدء الامتحان</label>
                          <input type="datetime-local" value={granularExamStartAt} onChange={(e) => setGranularExamStartAt(e.target.value)} className="w-full text-xs p-2 rounded border border-slate-200" />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-400 mb-1 block">وقت انتهاء الامتحان</label>
                          <input type="datetime-local" value={granularExamEndAt} onChange={(e) => setGranularExamEndAt(e.target.value)} className="w-full text-xs p-2 rounded border border-slate-200" />
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100 col-span-2">
                          <input
                            type="checkbox"
                            id="reg_disabled_cb"
                            checked={granularIsRegistrationDisabled}
                            onChange={(e) => setGranularIsRegistrationDisabled(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                          />
                          <label htmlFor="reg_disabled_cb" className="text-xs font-black text-slate-700 cursor-pointer">تعطيل التسجيل</label>
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-400 mb-1 block">وقت بدء التسجيل</label>
                          <input type="datetime-local" value={granularRegistrationStartAt} onChange={(e) => setGranularRegistrationStartAt(e.target.value)} className="w-full text-xs p-2 rounded border border-slate-200" />
                        </div>
                        <div className="col-span-1">
                          <label className="text-[10px] font-black text-slate-400 mb-1 block">وقت انتهاء التسجيل</label>
                          <input type="datetime-local" value={granularRegistrationEndAt} onChange={(e) => setGranularRegistrationEndAt(e.target.value)} className="w-full text-xs p-2 rounded border border-slate-200" />
                        </div>

                        {/* Save Exclusions Button */}
                        <button
                          type="button"
                          disabled={!granularTargetName}
                          onClick={() => handleSaveGranularControl(granularTargetType, granularTargetName, {
                            is_exam_disabled: granularIsExamDisabled,
                            is_registration_disabled: granularIsRegistrationDisabled,
                            exam_start_at: granularExamStartAt || null,
                            exam_end_at: granularExamEndAt || null,
                            registration_start_at: granularRegistrationStartAt || null,
                            registration_end_at: granularRegistrationEndAt || null,
                          })}
                          className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black transition-all shadow-lg hover:shadow-indigo-100"
                        >
                          حفظ وتطبيق الاستثناء والمواعيد 💾
                        </button>
                    </div>
                    </div>

                    {/* Exclusions List */}
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <h5 className="text-lg font-black text-slate-800 mb-4">الاستثناءات والقيود النشطة حالياً</h5>
                        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 no-scrollbar">
                          {granularControls.length === 0 ? (
                            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 font-bold">
                              لا توجد استثناءات أو قيود نشطة حالياً. جميع الكنائس والمراحل تعمل بنسبة 100% بنمطه الدراسي الافتراضي.
                            </div>
                          ) : (
                            granularControls.map((ctrl) => (
                              <div key={ctrl.id} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${ctrl.target_type === 'church' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                                      {ctrl.target_type === 'church' ? 'كنيسة' : 'مرحلة'}
                                    </span>
                                    <span className="font-extrabold text-sm text-slate-700">{ctrl.target_name}</span>
                                  </div>
                                  <div className="flex gap-3 mt-1.5">
                                    <span className={`text-[10px] font-bold ${ctrl.is_exam_disabled ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      الامتحان: {ctrl.is_exam_disabled ? '🔴 معطل' : '🟢 متاح'}
                                    </span>
                                    <span className={`text-[10px] font-bold ${ctrl.is_registration_disabled ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      التسجيل: {ctrl.is_registration_disabled ? '🔴 معطل' : '🟢 متاح'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteGranularControl(ctrl.id)}
                                  className="p-1 px-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-black hover:bg-rose-100 transition-colors"
                                >
                                  حذف 🗑️
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Year Management Section */}
                <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                    <Settings className="text-coptic-blue" /> إعدادات النظام والسنة الدراسية
                  </h4>
                  
                  <div className="max-w-md space-y-6">
                    <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <label className="text-xs font-black text-slate-400 uppercase mb-3 block">السنة النشطة حالياً</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="text"
                          value={activeYear}
                          onChange={(e) => setActiveYear(e.target.value)}
                          placeholder="مثال: 2026"
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-lg"
                        />
                        <button 
                          onClick={() => handleYearChange(activeYear)}
                          disabled={isUpdatingYear}
                          className="px-6 py-3 bg-primary text-white rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                        >
                          {isUpdatingYear ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'تحديث'}
                        </button>
                      </div>
                      <p className="mt-4 text-[10px] text-slate-400 font-bold leading-relaxed">
                        * ملاحظة: تغيير السنة سيؤدي إلى تصفية كافة البيانات (المشتركين، النتائج، الأخبار، إلخ) لتظهر فقط البيانات الخاصة بالسنة المحددة.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                      <Phone className="text-primary" /> إعدادات الموقع والتواصل
                    </h4>
                    <form onSubmit={handleSettingsSubmit} className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">رقم التواصل</label>
                        <input 
                          type="text"
                          value={siteSettings.phone}
                          onChange={(e) => setSiteSettings({...siteSettings, phone: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">لينك فيسبوك</label>
                        <input 
                          type="text"
                          value={siteSettings.facebook}
                          onChange={(e) => setSiteSettings({...siteSettings, facebook: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">لينك تليجرام</label>
                        <input 
                          type="text"
                          value={siteSettings.telegram}
                          onChange={(e) => setSiteSettings({...siteSettings, telegram: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">نص حقوق الملكية</label>
                        <input 
                          type="text"
                          value={siteSettings.copyright}
                          onChange={(e) => setSiteSettings({...siteSettings, copyright: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-opacity-90 transition-all shadow-lg"
                      >
                        حفظ الإعدادات
                      </button>
                    </form>
                  </section>

                  <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                      <Info className="text-accent" /> محتوى "عن المهرجان"
                    </h4>
                    <form onSubmit={handleAboutSubmit} className="space-y-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">الرؤية</label>
                        <textarea 
                          value={aboutContent.vision}
                          onChange={(e) => setAboutContent({...aboutContent, vision: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">الهدف</label>
                        <textarea 
                          value={aboutContent.mission}
                          onChange={(e) => setAboutContent({...aboutContent, mission: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase mb-2 block">عن المهرجان</label>
                        <textarea 
                          value={aboutContent.aboutText}
                          onChange={(e) => setAboutContent({...aboutContent, aboutText: e.target.value})}
                          rows={5}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold resize-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-accent text-white rounded-2xl font-black hover:bg-opacity-90 transition-all shadow-lg"
                      >
                        حفظ المحتوى
                      </button>
                    </form>
                  </section>
                </div>
              </div>
            )}

            {adminActiveTab === 'dashboard' && (
              <div className="space-y-12 sm:space-y-16 mt-8 sm:mt-16 font-arabic w-full min-w-0">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 sm:p-6 rounded-xl border border-gray-100 gap-4 w-full min-w-0 shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">المركز التحليلي الشامل</h2>
                    <p className="text-sm text-slate-500 font-bold mt-1">مؤشرات إحصائية ورسوم بيانية لبيانات التسجيل والحاسبة</p>
                  </div>
                  <button onClick={exportComprehensivePDF} disabled={isExportingPDF} className={`px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg transition-all text-sm flex items-center gap-2 shrink-0 ${isExportingPDF ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}>
                    {isExportingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isExportingPDF ? 'جاري التحضير...' : 'تصدير التقرير التحليلي (PDF)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full min-w-0">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                    className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm w-full min-w-0"
                  >
                    <h3 className="font-black text-slate-800 mb-6 text-lg">منحنى توزيع المشتركين (كثافة المراحل)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.demographicsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Tajawal' }} />
                          <Bar dataKey="المشتركين" fill="#0f172a" radius={[6, 6, 0, 0]}>
                            {analyticsData.demographicsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                    className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm w-full min-w-0"
                  >
                    <h3 className="font-black text-slate-800 mb-6 text-lg">معدل الانخراط والمشاركة (عدد المسابقات)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={analyticsData.engagementData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {analyticsData.engagementData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Tajawal' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                    className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm w-full min-w-0"
                  >
                    <h3 className="font-black text-slate-800 mb-6 text-lg">توزيع المشتركين حسب الجنس</h3>
                    <div className="h-64">
                      {(!analyticsData.genderData || analyticsData.genderData.length === 0) ? (
                        <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm">
                          لا توجد بيانات جنس متوفرة
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={analyticsData.genderData} 
                              dataKey="value" 
                              nameKey="name" 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={60} 
                              outerRadius={80} 
                              paddingAngle={5} 
                              label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {analyticsData.genderData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.name === 'ذكور' ? '#2563eb' : '#ec4899'} 
                                />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Tajawal' }} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontFamily: 'Tajawal', fontWeight: 'bold', fontSize: '11px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                    className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm md:col-span-2 lg:col-span-3 w-full min-w-0"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                          <TrendingUp size={20} className="text-primary" />
                          معدل نمو الاشتراكات مع الوقت وحجم التسجيلات اليومية
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          تتبع وتيرة التسجيلات والنمو التراكمي للمشتركين لتحديد فترات الذروة للتسجيل لعام {activeYear}
                        </p>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold self-end sm:self-auto shrink-0" dir="ltr">
                        <button
                          onClick={() => setTrendViewMode('both')}
                          className={`px-3 py-1.5 rounded-lg transition-all ${trendViewMode === 'both' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          المتكامل
                        </button>
                        <button
                          onClick={() => setTrendViewMode('cumulative')}
                          className={`px-3 py-1.5 rounded-lg transition-all ${trendViewMode === 'cumulative' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          النمو التراكمي
                        </button>
                        <button
                          onClick={() => setTrendViewMode('daily')}
                          className={`px-3 py-1.5 rounded-lg transition-all ${trendViewMode === 'daily' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          التسجيل اليومي
                        </button>
                      </div>
                    </div>
                    {(!analyticsData.growthTrendData || analyticsData.growthTrendData.length === 0) ? (
                      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm font-bold">
                        لا توجد بيانات تسجيل كافية لعرض منحنى النمو بعد.
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsData.growthTrendData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="formattedDate" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            
                            <YAxis 
                              yAxisId="left"
                              orientation="left"
                              tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 'bold' }} 
                              axisLine={false} 
                              tickLine={false} 
                              label={trendViewMode === 'daily' ? undefined : { value: 'إجمالي المشتركين', angle: -90, position: 'insideLeft', style: { fill: '#0f172a', fontWeight: 'bold', fontSize: '11px', textAnchor: 'middle' } }}
                            />
                            
                            {trendViewMode === 'both' && (
                              <YAxis 
                                yAxisId="right"
                                orientation="right"
                                tick={{ fill: '#d97706', fontSize: 11, fontWeight: 'bold' }} 
                                axisLine={false} 
                                tickLine={false} 
                                label={{ value: 'التسجيل اليومي', angle: 90, position: 'insideRight', style: { fill: '#d97706', fontWeight: 'bold', fontSize: '11px', textAnchor: 'middle' } }}
                              />
                            )}

                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Tajawal', direction: 'rtl' }} />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: 'Tajawal', fontWeight: 'bold', fontSize: '12px' }} />
                            
                            {(trendViewMode === 'both' || trendViewMode === 'cumulative') && (
                              <Line 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="إجمالي المشتركين" 
                                stroke="#0f172a" 
                                strokeWidth={3}
                                activeDot={{ r: 6 }}
                                dot={{ stroke: '#0f172a', strokeWidth: 2, r: 4, fill: '#fff' }}
                              />
                            )}

                            {(trendViewMode === 'both' || trendViewMode === 'daily') && (
                              <Line 
                                yAxisId={trendViewMode === 'both' ? "right" : "left"}
                                type="monotone" 
                                dataKey="التسجيلات اليومية" 
                                stroke="#d97706" 
                                strokeWidth={2.5}
                                dot={{ stroke: '#d97706', strokeWidth: 1.5, r: 3, fill: '#fff' }}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                    className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm md:col-span-2 lg:col-span-3 w-full min-w-0"
                  >
                    <h3 className="font-black text-slate-800 mb-6 text-lg">الطلب الحقيقي للكتب (الكتب المطلوبة vs مسابقات المشتركين)</h3>
                    <div className="h-80 mb-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData.retentionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Tajawal' }} />
                          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: 'Tajawal', fontWeight: 'bold' }} />
                          <Area type="monotone" dataKey="كتب تم طلبها" stroke="#94a3b8" fill="#e2e8f0" />
                          <Area type="monotone" dataKey="الاحتياج الفعلي" stroke="#0f172a" fill="#0f172a" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200 w-full min-w-0">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-bold">
                          <tr>
                            <th className="p-4 border-b">اسم الكنيسة</th>
                            <th className="p-4 border-b">إجمالي الكتب المطلوبة</th>
                            <th className="p-4 border-b">الاحتياج الفعلي (بناءً على المسابقات)</th>
                            <th className="p-4 border-b">الفجوة / العجز</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(analyticsData.retentionData || [])
                            .slice((analyticsPage - 1) * 20, analyticsPage * 20)
                            .map((row, idx) => {
                            const gap = row["كتب تم طلبها"] - row["الاحتياج الفعلي"];
                            const rowBg = gap < 0 ? 'bg-red-50' : gap > 0 ? 'bg-yellow-50' : 'bg-white';
                            const gapText = gap < 0 ? `${gap} (عجز)` : gap > 0 ? `+${gap} (فائض)` : 'متطابق';
                            const textColor = gap < 0 ? 'text-red-700' : gap > 0 ? 'text-yellow-700' : 'text-slate-600';

                            return (
                              <tr key={idx} className={`border-b last:border-0 ${rowBg}`}>
                                <td className="p-4 font-bold text-slate-800">{row.name}</td>
                                <td className="p-4">{row["كتب تم طلبها"]}</td>
                                <td className="p-4">{row["الاحتياج الفعلي"]}</td>
                                <td className={`p-4 font-black ${textColor}`} dir="ltr">{gapText}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <PaginationComponent 
                      currentPage={analyticsPage}
                      totalItems={(analyticsData.retentionData || []).length}
                      itemsPerPage={20}
                      onPageChange={setAnalyticsPage}
                    />
                  </motion.div>
                </div>

                {/* Sub-Activities Analytics (Teams & Individuals) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-16 w-full min-w-0">
                  {/* Widget 1: Activity Participation Counter */}
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm w-full min-w-0"
                  >
                    <h3 className="font-black text-slate-800 mb-6 text-lg">عداد المشاركات في الأنشطة الفرعية</h3>
                    <div className="space-y-4">
                      {analyticsData.subActivityStats && analyticsData.subActivityStats.length > 0 ? (
                        analyticsData.subActivityStats.map((stat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className={`p-2 rounded-lg ${stat.isGroup ? 'bg-emerald-100 text-emerald-600' : 'bg-coptic-blue/10 text-coptic-blue'}`}>
                                {stat.isGroup ? <Users size={18} /> : <User size={18} />}
                              </span>
                              <span className="font-bold text-slate-700">{stat.name}</span>
                            </div>
                            <span className="font-black text-xl text-slate-900 border-b-2 border-slate-200 px-2">
                              {stat.count} <span className="text-sm text-slate-500">{stat.isGroup ? 'فريق' : 'شخص'}</span>
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-slate-400 font-bold">لا يوجد بيانات تسجيل في الأنشطة</div>
                      )}
                    </div>
                  </motion.div>

                  {/* Widget 2: Detailed Church Participation Matrix */}
                  <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
                    className="bg-white p-4 sm:p-6 rounded-xl border border-gray-100 shadow-sm w-full min-w-0"
                  >
                    <h3 className="font-black text-slate-800 mb-6 text-lg">مصفوفة الأنشطة للكنائس المشاركة</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 w-full min-w-0">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 text-slate-600 font-bold">
                          <tr>
                            <th className="p-4 border-b">اسم الكنيسة</th>
                            <th className="p-4 border-b">الأنشطة المشاركة بها</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.churchMatrix && analyticsData.churchMatrix.length > 0 ? (
                            analyticsData.churchMatrix.map((row, idx) => (
                              <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-black text-slate-800 whitespace-nowrap">{row.churchName}</td>
                                <td className="p-4 text-slate-600 leading-relaxed font-bold">{row.activities}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="p-8 text-center text-slate-400 font-bold">لا يوجد بيانات اشتراك للكنائس</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </div>

                {/* Advanced Data Aggregation for Printing Statement */}
                <section className="analytics-report-container pt-12 border-t border-slate-100 w-full min-w-0">
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-primary" /> بيان طباعة الامتحانات 
                      </h4>
                      <p className="text-xs text-slate-500 font-bold mt-1">حصر أعداد النسخ المطلوب طباعتها لكل مسابقة (يتم حساب النسخ تفصيلياً للمشترك)</p>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row items-center gap-3">
                      {/* Interactive View Toggles */}
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setPrintingViewPart(1)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${printingViewPart === 1 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          عرض الجزء الأول (أول ٢٠)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintingViewPart(2)}
                          disabled={part2Columns.length === 0}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${part2Columns.length === 0 ? 'opacity-40 cursor-not-allowed' : ''} ${printingViewPart === 2 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          عرض الجزء الثاني ({part2Columns.length > 0 ? `آخر ${part2Columns.length}` : 'لا يوجد'})
                        </button>
                      </div>

                      {/* Print and Export Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button 
                          onClick={exportPrintingStatementExcel}
                          className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-sm"
                        >
                          <Download size={13} /> تحميل Excel
                        </button>
                        <button 
                          onClick={() => exportPrintingStatementPartPDF(1)}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-red-100 transition-colors shadow-sm"
                        >
                          <FileText size={13} /> طباعة الجزء الأول (أول ٢٠ عمود)
                        </button>
                        <button 
                          onClick={() => exportPrintingStatementPartPDF(2)}
                          disabled={part2Columns.length === 0}
                          className={`px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-slate-200 transition-colors shadow-sm border border-slate-200 ${part2Columns.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <Printer size={13} /> طباعة الجزء الثاني (آخر ٢٠ عمود)
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-black text-slate-500 uppercase border-b border-slate-200">
                          <th rowSpan={2} className="p-3 border-l border-slate-200 align-middle">الكنيسة</th>
                          <th rowSpan={2} className="p-3 border-l border-slate-200 text-center align-middle whitespace-nowrap">المشتركين</th>
                          {getStageHeaderGroups(printingViewPart === 1 ? part1Columns : part2Columns).map((g, idx) => (
                            <th key={idx} colSpan={g.colSpan} className="p-2 border-l border-b border-slate-200 text-center text-[10px] bg-slate-100/50">
                              {g.stage}
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-slate-50 font-black text-slate-500 border-b border-slate-200">
                          {(printingViewPart === 1 ? part1Columns : part2Columns).map((c, idx) => (
                            <th key={idx} className="p-2 border-l border-slate-200 text-center text-[9px] whitespace-nowrap font-bold">
                              {c.col === 'darasi' ? 'دراسي' : c.col === 'mahfouthat' ? 'مح' : c.col === 'coptic1' ? 'ق1' : 'ق2'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(aggregatedChurchPrintingData || [])
                          .slice((printingPage - 1) * 20, printingPage * 20)
                          .map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-800 border-l border-slate-100 whitespace-nowrap">{row.church}</td>
                            <td className="p-3 font-black text-slate-800 text-center border-l border-slate-100 bg-slate-50/50">{row.totalSubscribers}</td>
                            
                            {(printingViewPart === 1 ? part1Columns : part2Columns).map((c, idx) => {
                              const stgData = row.stages[c.stage];
                              return (
                                <td key={idx} className={`p-2 font-bold text-center border-l border-slate-100 ${stgData && stgData[c.col] > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                  {stgData ? stgData[c.col] : 0}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {(aggregatedChurchPrintingData || []).length === 0 && (
                          <tr>
                            <td colSpan={50} className="p-8 text-center text-slate-400 font-bold">
                              لا توجد بيانات متاحة
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-300">
                          <td className="p-3 font-black text-slate-800 border-l border-slate-200">الإجمالي العام</td>
                          <td className="p-3 font-black text-slate-900 text-center border-l border-slate-200 bg-slate-200/50">{aggregatedChurchPrintingTotals.subscribers}</td>
                          
                          {(printingViewPart === 1 ? part1Columns : part2Columns).map((c, idx) => {
                            const stgData = aggregatedChurchPrintingTotals.stages[c.stage];
                            return (
                              <td key={idx} className="p-2 font-black text-slate-800 text-center border-l border-slate-200">
                                {stgData ? stgData[c.col] : 0}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <PaginationComponent 
                    currentPage={printingPage}
                    totalItems={(aggregatedChurchPrintingData || []).length}
                    itemsPerPage={20}
                    onPageChange={setPrintingPage}
                  />
                </section>

                {/* Print-only Templates - Rendered off-screen to ensure charts are pre-measured, fonts are fully loaded, and assets are fully calculated */}
                <div style={{ position: 'absolute', left: '-9999px', top: '0', zIndex: -100, pointerEvents: 'none', width: '210mm' }}>
                  <div id="comprehensive-analytics-report" className="bg-white text-slate-900 font-arabic leading-relaxed" dir="rtl" style={{ width: '210mm' }}>
                    <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
                      #comprehensive-analytics-report {
                        font-family: 'Tajawal', sans-serif !important;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                      }
                      #comprehensive-analytics-report * {
                        font-family: 'Tajawal', sans-serif !important;
                      }
                      .page-break { page-break-after: always; break-after: page; }
                      .pdf-page { padding: 45px; min-height: 297mm; position: relative; box-sizing: border-box; background: white; }
                      .pdf-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 11px; font-family: 'Tajawal', sans-serif !important; }
                      .pdf-th { background-color: #f8fafc; font-weight: 900; padding: 12px 10px; border: 1px solid #cbd5e1; text-align: center; font-family: 'Tajawal', sans-serif !important; font-size: 11px; color: #020617; }
                      .pdf-td { padding: 10px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800; font-family: 'Tajawal', sans-serif !important; font-size: 11px; color: #1e293b; }
                    `}</style>
                    
                    {/* PAGE 1: Cover Page */}
                    <div className="pdf-page flex flex-col items-center justify-center page-break text-center">
                      <div className="absolute top-10 left-10 text-xs font-bold text-slate-400">الصفحة 1 من 4</div>
                      <img src={logoBase64 || getValidLogoUrl(userProfile?.logoUrl, appLogo)} alt="Logo" className="w-48 h-48 rounded-full object-contain shadow-sm border border-slate-100 bg-white mb-12" crossOrigin="anonymous" />
                      <h1 className="text-4xl font-black text-coptic-blue mb-6 leading-tight">التقرير التحليلي الشامل لمؤشرات<br/>وإحصائيات مهرجان الكرازة {activeYear}</h1>
                      <h2 className="text-2xl font-bold text-slate-600 mb-16">{churchName || 'إيبارشية / منطقة 18'}</h2>
                      
                      <div className="grid grid-cols-2 gap-8 w-full max-w-2xl text-right">
                        <div className="border border-slate-200 rounded-3xl p-8 bg-slate-50">
                          <p className="text-slate-500 font-bold mb-2">إجمالي المشتركين الفعليين</p>
                          <p className="text-5xl font-black text-slate-900">{analyticsData.totalParticipants}</p>
                        </div>
                        <div className="border border-slate-200 rounded-3xl p-8 bg-slate-50">
                          <p className="text-slate-500 font-bold mb-2">إجمالي طلبات الكتب</p>
                          <p className="text-5xl font-black text-slate-900">{analyticsData.totalOrders}</p>
                        </div>
                      </div>
                      
                      <div className="mt-24 text-slate-400 font-bold">
                        تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')} - حصري للإدارة والقيادات
                      </div>
                    </div>

                    {/* PAGE 2: Demographics & Growth */}
                    <div className="pdf-page page-break bg-white">
                      <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-8">
                        <div className="flex items-center gap-4">
                          <img src={logoBase64 || getValidLogoUrl(userProfile?.logoUrl, appLogo)} alt="Logo" className="w-12 h-12 rounded-full object-contain" crossOrigin="anonymous" />
                          <h2 className="text-xl font-black text-slate-800">تحليل النمو والكثافة</h2>
                        </div>
                        <div className="text-xs font-bold text-slate-400">الصفحة 2 من 4</div>
                      </div>
                      
                      <h3 className="font-black text-slate-700 text-lg mb-6 border-r-4 border-coptic-blue pr-4">منحنى توزيع المشتركين (كثافة المراحل)</h3>
                      <div className="flex justify-center mb-12" style={{ height: '320px' }}>
                        <BarChart width={680} height={320} data={analyticsData.demographicsData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Bar dataKey="المشتركين" fill="#0f172a" label={{ position: 'top', fontSize: 10, fontWeight: 'bold' }}>
                            {analyticsData.demographicsData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </div>

                      <h3 className="font-black text-slate-700 text-lg mb-6 border-r-4 border-coptic-gold pr-4">معدل الانخراط والمشاركة</h3>
                      <div className="flex justify-center" style={{ height: '260px' }}>
                        <PieChart width={680} height={260}>
                          <Pie data={analyticsData.engagementData} dataKey="value" nameKey="name" cx={340} cy={110} innerRadius={50} outerRadius={90} label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                            {analyticsData.engagementData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Legend wrapperStyle={{ fontSize: 12, fontWeight: 'bold', fontFamily: 'Tajawal' }} />
                        </PieChart>
                      </div>
                    </div>

                    {/* PAGE 3: Logistical Gaps */}
                    <div className="pdf-page page-break bg-white">
                      <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-8">
                        <div className="flex items-center gap-4">
                          <img src={logoBase64 || getValidLogoUrl(userProfile?.logoUrl, appLogo)} alt="Logo" className="w-12 h-12 rounded-full object-contain" crossOrigin="anonymous" />
                          <h2 className="text-xl font-black text-slate-800">الفجوات اللوجستية ومؤشر الاستبقاء</h2>
                        </div>
                        <div className="text-xs font-bold text-slate-400">الصفحة 3 من 4</div>
                      </div>

                      <h3 className="font-black text-slate-700 text-lg mb-6 border-r-4 border-emerald-600 pr-4">مقارنة: الكتب المطلوبة vs الطلب الحقيقي للكتب (بناءً على اشتراكات المسابقات)</h3>
                      <div className="flex justify-center mb-8" style={{ height: '300px' }}>
                        <AreaChart width={680} height={300} data={analyticsData.retentionData} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Legend verticalAlign="top" wrapperStyle={{ fontFamily: 'Tajawal', fontWeight: 'bold', paddingBottom: '20px' }} />
                          <Area type="monotone" dataKey="كتب تم طلبها" stroke="#94a3b8" fill="#e2e8f0" />
                          <Area type="monotone" dataKey="الاحتياج الفعلي" stroke="#0f172a" fill="#0f172a" fillOpacity={0.2} />
                        </AreaChart>
                      </div>

                      <h3 className="font-black text-slate-700 text-lg mb-4 border-r-4 border-red-600 pr-4">جدول الفجوات التحليلي (تغطية المسابقات)</h3>
                      <table className="pdf-table">
                        <thead>
                          <tr>
                            <th className="pdf-th">الكنيسة</th>
                            <th className="pdf-th">الكتب المطلوبة</th>
                            <th className="pdf-th">الطلب الحقيقي للكتب</th>
                            <th className="pdf-th">مؤشر العجز / الفائض</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.retentionData.map((row, i) => {
                            const gap = row["كتب تم طلبها"] - row["الاحتياج الفعلي"];
                            return (
                              <tr key={i}>
                                <td className="pdf-td bg-slate-50">{row.name}</td>
                                <td className="pdf-td">{row["كتب تم طلبها"]}</td>
                                <td className="pdf-td">{row["الاحتياج الفعلي"]}</td>
                                <td className="pdf-td" style={{ color: gap > 0 ? '#b45309' : gap < 0 ? '#dc2626' : '#059669' }} dir="ltr">
                                  {gap > 0 ? `+${gap} (فائض كتب)` : gap < 0 ? `${gap} (عجز كتب)` : 'متطابق'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGE 4: Detailed Metrics Matrix */}
                    <div className="pdf-page bg-white" style={{ minHeight: 'unset' }}>
                      <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-8">
                        <div className="flex items-center gap-4">
                          <img src={logoBase64 || getValidLogoUrl(userProfile?.logoUrl, appLogo)} alt="Logo" className="w-12 h-12 rounded-full object-contain" crossOrigin="anonymous" />
                          <h2 className="text-xl font-black text-slate-800">مصفوفة بيانات المشتركين التفصيلية</h2>
                        </div>
                        <div className="text-xs font-bold text-slate-400">الصفحة 4 من 4</div>
                      </div>

                      <table className="pdf-table">
                        <thead>
                          <tr>
                            <th rowSpan={2} className="pdf-th">الكنيسة</th>
                            <th rowSpan={2} className="pdf-th">الإجمالي</th>
                            {STAGE_ORDER.map(stg => (
                              <th key={stg} colSpan={activeStagesCols[stg]?.length || 1} className="pdf-th">{stg}</th>
                            ))}
                          </tr>
                          <tr>
                            {STAGE_ORDER.map(stg => (
                              activeStagesCols[stg]?.map(col => (
                                <th key={`${stg}-${col}`} className="pdf-th">
                                  {col === 'darasi' ? 'در' : col === 'mahfouthat' ? 'مح' : col === 'coptic1' ? 'ق1' : 'ق2'}
                                </th>
                              )) || <th key={stg} className="pdf-th">-</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {aggregatedChurchPrintingData.map((row, idx) => (
                            <tr key={idx}>
                              <td className="pdf-td bg-slate-50" style={{ whiteSpace: 'nowrap' }}>{row.church}</td>
                              <td className="pdf-td">{row.totalSubscribers}</td>
                              {STAGE_ORDER.map(stg => {
                                const subCols = activeStagesCols[stg] || [];
                                const stgData = row.stages[stg];
                                return subCols.length > 0 ? subCols.map(col => (
                                  <td key={`${stg}-${col}`} className="pdf-td text-slate-600">
                                    {stgData?.[col] || 0}
                                  </td>
                                )) : <td key={stg} className="pdf-td">-</td>
                              })}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-100">
                            <td className="pdf-td">الإجمالي</td>
                            <td className="pdf-td">{aggregatedChurchPrintingTotals.subscribers}</td>
                            {STAGE_ORDER.map(stg => {
                                const subCols = activeStagesCols[stg] || [];
                                const stgData = aggregatedChurchPrintingTotals.stages[stg];
                                return subCols.length > 0 ? subCols.map(col => (
                                  <td key={`${stg}-${col}`} className="pdf-td">
                                    {stgData?.[col] || 0}
                                  </td>
                                )) : <td key={stg} className="pdf-td">-</td>
                            })}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                  
                  <div id="printing-statement-table-part1" className="pt-0 px-2 pb-2 bg-white text-slate-900 font-arabic leading-relaxed" dir="rtl" style={{ width: '297mm', boxSizing: 'border-box' }}>
                    <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
                      #printing-statement-table-part1, .font-arabic { font-family: 'Tajawal', sans-serif !important; }
                      #printing-statement-table-part1 * { font-family: 'Tajawal', sans-serif !important; box-sizing: border-box !important; }
                      table { width: 100% !important; border-collapse: collapse; margin-bottom: 5px !important; box-sizing: border-box !important; }
                      th { background-color: #f8fafc; font-weight: 900; color: #0f172a; border: 1px solid #cbd5e1; }
                      td, th { padding: 8px 4px !important; line-height: 1.5 !important; border: 1px solid #cbd5e1; text-align: center; font-weight: 800; }
                      .text-right-col { text-align: right !important; }
                      .text-primary { color: #0F172A; }
                      .summary-row { background-color: #f1f5f9; font-weight: 900; }
                      @media print {
                        @page {
                          size: A4 landscape;
                          margin-top: 5mm !important; /* Minimal secure top margin */
                          margin-bottom: 5mm !important;
                          margin-left: 5mm !important;
                          margin-right: 5mm !important;
                        }
                        body, #root, .print-container {
                          padding-top: 0 !important;
                          margin-top: 0 !important;
                        }
                        .print-container {
                          width: 98% !important;
                          margin: 0 auto !important;
                        }
                        #printing-statement-table-part1 {
                          padding: 0 4mm 0 4mm !important;
                          margin: 0 auto !important;
                          width: 100% !important;
                          box-sizing: border-box !important;
                        }
                        table {
                          page-break-inside: auto;
                          margin-top: 0 !important;
                          position: static !important; /* Force stretch smoothly from container boundary */
                          box-sizing: border-box !important;
                          width: 100% !important;
                        }
                        tr { page-break-inside: avoid; break-inside: avoid; }
                      }
                    `}</style>
                    <div className="flex justify-between items-center border-b border-coptic-blue pb-1 mb-2">
                      <div className="flex items-center gap-2">
                        <img src={logoBase64 || getValidLogoUrl((siteSettings as any)?.logoUrl, logo)} alt="Logo" className="w-6 h-6 object-contain" crossOrigin="anonymous" />
                        <div>
                          <h1 className="text-xs font-black text-primary leading-tight">بيان طباعة مسابقات الأفراد - الجزء الأول (أول ٢٠ عمود)</h1>
                          <p className="text-[9px] font-bold text-slate-500 leading-tight">
                            {userRole === 'admin' && globalChurchFilter === 'الكل' ? 'مهرجان الكرازة المرقسية - كل الكنائس' : `مهرجان الكرازة المرقسية - ${churchName}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-left bg-slate-50 p-1 px-2 rounded-lg border border-slate-100 flex gap-2 items-center">
                        <span className="text-[8px] font-black text-slate-400 uppercase">تاريخ الإصدار:</span>
                        <span className="text-[9px] font-bold text-slate-800">{new Date().toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>

                    <table style={{ fontSize: '10px' }}>
                      <thead>
                        <tr>
                          <th rowSpan={2} className="text-right-col" style={{ verticalAlign: 'middle' }}>الكنيسة</th>
                          <th rowSpan={2} style={{ verticalAlign: 'middle' }}>المشتركين</th>
                          {getStageHeaderGroups(part1Columns).map((g, idx) => (
                            <th key={idx} colSpan={g.colSpan} style={{ borderBottom: '1px solid #cbd5e1', fontSize: '9px', backgroundColor: '#f8fafc' }}>
                              {g.stage}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {part1Columns.map((c, idx) => (
                            <th key={idx} style={{ fontSize: '8px' }}>
                              {c.col === 'darasi' ? 'در' : c.col === 'mahfouthat' ? 'مح' : c.col === 'coptic1' ? 'ق1' : 'ق2'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedChurchPrintingData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-right-col font-bold" style={{ whiteSpace: 'nowrap' }}>{row.church}</td>
                            <td className="font-black bg-slate-50">{row.totalSubscribers}</td>
                            {part1Columns.map((c, cIdx) => {
                              const stgData = row.stages[c.stage];
                              return (
                                <td key={cIdx} style={{ color: stgData && stgData[c.col] > 0 ? '#334155' : '#cbd5e1' }}>
                                  {stgData ? stgData[c.col] : 0}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="summary-row">
                          <td className="text-right-col">الإجمالي العام</td>
                          <td className="font-black bg-slate-200">{aggregatedChurchPrintingTotals.subscribers}</td>
                          {part1Columns.map((c, cIdx) => {
                            const stgData = aggregatedChurchPrintingTotals.stages[c.stage];
                            return (
                              <td key={cIdx} className="font-black">
                                {stgData ? stgData[c.col] : 0}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div id="printing-statement-table-part2" className="pt-1 px-4 pb-4 bg-white text-slate-900 font-arabic leading-relaxed" dir="rtl" style={{ width: '297mm' }}>
                    <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
                      #printing-statement-table-part2, .font-arabic { font-family: 'Tajawal', sans-serif !important; }
                      #printing-statement-table-part2 * { font-family: 'Tajawal', sans-serif !important; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                      th { background-color: #f8fafc; font-weight: 900; color: #0f172a; border: 1px solid #cbd5e1; }
                      td, th { padding: 12px 8px !important; line-height: 1.8 !important; border: 1px solid #cbd5e1; text-align: center; font-weight: 800; }
                      .text-right-col { text-align: right !important; }
                      .text-primary { color: #0F172A; }
                      .summary-row { background-color: #f1f5f9; font-weight: 900; }
                      @media print {
                        @page {
                          size: A4 landscape;
                          margin-top: 5mm !important; /* Minimal secure top margin */
                          margin-bottom: 5mm !important;
                          margin-left: 5mm !important;
                          margin-right: 5mm !important;
                        }
                        body, #root, .print-container, #printing-statement-table-part2 {
                          padding-top: 0 !important;
                          margin-top: 0 !important;
                        }
                        table {
                          page-break-inside: auto;
                          margin-top: 0 !important;
                          position: static !important; /* Force stretch smoothly from container boundary */
                        }
                        tr { page-break-inside: avoid; break-inside: avoid; }
                      }
                    `}</style>
                    <div className="flex justify-between items-start border-b-2 border-coptic-blue pb-2 mb-3">
                      <div className="flex items-center gap-3">
                        <img src={logoBase64 || getValidLogoUrl((siteSettings as any)?.logoUrl, logo)} alt="Logo" className="w-8 h-8 object-contain" crossOrigin="anonymous" />
                        <div>
                          <h1 className="text-sm font-black text-primary">بيان طباعة مساقات الأفراد - الجزء الثاني (العمود ٢١ فما فوق)</h1>
                          <p className="text-[10px] font-bold text-slate-500">
                            {userRole === 'admin' && globalChurchFilter === 'الكل' ? 'مهرجان الكرازة المرقسية - كل الكنائس' : `مهرجان الكرازة المرقسية - ${churchName}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-left bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase">تاريخ الإصدار</p>
                        <p className="text-[10px] font-bold text-slate-800">{new Date().toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>

                    <table style={{ fontSize: '10px' }}>
                      <thead>
                        <tr>
                          <th rowSpan={2} className="text-right-col" style={{ verticalAlign: 'middle' }}>الكنيسة</th>
                          <th rowSpan={2} style={{ verticalAlign: 'middle' }}>المشتركين</th>
                          {getStageHeaderGroups(part2Columns).map((g, idx) => (
                            <th key={idx} colSpan={g.colSpan} style={{ borderBottom: '1px solid #cbd5e1', fontSize: '9px', backgroundColor: '#f8fafc' }}>
                              {g.stage}
                            </th>
                          ))}
                        </tr>
                        <tr>
                          {part2Columns.map((c, idx) => (
                            <th key={idx} style={{ fontSize: '8px' }}>
                              {c.col === 'darasi' ? 'در' : c.col === 'mahfouthat' ? 'مح' : c.col === 'coptic1' ? 'ق1' : 'ق2'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedChurchPrintingData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-right-col font-bold" style={{ whiteSpace: 'nowrap' }}>{row.church}</td>
                            <td className="font-black bg-slate-50">{row.totalSubscribers}</td>
                            {part2Columns.map((c, cIdx) => {
                              const stgData = row.stages[c.stage];
                              return (
                                <td key={cIdx} style={{ color: stgData && stgData[c.col] > 0 ? '#334155' : '#cbd5e1' }}>
                                  {stgData ? stgData[c.col] : 0}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="summary-row">
                          <td className="text-right-col">الإجمالي العام</td>
                          <td className="font-black bg-slate-200">{aggregatedChurchPrintingTotals.subscribers}</td>
                          {part2Columns.map((c, cIdx) => {
                            const stgData = aggregatedChurchPrintingTotals.stages[c.stage];
                            return (
                              <td key={cIdx} className="font-black">
                                {stgData ? stgData[c.col] : 0}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <BookOpen className="text-coptic-gold" /> ملخص طلبات الكتب بالكنيسة
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4">الكنيسة</th>
                          <th className="p-4">إجمالي عدد الكتب</th>
                          <th className="p-4">إجمالي التكلفة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderSummaryByChurch.map((summary, index) => (
                          <tr key={summary.churchName} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-coptic-blue">{summary.churchName}</td>
                            <td className="p-4 text-slate-600 font-bold">{summary.totalBooks} كتاب</td>
                            <td className="p-4 font-black text-coptic-red">{summary.totalCost} ج.م</td>
                          </tr>
                        ))}
                        {orderSummaryByChurch.length === 0 && (
                          <tr>
                            <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">
                              لا توجد طلبات مسجلة
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <BookOpen className="text-coptic-gold" /> طلبات الكتب ({totalOrdersCount})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => exportOrdersToExcelDetailed((orders || []).filter(o => adminFilterChurch === 'الكل' || o.churchName === adminFilterChurch))}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                        title="تصدير ملف إكسيل مفصل بكل الكميات والمراحل"
                      >
                        <Download size={14} /> Excel مفصل
                      </button>
                      <button 
                        onClick={exportOrdersDetailedPDF}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-100 transition-colors"
                        title="تصدير تقرير PDF مفصل بكل الكميات والمراحل"
                      >
                        <FileText size={14} /> PDF مفصل
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto" id="orders-table-admin">
                    <div className="p-4 mb-4 bg-white border-b-4 border-coptic-blue relative">
                      <div className="absolute top-4 right-4 flex items-center justify-center">
                        <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-12 h-12 object-contain" />
                      </div>
                      <h2 className="text-3xl font-black text-coptic-blue text-center mb-1">تقرير طلبات الكتب العام</h2>
                      <p className="text-coptic-gold font-black uppercase tracking-widest text-xs text-center">مهرجان الكرازة {activeYear}</p>
                      <p className="text-[10px] text-slate-400 mt-2 text-center">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4">الكنيسة</th>
                          <th className="p-4">المكان</th>
                          <th className="p-4">التاريخ</th>
                          <th className="p-4">الإجمالي</th>
                          <th className="p-4 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(orders || [])
                          .filter(order => adminFilterChurch === 'الكل' || order.churchName === adminFilterChurch)
                          .map(order => (
                          <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-coptic-blue">{order.churchName}</td>
                            <td className="p-4 text-slate-600">{order.country}</td>
                            <td className="p-4 text-xs text-slate-400">{order.timestamp}</td>
                            <td className="p-4 font-black text-coptic-red">{order.grandTotal} ج.م</td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => setViewingOrder(order)}
                                  className="p-2 text-slate-400 hover:text-coptic-blue transition-colors"
                                  title="عرض تفاصيل الطلب"
                                >
                                  <Eye size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <UserPlus className="text-coptic-blue" /> المشتركين المسجلين
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => fetchParticipantsPage(true, true, participantSearch)}
                        disabled={isParticipantsLoading}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2"
                      >
                         <RotateCw size={14} className={isParticipantsLoading ? 'animate-spin' : ''} /> تحديث البيانات
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <h5 className="text-lg font-black text-slate-700">بيانات المشتركين التفصيلية</h5>
                    <p className="text-sm text-slate-500 font-bold max-w-md mx-auto mt-2">
                      تم نقل عرض الأسماء والبيانات الفردية إلى قسم "إدارة المشتركين" لضمان خصوصية البيانات وتوحيد واجهة الإدارة.
                    </p>
                  </div>
                </section>

                {/* Removed redundant/duplicated sections to optimize dashboard view */}

                <section className="pt-12 border-t border-slate-100">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                    <Link2 className="text-coptic-blue" /> إدارة لينكات الامتحانات (Google Forms)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {([...dynamicLevels].sort((a: any, b: any) => sortStages(a.name, b.name))).map((stage) => (
                      <div key={stage.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-all space-y-3">
                        <label className="text-[11px] font-black text-slate-500 uppercase">{stage.name}</label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="https://docs.google.com/forms/..."
                            value={examLinks[stage.name] || ''}
                            onChange={(e) => setExamLinks({ ...examLinks, [stage.name]: e.target.value })}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue"
                          />
                          <button 
                            onClick={() => handleUpdateExamLink(stage.name, examLinks[stage.name] || '')}
                            className="px-3 py-2 bg-coptic-blue text-white rounded-xl text-xs hover:bg-coptic-blue/90 transition-colors"
                          >
                            حفظ
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
                  </motion.div>
                </AnimatePresence>
            </div>
          </div>

          {/* Floating Live Real-time Notification System */}
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {showNotificationsDropdown && (
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setShowNotificationsDropdown(false)} 
              />
            )}

            <AnimatePresence>
              {showNotificationsDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="relative z-50 mb-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col font-arabic"
                  dir="rtl"
                >
                  {/* Dropdown Header */}
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell size={18} className="text-coptic-gold animate-bounce" />
                      <h4 className="font-black text-sm">البث المباشر للاشتراكات والطلبات</h4>
                    </div>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <button 
                        onClick={() => {
                          setNotifications(prev => {
                            const updated = prev.map(n => ({ ...n, read: true }));
                            localStorage.setItem('admin_notifications', JSON.stringify(updated));
                            return updated;
                          });
                        }} 
                        className="text-[10px] bg-white/10 hover:bg-white/20 transition-all font-black text-coptic-gold px-2.5 py-1 rounded-lg"
                      >
                        تعيين كمقروء
                      </button>
                    )}
                  </div>

                  {/* Dropdown Body */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {isLoadingNotifications && notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Loader2 className="animate-spin mx-auto mb-2 text-slate-500" size={24} />
                        <p className="text-xs font-bold">جاري تحميل البث المباشر...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="mx-auto mb-2 opacity-30 text-slate-500" size={32} />
                        <p className="text-xs font-bold leading-relaxed">لا توجد إشعارات جديدة خلال الـ 24 ساعة الماضية.<br/>البث المباشر نشط الآن ومستعد لاستقبال التغييرات.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => {
                        let bgClass = "bg-emerald-50 hover:bg-emerald-100/50 border-emerald-100 text-emerald-900";
                        let borderClass = "border-r-4 border-emerald-500";
                        let badgeColor = "bg-emerald-500 text-white";
                        let IconComponent = Activity;

                        if (notif.sourceTable === 'academic_registrations') {
                          bgClass = "bg-sky-50 hover:bg-sky-100/50 border-sky-100 text-sky-900";
                          borderClass = "border-r-4 border-blue-500";
                          badgeColor = "bg-blue-500 text-white";
                          IconComponent = Award;
                        } else if (notif.sourceTable === 'book_orders') {
                          bgClass = "bg-amber-50 hover:bg-amber-100/50 border-amber-100 text-amber-900";
                          borderClass = "border-r-4 border-amber-500";
                          badgeColor = "bg-amber-500 text-white";
                          IconComponent = ShoppingCart;
                        }

                        // Helper relative time generator inline
                        const getRelativeTimeArabic = (date: Date) => {
                          const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
                          if (seconds < 0 || seconds < 10) return 'الآن';
                          if (seconds < 60) return `منذ ${seconds} ثانية`;
                          
                          const minutes = Math.floor(seconds / 60);
                          if (minutes === 1) return 'منذ دقيقة';
                          if (minutes === 2) return 'منذ دقيقتين';
                          if (minutes < 11) return `منذ ${minutes} دقائق`;
                          if (minutes < 60) return `منذ ${minutes} دقيقة`;
                          
                          const hours = Math.floor(minutes / 60);
                          if (hours === 1) return 'منذ ساعة';
                          if (hours === 2) return 'منذ ساعتين';
                          if (hours < 11) return `منذ ${hours} ساعات`;
                          if (hours < 24) return `منذ ${hours} ساعة`;
                          
                          return 'منذ أكثر من يوم';
                        };

                        return (
                          <div 
                            key={notif.id} 
                            className={`p-4 transition-all flex items-start gap-4 border-b border-slate-100 ${bgClass} ${borderClass} ${!notif.read ? 'font-black' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${badgeColor}`}>
                              <IconComponent size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-800 leading-normal">{notif.message}</p>
                              <div className="flex items-center justify-between mt-1.5 text-[9px] text-slate-400 font-bold">
                                <span>{getRelativeTimeArabic(notif.timestamp)}</span>
                                <span>
                                  {notif.sourceTable === 'registrations' ? 'جدول الأنشطة' : 
                                   notif.sourceTable === 'book_orders' ? 'طلب كتب' : 'مسابقة دراسية'}
                                </span>
                              </div>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5 animate-pulse" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Dropdown Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold">
                    البث المباشر للإشراف العام مستمر
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Notification Bell Button */}
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                if (!showNotificationsDropdown) {
                  setNotifications(prev => {
                    const updated = prev.map(n => ({ ...n, read: true }));
                    localStorage.setItem('admin_notifications', JSON.stringify(updated));
                    return updated;
                  });
                }
              }}
              className="relative w-14 h-14 bg-slate-900 text-white hover:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all outline-none focus:ring-4 focus:ring-slate-300 z-50 group duration-300"
            >
              <Bell size={24} className={`text-white transition-all duration-300 ${notifications.filter(n => !n.read).length > 0 ? 'animate-bounce' : 'group-hover:rotate-12'}`} />
              
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 flex items-center justify-center bg-red-500 text-white font-black text-xs rounded-full border-2 border-white shadow-md">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
              
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute inset-0 rounded-full bg-red-500/20 window animate-ping -z-10" />
              )}
            </button>
          </div>
        </motion.div>
      )}

        {activeSection === 'inquiries' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            <BackButton />
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-coptic-gold/10 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="text-coptic-gold" size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-coptic-blue">قناة الاستفسارات والشكاوي</h3>
                  <p className="text-slate-400 font-bold">تواصل معنا وسنقوم بالرد عليك في أقرب وقت</p>
                </div>
              </div>

              {userRole === 'church' ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">رسالتك</label>
                    <textarea 
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="اكتب استفسارك أو شكواك هنا بالتفصيل..."
                      className="w-full h-40 px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-coptic-blue transition-all"
                    />
                  </div>
                  <button 
                    onClick={handleSendInquiry}
                    className="w-full py-4 bg-coptic-blue text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={20} />
                    <span>إرسال الاستفسار</span>
                  </button>

                  <div className="pt-8 border-t border-slate-100">
                    <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
                      <History size={18} className="text-coptic-gold" /> استفساراتك السابقة
                    </h4>
                    <div className="space-y-4">
                      {(inquiries || []).filter(inq => inq.churchName === churchName).map(inq => (
                        <div key={inq.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-sm font-bold text-slate-700 mb-2">{inq.message}</p>
                          {inq.reply && (
                            <div className="mt-2 p-3 bg-white rounded-xl border-r-4 border-coptic-blue">
                              <p className="text-xs font-black text-coptic-blue mb-1">رد المسئول:</p>
                              <p className="text-sm text-slate-600">{inq.reply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShieldCheck className="mx-auto text-coptic-blue mb-4" size={48} />
                  <p className="text-slate-600 font-bold">أنت الآن بصفة مسئول، يمكنك الرد على الاستفسارات من مركز التحكم.</p>
                  <button 
                    onClick={() => setActiveSection('admin_dashboard')}
                    className="mt-4 px-6 py-2 bg-coptic-blue text-white rounded-xl font-bold"
                  >
                    انتقل لمركز التحكم
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeSection === 'calculator' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8 font-arabic"
          >
            <BackButton />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                <Calculator size={28} className="text-primary" /> حاسبة طلب الكتب
              </h4>
              <p className="text-slate-500 text-sm font-bold">احسب تكلفة الكتب الرسمية للمهرجان</p>
            </div>

            <EarlyGateGuard targetType="church" targetName={churchName} actionType="orders" userRole={userRole} fallbackMessage="عفواً، استقبال طلبيات الكتب متوقف حالياً.">
            {/* Order Details Card */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Church size={20} className="text-primary" />
                <h5 className="font-black text-lg text-slate-800">بيانات الكنيسة</h5>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                    اسم الكنيسة
                  </label>
                  <input 
                    type="text" 
                    value={churchName}
                    readOnly={true}
                    className="w-full px-5 py-4 bg-slate-100/50 border border-slate-200 rounded-lg text-sm outline-none text-slate-500 cursor-not-allowed transition-all shadow-none font-arabic"
                  />
                </div>
              </div>
            </div>

            {/* Calculator Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <BookOpen className="text-coptic-blue" />
                    <h3 className="font-bold text-lg">حاسبة طلب الكتب</h3>
                  </div>
                  {!systemControls.isBookCalculatorOpen && (
                    <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-[10px] font-black w-fit mt-1 animate-pulse">
                      [مغلقة حاليًا من قبل اللجنة المركزية]
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={handleClearQuantities}
                    disabled={!systemControls.isBookCalculatorOpen}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all text-sm font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} /> مسح الكميات
                  </button>
                  <button 
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || !systemControls.isBookCalculatorOpen}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-md ${
                      isSubmitting || !systemControls.isBookCalculatorOpen ? 'bg-slate-400 cursor-not-allowed' : 'bg-coptic-red text-white hover:bg-opacity-90'
                    }`}
                  >
                    {isSubmitting ? 'جاري الإرسال...' : 'تسجيل الطلب للجنة'}
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-coptic-blue text-white rounded-lg hover:bg-opacity-90 transition-all text-sm font-bold shadow-md"
                  >
                    <Download size={16} /> تصدير PDF
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50/30">
                {isCalculatorLoading ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-slate-400 font-bold">جاري تحميل الكتب...</span>
                  </div>
                ) : calculatorSettings.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-bold">
                    لا توجد كتب مضافة حاليًا
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Object.keys(groupedSettings)
                      .sort(sortStages)
                      .map((stage) => {
                        const stageTotal = Object.values(groupedSettings[stage])
                          .flat()
                          .reduce((sum, s) => sum + ((quantities[s.id] || 0) * s.price), 0);
                      
                      return (
                        <div key={stage} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="font-black text-slate-800">{stage}</h4>
                            <span className="font-black text-primary bg-white px-3 py-1 rounded-full text-sm shadow-sm">{stageTotal} ج.م</span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col gap-4">
                            {['دراسي', 'محفوظات', 'قبطي', 'أنشطة', 'تطبيقات'].map(material => {
                              const items = groupedSettings[stage][material];
                              if (!items || items.length === 0) return null;
                              return (
                                <div key={material} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0 gap-4">
                                  <span className="text-sm font-bold text-slate-600 w-24 shrink-0">{material}</span>
                                  <div className="flex flex-col gap-2 flex-1 items-end">
                                    {items.map((setting: any) => (
                                      <div key={setting.id} className="flex items-center justify-end gap-3 w-full">
                                        <span className="text-xs text-slate-400 font-bold whitespace-nowrap">{setting.price} ج.م</span>
                                        <input 
                                          type="number" 
                                          min="0"
                                          value={quantities[setting.id] || ''}
                                          onChange={(e) => handleQuantityChange(setting.id, e.target.value)}
                                          disabled={!systemControls.isBookCalculatorOpen}
                                          className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-sm outline-none focus:bg-white focus:border-primary transition-all shrink-0 font-arabic tabular-nums disabled:opacity-50 disabled:cursor-not-allowed"
                                          placeholder="0"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="font-black text-xl">المجموع الكلي للطلب</span>
                <span className="font-black text-3xl text-accent">{calculations.grandTotal} ج.م</span>
              </div>
            </div>

            {/* Print-only Invoice Template - Rendered off-screen with ultra-precision for high-DPI font calculations and sizing */}
            <div style={{ position: 'absolute', left: '-9999px', top: '0', zIndex: -100, pointerEvents: 'none', width: '210mm' }}>
              <div ref={invoiceRef} className="p-10 bg-white text-slate-900 font-arabic leading-relaxed" dir="rtl" style={{ width: '210mm' }}>
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
                  .font-arabic { 
                    font-family: 'Tajawal', sans-serif !important; 
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                  }
                  .font-arabic * {
                    font-family: 'Tajawal', sans-serif !important;
                  }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                  th { background-color: #f8fafc; font-weight: 900; color: #020617; border-bottom: 2px solid #cbd5e1; }
                  td, th { padding: 16px 12px !important; line-height: 2.2 !important; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 800; }
                  .text-primary { color: #0F172A; }
                  .tabular-nums { font-variant-numeric: tabular-nums; }
                `}</style>
                <div className="flex justify-between items-start border-b-4 border-coptic-blue pb-6 mb-10">
                  <div className="flex items-center gap-4">
                    {userRole === 'church' && <img src={logoBase64 || getValidLogoUrl(userProfile?.logoUrl, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-16 h-16 rounded-full object-contain shadow-sm border border-slate-100 bg-white" crossOrigin="anonymous" />}
                    <div>
                      <h1 className="text-4xl font-black text-coptic-blue mb-2">مهرجان الكرازة {activeYear}</h1>
                      <p className="text-coptic-gold font-bold uppercase tracking-widest text-sm">فاتورة طلب كتب رسمية - نسخة طبق الأصل</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">{churchName || '________________'}</p>
                    <p className="text-xs text-slate-400 mt-2 tabular-nums">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                  </div>
                </div>

                <table className="w-full mb-10 text-right">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="p-3">المرحلة</th>
                      <th className="p-3">المادة</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center">السعر</th>
                      <th className="p-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.rows.filter(r => r.subtotal > 0).map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="p-3 font-bold">{item.stage}</td>
                        <td className="p-3 font-bold">{item.material}</td>
                        <td className="p-3 text-center font-black tabular-nums">{item.quantity}</td>
                        <td className="p-3 text-center font-bold tabular-nums">{item.price} ج.م</td>
                        <td className="p-3 text-left font-black tabular-nums">{item.subtotal} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={4} className="p-4 text-left font-black">المجموع الكلي</td>
                      <td className="p-4 text-left text-xl font-black tabular-nums text-coptic-gold">{calculations.grandTotal} ج.م</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-2 gap-10 mt-20">
                  <div className="border-t border-slate-300 pt-4">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-8">توقيع الخادم</p>
                    <div className="h-px bg-slate-200 w-full"></div>
                  </div>
                  <div className="border-t border-slate-300 pt-4">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-8">توقيع  الكاهن</p>
                    <div className="h-px bg-slate-200 w-full"></div>
                  </div>
                </div>

                <div className="mt-20 text-center text-slate-400 text-[10px] uppercase tracking-widest">
                  "يعظم انتصارنا بالذي أحبنا" - رو ٨ : ٣٧
                </div>
              </div>

              {/* Detailed Orders Report for Admin PDF */}
              <div id="detailed-orders-report-admin" className="p-10 bg-white text-slate-900 font-arabic leading-relaxed" dir="rtl" style={{ width: '210mm' }}>
                <style>{`
                  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
                  #detailed-orders-report-admin, .font-arabic { font-family: 'Tajawal', sans-serif !important; }
                  #detailed-orders-report-admin * { font-family: 'Tajawal', sans-serif !important; }
                  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                  th { background-color: #f8fafc; font-weight: 900; color: #020617; border-bottom: 2px solid #cbd5e1; }
                  td, th { padding: 16px 12px !important; line-height: 2.2 !important; border-bottom: 1px solid #cbd5e1; text-align: right; font-weight: 800; }
                `}</style>
                <div className="text-center border-b-4 border-coptic-blue pb-8 mb-10 relative">
                  <div className="absolute top-0 right-0 flex items-center justify-center">
                    <img src={logoBase64 || getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-16 h-16 object-contain" crossOrigin="anonymous" />
                  </div>
                  <h1 className="text-4xl font-black text-coptic-blue mb-2">تقرير طلبات الكتب التفصيلي المجمع</h1>
                  <p className="text-coptic-gold font-bold uppercase tracking-widest text-sm">مهرجان الكرازة {activeYear}</p>
                  <p className="text-xs text-slate-400 mt-4">تاريخ استخراج التقرير: {new Date().toLocaleString('ar-EG')}</p>
                </div>

                {(orders || [])
                  .filter(o => globalChurchFilter === 'الكل' || o.churchName === globalChurchFilter)
                  .map((order, idx) => (
                  <div key={order.id} className={`mb-12 ${idx !== 0 ? 'pt-12 border-t border-slate-200' : ''}`}>
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h2 className="text-xl font-black text-coptic-blue">كنيسة: {order.churchName}</h2>
                        <p className="text-sm text-slate-500">المكان: {order.country}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-400">التاريخ: {order.timestamp}</p>
                        <p className="text-lg font-black text-coptic-red">الإجمالي: {order.grandTotal} ج.م</p>
                      </div>
                    </div>

                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] font-black">
                          <th className="p-2 border border-slate-200">المرحلة</th>
                          <th className="p-2 border border-slate-200">المادة</th>
                          <th className="p-2 border border-slate-200 text-center">الكمية</th>
                          <th className="p-2 border border-slate-200 text-center">السعر</th>
                          <th className="p-2 border border-slate-200 text-left">المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...calculatorSettings].sort((a, b) => sortStages(a.stage, b.stage) || a.material.localeCompare(b.material)).map((setting: any, dIdx: number) => {
                          const detail = order.details.find((d: any) => d.settingId === setting.id || (d.stage === setting.stage && d.material === setting.material));
                          if (!detail || detail.quantity <= 0) return null;
                          return (
                            <tr key={setting.id} className="text-xs">
                              <td className="p-2 border border-slate-200 font-bold">{setting.stage}</td>
                              <td className="p-2 border border-slate-200">{setting.material}</td>
                              <td className="p-2 border border-slate-200 text-center">{detail.quantity}</td>
                              <td className="p-2 border border-slate-200 text-center">{setting.price} ج.م</td>
                              <td className="p-2 border border-slate-200 text-left font-mono">{detail.quantity * setting.price} ج.م</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
            </EarlyGateGuard>
          </motion.div>
        )}

        {activeSection === 'registration' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
            <BackButton />
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center overflow-hidden shadow-inner border border-primary/10">
                  <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-full h-full object-contain bg-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-primary">تسجيل المشتركين - كنيسة {churchName}</h3>
                  <p className="text-slate-400 font-bold">قم بإضافة بيانات المخدومين للمشاركة في المهرجان</p>
                </div>
              </div>

              {/* Team Registration form content starts below directly */}

              <EarlyGateGuard targetType="church" targetName={churchName} actionType="registration" userRole={userRole} fallbackMessage="عفواً، التسجيل مغلق .">
                <div className="space-y-8">
                  {viewMode === 'edit' ? (
                    <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                    <UserPlus size={28} className="text-primary" /> تسجيل مشترك جديد
                    {userRole === 'admin' && (
                      <button type="button" onClick={bulkInsertParticipants} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-black hover:bg-purple-700 cursor-pointer">
                        حقن بيانات 20 مشترك (خاص)
                      </button>
                    )}
                  </h4>
                  <p className="text-slate-500 text-sm font-bold">يرجى ملء البيانات التالية بدقة</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Basic Information Card */}
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-8">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                      <User size={20} className="text-primary" />
                      <h5 className="font-black text-lg text-slate-800">البيانات الأساسية</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                                اسم المخدوم ثلاثيًا
                              </label>
                              <input 
                                type="text" 
                                placeholder="أدخل الاسم الثلاثي"
                                value={newParticipant.name}
                                onChange={e => setNewParticipant({...newParticipant, name: e.target.value})}
                                onBlur={handleNameBlur}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary focus:ring-0 transition-all shadow-none"
                                required
                              />
                              {isCheckingParticipantDuplicate && (
                                <p className="text-[10px] text-slate-400 animate-pulse font-medium mt-1">جاري التحقق من قاعدة البيانات...</p>
                              )}
                              {participantDuplicateWarning && (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-1.5 flex items-start gap-2 text-amber-800 text-[11px] font-bold leading-relaxed shadow-sm transition-all animate-fade-in">
                                  <span className="shrink-0 text-amber-500 font-bold">⚠️</span>
                                  <span>{participantDuplicateWarning}</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                                المرحلة الدراسية
                              </label>
                              <select 
                                value={newParticipant.stage}
                                onChange={e => setNewParticipant({...newParticipant, stage: e.target.value})}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary focus:ring-0 transition-all shadow-none appearance-none"
                                required
                              >
                                <option value="">اختر المرحلة</option>
                                {dynamicLevels.map((p: any) => <option key={p.id || (typeof p === 'string' ? p : p.name)} value={typeof p === 'string' ? p : p.name}>{typeof p === 'string' ? p : p.name}</option>)}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                                النوع
                              </label>
                              <div className="flex bg-slate-100 rounded-lg p-1.5 gap-1.5 w-full h-[54px]">
                                <button
                                  type="button"
                                  onClick={() => setNewParticipant({...newParticipant, gender: 'ذكر'})}
                                  className={`flex-1 flex items-center justify-center text-sm font-black rounded transition-all ${newParticipant.gender === 'ذكر' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                  ذكر
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewParticipant({...newParticipant, gender: 'أنثى'})}
                                  className={`flex-1 flex items-center justify-center text-sm font-black rounded transition-all ${newParticipant.gender === 'أنثى' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:bg-slate-200'}`}
                                >
                                  أنثى
                                </button>
                              </div>
                              <input type="text" name="gender" value={newParticipant.gender} required className="hidden" readOnly />
                            </div>
                          </div>
                        </div>

                        {/* Competition Selection Card */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-8">
                          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <Trophy size={20} className="text-primary" />
                            <h5 className="font-black text-lg text-slate-800">اختيار المسابقات</h5>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[0, 1, 2].map((idx) => {
                              const selectedComps = newParticipant.competitions;
                              const currentLevel = dynamicLevels.find(l => l.name === newParticipant.stage);
                              const availableCompsForLevel = currentLevel ? currentLevel.comps : [];
                              
                              const isOptionDisabled = (val: string) => {
                                if (!val) return false;
                                if (selectedComps.some((c, i) => i !== idx && c === val)) return true;
                                if (val.includes('قبطي مستوى') && selectedComps.some((c, i) => i !== idx && c.includes('قبطي مستوى'))) return true;
                                return false;
                              };

                              return (
                                <div key={idx} className="space-y-2">
                                  <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                                    المسابقة رقم {idx + 1}
                                  </label>
                                  <select 
                                    value={newParticipant.competitions[idx]}
                                    onChange={e => {
                                      const newComps = [...newParticipant.competitions];
                                      newComps[idx] = e.target.value;
                                      setNewParticipant({...newParticipant, competitions: newComps});
                                    }}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary focus:ring-0 transition-all shadow-none appearance-none"
                                  >
                                    <option value="">-- اختر المسابقة --</option>
                                    {availableCompsForLevel.map((comp: string) => (
                                      <option 
                                        key={comp} 
                                        value={comp} 
                                        disabled={isOptionDisabled(comp)}
                                      >
                                        {comp}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              );
                            })}
                          </div>
                          
                          {newParticipant.competitions.some(c => c.startsWith('قبطي')) && (
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
                              <Info size={16} className="text-primary mt-0.5" />
                              <p className="text-xs text-primary font-bold">
                                ملاحظة: مسموح باختيار مستوى قبطي واحد فقط للمشترك الواحد.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Honeypot Anti-Bot Field */}
                        <input
                          type="text"
                          name="_sub_backend_version_gate"
                          style={{
                            position: 'absolute',
                            left: '-9999px',
                            top: 'auto',
                            width: '1px',
                            height: '1px',
                            overflow: 'hidden',
                            opacity: 0
                          }}
                          tabIndex={-1}
                          autoComplete="new-password"
                          aria-hidden="true"
                          value={registerHoneypot}
                          onChange={(e) => setRegisterHoneypot(e.target.value)}
                        />

                        {/* Submit Button Section */}
                        <div className="flex flex-col md:flex-row gap-4 pt-4">
                          <button 
                            onClick={handleAddParticipant}
                            disabled={isSubmittingParticipant}
                            className={`flex-1 py-4 text-white rounded-lg font-black text-base shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-3 ${isSubmittingParticipant ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary'}`}
                          >
                            {isSubmittingParticipant ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <UserPlus size={20} />}
                            {isSubmittingParticipant ? 'جاري التسجيل...' : 'تسجيل المشترك'}
                          </button>
                          <button 
                            onClick={() => {
                              setNewParticipant({ name: '', stage: '', gender: '', country: '', competitions: ['', '', ''] });
                              setRegistrationStep(1);
                            }}
                            className="px-8 py-4 bg-slate-100 text-slate-600 rounded-lg font-black text-base hover:bg-slate-200 transition-all"
                          >
                            إعادة تعيين
                          </button>
                        </div>
                      </div>

                    {/* Preview Toggle Button */}
                    <div className="pt-8 border-t border-slate-100">
                      <button 
                         onClick={() => setViewMode('preview')}
                         className="w-full py-8 bg-white border-2 border-purple-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-purple-600 hover:border-purple-600 hover:bg-purple-50 transition-all shadow-sm group border-dashed"
                      >
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Eye size={32} />
                        </div>
                        <div className="text-center">
                          <h4 className="font-black text-xl mb-1">معاينة المشتركين المسجلين</h4>
                          <p className="text-sm font-bold text-slate-400">عرض وإدارة {totalParticipantsCount} مشترك تم تسجيلهم حاليًا</p>
                        </div>
                      </button>
                    </div>

                    {/* Activity Teams Registration */}
                    <div className="pt-12 border-t border-slate-100 space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                          <Users size={32} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800">تسجيل فرق الأنشطة</h3>
                          <p className="text-slate-500 font-bold">سجل فريقك في مسابقات الكورال، الألحان، أو العزف</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <Plus size={24} className="text-primary" />
                            <h4 className="font-black text-xl text-slate-800">نموذج تسجيل فريق</h4>
                          </div>
                          
                          <div className="relative">
                            <form id="team-registration-form" onSubmit={handleAddTeam} className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-8">
                              {editingTeam && (
                              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                                <p className="text-sm font-bold text-blue-700">أنت الآن تقوم بتعديل بيانات فريق مسجل</p>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setEditingTeam(null);
                                    setNewTeam({
                                      activityType: '',
                                      members: [{ name: '', gender: 'ذكر', stage: '' }],
                                      choirLevel: '',
                                      instrumentType: '',
                                      performanceType: '',
                                      maleCount: 0,
                                      femaleCount: 0
                                    });
                                    setActivity_type('');
                                  }}
                                  className="text-xs font-black text-blue-500 hover:underline"
                                >
                                  إلغاء التعديل
                                </button>
                              </div>
                            )}
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">المجال (نوع النشاط الرئيسي)</label>
                              <select 
                                value={newTeam.activityType || ''}
                                onChange={e => handleActivityTypeChange(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                                required
                              >
                                <option value="">-- اختر النشاط الرئيسي --</option>
                                {activities.map((activity: string) => (
                                  <option key={activity} value={activity}>{activity}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">نوع النشاط *</label>
                              <select 
                                value={activity_type}
                                onChange={e => setActivity_type(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                                required
                              >
                                <option value="">-- اختر نوع النشاط --</option>
                                {(() => {
                                  const parent = newTeam.activityType;
                                  if (!parent) return null;
                                  if (parent === 'ألحان') {
                                    return (
                                      <>
                                        <option value="ألحان فردي">ألحان فردي</option>
                                        <option value="ألحان جماعي">ألحان جماعي</option>
                                      </>
                                    );
                                  }
                                  if (parent === 'عزف') {
                                    return (
                                      <>
                                        <option value="عزف فردي">عزف فردي</option>
                                        <option value="عزف جماعي">عزف جماعي</option>
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      <option value={parent}>{parent}</option>
                                      <option value={`${parent} فردي`}>{parent} فردي</option>
                                      <option value={`${parent} جماعي`}>{parent} جماعي</option>
                                    </>
                                  );
                                })()}
                              </select>
                            </div>

                            {newTeam.activityType && (
                              <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">المرحلة</label>
                                <select 
                                  value={newTeam.choirLevel || ''}
                                  onChange={e => setNewTeam({...newTeam, choirLevel: e.target.value})}
                                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                                  required
                                >
                                  <option value="">-- اختر المرحلة --</option>
                                  {newTeam.activityType === 'ألحان' ? (
                                    hymnStages.map((stage: any) => (
                                      <option key={stage.id} value={stage.id}>{stage.name}</option>
                                    ))
                                  ) : (
                                    activityStages.map((stage: any) => (
                                      <option key={stage.id} value={stage.id}>{stage.stage_name || stage.name}</option>
                                    ))
                                  )}
                                </select>
                              </div>
                            )}

                            {(() => {
                              const selectedStageId = newTeam.choirLevel || '';
                              if (!selectedStageId) return null;

                              const selectedStage = newTeam.activityType === 'ألحان'
                                ? hymnStages.find((stage: any) => String(stage.id) === String(selectedStageId) || String(stage.name) === String(selectedStageId))
                                : activityStages.find((stage: any) => String(stage.id) === String(selectedStageId) || String(stage.stage_name) === String(selectedStageId));
                              
                              const selectedStageName = selectedStage?.stage_name || selectedStage?.name || selectedStageId;
                              
                              let formType = selectedStage?.form_type || '';
                              if (newTeam.activityType === 'عزف') {
                                formType = 'عزف';
                              } else if (['ترنيم فردي', 'ثقافية', 'أدبية', 'فنون تشكيلية', 'كمبيوتر', 'الأدبية', 'الثقافية', 'الفنون التشكيلية'].includes(newTeam.activityType || '')) {
                                formType = 'فردي';
                              } else if (newTeam.activityType === 'كورال') {
                                formType = 'جماعي';
                              } else if (newTeam.activityType === 'ألحان') {
                                formType = selectedStageName.includes('فردي') ? 'فردي' : 'جماعي';
                              } else if (!formType) {
                                formType = 'فردي';
                              }

                              if (formType === 'جماعي') {
                                return (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <label className="text-[11px] font-black text-slate-900 block mb-1">اسم الفريق</label>
                                      <input 
                                        type="text"
                                        placeholder="أدخل اسم الفريق..."
                                        value={newTeam.team_name || ''}
                                        onChange={e => setNewTeam({...newTeam, team_name: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                                      />
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">عدد الذكور</p>
                                        <input 
                                          type="number"
                                          min="0"
                                          value={newTeam.maleCount || 0}
                                          onChange={e => setNewTeam({...newTeam, maleCount: parseInt(e.target.value) || 0})}
                                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center font-black text-primary outline-none focus:border-primary"
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">عدد الإناث</p>
                                        <input 
                                          type="number"
                                          min="0"
                                          value={newTeam.femaleCount || 0}
                                          onChange={e => setNewTeam({...newTeam, femaleCount: parseInt(e.target.value) || 0})}
                                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center font-black text-primary outline-none focus:border-primary"
                                        />
                                      </div>
                                      <div className="space-y-2 flex flex-col justify-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي العدد</p>
                                        <p className="text-2xl font-black text-primary">{(Number(newTeam.maleCount) || 0) + (Number(newTeam.femaleCount) || 0)}</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else if (formType === 'فردي') {
                                return (
                                  <div className="space-y-3 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <label className="text-[11px] font-black text-slate-900 block mb-1">اسم المشترك (فردي)</label>
                                    <div className="relative">
                                      <input 
                                        type="text"
                                        placeholder="أدخل اسم المشترك للبحث والربط..."
                                        value={individualParticipantName || ''}
                                        onChange={e => handleIndividualNameChange(e.target.value)}
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary transition-all font-bold text-slate-800"
                                        required
                                      />
                                      {matchingParticipants.length > 0 && (
                                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto w-full">
                                          <div className="p-2 bg-slate-100 text-[10px] font-black text-slate-500 border-b border-slate-100 text-right">
                                            هذا المشترك مسجل بالفعل، اختر الاسم للربط:
                                          </div>
                                          {matchingParticipants.map((p) => (
                                            <button
                                              key={p.id}
                                              type="button"
                                              onClick={() => selectMatchingParticipant(p)}
                                              className="w-full text-right p-3 hover:bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-50 flex justify-between items-center transition-colors"
                                            >
                                              <span>{p.name}</span>
                                              <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                {p.stage}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {linkedParticipantMessage && (
                                        <p className="text-xs text-green-600 font-bold mt-2 text-right">
                                          {linkedParticipantMessage}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              } else if (formType === 'عزف') {
                                return (
                                  <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-black text-slate-900 block mb-1">اسم المشترك</label>
                                      <div className="relative">
                                        <input 
                                          type="text"
                                          placeholder="أدخل اسم المشترك للبحث والربط..."
                                          value={individualParticipantName || ''}
                                          onChange={e => handleIndividualNameChange(e.target.value)}
                                          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary transition-all font-bold text-slate-800"
                                          required
                                        />
                                        {matchingParticipants.length > 0 && (
                                          <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                            <div className="p-2 bg-slate-100 text-[10px] font-black text-slate-500 border-b border-slate-100 text-right">
                                              هذا المشترك مسجل بالفعل، اختر الاسم للربط:
                                            </div>
                                            {matchingParticipants.map((p) => (
                                              <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => selectMatchingParticipant(p)}
                                                className="w-full text-right p-3 hover:bg-slate-50 text-xs font-bold text-slate-700 border-b border-slate-50 flex justify-between items-center transition-colors"
                                              >
                                                <span>{p.name}</span>
                                                <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                  {p.stage}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                        {linkedParticipantMessage && (
                                          <p className="text-xs text-green-600 font-bold mt-2 text-right">
                                            {linkedParticipantMessage}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[11px] font-black text-slate-900 block mb-1">نوع الآلة الموسيقية (Instrument Type)</label>
                                      <input 
                                        type="text"
                                        placeholder="أدخل نوع الآلة (أورج، كمان، جيتار...)"
                                        value={newTeam.instrumentType || ''}
                                        onChange={e => setNewTeam({...newTeam, instrumentType: e.target.value})}
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary transition-all font-bold text-slate-800"
                                        required
                                      />
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            <button 
                              type="submit" 
                              disabled={isSubmittingTeam}
                              className={`w-full py-4 text-white rounded-lg font-black text-base shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-3 ${isSubmittingTeam ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary'}`}
                            >
                              {isSubmittingTeam ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Users size={20} />}
                              {isSubmittingTeam ? 'جاري التسجيل...' : 'تسجيل الفريق'}
                            </button>
                          </form>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <Users size={24} className="text-primary" />
                            <h4 className="font-black text-xl text-slate-800">الفرق المسجلة</h4>
                          </div>
                          <div className="max-h-[800px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                            {filteredTeamsList
                              .map(t => (
                              <div key={t.id} className="p-6 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                {(userRole === 'admin' || userRole === 'church') && (
                                  <button 
                                    onClick={() => handleDeleteTeam(t.id)}
                                    className="absolute left-4 top-4 p-2.5 text-rose-500 bg-rose-50/70 hover:bg-rose-100 sm:text-slate-300 sm:bg-transparent sm:hover:bg-rose-50 sm:hover:text-rose-600 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10"
                                    title="حذف الفريق"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                                
                                <div className="mb-4">
                                  <h5 className="text-lg font-black text-slate-800">{(t as any).stage_name || t.choirLevel || t.activityType}</h5>
                                  {(t as any).team_name && (t as any).team_name !== ((t as any).stage_name || t.choirLevel) && (
                                    <p className="text-xs font-bold text-primary mt-1">{(t as any).team_name}</p>
                                  )}
                                  {t.performanceType && <p className="text-xs font-bold text-emerald-600 mt-1">{t.performanceType}</p>}
                                  {t.instrumentType && <p className="text-xs font-bold text-primary mt-1">{t.instrumentType}</p>}
                                </div>

                                 <div className="space-y-3">
                                  {(t as any).stage_name?.includes('جماعي') || t.activityType === 'كورال' || t.activityType === 'ألحان' ? null : (
                                    <>
                                      <p className="text-[10px] font-black text-slate-400 uppercase">المشترك</p>
                                      <div className="flex flex-wrap gap-2">
                                        {(t.members || []).map((m, i) => (
                                          <div key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                                            {m.name} <span className="text-slate-300 mx-1">|</span> {m.stage}
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                                  {(t as any).stage_name?.includes('جماعي') || t.activityType === 'كورال' || t.activityType === 'ألحان' ? (
                                    <div className="flex gap-4">
                                      <span className="text-[10px] font-black text-primary">ذكور: {t.maleCount || 0}</span>
                                      <span className="text-[10px] font-black text-primary">إناث: {t.femaleCount || 0}</span>
                                      <span className="text-[10px] font-black text-slate-500">إجمالي: {t.members_number || (t.maleCount || 0) + (t.femaleCount || 0)}</span>
                                    </div>
                                  ) : (
                                    <div className="flex gap-4">
                                      <span className="text-[10px] font-black text-primary">النوع: {t.members[0]?.gender || '-'}</span>
                                    </div>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-400">{new Date(t.timestamp).toLocaleDateString('ar-EG')}</span>
                                </div>
                              </div>
                            ))}
                            
                            {filteredTeamsList.length === 0 && (
                              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                                <Users size={48} className="text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold">لا يوجد فرق مسجلة حالياً</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                      <button 
                         onClick={() => setViewMode('edit')}
                         className="flex items-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-2xl font-black text-base shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-fit"
                      >
                        <ChevronRight size={24} />
                        العودة لصفحة التسجيل
                      </button>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-3 mb-1">
                          <Users size={24} className="text-primary" />
                          <h3 className="text-2xl font-black text-slate-800">سجل المشتركين المسجلين</h3>
                        </div>
                        <p className="text-sm font-bold text-slate-400">تحكم وإدارة جميع بيانات مخدومين كنيسة {churchName} • {totalParticipantsCount} مخدوم</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {participants
                          .filter(p => p.churchName === churchName)
                          .map(p => (
                          <div key={p.id} className="p-5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary font-black shadow-sm">
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <h5 className="font-black text-slate-800 text-sm">{p.name}</h5>
                                <p className="text-[10px] font-bold text-slate-400">{p.stage}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-1">
                                {(p.competitions || []).filter(Boolean).map((c, i) => (
                                  <div key={i} className="w-6 h-6 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[8px] font-black text-primary" title={c}>
                                    {c.charAt(0)}
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-1 items-center">
                                <button 
                                  onClick={() => downloadStudentQRCode(p)}
                                  className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="تحميل كود الـ QR"
                                >
                                  <QrCode size={18} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setViewMode('edit');
                                    handleEditParticipant(p);
                                  }}
                                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                                  title="تعديل (تحرير)"
                                >
                                  <Pencil size={18} />
                                </button>
                                <button 
                                  onClick={() => {
                                    confirmAndDeleteParticipant(p.id);
                                  }}
                                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {totalParticipantsCount === 0 && (
                          <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">لا يوجد مشتركين مسجلين بعد</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              </EarlyGateGuard>
            </div>
          </motion.div>
        )}

        {activeSection === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <BackButton />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all group">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-primary/5 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{schedule.examName}</h3>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">التاريخ والوقت</p>
                        <p className="text-sm font-black text-slate-800">{schedule.date} - {schedule.time}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">المكان / اللجنة</p>
                        <p className="text-sm font-black text-slate-800">{schedule.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl shadow-xl border border-slate-100">
                  <Calendar className="mx-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-400 font-bold text-lg">لا توجد مواعيد معلنة حالياً</p>
                </div>
              )}
            </div>

            {/* Exam Links Section */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <ExternalLink size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">روابط الامتحانات أونلاين</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">روابط Google Forms</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(examLinks).map(([stage, url], idx) => (
                  <a 
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-700 text-sm">{stage}</span>
                      <ExternalLink size={14} className="text-slate-300 group-hover:text-emerald-500" />
                    </div>
                  </a>
                ))}
                {Object.keys(examLinks).length === 0 && (
                  <div className="col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">لا توجد روابط متاحة حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <BackButton />
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center">
                  <Info className="text-primary" size={32} />
                </div>
                <h3 className="text-3xl font-black text-slate-900">عن مهرجان الكرازة</h3>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-600 leading-relaxed mb-10 font-bold whitespace-pre-wrap">
                  {aboutContent.aboutText || 'مهرجان الكرازة المرقسية هو نشاط كنسي سنوي يجمع أبناء الكنيسة القبطية الأرثوذكسية من جميع أنحاء العالم تحت شعار واحد وهدف واحد.'}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                  <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-xl font-black text-primary mb-4 flex items-center gap-2">
                      <div className="w-2 h-8 bg-accent rounded-full" /> رؤيتنا
                    </h4>
                    <p className="text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">
                      {aboutContent.vision || 'بناء جيل واعي ومتمسك بإيمانه الأرثوذكسي، قادر على مواجهة تحديات العصر بروح الغلبة والانتصار بالمسيح.'}
                    </p>
                  </div>
                  <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
                    <h4 className="text-xl font-black text-primary mb-4 flex items-center gap-2">
                      <div className="w-2 h-8 bg-accent rounded-full" /> رسالتنا
                    </h4>
                    <p className="text-slate-500 font-bold leading-relaxed whitespace-pre-wrap">
                      {aboutContent.mission || 'تعميق المعرفة الكتابية والطقسية واكتشاف وتنمية المواهب الفنية والرياضية بروح التنافس الشريف والمحبة الأخوية.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-black text-white py-24 mt-20 relative overflow-hidden border-t border-white/5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -mr-48 -mt-48 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 blur-[120px] rounded-full -ml-48 -mb-48" />
        
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10">
          <div className="space-y-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white shadow-2xl border border-white/20 p-2 overflow-hidden">
                <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-full h-full object-contain bg-white" />
              </div>
              <div>
                <h4 className="text-3xl font-black tracking-tighter">مهرجان ٢٠٢٦</h4>
                <div className="h-1 w-12 bg-primary rounded-full mt-1" />
              </div>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed font-medium max-w-sm">
              اللجنة المركزية المنطقة ١٨ - إيبارشية مغاغة والعدوة. نهدف لتنمية المواهب الروحية والفنية لأبناء الكنيسة في جو من المحبة والقداسة.
            </p>
            <div className="flex gap-5">
              {siteSettings.facebook && (
                <a href={siteSettings.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-lg border border-white/10 group">
                  <svg className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {siteSettings.telegram && (
                <a href={siteSettings.telegram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-sky-500 hover:text-white transition-all shadow-lg border border-white/10 group">
                  <svg className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M11.944 0C5.346 0 0 5.346 0 11.944c0 6.598 5.346 11.944 11.944 11.944 6.598 0 11.944-5.346 11.944-11.944C23.888 5.346 18.542 0 11.944 0zm5.206 16.561c-.192.191-.447.286-.7.286-.253 0-.506-.095-.698-.286l-3.808-3.808-3.808 3.808c-.192.191-.447.286-.7.286-.253 0-.506-.095-.698-.286-.385-.385-.385-1.01 0-1.396l3.808-3.808-3.808-3.808c-.385-.385-.385-1.01 0-1.396.385-.385 1.01-.385 1.396 0l3.808 3.808 3.808-3.808c.385-.385 1.01-.385 1.396 0 .385.385.385 1.01 0 1.396l-3.808 3.808 3.808 3.808c.385.385.385 1.01 0 1.396z"/></svg>
                </a>
              )}
            </div>
          </div>
          
          <div className="space-y-8">
            <h5 className="text-xl font-black border-r-4 border-primary pr-4">روابط سريعة</h5>
            <ul className="space-y-4 text-slate-400 font-bold text-base">
              <li><button onClick={() => setActiveSection('home')} className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> الرئيسية</button></li>
              <li><button onClick={() => setActiveSection('news')} className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> آخر الأخبار</button></li>
              <li><button onClick={handleOpenExams} className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> امتحانات الأونلاين</button></li>
              <li><button onClick={() => setActiveSection('calculator')} className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> حاسبة الكتب</button></li>
            </ul>
          </div>

          <div className="space-y-8">
            <h5 className="text-xl font-black border-r-4 border-primary pr-4">تواصل معنا</h5>
            <div className="text-slate-400 text-base space-y-6">
              <p className="font-bold leading-relaxed">لأي استفسارات بخصوص التسجيل أو المسابقات، يرجى التواصل مع أمناء الخدمة بكنيستكم أو عبر الأرقام التالية:</p>
              <div className="space-y-4">
                {siteSettings.phone && (
                  <a href={`tel:${siteSettings.phone}`} className="flex items-center gap-4 text-white hover:text-primary transition-all group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-lg border border-white/5">
                      <Phone size={20} />
                    </div>
                    <span className="font-mono text-xl tracking-wider" dir="ltr">{siteSettings.phone}</span>
                  </a>
                )}
              </div>
            </div>
            <div className="pt-8 border-t border-white/5 text-xs font-black text-slate-500 uppercase tracking-[0.2em]">
              {siteSettings.copyright || '© ٢٠٢٦ جميع الحقوق محفوظة - اللجنة المركزية'}
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Inquiry Button */}
      {isLoggedIn && userRole === 'church' && (
        <button 
          onClick={() => setActiveSection('inquiries')}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-coptic-gold text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
          title="إرسال استفسار أو شكوى"
        >
          <MessageSquare size={24} />
          <span className="absolute right-full mr-3 bg-slate-800 text-white text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            إرسال استفسار أو شكوى
          </span>
        </button>
      )}
      <DeleteConfirmationModal />
      
      <AdminBulkRegister
        isOpen={isAdminBulkRegisterOpen}
        onClose={() => setIsAdminBulkRegisterOpen(false)}
        publicChurches={publicChurches}
        dynamicLevels={dynamicLevels}
        onSuccess={handleBulkRegisterSuccess}
        activeYear={activeYear}
      />
      <DeleteScheduleModal />
      <DeleteCalculatorModal />
      <OrderDetailsModal />
      
      <ExportColumnSelector
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        columns={pdfColumns}
        title={pdfTitle}
        onConfirm={(selectedCols) => {
           printDataTable(pdfData, selectedCols, pdfTitle, `تقرير رسمي تم توليده من النظام بتاريخ ${new Date().toLocaleDateString('ar-EG')}`);
        }}
      />

      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-xl font-black text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-600 mb-6 text-sm">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> تأكيد
                </button>
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomizeTabsModalOpen && (
          <div data-admin-dashboard="true" className="admin-dashboard-container fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Sliders className="text-primary" /> تخصيص لوحة التحكم
                </h3>
                <button onClick={() => setIsCustomizeTabsModalOpen(false)} className="text-slate-400 hover:text-red-500">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
                {tempTabsConfig.order.map((tabId, index) => {
                  const tabInfo = ALL_ADMIN_TABS.find(t => t.id === tabId);
                  if (!tabInfo) return null;
                  const isHidden = tempTabsConfig.hidden.includes(tabId);
                  
                  return (
                    <div key={tabId} className={`flex items-center justify-between p-3 rounded-xl border ${isHidden ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex items-center gap-3">
                         <button 
                           onClick={() => {
                             const newHidden = isHidden ? tempTabsConfig.hidden.filter(id => id !== tabId) : [...tempTabsConfig.hidden, tabId];
                             setTempTabsConfig({...tempTabsConfig, hidden: newHidden});
                           }}
                           className={`p-2 rounded-lg ${isHidden ? 'text-slate-400 bg-slate-100' : 'text-primary bg-primary/10'}`}
                         >
                           {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                         </button>
                         <span className="font-bold text-sm text-slate-700">{tabInfo.label}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button 
                          disabled={index === 0}
                          onClick={() => {
                            const newOrder = [...tempTabsConfig.order];
                            [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                            setTempTabsConfig({...tempTabsConfig, order: newOrder});
                          }}
                          className="text-slate-400 hover:text-primary disabled:opacity-30 disabled:hover:text-slate-400"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button 
                          disabled={index === tempTabsConfig.order.length - 1}
                          onClick={() => {
                            const newOrder = [...tempTabsConfig.order];
                            [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                            setTempTabsConfig({...tempTabsConfig, order: newOrder});
                          }}
                          className="text-slate-400 hover:text-primary disabled:opacity-30 disabled:hover:text-slate-400"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="p-6 border-t border-slate-100">
                <button onClick={handleSaveTabsConfig} className="w-full py-3 bg-primary text-white font-black rounded-xl hover:bg-primary/90 transition-colors shadow-lg active:scale-95">
                  حفظ التخصيص
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCheckingDevice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex flex-col items-center justify-center p-4">
            <Loader2 className="animate-spin text-white w-16 h-16 mb-4" />
            <h2 className="text-xl font-black text-white text-center">جاري التحقق من هوية الجهاز...</h2>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDevicePermissionModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden text-center">
              <div className="absolute top-0 inset-x-0 h-2 bg-indigo-600" />
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">يرجى السماح بتأكيد هوية الجهاز</h3>
              <p className="text-slate-500 mb-8 font-bold leading-relaxed text-sm">
                لحماية وسلامة الامتحانات، النظام يطلب قراءة بيانات متصفحك والجهاز المستخدم (IP، النوع، النظام). سيتم تسجيل هذا مؤقتاً طوال فترة جلستك.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleApproveDevice}
                  className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                >
                  موافق وتأكيد الدخول
                </button>
                <button
                  onClick={() => setShowDevicePermissionModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black hover:bg-slate-200 transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {false && showExamGateway && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col p-0 md:p-4">
            <div className="bg-indigo-700 text-white p-4 flex justify-between items-center shadow-lg md:rounded-t-3xl">
              <div className="flex items-center gap-3">
                <BookOpen size={24} className="text-accent" />
                <h3 className="text-xl font-black">بوابة الامتحانات الإلكترونية</h3>
              </div>
              <button onClick={() => setShowExamGateway(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 bg-slate-50 overflow-hidden relative">
              <div className="absolute inset-0 overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-start">
                 <div className="w-full max-w-4xl mt-auto mb-auto">
                   <LiveExamGateway 
                     setCurrentScreen={(screen) => {
                       if (screen === 'student-exam') {
                         setShowExamGateway(false);
                         setIsPortalOpen(true);
                         setActiveSection('exam-login');
                       }
                     }}
                     setCurrentStudent={() => {}}
                     setActiveExam={() => {}}
                   />
                 </div>
              </div>
            </div>
            <div className="bg-white p-4 text-center border-t border-slate-200 md:rounded-b-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
              نظام الامتحانات الرقمي - مهرجان الكرازة المنطقة ١٨
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExportingPDF && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex flex-col items-center justify-center p-4">
            <Loader2 className="animate-spin text-white w-16 h-16 mb-4" />
            <h2 className="text-2xl font-black text-white mb-2 text-center drop-shadow-md">جاري إعداد وتجهيز التقرير التحليلي الشامل، برجاء الانتظار...</h2>
            {pdfExportProgress && (
              <p className="text-base font-bold text-coptic-gold mt-2 bg-slate-950/40 px-6 py-2 rounded-full border border-coptic-gold/20 backdrop-blur-md">
                {pdfExportProgress}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxImages}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
          doubleClickDelay: 300,
          doubleClickMaxStops: 2,
          keyboardMoveDistance: 50,
          wheelZoomDistanceFactor: 100,
          pinchZoomDistanceFactor: 100,
          scrollToZoom: true,
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppComponent />
    </ErrorBoundary>
  );
}
