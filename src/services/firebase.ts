import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCKyNxNdpOR2B7uremKq_tXp47R4GnaJ_E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ai-studio-applet-webapp-d12fa.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://ai-studio-applet-webapp-d12fa-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ai-studio-applet-webapp-d12fa",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ai-studio-applet-webapp-d12fa.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "921516578306",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:921516578306:web:d298190c9dcf5f1f41f91b"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

/**
 * Uploads a file or blob to Firebase Storage and returns the download URL.
 * @param data The file or blob to upload
 * @param path The folder path in the bucket (e.g., 'news', 'slider', 'branding')
 * @returns Promise<string> The download URL
 */
export const uploadToFirebase = async (data: File | Blob, path: string): Promise<string> => {
  const fileName = `${Date.now()}_${data instanceof File ? data.name : 'compressed_image.jpg'}`;
  const storageRef = ref(storage, `${path}/${fileName}`);
  
  const snapshot = await uploadBytes(storageRef, data);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};
