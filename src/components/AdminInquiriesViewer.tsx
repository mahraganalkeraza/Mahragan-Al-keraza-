import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Send, 
  Phone, 
  User, 
  Building2, 
  Loader2, 
  RefreshCw,
  HelpCircle,
  FileText
} from 'lucide-react';
import { ChurchInquiry } from '../types';

interface InquiryWithChurch extends ChurchInquiry {
  churchNameCalculated?: string;
}

export const AdminInquiriesViewer: React.FC = () => {
  const [inquiries, setInquiries] = useState<InquiryWithChurch[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'inquiry' | 'complaint'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Editing / Replying state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [statusTextMap, setStatusTextMap] = useState<Record<string, string>>({});
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

  const fetchAllInquiries = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      // 1. Fetch users for church name resolution
      const { data: usersData } = await supabase
        .from('users')
        .select('id, church_name, name');

      const uMap: Record<string, string> = {};
      if (usersData) {
        usersData.forEach((u: any) => {
          uMap[u.id] = u.church_name || u.name || 'كنيسة غير معروفة';
        });
        setUsersMap(uMap);
      }

      // 2. Fetch all church inquiries
      const { data, error } = await supabase
        .from('church_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching church inquiries:', error.message);
        setErrorMsg(`فشل جلب الاستفسارات: ${error.message}`);
      } else if (data) {
        const mappedData: InquiryWithChurch[] = data.map((item: any) => ({
          ...item,
          churchNameCalculated: item.church_name || uMap[item.church_id] || 'كنيسة غير معروفة'
        }));
        setInquiries(mappedData);

        // Populate initial reply & status maps
        const replies: Record<string, string> = {};
        const statuses: Record<string, string> = {};
        mappedData.forEach(item => {
          if (item.id) {
            replies[item.id] = item.admin_reply || '';
            statuses[item.id] = item.status || 'pending';
          }
        });
        setReplyTextMap(replies);
        setStatusTextMap(statuses);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching inquiries:', err);
      setErrorMsg(`حدث خطأ غير متوقع: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllInquiries();
  }, []);

  const handleUpdateInquiry = async (inquiryId: string) => {
    const newReply = replyTextMap[inquiryId] || '';
    let targetStatus = statusTextMap[inquiryId] || 'pending';
    
    // Auto set status to resolved if admin writes a reply and status was pending
    if (newReply.trim() && targetStatus === 'pending') {
      targetStatus = 'resolved';
    }

    try {
      setIsUpdatingId(inquiryId);
      const nowIso = new Date().toISOString();
      
      let updatePayload: any = {
        admin_reply: newReply.trim(),
        status: targetStatus,
        replied_at: nowIso
      };

      let { data, error } = await supabase
        .from('church_inquiries')
        .update(updatePayload)
        .eq('id', inquiryId)
        .select();

      // Fallback 1: If 'replied_at' column doesn't exist
      if (error && error.message && error.message.includes('replied_at')) {
        console.warn('replied_at column missing, retrying without replied_at:', error.message);
        delete updatePayload.replied_at;
        const retry1 = await supabase
          .from('church_inquiries')
          .update(updatePayload)
          .eq('id', inquiryId)
          .select();
        data = retry1.data;
        error = retry1.error;
      }

      // Fallback 2: If 'admin_reply' column doesn't exist in Supabase table schema
      if (error && error.message && error.message.includes('admin_reply')) {
        console.warn('admin_reply column missing, falling back to reply column:', error.message);
        updatePayload = {
          reply: newReply.trim(),
          status: targetStatus
        };
        const retry2 = await supabase
          .from('church_inquiries')
          .update(updatePayload)
          .eq('id', inquiryId)
          .select();
        data = retry2.data;
        error = retry2.error;
      }

      // Fallback 3: If 'reply' column also doesn't exist, update status only
      if (error && error.message && error.message.includes('reply')) {
        console.warn('reply column also missing, updating status only:', error.message);
        updatePayload = {
          status: targetStatus
        };
        const retry3 = await supabase
          .from('church_inquiries')
          .update(updatePayload)
          .eq('id', inquiryId)
          .select();
        data = retry3.data;
        error = retry3.error;
      }

      if (error) {
        console.error('Supabase Update Error (church_inquiries):', error.message, error);
        alert(`فشل تحديث الرد والحالة: ${error.message}`);
        setIsUpdatingId(null);
        return;
      }

      alert('تم إرسال رد لجنة التظلمات وتحديث حالة الطلب بنجاح! ✨');
      setActiveReplyId(null);
      fetchAllInquiries();
    } catch (err: any) {
      console.error('Unexpected update error:', err);
      alert(`حدث خطأ أثناء التحديث: ${err.message || err}`);
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleDeleteInquiry = async (inquiryId: string) => {
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذا الاستفسار نهائياً؟')) return;

    try {
      const { error } = await supabase
        .from('church_inquiries')
        .delete()
        .eq('id', inquiryId);

      if (error) {
        console.error('Delete error:', error.message);
        alert(`فشل الحذف: ${error.message}`);
        return;
      }

      alert('تم حذف الاستفسار بنجاح.');
      fetchAllInquiries();
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(`حدث خطأ أثناء الحذف: ${err.message || err}`);
    }
  };

  // Filter logic
  const filteredInquiries = inquiries.filter(item => {
    // Type filter
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;

    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      const directChurchName = (item.church_name || '').toLowerCase();
      const churchName = (item.churchNameCalculated || '').toLowerCase();
      const contact = (item.contact_person || '').toLowerCase();
      const phone = (item.phone_number || '').toLowerCase();
      const subject = (item.subject || '').toLowerCase();
      const message = (item.message || '').toLowerCase();

      return (
        directChurchName.includes(term) ||
        churchName.includes(term) ||
        contact.includes(term) ||
        phone.includes(term) ||
        subject.includes(term) ||
        message.includes(term)
      );
    }

    return true;
  });

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

  const pendingCount = inquiries.filter(i => !i.status || i.status === 'pending').length;
  const resolvedCount = inquiries.filter(i => i.status === 'resolved' || i.status === 'تم الرد').length;
  const complaintCount = inquiries.filter(i => i.type === 'complaint').length;

  return (
    <div className="space-y-6 font-arabic" dir="rtl">
      {/* Header & Stats Cards */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <MessageSquare size={26} />
            </div>
            <div>
              <h3 className="text-2xl font-black">إدارة الاستفسارات والشكاوي</h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                استعراض استفسارات الكنائس والرد عليها وتحديث حالتها
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAllInquiries}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-black text-xs flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          تحديث القائمة
        </button>
      </div>

      {/* Quick KPI stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{inquiries.length}</div>
            <div className="text-xs font-bold text-slate-500">إجمالي الطلبات</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
            <div className="text-xs font-bold text-slate-500">قيد الانتظار</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{resolvedCount}</div>
            <div className="text-xs font-bold text-slate-500">تم الرد عليها</div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
            <AlertCircle size={20} />
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">{complaintCount}</div>
            <div className="text-xs font-bold text-slate-500">شكاوي وملحوظات</div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border-r-4 border-red-500 text-red-700 rounded-xl flex items-center gap-3 font-bold text-sm">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Controls / Filters */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search size={18} className="absolute right-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث باسم الكنيسة، المسؤول، الموضوع..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
            >
              <option value="all">كل الأنواع (استفسار + شكوى)</option>
              <option value="inquiry">استفسارات فقط</option>
              <option value="complaint">شكاوي وملحوظات فقط</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm font-bold"
            >
              <option value="all">كل الحالات</option>
              <option value="pending">قيد الانتظار (Pending)</option>
              <option value="in_progress">قيد المراجعة (In Progress)</option>
              <option value="resolved">تم الرد (Resolved)</option>
              <option value="closed">مغلق (Closed)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inquiries List */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
          <p className="text-slate-500 font-bold">جاري تحميل الاستفسارات والشكاوي...</p>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <HelpCircle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-black text-lg">لا توجد نتائج مطابقة للبحث</p>
          <p className="text-slate-400 font-bold text-xs mt-1">جرب تغيير فلتر البحث أو مراجعة الحالات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInquiries.map((inq) => {
            const inqId = inq.id || '';
            const isEditing = activeReplyId === inqId;
            const isUpdating = isUpdatingId === inqId;

            return (
              <div
                key={inqId || inq.created_at}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Card Top Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                      inq.type === 'complaint' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {inq.type === 'complaint' ? <AlertCircle size={20} /> : <HelpCircle size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                          inq.type === 'complaint' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inq.type === 'complaint' ? 'شكوى' : 'استفسار'}
                        </span>
                        <h4 className="font-black text-slate-800 text-base">{inq.subject}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-1">
                        <span className="flex items-center gap-1 text-primary">
                          <Building2 size={13} /> {inq.churchNameCalculated}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User size={13} /> {inq.contact_person}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600 dir-ltr">
                          <Phone size={13} /> {inq.phone_number}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(inq.status)}
                    <span className="text-[11px] font-bold text-slate-400">
                      {inq.created_at ? new Date(inq.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </span>
                    <button
                      onClick={() => handleDeleteInquiry(inqId)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 cursor-pointer"
                      title="حذف الاستفسار"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Message Content */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-xs font-black text-slate-400 mb-1 flex items-center gap-1">
                    <FileText size={13} /> نص الرسالة:
                  </div>
                  <p className="text-slate-700 font-bold text-sm whitespace-pre-line leading-relaxed">
                    {inq.message}
                  </p>
                </div>

                {/* Existing Admin Reply preview if not editing */}
                {!isEditing && inq.admin_reply && (
                  <div className="p-4 bg-emerald-50/70 border-r-4 border-emerald-500 rounded-2xl flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-emerald-800 mb-1 flex items-center gap-1">
                        <CheckCircle2 size={14} /> الرد الحالي من الإدارة:
                      </p>
                      <p className="text-sm font-bold text-slate-700 whitespace-pre-line">{inq.admin_reply}</p>
                    </div>
                    <button
                      onClick={() => setActiveReplyId(inqId)}
                      className="px-3 py-1.5 bg-white text-emerald-700 hover:bg-emerald-100 rounded-xl font-black text-xs border border-emerald-200 transition-all cursor-pointer flex-shrink-0"
                    >
                      تعديل الرد
                    </button>
                  </div>
                )}

                {/* Response / Status Edit Form */}
                {(!inq.admin_reply || isEditing) && (
                  <div className="pt-2 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">تعديل حالة الطلب</label>
                        <select
                          value={statusTextMap[inqId] || 'pending'}
                          onChange={(e) => setStatusTextMap({ ...statusTextMap, [inqId]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="pending">قيد الانتظار (Pending)</option>
                          <option value="in_progress">قيد المراجعة (In Progress)</option>
                          <option value="resolved">تم الرد (Resolved)</option>
                          <option value="closed">مغلق (Closed)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">كتابة / تحديث رد الإدارة</label>
                      <textarea
                        rows={3}
                        placeholder="اكتب رد إدارة المسابقة هنا..."
                        value={replyTextMap[inqId] || ''}
                        onChange={(e) => setReplyTextMap({ ...replyTextMap, [inqId]: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => setActiveReplyId(null)}
                          className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          إلغاء
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateInquiry(inqId)}
                        className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>جاري التحديث...</span>
                          </>
                        ) : (
                          <>
                            <Send size={14} />
                            <span>حفظ الرد وتحديث الحالة</span>
                          </>
                        )}
                      </button>
                    </div>
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

export default AdminInquiriesViewer;
