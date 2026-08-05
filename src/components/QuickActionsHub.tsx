import React from 'react';
import { Users, BookOpen, Award, Calculator, ShieldCheck, Music, ExternalLink } from 'lucide-react';

export const HYMNS_SITE_URL = "https://mahraganalkeraza.github.io/Hymens_comptetion/";

interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isExternal?: boolean;
  url?: string;
}

interface QuickActionsHubProps {
  userRole: 'admin' | 'church' | 'guest';
  onAction: (section: string) => void;
}

const QuickActionsHub: React.FC<QuickActionsHubProps> = ({ userRole, onAction }) => {
  const actions: QuickActionItem[] = [
    { id: 'exams_portal', title: 'امتحانات الأونلاين', description: 'بوابة دخول الامتحانات الإلكترونية', icon: BookOpen },
    { id: 'results', title: 'نتائج المسابقات', description: 'عرض نتائج المسابقات', icon: Award },
    { id: 'calculator', title: 'حاسبة الكتب', description: 'حساب تكلفة الكتب', icon: Calculator },
  ];

  if (userRole === 'church' || userRole === 'admin') {
    actions.unshift({ id: 'registration', title: 'تسجيل المشتركين', description: 'سجل بيانات المخدومين هنا', icon: Users });
  }

  if (userRole === 'admin') {
    actions.push({ id: 'admin_dashboard', title: 'إدارة الكنائس', description: 'إدارة الكنائس وكلمات المرور', icon: ShieldCheck });
    actions.push({ 
      id: 'hymns_judging', 
      title: 'تحكيم الألحان 🎶', 
      description: 'موقع لجنة تحكيم الألحان', 
      icon: Music, 
      isExternal: true, 
      url: HYMNS_SITE_URL 
    });
  }

  return (
    <div className="mb-12 font-arabic" dir="rtl">
      <h2 className="text-2xl font-black text-primary mb-6">وصول سريع</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action) => {
          if (action.isExternal) {
            return (
              <a
                key={action.id}
                href={action.url || HYMNS_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="quick-access-card group active:scale-95 transition-transform border border-amber-300/60 bg-gradient-to-br from-amber-50 to-amber-100/40 hover:border-amber-400 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <action.icon size={32} className="group-hover:scale-110 transition-transform text-amber-600" />
                    <ExternalLink size={16} className="text-amber-500" />
                  </div>
                  <h3 className="font-black text-lg mb-2 text-slate-800">{action.title}</h3>
                  <p className="text-xs font-bold text-slate-600">{action.description}</p>
                </div>
              </a>
            );
          }

          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="quick-access-card group active:scale-95 transition-transform text-right"
            >
              <action.icon size={32} className="mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-black text-lg mb-2">{action.title}</h3>
              <p className="text-xs font-bold opacity-80">{action.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActionsHub;
