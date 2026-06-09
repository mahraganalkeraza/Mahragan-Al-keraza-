/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
  AlertTriangle
} from 'lucide-react';
import QuickActionsHub from './components/QuickActionsHub';
import { ExamBuilder, LiveExamGateway } from './components/ExamEngine';
import { LiveExamMonitoring } from './components/LiveExamMonitoring';
import { ResultsViewer } from './components/ResultsViewer';
import PaginationComponent from './components/Pagination';
import Notification from './components/Notification';
import OmrGenerator from './components/OmrGenerator';
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

import { 
  auth, 
  db, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteField,
  deleteDoc,
  writeBatch,
  handleFirestoreError,
  OperationType,
  orderBy,
  limit,
  startAfter,
  CURRENT_YEAR,
  runTransaction,
  serverTimestamp,
  getCountFromServer,
  getDocSafe,
  getDocsSafe
} from './firebase';
// import churchData from './data/churches.json'; // Removed redundant import
import ErrorBoundary from './components/ErrorBoundary';
import WidgetErrorBoundary from './components/WidgetErrorBoundary';
import { supabase } from './lib/supabaseClient';
import { registerParticipantDualWrite, mapArabicCompetitions, normalizeRegistrationList } from './services/registrationHandler';

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
  OFFICIAL_STAGES,
  OFFICIAL_COMPETITIONS
  } from './constants';

import { generateMasterExcel, downloadMasterTemplate, exportOnlineResultsExcel } from './services/newExcelExport';
import { generateShortId } from './lib/utils';
import DynamicAdminSettings from './components/DynamicAdminSettings';
// @ts-ignore
import logo from './by-logo.jpeg';

