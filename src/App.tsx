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
  ShoppingCart,
  FileScan
} from 'lucide-react';
import QuickActionsHub from './components/QuickActionsHub';
import Notification from './components/Notification';
import OmrGenerator from './components/OmrGenerator';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore - html2pdf.js doesn't have great types but works
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
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
  deleteDoc,
  writeBatch,
  handleFirestoreError,
  OperationType,
  orderBy,
  limit,
  CURRENT_YEAR
} from './firebase';
import ErrorBoundary from './components/ErrorBoundary';

import ChurchSettings from './components/ChurchSettings';
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
  } from './constants';

import { exportFullDioceseReport, exportChurchReport, exportParticipantsReport, exportAllDataReport, exportResultsToExcel } from './services/excelService';
import DynamicAdminSettings from './components/DynamicAdminSettings';
// @ts-ignore
import logo from './by-logo.jpeg';

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
          content: ''
        }))
      : news.filter(n => n.imageUrl).map(n => ({
          id: n.id,
          title: n.title,
          subtitle: 'خبر جديد',
          image: n.imageUrl,
          content: n.content
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
      <div className="relative h-[400px] md:h-[600px] w-full overflow-hidden rounded-[2rem] shadow-2xl mb-12 group border-4 border-white/10">
        <div className="absolute inset-0">
          <img 
            src="https://picsum.photos/seed/festival/1920/1080" 
            alt="Welcome" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-center text-center p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="max-w-3xl"
            >
              <h1 className="text-4xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl tracking-tighter">
                مرحباً بكم في <span className="text-[#D4AF37]">مهرجان ٢٠٢٦</span>
              </h1>
              <p className="text-xl md:text-3xl text-slate-200 font-bold drop-shadow-lg opacity-80">
                إيبارشية مغاغة والعدوة - "يعظم انتصارنا بالذي أحبنا"
              </p>
            </motion.div>
          </div>
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

function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dynamicLevels, setDynamicLevels] = useState<any[]>([]);

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [churchName, setChurchName] = useState('');
  const [location, setLocation] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'church' | 'guest'>('guest');
  const [notification, setNotification] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState(CURRENT_YEAR);
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [isUpdatingYear, setIsUpdatingYear] = useState(false);
  const [isSubmittingResult, setIsSubmittingResult] = useState(false);

  useEffect(() => {
    const unsubAppConfig = onSnapshot(doc(db, 'settings', 'app_config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setActiveYear(data.activeYear || CURRENT_YEAR);
        setAppLogo(data.appLogo || null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/app_config'));

    const fetchDynamicData = async () => {
      try {
        const churchesSnap = await getDocs(collection(db, 'churches'));
        setPublicChurches(churchesSnap.docs.map(d => ({ name: d.data().name, email: '' })));
        
        const levelsSnap = await getDocs(collection(db, 'levels'));
        if (!levelsSnap.empty) {
          const fetchedLevels = levelsSnap.docs.map(d => ({ 
            name: d.data().name, 
            comps: d.data().allowedCompetitions || [] 
          }));
          setDynamicLevels(fetchedLevels);
        }
      } catch (error) {
        console.error("Error fetching dynamic data:", error);
      }
    };
    fetchDynamicData();

    return () => unsubAppConfig();
  }, []);

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
  const [loginChurch, setLoginChurch] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [adminFilterChurch, setAdminFilterChurch] = useState('الكل');
  const [selectedChurchUserId, setSelectedChurchUserId] = useState<string | null>(null);
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  const [newsSearch, setNewsSearch] = useState('');
  const [newsFilterDate, setNewsFilterDate] = useState('');
  const [resultsFilterStage, setResultsFilterStage] = useState('الكل');
  const [resultsFilterGrade, setResultsFilterGrade] = useState('الكل');
  const [resultsSortOrder, setResultsSortOrder] = useState<'rank' | 'default'>('default');
  const [participantSearch, setParticipantSearch] = useState('');
  const [calculatorSettings, setCalculatorSettings] = useState<any[]>([]);
  const [isCalculatorLoading, setIsCalculatorLoading] = useState(true);
  const [isSubmittingCalculator, setIsSubmittingCalculator] = useState(false);
  const [newCalculatorSetting, setNewCalculatorSetting] = useState({ stage: '', material: '', price: 0 });
  const [showDeleteCalculatorModal, setShowDeleteCalculatorModal] = useState(false);
  const [calculatorSettingToDelete, setCalculatorSettingToDelete] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [showDeleteScheduleModal, setShowDeleteScheduleModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activityTeams, setActivityTeams] = useState<ActivityTeam[]>([]);
  const [examLinks, setExamLinks] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [carouselItems, setCarouselItems] = useState<CarouselItem[]>([]);
  const [publicChurches, setPublicChurches] = useState<{name: string, email: string}[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<{src: string}[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    phone: '0123456789',
    facebook: 'https://facebook.com',
    telegram: 'https://t.me',
    copyright: 'جميع الحقوق محفوظة © مهرجان الكرازة المرقسية منطقة 18 - 2026'
  });
  const [aboutContent, setAboutContent] = useState<AboutContent>({
    vision: 'رؤية المهرجان...',
    mission: 'هدف المهرجان...',
    aboutText: 'عن المهرجان...'
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
    country: '',
    competitions: ['', '', '', ''] 
  });
  const [registrationStep, setRegistrationStep] = useState(1);
  const [newTeam, setNewTeam] = useState<Partial<ActivityTeam>>({
    activityType: '',
    members: [{ name: '', gender: 'ذكر', stage: '' }],
    choirLevel: '',
    instrumentType: ''
  });
  const [resultSearch, setResultSearch] = useState('');
  const [dashboardBg, setDashboardBg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [newNews, setNewNews] = useState({ title: '', content: '', image: null as File | null });
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [newSchedule, setNewSchedule] = useState({ examName: 'دراسي ومحفوظات وقبطي', date: '', time: '', location: '' });
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [newCarousel, setNewCarousel] = useState({ title: '', image: null as File | null, order: 0 });
  const [editingCarousel, setEditingCarousel] = useState<CarouselItem | null>(null);

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

  // Firebase Auth Listener
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const profile = userDoc.data();
            setUserProfile(profile);
            setUserRole(profile.role);
            setChurchName(profile.churchName || '');
            setLocation(profile.country || '');
            setDashboardBg(profile.dashboardBg || '');
            setIsLoggedIn(true);
          } else if (firebaseUser.email === 'admin@mafk.com' || firebaseUser.email === 'mahraganalkeraza7esoyam@gmail.com') {
            // Admin fallback if doc doesn't exist yet
            setUserRole('admin');
            setChurchName(firebaseUser.displayName || 'اللجنة المركزية منطقة18');
            setIsLoggedIn(true);
          } else {
            // New user or profile missing - allow them to stay logged in while profile is being created
            setIsLoggedIn(true);
            if (firebaseUser.email?.endsWith('@mafk.com')) {
              setUserRole('church');
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsLoggedIn(false);
        setUserRole('guest');
        setChurchName('');
        setDashboardBg('');
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
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

    const unsubNews = onSnapshot(query(collection(db, 'news'), where('year', '==', activeYear), orderBy('timestamp', 'desc'), limit(10)), (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as News)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'news'));

    // Filtered listeners for church users
    const resultsQuery = userRole === 'admin' 
      ? query(collection(db, 'results'), where('year', '==', activeYear)) 
      : query(collection(db, 'results'), where('churchName', '==', churchName), where('year', '==', activeYear));
    const unsubResults = onSnapshot(resultsQuery, (snapshot) => {
      setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Result)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'results'));

    const ordersQuery = userRole === 'admin' 
      ? query(collection(db, 'orders'), where('year', '==', activeYear)) 
      : query(collection(db, 'orders'), where('churchName', '==', churchName), where('year', '==', activeYear));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    const participantsQuery = userRole === 'admin' 
      ? query(collection(db, 'participants'), where('year', '==', activeYear)) 
      : query(collection(db, 'participants'), where('churchName', '==', churchName), where('year', '==', activeYear));
    const unsubParticipants = onSnapshot(participantsQuery, (snapshot) => {
      setParticipants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Participant)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'participants'));

    const inquiriesQuery = userRole === 'admin' 
      ? query(collection(db, 'inquiries'), where('year', '==', activeYear)) 
      : query(collection(db, 'inquiries'), where('churchName', '==', churchName), where('year', '==', activeYear));
    const unsubInquiries = onSnapshot(inquiriesQuery, (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inquiry)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inquiries'));

    const activityTeamsQuery = userRole === 'admin' 
      ? query(collection(db, 'activityTeams'), where('year', '==', activeYear)) 
      : query(collection(db, 'activityTeams'), where('churchName', '==', churchName), where('year', '==', activeYear));
    const unsubActivityTeams = onSnapshot(activityTeamsQuery, (snapshot) => {
      setActivityTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityTeam)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'activityTeams'));

    const unsubCarousel = onSnapshot(query(collection(db, 'carousel'), where('year', '==', activeYear)), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselItem));
      setCarouselItems(items.sort((a, b) => (a.order || 0) - (b.order || 0)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'carousel'));

    const unsubCalculatorSettings = onSnapshot(query(collection(db, 'calculator_settings'), where('year', '==', activeYear)), (snapshot) => {
      setCalculatorSettings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsCalculatorLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calculator_settings');
      setIsCalculatorLoading(false);
    });

    const unsubFooterSettings = onSnapshot(doc(db, 'settings', 'footer'), (snapshot) => {
      if (snapshot.exists()) {
        setSiteSettings(snapshot.data() as SiteSettings);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/footer'));

    const unsubAboutSettings = onSnapshot(doc(db, 'settings', 'about'), (snapshot) => {
      if (snapshot.exists()) {
        setAboutContent(snapshot.data() as AboutContent);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'settings/about'));

    return () => {
      unsubNews();
      unsubResults();
      unsubOrders();
      unsubParticipants();
      unsubInquiries();
      unsubActivityTeams();
      unsubCarousel();
      unsubCalculatorSettings();
      unsubFooterSettings();
      unsubAboutSettings();
    };
  }, [isAuthReady, isLoggedIn, userRole, churchName, activeYear]);

  useEffect(() => {
    if (userRole === 'admin') {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
      return () => unsubUsers();
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

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const handleResultsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      try {
        const batch = writeBatch(db);
        data.forEach((row: any) => {
          const resultRef = doc(collection(db, 'results'));
          
          // Map fields based on the provided Excel structure
          const churchNameVal = row['اسم البلد'] || row['الكنيسة'] || row['churchName'] || '';
          const studentNameVal = row['اسم المشترك رباعي'] || row['الاسم'] || row['studentName'] || '';
          const stageVal = row['نوع المرحلة'] || row['المرحلة'] || row['stage'] || '';
          const academicScore = Number(row['دراسي'] || 0);
          const memorizationScore = Number(row['محفوظ'] || 0);
          const q1Score = Number(row['ق١'] || 0);
          const qScore = Number(row['ق'] || 0);
          
          // Calculate total score if not provided
          const totalScore = row['المجموع'] || row['الدرجة'] || row['score'] || (academicScore + memorizationScore + q1Score + qScore);
          
          batch.set(resultRef, {
            serial: row['م'] || '',
            churchName: churchNameVal,
            studentName: studentNameVal,
            stage: stageVal,
            academicScore,
            memorizationScore,
            q1Score,
            qScore,
            score: totalScore,
            grade: row['التقدير'] || row['grade'] || '',
            timestamp: new Date().toISOString(),
            year: activeYear
          });
        });
        await batch.commit();
        alert('تم رفع النتائج بنجاح!');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'results');
      }
    };
    reader.readAsBinaryString(file);
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

  const exportParticipantsPDF = () => {
    const element = document.getElementById('participants-table-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `participants_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportOrdersPDF = () => {
    const element = document.getElementById('orders-table-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `orders_summary_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportOrdersDetailedPDF = () => {
    const element = document.getElementById('detailed-orders-report-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `detailed_orders_report_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportInquiriesPDF = () => {
    const element = document.getElementById('inquiries-list-admin');
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `inquiries_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(element).save();
  };

  const exportOrdersToExcelDetailed = (ordersList: Order[]) => {
    const flattenedData: any[] = [];
    
    ordersList.forEach(order => {
      order.details.forEach(detail => {
        flattenedData.push({
          "الكنيسة": order.churchName,
          "المكان": order.country,
          "التاريخ": order.timestamp,
          "المرحلة": detail.stage,
          "المادة": detail.material,
          "الكمية": detail.quantity,
          "السعر": detail.price,
          "الإجمالي للمرحلة": detail.subtotal,
          "الإجمالي الكلي للطلب": order.grandTotal
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Detailed Orders");
    XLSX.writeFile(workbook, `detailed_orders_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportAllRegistrationsToExcel = () => {
    exportAllDataReport(participants, activityTeams, orders);
  };

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
        const churchesQuery = query(collection(db, 'churches'), where('name', '==', loginChurch));
        const churchDocs = await getDocs(churchesQuery);
        
        if (churchDocs.empty) {
          setLoginError('الكنيسة غير موجودة');
          setIsLoading(false);
          return;
        }

        const churchData = churchDocs.docs[0].data();
        if (code !== churchData.loginCode) {
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
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
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

  const handleDeleteChurchAccount = async (id: string) => {
    confirmAction('تأكيد الحذف', 'هل أنت متأكد من حذف حساب هذه الكنيسة؟ سيتم حذف بيانات الحساب فقط، ولن يتم حذف بيانات المشتركين أو الطلبات.', async () => {
      try {
        await deleteDoc(doc(db, 'users', id));
        setSelectedChurchUserId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
      }
    });
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
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'results');
      }
    });
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
    if (!newTeam.activityType || !newTeam.members || newTeam.members.length === 0) return;
    
    setIsSubmittingTeam(true);

    const maleCount = newTeam.members.filter(m => m.gender === 'ذكر').length;
    const femaleCount = newTeam.members.filter(m => m.gender === 'أنثى').length;

    const team = {
      churchName,
      activityType: newTeam.activityType,
      members: newTeam.members as TeamMember[],
      maleCount,
      femaleCount,
      choirLevel: newTeam.choirLevel || '',
      instrumentType: newTeam.instrumentType || '',
      timestamp: new Date().toLocaleString('ar-EG')
    };

    try {
      if (editingTeam) {
        await updateDoc(doc(db, 'activityTeams', editingTeam.id), team);
        setEditingTeam(null);
        alert('تم تحديث الفريق بنجاح.');
      } else {
        await addDoc(collection(db, 'activityTeams'), { ...team, year: activeYear });
        alert('تم تسجيل الفريق بنجاح.');
      }
      setNewTeam({
        activityType: '',
        members: [{ name: '', gender: 'ذكر', stage: '' }],
        choirLevel: '',
        instrumentType: ''
      });
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
      members: team.members,
      choirLevel: team.choirLevel || '',
      instrumentType: team.instrumentType || ''
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
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `activityTeams/${id}`);
      }
    });
  };

  const handleEditParticipant = (participant: Participant) => {
    setNewParticipant({
      name: participant.name,
      stage: participant.stage,
      country: participant.country,
      competitions: [...participant.competitions, '', '', '', ''].slice(0, 4)
    });
    setEditingParticipant(participant);
    setRegistrationStep(1);
    // Scroll to form
    const formElement = document.getElementById('registration-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteParticipant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'participants', id));
      setShowDeleteModal(false);
      setParticipantToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `participants/${id}`);
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipant.name || !newParticipant.stage) return;
    
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
        await updateDoc(doc(db, 'participants', editingParticipant.id), {
          name: newParticipant.name,
          stage: newParticipant.stage,
          competitions: newParticipant.competitions.filter(c => c !== ''),
          timestamp: new Date().toLocaleString('ar-EG')
        });
        setEditingParticipant(null);
        alert('تم تحديث بيانات المشترك بنجاح.');
      } else {
        const participantData = {
          churchName,
          country: location, // Using the location state which is now country
          name: newParticipant.name,
          stage: newParticipant.stage,
          competitions: newParticipant.competitions.filter(c => c !== ''),
          timestamp: new Date().toLocaleString('ar-EG'),
          year: activeYear
        };
        await addDoc(collection(db, 'participants'), participantData);
        alert('تم تسجيل المشترك بنجاح.');
      }
      
      setNewParticipant({ 
        ...newParticipant, 
        name: '', 
        competitions: ['دراسي', '', '', ''] 
      });
    } catch (error) {
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
      const matchesSearch = n.title.toLowerCase().includes(newsSearch.toLowerCase());
      const dateStr = new Date(n.timestamp).toLocaleDateString('ar-EG');
      const matchesDate = !newsFilterDate || dateStr.includes(newsFilterDate);
      return matchesSearch && matchesDate;
    });
  }, [news, newsSearch, newsFilterDate]);

  const filteredResults = useMemo(() => {
    let list = results.filter(r => {
      const matchesSearch = r.studentName.toLowerCase().includes(resultSearch.toLowerCase());
      const matchesStage = resultsFilterStage === 'الكل' || r.stage === resultsFilterStage;
      const matchesGrade = resultsFilterGrade === 'الكل' || r.grade === resultsFilterGrade;
      return matchesSearch && matchesStage && matchesGrade;
    });

    if (resultsSortOrder === 'rank') {
      list = [...list].sort((a, b) => b.score - a.score);
    }

    return list;
  }, [results, resultSearch, resultsFilterStage, resultsFilterGrade, resultsSortOrder]);

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
    if (!churchName || !location) {
      alert('يرجى إدخال اسم الكنيسة والبلد أولاً');
      return;
    }

    const activeRows = calculations.rows.filter(r => r.subtotal > 0);
    if (activeRows.length === 0) {
      alert('يرجى إضافة كميات للكتب أولاً');
      return;
    }

    setIsSubmitting(true);
    try {
      const newOrder = {
        churchName,
        location,
        grandTotal: calculations.grandTotal,
        timestamp: new Date().toLocaleString('ar-EG'),
        details: activeRows.map(r => ({
          stage: r.stage,
          material: r.material,
          price: r.price,
          quantity: r.quantity,
          subtotal: r.subtotal
        }))
      };

      await addDoc(collection(db, 'orders'), { ...newOrder, year: activeYear });
      
      setSubmitStatus('success');
      alert('تم إرسال طلب الكتب للجنة بنجاح!');
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      console.error('Error submitting order:', error);
      setSubmitStatus('error');
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToPDF = () => {
    if (!invoiceRef.current) return;
    
    const element = invoiceRef.current;
    const opt = {
      margin: 10,
      filename: `طلب_كتب_مهرجان_${churchName || 'المهرجان'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as any;

    html2pdf().set(opt).from(element).save();
  };

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => { setActiveSection(id); setIsMenuOpen(false); }}
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

  const DeleteConfirmationModal = () => (
    <AnimatePresence>
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
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
            <p className="text-slate-500 text-sm mb-8">هل أنت متأكد من رغبتك في حذف هذا المشترك؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  if (participantToDelete) {
                    handleDeleteParticipant(participantToDelete);
                  }
                }}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
              >
                حذف
              </button>
              <button 
                onClick={() => setShowDeleteModal(false)}
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

  return (
    <div className="min-h-screen bg-bg-soft font-sans selection:bg-accent/30 relative" dir="rtl">
      {/* Global Watermark */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url(${logo})`,
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
                <NavItem id="schedule" icon={Calendar} label="جدول المهرجان" />
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
                  <a href="tel:01200019020" className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Phone size={14} />
                    <span>01200019020</span>
                  </a>
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
                    src={userProfile?.logoUrl || 'https://picsum.photos/seed/church/50/50'} 
                    alt="Church Logo" 
                    className="h-10 w-10 rounded-full object-cover shadow-md border border-slate-100" 
                  />
                  <span className="text-sm font-black text-primary">{churchName}</span>
                  <button onClick={() => setActiveSection('settings')} className="p-2 text-primary hover:bg-slate-100 rounded-full">
                    <Settings size={20} />
                  </button>
                </div>
              ) : (
                <>
                  <img src={appLogo || logo} alt="Logo" className="h-10 w-10 rounded-full object-cover shadow-md border border-slate-100" />
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
              <img src={appLogo || logo} alt="Logo" className="w-20 h-20 rounded-full mx-auto mb-6 object-cover shadow-sm border border-slate-50" />
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
                  {publicChurches.map((c: any) => c.name).sort().map(church => (
                    <option key={church} value={church}>{church}</option>
                  ))}
                </select>
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
                onClick={() => setActiveSection('results')}
                className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Award className="text-indigo-600" size={32} />
                </div>
                <h3 className="text-xl font-black text-coptic-blue mb-2">نظام النتائج</h3>
                <p className="text-slate-500 text-sm leading-relaxed">استعلم عن نتائج مخدوميك في المسابقات المختلفة.</p>
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

        {activeSection === 'news' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <BackButton />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[100%] z-0" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-slate-100 p-2 overflow-hidden transform hover:rotate-3 transition-transform">
                  <img src={appLogo || logo} alt="Logo" className="w-full h-full object-contain" />
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

        {activeSection === 'exams' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <BackButton />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-coptic-gold/10 rounded-2xl flex items-center justify-center">
                <BookOpen className="text-coptic-gold" size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-coptic-blue">قسم الامتحانات</h3>
                <p className="text-slate-400 font-bold">روابط الامتحانات الإلكترونية للمراحل المختلفة</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(examLinks).map(([stage, url]) => (
                <a 
                  key={stage}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-black text-slate-800">{stage}</h4>
                    <ExternalLink className="text-slate-300 group-hover:text-coptic-blue transition-colors" size={20} />
                  </div>
                  <div className="flex items-center gap-2 text-coptic-blue font-bold text-sm">
                    <span>دخول الامتحان</span>
                    <ChevronLeft size={16} />
                  </div>
                </a>
              ))}
              {Object.keys(examLinks).length === 0 && (
                <div className="col-span-full text-center py-20 bg-white rounded-3xl shadow-xl border border-slate-100">
                  <BookOpen className="mx-auto text-slate-200 mb-4" size={64} />
                  <p className="text-slate-400 font-bold text-lg">لا توجد امتحانات متاحة حالياً</p>
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
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text"
                    placeholder="ابحث عن نتيجة بالاسم..."
                    className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                    value={resultSearch}
                    onChange={(e) => setResultSearch(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <select 
                    value={resultsFilterStage}
                    onChange={(e) => setResultsFilterStage(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue font-bold appearance-none"
                  >
                    <option value="الكل">كل المراحل</option>
                    {Array.from(new Set(results.map(r => r.stage))).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-48">
                  <select 
                    value={resultsFilterGrade}
                    onChange={(e) => setResultsFilterGrade(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue font-bold appearance-none"
                  >
                    <option value="الكل">كل التقديرات</option>
                    {['ممتاز', 'جيد جداً', 'جيد', 'مقبول'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                      <th className="p-4">الاسم</th>
                      <th className="p-4">المرحلة</th>
                      <th className="p-4">دراسي</th>
                      <th className="p-4">محفوظ</th>
                      <th className="p-4">ق١</th>
                      <th className="p-4">ق</th>
                      <th className="p-4">المجموع</th>
                      <th className="p-4">التقدير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults
                      .filter(r => userRole === 'admin' || r.churchName === churchName)
                      .map(result => (
                        <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{result.studentName}</td>
                          <td className="p-4 text-slate-600">{result.stage}</td>
                          <td className="p-4 text-slate-600">{result.academicScore || 0}</td>
                          <td className="p-4 text-slate-600">{result.memorizationScore || 0}</td>
                          <td className="p-4 text-slate-600">{result.q1Score || 0}</td>
                          <td className="p-4 text-slate-600">{result.qScore || 0}</td>
                          <td className="p-4 font-black text-coptic-blue">{result.score}</td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                              result.grade === 'ممتاز' ? 'bg-emerald-50 text-emerald-600' :
                              result.grade === 'جيد جداً' ? 'bg-blue-50 text-blue-600' :
                              result.grade === 'جيد' ? 'bg-yellow-50 text-yellow-600' :
                              'bg-slate-50 text-slate-600'
                            }`}>
                              {result.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {filteredResults.filter(r => userRole === 'admin' || r.churchName === churchName).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 font-bold italic">
                          لا توجد نتائج مطابقة للبحث
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'church_dashboard' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <BackButton />
            <QuickActionsHub userRole={userRole} onAction={setActiveSection} />
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
                    onClick={() => exportChurchReport(churchName, results, orders)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-md"
                  >
                    <Download size={14} /> تصدير النتائج والطلبات (Excel)
                  </button>
                  <label className="cursor-pointer px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-100 transition-colors border border-slate-200">
                    <ImageIcon size={14} /> تخصيص الخلفية
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setDashboardBg(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {dashboardBg && (
                    <button 
                      onClick={() => setDashboardBg('')}
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                      title="إزالة الخلفية"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <History size={20} className="text-coptic-gold" /> سجل طلبات الكتب
                  </h4>
                  {orders.filter(o => o.churchName === churchName).length > 0 ? (
                    <div className="space-y-3">
                      {orders.filter(o => o.churchName === churchName).map(order => (
                        <div key={order.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-coptic-blue">{order.timestamp}</span>
                            <span className="font-bold text-coptic-red">{order.grandTotal} ج.م</span>
                          </div>
                          <p className="text-xs text-slate-500">عدد المراحل: {order.details.length}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic">لا توجد طلبات سابقة</p>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <UserPlus size={20} className="text-coptic-blue" /> تسجيل المشتركين
                  </h4>
                  <form onSubmit={handleAddParticipant} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
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
                        {dynamicLevels.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">نوع المسابقات (بحد أقصى ٤)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((idx) => {
                          const selectedComps = newParticipant.competitions;
                          const currentLevel = dynamicLevels.find(l => l.name === newParticipant.stage);
                          const availableCompsForLevel = currentLevel ? currentLevel.comps : [];
                          
                          const isOptionDisabled = (val: string) => {
                            if (!val) return false;
                            // Check if selected in other slots
                            if (selectedComps.some((c, i) => i !== idx && c === val)) return true;
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
                              {availableCompsForLevel.map((comp: string) => (
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
                      {(participants || [])
                        .filter(p => p.churchName === churchName && p.name.toLowerCase().includes(participantSearch.toLowerCase()))
                        .map(p => (
                        <div key={p.id} className="group relative p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-black text-slate-800">{p.name}</p>
                            <p className="text-[10px] font-bold text-coptic-blue mt-0.5">{p.stage}</p>
                          </div>
                          <button onClick={() => handleDeleteParticipant(p.id)} className="p-1.5 text-slate-200 hover:text-coptic-red transition-colors opacity-0 group-hover:opacity-100">
                            <X size={16} />
                          </button>
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
                    {participants.filter(p => p.churchName === churchName).length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <UserPlus className="mx-auto text-slate-300 mb-2" size={32} />
                        <p className="text-xs text-slate-400 font-bold">لا يوجد مشتركين مسجلين بعد</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

                <div className="space-y-4">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <MessageSquare size={20} className="text-coptic-blue" /> ردود الاستفسارات
                  </h4>
                  <div className="space-y-3">
                    {(inquiries || []).filter(inq => inq.churchName === churchName).map(inq => (
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
            <BackButton />
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-coptic-red/10 rounded-2xl flex items-center justify-center">
                    <ShieldCheck className="text-coptic-red" size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-coptic-blue">لوحة تحكم المسئول</h3>
                    <p className="text-slate-400 font-bold">إدارة كافة الطلبات والاستفسارات الواردة</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">تصفية حسب الكنيسة</label>
                  <select 
                    value={adminFilterChurch}
                    onChange={(e) => setAdminFilterChurch(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-coptic-blue font-bold min-w-[200px]"
                  >
                    <option value="الكل">عرض الكل</option>
                    {publicChurches.map((c: any) => c.name).sort().map(church => (
                      <option key={church} value={church}>{church}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Admin Tabs */}
              <div className="flex border-b border-slate-100 mb-8 overflow-x-auto no-scrollbar">
                {[
                  { id: 'dashboard', label: 'الملخص', icon: LayoutDashboard },
                  { id: 'news', label: 'الأخبار والسلايدر', icon: Newspaper },
                  { id: 'participants', label: 'المشتركين', icon: Users },
                  { id: 'activity_teams', label: 'الفرق', icon: Users },
                  { id: 'results', label: 'النتائج', icon: Award },
                  { id: 'omr', label: 'بابل شيت OMR', icon: FileScan },
                  { id: 'orders', label: 'الطلبات', icon: ShoppingCart },
                  { id: 'inquiries', label: 'الاستفسارات', icon: MessageSquare },
                  { id: 'schedules', label: 'الجداول', icon: Calendar },
                  { id: 'calculator', label: 'حاسبة الكتب', icon: Calculator },
                  { id: 'exams_management', label: 'روابط الامتحانات', icon: BookOpen },
                  { id: 'users_management', label: 'المستخدمين والكنائس', icon: Users },
                  { id: 'dynamic_management', label: 'إدارة النظام الديناميكية', icon: Settings },
                  { id: 'system_settings', label: 'إعدادات النظام', icon: Settings }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setAdminActiveTab(tab.id)}
                    className={`px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${adminActiveTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {adminActiveTab === 'dashboard' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <div className="p-6 bg-coptic-blue/5 rounded-3xl border border-coptic-blue/10">
                  <p className="text-[10px] font-black text-coptic-blue uppercase mb-1">المشتركين ({adminFilterChurch})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {(participants || []).filter(p => adminFilterChurch === 'الكل' || p.churchName === adminFilterChurch).length}
                  </p>
                </div>
                <div className="p-6 bg-coptic-gold/5 rounded-3xl border border-coptic-gold/10">
                  <p className="text-[10px] font-black text-coptic-gold uppercase mb-1">طلبات الكتب ({adminFilterChurch})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {(orders || []).filter(o => adminFilterChurch === 'الكل' || o.churchName === adminFilterChurch).length}
                  </p>
                </div>
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">الفرق ({adminFilterChurch})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {(activityTeams || []).filter(t => adminFilterChurch === 'الكل' || t.churchName === adminFilterChurch).length}
                  </p>
                </div>
                <div className="p-6 bg-coptic-red/5 rounded-3xl border border-coptic-red/10">
                  <p className="text-[10px] font-black text-coptic-red uppercase mb-1">الاستفسارات ({adminFilterChurch})</p>
                  <p className="text-3xl font-black text-slate-800">
                    {(inquiries || []).filter(i => adminFilterChurch === 'الكل' || i.churchName === adminFilterChurch).length}
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
                        onClick={() => exportFullDioceseReport(results)}
                        className="px-6 py-3 bg-coptic-red text-white rounded-2xl font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                      >
                        <Award size={20} /> تصدير تقرير النتائج المجمع (Excel)
                      </button>
                      <button 
                        onClick={exportAllRegistrationsToExcel}
                        className="px-6 py-3 bg-coptic-blue text-white rounded-2xl font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                      >
                        <Download size={20} /> تصدير كل بيانات التسجيل (Excel)
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
                      {filteredNews.map((item) => (
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
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Users className="text-coptic-blue" /> إدارة المشتركين
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text"
                        placeholder="ابحث بالاسم..."
                        className="pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue font-bold"
                        value={participantSearch}
                        onChange={(e) => setParticipantSearch(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={exportAllRegistrationsToExcel}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-md"
                    >
                      <Download size={16} /> تصدير Excel
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] font-black text-slate-500 uppercase">
                        <th className="p-4 border-b border-slate-100">الاسم</th>
                        <th className="p-4 border-b border-slate-100">الكنيسة</th>
                        <th className="p-4 border-b border-slate-100">المرحلة</th>
                        <th className="p-4 border-b border-slate-100">المسابقات</th>
                        <th className="p-4 border-b border-slate-100 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {participants
                        .filter(p => adminFilterChurch === 'الكل' || p.churchName === adminFilterChurch)
                        .filter(p => p.name.toLowerCase().includes(participantSearch.toLowerCase()))
                        .map(p => (
                          <tr key={p.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 text-sm">{p.name}</td>
                            <td className="p-4 text-slate-600 text-xs">{p.churchName}</td>
                            <td className="p-4 text-slate-600 text-xs">{p.stage}</td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {p.competitions.map((c, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-primary/5 text-primary rounded-full text-[9px] font-black">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => {
                                    setActiveSection('registration');
                                    handleEditParticipant(p);
                                  }}
                                  className="p-2 text-slate-400 hover:text-coptic-blue transition-colors"
                                  title="تعديل"
                                >
                                  <FileText size={18} />
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
              </section>
            )}

            {adminActiveTab === 'activity_teams' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Users className="text-emerald-500" /> إدارة الفرق والأنشطة
                  </h4>
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
                      {(activityTeams || [])
                        .filter(t => adminFilterChurch === 'الكل' || t.churchName === adminFilterChurch)
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
              </section>
            )}

            {adminActiveTab === 'omr' && (
              <OmrGenerator />
            )}

            {adminActiveTab === 'results' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Award className="text-indigo-600" /> إدارة النتائج
                  </h4>
                  <button 
                    onClick={handleClearResults}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-black hover:bg-opacity-90 transition-all shadow-md"
                  >
                    مسح كل النتائج
                  </button>
                </div>

                <form onSubmit={handleResultSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 bg-white p-6 rounded-2xl border border-slate-100">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">اسم المخدوم</label>
                    <input 
                      type="text"
                      value={newResult.studentName}
                      onChange={(e) => setNewResult({...newResult, studentName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">الكنيسة</label>
                    <select 
                      value={newResult.churchName}
                      onChange={(e) => setNewResult({...newResult, churchName: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                      required
                    >
                      <option value="">اختر الكنيسة</option>
                      {publicChurches.map((c: any) => c.name).sort().map(church => (
                        <option key={church} value={church}>{church}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المرحلة</label>
                    <select 
                      value={newResult.stage}
                      onChange={(e) => setNewResult({...newResult, stage: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                      required
                    >
                      <option value="">اختر المرحلة</option>
                      {dynamicLevels.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">دراسي</label>
                    <input 
                      type="number"
                      value={newResult.academicScore}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const total = val + newResult.memorizationScore + newResult.q1Score + newResult.qScore;
                        setNewResult({...newResult, academicScore: val, score: total});
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">محفوظ</label>
                    <input 
                      type="number"
                      value={newResult.memorizationScore}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const total = newResult.academicScore + val + newResult.q1Score + newResult.qScore;
                        setNewResult({...newResult, memorizationScore: val, score: total});
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">ق١</label>
                    <input 
                      type="number"
                      value={newResult.q1Score}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const total = newResult.academicScore + newResult.memorizationScore + val + newResult.qScore;
                        setNewResult({...newResult, q1Score: val, score: total});
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">ق</label>
                    <input 
                      type="number"
                      value={newResult.qScore}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const total = newResult.academicScore + newResult.memorizationScore + newResult.q1Score + val;
                        setNewResult({...newResult, qScore: val, score: total});
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المجموع</label>
                    <input 
                      type="number"
                      value={newResult.score}
                      onChange={(e) => setNewResult({...newResult, score: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">التقدير</label>
                    <select 
                      value={newResult.grade}
                      onChange={(e) => setNewResult({...newResult, grade: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                      required
                    >
                      <option value="">اختر التقدير</option>
                      {['ممتاز', 'جيد جداً', 'جيد', 'مقبول'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="submit"
                      disabled={isSubmittingResult}
                      className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-opacity-90 transition-all shadow-lg"
                    >
                      {editingResult ? 'تحديث النتيجة' : 'إضافة نتيجة'}
                    </button>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="bg-white text-[10px] font-black text-slate-500 uppercase">
                        <th className="p-4 border-b border-slate-100">الاسم</th>
                        <th className="p-4 border-b border-slate-100">الكنيسة</th>
                        <th className="p-4 border-b border-slate-100">المرحلة</th>
                        <th className="p-4 border-b border-slate-100">دراسي</th>
                        <th className="p-4 border-b border-slate-100">محفوظ</th>
                        <th className="p-4 border-b border-slate-100">ق١</th>
                        <th className="p-4 border-b border-slate-100">ق</th>
                        <th className="p-4 border-b border-slate-100">المجموع</th>
                        <th className="p-4 border-b border-slate-100">التقدير</th>
                        <th className="p-4 border-b border-slate-100 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(results || [])
                        .filter(r => adminFilterChurch === 'الكل' || r.churchName === adminFilterChurch)
                        .map(r => (
                          <tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 text-sm">{r.studentName}</td>
                            <td className="p-4 text-slate-600 text-xs">{r.churchName}</td>
                            <td className="p-4 text-slate-600 text-xs">{r.stage}</td>
                            <td className="p-4 text-slate-600 text-xs">{r.academicScore || 0}</td>
                            <td className="p-4 text-slate-600 text-xs">{r.memorizationScore || 0}</td>
                            <td className="p-4 text-slate-600 text-xs">{r.q1Score || 0}</td>
                            <td className="p-4 text-slate-600 text-xs">{r.qScore || 0}</td>
                            <td className="p-4 font-black text-indigo-600">{r.score}</td>
                            <td className="p-4 text-slate-600 text-xs">{r.grade}</td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingResult(r);
                                    setNewResult({
                                      studentName: r.studentName,
                                      stage: r.stage,
                                      academicScore: r.academicScore || 0,
                                      memorizationScore: r.memorizationScore || 0,
                                      q1Score: r.q1Score || 0,
                                      qScore: r.qScore || 0,
                                      score: r.score,
                                      grade: r.grade,
                                      churchName: r.churchName
                                    });
                                  }}
                                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                  title="تعديل"
                                >
                                  <FileText size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteResult(r.id)}
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
              </section>
            )}

            {adminActiveTab === 'orders' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="text-coptic-red" /> إدارة طلبات الكتب
                  </h4>
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
                        .map(o => (
                          <tr key={o.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 text-sm">{o.churchName}</td>
                            <td className="p-4 text-slate-600 text-xs">{o.timestamp}</td>
                            <td className="p-4 font-black text-coptic-red">{o.grandTotal} ج.م</td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
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
                      <option value="دراسي ومحفوظات وقبطي">دراسي ومحفوظات وقبطي</option>
                      <option value="رياضي">رياضي</option>
                      <option value="كورال">كورال</option>
                      <option value="مسرح">مسرح</option>
                      <option value="أنشطة">أنشطة</option>
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
              <section className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <h4 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                  <BookOpen className="text-primary" /> إدارة روابط الامتحانات
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dynamicLevels.map((p: any) => (
                    <div key={p.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <label className="text-xs font-black text-slate-400 uppercase mb-2 block">{p.name}</label>
                      <input 
                        type="url"
                        value={examLinks[p.name] || ''}
                        onChange={(e) => setExamLinks({...examLinks, [p.name]: e.target.value})}
                        placeholder="رابط الامتحان..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold mb-2"
                      />
                      <button 
                        onClick={() => {
                          handleUpdateExamLink(p.name, examLinks[p.name] || '');
                          alert('تم تحديث الرابط');
                        }}
                        className="w-full py-2 bg-primary text-white rounded-xl font-bold hover:bg-opacity-90 transition-all"
                      >
                        حفظ
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {adminActiveTab === 'calculator' && (
              <section className="p-8 bg-slate-50 rounded-3xl border border-slate-200">
                <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-8">
                  <Calculator className="text-primary" /> إدارة حاسبة الكتب
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المرحلة</label>
                    <select 
                      value={newCalculatorSetting.stage}
                      onChange={(e) => setNewCalculatorSetting({...newCalculatorSetting, stage: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    >
                      <option value="">-- اختر المرحلة --</option>
                      {dynamicLevels.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">المادة</label>
                    <select 
                      value={newCalculatorSetting.material}
                      onChange={(e) => setNewCalculatorSetting({...newCalculatorSetting, material: e.target.value})}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
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
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleSaveCalculatorSetting}
                  disabled={isSubmittingCalculator}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black hover:bg-opacity-90 transition-all mb-8"
                >
                  {isSubmittingCalculator ? 'جاري الحفظ...' : 'حفظ الإعداد'}
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-lg text-slate-800">الكتب المضافة</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-900 text-[11px] uppercase font-black border-b border-slate-100">
                          <th className="px-6 py-4">المرحلة</th>
                          <th className="px-6 py-4">المادة</th>
                          <th className="px-6 py-4">السعر</th>
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
                            .sort((a, b) => {
                              const indexA = dynamicLevels.findIndex((p: any) => p.name);
                              const indexB = dynamicLevels.findIndex((p: any) => p.name);
                              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                              return a.stage.localeCompare(b.stage);
                            })
                            .map((setting) => (
                            <tr key={setting.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-800">{setting.stage}</td>
                              <td className="px-6 py-4 font-bold text-slate-600">{setting.material}</td>
                              <td className="px-6 py-4 font-black text-primary">{setting.price} ج.م</td>
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
              <DynamicAdminSettings />
            )}

            {adminActiveTab === 'system_settings' && (
              <div className="space-y-12">
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

                <section className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
                  <h4 className="text-xl font-black text-slate-800 mb-8">إدارة إعدادات الكنائس</h4>
                  <div className="mb-8">
                    <label className="text-xs font-black text-slate-400 uppercase mb-2 block">اختر الكنيسة</label>
                    <div className="flex gap-4">
                      <select 
                        value={selectedChurchUserId || ''}
                        onChange={(e) => setSelectedChurchUserId(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold"
                      >
                        <option value="">اختر كنيسة...</option>
                        {allUsers.filter(u => u.role === 'church').map(user => (
                          <option key={user.id} value={user.id}>{user.churchName}</option>
                        ))}
                      </select>
                      {selectedChurchUserId && (
                        <button 
                          onClick={() => handleDeleteChurchAccount(selectedChurchUserId)}
                          className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black flex items-center gap-2 hover:bg-red-100 transition-all"
                          title="حذف حساب الكنيسة"
                        >
                          <Trash2 size={20} /> حذف الحساب
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedChurchUserId && (
                    <ChurchSettings 
                      userId={selectedChurchUserId} 
                      churchName={allUsers.find(u => u.id === selectedChurchUserId)?.churchName || ''} 
                      country={allUsers.find(u => u.id === selectedChurchUserId)?.country || ''}
                      logoUrl={allUsers.find(u => u.id === selectedChurchUserId)?.logoUrl} 
                      email={allUsers.find(u => u.id === selectedChurchUserId)?.email}
                    />
                  )}
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
              <div className="space-y-16 mt-16">
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
                      <BookOpen className="text-coptic-gold" /> طلبات الكتب ({(orders || []).filter(o => adminFilterChurch === 'الكل' || o.churchName === adminFilterChurch).length})
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
                              <div className="flex justify-center">
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
                      <UserPlus className="text-coptic-blue" /> المشتركين المسجلين ({(participants || []).filter(p => adminFilterChurch === 'الكل' || p.churchName === adminFilterChurch).length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => exportToExcel((participants || []).filter(p => adminFilterChurch === 'الكل' || p.churchName === adminFilterChurch), 'participants')}
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
                        {(participants || [])
                          .filter(p => adminFilterChurch === 'الكل' || p.churchName === adminFilterChurch)
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
                                  <FileText size={16} />
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
                </section>

                <section>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Users className="text-coptic-gold" /> فرق الأنشطة المسجلة ({(activityTeams || []).filter(t => adminFilterChurch === 'الكل' || t.churchName === adminFilterChurch).length})
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => exportToExcel((activityTeams || []).filter(t => adminFilterChurch === 'الكل' || t.churchName === adminFilterChurch), 'activity_teams')}
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
                        {(activityTeams || [])
                          .filter(t => adminFilterChurch === 'الكل' || t.churchName === adminFilterChurch)
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
                        {publicChurches.map((c: any) => c.name).sort().map(church => (
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
                        {dynamicLevels.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
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
                          <h5 className="font-black text-slate-700">رفع ملف النتائج (Excel)</h5>
                          <p className="text-xs text-slate-400 font-bold">يجب أن يحتوي الملف على أعمدة: الكنيسة، الاسم، المرحلة، الدرجة، التقدير</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => exportResultsToExcel(filteredResults)}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg"
                          >
                            <Download size={20} /> Excel
                          </button>
                          <button 
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

                   <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                       <button
                         onClick={() => setResultsSortOrder(prev => prev === 'rank' ? 'default' : 'rank')}
                         className={`px-4 py-2 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${
                           resultsSortOrder === 'rank' 
                             ? 'bg-coptic-gold text-white shadow-lg scale-105' 
                             : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                         }`}
                       >
                         <Trophy size={16} />
                         {resultsSortOrder === 'rank' ? 'ترتيب حسب المركز' : 'ترتيب افتراضي'}
                       </button>
                     </div>
                     <p className="text-xs text-slate-400 font-bold">
                       إجمالي النتائج المفلترة: {filteredResults.length}
                     </p>
                   </div>

                   <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase">
                          <th className="p-4">م</th>
                          <th className="p-4">الكنيسة</th>
                          <th className="p-4">الاسم</th>
                          <th className="p-4">المرحلة</th>
                          <th className="p-4">الدرجة (%)</th>
                          <th className="p-4">التقدير</th>
                          <th className="p-4 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredResults
                          .filter(r => adminFilterChurch === 'الكل' || r.churchName === adminFilterChurch)
                          .map((r, index) => (
                          <tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-400">{index + 1}</td>
                            <td className="p-4 font-bold text-coptic-blue">{r.churchName}</td>
                            <td className="p-4 text-slate-800 font-bold">{r.studentName}</td>
                            <td className="p-4 text-slate-600 font-bold">{r.stage}</td>
                            <td className="p-4 font-black text-indigo-600">{r.score}%</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                                r.grade === 'ممتاز' ? 'bg-emerald-100 text-emerald-600' :
                                r.grade === 'جيد جداً' ? 'bg-blue-100 text-blue-600' :
                                r.grade === 'جيد' ? 'bg-indigo-100 text-indigo-600' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {r.grade}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <button 
                                  onClick={() => handleEditResult(r)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                  title="تعديل"
                                >
                                  <FileText size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteResult(r.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredResults.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                              لا توجد نتائج مسجلة حالياً
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="pt-12 border-t border-slate-100">
                  <h4 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-6">
                    <Link2 className="text-coptic-blue" /> إدارة لينكات الامتحانات (Google Forms)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                      { id: 'nursery', label: 'حضانة' },
                      { id: 'stage12', label: 'أولى وثانية' },
                      { id: 'stage34', label: 'ثالثة ورابعة' },
                      { id: 'stage56', label: 'خامسة وسادسة' },
                      { id: 'adults', label: 'تعليم كبار' },
                      { id: 'seniors', label: 'سمعان الشيخ' }
                    ].map((stage) => (
                      <div key={stage.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase">{stage.label}</label>
                        <div className="flex gap-2">
                          <input 
                            type="url" 
                            placeholder="https://docs.google.com/forms/..."
                            value={examLinks[stage.id] || ''}
                            onChange={(e) => setExamLinks({ ...examLinks, [stage.id]: e.target.value })}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-coptic-blue"
                          />
                          <button 
                            onClick={() => handleUpdateExamLink(stage.id, examLinks[stage.id] || '')}
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
            className="space-y-8"
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
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                    اسم الكنيسة
                  </label>
                  <input 
                    type="text" 
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    readOnly={false}
                    placeholder="مثال: كنيسة القديس مارجرجس"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary focus:ring-0 transition-all shadow-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">
                    اسم البلد أو القرية
                  </label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="مثال: المطرانية"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary focus:ring-0 transition-all shadow-none"
                  />
                </div>
              </div>
            </div>

            {/* Calculator Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="text-coptic-blue" />
                  <h3 className="font-bold text-lg">حاسبة طلب الكتب</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={handleClearQuantities}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all text-sm font-bold shadow-md"
                  >
                    <Trash2 size={16} /> مسح الكميات
                  </button>
                  <button 
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-bold shadow-md ${
                      isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-coptic-red text-white hover:bg-opacity-90'
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
                      .sort((a, b) => {
                        const indexA = dynamicLevels.findIndex((p: any) => p.name);
                        const indexB = dynamicLevels.findIndex((p: any) => p.name);
                        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                        if (indexA !== -1) return -1;
                        if (indexB !== -1) return 1;
                        return a.localeCompare(b);
                      })
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
                                <div key={material} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                  <span className="text-sm font-bold text-slate-600 w-20">{material}</span>
                                  <div className="flex flex-col gap-2 flex-1 items-end">
                                    {items.map((setting: any) => (
                                      <div key={setting.id} className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400 font-bold w-12 text-left">{setting.price} ج.م</span>
                                        <input 
                                          type="number" 
                                          min="0"
                                          value={quantities[setting.id] || ''}
                                          onChange={(e) => handleQuantityChange(setting.id, e.target.value)}
                                          className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-sm outline-none focus:bg-white focus:border-primary transition-all"
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

            {/* Print-only Invoice Template */}
            <div className="hidden">
              <div ref={invoiceRef} className="p-10 bg-white text-slate-900 font-sans" dir="rtl">
                <div className="flex justify-between items-start border-b-4 border-coptic-blue pb-6 mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-coptic-blue mb-1">مهرجان الكرازة ٢٠٢٦</h1>
                    <p className="text-coptic-gold font-bold uppercase tracking-widest text-sm">فاتورة طلب كتب رسمية</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">{churchName || '________________'}</p>
                    <p className="text-slate-500">{location || '________________'}</p>
                    <p className="text-xs text-slate-400 mt-2">التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
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
                        <td className="p-3">{item.material}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-center">{item.price} ج.م</td>
                        <td className="p-3 text-left font-mono">{item.subtotal} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white">
                      <td colSpan={4} className="p-4 text-left font-bold">المجموع الكلي</td>
                      <td className="p-4 text-left font-mono text-xl font-black">{calculations.grandTotal} ج.م</td>
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
              <div id="detailed-orders-report-admin" className="p-10 bg-white text-slate-900 font-sans" dir="rtl">
                <div className="text-center border-b-4 border-coptic-blue pb-6 mb-8">
                  <h1 className="text-3xl font-black text-coptic-blue mb-1">تقرير طلبات الكتب التفصيلي</h1>
                  <p className="text-coptic-gold font-bold uppercase tracking-widest text-sm">مهرجان الكرازة ٢٠٢٦ - منطقة ١٨</p>
                  <p className="text-xs text-slate-400 mt-2">تاريخ التقرير: {new Date().toLocaleString('ar-EG')}</p>
                </div>

                {(orders || [])
                  .filter(o => adminFilterChurch === 'الكل' || o.churchName === adminFilterChurch)
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
                        {order.details.map((detail: any, dIdx: number) => (
                          <tr key={dIdx} className="text-xs">
                            <td className="p-2 border border-slate-200 font-bold">{detail.stage}</td>
                            <td className="p-2 border border-slate-200">{detail.material}</td>
                            <td className="p-2 border border-slate-200 text-center">{detail.quantity}</td>
                            <td className="p-2 border border-slate-200 text-center">{detail.price} ج.م</td>
                            <td className="p-2 border border-slate-200 text-left font-mono">{detail.subtotal} ج.م</td>
                          </tr>
                        ))}
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
                  <img src={appLogo || logo} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-primary">تسجيل المشتركين - كنيسة {churchName}</h3>
                  <p className="text-slate-400 font-bold">قم بإضافة بيانات المخدومين للمشاركة في المهرجان</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-10 px-4">
                <div className="flex justify-between mb-2">
                  {['البيانات الأساسية', 'المسابقات', 'المراجعة'].map((label, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${registrationStep > i + 1 ? 'bg-green-500 text-white' : registrationStep === i + 1 ? 'bg-primary text-white shadow-lg scale-110' : 'bg-slate-100 text-slate-400'}`}>
                        {registrationStep > i + 1 ? <Check size={20} /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 ${registrationStep === i + 1 ? 'text-primary' : 'text-slate-400'}`}>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((registrationStep - 1) / 2) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                  <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3">
                    <UserPlus size={28} className="text-primary" /> تسجيل مشترك جديد
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
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                          {dynamicLevels.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
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
                      {[0, 1, 2, 3].map((idx) => {
                        const isCopticLevel2Allowed = ['خامسة وسادسة', 'إعدادي', 'ثانوي'].includes(newParticipant.stage);
                        const selectedComps = newParticipant.competitions;
                        
                        const isOptionDisabled = (val: string) => {
                          if (!val) return false;
                          if (selectedComps.some((c, i) => i !== idx && c === val)) return true;
                          if (val === 'قبطي مستوى أول' && selectedComps.some((c, i) => i !== idx && c === 'قبطي مستوى ثانٍ')) return true;
                          if (val === 'قبطي مستوى ثانٍ' && selectedComps.some((c, i) => i !== idx && c === 'قبطي مستوى أول')) return true;
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
                              <option value="دراسي" disabled={isOptionDisabled('دراسي')}>دراسي</option>
                              <option value="محفوظات" disabled={isOptionDisabled('محفوظات')}>محفوظات</option>
                              <option value="قبطي مستوى أول" disabled={isOptionDisabled('قبطي مستوى أول')}>قبطي مستوى أول</option>
                              {isCopticLevel2Allowed && <option value="قبطي مستوى ثانٍ" disabled={isOptionDisabled('قبطي مستوى ثانٍ')}>قبطي مستوى ثانٍ</option>}
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
                      disabled={isSubmitting}
                      className={`flex-1 py-4 text-white rounded-lg font-black text-base shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary'}`}
                    >
                      {isSubmitting ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <UserPlus size={20} />}
                      {isSubmitting ? 'جاري التسجيل...' : 'تسجيل المشترك'}
                    </button>
                    <button 
                      onClick={() => {
                        setNewParticipant({ name: '', stage: '', country: '', competitions: ['', '', '', ''] });
                        setRegistrationStep(1);
                      }}
                      className="px-8 py-4 bg-slate-100 text-slate-600 rounded-lg font-black text-base hover:bg-slate-200 transition-all"
                    >
                      إعادة تعيين
                    </button>
                  </div>
                </div>

                {/* Registered Participants List */}
                <div className="pt-12 border-t border-slate-100 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users size={24} className="text-primary" />
                      <h4 className="font-black text-xl text-slate-800">المشتركين المسجلين</h4>
                    </div>
                    <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-black">
                      إجمالي: {participants.filter(p => p.churchName === churchName).length}
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
                            {p.competitions.filter(Boolean).map((c, i) => (
                              <div key={i} className="w-6 h-6 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[8px] font-black text-primary" title={c}>
                                {c.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleEditParticipant(p)}
                              className="p-2 text-slate-300 hover:text-coptic-blue transition-colors"
                              title="تعديل"
                            >
                              <FileText size={16} />
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
                    {participants.filter(p => p.churchName === churchName).length === 0 && (
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
                                  instrumentType: ''
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
                          </select>
                        </div>

                        {newTeam.activityType === 'كورال' && (
                          <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-900 uppercase block mb-1">المستوى</label>
                            <select 
                              value={newTeam.choirLevel || ''}
                              onChange={e => setNewTeam({...newTeam, choirLevel: e.target.value})}
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:bg-white focus:border-primary transition-all font-bold"
                              required
                            >
                              <option value="">-- اختر المستوى --</option>
                              <option value="مستوى أول">مستوى أول</option>
                              <option value="مستوى ثانٍ">مستوى ثانٍ</option>
                            </select>
                          </div>
                        )}

                        {newTeam.activityType === 'عزف' && (
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
                        )}

                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h5 className="text-sm font-black text-slate-800">أعضاء الفريق</h5>
                            <button 
                              type="button"
                              onClick={handleAddTeamMember}
                              className="text-primary font-black text-xs hover:underline"
                            >
                              + إضافة عضو
                            </button>
                          </div>
                          <div className="space-y-4">
                            {newTeam.members?.map((member, idx) => (
                              <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div className="md:col-span-5 space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">الاسم</label>
                                  <input 
                                    type="text"
                                    placeholder="الاسم الثلاثي"
                                    value={member.name}
                                    onChange={e => {
                                      const updated = [...(newTeam.members || [])];
                                      updated[idx].name = e.target.value;
                                      setNewTeam({...newTeam, members: updated});
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary font-bold"
                                    required
                                  />
                                </div>
                                <div className="md:col-span-3 space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase">النوع</label>
                                  <select 
                                    value={member.gender}
                                    onChange={e => {
                                      const updated = [...(newTeam.members || [])];
                                      updated[idx].gender = e.target.value as 'ذكر' | 'أنثى';
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
                                    value={member.stage}
                                    onChange={e => {
                                      const updated = [...(newTeam.members || [])];
                                      updated[idx].stage = e.target.value;
                                      setNewTeam({...newTeam, members: updated});
                                    }}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-primary font-bold"
                                    required
                                  >
                                    <option value="">المرحلة</option>
                                    {dynamicLevels.map((p: any) => <option key={p.name} value={p.name}>{p.name}</option>)}
                                  </select>
                                </div>
                                <div className="md:col-span-1 flex justify-center pb-1">
                                  <button 
                                    type="button"
                                    onClick={() => handleRemoveTeamMember(idx)}
                                    disabled={newTeam.members?.length === 1}
                                    className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-30"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex justify-around text-center">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">عدد الذكور</p>
                            <p className="text-2xl font-black text-primary">{newTeam.members?.filter(m => m.gender === 'ذكر').length}</p>
                          </div>
                          <div className="w-px bg-slate-200 h-10 self-center"></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">عدد الإناث</p>
                            <p className="text-2xl font-black text-primary">{newTeam.members?.filter(m => m.gender === 'أنثى').length}</p>
                          </div>
                        </div>

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

                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Users size={24} className="text-primary" />
                        <h4 className="font-black text-xl text-slate-800">الفرق المسجلة</h4>
                      </div>
                      <div className="max-h-[800px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {(activityTeams || [])
                          .filter(t => t.churchName === churchName)
                          .map(t => (
                          <div key={t.id} className="p-6 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all relative group overflow-hidden">
                            <div className="absolute top-0 right-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            <button 
                              onClick={() => handleDeleteTeam(t.id)}
                              className="absolute left-4 top-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                            
                            <div className="mb-4">
                              <h5 className="text-lg font-black text-slate-800">{t.activityType}</h5>
                              {t.choirLevel && <p className="text-xs font-bold text-primary mt-1">{t.choirLevel}</p>}
                              {t.instrumentType && <p className="text-xs font-bold text-primary mt-1">{t.instrumentType}</p>}
                            </div>

                            <div className="space-y-3">
                              <p className="text-[10px] font-black text-slate-400 uppercase">أعضاء الفريق ({t.members.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {t.members.map((m, i) => (
                                  <div key={i} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
                                    {m.name} <span className="text-slate-300 mx-1">|</span> {m.stage}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
                              <div className="flex gap-4">
                                <span className="text-[10px] font-black text-primary">ذكور: {t.members.filter(m => m.gender === 'ذكر').length}</span>
                                <span className="text-[10px] font-black text-primary">إناث: {t.members.filter(m => m.gender === 'أنثى').length}</span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(t.timestamp).toLocaleDateString('ar-EG')}</span>
                            </div>
                          </div>
                        ))}
                        
                        {(activityTeams || []).filter(t => t.churchName === churchName).length === 0 && (
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
                <img src={appLogo || logo} alt="Logo" className="w-full h-full object-contain" />
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
              <li><button onClick={() => setActiveSection('schedule')} className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> جدول المواعيد</button></li>
              <li><button onClick={() => setActiveSection('calculator')} className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> حاسبة الكتب</button></li>
            </ul>
          </div>

          <div className="space-y-8">
            <h5 className="text-xl font-black border-r-4 border-primary pr-4">تواصل معنا</h5>
            <div className="text-slate-400 text-base space-y-6">
              <p className="font-bold leading-relaxed">لأي استفسارات بخصوص التسجيل أو المسابقات، يرجى التواصل مع أمناء الخدمة بكنيستكم أو عبر الأرقام التالية:</p>
              <div className="space-y-4">
                <a href={`tel:${siteSettings.phone || '01200019020'}`} className="flex items-center gap-4 text-white hover:text-primary transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-lg border border-white/5">
                    <Phone size={20} />
                  </div>
                  <span className="font-mono text-xl tracking-wider">{siteSettings.phone || '01200019020'}</span>
                </a>
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
      <DeleteScheduleModal />
      <DeleteCalculatorModal />

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

export default App;
