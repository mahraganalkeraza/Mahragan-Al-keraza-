import React, { useState } from 'react';
import { updateDoc, doc, setDoc, getDocs, query, where, writeBatch, collection } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../firebase';
import { Upload, Save, Loader2 } from 'lucide-react';

export default function ChurchSettings({ userId, churchName, country, logoUrl, email }: { userId: string, churchName: string, country: string, logoUrl?: string, email?: string }) {
  const [name, setName] = useState(churchName);
  const [countryName, setCountryName] = useState(country);
  const [logo, setLogo] = useState(logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async () => {
    setIsLoading(true);
    setSuccessMessage('');
    try {
      let finalLogoUrl = logo;
      if (logoFile) {
        const storageRef = ref(storage, `logos/${userId}`);
        const uploadTask = uploadBytesResumable(storageRef, logoFile);
        
        finalLogoUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            null, 
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      }
      await updateDoc(doc(db, 'users', userId), { churchName: name, country: countryName, logoUrl: finalLogoUrl });
      
      // Update public_churches
      if (email) {
        await setDoc(doc(db, 'public_churches', userId), {
          name: name,
          email: email
        });
      }

      // Update related collections if church name changed
      if (churchName !== name && name) {
        const collectionsToUpdate = ['participants', 'activityTeams', 'results', 'orders', 'inquiries'];
        
        for (const collectionName of collectionsToUpdate) {
          const q = query(collection(db, collectionName), where('churchName', '==', churchName));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((document) => {
              batch.update(doc(db, collectionName, document.id), { churchName: name });
            });
            await batch.commit();
          }
        }
      }

      setSuccessMessage('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
      <h2 className="text-2xl font-black text-primary mb-6">إعدادات الكنيسة: {churchName}</h2>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-black text-slate-400 uppercase mb-2 block">اسم الكنيسة</label>
          <input 
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-black text-slate-400 uppercase mb-2 block">اسم البلد</label>
          <input 
            type="text"
            value={countryName}
            onChange={e => setCountryName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-black text-slate-400 uppercase mb-2 block">شعار الكنيسة</label>
          <div className="flex items-center gap-4">
            {logo && <img src={logo} alt="Logo" className="w-16 h-16 object-cover rounded-lg" />}
            <input 
              type="file"
              accept="image/*"
              onChange={e => setLogoFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isLoading}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} {isLoading ? 'جاري الحفظ...' : 'حفظ'}
        </button>
        {successMessage && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-xl text-center text-sm font-bold">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}
