import React from 'react';
import { Users, Calendar, Award, Calculator, ShieldCheck } from 'lucide-react';

interface QuickActionsHubProps {
  userRole: 'admin' | 'church' | 'guest';
  onAction: (section: string) => void;
}

const QuickActionsHub: React.FC<QuickActionsHubProps> = ({ userRole, onAction }) => {
  const actions = [
    { id: 'schedule', title: 'جداول الامتحانات', description: 'عرض مواعيد الامتحانات', icon: Calendar },
    { id: 'results', title: 'نتائج المسابقات', description: 'عرض نتائج المسابقات', icon: Award },
    { id: 'calculator', title: 'حاسبة الكتب', description: 'حساب تكلفة الكتب', icon: Calculator },
  ];

  if (userRole === 'church' || userRole === 'admin') {
    actions.unshift({ id: 'registration', title: 'تسجيل المشتركين', description: 'سجل بيانات المخدومين هنا', icon: Users });
  }

  if (userRole === 'admin') {
    actions.push({ id: 'admin_dashboard', title: 'إدارة الكنائس', description: 'إدارة الكنائس وكلمات المرور', icon: ShieldCheck });
  }

  return (
    <div className="mb-12">
      <h2 className="text-2xl font-black text-primary mb-6">وصول سريع</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="bg-[#D4AF37] text-[#800000] p-6 rounded-2xl shadow-lg hover:bg-[#800000] hover:text-white transition-all duration-300 flex flex-col items-center text-center group"
          >
            <action.icon size={32} className="mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="font-black text-lg mb-2">{action.title}</h3>
            <p className="text-xs font-bold opacity-80">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActionsHub;
