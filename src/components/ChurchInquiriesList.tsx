import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle2, Clock, History, Loader2, FileText, AlertCircle, HelpCircle } from 'lucide-react';
import { ChurchInquiry } from '../types';

interface ChurchInquiriesListProps {
  churchName?: string;
  userProfile?: any;
}

const toUuid = (id?: string | number): string | null => {
  if (!id) return null;
  const str = String(id).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const clean = str.replace(/[^0-9a-f]/gi, '').slice(0, 12);
  const paddedHex = clean.padStart(12, '0');
  return `00000000-0000-0000-0000-${paddedHex}`;
};

export const ChurchInquiriesList: React.FC<ChurchInquiriesListProps> = ({ userProfile }) => {
  const [inquiries, setInquiries] = useState<ChurchInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMyInquiries = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const { data: { user } } = await supabase.auth.getUser();
      const rawId = user?.id || userProfile?.id;
      const currentUserId = toUuid(rawId);

      if (!currentUserId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('church_inquiries')
        .select('*')
        .eq('church_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching church inquiries:', error.message);
        setErrorMsg(`فشل جلب الاستفسارات: ${error.message}`);
      } else if (data) {
        setInquiries(data as ChurchInquiry[]);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching inquiries:', err);
      setErrorMsg(`حدث خطأ غير متوقع: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInquiries();
  }, [userProfile]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'resolved':
      case 'تم الرد':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-black">
            <CheckCircle2 size={13} /> تم الرد
          </span>
        );
      case 'in_progress':
      case 'قيد المراجعة':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-black">
            <Clock size={13} /> قيد المراجعة
          </span>
        );
      case 'closed':
      case 'مغلق':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-black">
            مغلق
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-black">
            <Clock size={13} /> قيد الانتظار
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm" dir="rtl">
        <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
        <p className="text-slate-500 font-bold text-sm">جاري تحميل استفسارات وشكاوي الكنيسة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-arabic" dir="rtl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
          <History size={20} className="text-amber-500" />
          سجل الاستفسارات والشكاوي
        </h4>
        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-black text-xs">
          {inquiries.length} طلب
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {inquiries.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
          لا توجد استفسارات أو شكاوي مسجلة حالياً.
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inq) => {
            const replyContent = inq.admin_reply || inq.reply;
            return (
              <div key={inq.id || inq.created_at} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                      inq.type === 'complaint' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {inq.type === 'complaint' ? 'شكوى' : 'استفسار'}
                    </span>
                    <h5 className="font-black text-slate-800 text-base">{inq.subject}</h5>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(inq.status)}
                    <span className="text-[11px] font-bold text-slate-400">
                      {inq.created_at ? new Date(inq.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-xs font-black text-slate-400 mb-1 flex items-center gap-1">
                    <FileText size={13} /> تفاصيل الطلب:
                  </p>
                  <p className="text-slate-700 text-sm font-bold whitespace-pre-line leading-relaxed">
                    {inq.message}
                  </p>
                </div>

                <div className="text-xs text-slate-400 font-bold">
                  المسؤول: {inq.contact_person} ({inq.phone_number})
                </div>

                {replyContent && (
                  <div className="mt-3 p-4 bg-emerald-50/90 border-r-4 border-emerald-500 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        رد لجنة التظلمات:
                      </span>
                      {inq.replied_at && (
                        <span className="text-[11px] text-emerald-600 font-bold">
                          {new Date(inq.replied_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-700 whitespace-pre-line leading-relaxed pt-1">
                      {replyContent}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChurchInquiriesList;
