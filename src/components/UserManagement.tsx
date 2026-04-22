import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db, storage } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  Trash2,
  Edit2,
  Plus,
  Save,
  X,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


// Initialize secondary app for auth operations
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

interface User {
  uid: string;
  email: string;
  role: string;
  churchName: string;
  password?: string;
  logoUrl?: string;
  dashboardBg?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const usersData: User[] = [];
      snapshot.docs.forEach((doc) => {
        if (doc.data().role !== "admin") {
          usersData.push({ uid: doc.id, ...doc.data() } as User);
        }
      });
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("حدث خطأ أثناء جلب المستخدمين");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setIsEditing(user.uid);
    setEditForm({
      ...user,
      password: user.password ||  "",
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
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!editForm.churchName || !editForm.password) {
      setError("يرجى إدخال اسم الكنيسة وكلمة المرور");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      let finalLogoUrl = editForm.logoUrl || "";

      if (isAdding) {
        // Create new user
        const slug = encodeURIComponent(editForm.churchName).replace(/%/g, "");
        const email = `${slug}_${Date.now()}@mafk.com`;

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          editForm.password,
        );
        const newUid = userCredential.user.uid;
        await signOut(secondaryAuth);

        // Upload logo if exists
        if (logoFile) {
          const storageRef = ref(storage, `logos/${newUid}`);
          const uploadTask = uploadBytesResumable(storageRef, logoFile);
          finalLogoUrl = await new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              null,
              (error) => reject(error),
              async () => {
                const downloadURL = await getDownloadURL(
                  uploadTask.snapshot.ref,
                );
                resolve(downloadURL);
              },
            );
          });
        }

        const newUser: User = {
          uid: newUid,
          email,
          role: "church",
          churchName: editForm.churchName,
          password: editForm.password,
          logoUrl: finalLogoUrl,
        };

        await setDoc(doc(db, "users", newUid), newUser);
        await setDoc(doc(db, "public_churches", newUid), {
          name: editForm.churchName,
          email: email,
        });

        setSuccess("تم إضافة المستخدم بنجاح");
      } else if (isEditing) {
        // Update existing user
        const oldUser = users.find((u) => u.uid === isEditing);
        if (!oldUser) throw new Error("User not found");

        // Upload logo if exists
        if (logoFile) {
          const storageRef = ref(storage, `logos/${isEditing}`);
          const uploadTask = uploadBytesResumable(storageRef, logoFile);
          finalLogoUrl = await new Promise((resolve, reject) => {
            uploadTask.on(
              "state_changed",
              null,
              (error) => reject(error),
              async () => {
                const downloadURL = await getDownloadURL(
                  uploadTask.snapshot.ref,
                );
                resolve(downloadURL);
              },
            );
          });
        }

        // If password changed, update in Auth
        const oldPassword =
          oldUser.password || "";
        if (editForm.password !== oldPassword && oldPassword) {
          await signInWithEmailAndPassword(
            secondaryAuth,
            oldUser.email,
            oldPassword,
          );
          if (secondaryAuth.currentUser) {
            await updatePassword(secondaryAuth.currentUser, editForm.password);
            await signOut(secondaryAuth);
          }
        }

        const updatedUser = {
          ...oldUser,
          churchName: editForm.churchName,
          password: editForm.password,
          logoUrl: finalLogoUrl,
        };

        await updateDoc(doc(db, "users", isEditing), updatedUser);
        await setDoc(doc(db, "public_churches", isEditing), {
          name: editForm.churchName,
          email: oldUser.email,
        });

        // Update related collections if church name changed
        if (oldUser.churchName !== editForm.churchName && editForm.churchName) {
          const collectionsToUpdate = ['participants', 'activityTeams', 'results', 'orders', 'inquiries'];
          
          for (const collectionName of collectionsToUpdate) {
            const q = query(collection(db, collectionName), where('churchName', '==', oldUser.churchName));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              const batch = writeBatch(db);
              snapshot.docs.forEach((document) => {
                batch.update(doc(db, collectionName, document.id), { churchName: editForm.churchName });
              });
              await batch.commit();
            }
          }
        }

        setSuccess("تم تحديث بيانات المستخدم بنجاح");
      }

      await fetchUsers();
      handleCancel();
    } catch (err: any) {
      console.error("Error saving user:", err);
      setError(err.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (uid: string) => {
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, "users", uid));
      await deleteDoc(doc(db, "public_churches", uid));
      setSuccess("تم حذف المستخدم بنجاح");
      await fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      setError("حدث خطأ أثناء حذف المستخدم");
    } finally {
      setIsSaving(false);
      setUserToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800">
          إدارة المستخدمين والكنائس
        </h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
            setEditForm({});
            setError("");
            setSuccess("");
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-bold text-sm"
        >
          <Plus size={18} />
          إضافة كنيسة جديدة
        </button>
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    شعار الكنيسة (اختياري)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
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

          {users.map((user) => (
            <motion.div
              key={user.uid}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`bg-white p-6 rounded-xl shadow-sm border ${isEditing === user.uid ? "border-primary ring-2 ring-primary/20" : "border-slate-100"}`}
            >
              {isEditing === user.uid ? (
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
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      شعار الكنيسة
                    </label>
                    <div className="flex items-center gap-3">
                      {editForm.logoUrl && (
                        <img
                          src={editForm.logoUrl}
                          alt="Logo"
                          className="w-10 h-10 rounded-lg object-cover border"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
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
                      <h3 className="font-black text-slate-800 text-lg truncate">
                        {user.churchName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate font-mono mt-1">
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
                      onClick={() => handleEdit(user)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-bold text-sm"
                    >
                      <Edit2 size={16} /> تعديل
                    </button>
                    <button
                      onClick={() => setUserToDelete(user.uid)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-bold text-sm"
                    >
                      <Trash2 size={16} /> حذف
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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
