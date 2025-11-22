import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  getDoc,
  Firestore,
  Timestamp 
} from 'firebase/firestore';
import { WalletData, INITIAL_WALLET_STATE } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCB9IIkS3DLfF0J9CWyHYtBw0AIWM_v7qY",
  authDomain: "classroomwallet-f0ae2.firebaseapp.com",
  projectId: "classroomwallet-f0ae2",
  storageBucket: "classroomwallet-f0ae2.firebasestorage.app",
  messagingSenderId: "170287908488",
  appId: "1:170287908488:web:97624f88abd595f9ae813d",
  measurementId: "G-PH4CJ157N6"
};

const COLLECTION = 'wallets';
const DOC_ID = 'classroom_v1';

let db: Firestore | null = null;
let isMockMode = false;

try {
  // Initialize Firebase
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  
  // Initialize Analytics (safe check for browser environment)
  if (typeof window !== 'undefined') {
    getAnalytics(app);
  }

  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init failed:", e);
  console.warn("Running in Mock/Local Storage Mode.");
  isMockMode = true;
}

// Local Storage Helper for Mock Mode
const LOCAL_STORAGE_KEY = 'classroom_wallet_mock_data';

const getLocalData = (): WalletData => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  return data ? JSON.parse(data) : INITIAL_WALLET_STATE;
};

const setLocalData = (data: WalletData) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  // Dispatch a custom event to trigger updates across the app (rudimentary pub/sub)
  window.dispatchEvent(new Event('local-storage-update'));
};

export const subscribeToWallet = (callback: (data: WalletData) => void) => {
  if (isMockMode || !db) {
    // Initial load
    callback(getLocalData());
    
    // Listen for local updates
    const handler = () => callback(getLocalData());
    window.addEventListener('local-storage-update', handler);
    return () => window.removeEventListener('local-storage-update', handler);
  }

  // Real Firestore
  const unsubscribe = onSnapshot(doc(db, COLLECTION, DOC_ID), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as WalletData;
      // Migration check for old data structure
      if (typeof data.classEarnings === 'number') {
         data.classEarnings = INITIAL_WALLET_STATE.classEarnings;
      }
      if (!data.settings.classes) {
        data.settings.classes = INITIAL_WALLET_STATE.settings.classes;
      }
      if (!data.settings.teacherName) {
        data.settings.teacherName = INITIAL_WALLET_STATE.settings.teacherName;
      }
      callback(data);
    } else {
      // Create if doesn't exist
      setDoc(doc(db, COLLECTION, DOC_ID), INITIAL_WALLET_STATE)
        .catch(err => console.error("Failed to create initial doc:", err));
      callback(INITIAL_WALLET_STATE);
    }
  }, (error) => {
    console.error("Firestore sync error:", error);
    // Fallback to local on error
    callback(getLocalData());
  });

  return unsubscribe;
};

export const updateWalletData = async (newData: Partial<WalletData>) => {
  if (isMockMode || !db) {
    const current = getLocalData();
    const updated = { ...current, ...newData };
    setLocalData(updated);
    return;
  }

  try {
    const docRef = doc(db, COLLECTION, DOC_ID);
    await updateDoc(docRef, newData);
  } catch (error) {
    console.error("Error updating wallet:", error);
    alert("Failed to save changes to cloud. Check internet connection.");
  }
};

export const resetWallet = async () => {
    if (isMockMode || !db) {
        setLocalData(INITIAL_WALLET_STATE);
        return;
    }
    await setDoc(doc(db, COLLECTION, DOC_ID), INITIAL_WALLET_STATE);
}

export { isMockMode };