export const withExponentialBackoff = async <T,>(operation: () => Promise<T>, maxRetries = 5, baseDelayMs = 1000): Promise<T> => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      if (error?.code !== 'unavailable' && error?.code !== 'deadline-exceeded' && attempt === maxRetries - 1) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`Operation failed, retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
  throw new Error('Maximum retries exceeded');
};

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
    <div className="relative h-[400px] md:h-[650px] w-full overflow-hidden rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] mb-16 group border-8 border-white/5">
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
  { id: 'dashboard', label: 'الملخص والمؤشرات', icon: LayoutDashboard },
  { id: 'news', label: 'الأخبار والسلايدر', icon: Newspaper },
  { id: 'participants', label: 'إدارة المشتركين', icon: Users },
  { id: 'activity_teams', label: 'إدارة الفرق', icon: Users },
  { id: 'results', label: 'السجل العام', icon: Award },
  { id: 'online_results', label: 'قسم النتائج', icon: Award },
  { id: 'omr', label: 'البابل شيت والكيو أر', icon: FileScan },
  { id: 'orders', label: 'طلبات الكتب', icon: ShoppingCart },
  { id: 'inquiries', label: 'الاستفسارات', icon: MessageSquare },
  { id: 'schedules', label: 'جدول المواعيد', icon: Calendar },
  { id: 'calculator', label: 'حاسبة الكتب', icon: Calculator },
  { id: 'exams_management', label: 'إدارة الامتحانات', icon: BookOpen },
  { id: 'exams_live', label: 'المتابعة المباشرة', icon: Activity },
  { id: 'users_management', label: 'المستخدمين والكنائس', icon: Users },
  { id: 'dynamic_management', label: 'النظام الديناميكي', icon: Settings },
  { id: 'system_settings', label: 'إعدادات المنصة', icon: Settings }
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

function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541747 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855378 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSrgb = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const R = Math.round(Math.max(0, Math.min(1, toSrgb(r))) * 255);
  const G = Math.round(Math.max(0, Math.min(1, toSrgb(g))) * 255);
  const B = Math.round(Math.max(0, Math.min(1, toSrgb(b_))) * 255);

  return [R, G, B];
}

function replaceOklchInString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('oklch')) return str;

  return str.replace(/oklch\s*\(([^)]+)\)/gi, (match, contents) => {
    const parts = contents.trim().split(/[\s,/]+/);
    if (parts.length < 3) return match;

    const lStr = parts[0];
    const cStr = parts[1];
    const hStr = parts[2];
    const aStr = parts[3];

    const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
    const c = parseFloat(cStr);
    let hDeg = parseFloat(hStr);

    if (hStr.endsWith('deg')) {
      hDeg = parseFloat(hStr);
    } else if (hStr.endsWith('rad')) {
      hDeg = (parseFloat(hStr) * 180) / Math.PI;
    } else if (hStr.endsWith('turn')) {
      hDeg = parseFloat(hStr) * 360;
    } else if (hStr.endsWith('grad')) {
      hDeg = (parseFloat(hStr) * 360) / 400;
    }

    let a = 1;
    if (aStr !== undefined) {
      a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
    }

    if (isNaN(l) || isNaN(c) || isNaN(hDeg)) return match;

    const [r, g, b] = oklchToRgb(l, c, hDeg);
    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  });
}

const withStylesCleaned = async <T,>(fn: () => Promise<T>): Promise<T> => {
  const originalGetComputedStyle = window.getComputedStyle;

  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt);

    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'cssText') {
          const originalCssText = target.cssText;
          if (typeof originalCssText === 'string' && originalCssText.includes('oklch')) {
            return replaceOklchInString(originalCssText);
          }
          return originalCssText;
        }

        const val = Reflect.get(target, prop);

        if (typeof val === 'string' && val.includes('oklch')) {
          return replaceOklchInString(val);
        }

        if (typeof val === 'function') {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const originalVal = target.getPropertyValue(propertyName);
              if (typeof originalVal === 'string' && originalVal.includes('oklch')) {
                return replaceOklchInString(originalVal);
              }
              return originalVal;
            };
          }
          return val.bind(target);
        }

        return val;
      }
    });
  };

  try {
    return await fn();
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }
};

const normalizeArabic = (str: string) => {
  if (!str) return '';
  return str.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
};

function AppComponent() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  const getInitialProfile = () => {
    try {
      const stored = localStorage.getItem('userProfileCache');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  };
  const initialProfile = getInitialProfile();
  
  const [userProfile, setUserProfile] = useState<any>(initialProfile);
  const [dynamicLevels, setDynamicLevels] = useState<any[]>([]);
  const [activityStages, setActivityStages] = useState<any[]>([]);
  const [hymnStages, setHymnStages] = useState<any[]>([]);

  // Customization State
  const [isCustomizeTabsModalOpen, setIsCustomizeTabsModalOpen] = useState(false);
  const [tempTabsConfig, setTempTabsConfig] = useState<{order: string[], hidden: string[]}>({order: [], hidden: []});

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [churchName, setChurchName] = useState(initialProfile?.churchName || '');
  const [location, setLocation] = useState(initialProfile?.country || '');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!initialProfile);
  const [userRole, setUserRole] = useState<'admin' | 'church' | 'guest' | 'super_admin'>(initialProfile?.role || 'guest');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setIsQuotaExceeded(true);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
      setIsQuotaExceeded(true);
    }
    return () => {
      window.removeEventListener('firestore-quota-exceeded', handleQuotaExceeded);
    };
  }, []);
  
  useEffect(() => {
    console.log("Current User Role:", userRole);
  }, [userRole]);

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
    /* 
    if ((window as any).firestoreQuotaExceeded) {
      console.warn("Firestore quota already exceeded, skipping listeners.");
      return () => {};
    }

    const unsubAppConfig = onSnapshot(doc(db, 'settings', 'app_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setActiveYear(data.activeYear || CURRENT_YEAR);
        setGlobalReadAccess(data.globalReadAccess !== false);
        if (data.appLogo) {
          localStorage.setItem('appLogoCache', data.appLogo);
          setAppLogo(data.appLogo);
        } else {
          localStorage.removeItem('appLogoCache');
          setAppLogo(null);
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/app_config'));

    const unsubChurches = onSnapshot(collection(db, 'churches'), (snapshot) => {
      const churchesData = snapshot.docs
        .map(d => ({ 
          name: d.data().name, 
          email: '', 
          isEnabled: d.data().isEnabled !== false,
          logoUrl: d.data().logoUrl || ''
        }))
        .filter(c => c.isEnabled);
      setPublicChurches(churchesData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'churches'));

    const unsubLevels = onSnapshot(collection(db, 'levels'), (snapshot) => {
      const levelsData = snapshot.docs.map(d => ({ 
        id: d.id,
        name: d.data().name, 
        comps: d.data().allowedCompetitions || [] 
      }));
      
      const uniqueLevelsMap = new Map();
      levelsData.forEach((l: any) => {
        if (l && l.name) {
          uniqueLevelsMap.set(l.name.trim(), l);
        }
      });
      const uniqueLevels = Array.from(uniqueLevelsMap.values());
      setDynamicLevels(uniqueLevels.sort((a: any, b: any) => sortStages(a.name, b.name)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'levels'));

    const unsubActivityStages = onSnapshot(collection(db, 'activityStages'), (snapshot) => {
      setActivityStages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'activityStages'));

    const unsubHymnStages = onSnapshot(collection(db, 'hymnStages'), (snapshot) => {
      setHymnStages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'hymnStages'));

    const unsubValidation = onSnapshot(doc(db, 'settings', 'validation'), (snapshot) => {
      const validationData = snapshot.exists() ? snapshot.data() : { 
        templates: [], ageMappings: [], rules: { nameLength: true, genderMatch: false, mandatoryRows: true } 
      };
      setValidationSettings({
        templates: validationData.templates || [],
        ageMappings: validationData.ageMappings || [],
        rules: validationData.rules || { nameLength: true, genderMatch: false, mandatoryRows: true }
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/validation'));

    return () => {
      unsubAppConfig();
      unsubChurches();
      unsubLevels();
      unsubActivityStages();
      unsubHymnStages();
      unsubValidation();
    };
    */
    
    // Supabase Load
    async function fetchSupabaseData() {
        console.log("Loading initial data from Supabase...");
        
        // Settings/app_config
        const { data: configData } = await supabase.from('settings').select('*').eq('id', 'app_config').single();
        if (configData) {
            setActiveYear(configData.activeYear || CURRENT_YEAR);
            setGlobalReadAccess(configData.globalReadAccess !== false);
            if (configData.appLogo) {
                localStorage.setItem('appLogoCache', configData.appLogo);
                setAppLogo(configData.appLogo);
            }
        }
        
        // Churches
        const { data: churchesData } = await supabase.from('churches').select('*').eq('isEnabled', true);
        if (churchesData) {
            setPublicChurches(churchesData.map(d => ({ name: d.name, email: '', isEnabled: true, logoUrl: d.logoUrl || ''})));
        }
        
        // Add other loads here similar to above
    }
    fetchSupabaseData();
  }, []);

  /*
  useEffect(() => {
    if (!isLoggedIn || userRole !== 'church') return;

    const newsCollection = collection(db, 'news');
    const q = query(newsCollection, where('year', '==', activeYear), orderBy('timestamp', 'desc'), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newsItem = change.doc.data();
          setNotification(`خبر جديد: ${newsItem.title}`);
        }
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, 'news'));

    return () => unsubscribe();
  }, [isLoggedIn, userRole]);
  */
  useEffect(() => {
    if (!isLoggedIn || userRole !== 'church') return;
    
    // Supabase Poll or similar mechanism for new news
    const fetchLatestNews = async () => {
        const { data, error } = await supabase.from('news')
            .select('*')
            .eq('year', activeYear)
            .order('timestamp', { ascending: false })
            .limit(1);
        if (data && data.length > 0) {
            // Simplified news check logic
            setNotification(`خبر جديد: ${data[0].title}`);
        }
    };
    fetchLatestNews();
  }, [isLoggedIn, userRole]);
  const [loginChurch, setLoginChurch] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [adminFilterChurch, setAdminFilterChurch] = useState('الكل');
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsFilterDate, setNewsFilterDate] = useState('');
  const [newsPage, setNewsPage] = useState(1);
  const [inquiryPage, setInquiryPage] = useState(1);
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [printingPage, setPrintingPage] = useState(1);
  const [resultsFilterStage, setResultsFilterStage] = useState('الكل');
  const [resultsFilterGrade, setResultsFilterGrade] = useState('الكل');
  const [isScanning, setIsScanning] = useState(false);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [participantSearch, partChurchFilter, partStageFilter, partCompFilter]);
  
  const [isDuplicateScanModalOpen, setIsDuplicateScanModalOpen] = useState(false);
  const [duplicateRecords, setDuplicateRecords] = useState<Participant[][]>([]);
  const [isScanningDuplicates, setIsScanningDuplicates] = useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = useState(false);
  
  const [teamSearch, setTeamSearch] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const [calculatorSettings, setCalculatorSettings] = useState<any[]>([]);
  const [isCalculatorLoading, setIsCalculatorLoading] = useState(true);
  const [isSubmittingCalculator, setIsSubmittingCalculator] = useState(false);
  const [newCalculatorSetting, setNewCalculatorSetting] = useState({ stage: '', material: '', price: 0 });
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

  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [lastOnlineResultDoc, setLastOnlineResultDoc] = useState<any>(null);
  const [onlineResultPageCount, setOnlineResultPageCount] = useState(1);
  const [isOnlineResultsEnd, setIsOnlineResultsEnd] = useState(false);
  const [isOnlineResultsLoading, setIsOnlineResultsLoading] = useState(false);

  const [activityTeams, setActivityTeams] = useState<ActivityTeam[]>([]);
  const [lastTeamDoc, setLastTeamDoc] = useState<any>(null);
  const [teamPageCount, setTeamPageCount] = useState(1);
  const [isTeamsEnd, setIsTeamsEnd] = useState(false);
  const [isTeamsLoading, setIsTeamsLoading] = useState(false);

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
  const [totalParticipantsCount, setTotalParticipantsCount] = useState<number>(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [totalTeamsCount, setTotalTeamsCount] = useState<number>(0);
  const [totalResultsCount, setTotalResultsCount] = useState<number>(0);
  const [debouncedParticipantSearch, setDebouncedParticipantSearch] = useState('');
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

  const [systemControls, setSystemControls] = useState<{
    isRegistrationOpen: boolean;
    isBookCalculatorOpen: boolean;
  }>({
    isRegistrationOpen: false,
    isBookCalculatorOpen: true
  });

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
        const q = query(
          collection(db, 'participants'),
          where('churchName', '==', churchName),
          where('name', '==', trimmedName),
          limit(1)
        );
        const querySnapshot = await getDocsSafe(q);
        if (!querySnapshot.empty) {
          const matchedDoc = querySnapshot.docs[0].data();
          const pStage = matchedDoc.stage || 'غير محددة';
          setParticipantDuplicateWarning(
            `تنبيه: يوجد مشترك مسجل بالفعل بنفس هذا الاسم في كنيستك للمرحلة: ${pStage}. يرجى توخي الحذر والتأكد من الاسم ثلاثياً لتجنب التكرار.`
          );
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
    return (participants || []).filter(p => {
      const matchChurch = (userRole === 'admin' || (userRole === 'church' && churchName)) ? (globalChurchFilter === 'الكل' || p.churchName === (userRole === 'admin' ? globalChurchFilter : churchName)) : true;
      const matchName = p.name?.toLowerCase().includes(globalNameFilter.toLowerCase());
      const matchStage = globalStageFilter === 'الكل' || p.stage === globalStageFilter;
      const matchComp = globalCompetitionFilter === 'الكل' || (p.competitions && p.competitions.some(c => c === globalCompetitionFilter));
      return (userRole === 'admin' ? true : p.churchName === churchName) && matchChurch && matchName && matchStage && matchComp;
    });
  }, [participants, globalNameFilter, globalStageFilter, globalChurchFilter, globalCompetitionFilter, churchName, userRole]);

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
        if (normalizedComps.some((c: string) => c.includes(normalizeArabic('قبطي مستوى ثاني')) || c.includes(normalizeArabic('مستوى ثاني')) || c.includes(normalizeArabic('قبطي مستوى ثان')) || c.includes(normalizeArabic('مستوى ثان')))) { stg.coptic2++; hasCountedSub = true; }
        
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

  // Analytical Metrics for the Advanced Dashboard
  const analyticsData = useMemo(() => {
    const demographicsData = STAGE_ORDER.map(stg => ({
      name: stg,
      "المشتركين": allChurchParticipants.filter(p => p.stage === stg).length
    })).filter(d => d["المشتركين"] > 0);

    const booksPerStage: Record<string, number> = {};
    (orders || []).forEach(order => {
        (order.details || []).forEach((item: any) => {
            const stg = item.stage;
            if (stg) {
               booksPerStage[stg] = (booksPerStage[stg] || 0) + (item.quantity || 0);
            }
        });
    });

    const retentionData = (userRole === 'admin' ? publicChurches.map(c => c.name) : [churchName]).map(cName => {
        let competitionsDemand = 0;
        let orderedBooks = 0;
        
        // Sum competitions enrollments for this church
        const churchParticipants = allChurchParticipants.filter(p => p.churchName === cName);
        churchParticipants.forEach(p => {
             competitionsDemand += (p.competitions?.filter(c => c).length || 0);
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
    
    allChurchParticipants.forEach(p => {
       if (globalChurchFilter !== 'الكل' && p.churchName !== globalChurchFilter && userRole === 'admin') return;
       if (userRole === 'church' && p.churchName !== churchName) return;
       
       const len = p.competitions?.length || 0;
       if (len === 1) compsCount["مادة واحدة"]++;
       else if (len === 2) compsCount["مادتين"]++;
       else if (len >= 3) compsCount["٣ مواد أو أكثر"]++;

       (p.competitions || []).forEach((c: string) => {
           compTypesMap[c] = (compTypesMap[c] || 0) + 1;
       });
    });
    const engagementData = [
       { name: 'مادة واحدة', value: compsCount["مادة واحدة"] },
       { name: 'مادتين', value: compsCount["مادتين"] },
       { name: '٣ مواد أو أكثر', value: compsCount["٣ مواد أو أكثر"] }
    ].filter(d => d.value > 0);

    const competitionTypesData = Object.keys(compTypesMap).map(k => ({
       name: k,
       value: compTypesMap[k]
    })).filter(d => d.value > 0);

    return { demographicsData, retentionData, engagementData, competitionTypesData };
  }, [allChurchParticipants, orders, STAGE_ORDER, globalChurchFilter, churchName, userRole]);

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
      await updateDoc(doc(db, 'users', user.uid), { adminTabsConfig: tempTabsConfig });
      setIsCustomizeTabsModalOpen(false);
      if (tempTabsConfig.hidden.includes(adminActiveTab)) {
        const firstVisible = tempTabsConfig.order.find((id: string) => !tempTabsConfig.hidden.includes(id));
        if (firstVisible) setAdminActiveTab(firstVisible);
      }
    } catch (error) {
      console.error("Error saving tabs config", error);
    }
  };

  // Firebase Auth Listener
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Use real-time listener for current user profile to enforce blocking instantly
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          if (userDoc.exists()) {
            const profile = userDoc.data();
            if (profile.isEnabled === false) {
              await signOut(auth);
              setNotification("تم تعطيل حسابك بقرار من الإدارة. يرجى التواصل مع المسئول.");
              setIsLoggedIn(false);
              setUser(null);
              setUserProfile(null);
              localStorage.removeItem('userProfileCache');
              setChurchName('');
              return;
            }
            setUserProfile(profile);
            localStorage.setItem('userProfileCache', JSON.stringify(profile));
            setUserRole(profile.role);
            setChurchName(profile.churchName || '');
            setLocation(profile.country || '');
            setDashboardBg(profile.dashboardBg || '');
            setIsLoggedIn(true);
            setIsAuthReady(true);
          } else if (firebaseUser.email === 'admin@mafk.com' || firebaseUser.email === 'mahraganalkeraza7esoyam@gmail.com') {
            setUserRole('admin');
            setChurchName(firebaseUser.displayName || 'اللجنة المركزية منطقة18');
            setIsLoggedIn(true);
            setIsAuthReady(true);
          } else {
            setIsLoggedIn(true);
            if (firebaseUser.email?.endsWith('@mafk.com')) {
              setUserRole('church');
            }
            setIsAuthReady(true);
          }
        }, (error) => {
          console.error("Error watching user profile:", error);
          setIsAuthReady(true);
        });
      } else {
        setUser(null);
        setUserProfile(null);
        localStorage.removeItem('userProfileCache');
        setIsLoggedIn(false);
        setUserRole('guest');
        setChurchName('');
        setDashboardBg('');
        setIsAuthReady(true);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Firestore Listeners
  useEffect(() => {
    const unsubSchedules = onSnapshot(query(collection(db, 'schedules'), where('year', '==', activeYear)), (snapshot) => {
      setSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    const unsubExamLinks = onSnapshot(query(collection(db, 'examLinks'), where('year', '==', activeYear)), (snapshot) => {
      const links: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as ExamLink;
        links[data.stage] = data.url;
      });
      setExamLinks(links);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'examLinks'));

    return () => {
      unsubSchedules();
      unsubExamLinks();
    };
  }, [activeYear]);

  useEffect(() => {
    if (!isAuthReady || !isLoggedIn) return;
    
    // For church users, wait until churchName is loaded to avoid permission errors on filtered queries
    if (userRole === 'church' && !churchName) return;

    async function fetchStaticData() {
        try {
            fetchAllChurchParticipants();
            const newsSnap = await getDocsSafe(query(collection(db, 'news'), where('year', '==', activeYear), orderBy('timestamp', 'desc'), limit(10)));
            setNews(newsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
            
            const carouselSnap = await getDocsSafe(query(collection(db, 'carousel'), where('year', '==', activeYear)));
            const items = carouselSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselItem));
            setCarouselItems(items.sort((a, b) => (a.order || 0) - (b.order || 0)));
            
            const calculatorSettingsSnap = await getDocsSafe(query(collection(db, 'calculator_settings'), where('year', '==', activeYear)));
            setCalculatorSettings(calculatorSettingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsCalculatorLoading(false);
            
            const footerSnap = await getDocSafe(doc(db, 'settings', 'footer'));
            if (footerSnap.exists()) setSiteSettings(footerSnap.data() as SiteSettings);
            
            const aboutSnap = await getDocSafe(doc(db, 'settings', 'about'));
            if (aboutSnap.exists()) setAboutContent(aboutSnap.data() as AboutContent);
            
            const examConfigSnap = await getDocSafe(doc(db, 'settings', 'exam_config'));
            if (examConfigSnap.exists()) {
                // ... update exam config ...
            }
        } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'static_data');
        }
    }
    fetchStaticData();
  }, [isAuthReady, isLoggedIn, userRole, churchName, activeYear]);

  const updateChurchSubscribers = async (cName: string) => {
    if (!cName) return;
    try {
      // 1. Query participants count for this church and year
      const participantsQuery = query(
        collection(db, 'participants'),
        where('churchName', '==', cName),
        where('year', '==', activeYear)
      );
      const snap = await getCountFromServer(participantsQuery);
      const count = snap.data().count;

      // 2. Load the church document from 'churches' collection and update subscribers count
      const churchQuery = query(collection(db, 'churches'), where('name', '==', cName));
      const churchSnap = await getDocsSafe(churchQuery);
      if (!churchSnap.empty) {
        const churchDoc = churchSnap.docs[0];
        await updateDoc(doc(db, 'churches', churchDoc.id), {
          subscribers: count
        });
      }
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

      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

      // 2. Lightweight real-time listener regarding subscriber increments on churches collection
      const unsubChurchesNotifier = onSnapshot(collection(db, 'churches'), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const churchNameVal = data.name;
          if (!churchNameVal) return;
          const currentSubscribers = data.subscribers || 0;
          
          const previousSubscribers = previousSubscribersRef.current[churchNameVal] || 0;
          
          // The Trigger Rule: transition from exactly 0 to >= 1
          if (previousSubscribers === 0 && currentSubscribers >= 1) {
            if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
              new window.Notification("🔔 كنيسة جديدة بدأت التسجيل!", {
                body: `كنيسة (${churchNameVal}) بدأت الآن في تسجيل مخدوميها في المهرجان.`,
                icon: "/logo.png"
              });
            }
          }
          
          previousSubscribersRef.current[churchNameVal] = currentSubscribers;
        });
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'churches'));

      return () => {
        unsubUsers();
        unsubChurchesNotifier();
      };
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
        imageUrl = await compressImage(newNews.image);
      }

      if (editingNews) {
        await updateDoc(doc(db, 'news', editingNews.id), {
          title: newNews.title,
          content: newNews.content,
          imageUrl,
          timestamp: editingNews.timestamp,
          year: activeYear
        });
        setEditingNews(null);
      } else {
        await addDoc(collection(db, 'news'), {
          title: newNews.title,
          content: newNews.content,
          imageUrl,
          timestamp: Date.now(),
          year: activeYear
        });
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
        await updateDoc(doc(db, 'schedules', editingSchedule.id), { ...newSchedule, year: activeYear });
        setEditingSchedule(null);
      } else {
        await addDoc(collection(db, 'schedules'), { ...newSchedule, year: activeYear });
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
        url = await compressImage(newCarousel.image);
      }

      if (editingCarousel) {
        await updateDoc(doc(db, 'carousel', editingCarousel.id), {
          title: newCarousel.title,
          url,
          order: newCarousel.order,
          year: activeYear
        });
        setEditingCarousel(null);
      } else {
        await addDoc(collection(db, 'carousel'), {
          title: newCarousel.title,
          url,
          order: newCarousel.order,
          year: activeYear
        });
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
      await setDoc(doc(db, 'settings', 'footer'), siteSettings);
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
      await setDoc(doc(db, 'settings', 'system_controls'), newControls);
      setNotification('تم تحديث إعدادات النظام المركذية');
    } catch (e) {
      console.error(e);
      setNotification('خطأ في التحديث');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExamConfig = async (newConfig: any) => {
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'exam_config'), newConfig);
      setNotification('تم تحديث إعدادات الامتحانات');
    } catch (e) {
      console.error(e);
      setNotification('خطأ في التحديث');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAboutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'about'), aboutContent);
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
      const material = newCalculatorSetting.material.trim();
      const price = Number(newCalculatorSetting.price) || 0;
      
      const id = `${stage}_${material}`;
      const dataToSave = {
        stage,
        material,
        price,
        id,
        timestamp: new Date().toISOString()
      };
      
      console.log('Saving calculator setting:', dataToSave);
      
      await setDoc(doc(db, 'calculator_settings', id), { ...dataToSave, year: activeYear });
      setNewCalculatorSetting({ stage: '', material: '', price: 0 });
      setEditingCalculatorSetting(null);
      alert('تم حفظ الإعداد بنجاح');
    } catch (error) {
      console.error('Error saving calculator setting:', error);
      alert('خطأ في حفظ الإعداد');
      handleFirestoreError(error, OperationType.WRITE, 'calculator_settings');
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
      await deleteDoc(doc(db, 'calculator_settings', calculatorSettingToDelete));
      alert('تم حذف الإعداد بنجاح');
      setShowDeleteCalculatorModal(false);
      setCalculatorSettingToDelete(null);
    } catch (error) {
      console.error('Error deleting calculator setting:', error);
      alert('خطأ في حذف الإعداد');
      handleFirestoreError(error, OperationType.DELETE, `calculator_settings/${calculatorSettingToDelete}`);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الخبر؟', async () => {
      try {
        await deleteDoc(doc(db, 'news', newsId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `news/${newsId}`);
      }
    });
  };

  const handleDeleteSchedule = (id: string) => {
    setScheduleToDelete(id);
    setShowDeleteScheduleModal(true);
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    try {
      await deleteDoc(doc(db, 'schedules', scheduleToDelete));
      setShowDeleteScheduleModal(false);
      setScheduleToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `schedules/${scheduleToDelete}`);
      alert('حدث خطأ أثناء حذف الجدول');
    }
  };

  const handleDeleteCarousel = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذه الصورة؟', async () => {
      try {
        await deleteDoc(doc(db, 'carousel', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `carousel/${id}`);
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
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
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
            await setDoc(doc(db, 'settings', 'results_headers'), { headers, updatedForYear: activeYear });
          }
          
          const chunks = [];
          for (let i = 0; i < data.length; i += 400) {
            chunks.push(data.slice(i, i + 400));
          }

          for (const chunk of chunks) {
            const batch = writeBatch(db);
            chunk.forEach((row: any) => {
              const studentNameVal = row['الاسم'] || '';
              if (!studentNameVal || String(studentNameVal).trim() === '') return;
              
              const resultRef = doc(collection(db, 'results'));
              
              const churchNameVal = row['الكنيسة/البلد'] || '';
              const idVal = row['الرقم التعريفي'] || '';
              
              batch.set(resultRef, {
                serial: String(idVal),
                churchName: String(churchNameVal),
                studentName: String(studentNameVal),
                stage: '', // Stage might not be in this schema, keeping it blank or we could infer
                score: 0,
                grade: '',
                data: row,
                timestamp: row['توقيت التسجيل'] ? String(row['توقيت التسجيل']) : new Date().toISOString(),
                year: String(activeYear)
              });
            });
            await batch.commit();
          }
          alert('تم رفع النتائج بنجاح!');
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'results');
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
        if (row['قبطي ١']) comps.push('قبطي مستوى ١');
        if (row['قبطي ٢']) comps.push('قبطي مستوى ٢');

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
             id: customId,
             serial: customId,
             name,
             stage,
             gender: rowGender,
             competitions: comps,
             churchName: churchName,
             country: 'مصر',
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
        const chunks = [];
        for (let i = 0; i < parsedParticipants.length; i += 400) {
          chunks.push(parsedParticipants.slice(i, i + 400));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(p => {
             const newRef = doc(db, 'participants', p.id);
             batch.set(newRef, p);
          });
          await batch.commit();
        }

        // Parallel non-blocking Supabase bulk synchronization
        try {
          const supabaseBackupData = parsedParticipants.map(item => {
            const compStatuses = mapArabicCompetitions(item.competitions || [], false);
            return {
              id: item.id,
              serial: item.serial || item.id,
              name: item.name,
              churchName: item.churchName,
              stage: item.stage,
              gender: item.gender,
              competition: (item.competitions || []).join(', ') || 'عام',
              darasi: compStatuses.darasi,
              qebti: compStatuses.qebti,
              mahfouzat: compStatuses.mahfouzat,
              country: item.country || 'مصر',
              year: item.year || activeYear,
              timestamp: item.timestamp || new Date().toISOString()
            };
          });

          supabase
            .from('registrations')
            .insert(supabaseBackupData)
            .then(
              ({ error: sbErr }) => {
                if (sbErr) console.error('[Supabase Bulk Import Sync] Quietly failed to insert backup records (Isolated):', sbErr);
                else console.log('[Supabase Bulk Import Sync] Backup records inserted successfully.');
              },
              (err) => console.error('[Supabase Bulk Import Sync] Exception caught during backup insertion:', err)
            );
        } catch (sbEx) {
          console.error('[Supabase Bulk Import Sync] Exception formatting backup list:', sbEx);
        }

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
      const q = query(collection(db, 'examLinks'), where('stage', '==', stage), where('year', '==', activeYear));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        await addDoc(collection(db, 'examLinks'), { stage, url, year: activeYear });
      } else {
        await updateDoc(doc(db, 'examLinks', snapshot.docs[0].id), { url, year: activeYear });
      }
      alert('تم تحديث الرابط بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `examLinks/${stage}`);
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

  const exportPrintingStatementPDF = async () => {
    const element = document.getElementById('printing-statement-table');
    if (!element) return;
    const opt = {
      margin: 5,
      filename: `بيان_طباعة_${churchName || 'مهرجان_الكرازة'}_${new Date().toLocaleDateString()}.pdf`,
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
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "طلبات الكتب مفصلة");
    XLSX.writeFile(workbook, `detailed_orders_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  const handleScanDuplicates = async () => {
    setIsDuplicateScanModalOpen(true);
    setIsScanningDuplicates(true);
    setDuplicateRecords([]);
    
    try {
      const q = query(
        collection(db, 'participants'),
        where('year', '==', activeYear)
      );
      
      const snap = await getDocs(q);
      const parts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
      
      const duplicatesMap: Record<string, Participant[]> = {};
      
      parts.forEach(p => {
        const signature = `${p.name}_${p.churchName}_${p.stage}_${[...(p.competitions || [])].sort().join('-')}`;
        if (!duplicatesMap[signature]) {
          duplicatesMap[signature] = [];
        }
        duplicatesMap[signature].push(p);
      });
      
      const duplicateGroups = Object.values(duplicatesMap).filter(group => group.length > 1);
      setDuplicateRecords(duplicateGroups);
    } catch (err) {
      console.error(err);
      setNotification('حدث خطأ أثناء فحص التكرارات.');
    } finally {
      setIsScanningDuplicates(false);
    }
  };

  const handleDeleteDuplicates = async () => {
    if (!duplicateRecords.length) return;
    setIsDeletingDuplicates(true);
    try {
      let batch = writeBatch(db);
      let opCount = 0;
      
      for (const group of duplicateRecords) {
        const toDelete = group.slice(1);
        for (const record of toDelete) {
          if (opCount >= 490) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
          batch.delete(doc(db, 'participants', record.id));
          opCount++;
        }
      }
      
      if (opCount > 0) {
        await batch.commit();
      }
      
      setNotification('تم تطهير السجلات المكررة بنجاح.');
      setIsDuplicateScanModalOpen(false);
      fetchParticipantsPage(true, true, participantSearch);
    } catch (err) {
      console.error(err);
      setNotification('حدث خطأ أثناء حذف التكرارات.');
    } finally {
      setIsDeletingDuplicates(false);
    }
  };

  const exportAllRegistrationsToExcel = async () => {
    await generateMasterExcel(userRole === 'admin' ? null : churchName);
  };

  const fetchParticipantsPage = async (isNext = true, isFirst = false, search = '') => {
    if (!isLoggedIn) return;
    setIsParticipantsLoading(true);
    try {
      let baseQueryQ = collection(db, 'participants');
      const constraints: any[] = [where('year', '==', activeYear)];
      
      // Admin Church Filter
      if (userRole === 'admin') {
        if (partChurchFilter !== 'الكل') {
          constraints.push(where('churchName', '==', partChurchFilter));
        }
      } else {
        constraints.push(where('churchName', '==', churchName));
      }

      // Stage Filter
      if (partStageFilter !== 'الكل') {
        constraints.push(where('stage', '==', partStageFilter));
      }

      // Competition Filter
      if (partCompFilter !== 'الكل') {
        constraints.push(where('competitions', 'array-contains', partCompFilter));
      }
      
      // Name Search Filter
      if (search) {
        constraints.push(where('name', '>=', search), where('name', '<=', search + '\uf8ff'));
      }
      
      constraints.push(orderBy('name'));
      
      if (isFirst || (!isFirst && !isNext)) {
        getCountFromServer(query(baseQueryQ, ...constraints)).then(snap => {
          setTotalParticipantsCount(snap.data().count);
        }).catch(err => console.error("Firestore Core Error: ", err.message));
      }
      
      const q = query(baseQueryQ, ...constraints);
      const snap = await getDocsSafe(q);
      
      const newList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
      setParticipants(newList);
      setIsParticipantsEnd(true);
      
      if (isFirst) setParticipantPageCount(1);
      else if (isNext) setParticipantPageCount(prev => prev + 1);
      
    } catch (err: any) {
      console.error("Firestore Core Error: ", err.message);
      
      // Fallback to Supabase
      console.warn("Firebase fetch failed or requires indexes. Pulling from Supabase...");
      let sbQuery = supabase.from('registrations').select('*').eq('year', activeYear);
      
      if (userRole === 'admin') {
        if (partChurchFilter !== 'الكل') sbQuery = sbQuery.eq('churchName', partChurchFilter);
      } else {
        sbQuery = sbQuery.eq('churchName', churchName);
      }
      
      if (partStageFilter !== 'الكل') sbQuery = sbQuery.eq('stage', partStageFilter);
      if (partCompFilter !== 'الكل') {
        sbQuery = sbQuery.ilike('competition', `%${partCompFilter}%`);
      }
      
      const { data, error: sbError } = await sbQuery;
      
      if (sbError) {
        console.error("Supabase also failed:", sbError);
        setNotification('خطأ في جلب بيانات المشتركين.');
      } else {
        const cleanList = normalizeRegistrationList(data || []);
        setParticipants(cleanList);
        setIsParticipantsEnd(true);
      }
    } finally {
      setIsParticipantsLoading(false);
    }
  };

  const fetchAllChurchParticipants = async () => {
      if (!isLoggedIn) return;
      try {
        let baseQueryQ = collection(db, 'participants');
        const constraints: any[] = [where('year', '==', activeYear)];
        if (userRole !== 'admin') {
          constraints.push(where('churchName', '==', churchName));
        }
        
        const q = query(baseQueryQ, ...constraints);
        const snap = await getDocs(q);
        const allList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant));
        setAllChurchParticipants(allList);
      } catch(err: any) {
        console.warn("Firebase fetch failed, switching to Supabase for all participants...");
        let sbQuery = supabase.from('registrations').select('*').eq('year', activeYear);
        if (userRole !== 'admin') {
            sbQuery = sbQuery.eq('churchName', churchName);
        }
        const { data, error: sbError } = await sbQuery;
        if (sbError) {
            console.error("Supabase also failed:", sbError);
        } else {
            const cleanList = normalizeRegistrationList(data || []);
            setAllChurchParticipants(cleanList);
        }
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
      
      if (userRole === 'admin') {
        promises.push(fetchOnlineResultsPage(true, true));
      }
      
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
      const baseQuery = userRole === 'admin' 
        ? query(collection(db, 'orders'), where('year', '==', activeYear)) 
        : query(collection(db, 'orders'), where('churchName', '==', churchName), where('year', '==', activeYear));
      
      if (isFirst || (!isFirst && !isNext)) {
        getCountFromServer(baseQuery).then(snap => setTotalOrdersCount(snap.data().count)).catch(err => console.error("Firestore Core Error: ", err.message));
      }

      const constraints: any[] = [orderBy('timestamp', 'desc')];
      
      const q = query(baseQuery, ...constraints);
      const snap = await getDocs(q);
      
      const newList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(newList);
      setIsOrdersEnd(true);
      
      if (isFirst) setOrderPageCount(1);
      else if (isNext) setOrderPageCount(prev => prev + 1);
      
    } catch (err: any) { 
      console.error("Firestore Core Error: ", err.message); 
    } finally { 
      setIsOrdersLoading(false); 
    }
  };

  const fetchOnlineResultsPage = async (isNext = true, isFirst = false) => {
    if (!isLoggedIn) return;
    setIsOnlineResultsLoading(true);
    try {
      const baseQuery = collection(db, 'online_results');
      const constraints: any[] = [where('year', '==', activeYear), orderBy('timestamp', 'desc')];
      
      if (userRole === 'church') {
        constraints.unshift(where('churchName', '==', churchName));
      }

      const q = query(baseQuery, ...constraints);
      const snap = await getDocs(q);
      
      const newList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOnlineResults(newList);
      setIsOnlineResultsEnd(true);
      
      if (isFirst) setOnlineResultPageCount(1);
      else if (isNext) setOnlineResultPageCount(prev => prev + 1);
    } catch (err: any) { 
      console.error("Firestore Core Error: ", err.message); 
    } finally { 
      setIsOnlineResultsLoading(false); 
    }
  };

  const fetchResultsPage = async (isNext = true, isFirst = false, search = '') => {
    if (!isLoggedIn) return;
    setIsResultsLoading(true);
    try {
      let baseQueryQ = collection(db, 'results');
      const constraints: any[] = [where('year', '==', activeYear), orderBy('timestamp', 'desc')];
      const countConstraints: any[] = [where('year', '==', activeYear)];
      
      if (userRole === 'admin') {
        if (globalChurchFilter !== 'الكل') {
          constraints.push(where('churchName', '==', globalChurchFilter));
          countConstraints.push(where('churchName', '==', globalChurchFilter));
        }
      } else {
        constraints.push(where('churchName', '==', churchName));
        countConstraints.push(where('churchName', '==', churchName));
      }

      if (globalStageFilter !== 'الكل') {
        constraints.push(where('stage', '==', globalStageFilter));
        countConstraints.push(where('stage', '==', globalStageFilter));
      }
      if (resultsFilterGrade !== 'الكل') {
        constraints.push(where('grade', '==', resultsFilterGrade));
        countConstraints.push(where('grade', '==', resultsFilterGrade));
      }

      if (search) {
        constraints.unshift(where('studentName', '>=', search), where('studentName', '<=', search + '\uf8ff'));
        countConstraints.unshift(where('studentName', '>=', search), where('studentName', '<=', search + '\uf8ff'));
      }
      
      if (isFirst || (!isFirst && !isNext)) {
        getCountFromServer(query(baseQueryQ, ...countConstraints)).then(snap => {
          setTotalResultsCount(snap.data().count);
        }).catch(err => console.error("Firestore Core Error: ", err.message));
      }

      const q = query(baseQueryQ, ...constraints);
      const snap = await getDocs(q);
      
      const newList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result));
      setResults(newList);
      setIsResultsEnd(true);
      
      if (isFirst) setResultPageCount(1);
      else if (isNext) setResultPageCount(prev => prev + 1);
      
    } catch (err: any) { 
      console.error("Firestore Core Error: ", err.message); 
    } finally { 
      setIsResultsLoading(false); 
    }
  };

  const fetchTeamsPage = async (isNext = true, isFirst = false, search = '') => {
    if (!isLoggedIn) return;
    setIsTeamsLoading(true);
    try {
      let baseQueryQ = collection(db, 'activityTeams');
      const constraints: any[] = [where('year', '==', activeYear), orderBy('teamName')];
      const countConstraints: any[] = [where('year', '==', activeYear)];
      
      if (userRole === 'admin') {
        if (globalChurchFilter !== 'الكل') {
          constraints.push(where('churchName', '==', globalChurchFilter));
          countConstraints.push(where('churchName', '==', globalChurchFilter));
        }
      } else {
        constraints.push(where('churchName', '==', churchName));
        countConstraints.push(where('churchName', '==', churchName));
      }

      if (search) {
        constraints.unshift(where('teamName', '>=', search), where('teamName', '<=', search + '\uf8ff'));
        countConstraints.unshift(where('teamName', '>=', search), where('teamName', '<=', search + '\uf8ff'));
      }
      
      if (isFirst || (!isFirst && !isNext)) {
        getCountFromServer(query(baseQueryQ, ...countConstraints)).then(snap => {
          setTotalTeamsCount(snap.data().count);
        }).catch(err => console.error("Firestore Core Error: ", err.message));
      }

      const q = query(baseQueryQ, ...constraints);
      const snap = await getDocs(q);
      
      const newList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityTeam));
      setActivityTeams(newList);
      setIsTeamsEnd(true);
      
      if (isFirst) setTeamPageCount(1);
      else if (isNext) setTeamPageCount(prev => prev + 1);
      
    } catch (err) { console.error(err); } finally { setIsTeamsLoading(false); }
  };

  useEffect(() => {
    fetchLargeData(false);
  }, [userRole, churchName, activeYear, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeSection === 'admin_dashboard') {
      if (adminActiveTab === 'participants') fetchParticipantsPage(true, true, participantSearch);
      if (adminActiveTab === 'results' && results.length === 0) fetchResultsPage(true, true);
      if (adminActiveTab === 'online_results' && onlineResults.length === 0) fetchOnlineResultsPage(true, true);
      if (adminActiveTab === 'orders' && orders.length === 0) fetchOrdersPage(true, true);
      if (adminActiveTab === 'activity_teams' && activityTeams.length === 0) fetchTeamsPage(true, true, teamSearch);
    }
  }, [adminActiveTab, activeSection, isLoggedIn, activeYear, partChurchFilter, partStageFilter, partCompFilter]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    
    if (!loginChurch) {
      setLoginError('يرجى اختيار الكنيسة');
      setIsLoading(false);
      return;
    }

    let email = '';
    let password = '';
    let role: 'admin' | 'church' = 'church';
    let targetChurch = loginChurch;

    const code = loginCode.trim();

    if (loginChurch === 'مسئول') {
      if (code !== ADMIN_PASSWORD) {
        setLoginError('كود المسئول غير صحيح');
        setIsLoading(false);
        return;
      }
      email = 'admin@mafk.com';
      password = ADMIN_PASSWORD;
      role = 'admin';
      targetChurch = 'اللجنة المركزية منطقة18';
    } else {
      try {
        const foundChurch = CHURCH_CREDENTIALS.find((c: any) => c.churchName === loginChurch);
        
        if (!foundChurch) {
          setLoginError('الكنيسة غير موجودة');
          setIsLoading(false);
          return;
        }

        if (code !== foundChurch.accessCode) {
          setLoginError('كود الكنيسة غير صحيح');
          setIsLoading(false);
          return;
        }
        
        const slug = encodeURIComponent(loginChurch).replace(/%/g, '');
        email = `${slug}_2026@mafk.com`;
        password = code;
        role = 'church';
      } catch (err) {
        console.error('Error verifying church code:', err);
        setLoginError('تعذر التحقق من البيانات');
        setIsLoading(false);
        return;
      }
    }

    try {
      let firebaseUser;
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = result.user;
      } catch (error: any) {
        // If user doesn't exist, create them (first time login)
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-email') {
          try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            firebaseUser = result.user;
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use') {
              setLoginError('الكود غير صحيح');
              return;
            }
            throw createError;
          }
        } else {
          throw error;
        }
      }

      if (firebaseUser) {
        let userDoc;
        if (email.endsWith('_2026@mafk.com')) {
           const church = CHURCH_CREDENTIALS.find((c: any) => c.accessCode === password);
           userDoc = { exists: () => true, data: () => ({ role: 'church', churchName: church?.churchName || 'كنيسة', uid: firebaseUser.uid }) };
        } else {
           userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        }

        if (!userDoc.exists()) {
          const profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role,
            churchName: targetChurch,
            dashboardBg: ''
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), profile);
          setChurchName(targetChurch);
          setUserRole(role as 'admin' | 'church');
          setUserProfile(profile);
          setIsLoggedIn(true);
        } else {
          const profile = userDoc.data();
          setChurchName(profile?.churchName || '');
          setUserRole(profile?.role || 'church');
          setUserProfile(profile || null);
          setIsLoggedIn(true);
        }
      }
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/wrong-password') {
        setLoginError('الكود غير صحيح');
      } else {
        setLoginError('فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
      console.error(error);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الطلب؟', async () => {
      try {
        await deleteDoc(doc(db, 'orders', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
      }
    });
  };

  const handleDeleteInquiry = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الاستفسار؟', async () => {
      try {
        await deleteDoc(doc(db, 'inquiries', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `inquiries/${id}`);
      }
    });
  };

  const handleDeleteResult = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذه النتيجة؟', async () => {
      try {
        await deleteDoc(doc(db, 'results', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `results/${id}`);
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
      q1Score: result.q1Score || 0,
      qScore: result.qScore || 0,
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
      if (editingResult) {
        await updateDoc(doc(db, 'results', editingResult.id), {
          ...newResult,
          timestamp: new Date().toISOString()
        });
        setEditingResult(null);
        alert('تم تحديث النتيجة بنجاح');
      } else {
        await addDoc(collection(db, 'results'), {
          ...newResult,
          timestamp: new Date().toISOString(),
          year: activeYear
        });
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'results');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  const handleYearChange = async (newYear: string) => {
    if (!newYear) return;
    setIsUpdatingYear(true);
    try {
      await setDoc(doc(db, 'settings', 'app_config'), { activeYear: newYear }, { merge: true });
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
        const q = query(collection(db, 'results'), where('year', '==', activeYear));
        const snapshot = await getDocs(q);
        
        const chunks = [];
        for (let i = 0; i < snapshot.docs.length; i += 400) {
          chunks.push(snapshot.docs.slice(i, i + 400));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'results');
      }
    });
  };

  const toggleGlobalReadAccess = async (status: boolean) => {
    try {
      // 1. Update master state in config
      await setDoc(doc(db, 'settings', 'app_config'), { globalReadAccess: status }, { merge: true });
      
      // 2. Perform batch update on all church users and church info docs
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'church'));
      const churchesQuery = collection(db, 'churches');
      
      const [usersSnap, churchesSnap] = await Promise.all([
        getDocs(usersQuery),
        getDocs(churchesQuery)
      ]);
      
      const batch = writeBatch(db);
      usersSnap.docs.forEach((d) => {
        batch.update(d.ref, { isAllowedToRead: status });
      });
      churchesSnap.docs.forEach((d) => {
        batch.update(d.ref, { isAllowedToRead: status });
      });
      
      await batch.commit();

      setGlobalReadAccess(status);
      setNotification(`تم ${status ? 'تفعيل' : 'إيقاف'} القراءة للجميع (تحديث شامل بنجاح)`);
    } catch (err) {
      console.error("Error toggling global access:", err);
      setNotification("حدث خطأ أثناء تغيير صلاحية القراءة العامة");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
      timestamp: new Date().toLocaleString('ar-EG'),
      reply: ''
    };
    try {
      await addDoc(collection(db, 'inquiries'), { ...newInquiry, year: activeYear });
      setInquiryMessage('');
      alert('تم إرسال استفسارك بنجاح، سيقوم المسئول بالرد عليك قريباً.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'inquiries');
    }
  };

  const handleAdminReply = async (id: string, reply: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { reply });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `inquiries/${id}`);
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

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.activityType || !newTeam.choirLevel) {
      alert('يرجى اختيار نوع النشاط والمرحلة');
      return;
    }

    const isGroupActivity = newTeam.activityType === 'كورال' || newTeam.activityType === 'ألحان';

    // Strict limit of TWO teams per stage per church
    const stageTeams = activityTeams.filter(t => t.churchName === churchName && t.choirLevel === newTeam.choirLevel && t.activityType === newTeam.activityType);
    if (!editingTeam && stageTeams.length >= 2) {
      alert('Limit Reached: Only 2 teams per stage allowed.');
      return;
    }

    if (!isGroupActivity) {
      if (!newTeam.members || newTeam.members.length === 0 || !newTeam.members[0].name) {
        alert('يرجى إدخال اسم المشترك');
        return;
      }
    }
    
    setIsSubmittingTeam(true);

    const maleCount = Number(newTeam.maleCount) || 0;
    const femaleCount = Number(newTeam.femaleCount) || 0;

    const team = {
      churchName,
      activityType: newTeam.activityType,
      members: isGroupActivity ? [] : (newTeam.members as TeamMember[]),
      maleCount: isGroupActivity ? maleCount : 0,
      femaleCount: isGroupActivity ? femaleCount : 0,
      choirLevel: newTeam.choirLevel || '',
      instrumentType: newTeam.instrumentType || '',
      timestamp: new Date().toLocaleString('ar-EG')
    };

    try {
      if (editingTeam) {
        await withExponentialBackoff(() => updateDoc(doc(db, 'activityTeams', editingTeam.id), team));
        
        // Instant state sync
        const updatedTeam: ActivityTeam = {
          ...editingTeam,
          ...team
        } as any;
        setActivityTeams(prev => prev.map(t => t.id === editingTeam.id ? updatedTeam : t));

        setEditingTeam(null);
        alert('تم تحديث النشاط بنجاح.');
      } else {
        const docRef = await withExponentialBackoff(() => addDoc(collection(db, 'activityTeams'), { ...team, year: activeYear }));
        
        // Instant state sync for adding team
        const createdTeam: ActivityTeam = {
          id: docRef.id,
          ...team,
          year: activeYear
        } as any;
        setActivityTeams(prev => [createdTeam, ...prev]);
        setTotalTeamsCount(prev => prev + 1);

        // Auto-register new student in the main participants collection if they don't exist
        if (!isGroupActivity && activeActivityPath === 'new' && newTeam.members?.[0]?.name) {
          const memberName = newTeam.members[0].name.trim();
          const dbParticipant = participants.find(p => p.name.trim() === memberName && p.churchName === churchName);
          if (!dbParticipant) {
             const newParticipant = {
               churchName,
               country: 'Egypt', 
               name: memberName,
               stage: newTeam.members[0].stage,
               gender: newTeam.members[0].gender,
               competitions: [],
               timestamp: new Date().toLocaleString('ar-EG'),
               year: activeYear
             };
             const customId = generateShortId();
             await withExponentialBackoff(() => setDoc(doc(db, 'participants', customId), { ...newParticipant, serial: customId }));
             
             // Decoupled Supabase dynamic backup sync
             try {
               const supabaseBackupPayload = {
                 id: customId,
                 serial: customId,
                 name: memberName,
                 churchName,
                 stage: newTeam.members[0].stage,
                 gender: newTeam.members[0].gender,
                 competition: 'عام',
                 darasi: false,
                 qebti: false,
                 mahfouzat: false,
                 country: 'Egypt',
                 year: activeYear,
                 timestamp: new Date().toISOString()
               };

               supabase
                 .from('registrations')
                 .insert([supabaseBackupPayload])
                 .then(
                   ({ error: sbErr }) => {
                     if (sbErr) console.error('[Supabase Auto-Reg Sync] Quietly failed to insert backup record (Isolated):', sbErr);
                     else console.log('[Supabase Auto-Reg Sync] Backup record inserted successfully.');
                   },
                   (err) => console.error('[Supabase Auto-Reg Sync] Exception caught during backup insertion:', err)
                 );
             } catch (sbEx) {
               console.error('[Supabase Auto-Reg Sync] Exception preparing backup payload:', sbEx);
             }

             // Instant state sync for newly added student from activity
             const newStudent: Participant = {
               id: customId,
               serial: customId,
               ...newParticipant
             } as any as Participant;
             setParticipants(prev => [...prev, newStudent]);
             setTotalParticipantsCount(prev => prev + 1);
             await updateChurchSubscribers(churchName);
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
        femaleCount: 0
      });
      setActivitySearchTerm('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'activityTeams');
    } finally {
      setIsSubmittingTeam(false);
    }
  };

  const handleReplyInquiry = async (id: string, reply: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { reply });
      alert('تم إرسال الرد بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `inquiries/${id}`);
    }
  };

  const handleEditTeam = (team: ActivityTeam) => {
    setNewTeam({
      activityType: team.activityType,
      members: team.members?.length ? team.members : [{ name: '', gender: 'ذكر', stage: '' }],
      choirLevel: team.choirLevel || '',
      instrumentType: team.instrumentType || '',
      performanceType: team.performanceType || '',
      maleCount: team.maleCount || 0,
      femaleCount: team.femaleCount || 0
    });
    setEditingTeam(team);
    setActiveSection('activities');
    // Scroll to form
    const formElement = document.getElementById('activity-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteTeam = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف هذا الفريق؟', async () => {
      try {
        await deleteDoc(doc(db, 'activityTeams', id));
        setActivityTeams(prev => prev.filter(t => t.id !== id));
        setTotalTeamsCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `activityTeams/${id}`);
      }
    });
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
      const batch = writeBatch(db);
      batch.delete(doc(db, 'participants', id));
      batch.delete(doc(db, 'active_sessions', id));
      batch.delete(doc(db, 'results', id));
      batch.delete(doc(db, 'online_results', id));
      await batch.commit();

      // Parallel non-blocking Supabase delete
      supabase
        .from('registrations')
        .delete()
        .eq('id', id)
        .then(
          ({ error: sbErr }) => {
            if (sbErr) console.error('[Supabase Delete Sync] Quietly failed to delete backup record (Isolated):', sbErr);
            else console.log('[Supabase Delete Sync] Backup record deleted successfully.');
          },
          (err) => console.error('[Supabase Delete Sync] Exception caught during delete backup:', err)
        );

      // Get the church name before deleting
      const deletedParticipant = participants.find(p => p.id === id);
      const targetChurch = deletedParticipant?.churchName || churchName;

      // Instant local state sync
      setParticipants(prev => prev.filter(p => p.id !== id));
      setTotalParticipantsCount(prev => Math.max(0, prev - 1));

      setShowDeleteModal(false);
      setParticipantToDelete(null);
      setDeleteConfirmText('');

      await updateChurchSubscribers(targetChurch);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `participants/${id}`);
    }
  };

  const [showExamGateway, setShowExamGateway] = useState(false);

  const handleResetExam = async (studentId: string, studentName?: string) => {
    console.log('Admin calling handleResetExam:', { studentId, studentName });
    if (!confirm(`هل أنت متأكد من إعادة فتح الامتحان للطالب ${studentName || ''}؟ سيؤدي ذلك لمسح المحاولة الحالية وأرشفتها.`)) return;
    setIsLoading(true);
    try {
      const resultRef = doc(db, 'results', studentId);
      const resDoc = await getDoc(resultRef);
      
      if (resDoc.exists()) {
        const data = resDoc.data();
        // 1. Archive Old Attempt
        await addDoc(collection(db, 'results', studentId, 'previous_attempts'), {
          ...data,
          archivedAt: new Date().toISOString(),
          archivedBy: user?.email || 'admin'
        });
        
        // 2. Clear primary fields
        await updateDoc(resultRef, {
          academicScore: deleteField(),
          memorizationScore: deleteField(),
          copticL1Score: deleteField(),
          copticL2Score: deleteField(),
          score: deleteField(),
          data: deleteField(),
          submissionInfo: deleteField(),
          isSubmitted: false // Explicitly clear submission flag
        });
      }
      
      // 3. Unlock Gateway / Reset Session
      await setDoc(doc(db, 'active_sessions', studentId), {
        allowReentry: true,
        status: 'active',
        lastUpdate: new Date().toISOString()
      }, { merge: true });
      
      const successMsg = `تمت إعادة فتح الامتحان بنجاح للطالب: ${studentName || studentId}`;
      setNotification(successMsg);
      alert(successMsg);
    } catch (e) {
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
      const recordsToInsert = participantsList.map((name) => {
          const customId = generateShortId();
          const compStatuses = mapArabicCompetitions(["دراسي"], false);
          return {
              serial: customId,
              id: customId,
              name: name.trim(),
              churchName: "دير الجرنوس",
              stage: "جامعة",
              gender: "ذكر",
              competition: "دراسي",
              darasi: compStatuses.darasi,
              qebti: compStatuses.qebti,
              mahfouzat: compStatuses.mahfouzat,
              country: "مصر",
              year: activeYear,
              timestamp: new Date().toISOString()
          };
      });
      
      const { error } = await supabase.from('registrations').insert(recordsToInsert);
      if (error) throw error;
      
      alert("تم إضافة 20 مشترك بنجاح إلى Supabase!");
    } catch (e: any) {
      console.error("Bulk insert failed:", e);
      alert("فشل في الإضافة: " + e.message);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.name || !newParticipant.stage || !newParticipant.gender) {
      alert('يرجى ملء جميع الحقول المطلوبة (الاسم، المرحلة، النوع)');
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
      if (editingParticipant) {
        const firebaseUpdateFields = {
          name: newParticipant.name,
          stage: newParticipant.stage,
          gender: newParticipant.gender,
          competitions: newParticipant.competitions.filter(c => c !== ''),
          timestamp: new Date().toISOString()
        };
        
        // 1. Authoritative Firebase update
        await withExponentialBackoff(() => updateDoc(doc(db, 'participants', editingParticipant.id), firebaseUpdateFields));
        
        // 2. Parallel, non-blocking Supabase update with unified fields
        const compStatuses = mapArabicCompetitions(newParticipant.competitions.filter(c => c !== ''), false);
        const supabaseUpdateFields = {
          name: newParticipant.name.trim(),
          stage: newParticipant.stage.trim(),
          gender: newParticipant.gender,
          competition: newParticipant.competitions.filter(c => c !== '').join(', ') || 'عام',
          darasi: compStatuses.darasi,
          qebti: compStatuses.qebti,
          mahfouzat: compStatuses.mahfouzat,
          timestamp: new Date().toISOString()
        };

        supabase
          .from('registrations')
          .update(supabaseUpdateFields)
          .eq('id', editingParticipant.id)
          .then(
            ({ error: sbErr }) => {
              if (sbErr) {
                console.error('[Supabase Edit Sync] Quietly failed to edit backup record (Isolated):', sbErr);
              } else {
                console.log('[Supabase Edit Sync] Backup record updated successfully.');
              }
            },
            (err) => {
              console.error('[Supabase Edit Sync] Exception caught during edit backup:', err);
            }
          );
        
        // Instant state sync for edit
        const updatedParticipant: Participant = {
          ...editingParticipant,
          ...firebaseUpdateFields
        };
        setParticipants(prev => prev.map(p => p.id === editingParticipant.id ? updatedParticipant : p));

        setEditingParticipant(null);
        alert('تم تحديث بيانات المشترك بنجاح.');
      } else {
        // Core Dual-Write Implementation (Writes to Firebase primary first, then Supabase backup in decoupled background task)
        const dualWriteRes = await registerParticipantDualWrite({
          name: newParticipant.name,
          churchName: churchName,
          stage: newParticipant.stage,
          gender: newParticipant.gender,
          competitions: newParticipant.competitions.filter(c => c !== ''),
          year: activeYear,
          country: 'مصر'
        }, false);

        if (!dualWriteRes.success) {
          throw new Error('Dual-write registration failed in primary database.');
        }

        const customId = dualWriteRes.id;
        
        // Instant state sync for adding a new student
        const newStudent: Participant = {
          id: customId,
          serial: customId,
          churchName,
          name: newParticipant.name,
          stage: newParticipant.stage,
          gender: newParticipant.gender,
          competitions: newParticipant.competitions.filter(c => c !== ''),
          timestamp: new Date().toISOString(),
          year: activeYear,
          country: 'مصر'
        } as any as Participant;
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
      handleFirestoreError(error, OperationType.WRITE, 'participants');
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
    let newOrder;
    try {
      newOrder = {
        churchName,
        grandTotal: calculations.grandTotal,
        timestamp: new Date().toLocaleString('ar-EG'),
        details: activeRows.map(r => ({
          settingId: r.id,
          stage: r.stage,
          material: r.material,
          price: r.price,
          quantity: r.quantity,
          subtotal: r.subtotal
        }))
      };

      const docRef = await withExponentialBackoff(() => addDoc(collection(db, 'orders'), { ...newOrder, year: activeYear }));
      
      // Instant state sync
      const finalOrder: Order = {
        id: docRef.id,
        ...newOrder,
        year: activeYear
      } as any;
      setOrders(prev => [finalOrder, ...prev]);
      setTotalOrdersCount(prev => prev + 1);
      
      setSubmitStatus('success');
      alert('تم إرسال طلب الكتب للجنة بنجاح!');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error: any) {
      console.error('Error submitting order:', error);
      if (error && (error.code === 'resource-exhausted' || error.message?.includes('quota'))) {
        const existing = JSON.parse(localStorage.getItem('emergency_registrations') || '[]');
        existing.push({ ...newOrder, type: 'orders', submittedAt: new Date().toISOString() });
        localStorage.setItem('emergency_registrations', JSON.stringify(existing));
        setSubmitStatus('success');
        alert("تم حفظ البيانات مؤقتاً (بسبب ضغط على السيرفر). يرجى التواصل مع اللجنة.");
      } else {
        setSubmitStatus('error');
        handleFirestoreError(error, OperationType.WRITE, 'orders');
      }
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
        if (id === 'exams_portal') {
          setShowExamGateway(true);
        } else {
          setActiveSection(id); 
        }
        setIsMenuOpen(false); 
      }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 w-full text-right ${
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
        className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-6 group"
      >
        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        <span className="font-bold text-sm">{isDashboard ? 'العودة للرئيسية' : 'العودة للوحة التحكم'}</span>
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
                <div className="overflow-x-auto">
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

  const DuplicateScanModal = () => (
    <AnimatePresence>
      {isDuplicateScanModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isScanningDuplicates && !isDeletingDuplicates && setIsDuplicateScanModalOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative bg-white w-full max-w-lg flex flex-col rounded-3xl shadow-2xl p-8"
          >
            {isScanningDuplicates ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="animate-spin text-coptic-blue mb-4" size={48} />
                <h3 className="text-lg font-black text-slate-800 mb-2">جاري فحص السجلات...</h3>
                <p className="text-sm font-bold text-slate-500 text-center">يتم الآن مطابقة الأسماء والمراحل والمسابقات عبر النظام</p>
              </div>
            ) : isDeletingDuplicates ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="animate-spin text-red-500 mb-4" size={48} />
                <h3 className="text-lg font-black text-red-600 mb-2">جاري تطهير قاعدة البيانات...</h3>
                <p className="text-sm font-bold text-slate-500 text-center">يرجى الانتظار، يتم الآن حذف السجلات المكررة والاحتفاظ بنسخة واحدة أصلية</p>
              </div>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-6">
                  <Layers className="text-rose-500" size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-center text-slate-800 mb-4">نتائج فحص التكرار</h3>
                
                {duplicateRecords.length === 0 ? (
                  <div className="text-center">
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 font-bold mb-6">
                      قاعدة البيانات نظيفة تماماً! لم يتم العثور على أي استمارات مكررة.
                    </div>
                    <button 
                      onClick={() => setIsDuplicateScanModalOpen(false)}
                      className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 transition-colors"
                    >
                      إغلاق
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-bold text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-100 mb-6 leading-relaxed">
                      تم العثور على <span className="font-black text-lg mx-1">{duplicateRecords.reduce((acc, curr) => acc + curr.length - 1, 0)}</span> سجلات مكررة ضمن <span className="font-black text-lg mx-1">{duplicateRecords.length}</span> طالب متطابق تماماً في (الاسم - الكنيسة - المرحلة - المسابقات).
                      <br/><br/>
                      الوظيفة الآمنة: سيتم الاحتفاظ بنسخة واحدة أصلية لكل شخص وحذف باقي النسخ الإضافية لضمان صحة أرقام الطباعة.
                    </p>
                    
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsDuplicateScanModalOpen(false)}
                        className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-sm hover:bg-slate-200 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button 
                        onClick={handleDeleteDuplicates}
                        className="flex-1 px-4 py-3 bg-rose-600 text-white rounded-xl font-black text-sm hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20 flex justify-center items-center gap-2"
                      >
                        تأكيد تطهير التكرار
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen bg-bg-soft font-sans selection:bg-accent/30 relative" dir="rtl">
      {isQuotaExceeded && (
        <div className="bg-amber-600 text-white py-3 px-4 text-center text-xs md:text-sm font-bold flex items-center justify-center gap-2 z-[999999] relative shadow-md" dir="rtl">
          <span>⚠️</span>
          <span>تنبيه: تم تجاوز الحد الأقصى لقراءة البيانات اليومية المجانية لقاعدة البيانات (Firestore Quota Limit Exceeded). يرجى المحاولة غداً أو لاحقاً.</span>
        </div>
      )}
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
                {userRole === 'admin' && <NavItem id="admin_dashboard" icon={ShieldCheck} label="لوحة تحكم المسئول" />}
                {userRole === 'church' && <NavItem id="church_dashboard" icon={LayoutDashboard} label="صفحة الكنيسة" />}
                <NavItem id="calculator" icon={Calculator} label="حاسبة الكتب" />
                <NavItem id="inquiries" icon={MessageSquare} label="الاستفسارات والشكاوي" />
                <NavItem id="exams_portal" icon={BookOpen} label="امتحانات الأونلاين" />
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
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
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
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl hover:bg-primary/90 hover:scale-105 transition-all font-bold text-sm shadow-lg"
            >
              <Menu size={18} />
              <span>القائمة</span>
            </button>
          </div>
        </div>
      </header>

      {!isLoggedIn && activeSection !== 'schedule' ? (
        <main className="max-w-md mx-auto px-4 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-10 rounded-xl shadow-sm border border-slate-100"
          >
            <div className="text-center mb-10">
              <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-20 h-20 rounded-full mx-auto mb-6 object-contain shadow-sm border border-slate-50 bg-white" />
              <h2 className="text-2xl font-black text-slate-800">تسجيل الدخول</h2>
              <p className="text-slate-500 text-sm mt-2 font-bold">يرجى اختيار الكنيسة وإدخال الكود الخاص بها</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
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
                  {[...publicChurches].sort((a, b) => a.name.localeCompare(b.name)).map(church => (
                    <option key={church.name} value={church.name}>{church.name}</option>
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
        </main>
      ) : (
        <div 
          className={`min-h-screen transition-all duration-500 ${dashboardBg ? 'bg-fixed bg-cover bg-center' : 'bg-slate-50'}`}
          style={dashboardBg ? { backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.9), rgba(248, 250, 252, 0.9)), url(${dashboardBg})` } : {}}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h3 className="text-xl font-black text-coptic-blue mb-2">{userRole === 'admin' ? 'لوحة المسئول' : 'صفحة الكنيسة'}</h3>
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
              <LiveExamGateway />
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
                  {/* Universal Filter Engine - Results View */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Search size={20} className="text-primary" />
                      <h4 className="font-black text-slate-800 text-sm italic uppercase">محرك البحث الشامل</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="ابحث بالاسم..."
                          value={globalNameFilter}
                          onChange={(e) => setGlobalNameFilter(e.target.value)}
                          className="w-full pr-4 pl-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary font-bold shadow-sm"
                        />
                      </div>
                      <select 
                        value={globalStageFilter}
                        onChange={(e) => setGlobalStageFilter(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary font-bold shadow-sm"
                      >
                        <option value="الكل">كل المراحل</option>
                        {OFFICIAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select 
                        value={resultsFilterGrade}
                        onChange={(e) => setResultsFilterGrade(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-primary font-bold shadow-sm"
                      >
                        <option value="الكل">كل التقديرات</option>
                        {['ممتاز', 'جيد جداً', 'جيد', 'مقبول'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <ResultsViewer results={filteredResultsList} isAdmin={userRole === 'admin'} />
                </>
              )}
            </div>
          </motion.div>
        )}

        {activeSection === 'church_dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
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
                  {OFFICIAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select 
                  value={globalCompetitionFilter}
                  onChange={(e) => setGlobalCompetitionFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary font-bold"
                >
                  <option value="الكل">كل المسابقات / الأنشطة</option>
                  {OFFICIAL_COMPETITIONS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <QuickActionsHub userRole={userRole === 'super_admin' ? 'admin' : userRole} onAction={setActiveSection} />
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
                    onClick={() => setShowExamGateway(true)}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl hover:scale-105 active:scale-95"
                  >
                    <BookOpen size={18} /> بدء دخول الامتحان (QR Scan)
                  </button>
                  <button 
                    onClick={() => generateMasterExcel(churchName)}
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

                <div className="space-y-4 relative">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <UserPlus size={20} className="text-coptic-blue" /> تسجيل المشتركين
                  </h4>
                  {!systemControls.isRegistrationOpen && (
                    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-3xl" style={{ marginTop: '2.5rem' }}>
                      <span className="bg-rose-100 text-rose-700 px-6 py-2 rounded-full font-black text-sm border border-rose-200 shadow-sm animate-pulse">
                        التسجيل مغلق مؤقتاً وسيعود للعمل صباحاً
                      </span>
                    </div>
                  )}
                  <form onSubmit={handleAddParticipant} className={`bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 ${!systemControls.isRegistrationOpen ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">اسم المخدوم ثلاثياً</label>
                        <input 
                          type="text" 
                          placeholder="أدخل الاسم الثلاثي"
                          value={newParticipant.name}
                          onChange={e => setNewParticipant({...newParticipant, name: e.target.value})}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue"
                          required
                        />
                        {isCheckingParticipantDuplicate && (
                          <p className="text-[10px] text-slate-400 animate-pulse font-medium mt-1">جاري التحقق من قاعدة البيانات...</p>
                        )}
                        {participantDuplicateWarning && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mt-1.5 flex items-start gap-2 text-amber-800 text-[11px] font-bold leading-relaxed shadow-sm transition-all animate-fade-in">
                            <span className="shrink-0 text-amber-500 font-bold">⚠️</span>
                            <span>{participantDuplicateWarning}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">النوع</label>
                        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                          <button
                            type="button"
                            onClick={() => setNewParticipant({...newParticipant, gender: 'ذكر'})}
                            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${newParticipant.gender === 'ذكر' ? 'bg-white shadow-sm text-coptic-blue' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            ذكر
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewParticipant({...newParticipant, gender: 'أنثى'})}
                            className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${newParticipant.gender === 'أنثى' ? 'bg-white shadow-sm text-coptic-blue' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            أنثى
                          </button>
                        </div>
                        {/* Hidden required input for form validation */}
                        <input type="text" name="gender" value={newParticipant.gender} required className="hidden" onChange={() => {}} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">المرحلة الدراسية</label>
                      <select 
                        value={newParticipant.stage}
                        onChange={e => setNewParticipant({...newParticipant, stage: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue"
                        required
                      >
                        <option value="">اختر المرحلة</option>
                        {OFFICIAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">نوع المسابقات (بحد أقصى ٣)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2].map((idx) => {
                          const selectedComps = newParticipant.competitions;
                          
                          const isOptionDisabled = (val: string) => {
                            if (!val) return false;
                            // Check if selected in other slots
                            if (selectedComps.some((c, i) => i !== idx && c === val)) return true;
                            // Mutual exclusivity for Coptic Levels
                            if (val.includes('قبطي مستوى') && selectedComps.some((c, i) => i !== idx && c.includes('قبطي مستوى'))) return true;
                            // Level enforcement
                            const isCopticLevel2Allowed = ['خامسة وسادسة', 'إعدادي', 'ثانوي', 'جامعة', 'خريجون', 'خدام وإعداد الخدام', 'قانا الجليل', 'تعليم كبار', 'سمعان الشيخ', 'حرفيون', 'صم وبكم', 'قدرات خاصة', 'ديديموس', 'بولس وسيلا'].includes(newParticipant.stage);
                            if (val === 'قبطي مستوى ثان' && !isCopticLevel2Allowed) return true;
                            if (val === 'قبطي مستوى أول' && isCopticLevel2Allowed && !['حضانة', 'أولى وثانية', 'ثالثة ورابعة'].includes(newParticipant.stage)) return true;
                            
                            return false;
                          };

                          return (
                            <select 
                              key={idx}
                              value={newParticipant.competitions[idx]}
                              onChange={e => {
                                const newComps = [...newParticipant.competitions];
                                newComps[idx] = e.target.value;
                                setNewParticipant({...newParticipant, competitions: newComps});
                              }}
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue"
                            >
                              <option value="">-- اختر المسابقة --</option>
                              {OFFICIAL_COMPETITIONS.map((comp: string) => (
                                <option key={comp} value={comp} disabled={isOptionDisabled(comp)}>{comp}</option>
                              ))}
                            </select>
                          );
                        })}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingParticipant}
                      className={`w-full py-3.5 text-white rounded-xl font-black text-sm shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 ${isSubmittingParticipant ? 'bg-slate-400 cursor-not-allowed' : 'bg-coptic-blue'}`}
                    >
                      {isSubmittingParticipant ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <UserPlus size={18} />}
                      {isSubmittingParticipant ? 'جاري التسجيل...' : 'إضافة المشترك'}
                    </button>
                  </form>

                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        placeholder="بحث عن مشترك بالاسم..."
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue"
                      />
                    </div>

                      <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {userProfile?.isAllowedToRead === false ? (
                          <div className="text-center py-12 bg-amber-50 rounded-3xl border border-amber-200">
                            <Lock className="mx-auto text-amber-500 mb-2" size={32} />
                            <p className="text-sm text-amber-700 font-black">تم إيقاف عرض القوائم مؤقتاً</p>
                            <p className="text-[10px] text-amber-600 font-bold mt-1">تواصل مع الإدارة للمزيد من التفاصيل</p>
                          </div>
                        ) : (
                          <>
                            {filteredParticipantsList
                              .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                              .map(p => (
                              <div key={p.id} className="group relative p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-sm font-black text-slate-800">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[10px] font-bold text-coptic-blue">{p.stage}</p>
                                  <span className="text-[9px] text-slate-400 font-black px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">{p.gender || 'غير محدد'}</span>
                                </div>
                              </div>
                              <div>
                                <button 
                                  onClick={() => {
                                    handleEditParticipant(p);
                                    setActiveSection('registration');
                                  }}
                                  className="p-1.5 text-coptic-blue hover:text-primary transition-colors"
                                  title="تعديل المشترك"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setParticipantToDelete(p.id);
                                    setShowDeleteModal(true);
                                  }} 
                                  className="p-1.5 text-rose-500 hover:text-red-700 transition-colors"
                                  title="حذف المشترك"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(p.competitions || []).map((comp, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full">
                                  {comp}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                        {filteredParticipantsList.length === 0 && (
                          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <UserPlus className="mx-auto text-slate-300 mb-2" size={32} />
                            <p className="text-xs text-slate-400 font-bold">لا يوجد مشتركين مسجلين بعد</p>
                          </div>
                        )}
                        </>
                      )}
                    </div>

                  {/* Pagination Controls for Church Dashboard */}
                  <PaginationComponent 
                    currentPage={currentPage}
                    totalItems={filteredParticipantsList.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[700px] flex flex-col lg:flex-row">
              {/* Sidebar Navigation */}
              <div className="w-full lg:w-72 bg-slate-50 border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-coptic-red text-white rounded-xl flex items-center justify-center shadow-lg">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 leading-tight">لوحة الإدارة</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">المنطقة ١٨</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">تصفية حسب الكنيسة</label>
                    <select 
                      value={globalChurchFilter}
                      onChange={(e) => setGlobalChurchFilter(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary font-bold shadow-sm"
                    >
                      <option value="الكل">عرض الكل</option>
                      {Array.from(new Set(publicChurches.map((c: any) => c.name))).sort().map(church => (
                        <option key={church} value={church}>{church}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 mt-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">بحث بالاسم</label>
                    <input 
                      type="text"
                      placeholder="ابحث بالاسم..."
                      value={globalNameFilter}
                      onChange={(e) => setGlobalNameFilter(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary font-bold shadow-sm"
                    />
                  </div>
                  <div className="mt-6">
                    <button 
                      onClick={() => { generateMasterExcel(userRole === 'admin' ? null : churchName); }}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                    >
                      <Download size={14} /> التصدير الشامل (Excel)
                    </button>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2 h-auto lg:h-full overflow-x-auto lg:overflow-y-auto no-scrollbar lg:custom-scrollbar">
                  <div className="flex gap-2 lg:flex-col lg:space-y-1">
                    {visibleAdminTabs.map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setAdminActiveTab(tab.id)}
                        className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-black text-sm text-right ${adminActiveTab === tab.id ? 'bg-primary text-white shadow-md transform lg:scale-[1.02]' : 'bg-white lg:bg-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-900 border lg:border-none border-slate-200'}`}
                      >
                        <tab.icon size={18} className={adminActiveTab === tab.id ? 'text-white' : 'text-slate-400'} />
                        <span className="flex-1 whitespace-nowrap">{tab.label}</span>
                        {adminActiveTab === tab.id && <ChevronLeft size={16} className="text-white/50 hidden lg:block" />}
                      </button>
                    ))}
                  </div>
                  
                  {/* Customization Button */}
                  <div className="border-t border-slate-100 lg:border-none mt-auto pt-4 pb-2 lg:pt-8 w-full flex justify-center">
                    <button 
                      onClick={openCustomizeModal}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-colors font-black text-xs min-w-[200px] lg:min-w-0"
                    >
                      <Sliders size={16} /> خصص لوحة التحكم
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-6 md:p-10 min-w-0 bg-white overflow-y-auto">

              {adminActiveTab === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <div className="p-6 bg-coptic-blue/5 rounded-3xl border border-coptic-blue/10">
                  <p className="text-[10px] font-black text-coptic-blue uppercase mb-1">المشتركين ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {totalParticipantsCount}
                  </p>
                </div>
                <div className="p-6 bg-coptic-gold/5 rounded-3xl border border-coptic-gold/10">
                  <p className="text-[10px] font-black text-coptic-gold uppercase mb-1">طلبات الكتب ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {totalOrdersCount}
                  </p>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">الفرق ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {totalTeamsCount}
                  </p>
                </div>
                <div className="p-6 bg-coptic-red/5 rounded-3xl border border-coptic-red/10">
                  <p className="text-[10px] font-black text-coptic-red uppercase mb-1">الاستفسارات ({globalChurchFilter})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {(inquiries || []).filter(i => globalChurchFilter === 'الكل' || i.churchName === globalChurchFilter).length}
                  </p>
                </div>
              </div>

                  <div className="mb-12 p-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
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
                        onClick={() => generateMasterExcel(userRole === 'admin' ? null : churchName)}
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
                      onClick={() => setIsDuplicateScanModalOpen(true)}
                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-black shadow-sm flex items-center gap-2 hover:bg-rose-100 transition-colors"
                    >
                      <Layers size={14} /> فحص وتطهير التكرار
                    </button>
                    <button 
                      onClick={exportAllRegistrationsToExcel}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm"
                    >
                      <Download size={14} /> Excel
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
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

                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400">المرحلة</label>
                    <select 
                      value={partStageFilter}
                      onChange={(e) => setPartStageFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                    >
                      <option value="الكل">كل المراحل</option>
                      {OFFICIAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="flex-1 w-full flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400">المسابقة</label>
                      <select 
                        value={partCompFilter}
                        onChange={(e) => setPartCompFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                      >
                        <option value="الكل">مسابقة (الكل)</option>
                        {OFFICIAL_COMPETITIONS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                  </div>

                  <div className="flex-2 w-full flex flex-col gap-1.5 relative">
                    <label className="text-[10px] font-black text-slate-400">البحث بالاسم</label>
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text"
                        placeholder="ابحث بالاسم..."
                        className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchParticipantsPage(true, true, participantSearch)}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => fetchParticipantsPage(true, true, participantSearch)}
                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black shadow-md hover:bg-slate-800 transition-colors w-full md:w-auto mt-2 md:mt-0"
                  >
                    تطبيق 
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] font-black text-slate-500 uppercase">
                        <th className="p-4 border-b border-slate-100">الاسم</th>
                        <th className="p-4 border-b border-slate-100">النوع</th>
                        <th className="p-4 border-b border-slate-100">الكنيسة</th>
                        <th className="p-4 border-b border-slate-100">المرحلة</th>
                        <th className="p-4 border-b border-slate-100">المسابقات</th>
                        <th className="p-4 border-b border-slate-100 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants
                        .slice((participantPageCount - 1) * 20, participantPageCount * 20)
                        .map(p => (
                          <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 text-sm">{p.name}</td>
                            <td className="p-4 text-slate-600 text-xs">{p.gender || '--'}</td>
                            <td className="p-4 text-slate-600 text-xs">{p.churchName}</td>
                            <td className="p-4 text-slate-600 text-xs">{p.stage}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {(p.competitions || []).map((c, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-[9px] font-black">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
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
                                    setParticipantToDelete(p.id);
                                    setShowDeleteModal(true);
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

                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-slate-400">
                  <PaginationComponent 
                    currentPage={participantPageCount}
                    totalItems={participants.length}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] font-black text-slate-500 uppercase">
                        <th className="p-4 border-b border-slate-100">النشاط</th>
                        <th className="p-4 border-b border-slate-100">الكنيسة</th>
                        <th className="p-4 border-b border-slate-100">عدد الأعضاء</th>
                        <th className="p-4 border-b border-slate-100 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activityTeams
                        .slice((teamPageCount - 1) * 20, teamPageCount * 20)
                        .map(t => (
                          <tr key={t.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 text-sm">{t.activityType}</td>
                            <td className="p-4 text-slate-600 text-xs">{t.churchName}</td>
                            <td className="p-4 text-slate-600 text-xs">{t.members.length}</td>
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
              <OmrGenerator />
            )}

            {adminActiveTab === 'results' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Award className="text-indigo-600" /> السجل العام
                  </h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                      <input 
                        type="text"
                        placeholder="ابحث باسم الطالب..."
                        value={resultSearch}
                        onChange={(e) => setResultSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchResultsPage(true, true, resultSearch)}
                        className="pr-12 pl-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all w-72"
                      />
                    </div>
                    <button 
                      onClick={() => fetchResultsPage(true, true, resultSearch)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
                    >
                      بحث
                    </button>
                    <button 
                      onClick={() => fetchResultsPage(true, true, resultSearch)}
                      disabled={isResultsLoading}
                      className="px-4 py-3 bg-white text-slate-700 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition flex items-center gap-2"
                    >
                      <RotateCw size={18} className={isResultsLoading ? 'animate-spin' : ''} /> تحديث
                    </button>
                  </div>
                </div>
                <ResultsViewer results={results} isAdmin={userRole === 'admin'} onReset={(id) => handleResetExam(id)} />

                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-slate-400">
                  <PaginationComponent 
                    currentPage={resultPageCount}
                    totalItems={results.length}
                    itemsPerPage={20}
                    onPageChange={setResultPageCount}
                  />
                  {isResultsLoading && (
                    <div className="flex items-center gap-2 text-coptic-blue font-black animate-pulse text-xs">
                       <Loader2 className="animate-spin" size={14} /> جاري التحميل...
                    </div>
                  )}
                  {!isResultsLoading && <span className="text-[10px]">عرض ٢٠ نتيجة في الصفحة</span>}
                </div>
              </section>
            )}

            {adminActiveTab === 'online_results' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Award className="text-emerald-600" /> قسم النتائج (أونلاين)
                  </h4>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => fetchOnlineResultsPage(true, true)}
                      disabled={isOnlineResultsLoading}
                      className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition flex items-center gap-2"
                    >
                      <RotateCw size={18} className={isOnlineResultsLoading ? 'animate-spin' : ''} /> تحديث
                    </button>
                    <button
                      onClick={() => { exportOnlineResultsExcel(onlineResults); }}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 transition shadow flex items-center gap-2"
                    >
                      <Download size={18} /> استخراج Excel الحالي
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse bg-white rounded-xl shadow-sm overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase">
                        <th className="p-4 border-b border-slate-200">الكود</th>
                        <th className="p-4 border-b border-slate-200">الاسم</th>
                        <th className="p-4 border-b border-slate-200">الكنيسة</th>
                        <th className="p-4 border-b border-slate-200">المرحلة</th>
                        <th className="p-4 border-b border-slate-200">د</th>
                        <th className="p-4 border-b border-slate-200">م</th>
                        <th className="p-4 border-b border-slate-200">ق1</th>
                        <th className="p-4 border-b border-slate-200">ق2</th>
                        <th className="p-4 border-b border-slate-200">الإجمالي</th>
                        <th className="p-4 border-b border-slate-200">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.values((onlineResults || []).reduce((acc: any, r: any) => {
                        const id = r.studentID || r.studentId;
                        if (!id) return acc;
                        if (!acc[id]) acc[id] = { ...r };
                        else {
                           Object.keys(r).forEach(k => { if (r[k] !== undefined && r[k] !== null) acc[id][k] = r[k]; });
                        }
                        return acc;
                      }, {}))
                      .slice((onlineResultPageCount - 1) * 20, onlineResultPageCount * 20)
                      .map((r: any, i: number) => {
                        let drasy = r['مسابقة دراسي'] ?? (r.competition === 'دراسي' ? r.finalScore : '-');
                        let mahfozat = r['مسابقة محفوظات'] ?? (r.competition === 'محفوظات' ? r.finalScore : '-');
                        let coptic1 = r['مسابقة قبطي مستوى أول'] ?? (r.competition === 'قبطي مستوى أول' ? r.finalScore : '-');
                        let coptic2 = r['مسابقة قبطي مستوى ثاني'] ?? (r.competition === 'قبطي مستوى ثاني' ? r.finalScore : '-');
                        let total = 0;
                        if (typeof drasy === 'number') total += drasy;
                        if (typeof mahfozat === 'number') total += mahfozat;
                        if (typeof coptic1 === 'number') total += coptic1;
                        if (typeof coptic2 === 'number') total += coptic2;

                        return (
                        <tr key={r.id || i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-mono text-xs text-slate-500">{r.studentID || r.studentId || '-'}</td>
                          <td className="p-4 font-bold text-slate-800 text-sm whitespace-nowrap">{r.studentName || '-'}</td>
                          <td className="p-4 text-slate-600 text-xs">{r.churchName || '-'}</td>
                          <td className="p-4 text-slate-600 text-xs">{r.stage || '-'}</td>
                          <td className="p-4 font-black text-indigo-600">{drasy}</td>
                          <td className="p-4 font-black text-indigo-600">{mahfozat}</td>
                          <td className="p-4 font-black text-indigo-600">{coptic1}</td>
                          <td className="p-4 font-black text-indigo-600">{coptic2}</td>
                          <td className="p-4 font-black text-slate-800 bg-slate-50">{total || '-'}</td>
                          <td className="p-4 text-xs text-slate-400 text-left" dir="ltr">
                            {r.submissionTimestamp ? new Date(r.submissionTimestamp).toLocaleString('ar-EG') : '-'}
                          </td>
                        </tr>
                        );
                      })}
                      {onlineResults.length === 0 && (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">لا يوجد نتائج أونلاين مسجلة بعد.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-slate-400">
                  <PaginationComponent 
                    currentPage={onlineResultPageCount}
                    totalItems={onlineResults.length}
                    itemsPerPage={20}
                    onPageChange={setOnlineResultPageCount}
                  />
                  {isOnlineResultsLoading && (
                    <div className="flex items-center gap-2 text-coptic-blue font-black animate-pulse text-xs">
                       <Loader2 className="animate-spin" size={14} /> جاري التحميل...
                    </div>
                  )}
                  {!isOnlineResultsLoading && <span className="text-[10px]">عرض ٢٠ نتيجة في الصفحة</span>}
                </div>
              </section>
            )}

            {adminActiveTab === 'orders' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="text-coptic-red" /> إدارة طلبات الكتب
                  </h4>
                  <button 
                    onClick={() => fetchOrdersPage(true, true)}
                    disabled={isOrdersLoading}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition flex items-center gap-2"
                  >
                    <RotateCw size={18} className={isOrdersLoading ? 'animate-spin' : ''} /> تحديث
                  </button>
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
                      {OFFICIAL_COMPETITIONS.map(comp => (
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
              <section>
                <h4 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                  <BookOpen className="text-primary" /> بناء وتحكم الامتحانات الإلكترونية
                </h4>
                <ExamBuilder stages={OFFICIAL_STAGES} />
              </section>
            )}

            {adminActiveTab === 'exams_live' && (
              <section>
                <h4 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                  <Activity className="text-primary" /> المتابعة المباشرة للامتحانات
                </h4>
                <LiveExamMonitoring 
                  results={results} 
                  onlineResults={onlineResults}
                  globalChurchFilter={globalChurchFilter} 
                  onResetExam={handleResetExam}
                />
              </section>
            )}

            {adminActiveTab === 'calculator' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200 font-arabic">
                <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                  <Calculator className="text-primary" /> إدارة حاسبة الكتب
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المرحلة</label>
                    <select 
                      value={newCalculatorSetting.stage}
                      onChange={(e) => setNewCalculatorSetting({...newCalculatorSetting, stage: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold font-arabic"
                    >
                      <option value="">-- اختر المرحلة --</option>
                      {OFFICIAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المادة</label>
                    <select 
                      value={newCalculatorSetting.material}
                      onChange={(e) => setNewCalculatorSetting({...newCalculatorSetting, material: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold font-arabic"
                    >
                      <option value="">-- اختر المادة --</option>
                      {['دراسي', 'محفوظات', 'قبطي', 'أنشطة', 'تطبيقات'].map(m => <option key={m} value={m}>{m}</option>)}
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
                <DynamicAdminSettings />
                
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

            {adminActiveTab === 'system_settings' && (
              <div className="space-y-12">
                {/* Control Hub Section */}
                <section className="p-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 inset-x-0 h-2 bg-primary" />
                  <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-8">
                    <Sliders className="text-primary" /> لوحة التحكم المركزية للطوارئ
                  </h4>

                  {/* System Core Switches */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div className="mb-4">
                        <h5 className="text-lg font-black text-slate-800 flex items-center gap-2"><UserPlus size={20} className="text-coptic-blue"/> التسجيل الموحد</h5>
                        <p className="text-sm text-slate-500 font-bold mt-1">فتح أو غلق استمارات التسجيل في الكنائس لمنع إضافة مشتركين جدد</p>
                      </div>
                      <button 
                        onClick={() => handleUpdateSystemControls({...systemControls, isRegistrationOpen: !systemControls.isRegistrationOpen})}
                        className={`px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg w-full flex items-center justify-center gap-2 ${systemControls.isRegistrationOpen ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                      >
                        {systemControls.isRegistrationOpen ? <CheckCircle2 size={18}/> : <X size={18}/>}
                        {systemControls.isRegistrationOpen ? 'تسجيل المشتركين مفتوح' : 'مغلق الآن'}
                      </button>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                      <div className="mb-4">
                        <h5 className="text-lg font-black text-slate-800 flex items-center gap-2"><Calculator size={20} className="text-primary"/> طلبات الكتب</h5>
                        <p className="text-sm text-slate-500 font-bold mt-1">السماح للكنائس بإضافة أو تعديل طلبات الكتب والحاسبة</p>
                      </div>
                      <button 
                        onClick={() => handleUpdateSystemControls({...systemControls, isBookCalculatorOpen: !systemControls.isBookCalculatorOpen})}
                        className={`px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg w-full flex items-center justify-center gap-2 ${systemControls.isBookCalculatorOpen ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                      >
                        {systemControls.isBookCalculatorOpen ? <CheckCircle2 size={18}/> : <X size={18}/>}
                        {systemControls.isBookCalculatorOpen ? 'حاسبة الكتب مفتوحة' : 'مغلقة الآن'}
                      </button>
                    </div>
                  </div>

                  <h4 className="text-2xl font-black text-slate-800 flex items-center gap-3 mb-8 mt-12 border-t pt-8 border-slate-100">
                    <BookOpen className="text-primary" /> لوحة التحكم المركزية للامتحانات
                  </h4>

                  {/* Global Switch */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between mb-8">
                    <div>
                      <h5 className="text-lg font-black text-slate-800">حالة الامتحانات (عام)</h5>
                      <p className="text-sm text-slate-500 font-bold">فتح أو غلق بوابة الامتحانات الإلكترونية لجميع الطلاب بقرار مركزي</p>
                    </div>
                    <button 
                      onClick={() => handleUpdateExamConfig({...examConfig, isExamLive: !examConfig.isExamLive})}
                      className={`px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg min-w-[140px] flex items-center justify-center gap-2 ${examConfig.isExamLive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
                    >
                      {examConfig.isExamLive ? <CheckCircle2 size={18}/> : <X size={18}/>}
                      {examConfig.isExamLive ? 'مفتوح الآن' : 'مغلق الآن'}
                    </button>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-6 mb-8">
                    <div className="flex-1">
                      <h5 className="text-sm font-black text-slate-800 mb-1">موعد الإغلاق التلقائي</h5>
                      <p className="text-[10px] text-slate-400 font-bold">سيتم غلق الامتحانات لجميع الطلاب عند الوصول لهذا الوقت</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="time"
                        value={examConfig.autoCloseTime || ''}
                        onChange={(e) => handleUpdateExamConfig({...examConfig, autoCloseTime: e.target.value})}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                      />
                      {examConfig.autoCloseTime && (
                        <button 
                          onClick={() => handleUpdateExamConfig({...examConfig, autoCloseTime: deleteField() as any})}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="إزالة الموعد"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Church Overrides */}
                    <div className="space-y-4">
                      <h5 className="font-black text-slate-700 flex items-center gap-2">
                        <Church size={18} className="text-primary"/> تحكم حسب الكنيسة
                      </h5>
                      <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-2 no-scrollbar">
                        {CHURCH_CREDENTIALS.map(c => c.churchName).sort().map(church => (
                          <div key={church} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <span className="font-bold text-sm text-slate-700">{church}</span>
                            <button 
                              onClick={() => {
                                const overrides = {...(examConfig.churchOverrides || {})};
                                overrides[church] = overrides[church] === false ? true : false;
                                handleUpdateExamConfig({...examConfig, churchOverrides: overrides});
                              }}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-colors ${examConfig.churchOverrides?.[church] === false ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                            >
                              {examConfig.churchOverrides?.[church] === false ? 'مغلق' : 'نمط العام'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stage Overrides */}
                    <div className="space-y-4">
                       <h5 className="font-black text-slate-700 flex items-center gap-2">
                        <Users size={18} className="text-primary"/> تحكم حسب المرحلة
                      </h5>
                      <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-2 no-scrollbar">
                        {STAGE_ORDER.map(stage => (
                          <div key={stage} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                            <span className="font-bold text-sm text-slate-700">{stage}</span>
                            <button 
                              onClick={() => {
                                const overrides = {...(examConfig.stageOverrides || {})};
                                overrides[stage] = overrides[stage] === false ? true : false;
                                handleUpdateExamConfig({...examConfig, stageOverrides: overrides});
                              }}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black transition-colors ${examConfig.stageOverrides?.[stage] === false ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
                            >
                              {examConfig.stageOverrides?.[stage] === false ? 'مغلق' : 'نمط العام'}
                            </button>
                          </div>
                        ))}
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
              <div className="space-y-16 mt-16 font-arabic">
                
                <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-200">
                  <div>
                    <h2 className="text-xl font-black text-slate-800">اللوحة التحليلية الشاملة</h2>
                    <p className="text-sm text-slate-500 font-bold mt-1">مؤشرات إحصائية ورسوم بيانية لبيانات التسجيل والحاسبة</p>
                  </div>
                  <button onClick={exportComprehensivePDF} disabled={isExportingPDF} className={`px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg transition-all text-sm flex items-center gap-2 ${isExportingPDF ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'}`}>
                    {isExportingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isExportingPDF ? 'جاري التحضير...' : 'تصدير التقرير التحليلي (PDF)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
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
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
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
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2">
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
                    
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                  </div>
                </div>

                {/* Advanced Data Aggregation for Printing Statement */}
                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FileText className="text-primary" /> بيان طباعة الامتحانات 
                      </h4>
                      <p className="text-xs text-slate-500 font-bold mt-1">حصر أعداد النسخ المطلوب طباعتها لكل مسابقة (يتم حساب النسخ تفصيلياً للمشترك)</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <button 
                        onClick={exportPrintingStatementExcel}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-100 transition-colors shadow-sm"
                      >
                        <Download size={14} /> تحميل بيان الطباعة (Excel)
                      </button>
                      <button 
                        onClick={exportPrintingStatementPDF}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-100 transition-colors shadow-sm"
                      >
                        <FileText size={14} /> بيان الطباعة (PDF)
                      </button>
                      <button 
                        onClick={exportPrintingStatementPDF}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-200 transition-colors shadow-sm border border-slate-200"
                        title="طباعة بيان الامتحانات الكلي"
                      >
                        <Printer size={14} /> طباعة (بيان كلي)
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 font-black text-slate-500 uppercase border-b border-slate-200">
                          <th rowSpan={2} className="p-3 border-l border-slate-200 align-middle">الكنيسة</th>
                          <th rowSpan={2} className="p-3 border-l border-slate-200 text-center align-middle">المشتركين</th>
                          {STAGE_ORDER.map(stg => {
                            const subCols = activeStagesCols[stg];
                            if (subCols.length === 0) return null;
                            return (
                              <th key={stg} colSpan={subCols.length} className="p-2 border-l border-b border-slate-200 text-center text-[10px] bg-slate-100/50">
                                {stg}
                              </th>
                            );
                          })}
                        </tr>
                        <tr className="bg-slate-50 font-black text-slate-500 border-b border-slate-200">
                          {STAGE_ORDER.map(stg => {
                            const subCols = activeStagesCols[stg];
                            return subCols.map(col => (
                              <th key={`${stg}-${col}`} className="p-2 border-l border-slate-200 text-center text-[9px]">
                                {col === 'darasi' ? 'دراسي' : col === 'mahfouthat' ? 'مح' : col === 'coptic1' ? 'ق1' : 'ق2'}
                              </th>
                            ));
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(aggregatedChurchPrintingData || [])
                          .slice((printingPage - 1) * 20, printingPage * 20)
                          .map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold text-slate-800 border-l border-slate-100 whitespace-nowrap">{row.church}</td>
                            <td className="p-3 font-black text-slate-800 text-center border-l border-slate-100 bg-slate-50/50">{row.totalSubscribers}</td>
                            
                            {STAGE_ORDER.map(stg => {
                              const subCols = activeStagesCols[stg];
                              const stgData = row.stages[stg];
                              return subCols.map(col => (
                                <td key={`${stg}-${col}`} className={`p-2 font-bold text-center border-l border-slate-100 ${stgData && stgData[col] > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                  {stgData ? stgData[col] : 0}
                                </td>
                              ));
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
                          
                          {STAGE_ORDER.map(stg => {
                            const subCols = activeStagesCols[stg];
                            const stgData = aggregatedChurchPrintingTotals.stages[stg];
                            return subCols.map(col => (
                              <td key={`${stg}-${col}`} className="p-2 font-black text-slate-800 text-center border-l border-slate-200">
                                {stgData ? stgData[col] : 0}
                              </td>
                            ));
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
                          <p className="text-5xl font-black text-slate-900">{totalParticipantsCount}</p>
                        </div>
                        <div className="border border-slate-200 rounded-3xl p-8 bg-slate-50">
                          <p className="text-slate-500 font-bold mb-2">إجمالي طلبات الكتب</p>
                          <p className="text-5xl font-black text-slate-900">{totalOrdersCount}</p>
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
                  
                  <div id="printing-statement-table" className="p-10 bg-white text-slate-900 font-arabic leading-relaxed" dir="rtl" style={{ width: '297mm' }}>
                    <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
                      #printing-statement-table, .font-arabic { font-family: 'Tajawal', sans-serif !important; }
                      #printing-statement-table * { font-family: 'Tajawal', sans-serif !important; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                      th { background-color: #f8fafc; font-weight: 900; color: #0f172a; border: 1px solid #cbd5e1; }
                      td, th { padding: 12px 8px !important; line-height: 1.8 !important; border: 1px solid #cbd5e1; text-align: center; font-weight: 800; }
                      .text-right-col { text-align: right !important; }
                      .text-primary { color: #0F172A; }
                      .summary-row { background-color: #f1f5f9; font-weight: 900; }
                    `}</style>
                    <div className="flex justify-between items-start border-b-4 border-coptic-blue pb-6 mb-8">
                      <div className="flex items-center gap-4">
                        <img src={logoBase64 || getValidLogoUrl((siteSettings as any)?.logoUrl, logo)} alt="Logo" className="w-12 h-12 object-contain" crossOrigin="anonymous" />
                        <div>
                          <h1 className="text-xl font-black text-primary">بيان طباعة مسابقات الأفراد</h1>
                          <p className="text-xs font-bold text-slate-500 mt-1">
                            {userRole === 'admin' && globalChurchFilter === 'الكل' ? 'مهرجان الكرازة المرقسية - كل الكنائس' : `مهرجان الكرازة المرقسية - ${churchName}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">تاريخ الإصدار</p>
                        <p className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>

                    <table style={{ fontSize: '10px' }}>
                      <thead>
                        <tr>
                          <th rowSpan={2} className="text-right-col" style={{ verticalAlign: 'middle' }}>الكنيسة</th>
                          <th rowSpan={2} style={{ verticalAlign: 'middle' }}>المشتركين</th>
                          {STAGE_ORDER.map(stg => {
                            const subCols = activeStagesCols[stg];
                            if (subCols.length === 0) return null;
                            return (
                              <th key={stg} colSpan={subCols.length} style={{ borderBottom: '1px solid #cbd5e1', fontSize: '9px', backgroundColor: '#f8fafc' }}>
                                {stg}
                              </th>
                            );
                          })}
                        </tr>
                        <tr>
                          {STAGE_ORDER.map(stg => {
                            const subCols = activeStagesCols[stg];
                            return subCols.map(col => (
                              <th key={`${stg}-${col}`} style={{ fontSize: '8px' }}>
                                {col === 'darasi' ? 'در' : col === 'mahfouthat' ? 'مح' : col === 'coptic1' ? 'ق1' : 'ق2'}
                              </th>
                            ));
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedChurchPrintingData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="text-right-col font-bold" style={{ whiteSpace: 'nowrap' }}>{row.church}</td>
                            <td className="font-black bg-slate-50">{row.totalSubscribers}</td>
                            
                            {STAGE_ORDER.map(stg => {
                              const subCols = activeStagesCols[stg];
                              const stgData = row.stages[stg];
                              return subCols.map(col => (
                                <td key={`${stg}-${col}`} style={{ color: stgData && stgData[col] > 0 ? '#334155' : '#cbd5e1' }}>
                                  {stgData ? stgData[col] : 0}
                                </td>
                              ));
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="summary-row">
                          <td className="text-right-col">الإجمالي العام</td>
                          <td className="font-black bg-slate-200">{aggregatedChurchPrintingTotals.subscribers}</td>
                          
                          {STAGE_ORDER.map(stg => {
                            const subCols = activeStagesCols[stg];
                            const stgData = aggregatedChurchPrintingTotals.stages[stg];
                            return subCols.map(col => (
                              <td key={`${stg}-${col}`} className="font-black">
                                {stgData ? stgData[col] : 0}
                              </td>
                            ));
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
                      <input 
                        type="text" 
                        placeholder="البحث بالاسم أو الرقم القومي..." 
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                        className="p-2 border border-slate-200 rounded-xl text-xs font-bold w-48"
                      />
                      <button 
                        onClick={() => fetchParticipantsPage(true, true, participantSearch)}
                        disabled={isParticipantsLoading}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition flex items-center gap-2"
                      >
                         <RotateCw size={14} className={isParticipantsLoading ? 'animate-spin' : ''} /> تحديث
                      </button>
                      <button 
                        onClick={() => exportToExcel(participants, 'participants')}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                      >
                        <Download size={14} /> Excel
                      </button>
                      <button 
                        onClick={exportParticipantsPDF}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-100 transition-colors"
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto" id="participants-table-admin">
                    <div className="p-4 mb-4 bg-white border-b-4 border-coptic-blue relative">
                      <div className="absolute top-4 right-4 flex items-center justify-center">
                        <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-12 h-12 object-contain" />
                      </div>
                      <h2 className="text-3xl font-black text-coptic-blue text-center mb-1">تقارير التقييم والمشتركين</h2>
                      <p className="text-coptic-gold font-black uppercase tracking-widest text-xs text-center">مهرجان الكرازة {activeYear}</p>
                      <p className="text-[10px] text-slate-400 mt-2 text-center">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4">الكنيسة</th>
                          <th className="p-4">الاسم</th>
                          <th className="p-4">المرحلة</th>
                          <th className="p-4">المسابقات</th>
                          <th className="p-4">التاريخ</th>
                          <th className="p-4 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {participants
                          .map(p => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-coptic-blue">{p.churchName}</td>
                            <td className="p-4 text-slate-800 font-bold">{p.name}</td>
                            <td className="p-4 text-slate-600 font-bold">{p.stage}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {(p.competitions || []).map((c, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full whitespace-nowrap">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-[10px] text-slate-400">{p.timestamp}</td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleEditParticipant(p)}
                                  className="p-2 text-slate-400 hover:text-coptic-blue transition-colors"
                                  title="تعديل"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setParticipantToDelete(p.id);
                                    setShowDeleteModal(true);
                                  }}
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

                  <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl border border-slate-100 italic text-slate-400">
                    <div className="flex items-center gap-4">
                      <button 
                         disabled={participantPageCount === 1 || isParticipantsLoading}
                         onClick={() => {
                            const prevPage = participantPageCount - 1;
                            setParticipantPageCount(prevPage);
                         }}
                         className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-30 transition-all font-black text-slate-600"
                      >
                         <ChevronRight size={20} />
                      </button>
                      <span className="font-black text-slate-800 not-italic text-sm">صفحة {participantPageCount}</span>
                      <button 
                         disabled={participantPageCount * 20 >= participants.length || isParticipantsLoading}
                         onClick={() => setParticipantPageCount(prev => prev + 1)}
                         className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-30 transition-all font-black text-slate-600"
                      >
                         <ChevronLeft size={20} />
                      </button>
                    </div>
                    {isParticipantsLoading && (
                      <div className="flex items-center gap-2 text-coptic-blue font-black animate-pulse text-xs">
                         <Loader2 className="animate-spin" size={14} /> جاري التحميل...
                      </div>
                    )}
                    {!isParticipantsLoading && <span className="text-[10px]">عرض ٢٠ مشترك في الصفحة</span>}
                  </div>
                </section>

                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Users className="text-coptic-gold" /> فرق الأنشطة المسجلة ({totalTeamsCount})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => exportToExcel(filteredTeamsList, 'activity_teams')}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                      >
                        <Download size={14} /> Excel
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4">الكنيسة</th>
                          <th className="p-4">النشاط</th>
                          <th className="p-4">المستوى/الآلة</th>
                          <th className="p-4">الأعضاء</th>
                          <th className="p-4">ذكور/إناث</th>
                          <th className="p-4">التاريخ</th>
                          <th className="p-4 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTeamsList
                          .map(t => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-coptic-blue">{t.churchName}</td>
                            <td className="p-4 text-slate-800 font-bold">{t.activityType}</td>
                            <td className="p-4 text-slate-600 font-bold">{t.choirLevel || t.instrumentType || '-'}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {t.members.map((m, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-full whitespace-nowrap">
                                    {m.name} ({m.gender})
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2 text-[10px] font-black">
                                <span className="text-coptic-blue">♂ {t.maleCount}</span>
                                <span className="text-coptic-red">♀ {t.femaleCount}</span>
                              </div>
                            </td>
                            <td className="p-4 text-[10px] text-slate-400">{t.timestamp}</td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleEditTeam(t)}
                                  className="p-2 text-slate-400 hover:text-coptic-blue transition-colors"
                                  title="تعديل"
                                >
                                  <FileText size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTeam(t.id)}
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
                      <MessageSquare className="text-coptic-blue" /> الاستفسارات والشكاوي ({(inquiries || []).filter(inq => !inq.reply).length} معلقة)
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => exportToExcel((inquiries || []).filter(inq => adminFilterChurch === 'الكل' || inq.churchName === adminFilterChurch), 'inquiries')}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                      >
                        <Download size={14} /> Excel
                      </button>
                      <button 
                        onClick={exportInquiriesPDF}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-red-100 transition-colors"
                      >
                        <FileText size={14} /> PDF
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="inquiries-list-admin">
                    <div className="col-span-full p-4 mb-4 bg-white border-b-4 border-coptic-blue relative">
                      <div className="absolute top-4 right-4 flex items-center justify-center">
                        <img src={getValidLogoUrl(null, appLogo)} onError={(e) => { e.currentTarget.src = logo; }} alt="Logo" className="w-12 h-12 object-contain" />
                      </div>
                      <h2 className="text-3xl font-black text-coptic-blue text-center mb-1">تقرير الاستفسارات</h2>
                      <p className="text-coptic-gold font-black uppercase tracking-widest text-xs text-center">مهرجان الكرازة {activeYear}</p>
                      <p className="text-[10px] text-slate-400 mt-2 text-center">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    {(inquiries || [])
                      .filter(inq => adminFilterChurch === 'الكل' || inq.churchName === adminFilterChurch)
                      .map(inq => (
                      <div key={inq.id} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-coptic-blue/10 text-coptic-blue text-[10px] font-black rounded-full">{inq.churchName}</span>
                            <button 
                              onClick={() => handleDeleteInquiry(inq.id)}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400">{inq.timestamp}</span>
                        </div>
                        <p className="text-slate-700 font-bold mb-4">{inq.message}</p>
                        
                        {inq.reply ? (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs font-black text-slate-400 mb-1">ردك:</p>
                            <p className="text-sm text-slate-600 italic">{inq.reply}</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea 
                              placeholder="اكتب ردك هنا..."
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAdminReply(inq.id, (e.target as HTMLTextAreaElement).value);
                                }
                              }}
                            />
                            <p className="text-[10px] text-slate-400">اضغط Enter للإرسال</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section id="results-management-section" className="pt-12 border-t border-slate-100">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                    <Award className="text-indigo-600" /> إدارة النتائج
                  </h4>
                  
                  <form onSubmit={handleResultSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <h5 className="font-black text-slate-700 mb-4">{editingResult ? 'تعديل نتيجة' : 'إضافة نتيجة يدوياً'}</h5>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">اسم الطالب</label>
                      <input 
                        type="text"
                        value={newResult.studentName}
                        onChange={e => setNewResult({...newResult, studentName: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">الكنيسة</label>
                      <select 
                        value={newResult.churchName}
                        onChange={e => setNewResult({...newResult, churchName: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                        required
                      >
                        <option value="">اختر الكنيسة</option>
                        {Array.from(new Set(publicChurches.map((c: any) => c.name))).sort().map(church => (
                          <option key={church} value={church}>{church}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">المرحلة</label>
                      <select 
                        value={newResult.stage}
                        onChange={e => setNewResult({...newResult, stage: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                        required
                      >
                        <option value="">اختر المرحلة</option>
                        {OFFICIAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">الدرجة</label>
                      <input 
                        type="number"
                        value={newResult.score}
                        onChange={e => setNewResult({...newResult, score: Number(e.target.value)})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">التقدير</label>
                      <select 
                        value={newResult.grade}
                        onChange={e => setNewResult({...newResult, grade: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                        required
                      >
                        <option value="">اختر التقدير</option>
                        {['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'دون المستوى'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end gap-2">
                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-black hover:bg-opacity-90 transition-all"
                      >
                        {editingResult ? 'تحديث' : 'إضافة'}
                      </button>
                      {editingResult && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingResult(null);
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
                          }}
                          className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl font-black"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-8">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                          <h5 className="font-black text-slate-700">تحديث واستخراج النتائج الموحدة (Live Schema)</h5>
                          <p className="text-xs text-slate-400 font-bold mb-2">يرجى تحميل القالب المعتمد ورفع النتائج من خلاله ليتم مطابقتها ديناميكياً.</p>
                          <button type="button" onClick={() => downloadMasterTemplate()} className="text-indigo-600 text-xs font-bold hover:underline">
                            تحميل قالب النتائج المعتمد (Master Template)
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            type="button"
                            onClick={() => { generateMasterExcel(churchName); }}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                          >
                            <Download size={20} /> التصدير الشامل (Excel)
                          </button>
                          <button 
                            type="button"
                            onClick={handleClearResults}
                            className="px-6 py-3 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black flex items-center gap-2 hover:bg-red-100 transition-all shadow-sm"
                          >
                            <Trash2 size={20} /> مسح النتائج
                          </button>
                          <label className="cursor-pointer px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg">
                            <Upload size={20} /> رفع الملف
                            <input 
                              type="file" 
                              accept=".xlsx, .xls" 
                              className="hidden" 
                              onChange={handleResultsUpload}
                            />
                          </label>
                        </div>
                      </div>
                   </div>

                   <ResultsViewer 
                     results={filteredResults} 
                     onReset={handleResetExam}
                     isAdmin={userRole === 'admin'}
                   />
                 </section>

                <section className="pt-12 border-t border-slate-100">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                    <Link2 className="text-coptic-blue" /> إدارة لينكات الامتحانات (Google Forms)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {([...OFFICIAL_STAGES].sort((a: any, b: any) => sortStages(a, b))).map((stage) => (
                      <div key={stage} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition-all space-y-3">
                        <label className="text-[11px] font-black text-slate-500 uppercase">{stage}</label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="https://docs.google.com/forms/..."
                            value={examLinks[stage] || ''}
                            onChange={(e) => setExamLinks({ ...examLinks, [stage]: e.target.value })}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue"
                          />
                          <button 
                            onClick={() => handleUpdateExamLink(stage, examLinks[stage] || '')}
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
            </div>
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
                  <p className="text-slate-600 font-bold">أنت الآن بصفة مسئول، يمكنك الرد على الاستفسارات من لوحة التحكم.</p>
                  <button 
                    onClick={() => setActiveSection('admin_dashboard')}
                    className="mt-4 px-6 py-2 bg-coptic-blue text-white rounded-xl font-bold"
                  >
                    انتقل للوحة التحكم
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
                      [مغلقة حالياً من قبل الإدارة المركزية]
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
                    لا توجد كتب مضافة حالياً
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
                      <p className="text-coptic-gold font-bold uppercase tracking-widest text-sm">فاتورة طلب كتب رسمية - نسخة إدارية</p>
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
                    <p className="text-xs text-slate-400 uppercase font-bold mb-8">توقيع أمين الصندوق</p>
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

              <div className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                      <UserPlus size={28} className="text-primary" /> تسجيل مشترك جديد
                      {userRole === 'admin' && (
                        <button onClick={bulkInsertParticipants} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-black hover:bg-purple-700">
                          حقن بيانات 20 مشترك (خاص)
                        </button>
                      )}
                    </h4>
                    <p className="text-slate-500 text-sm font-bold">يرجى ملء البيانات التالية بدقة</p>
                  </div>

                {!systemControls.isRegistrationOpen ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-2">
                      <UserPlus size={32} className="text-rose-600" />
                    </div>
                    <h4 className="text-2xl font-black text-rose-700">التسجيل مغلق مؤقتاً وسيعود للعمل صباحاً</h4>
                    <p className="text-slate-500 font-bold max-w-md">نعتذر، لقد تم انتهاء وقت التسجيل المحدد لكافة الكنائس من قبل الإدارة المركزية.</p>
                  </div>
                ) : (
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
                          اسم المخدوم ثلاثياً
                        </label>
                        <input 
                          type="text" 
                          placeholder="أدخل الاسم الثلاثي"
                          value={newParticipant.name}
                          onChange={e => setNewParticipant({...newParticipant, name: e.target.value})}
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
                          {OFFICIAL_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
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
                        {/* Hidden required input for standard browser validation */}
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
                        const isCopticLevel2Allowed = ['خامسة وسادسة', 'إعدادي', 'ثانوي', 'جامعة', 'خريجون', 'خدام وإعداد الخدام', 'قانا الجليل', 'تعليم كبار', 'سمعان الشيخ', 'حرفيون', 'صم وبكم', 'قدرات خاصة', 'ديديموس', 'بولس وسيلا'].includes(newParticipant.stage);
                        const selectedComps = newParticipant.competitions;
                        
                        const isOptionDisabled = (val: string) => {
                          if (!val) return false;
                          if (selectedComps.some((c, i) => i !== idx && c === val)) return true;
                          if (val.includes('قبطي مستوى') && selectedComps.some((c, i) => i !== idx && c.includes('قبطي مستوى'))) return true;
                          
                          // Level logic for Coptic Level 2 vs Level 1
                          if (val === 'قبطي مستوى ثان' && !isCopticLevel2Allowed) return true;
                          if (val === 'قبطي مستوى أول' && isCopticLevel2Allowed && !['حضانة', 'أولى وثانية', 'ثالثة ورابعة'].includes(newParticipant.stage)) return true;
                          
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
                              {OFFICIAL_COMPETITIONS.map((comp: string) => (
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
              )}

                {/* Registered Participants List */}
                <div className="pt-12 border-t border-slate-100 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users size={24} className="text-primary" />
                      <h4 className="font-black text-xl text-slate-800">المشتركين المسجلين</h4>
                    </div>
                    <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-black">
                      إجمالي: {totalParticipantsCount}
                    </span>
                  </div>

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
                              onClick={() => {
                                setActiveSection('registration');
                                handleEditParticipant(p);
                              }}
                              className="p-2 text-slate-400 hover:text-coptic-blue transition-colors"
                              title="تعديل (تحرير)"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setParticipantToDelete(p.id);
                                setShowDeleteModal(true);
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
                        {!systemControls.isRegistrationOpen && (
                          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                            <span className="bg-rose-100 text-rose-700 px-6 py-2 rounded-full font-black text-sm border border-rose-200 shadow-sm animate-pulse">
                              التسجيل مغلق مؤقتاً وسيعود للعمل صباحاً
                            </span>
                          </div>
                        )}
                        <form id="team-registration-form" onSubmit={handleAddTeam} className={`bg-white p-8 rounded-xl shadow-sm border border-slate-100 space-y-8 ${!systemControls.isRegistrationOpen ? 'opacity-50 pointer-events-none' : ''}`}>
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
                              }}
                              className="text-xs font-black text-blue-500 hover:underline"
                            >
                              إلغاء التعديل
                            </button>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">نوع النشاط</label>
                          <select 
                            value={newTeam.activityType || ''}
                            onChange={e => setNewTeam({...newTeam, activityType: e.target.value})}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                            required
                          >
                            <option value="">-- اختر النشاط --</option>
                            <option value="كورال">كورال</option>
                            <option value="ألحان">ألحان</option>
                            <option value="عزف">عزف</option>
                            <option value="ترنيم فردي">ترنيم فردي</option>
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
                                  <option key={stage.id} value={stage.name}>{stage.name}</option>
                                ))
                              ) : (
                                activityStages.map((stage: any) => (
                                  <option key={stage.id} value={stage.name}>{stage.name}</option>
                                ))
                              )}
                            </select>
                          </div>
                        )}

                        {newTeam.activityType === 'عزف' && (
                          <>
                            <div className="space-y-2 mb-4">
                              <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">نوع الأداء</label>
                              <select 
                                value={newTeam.performanceType || ''}
                                onChange={e => setNewTeam({...newTeam, performanceType: e.target.value})}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                                required
                              >
                                <option value="">-- اختر نوع الأداء --</option>
                                <option value="عزف فردي">عزف فردي (Individual Performance)</option>
                                <option value="عزف جماعي">عزف جماعي (Group Performance)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">الآلة الموسيقية</label>
                              <input 
                                type="text"
                                placeholder="أدخل نوع الآلة"
                                value={newTeam.instrumentType || ''}
                                onChange={e => setNewTeam({...newTeam, instrumentType: e.target.value})}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                                required
                              />
                            </div>
                          </>
                        )}

                        {newTeam.activityType === 'كورال' || newTeam.activityType === 'ألحان' ? (
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
                        ) : newTeam.activityType && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <h5 className="text-sm font-black text-slate-800">بيانات المشترك</h5>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveActivityPath('existing')}
                                  className={`px-3 py-1 text-xs font-black rounded-full ${activeActivityPath === 'existing' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}
                                >
                                  مشترك مسجل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveActivityPath('new')}
                                  className={`px-3 py-1 text-xs font-black rounded-full ${activeActivityPath === 'new' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}
                                >
                                  مشترك جديد
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {activeActivityPath === 'existing' ? (
                                <div className="md:col-span-12 space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">الاسم (بحث في المشتركين المسجلين)</label>
                                  <div className="relative">
                                    <input 
                                      type="text"
                                      list={`activityParticipantsList`}
                                      placeholder="أدخل اسم المشترك للبحث..."
                                      value={activitySearchTerm}
                                      onChange={e => debouncedActivitySearch(e.target.value)}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary font-bold"
                                    />
                                    <datalist id={`activityParticipantsList`}>
                                      {participants
                                        .filter(p => p.churchName === churchName)
                                        .map((p, pIdx) => (
                                        <option key={pIdx} value={p.name}>{p.stage} - {p.churchName}</option>
                                      ))}
                                    </datalist>
                                    {activityLinkSuccess && (
                                      <p className="text-xs text-green-600 font-bold mt-2">{activityLinkSuccess}</p>
                                    )}
                                    {newTeam.members?.[0]?.name && !activityLinkSuccess && activitySearchTerm && (
                                      <p className="text-xs text-primary font-bold mt-2">محدد: {newTeam.members[0].name} ({newTeam.members[0].stage})</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="md:col-span-6 space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">الاسم</label>
                                    <input 
                                      type="text"
                                      placeholder="الاسم الثلاثي"
                                      value={newTeam.members?.[0]?.name || ''}
                                      onChange={e => {
                                        const updated = [...(newTeam.members || [{ name: '', gender: 'ذكر', stage: '' }])];
                                        updated[0].name = e.target.value;
                                        setNewTeam({...newTeam, members: updated});
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary font-bold"
                                      required
                                    />
                                  </div>
                                  <div className="md:col-span-3 space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">النوع</label>
                                    <select 
                                      value={newTeam.members?.[0]?.gender || 'ذكر'}
                                      onChange={e => {
                                        const updated = [...(newTeam.members || [{ name: '', gender: 'ذكر', stage: '' }])];
                                        updated[0].gender = e.target.value as 'ذكر' | 'أنثى';
                                        setNewTeam({...newTeam, members: updated});
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary font-bold"
                                      required
                                    >
                                      <option value="ذكر">ذكر</option>
                                      <option value="أنثى">أنثى</option>
                                    </select>
                                  </div>
                                  <div className="md:col-span-3 space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase">المرحلة</label>
                                    <select 
                                      value={newTeam.members?.[0]?.stage || ''}
                                      onChange={e => {
                                        const updated = [...(newTeam.members || [{ name: '', gender: 'ذكر', stage: '' }])];
                                        updated[0].stage = e.target.value;
                                        setNewTeam({...newTeam, members: updated});
                                      }}
                                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary font-bold"
                                      required
                                    >
                                      <option value="">المرحلة</option>
                                      {activityStages.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

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
                            {userRole === 'admin' && (
                              <button 
                                onClick={() => handleDeleteTeam(t.id)}
                                className="absolute left-4 top-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            
                            <div className="mb-4">
                              <h5 className="text-lg font-black text-slate-800">{t.activityType}</h5>
                              {t.choirLevel && <p className="text-xs font-bold text-primary mt-1">{t.choirLevel}</p>}
                              {t.performanceType && <p className="text-xs font-bold text-emerald-600 mt-1">{t.performanceType}</p>}
                              {t.instrumentType && <p className="text-xs font-bold text-primary mt-1">{t.instrumentType}</p>}
                            </div>

                            <div className="space-y-3">
                              {t.activityType === 'كورال' || t.activityType === 'ألحان' ? null : (
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
                              {t.activityType === 'كورال' || t.activityType === 'ألحان' ? (
                                <div className="flex gap-4">
                                  <span className="text-[10px] font-black text-primary">ذكور: {t.maleCount || 0}</span>
                                  <span className="text-[10px] font-black text-primary">إناث: {t.femaleCount || 0}</span>
                                  <span className="text-[10px] font-black text-slate-500">إجمالي: {(t.maleCount || 0) + (t.femaleCount || 0)}</span>
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
              </div>
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
              <li><button onClick={() => setShowExamGateway(true)} className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> امتحانات الأونلاين</button></li>
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
      <DuplicateScanModal />
      <DeleteScheduleModal />
      <DeleteCalculatorModal />
      <OrderDetailsModal />

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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
        {showExamGateway && (
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
              <div className="absolute inset-0 overflow-y-auto p-4 md:p-8 flex items-center justify-center">
                 <div className="w-full max-w-4xl">
                   <LiveExamGateway />
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
