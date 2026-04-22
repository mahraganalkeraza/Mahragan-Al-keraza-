export interface Church {
  id: string;
  churchName: string;
  password?: string;
  logoUrl?: string;
  lastLogin?: string;
  role: 'church';
}

export interface BookItem {
  stage: string;
  studyPrice: number;
  memoPrice: number;
  copticPrice: number;
  activityPrice: number;
}

export interface Inquiry {
  id: string;
  churchName: string;
  message: string;
  reply?: string;
  timestamp: string;
  year?: string;
}

export interface Order {
  id: string;
  churchName: string;
  country: string;
  grandTotal: number;
  timestamp: string;
  details: any[];
  year?: string;
}

export interface Participant {
  id: string;
  churchName: string;
  country: string;
  name: string;
  stage: string;
  competitions: string[];
  timestamp: string;
  year?: string;
}

export interface TeamMember {
  name: string;
  gender: 'ذكر' | 'أنثى';
  stage: string;
}

export interface ActivityTeam {
  id: string;
  churchName: string;
  activityType: string;
  members: TeamMember[];
  maleCount: number;
  femaleCount: number;
  choirLevel?: string;
  instrumentType?: string;
  timestamp: string;
  year?: string;
}

export interface Result {
  id: string;
  serial?: string;
  churchName: string;
  studentName: string;
  stage: string;
  academicScore?: number;
  memorizationScore?: number;
  q1Score?: number;
  qScore?: number;
  score: number;
  grade: string;
  attendance?: string;
  notes?: string;
  timestamp: string;
  year?: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  timestamp: number;
  year?: string;
}

export interface ExamLink {
  id: string;
  stage: string;
  url: string;
  year?: string;
}

export interface Schedule {
  id: string;
  examName: string;
  date: string;
  time: string;
  location: string;
  year?: string;
}

export interface SiteSettings {
  phone: string;
  facebook: string;
  telegram: string;
  copyright: string;
}

export interface AboutContent {
  vision: string;
  mission: string;
  aboutText: string;
}

export interface CarouselItem {
  id: string;
  url: string;
  title: string;
  order?: number;
  year?: string;
}

export interface AppConfig {
  activeYear: string;
  appLogo?: string;
}
