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
  serial?: string;
  churchName: string;
  country: string;
  name: string;
  stage: string;
  gender?: string;
  competitions: string[];
  timestamp: string;
  year?: string;
  tshirtSize?: string;
  personalImage?: string;
}

export interface TeamMember {
  id?: string;
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
  performanceType?: string;
  timestamp: string;
  year?: string;
  members_number?: number;
  team_name?: string;
  stage_name?: string;
  church_name?: string;
}

export interface Result {
  id: string;
  serial?: string;
  churchName: string;
  studentName: string;
  gender?: string;
  stage: string;
  academicScore?: number;
  memorizationScore?: number;
  copticL1Score?: number;
  copticL2Score?: number;
  q1Score?: number;
  qScore?: number;
  score?: number;
  grade?: string;
  data?: Record<string, any>;
  timestamp: string;
  year?: string;
}

export interface Question {
  id: string;
  type: 'mcq' | 'boolean' | 'matching' | 'fill';
  text: string;
  options: string[];
  matchingPairs?: { left: string, right: string }[];
  correctAnswers: string[];
  points: number;
}

export interface Exam {
  id: string;
  stage: string;
  competitionType: 'دراسي' | 'محفوظات' | 'قبطي مستوى أول' | 'قبطي مستوى ثاني';
  model: string; // A, B, C
  questions: Question[];
  isActive: boolean;
  updatedAt: string;
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

export interface MasterTemplate {
  filename: string;
  headers: string[];
}

export interface AgeStageMapping {
  stage: string;
  minYear: number;
  maxYear: number;
}

export interface ValidationRules {
  nameLength: boolean;
  genderMatch: boolean;
  mandatoryRows: boolean;
}

export interface ValidationSettings {
  templates: MasterTemplate[];
  ageMappings: AgeStageMapping[];
  rules: ValidationRules;
}

export interface AppConfig {
  activeYear: string;
  appLogo?: string;
}
