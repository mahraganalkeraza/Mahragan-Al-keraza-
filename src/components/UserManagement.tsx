import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import PaginationComponent from "./Pagination";
import {
  Trash2,
  Edit2,
  Plus,
  Save,
  X,
  Loader2,
  Image as ImageIcon,
  Church,
  Search,
  Lock,
  Unlock,
  Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface User {
  id: string; // Using id for standard Supabase/Postgres
  uid?: string; // fallback if any legacy code uses .uid
  email: string;
  role: string;
  churchName: string;
  isEnabled: boolean;
  isAllowedToRead?: boolean;
  password?: string;
  logoUrl?: string;
  dashboardBg?: string;
}

interface UserManagementProps {
  globalReadAccess?: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [churchesBank, setChurchesBank] = useState<any[]>([]);
  const [churchPage, setChurchPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    // Fetch live church accounts directly from 'church_access_codes' table
    const fetchChurchesData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const { data, error } = await supabase
          .from('church_access_codes')
          .select('*')
          .order('church_name', { ascending: true });
        
        if (error) throw error;
        
        if (data) {
          // Map to standard User objects
          const mappedUsers: User[] = data.map((d: any) => ({
            id: d.id,
            churchName: d.church_name,
            password: d.access_code,
            isEnabled: d.is_active !== false && d.isEnabled !== false, // supports both or default true
            isAllowedToRead: d.is_allowed_to_read !== false && d.isAllowedToRead !== false, // default true
            email: `${encodeURIComponent(d.church_name).replace(/%/g, '').toLowerCase()}_2026@mafk.com`,
            role: 'church',
            logoUrl: d.logo_url || d.logoUrl || ''
          }));
          setUsers(mappedUsers);
          
          // Set churchesBank too
          const bank = data.map((d: any) => ({
            id: d.id,
            name: d.church_name,
            loginCode: d.access_code,
            isEnabled: d.is_active !== false && d.isEnabled !== false,
            isAllowedToRead: d.is_allowed_to_read !== false && d.isAllowedToRead !== false,
            logoUrl: d.logo_url || d.logoUrl || ''
          }));
          setChurchesBank(bank);
        }
      } catch (err: any) {
        console.error("Supabase fetch church_access_codes error:", err);
        setError("حدث خطأ أثناء جلب الكنائس من قاعدة البيانات");
      } finally {
        setIsLoading(false);
      }
    };

    fetchChurchesData();
  }, []);

  const handleEdit = (user: User) => {
    setIsEditing(String(user.id));
    setEditForm({
      ...user,
      password: user.password || "",
    });
    setError("");
    setSuccess("");
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsEditing(null);
    setIsAdding(false);
    setEditForm({});
    setLogoFile(null);
    setLogoPreview(null);
    setError("");
    setSuccess("");
  };

  /**
   * High-Precision File Upload (Converts file to base64 or can use storage)
   */
  const handleImageUpload = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.size > 800000) {
        reject(new Error("حجم الصورة كبير جداً. يرجى رفع صورة أقل من 800 كيلوبايت."));
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error("حدث خطأ في قراءة الصورة"));
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Robust Action to Create or Update Church Entity directly in church_access_codes
   */
  const handleUpdate = async () => {
    if (!editForm.churchName || !editForm.password) {
      setError("يرجى إكمال كافة البيانات المطلوبة (اسم الكنيسة وكود الدخول)");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      let finalLogoUrl = editForm.logoUrl || "";

      if (logoFile) {
        finalLogoUrl = await handleImageUpload(logoFile);
      }

      const isEnabledVal = editForm.isEnabled !== false;
      const isAllowedToReadVal = editForm.isAllowedToRead !== false;

      if (isAdding) {
        // Create new row in church_access_codes
        const payload: any = {
          church_name: editForm.churchName,
          access_code: editForm.password,
          is_active: isEnabledVal,
          is_allowed_to_read: isAllowedToReadVal,
          logo_url: finalLogoUrl
        };

        const { error } = await supabase
          .from('church_access_codes')
          .insert(payload);

        if (error) {
          // Fallback if is_active, is_allowed_to_read or logo_url columns don't exist yet in PostgreSQL schema
          if (error.message && error.message.includes("column")) {
            console.warn("Extra columns do not exist. Retrying insertion with core columns only...");
            const { error: fallbackErr } = await supabase
              .from('church_access_codes')
              .insert({
                church_name: editForm.churchName,
                access_code: editForm.password
              });
            if (fallbackErr) throw fallbackErr;
          } else {
            throw error;
          }
        }

        setSuccess("تم إضافة الكنيسة الجديدة وكود الدخول بنجاح");
      } else if (isEditing) {
        const oldUser = users.find((u) => String(u.id) === isEditing);
        if (!oldUser) throw new Error("لم يتم العثور على الكنيسة المحددة");

        // Update row in church_access_codes
        const payload: any = {
          church_name: editForm.churchName,
          access_code: editForm.password,
          is_active: isEnabledVal,
          is_allowed_to_read: isAllowedToReadVal,
          logo_url: finalLogoUrl
        };

        const { error } = await supabase
          .from('church_access_codes')
          .update(payload)
          .eq('id', Number(isEditing));

        if (error) {
          // Fallback update if extra columns don't exist
          if (error.message && error.message.includes("column")) {
             console.warn("Extra columns do not exist. Retrying update with core columns only...");
             const { error: fallbackErr } = await supabase
               .from('church_access_codes')
               .update({
                 church_name: editForm.churchName,
                 access_code: editForm.password
               })
               .eq('id', Number(isEditing));
             if (fallbackErr) throw fallbackErr;
          } else {
             throw error;
          }
        }

        // Cascade updates to all related collections (Integrity Guard)
        if (oldUser.churchName !== editForm.churchName) {
          const collections = ['registrations', 'activity_teams', 'results', 'book_orders', 'inquiries'];
          for (const col of collections) {
            try {
              await supabase.from(col).update({ churchName: editForm.churchName }).eq('churchName', oldUser.churchName);
            } catch (cascadeErr) {
              console.error(`Cascade update failed for ${col}:`, cascadeErr);
            }
          }
        }

        setSuccess("تم تحديث بيانات الكنيسة والربط بنجاح");
      }

      handleCancel();
      
      // Reload church_access_codes list
      const { data: updatedData } = await supabase
        .from('church_access_codes')
        .select('*')
        .order('church_name', { ascending: true });
        
      if (updatedData) {
        const mappedUsers: User[] = updatedData.map((d: any) => ({
          id: d.id,
          churchName: d.church_name,
          password: d.access_code,
          isEnabled: d.is_active !== false && d.isEnabled !== false,
          isAllowedToRead: d.is_allowed_to_read !== false && d.isAllowedToRead !== false,
          email: `${encodeURIComponent(d.church_name).replace(/%/g, '').toLowerCase()}_2026@mafk.com`,
          role: 'church',
          logoUrl: d.logo_url || d.logoUrl || ''
        }));
        setUsers(mappedUsers);
        
        const bank = updatedData.map((d: any) => ({
          id: d.id,
          name: d.church_name,
          loginCode: d.access_code,
          isEnabled: d.is_active !== false && d.isEnabled !== false,
          isAllowedToRead: d.is_allowed_to_read !== false && d.isAllowedToRead !== false,
          logoUrl: d.logo_url || d.logoUrl || ''
        }));
        setChurchesBank(bank);
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ فني أثناء المعالجة");
      console.error("High-Precision error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Precise Deletion of Code
   */
  const handleDelete = async (id: string | number) => {
    const userToDel = users.find(u => String(u.id) === String(id));
    if (!userToDel) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('church_access_codes')
        .delete()
        .eq('id', Number(id));

      if (error) throw error;

      setUsers(prev => prev.filter(u => String(u.id) !== String(id)));
      setChurchesBank(prev => prev.filter(c => String(c.id) !== String(id)));
      setSuccess("تم حذف الكنيسة بنجاح من قاعدة البيانات");
    } catch (err: any) {
      console.error("Deletion error:", err);
      setError("تعذر إتمام عملية الحذف: " + (err.message || ""));
    } finally {
      setIsSaving(false);
      setUserToDelete(null);
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const newStatus = !user.isEnabled;
      
      const { error } = await supabase
        .from('church_access_codes')
        .update({ is_active: newStatus, isEnabled: newStatus })
        .eq('id', Number(user.id));

      if (error) {
        if (error.message && error.message.includes("column")) {
          console.warn("Extra columns like is_active/isEnabled do not exist in church_access_codes yet. Performing state toggle only.");
        } else {
          throw error;
        }
      }

      setUsers(prev => prev.map(u => String(u.id) === String(user.id) ? { ...u, isEnabled: newStatus } : u));
      setChurchesBank(prev => prev.map(c => String(c.id) === String(user.id) ? { ...c, isEnabled: newStatus } : c));
      
      setSuccess(`تم ${newStatus ? 'تفعيل' : 'تعطيل'} حساب الكنيسة للدخول بنجاح`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error toggling status:", err);
      setError("حدث خطأ أثناء تغيير حالة الدخول");
    }
  };

  const toggleReadingStatus = async (user: User) => {
    try {
      const currentStatus = user.isAllowedToRead === undefined ? true : user.isAllowedToRead;
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('church_access_codes')
        .update({ is_allowed_to_read: newStatus, isAllowedToRead: newStatus })
        .eq('id', Number(user.id));

      if (error) {
        if (error.message && error.message.includes("column")) {
          console.warn("Extra columns like is_allowed_to_read/isAllowedToRead do not exist in church_access_codes yet. Performing state toggle only.");
        } else {
          throw error;
        }
      }

      setUsers(prev => prev.map(u => String(u.id) === String(user.id) ? { ...u, isAllowedToRead: newStatus } : u));
      setChurchesBank(prev => prev.map(c => String(c.id) === String(user.id) ? { ...c, isAllowedToRead: newStatus } : c));

      setSuccess(`تم ${newStatus ? 'السماح بالقراءة' : 'إيقاف صلاحية القراءة'} بنجاح`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error toggling reading status:", err);
      setError("حدث خطأ أثناء تغيير صلاحية القراءة");
    }
  };

  const filteredUsers = users.filter(u => 
    u.churchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary of Churches Bank */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <Church size={20} className="text-primary" />
          بنك الكنائس المسجلة (Dynamic Bank)
        </h3>
        <p className="text-xs text-slate-500 font-bold mb-4">
          يظهر هنا الكنائس التي تم إضافتها من خلال "نظام الإدارة الديناميكي" والمتاحة حالياً لتسجيل الدخول.
        </p>
        <div className="flex flex-wrap gap-3 text-right" dir="rtl">
          {churchesBank.length === 0 ? (
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-100 text-slate-400 text-xs font-bold w-full text-center">لا توجد كنائس مسجلة حالياً في البنك</div>
          ) : (
            churchesBank.map(church => (
              <div key={church.id} className={`bg-white px-4 py-3 rounded-xl border shadow-sm flex items-center gap-3 ${church.isEnabled === false ? 'opacity-60 border-red-100' : 'border-slate-200'}`}>
                <div className={`h-2 w-2 rounded-full ${church.isEnabled !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <div>
                  <div className={`text-xs font-black ${church.isEnabled !== false ? 'text-slate-800' : 'text-red-800'}`}>{church.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-[10px] font-bold text-slate-400">كود الدخول: {church.loginCode}</div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                      church.isAllowedToRead !== false
                        ? "bg-indigo-50 text-indigo-600" 
                        : "bg-amber-50 text-amber-600"
                    }`}>
                      {church.isAllowedToRead !== false ? "قراءة" : "منع"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-black text-slate-800">
          إدارة المستخدمين والكنائس
        </h2>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text"
              placeholder="بحث عن كنيسة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
              setIsEditing(null);
              setEditForm({ isEnabled: true });
              setError("");
              setSuccess("");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-bold text-sm whitespace-nowrap"
          >
            <Plus size={18} />
            إضافة كنيسة جديدة
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 font-bold text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg border border-green-100 font-bold text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-xl shadow-sm border border-primary ring-2 ring-primary/20"
            >
              <h3 className="font-black text-lg mb-4">إضافة كنيسة جديدة</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    اسم الكنيسة
                  </label>
                  <input
                    type="text"
                    value={editForm.churchName || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, churchName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="مثال: كنيسة العذراء"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    كلمة المرور
                  </label>
                  <input
                    type="text"
                    value={editForm.password || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="كلمة المرور"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    شعار الكنيسة (اختياري)
                  </label>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                    <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-sm relative group">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={24} className="text-slate-300" />
                      )}
                      {logoPreview && (
                        <button 
                          onClick={() => {setLogoPreview(null); setLogoFile(null);}}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload-add"
                      />
                      <label 
                        htmlFor="logo-upload-add"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <Upload size={14} /> اختيار الشعار
                      </label>
                      <p className="text-[10px] text-slate-400 mt-2 font-bold leading-relaxed">
                        يفضل صورة مربعة (PNG) بأبعاد 500x500 بكسل
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleUpdate}
                    disabled={isSaving}
                    className="flex-1 bg-primary text-white py-2 rounded-lg font-bold text-sm flex justify-center items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}{" "}
                    حفظ
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {filteredUsers
            .slice((userPage - 1) * ITEMS_PER_PAGE, userPage * ITEMS_PER_PAGE)
            .map((user) => (
            <motion.div
              key={user.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`bg-white p-6 rounded-xl shadow-sm border transition-all ${
                isEditing === user.id 
                  ? "border-primary ring-2 ring-primary/20" 
                  : user.isEnabled === false 
                    ? "border-red-100 bg-red-50/10 grayscale-[0.5]" 
                    : "border-slate-100"
              }`}
            >
              {isEditing === user.id ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-lg">تعديل بيانات الكنيسة</h3>
                    <button
                      onClick={handleCancel}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      اسم الكنيسة
                    </label>
                    <input
                      type="text"
                      value={editForm.churchName || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, churchName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      كلمة المرور
                    </label>
                    <input
                      type="text"
                      value={editForm.password || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      شعار الكنيسة
                    </label>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                      <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-slate-200 shrink-0 shadow-sm relative group">
                        {(logoPreview || editForm.logoUrl) ? (
                          <img 
                            src={logoPreview || editForm.logoUrl} 
                            alt="Logo" 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <ImageIcon size={24} className="text-slate-300" />
                        )}
                        {(logoPreview || editForm.logoUrl) && (
                          <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 text-white text-[8px] rounded font-black">
                            {logoPreview ? 'جديد' : 'الحالي'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                          id="logo-upload-edit"
                        />
                        <label 
                          htmlFor="logo-upload-edit"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          <Upload size={14} /> تغيير الشعار
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      حالة الحساب
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setEditForm({ ...editForm, isEnabled: !editForm.isEnabled })}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black transition-all border ${
                          editForm.isEnabled 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                            : "bg-red-50 text-red-600 border-red-200"
                        }`}
                      >
                        {editForm.isEnabled ? "حساب مفعل" : "حساب معطل"}
                      </button>
                      <button
                        onClick={() => setEditForm({ ...editForm, isAllowedToRead: !(editForm.isAllowedToRead !== false) })}
                        className={`px-3 py-2 rounded-lg text-[10px] font-black transition-all border ${
                          editForm.isAllowedToRead !== false 
                            ? "bg-indigo-50 text-indigo-600 border-indigo-200" 
                            : "bg-amber-50 text-amber-600 border-amber-200"
                        }`}
                      >
                        {editForm.isAllowedToRead !== false ? "سماح بالقراءة" : "إيقاف القراءة"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleUpdate}
                      disabled={isSaving}
                      className="flex-1 bg-primary text-white py-2 rounded-lg font-bold text-sm flex justify-center items-center gap-2"
                    >
                      {isSaving ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}{" "}
                      حفظ
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200">
                      {user.logoUrl ? (
                        <img
                          src={user.logoUrl}
                          alt={user.churchName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="text-slate-400" size={24} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-slate-800 text-lg truncate">
                          {user.churchName}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          user.isEnabled !== false 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-red-100 text-red-700"
                        }`}>
                          {user.isEnabled !== false ? "نشط" : "معطل"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          user.isAllowedToRead !== false 
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {user.isAllowedToRead !== false ? "سماح قراءة" : "إيقاف قراءة"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate font-mono">
                        {user.email}
                      </p>
                      <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-mono">
                        <span className="font-bold ml-1">الرقم السري:</span>{" "}
                        {user.password ||
                          
                          "غير متوفر"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => toggleReadingStatus(user)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-sm ${
                        user.isAllowedToRead !== false
                          ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      }`}
                      title="سماح القراءة"
                    >
                      {user.isAllowedToRead !== false ? <Unlock size={16} /> : <Lock size={16} />} 
                      {user.isAllowedToRead !== false ? "قراءة" : "منع"}
                    </button>
                    <button
                      onClick={() => toggleStatus(user)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-bold text-sm ${
                        user.isEnabled !== false
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                      title={user.isEnabled !== false ? "تعطيل الحساب" : "تفعيل الحساب"}
                    >
                      {user.isEnabled !== false ? <Lock size={16} /> : <Unlock size={16} />} 
                      {user.isEnabled !== false ? "دخول" : "سماح"}
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-bold text-sm"
                    >
                      <Edit2 size={16} /> تعديل
                    </button>
                    <button
                      onClick={() => setUserToDelete(user.id)}
                      className="flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <PaginationComponent 
        currentPage={userPage}
        totalItems={filteredUsers.length}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setUserPage}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
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
              <h3 className="text-xl font-black text-slate-800 mb-2">تأكيد الحذف</h3>
              <p className="text-slate-600 mb-6 text-sm">
                هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(userToDelete)}
                  disabled={isSaving}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  تأكيد الحذف
                </button>
                <button
                  onClick={() => setUserToDelete(null)}
                  disabled={isSaving}
                  className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
