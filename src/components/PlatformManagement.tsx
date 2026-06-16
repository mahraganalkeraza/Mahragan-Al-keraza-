import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function PlatformManagement() {
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. أول ما تفتح لوحة التحكم.. تشيك هل التسجيل مقفول في جدول registrations؟
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('registrations')
          .select('name')
          .eq('name', 'SYSTEM_LOCK')
          .maybeSingle(); // يبحث لو الاسم ده موجود

        if (error) throw error;

        if (data) {
          // لو لقينا سطر اسمه SYSTEM_LOCK يبقى التسجيل مغلق فعلياً
          setIsRegistrationOpen(false);
        } else {
          setIsRegistrationOpen(true);
        }
      } catch (err: any) {
        console.error('خطأ في قراءة حالة الجدول:', err.message);
      } finally {
        setLoading(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  // 2. عند الضغط على الزرار: لو قفلنا.. ننسرت سطر بقيمة SYSTEM_LOCK، ولو فتحنا.. نمسحه!
  const handleToggleRegistration = async () => {
    setLoading(true);
    try {
      if (isRegistrationOpen) {
        // قفل التسجيل: هنضيف سطر وهمي في جدول الـ registrations
        const { error } = await supabase
          .from('registrations')
          .insert([{ name: 'SYSTEM_LOCK', churchName: 'SYSTEM' }]); 

        if (error) throw error;
        setIsRegistrationOpen(false);
        alert('تم قفل تسجيل المشتركين بنجاح 🔒 (جدول registrations محمي الآن)');
      } else {
        // فتح التسجيل: هنمسح السطر الوهمي من الجدول
        const { error } = await supabase
          .from('registrations')
          .delete()
          .eq('name', 'SYSTEM_LOCK');

        if (error) throw error;
        setIsRegistrationOpen(true);
        alert('تم فتح تسجيل المشتركين بنجاح 🔓');
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء تعديل حالة الجدول: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="text-center p-4 text-slate-800 font-bold">جاري فحص حالة الجداول في السوبابيز...</p>;

  return (
    <div className="p-4 bg-white rounded-lg border shadow-sm" dir="rtl">
      <h3 className="text-md font-bold mb-3 text-gray-700">التحكم في الجداول الحالية:</h3>
      
      <button
        onClick={handleToggleRegistration}
        className={`w-full p-4 rounded-xl font-black text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
          isRegistrationOpen 
            ? 'bg-rose-500 hover:bg-rose-600' 
            : 'bg-emerald-500 hover:bg-emerald-600'
        }`}
      >
        {isRegistrationOpen ? (
          <>
            <span>إغلاق التسجيل (جدول registrations) 🔒</span>
          </>
        ) : (
          <>
            <span>فتح التسجيل (جدول registrations) 🔓</span>
          </>
        )}
      </button>
    </div>
  );
}
