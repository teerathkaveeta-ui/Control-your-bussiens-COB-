import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "placeholder",
  authDomain: "placeholder",
  projectId: "placeholder",
  storageBucket: "placeholder",
  messagingSenderId: "placeholder",
  appId: "placeholder",
  firestoreDatabaseId: "(default)"
};

const app = initializeApp(firebaseConfig);
const realAuth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

// Simulation mode for when Firebase is not yet configured
const isSimulated = true;

export const auth: any = isSimulated ? {
  onAuthStateChanged: (cb: any) => {
    const stored = localStorage.getItem('user');
    cb(stored ? JSON.parse(stored) : null);
    return () => {};
  },
  signOut: async () => {
    localStorage.removeItem('user');
    window.location.reload();
  },
  currentUser: JSON.parse(localStorage.getItem('user') || 'null')
} : realAuth;

export const loginWithGoogle = async () => {
  if (isSimulated) {
    const dummyUser = {
      uid: 'shopkeeper123',
      displayName: 'Apna Store Owner',
      email: 'owner@apnastore.pk',
      photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shop'
    };
    localStorage.setItem('user', JSON.stringify(dummyUser));
    window.location.reload(); // To trigger auth state change
    return dummyUser;
  }
  try {
    const result = await signInWithPopup(realAuth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const addTransaction = async (businessId: string, data: any) => {
  if (isSimulated) {
    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const newT = { id: Math.random().toString(36).substr(2, 9), ...data, timestamp: { seconds: Math.floor(Date.now() / 1000) } };
    transactions.push(newT);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    return newT;
  }
  const colRef = collection(db, 'businesses', businessId, 'transactions');
  return await addDoc(colRef, {
    ...data,
    timestamp: serverTimestamp()
  });
};

export const getRecentTransactions = async (businessId: string, limitCount = 20) => {
  if (isSimulated) {
    try {
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      if (!Array.isArray(transactions)) return [];
      
      return transactions
        .sort((a: any, b: any) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        })
        .slice(0, limitCount);
    } catch (e) {
      console.error("Local transactions parse error:", e);
      return [];
    }
  }
  const colRef = collection(db, 'businesses', businessId, 'transactions');
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateCustomerDebt = async (businessId: string, customerName: string, amount: number) => {
  if (isSimulated) {
     return;
  }
  const colRef = collection(db, 'businesses', businessId, 'customers');
  const q = query(colRef, where('name', '==', customerName));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return await addDoc(colRef, { name: customerName, totalDebt: amount });
  } else {
    const customerDoc = snapshot.docs[0];
    const newDebt = (customerDoc.data().totalDebt || 0) + amount;
    return await updateDoc(doc(db, 'businesses', businessId, 'customers', customerDoc.id), {
      totalDebt: newDebt
    });
  }
};

export const setShopStatus = async (isOn: boolean) => {
  if (isSimulated) {
    localStorage.setItem('shopOn', JSON.stringify(isOn));
    if (isOn) localStorage.setItem('lastSessionStart', Date.now().toString());
    return;
  }
};

export const getShopData = async () => {
  if (isSimulated) {
    const shopOn = JSON.parse(localStorage.getItem('shopOn') || 'false');
    const lastSessionStart = localStorage.getItem('lastSessionStart');
    return { shopOn, lastSessionStart: lastSessionStart ? parseInt(lastSessionStart) : null };
  }
  return { shopOn: false, lastSessionStart: null };
};
