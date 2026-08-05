import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { MessageSquare, Send, History, AlertCircle, CheckCircle2, Clock, Phone, User as UserIcon, HelpCircle, FileText, Loader2, MessageCircle } from 'lucide-react';
import { ChurchInquiry } from '../types';

interface ChurchInquiryFormProps {
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

export const ChurchInquiryForm: React.FC<ChurchInquiryFormProps> = ({ churchName, userProfile }) => {
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [type, setType] = useState<'inquiry' | 'complaint'>('inquiry');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [myInquiries, setMyInquiries] = useState<ChurchInquiry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch submitted inquiries for current logged in church
  const fetchMyInquiries = async () => {
    try {
      setIsLoadingHistory(true);
      const { data: { user } } = await supabase.auth.getUser();
      const rawId = user?.id || userProfile?.id;
      const currentUserId = toUuid(rawId);

      if (!currentUserId) {
        setIsLoadingHistory(false);
        return;
      }

      const { data, error } = await supabase
        .from('church_inquiries')
        .select('*')
        .eq('church_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching church inquiries history:', error.message);
      } else if (data) {
        setMyInquiries(data as ChurchInquiry[]);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching inquiries:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMyInquiries();
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitSuccess(false);

    if (!contactPerson.trim() || !phoneNumber.trim() || !subject.trim() || !message.trim()) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة قبل الإرسال.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Fetch active auth user
      const { data: { user } } = await supabase.auth.getUser();
      const rawId = user?.id || userProfile?.id;
      const userId = toUuid(rawId) || '00000000-0000-0000-0000-000000000000';

      const currentChurchName = 
        user?.user_metadata?.church_name || 
        userProfile?.churchName || 
        userProfile?.church_name || 
        userProfile?.name || 
        churchName || 
        "كنيسة غير محددة";

      const payload: any = {
        church_id: userId,
        church_name: currentChurchName,
        contact_person: contactPerson.trim(),
        phone_number: phoneNumber.trim(),
        type: type,
        subject: subject.trim(),
        message: message.trim(),
        status: 'pending'
      };

      let { data, error } = await supabase
        .from('church_inquiries')
        .insert([payload])
        .select();

      if (error && error.message && error.message.includes('church_name')) {
        console.warn('church_name column not found in database schema, retrying insertion without church_name:', error.message);
        delete payload.church_name;
        const retry = await supabase
          .from('church_inquiries')
          .insert([payload])
          .select();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('Supabase Save Error (church_inquiries):', error.message, error);
        setErrorMessage(`فشل حفظ الطلب في قاعدة البيانات: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      if (!data || data.length === 0) {
        const errStr = 'لم يتم تأكيد حفظ الطلب في قاعدة البيانات (لم ترجع أية بيانات). يرجى مراجعة الصلاحيات.';
        console.error('Supabase Save Assertion Error:', errStr);
        setErrorMessage(errStr);
        setIsSubmitting(false);
        return;
      }

      // Success
      setSubmitSuccess(true);
      setSubject('');
      setMessage('');
      
      // Refresh history list
      fetchMyInquiries();

      // Auto clear success alert after 5s
      setTimeout(() => setSubmitSuccess(false), 5000);
    } catch (err: any) {
      console.error('Unexpected submission error:', err);
      setErrorMessage(`حدث خطأ غير متوقع: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div className="max-w-3xl mx-auto font-arabic space-y-8" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-2xl flex items-center justify-center shadow-md">
              <MessageSquare size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">قناة الاستفسارات والشكاوي</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">
                ارسل استفساراتك أو ملحوظاتك وسيقوم فريق العمل بالرد عليك قريباً
              </p>
            </div>
          </div>
          {churchName && (
            <div className="hidden sm:block px-4 py-2 bg-slate-100 text-slate-700 rounded-2xl font-black text-xs border border-slate-200">
              كنيسة: <span className="text-primary">{churchName}</span>
            </div>
          )}
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-r-4 border-red-500 text-red-700 rounded-xl flex items-start gap-3 text-sm font-bold animate-fade-in">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-500" />
            <div>{errorMessage}</div>
          </div>
        )}

        {submitSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border-r-4 border-emerald-500 text-emerald-800 rounded-xl flex items-center gap-3 text-sm font-bold animate-fade-in">
            <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-600" />
            <div>تم تسجيل ورصد الطلب بنجاح في قاعدة البيانات! سيتم مراجعته والرد عليه.</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Person */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <UserIcon size={14} className="text-slate-400" />
                اسم المسؤول / المرسل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="مثال: أ/ مينا جرجس"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm font-bold transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <Phone size={14} className="text-slate-400" />
                رقم الهاتف للتواصل <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm font-bold transition-all text-left dir-ltr"
              />
            </div>
          </div>

          {/* Request Type */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-2 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-slate-400" />
              نوع الطلب <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType('inquiry')}
                className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  type === 'inquiry'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <HelpCircle size={18} />
                <span>استفسار</span>
              </button>

              <button
                type="button"
                onClick={() => setType('complaint')}
                className={`py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  type === 'complaint'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertCircle size={18} />
                <span>شكوى / ملحوظة</span>
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" />
              عنوان الموضوع <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ملخص مختصر لموضوع الطلب"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm font-bold transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-2 flex items-center gap-1.5">
              <MessageCircle size={14} className="text-slate-400" />
              تفاصيل الرسالة <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب استفسارك أو شكواك بالتفصيل هنا..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm font-bold transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>جاري إرسال الطلب...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>إرسال الطلب الآن</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* History List */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <h4 className="font-black text-lg text-slate-800 flex items-center gap-2">
            <History size={20} className="text-amber-500" />
            سجل الاستفسارات والشكاوي السابقة
          </h4>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-black text-xs">
            {myInquiries.length} طلب
          </span>
        </div>

        {isLoadingHistory ? (
          <div className="text-center py-8 text-slate-400 font-bold flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-primary" />
            جاري تحميل السجل...
          </div>
        ) : myInquiries.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
            لا توجد استفسارات أو شكاوي مسجلة حالياً لهذه الكنيسة.
          </div>
        ) : (
          <div className="space-y-4">
            {myInquiries.map((inq) => {
              const replyContent = inq.admin_reply || inq.reply;
              return (
                <div key={inq.id || inq.created_at} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 hover:border-slate-300 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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

                  <p className="text-slate-600 text-sm font-bold bg-white p-3.5 rounded-xl border border-slate-100 mb-3 whitespace-pre-line">
                    {inq.message}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
                    <span>المسؤول: {inq.contact_person} ({inq.phone_number})</span>
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
    </div>
  );
};

export default ChurchInquiryForm;
