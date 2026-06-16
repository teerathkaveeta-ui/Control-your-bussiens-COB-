import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  serverTimestamp, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  getDocFromServer,
  deleteDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export { doc, getDoc, setDoc, collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp, updateDoc, deleteDoc };

const googleProvider = new GoogleAuthProvider();

// Error handling logic as per instructions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL: Validate connection to Firestore on boot
async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const addTransaction = async (businessId: string, data: any) => {
  const path = `businesses/${businessId}/transactions`;
  try {
    const colRef = collection(db, path);
    return await addDoc(colRef, {
      ...data,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getRecentTransactions = async (businessId: string, limitCount = 20) => {
  const path = `businesses/${businessId}/transactions`;
  try {
    const colRef = collection(db, path);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const updateCustomerDebt = async (businessId: string, customerName: string, amount: number, phone?: string | null) => {
  const path = `businesses/${businessId}/customers`;
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('name', '==', customerName));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return await addDoc(colRef, { name: customerName, totalDebt: amount, phone: phone || null });
    } else {
      const customerDoc = snapshot.docs[0];
      const newDebt = (customerDoc.data().totalDebt || 0) + amount;
      const updateData: any = { totalDebt: newDebt };
      if (phone) updateData.phone = phone;
      const docPath = `${path}/${customerDoc.id}`;
      return await updateDoc(doc(db, docPath), updateData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getCustomers = async (businessId: string) => {
  const path = `businesses/${businessId}/customers`;
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const setShopStatus = async (isOn: boolean) => {
  const businessId = auth.currentUser?.uid;
  if (!businessId) return;
  const path = `businesses/${businessId}/settings/main`;
  try {
    const docRef = doc(db, path);
    await setDoc(docRef, { shopOn: isOn, lastSessionStart: isOn ? Date.now() : null }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getShopData = async () => {
  const businessId = auth.currentUser?.uid;
  if (!businessId) return { shopOn: false, lastSessionStart: null };
  const path = `businesses/${businessId}/settings/main`;
  try {
    const docRef = doc(db, path);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return { 
        shopOn: data.shopOn || false, 
        lastSessionStart: data.lastSessionStart || null,
        coins: data.coins || 1500,
        shopSize: data.shopSize || 'Small',
        whatsappNumber: data.whatsappNumber || '',
        whatsappApiKey: data.whatsappApiKey || '',
        geminiApiKey: data.geminiApiKey || ''
      };
    }
    return { 
      shopOn: false, 
      lastSessionStart: null, 
      coins: 1500, 
      shopSize: 'Small',
      whatsappNumber: '',
      whatsappApiKey: '',
      geminiApiKey: ''
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

// Additional sync helpers for products, notifications, etc.
export const getProducts = async (businessId: string) => {
  const path = `businesses/${businessId}/products`;
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const addProduct = async (businessId: string, product: any) => {
  const path = `businesses/${businessId}/products`;
  try {
    const colRef = collection(db, path);
    return await addDoc(colRef, product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateProduct = async (businessId: string, productId: string, product: any) => {
  const path = `businesses/${businessId}/products/${productId}`;
  try {
    const docRef = doc(db, path);
    await updateDoc(docRef, product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getNotifications = async (businessId: string) => {
  const path = `businesses/${businessId}/notifications`;
  try {
    const colRef = collection(db, path);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const addNotification = async (businessId: string, notification: any) => {
  const path = `businesses/${businessId}/notifications`;
  try {
    const colRef = collection(db, path);
    return await addDoc(colRef, { ...notification, timestamp: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const syncToCloud = async (businessId: string, key: string, data: any) => {
  const path = `businesses/${businessId}/settings/main`;
  try {
    const docRef = doc(db, path);
    await setDoc(docRef, { [key]: data }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteTransaction = async (businessId: string, transactionId: string) => {
  const path = `businesses/${businessId}/transactions/${transactionId}`;
  try {
    const docRef = doc(db, path);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

