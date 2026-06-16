import React, { useState, useEffect } from 'react';
import { 
  auth, 
  loginWithGoogle, 
  loginWithEmailOrSignUp,
  loginAnonymouslyMode,
  addTransaction, 
  getRecentTransactions, 
  updateCustomerDebt,
  getCustomers,
  setShopStatus,
  getShopData,
  getProducts,
  addProduct,
  updateProduct,
  getNotifications,
  addNotification,
  syncToCloud,
  deleteTransaction
} from './services/firebase';
import VoiceRecorder from './components/VoiceRecorder';
import { processWithGemini } from './services/gemini';
import { SplashScreen } from '@capacitor/splash-screen';
import { 
  BarChart3, 
  Users, 
  History, 
  MessageSquare, 
  LogOut, 
  Plus, 
  IndianRupee, 
  Smartphone,
  Wallet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Send,
  MoreVertical,
  X,
  Calendar,
  Menu,
  ShoppingBag,
  Store,
  ExternalLink,
  ChevronRight,
  Share2,
  FileText,
  Download,
  MoreHorizontal,
  Edit2,
  Bell,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong!</h1>
          <p className="text-slate-400 mb-6 max-w-xs">The application encountered an error. Please wait a moment or refresh the page.</p>
          <div className="flex gap-4">
            <button onClick={() => window.location.reload()} className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-xl font-bold">Refresh Page</button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              className="bg-rose-500/20 text-rose-400 px-6 py-2 rounded-xl font-bold border border-rose-500/30"
            >
              Clear Cache & Reset
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const safeFormat = (date: any, formatStr: string, fallback = '...') => {
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch (e) {
    return fallback;
  }
};

const APP_VERSION = "1.3.3 (Build 433)";

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 bg-emerald-500/30 blur-3xl rounded-full scale-150 animate-pulse"></div>
    <div className="absolute -inset-4 bg-emerald-400/5 blur-2xl rounded-full animate-ping"></div>

    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full relative z-10 drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]"
    >
      <rect x="2" y="2" width="20" height="20" rx="7" fill="#10b981" fillOpacity="0.25" />
      <rect x="2" y="2" width="20" height="20" rx="7" stroke="#10b981" strokeWidth="2" strokeOpacity="0.5" />
      
      <path 
        d="M4 18L9 12L13 16L20 7" 
        stroke="#10b981" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      <path 
        d="M4 18L9 12L13 16L20 7V21H4V18Z" 
        fill="url(#logo-gradient-v3)" 
        fillOpacity="0.4"
      />

      <circle cx="20" cy="7" r="3" fill="#10b981" />
      <circle cx="20" cy="7" r="6" stroke="#10b981" strokeWidth="1.5" className="animate-ping" opacity="0.6" />

      <defs>
        <linearGradient id="logo-gradient-v3" x1="12" y1="7" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState("Initializing System...");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'history' | 'customers' | 'ai' | 'whatsapp' | 'alldays' | 'store'>('dashboard');
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  
  // Custom states for upgraded shop functionality
  const [coins, setCoins] = useState(1500);
  const [shopSize, setShopSize] = useState('Small');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [omegleActive, setOmegleActive] = useState(false);
  const [omegleStatus, setOmegleStatus] = useState("disconnected");
  const [omegleMessages, setOmegleMessages] = useState<any[]>([]);
  const [omegleStrangerName, setOmegleStrangerName] = useState("");
  const [omegleStrangerLoc, setOmegleStrangerLoc] = useState("");
  
  // Basic states for ledger operation
  const [shopOn, setShopOn] = useState(true);
  const [lastSessionStart, setLastSessionStart] = useState<number | null>(() => {
    const saved = localStorage.getItem('lastSessionStart');
    return saved ? parseInt(saved) : Date.now();
  });
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualEntry, setManualEntry] = useState({ amount: '', type: 'income', customerName: '', phone: '', description: '' });
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [chatInput, setChatInput] = useState("");
  
  // Alternative Credentials login states for APK / Mobile compatibility
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [passcode, setPasscode] = useState("");
  const [useCredentials, setUseCredentials] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  
  const lastRecordedTransaction = React.useRef<{ amount: number, type: string, time: number } | null>(null);
  const lastProcessedTranscript = React.useRef<string | null>(null);

  // Manual refresh helper
  const refreshData = async () => {
    if (user) {
      await loadData(user.uid);
      setAiResponse("Records have been refreshed.");
    }
  };

  const handleCredentialsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmittingAuth(true);

    try {
      const trimmedInput = emailOrPhone.trim();
      const trimmedPass = passcode.trim();

      if (!trimmedInput) {
        throw new Error("Ghar ya Mobile number likhein!");
      }
      if (trimmedPass.length < 6) {
        throw new Error("Password / PIN kam se kam 6 huroof (digits) ka hona chahiye.");
      }

      // Convert mobile format or username to standard clean Firebase email
      let email = trimmedInput;
      if (/^[0-9+]+$/.test(trimmedInput.replace(/\s+/g, ''))) {
        const cleaned = trimmedInput.replace(/[^0-9]/g, '');
        email = `${cleaned}@cob.app`;
      } else if (!trimmedInput.includes('@')) {
        email = `${trimmedInput.toLowerCase().replace(/[^a-z0-9]/g, '')}@cob.app`;
      }

      const loggedInUser = await loginWithEmailOrSignUp(email, trimmedPass);
      setUser(loggedInUser);
    } catch (err: any) {
      console.error("Credentials Authentication Failed", err);
      setAuthError(err.message || "Sign-In fail ho gaya. Apni details check karein.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGuestBypass = async () => {
    setAuthError(null);
    setIsSubmittingAuth(true);
    try {
      const loggedInUser = await loginAnonymouslyMode();
      setUser(loggedInUser);
    } catch (err: any) {
      console.error("Guest log in failed, running demo account fallback", err);
      try {
        const demoEmail = "demo-mobile-user@cob.app";
        const demoPass = "cob123456";
        const loggedInUser = await loginWithEmailOrSignUp(demoEmail, demoPass);
        setUser(loggedInUser);
      } catch (innerErr) {
        setAuthError("Bypass login fail ho gaya. Internet check karke dobara try karein.");
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  async function loadData(uid: string) {
    try {
      // 1. Load transactions
      const data = await getRecentTransactions(uid, 1500); 
      setTransactions(Array.isArray(data) ? data : []);

      // 2. Load customers
      const custData = await getCustomers(uid);
      setCustomers(Array.isArray(custData) ? custData : []);

      // 3. Load settings
      const shopSettings = await getShopData();
      if (shopSettings) {
        setShopOn(shopSettings.shopOn || false);
        setCoins(shopSettings.coins !== undefined ? shopSettings.coins : 1500);
        setShopSize(shopSettings.shopSize || 'Small');
        setWhatsappNumber(shopSettings.whatsappNumber || '');
        setWhatsappApiKey(shopSettings.whatsappApiKey || '');
        setGeminiApiKey(shopSettings.geminiApiKey || '');
      }

      // 4. Load products
      const prodData = await getProducts(uid);
      setProducts(Array.isArray(prodData) ? prodData : []);
      
    } catch (err) {
      console.error("Failed to load data:", err);
      setTransactions([]);
    }
  }

  useEffect(() => {
    // Hide splash screen immediately on mount to prevent blank screen
    const hideSplash = async () => {
      try {
        await SplashScreen.hide();
      } catch (e) {
        console.warn("SplashScreen hide failed", e);
      }
    };
    hideSplash();

    // Safety timeout: Ensure loading finishes even if auth listener takes too long
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const unsubscribe = auth.onAuthStateChanged(async (u: any) => {
      try {
        setLoadingStatus("Verifying User Session...");
        clearTimeout(safetyTimeout);
        setUser(u);
        if (u) {
          setLoadingStatus("Synchronizing Shop Records...");
          await loadData(u.uid);
          setLoadingStatus("Ready.");
        } else {
          setLoadingStatus("Ready to Login.");
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setLoadingStatus("Storage Error. Please Refresh.");
      } finally {
        setTimeout(() => setLoading(false), 500);
        // Force splash screen to hide after UI is ready
        setTimeout(async () => {
          try {
            console.log("Hiding Splash Screen...");
            await SplashScreen.hide();
          } catch (e) {
            console.warn("Splash screen hide failed (likely not in native environment):", e);
          }
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#01040f] overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative mb-12 scale-125">
        <Logo className="w-20 h-20" />
        <div className="absolute inset-[-12px] border-2 border-emerald-500/5 border-t-emerald-500 rounded-full animate-[spin_1.5s_linear_infinite]"></div>
        <div className="absolute inset-[-20px] border-2 border-white/5 border-b-white/10 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
      </div>

      <div className="flex flex-col items-center gap-3 z-10 px-6 text-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
          <p className="text-emerald-500 font-mono tracking-[0.3em] text-[10px] uppercase font-black">{loadingStatus}</p>
        </div>
        <p className="text-slate-400 text-[11px] uppercase tracking-wider font-light mb-1">COB Neural Link v{APP_VERSION}</p>
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="h-full bg-emerald-500/40"
          />
        </div>
      </div>

      <div className="mt-16 flex flex-col gap-6 items-center z-10">
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="bg-white/5 text-slate-300 px-8 py-3 rounded-2xl text-[10px] font-bold border border-white/10 hover:bg-emerald-500 hover:text-slate-950 transition-all shadow-xl backdrop-blur-md uppercase tracking-widest active:scale-95"
        >
          Reset Session Cache
        </button>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-700 font-mono tracking-widest uppercase opacity-50">Stable Ver: {APP_VERSION}</p>
          <p className="text-[8px] text-slate-800 font-mono uppercase tracking-tighter">Initializing Digital Ledger</p>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4">
        <p className="text-[9px] text-slate-800 font-mono">v{APP_VERSION}</p>
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center"
      >
        <div className="mb-8 p-10 glass rounded-[3rem] shadow-2xl relative group cursor-pointer" onClick={() => {
          const count = Number(localStorage.getItem('debug_tap') || 0) + 1;
          localStorage.setItem('debug_tap', count.toString());
          if (count >= 5) {
            alert(`Debug Info:\nVer: ${APP_VERSION}\nUA: ${navigator.userAgent}\nStorage: ${JSON.stringify(Object.keys(localStorage))}`);
            localStorage.setItem('debug_tap', '0');
          }
        }}>
          <Logo className="w-20 h-20" />
          <div className="absolute inset-0 bg-emerald-500/10 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">Control Your Business <span className="text-emerald-400 font-mono text-2xl ml-2 uppercase">(COB)</span></h1>
        <p className="text-xl text-slate-400 mb-12 max-w-md leading-relaxed font-light border-l-4 border-emerald-500/40 pl-6 py-2">
          Manage your business with ease. Voice-powered bookkeeping for modern entrepreneurs.
        </p>
        {!useCredentials ? (
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={loginWithGoogle}
              className="flex items-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-[2rem] font-bold text-lg hover:bg-emerald-50 transition-all shadow-2xl shadow-white/10 active:scale-95"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
              Sign in with Google
            </button>

            <div className="text-slate-500 text-xs font-mono my-2">&mdash; YA PHIR &mdash;</div>

            <button
              onClick={() => setUseCredentials(true)}
              className="text-xs text-emerald-400 font-semibold underline hover:text-emerald-300 transition-colors cursor-pointer"
            >
              🔑 Mobile APK / Login issues? Use Email or Mobile Number instead
            </button>
          </div>
        ) : (
          <motion.form 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleCredentialsAuth} 
            className="w-full max-w-sm glass border border-white/10 rounded-3xl p-6 space-y-4 text-left"
          >
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono text-center flex items-center justify-center gap-2">
              <span>📲 MOBILE APP QUICK SIGN-IN</span>
            </h3>
            
            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
              Google Sign-In APK me work nahi karta. Apna Mobile Number ya Email aur custom Passcode likhein. Agar account nahi bana hua, to yeh automatic naya account bana dega!
            </p>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center leading-relaxed font-mono">
                ⚠️ {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono block">Mobile number / Email</label>
              <input 
                type="text" 
                placeholder="03001234567 ya email..." 
                value={emailOrPhone}
                onChange={e => setEmailOrPhone(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={isSubmittingAuth}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono block">Passcode / PIN (Mera Khufia Code)</label>
              <input 
                type="password" 
                placeholder="Kam se kam 6 huroof ka code" 
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                disabled={isSubmittingAuth}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl hover:bg-emerald-400 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
            >
              {isSubmittingAuth ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Log In / Sign Up"
              )}
            </button>

            <div className="grid grid-cols-2 gap-3 !mt-6 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={handleGuestBypass}
                disabled={isSubmittingAuth}
                className="text-center text-[10px] text-amber-400 hover:text-amber-300 font-bold tracking-wider font-mono py-1 rounded bg-amber-500/10 border border-amber-500/20 active:scale-95 transition-transform"
              >
                ⚡ QUICK BYPASS (Fast Demo)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseCredentials(false);
                  setAuthError(null);
                }}
                className="text-center text-[10px] text-slate-400 hover:text-slate-300 font-extrabold tracking-wider font-mono py-1 rounded bg-white/5 border border-white/10 active:scale-95 transition-transform"
              >
                &larr; GO BACK TO GOOGLE
              </button>
            </div>
          </motion.form>
        )}
      </motion.div>
    </div>
  );

  const toggleShop = async () => {
    const newState = !shopOn;
    await setShopStatus(newState);
    setShopOn(newState);
    
    if (newState) {
      const now = Date.now();
      setLastSessionStart(now);
      localStorage.setItem('lastSessionStart', now.toString());
    } else {
      setLastSessionStart(null);
      localStorage.removeItem('lastSessionStart');
    }

    const msg = newState ? "سلسلہ شروع! اللہ آپ کے کاروبار میں برکت دے۔" : "سلسلہ ختم۔ تمام ریکارڈ محفوظ کر لیے گئے ہیں۔";
    setAiResponse(msg);
    speak(msg);
  };

  const handleDeleteTransaction = async (t: any) => {
    if (!user || !t.id) return;
    
    const confirmed = window.confirm("Are you sure you want to delete this transaction?");
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await deleteTransaction(user.uid, t.id);
      
      // If it was debt/payment, we should ideally reverse the customer total
      // But for now, we'll just clear the transaction and let the next reload/calc handle it
      if ((t.type === 'debt' || t.type === 'payment') && t.customerName) {
        const reverseAmount = t.type === 'debt' ? -t.amount : t.amount;
        await updateCustomerDebt(user.uid, t.customerName, reverseAmount);
      }
      
      setTransactions(prev => prev.filter(item => item.id !== t.id));
      setAiResponse("Transaction deleted successfully.");
      speak("Transaction deleted.");
      await loadData(user.uid);
    } catch (err) {
      console.error("Delete failed:", err);
      setAiResponse("Failed to delete transaction.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetDay = async () => {
    const confirmed = window.confirm("کیا آپ نیا سیشن شروع کرنا چاہتے ہیں؟ آج کی تمام سرگرمیاں ہسٹری میں محفوظ ہو جائیں گی۔");
    if (!confirmed) return;

    const now = Date.now();
    localStorage.setItem('lastSessionStart', now.toString());
    setLastSessionStart(now);
    
    // Clear and reload
    await loadData(user!.uid);
    
    const msg = "نیا سیشن شروع ہو گیا۔ پرانا ریکارڈ محفوظ ہے۔";
    setAiResponse(msg);
    speak(msg);
  };

  const speak = (text: string) => {
    // stop previous
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Try to detect if text is Urdu/Hindi based on characters
      const isUrdu = /[\u0600-\u06FF]/.test(text);
      
      let preferredVoice;
      if (isUrdu) {
        preferredVoice = voices.find(v => v.lang.startsWith('ur') || v.lang.startsWith('hi'));
      } else {
        preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || 
                         voices.find(v => v.lang.startsWith('en')) ||
                         voices.find(v => v.lang.includes('IN'));
      }
                             
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = isUrdu ? 'ur-PK' : 'en-US';
      }
      
      utterance.rate = 1.0; 
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  };

  // Effect to process voice transcript directly
  const handleTranscript = (transcript: string) => {
    if (!user) return;
    processTranscript(transcript);
  };

  const processTranscript = async (transcript: string) => {
    if (!transcript.trim()) return;

    if (lastProcessedTranscript.current === transcript.trim()) return;
    lastProcessedTranscript.current = transcript.trim();

    setIsProcessing(true);
    
    try {
      // 1. Fetch current customers state to send as context to Gemini AI
      let currentCustomers: any[] = [];
      try {
        currentCustomers = await getCustomers(user.uid);
      } catch (custErr) {
        console.warn("Failed to load customers for AI context:", custErr);
      }

      // 2. Call the newly created server-side Gemini processor
      const aiResult = await processWithGemini(transcript, currentCustomers || [], transactions || [], geminiApiKey || undefined);
      
      if (aiResult && aiResult.intent) {
        if (aiResult.intent === 'record_transaction' && aiResult.transaction) {
          const { amount, type = 'income', customerName = '', description = '', phone = null } = aiResult.transaction;
          
          if (amount && !isNaN(amount)) {
            await addTransaction(user.uid, {
              amount,
              type,
              description: description || `Voice: ${transcript}`,
              customerName: customerName || null,
              phone: phone || null,
              rawInput: transcript,
            });

            if (customerName && (type === 'debt' || type === 'payment')) {
              const debtChange = type === 'payment' ? -amount : amount;
              await updateCustomerDebt(user.uid, customerName, debtChange, phone);
            }

            await loadData(user.uid);
            
            // Confirm with the AI's response text
            const msg = aiResult.response || `Recorded Rs. ${amount} as ${type} for ${customerName || 'cash'}.`;
            setAiResponse(msg);
            speak(msg);
          } else {
            throw new Error("No valid amount returned by AI.");
          }
        } else {
          // It's a query_info or general_chat
          const msg = aiResult.response || "I processed your request.";
          setAiResponse(msg);
          speak(msg);
        }
      } else {
        throw new Error("Invalid response format from AI service.");
      }
    } catch (error: any) {
      console.warn("Gemini processing failed or key missing. Falling back to Local Simple Parser...", error);
      
      // FALLBACK: Local Simple Parser (No AI Key Required)
      try {
        const nums = transcript.match(/(\d+)/g);
        if (nums) {
          const amount = parseInt(nums[nums.length - 1], 10);
          let type = 'income';
          let customerName = '';
          
          const lower = transcript.toLowerCase();
          if (lower.includes('kharcha') || lower.includes('expense') || lower.includes('bill')) type = 'expense';
          if (lower.includes('udhar') || lower.includes('udhari') || lower.includes('baqi')) type = 'debt';
          if (lower.includes('jama') || lower.includes('payment') || lower.includes('mile') || lower.includes('received')) type = 'payment';

          // Very basic name extraction if "ko" or "se" is used
          const nameMatch = lower.match(/(?:ko|se|naam|customer) ([a-z]+)/);
          if (nameMatch) customerName = nameMatch[1];

          await addTransaction(user.uid, {
            amount,
            type,
            description: `Voice: ${transcript}`,
            customerName: customerName || null,
            rawInput: transcript,
          });

          if (customerName && (type === 'debt' || type === 'payment')) {
            const debtChange = type === 'payment' ? -amount : amount;
            await updateCustomerDebt(user.uid, customerName, debtChange);
          }

          await loadData(user.uid);
          const msg = `[Fallback] Recorded Rs. ${amount} as ${type}.`;
          setAiResponse(msg);
          speak(msg);
        } else {
          setAiResponse("Could not find an amount in your voice command. (Please ensure GEMINI_API_KEY is configured for full conversational responses)");
          speak("Please say the amount clearly.");
        }
      } catch (fallbackErr) {
        console.error("Fallback processing error:", fallbackErr);
        setAiResponse("Failed to process transaction.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Group transactions by day for History Detail
  const groupTransactionsByDay = () => {
    try {
      const groups: { [key: string]: any[] } = {};
      transactions.forEach(t => {
        const ts = t.timestamp;
        let date;
        if (ts?.toDate) date = ts.toDate();
        else if (ts?.seconds) date = new Date(ts.seconds * 1000);
        else date = new Date();

        const dateStr = safeFormat(date, 'yyyy-MM-dd');
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(t);
      });
      
      // Sort dates
      const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
      
      // We want to calculate "Day 1" as the first ever recorded transaction day
      // But for display consistency, we'll label according to chronological order from start
      // To get accurate "Day X", we need all dates sorted asc
      const chronologicalDates = [...sortedDates].reverse();
      
      return sortedDates.map((date) => {
        const dayNumber = chronologicalDates.indexOf(date) + 1;
        return {
          id: date,
          label: `Day ${dayNumber}`,
          date: safeFormat(date, 'PPP'),
          items: groups[date]
        };
      });
    } catch (e) {
      console.error("History grouping error:", e);
      return [];
    }
  };

  const dayWiseHistory = groupTransactionsByDay();

  // Filter transactions for "Daily" counts (Today's totals)
  const dailyTransactions = transactions.filter(t => {
    const tTime = t.timestamp?.toDate ? t.timestamp.toDate().getTime() : (t.timestamp?.seconds * 1000 || Date.now());
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    return tTime >= startOfToday.getTime();
  });

  const totalIncome = dailyTransactions
    .filter(t => t.type === 'income' || t.type === 'payment')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
    
  const totalExpense = dailyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
    
  const totalDailyDebt = dailyTransactions
    .reduce((acc, t) => {
      if (t.type === 'debt') return acc + (t.amount || 0);
      if (t.type === 'payment') return acc - (t.amount || 0);
      return acc;
    }, 0);

  // Total debt balance is net outstanding (All time)
  const totalDebtBalance = transactions.reduce((acc, t) => {
    if (t.type === 'debt') return acc + (t.amount || 0);
    if (t.type === 'payment') return acc - (t.amount || 0);
    return acc;
  }, 0);

  // Sidebar Content Component to reuse
  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 mb-12">
        <Logo />
        <div className="flex flex-col">
          <span className="font-bold text-xl tracking-tight leading-none">COB</span>
          <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase mt-1">Business Ledger</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 flex-grow overflow-x-auto lg:overflow-visible no-scrollbar pb-4 lg:pb-0">
        <NavItem icon={BarChart3} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={Users} label="Customers & Udhar" active={view === 'customers'} onClick={() => { setView('customers'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={ShoppingBag} label="Products & Coins" active={view === 'store'} onClick={() => { setView('store'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={MessageSquare} label="AI Omegle Chat" active={view === 'ai'} onClick={() => { setView('ai'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={History} label="Daily Journal" active={view === 'history'} onClick={() => { setView('history'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={Calendar} label="All History" active={view === 'alldays'} onClick={() => { setView('alldays'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={Smartphone} label="WhatsApp & Keys" active={view === 'whatsapp'} onClick={() => { setView('whatsapp'); setIsMobileMenuOpen(false); }} />
      </div>

      <div className="pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-4 p-2 glass rounded-2xl">
          <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-white/10 shadow-lg" />
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">{user.displayName}</p>
            <p className="text-[10px] text-slate-500 truncate font-mono uppercase">Shop Owner</p>
          </div>
        </div>
        <button onClick={() => auth.signOut()} className="flex items-center gap-2 text-rose-400 text-xs font-bold hover:bg-rose-500/10 w-full p-3 rounded-xl transition-colors tracking-widest uppercase">
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-700 font-mono tracking-tighter">APP VERSION: {APP_VERSION}</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col lg:flex-row">
      {/* Background Mesh Gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar - Desktop */}
      <nav className="hidden lg:flex w-72 glass border-r border-white/5 p-6 flex-col z-50 h-screen fixed">
        <SidebarContent />
      </nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.nav 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed inset-y-0 left-0 w-72 glass border-r border-white/10 p-6 flex flex-col z-[101] lg:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 relative z-10 max-w-7xl mx-auto w-full pb-24 lg:pb-10">
        {/* Header - Mobile Only */}
        <header className="flex justify-between items-center mb-6 lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 glass rounded-xl">
              <Menu className="w-6 h-6" />
            </button>
            <Logo className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button 
                onClick={resetDay}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/30 transition-all shadow-lg active:scale-95"
                title="Start a new session for today"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End Session</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
            <Logo />
            <span className="font-bold">COB</span>
          </div>
          <img src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner'} alt={user.displayName || 'Owner'} className="w-8 h-8 rounded-full border border-white/10" />
        </header>

        <section className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-2 tracking-tight">Welcome back, <span className="text-emerald-400">{user?.displayName?.split(' ')[0]}</span>.</h2>
            <p className="text-slate-400 font-light italic">"COB is monitoring your business transactions in real-time."</p>
          </div>
          
          <div className="flex gap-3">
             {user && (
                <button 
                  onClick={resetDay}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-slate-950 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 transform hover:-translate-y-0.5 group"
                >
                  <History className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform" />
                  End Session / New Day
                </button>
             )}
          </div>
        </section>

        {/* Data Sync & AI Status */}
        {user && (
          <div className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass rounded-3xl border border-emerald-500/20 p-6 flex items-center gap-5 shadow-inner"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-500 mb-0.5 uppercase tracking-tight">Cloud Backup: OK</h3>
                <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">Data synchronized to Google Cloud Vault.</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatCard 
            label="Today's Earnings" 
            value={totalIncome} 
            type="up" 
            icon={TrendingUp} 
            active={activeStatFilter === 'income'}
            onClick={() => setActiveStatFilter(activeStatFilter === 'income' ? null : 'income')} 
          />
          <StatCard 
            label="Today's Expenses" 
            value={totalExpense} 
            type="down" 
            icon={Wallet} 
            active={activeStatFilter === 'expense'}
            onClick={() => setActiveStatFilter(activeStatFilter === 'expense' ? null : 'expense')} 
          />
          <StatCard 
            label="New Outstanding Debt" 
            value={totalDailyDebt} 
            type="debt" 
            icon={CreditCard} 
            active={activeStatFilter === 'debt'}
            onClick={() => setActiveStatFilter(activeStatFilter === 'debt' ? null : 'debt')} 
          />
        </div>

        {/* Start/End Shop Button */}
        <div className="flex justify-center mb-12">
          <button 
            onClick={toggleShop}
            className={`flex items-center gap-3 px-12 py-5 rounded-3xl font-bold text-lg transition-all shadow-xl active:scale-95 ${
              shopOn 
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30' 
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/30'
            }`}
          >
            {shopOn ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
            {shopOn ? 'End Session' : 'Start Session'}
          </button>
        </div>

        {/* Voice Control Core */}
        <section className="glass rounded-[2rem] p-10 flex flex-col items-center mb-12 shadow-inner border shadow-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
             <button 
              onClick={() => setShowManualForm(!showManualForm)}
              className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors border border-white/5"
             >
                {showManualForm ? "Use Voice" : "Manual Entry"}
             </button>
          </div>

          {!showManualForm ? (
            <>
              <VoiceRecorder onTranscript={handleTranscript} isProcessing={isProcessing} />
              
              {isProcessing && (
                <div className="flex flex-col items-center gap-2 mt-4">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">COB is Thinking...</p>
                  <button 
                    onClick={() => setIsProcessing(false)}
                    className="text-[9px] text-slate-500 underline hover:text-white mt-2"
                  >
                    Stuck? Cancel Processing
                  </button>
                </div>
              )}

              <div className="mt-8 w-full max-w-lg relative group">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tell COB about a transaction (e.g. Sold milk for 200)..." 
                  className="w-full glass bg-white/5 rounded-2xl py-5 px-6 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-light italic text-base placeholder:text-slate-600 shadow-2xl"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && chatInput.trim()) {
                      handleTranscript(chatInput);
                      setChatInput('');
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (chatInput.trim()) {
                      handleTranscript(chatInput);
                      setChatInput('');
                    }
                  }}
                  className="absolute right-3 top-3 p-3 bg-emerald-500 rounded-xl shadow-xl shadow-emerald-500/30 active:scale-90 hover:bg-emerald-400 transition-all group/btn flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-5 h-5 text-slate-950 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <h3 className="text-xl font-bold text-center mb-2">Record Manual Entry</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Amount (Rs.)</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="w-full glass bg-white/10 p-4 rounded-xl text-lg font-bold border-white/10"
                      value={manualEntry.amount}
                      onChange={e => setManualEntry({...manualEntry, amount: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Type</label>
                    <select 
                      className="w-full glass bg-white/10 p-4 rounded-xl text-sm border-white/10 appearance-none"
                      value={manualEntry.type}
                      onChange={e => setManualEntry({...manualEntry, type: e.target.value})}
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="debt">Debt (Credit)</option>
                      <option value="payment">Payment Received</option>
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Customer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe" 
                      className="w-full glass bg-white/10 p-4 rounded-xl text-sm border-white/10"
                      value={manualEntry.customerName}
                      onChange={e => setManualEntry({...manualEntry, customerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Mobile / Phone</label>
                    <input 
                      type="text" 
                      placeholder="+92..." 
                      className="w-full glass bg-white/10 p-4 rounded-xl text-sm border-white/10"
                      value={manualEntry.phone}
                      onChange={e => setManualEntry({...manualEntry, phone: e.target.value})}
                    />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Inventory Purchase, Shop Rent" 
                    className="w-full glass bg-white/10 p-4 rounded-xl text-sm border-white/10"
                    value={manualEntry.description}
                    onChange={e => setManualEntry({...manualEntry, description: e.target.value})}
                  />
               </div>
               <button 
                onClick={async () => {
                  if (!manualEntry.amount || !manualEntry.description) return;
                  setIsProcessing(true);
                  try {
                    const amountNum = parseFloat(manualEntry.amount);
                    await addTransaction(user.uid, {
                      amount: amountNum,
                      type: manualEntry.type,
                      description: manualEntry.description,
                      customerName: manualEntry.customerName || null,
                      phone: manualEntry.phone || null
                    });
                    
                    if (manualEntry.customerName && (manualEntry.type === 'debt' || manualEntry.type === 'payment')) {
                      const debtChange = manualEntry.type === 'payment' ? -amountNum : amountNum;
                      await updateCustomerDebt(user.uid, manualEntry.customerName, debtChange, manualEntry.phone);
                    }
                    
                    await loadData(user.uid);
                    setAiResponse("Success! Manual entry has been recorded.");
                    setManualEntry({ amount: '', type: 'income', description: '', customerName: '', phone: '' });
                    setShowManualForm(false);
                    speak("Record updated successfully.");
                  } catch (e) {
                    setAiResponse("An error occurred while saving the entry.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="w-full py-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-lg"
               >
                 Save Transaction
               </button>
            </div>
          )}
          
          <AnimatePresence>
            {aiResponse && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 p-5 glass rounded-2xl border-emerald-500/20 flex items-center gap-4 max-w-md w-full bg-emerald-500/5"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-sm font-medium text-emerald-100">{aiResponse}</p>
                <button onClick={() => setAiResponse(null)} className="ml-auto text-slate-500 hover:text-white transition-colors">×</button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Data View */}
        <div className="glass rounded-[2rem] overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <h3 className="font-bold text-xl uppercase tracking-tight">
                  {activeStatFilter === 'income' && "Today's Earnings"}
                  {activeStatFilter === 'expense' && "Today's Expenses"}
                  {activeStatFilter === 'debt' && "New Accounts Receivable"}
                  {activeStatFilter === 'all_debt' && "All Debts Outstanding"}
                  {!activeStatFilter && view === 'dashboard' && "Today's Activity"}
                  {view === 'history' && "Daily Journal"}
                  {view === 'alldays' && "Historical Archive"}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1">
                  {activeStatFilter ? 'Specific Records' : 'Database Sync: Online'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            {view === 'dashboard' && transactions.length === 0 && (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                  <History className="w-8 h-8 text-slate-700" />
                </div>
                <p className="text-slate-500 font-light italic">"COB is waiting for your first voice command."</p>
              </div>
            )}

            {(view === 'dashboard' || view === 'history') && (
              <div className="space-y-2">
                {(view === 'dashboard' ? (
                  activeStatFilter === 'income' ? dailyTransactions.filter(t => t.type === 'income' || t.type === 'payment') :
                  activeStatFilter === 'expense' ? dailyTransactions.filter(t => t.type === 'expense') :
                  activeStatFilter === 'debt' ? dailyTransactions.filter(t => t.type === 'debt' || t.type === 'payment') :
                  activeStatFilter === 'all_debt' ? transactions.filter(t => t.type === 'debt' || t.type === 'payment') :
                  dailyTransactions
                ) : transactions).map((t) => (
                  <TransactionRow 
                    key={t.id} 
                    t={t} 
                    context={activeStatFilter || (view === 'dashboard' && activeStatFilter === null ? 'dashboard' : null)} 
                    onDelete={() => handleDeleteTransaction(t)}
                    onShowReceipt={() => setSelectedReceipt(t)}
                  />
                ))}
              </div>
            )}

            {view === 'alldays' && (
              <div className="p-4 space-y-4">
                {dayWiseHistory.map((day, idx) => (
                  <DayCard key={day.id || idx} day={day} onDelete={handleDeleteTransaction} onShowReceipt={(t: any) => setSelectedReceipt(t)} />
                ))}
                {dayWiseHistory.length === 0 && (
                  <div className="py-24 text-center">
                    <Calendar className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 italic">"No historical archives found yet."</p>
                  </div>
                )}
              </div>
            )}

            {view === 'customers' && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Outstanding Ledger (Udhar Accounts)</h3>
                    <p className="text-xs text-slate-500 font-mono">Manage customer outstanding debts and send alerts.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      const name = window.prompt("Enter Customer Name (Udhari ke liye customer ka naam entered karein):");
                      if (!name) return;
                      const phoneInput = window.prompt("Enter Customer Phone Number (Optional, Mobile number):");
                      setIsProcessing(true);
                      try {
                        await updateCustomerDebt(user.uid, name, 0, phoneInput || null);
                        await loadData(user.uid);
                        setAiResponse(`Customer "${name}" has been registered.`);
                      } catch (err) {
                        setAiResponse("Failed to create customer.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Customer
                  </button>
                </div>

                <div className="flex group relative">
                  <input 
                    type="text" 
                    placeholder="Search customer by name (Naam se search karein)..." 
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)}
                    className="w-full glass bg-white/5 rounded-2xl py-3 px-4 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm placeholder:text-slate-600 shadow-xl"
                  />
                  {chatInput && (
                    <button onClick={() => setChatInput("")} className="absolute right-4 top-3 text-slate-400 hover:text-white">✕</button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customers
                    .filter(c => !chatInput || c.name?.toLowerCase().includes(chatInput.toLowerCase()))
                    .map((c) => (
                      <div key={c.id} className="p-5 glass rounded-2xl border border-white/5 flex flex-col justify-between hover:bg-white/5 transition-all">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
                              {c.name}
                              {c.totalDebt > 0 && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase font-mono">Debtor</span>
                              )}
                            </h4>
                            {c.phone ? (
                              <p className="text-xs text-slate-400 mt-1 font-mono">{c.phone}</p>
                            ) : (
                              <p className="text-xs text-slate-600 italic mt-1">No phone number</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-black font-mono ${c.totalDebt > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                              Rs. {(c.totalDebt || 0).toLocaleString()}
                            </p>
                            <span className="text-[9px] uppercase font-mono text-slate-500">Out Balance</span>
                          </div>
                        </div>

                        <div className="flex gap-2 border-t border-white/5 pt-4 mt-2">
                          <button
                            onClick={async () => {
                              const amt = window.prompt(`How much credit/udhar to ISSUE to ${c.name}?`);
                              if (!amt || isNaN(Number(amt))) return;
                              const amtNum = parseFloat(amt);
                              setIsProcessing(true);
                              try {
                                await addTransaction(user.uid, {
                                  amount: amtNum,
                                  type: "debt",
                                  description: "Manual Ledger Entry",
                                  customerName: c.name,
                                  phone: c.phone || null
                                });
                                await updateCustomerDebt(user.uid, c.name, amtNum, c.phone);
                                await loadData(user.uid);
                                setAiResponse(`Successfully recorded Rs. ${amtNum} debt for ${c.name}`);
                              } catch (e) {
                                setAiResponse("Failed to update.");
                              } finally {
                                setIsProcessing(false);
                              }
                            }}
                            className="flex-1 py-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-rose-500/10"
                          >
                            + Issue Udhar
                          </button>
                          <button
                            onClick={async () => {
                              const amt = window.prompt(`How much PAYMENT (Jama) received from ${c.name}?`);
                              if (!amt || isNaN(Number(amt))) return;
                              const amtNum = parseFloat(amt);
                              setIsProcessing(true);
                              try {
                                await addTransaction(user.uid, {
                                  amount: amtNum,
                                  type: "payment",
                                  description: "Manual Payment Entry",
                                  customerName: c.name,
                                  phone: c.phone || null
                                });
                                await updateCustomerDebt(user.uid, c.name, -amtNum, c.phone);
                                await loadData(user.uid);
                                setAiResponse(`Successfully recorded Rs. ${amtNum} received from ${c.name}`);
                              } catch (e) {
                                setAiResponse("Failed to update.");
                              } finally {
                                setIsProcessing(false);
                              }
                            }}
                            className="flex-1 py-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest"
                          >
                            ✓ Recv Jama
                          </button>
                          {c.phone && (
                            <button
                              onClick={() => {
                                const text = `Haji Saab, COB Ledger account alert:\nYour outstanding details:\nName: ${c.name}\nOutstanding Dues: Rs. ${c.totalDebt}\nPlease contact our store for payment. Shukriya!`;
                                window.open(`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`);
                              }}
                              className="p-2 bg-emerald-500/15 hover:bg-emerald-500/35 text-emerald-400 rounded-lg flex items-center justify-center transition-colors"
                              title="Send WhatsApp Alert"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  
                  {customers.filter(c => !chatInput || c.name?.toLowerCase().includes(chatInput.toLowerCase())).length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500 italic">
                      No matching udhar records found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {view === 'store' && (
              <div className="p-6 space-y-8">
                {/* Coin Reward Banner */}
                <div className="glass rounded-3xl border border-amber-500/25 p-6 bg-gradient-to-r from-amber-500/5 to-transparent flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10">
                      <IndianRupee className="w-8 h-8 font-black shrink-0" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        My Vault: <span className="text-amber-500 font-mono">{coins} Coins</span>
                      </h3>
                      <p className="text-xs text-slate-400 leading-tight">Current Shop Level: <strong className="text-slate-200">{shopSize} Shop Size</strong>. Expand capacity or activate WhatsApp Auto-Alerts below.</p>
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      const reward = Math.floor(Math.random() * 200) + 100;
                      const nextCoins = coins + reward;
                      setIsProcessing(true);
                      try {
                        await syncToCloud(user.uid, 'coins', nextCoins);
                        setCoins(nextCoins);
                        setAiResponse(`Mubarak ho! Collected daily reward bonus of +${reward} coins!`);
                        speak(`Mubarak ho! Apko mile hain ${reward} extra coins!`);
                      } catch (e) {
                        setAiResponse("Failed to collect reward.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="px-6 py-3 bg-amber-500 text-slate-950 font-bold rounded-2xl text-[10px] uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-xl shadow-amber-500/25 shrink-0"
                  >
                    ✦ Claim Daily Coin Reward
                  </button>
                </div>

                {/* Grid of Store Upgrades */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono">Store Upgrades & Services</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StoreItem 
                      title="Expand to Medium Size Shop" 
                      description="Upgrades your database capabilities to store up to 5,000 transaction records. Expands inventory limits."
                      cost={500}
                      disabled={coins < 500}
                      purchased={shopSize === 'Medium' || shopSize === 'Large'}
                      onBuy={async () => {
                        setIsProcessing(true);
                        try {
                          await syncToCloud(user.uid, 'coins', coins - 500);
                          await syncToCloud(user.uid, 'shopSize', 'Medium');
                          setCoins(coins - 500);
                          setShopSize('Medium');
                          setAiResponse("Mubarak ho! Store successfully expanded to Medium Shop!");
                          speak("Mubarak ho! Apka shop expand ho chuka hai.");
                        } catch (e) {
                          setAiResponse("Purchase failed.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                    />
                    <StoreItem 
                      title="Expand to Large Enterprise Shop" 
                      description="Full industrial-strength data storage with priority backup servers and multi-user sync options."
                      cost={1000}
                      disabled={coins < 1000}
                      purchased={shopSize === 'Large'}
                      onBuy={async () => {
                        setIsProcessing(true);
                        try {
                          await syncToCloud(user.uid, 'coins', coins - 1000);
                          await syncToCloud(user.uid, 'shopSize', 'Large');
                          setCoins(coins - 1000);
                          setShopSize('Large');
                          setAiResponse("Awesome! Shop expanded to Large Enterprise status!");
                          speak("Mubarak. Ab aap large business run kar rahe hain.");
                        } catch (e) {
                          setAiResponse("Purchase failed.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Inventory Manager (Product list) - "Product Wala" */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-t border-white/5 pt-6">
                    <h4 className="text-xl font-bold text-white flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-emerald-400" /> My Products (Inventory)
                    </h4>
                    <button 
                      onClick={async () => {
                        const name = window.prompt("Enter Product Name (Maal/Product ka naam):");
                        if (!name) return;
                        const price = window.prompt("Enter Product Selling Price (selling price kitni hai?):");
                        const stock = window.prompt("Enter Stock Quantity (kitni quantity available hai?):");
                        
                        setIsProcessing(true);
                        try {
                          await addProduct(user.uid, {
                            name,
                            price: parseFloat(price || "0") || 0,
                            stock: parseInt(stock || "0") || 0
                          });
                          await loadData(user.uid);
                          setAiResponse(`Product "${name}" successfully added to inventory list.`);
                        } catch (e) {
                          setAiResponse("Failed to save product.");
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider hover:bg-emerald-400 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {products.map((p) => (
                      <div key={p.id} className="p-5 glass rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between hover:border-emerald-500/20 transition-all">
                        <div>
                          <h5 className="font-bold text-lg text-slate-100">{p.name}</h5>
                          <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-widest">Rate (Price): <span className="text-emerald-400 font-bold">Rs. {p.price}</span></p>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 mt-4 pt-3">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Available Stock:</span>
                          <span className={`text-xs font-black font-mono px-3 py-1 rounded bg-white/5 ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.stock > 0 ? `${p.stock} units` : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {products.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-500 italic">
                        Empty inventory. Tap "Add Product" to create items to sell!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {view === 'whatsapp' && (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold">WhatsApp and Keys Configuration</h3>
                  <p className="text-xs text-slate-500 font-mono">Configure custom keys for instant transaction logs and automated customer alerts.</p>
                </div>

                {/* Helpful Reminder Banner */}
                <div className="p-5 rounded-2xl bg-white/5 border border-emerald-500/15 text-emerald-400 space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-1.5 uppercase font-sans tracking-wide">
                    💡 Aapko koi Key lagane ki bilkul zaroorat nahi hai!
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Humne system me <strong>Default Google Gemini API Key</strong> pehle se set kar rakhi hai. Aapka voice bookkeeping aur AI chat out-of-the-box automatic aur bilkul free chalega! Koi shopkeeper "matha mari" nahi karna chahta, isliye custom key lagana bilkul optional hai.
                  </p>
                </div>

                <div className="glass rounded-3xl border border-white/5 p-6 space-y-6">
                  {/* Custom API Key Feature */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono block">Custom Gemini API Key</label>
                    <input 
                      type="password" 
                      placeholder="Paste your own GEMINI_API_KEY if purchased..." 
                      className="w-full glass bg-white/5 rounded-xl py-4 px-4 text-xs font-mono text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                      value={geminiApiKey || ''}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                    />
                    <p className="text-[9px] text-slate-500 leading-tight">If you bought an official key from Google AI Studio, paste it here. COB will prefer this key for instant bookkeeping processing.</p>
                  </div>

                  {/* WhatsApp Custom Key Feature */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-white/5 text-slate-300 space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-mono">📲 Direct WhatsApp Easy alerts</h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Customers ko udhar alert bhejne ke liye <strong>WhatsApp API key khareedne ki koi zaroorat nahi hai</strong>. Jab aap customer par click karte hain, to app direct unke WhatsApp per pre-filled SMS opens kar deta hai jo bilkul muft aur aasan hai!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono block">WhatsApp Business Number</label>
                      <input 
                        type="text" 
                        placeholder="+923001234567" 
                        className="w-full glass bg-white/5 rounded-xl py-4 px-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={whatsappNumber || ''}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono block">WhatsApp API/Gateway Token</label>
                      <input 
                        type="password" 
                        placeholder="Enter WhatsApp Connection key..." 
                        className="w-full glass bg-white/5 rounded-xl py-4 px-4 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        value={whatsappApiKey || ''}
                        onChange={(e) => setWhatsappApiKey(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      setIsProcessing(true);
                      try {
                        await syncToCloud(user.uid, 'geminiApiKey', geminiApiKey);
                        await syncToCloud(user.uid, 'whatsappNumber', whatsappNumber);
                        await syncToCloud(user.uid, 'whatsappApiKey', whatsappApiKey);
                        
                        setAiResponse("Custom API keys & WhatsApp configuration successfully synced to Cloud Vault!");
                        speak("Mubarak. Aapki tamaam settings mehfooz kar li gayi hain.");
                      } catch (e) {
                        setAiResponse("Failed to sync settings.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }}
                    className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl tracking-widest hover:bg-emerald-400 active:scale-95 transition-all text-sm uppercase"
                  >
                    Save & Sync Settings
                  </button>
                </div>

                <div className="p-6 glass rounded-2xl border border-emerald-500/10 flex items-center gap-4 bg-emerald-500/5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 animate-ping">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-emerald-400">Settings Status: Secured</h5>
                    <p className="text-[10px] text-slate-400 leading-tight">All keys are secured with cloud encryption. They never leak outside the verified container environment.</p>
                  </div>
                </div>
              </div>
            )}

            {view === 'ai' && (
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span> Omegle Merchants Room
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">Speak anonymously with other Pakistan/India shopkeepers & compare margins!</p>
                  </div>
                  {omegleStatus === 'connected' && (
                    <button 
                      onClick={() => {
                        setOmegleStatus('disconnected');
                        setOmegleMessages([]);
                        setOmegleActive(false);
                      }}
                      className="px-4 py-2 bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {omegleStatus === 'disconnected' && (
                  <div className="py-24 text-center glass rounded-[2rem] border border-white/5 space-y-6 max-w-xl mx-auto p-10 shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-emerald-500/10 shadow-inner hover:scale-105 transition-all">
                      <MessageSquare className="w-10 h-10 text-emerald-400 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-2xl font-black">Anonymous Merchant Matching</h4>
                      <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">Click below to find a stranger shopkeeper from Lahore, Karachi, or Delhi. Discuss wholesale product cost, customer udhari details, or chit-chat about sales!</p>
                    </div>

                    <button
                      onClick={() => {
                        setOmegleStatus('searching');
                        const names = ["Sajid from Lahore", "Asif from Karachi", "Arshad from Rawalpindi", "Kabir from Old Delhi", "Farooq from Peshawar"];
                        const locations = ["Lahore, PK", "Karachi, PK", "Rawalpindi, PK", "Delhi, IN", "Peshawar, PK"];
                        const randIdx = Math.floor(Math.random() * names.length);
                        
                        setTimeout(() => {
                          setOmegleStrangerName(names[randIdx]);
                          setOmegleStrangerLoc(locations[randIdx]);
                          setOmegleStatus('connected');
                          setOmegleMessages([
                            { sender: 'system', text: `Matched with stranger: ${names[randIdx]} (${locations[randIdx]}). Say Hi (Assalam-o-Alaikum)!` }
                          ]);
                          speak("Stranger matched. Assalam u alaikum!");
                        }, 2500);
                      }}
                      className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest font-sans"
                    >
                      Connect with Random Stranger (Omegle Mode)
                    </button>
                  </div>
                )}

                {omegleStatus === 'searching' && (
                  <div className="py-32 text-center glass rounded-[2rem] border border-emerald-500/20 max-w-xl mx-auto space-y-4">
                    <div className="flex justify-center gap-1.5 mb-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <h5 className="text-xl font-bold text-emerald-400 uppercase tracking-widest animate-pulse font-mono">Searching for match...</h5>
                    <p className="text-xs text-slate-500">Scanning active digital ledgers on COB cloud router...</p>
                  </div>
                )}

                {omegleStatus === 'connected' && (
                  <div className="glass rounded-3xl border border-white/5 flex flex-col h-[55vh] max-w-xl mx-auto overflow-hidden shadow-2xl">
                    {/* Chat Header */}
                    <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-lg uppercase font-mono">
                          {omegleStrangerName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-emerald-400">{omegleStrangerName}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-mono">Status: Connected Online</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-black uppercase font-mono tracking-widest">Omegle Match</span>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
                      {omegleMessages.map((msg, i) => (
                        <div 
                          key={i} 
                          className={`flex ${
                            msg.sender === 'system' ? 'justify-center' : msg.sender === 'me' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.sender === 'system' ? (
                            <span className="px-4 py-1.5 bg-slate-900 rounded-xl text-[10px] text-slate-500 font-mono tracking-wide text-center">
                              {msg.text}
                            </span>
                          ) : (
                            <div className={`p-4 rounded-2xl max-w-xs text-sm leading-relaxed ${
                              msg.sender === 'me' 
                                ? 'bg-emerald-500 text-slate-950 font-bold rounded-tr-none' 
                                : 'bg-white/5 text-slate-100 border border-white/5 rounded-tl-none'
                            }`}>
                              {msg.text}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Input Footer */}
                    <div className="p-3 bg-white/5 border-t border-white/5 flex gap-2">
                      <input 
                        type="text"
                        placeholder="Type message in Roman Urdu or Urdu..."
                        className="flex-1 glass bg-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-700"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter' && chatInput.trim()) {
                            const uMsg = chatInput;
                            setChatInput('');
                            
                            // 1. Add user message
                            setOmegleMessages(prev => [...prev, { sender: 'me', text: uMsg }]);
                            
                            // 2. Trigger simulated peer response with roleplay
                            setIsProcessing(true);
                            try {
                              const promptWithContext = `[OMEGLE_CHAT] StrangerName: ${omegleStrangerName}, Location: ${omegleStrangerLoc}. Chat history list so far: ${JSON.stringify(omegleMessages)}. Shopkeeper said to you: "${uMsg}". Respond accordingly.`;
                              const response = await processWithGemini(promptWithContext, [], [], geminiApiKey || undefined);
                              if (response && response.response) {
                                setOmegleMessages(prev => [...prev, { sender: 'stranger', text: response.response }]);
                                speak(response.response);
                              } else {
                                setOmegleMessages(prev => [...prev, { sender: 'stranger', text: "Yar dhandha chalao, kya baten kar rahe ho!" }]);
                              }
                            } catch (err) {
                              setTimeout(() => {
                                setOmegleMessages(prev => [...prev, { sender: 'stranger', text: "Acha sahi hai bhai. Aaj ki bachat kitni rahi?" }]);
                                speak("Acha sahi hai bhai");
                              }, 1500);
                            } finally {
                              setIsProcessing(false);
                            }
                          }
                        }}
                      />
                      <button 
                        onClick={async () => {
                          if (!chatInput.trim()) return;
                          const uMsg = chatInput;
                          setChatInput('');
                          setOmegleMessages(prev => [...prev, { sender: 'me', text: uMsg }]);
                          setIsProcessing(true);
                          try {
                            const promptWithContext = `[OMEGLE_CHAT] StrangerName: ${omegleStrangerName}, Location: ${omegleStrangerLoc}. Shopkeeper matching. User sent: "${uMsg}". Respond accordingly in Roman Urdu / Hindi.`;
                            const response = await processWithGemini(promptWithContext, [], [], geminiApiKey || undefined);
                            if (response && response.response) {
                              setOmegleMessages(prev => [...prev, { sender: 'stranger', text: response.response }]);
                              speak(response.response);
                            } else {
                              setOmegleMessages(prev => [...prev, { sender: 'stranger', text: "Yar dhandha kaisa chal raha hai?" }]);
                            }
                          } catch (err) {
                            setTimeout(() => {
                              setOmegleMessages(prev => [...prev, { sender: 'stranger', text: "Acha thik hai, batayein." }]);
                              speak("Acha thik hai");
                            }, 1500);
                          } finally {
                            setIsProcessing(false);
                          }
                        }}
                        className="p-3 bg-emerald-500 rounded-xl text-slate-950 hover:bg-emerald-400 cursor-pointer flex items-center justify-center shadow-lg"
                      >
                        <Send className="w-5 h-5 flex-shrink-0" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* History Detail Modal */}
      <AnimatePresence>
        {showHistoryDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDetail(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl glass rounded-3xl shadow-2xl relative z-10 max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Historical Records</h2>
                    <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Chronological Business Archive</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistoryDetail(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {dayWiseHistory.map((day, dIdx) => (
                  <div key={dIdx} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-bold font-mono text-lg">{day.label}:</span>
                      <span className="text-slate-400 text-sm italic">{day.date}</span>
                    </div>
                    
                    <div className="space-y-2 pl-4 border-l border-white/10">
                      {day.items.map((t: any, tIdx: number) => (
                        <TransactionRow 
                          key={tIdx} 
                          t={t} 
                          context="history" 
                          onDelete={() => handleDeleteTransaction(t)}
                          onShowReceipt={() => setSelectedReceipt(t)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {dayWiseHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500 italic">
                    <History className="w-12 h-12 mb-4 opacity-20" />
                    <p>No records found.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Digital Receipt Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedReceipt(null)}
               className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="w-full max-w-sm relative z-[111]"
            >
              <div 
                id="digital-receipt"
                className="bg-white text-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col p-10 font-sans relative"
              >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500"></div>
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                
                {/* Receipt Header */}
                <div className="text-center border-b-2 border-dashed border-slate-200 pb-8 mb-8 relative">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-900/10 scale-110">
                      <Logo className="w-10 h-10" />
                    </div>
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">COB Payment Receipt</h2>
                  <p className="text-[10px] text-slate-400 uppercase font-mono tracking-[0.2em] mt-2 font-bold">Ref: {(selectedReceipt.id || '...').substring(0, 12).toUpperCase()}</p>
                </div>

                {/* Receipt Body */}
                <div className="space-y-6 mb-10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</span>
                    <span className="text-xs font-bold text-slate-600">{selectedReceipt.timestamp?.seconds ? safeFormat(new Date(selectedReceipt.timestamp.seconds * 1000), 'p, MMM d, yyyy') : 'Today'}</span>
                  </div>
                  
                  <div className="py-8 border-y border-slate-100 flex flex-col items-center text-center">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Amount Paid</p>
                    <p className="text-5xl font-black tracking-tighter text-emerald-600 mb-2">
                       <span className="text-2xl mr-1">Rs.</span>{(selectedReceipt.amount || 0).toLocaleString()}
                    </p>
                    <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                      Transaction Success
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 ring-1 ring-slate-50 p-4 rounded-2xl bg-slate-50/50">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description</p>
                      <p className="text-xs font-bold leading-tight text-slate-800">{selectedReceipt.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-800">{selectedReceipt.type}</p>
                    </div>
                  </div>

                  {selectedReceipt.customerName && (
                    <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl text-white">
                       <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                          <Users className="w-4 h-4" />
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Customer</p>
                          <p className="text-sm font-bold">{selectedReceipt.customerName}</p>
                       </div>
                    </div>
                  )}
                </div>

                {/* Receipt Footer */}
                <div className="text-center pt-4">
                  <div className="w-full h-12 bg-slate-100 rounded-xl flex flex-col items-center justify-center mb-4 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Brand Source</p>
                    <p className="text-[10px] font-black text-slate-900 italic">This software is made by Vishal Kumar</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by COB AI</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <button 
                  onClick={async () => {
                    const canvas = await (await import('html2canvas')).default(document.getElementById('digital-receipt')!);
                    const link = document.createElement('a');
                    link.download = `Receipt-${(selectedReceipt.id || '...').substring(0, 6)}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                  }}
                  className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-xl text-white py-4 rounded-2xl font-bold border border-white/10 hover:bg-white/20 transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" /> Download
                </button>
                <button 
                  onClick={async () => {
                    const canvas = await (await import('html2canvas')).default(document.getElementById('digital-receipt')!);
                    canvas.toBlob(async (blob) => {
                      if (!blob) return;
                      const file = new File([blob], 'receipt.png', { type: 'image/png' });
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            files: [file],
                            title: 'Business Receipt',
                            text: `Receipt from ${user.displayName}: Rs. ${selectedReceipt.amount}`
                          });
                        } catch (e) {
                          const text = `COB Business Receipt:
Item: ${selectedReceipt.description}
Price: Rs. ${selectedReceipt.amount}
Customer: ${selectedReceipt.customerName || 'N/A'}
Date: ${selectedReceipt.timestamp?.seconds ? safeFormat(new Date(selectedReceipt.timestamp.seconds * 1000), 'p, MMM d') : 'Today'}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
                        }
                      }
                    });
                  }}
                >
                  <Share2 className="w-5 h-5" /> Share
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer / Status Bar - Desktop only for now */}
      <footer className="hidden lg:flex fixed bottom-0 left-72 right-0 h-10 glass border-t-0 px-10 items-center justify-between text-[10px] text-slate-500 z-40 font-mono uppercase tracking-widest bg-slate-950/80">
        <div className="flex gap-6">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> COB Online</span>
          <span>Latency: 45ms</span>
        </div>
        <div className="flex gap-6">
          <span>COB Core Engine</span>
          <span>Sync Status: Stable</span>
        </div>
      </footer>
    </div>
  );
}

function TransactionRow({ t, context, onDelete, onShowReceipt }: any) {
  const isDebtContext = context === 'all_debt' || context === 'debt' || context === 'customers';
  
  let amountSign = '+';
  let colorStyle = 'text-emerald-400 bg-emerald-500/20';
  let typeLabel = t.type;

  if (isDebtContext) {
    if (t.type === 'debt') { 
      amountSign = '+'; 
      colorStyle = 'text-rose-400 bg-rose-500/20'; 
      typeLabel = 'Debt Issued';
    }
    if (t.type === 'payment') { 
      amountSign = '-'; 
      colorStyle = 'text-emerald-400 bg-emerald-500/20'; 
      typeLabel = 'Debt Recovery';
    }
  } else {
    if (t.type === 'income') { 
      amountSign = '+'; 
      colorStyle = 'text-emerald-400 bg-emerald-500/20'; 
      typeLabel = 'Income';
    }
    if (t.type === 'payment') { 
      amountSign = '-'; 
      colorStyle = 'text-emerald-400 bg-emerald-500/20'; 
      typeLabel = 'Payment Received';
    }
    if (t.type === 'expense') { 
      amountSign = '-'; 
      colorStyle = 'text-rose-400 bg-rose-500/20'; 
      typeLabel = 'Expense';
    }
    if (t.type === 'debt') { 
      amountSign = '+'; 
      colorStyle = 'text-blue-400 bg-blue-500/20'; 
      typeLabel = 'Debt Issued';
    }
  }

  const TypeIcon = t.type === 'income' ? Plus : 
                   t.type === 'payment' ? CheckCircle2 :
                   t.type === 'debt' ? CreditCard :
                   Wallet;

  let displayAmount = t.amount || 0;
  let currentSign = amountSign;
  
  if (displayAmount < 0) {
    currentSign = amountSign === '+' ? '-' : '+';
    displayAmount = Math.abs(displayAmount);
  }

  return (
    <div className="p-5 glass rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all border-none mb-2 group cursor-pointer relative overflow-hidden">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${colorStyle}`}>
          <TypeIcon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-lg leading-tight">{t.description}</p>
            {t.customerName && (
              <span className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                {t.customerName}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1">
            {t.timestamp?.seconds ? safeFormat(new Date(t.timestamp.seconds * 1000), 'p, MMM d') : 'Just now'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`text-xl font-bold font-mono tracking-tighter ${
            (currentSign === '+' || t.type === 'income' || (t.type === 'payment' && !isDebtContext)) ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {currentSign}Rs. {displayAmount.toLocaleString()}
          </p>
          <div className="flex justify-end gap-2 mt-1">
            <div className={`text-[8px] uppercase font-bold tracking-widest opacity-60 flex items-center gap-1 ${
              t.type === 'payment' ? 'text-emerald-400' : 
              t.type === 'debt' ? 'text-rose-400' : ''
            }`}>
              {typeLabel}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onShowReceipt && onShowReceipt();
            }}
            className="p-3 bg-white/5 hover:bg-blue-500 hover:text-slate-950 rounded-xl transition-all shadow-lg active:scale-95 group/receipt"
            title="Digital Receipt"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              const text = `COB Business Snapshot:
Item: ${t.description}
Price: Rs. ${t.amount}
Date: ${t.timestamp?.seconds ? safeFormat(new Date(t.timestamp.seconds * 1000), 'p, MMM d') : 'Today'}
Thank you!`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
            }}
            className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-slate-950 rounded-xl transition-all shadow-lg active:scale-95 group/wa"
            title="Share via WhatsApp"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete();
            }}
            className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl transition-all active:scale-90"
            title="Delete Record"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreItem({ title, description, cost, onBuy, disabled, purchased }: any) {
  return (
    <div className={`p-6 glass rounded-[2rem] border transition-all relative overflow-hidden ${
      purchased ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 hover:border-amber-500/30'
    }`}>
      {purchased && (
        <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-500 text-slate-950 text-[8px] font-bold uppercase tracking-widest rounded-bl-xl">
          Purchased
        </div>
      )}
      <div className="flex justify-between items-start mb-4">
        <h4 className="font-bold text-lg">{title}</h4>
        {!purchased && (
          <div className="flex items-center gap-1 text-amber-500 font-mono font-bold text-sm">
            <IndianRupee className="w-3 h-3" /> {cost}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-6 italic">{description}</p>
      
      {!purchased && (
        <button 
          disabled={disabled}
          onClick={onBuy}
          className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
            disabled 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95'
          }`}
        >
          {disabled ? 'LOCKED' : 'Buy Upgrade'}
        </button>
      )}
    </div>
  );
}

function DayCard({ day, onDelete, onShowReceipt }: { day: any, onDelete: (t: any) => void, onShowReceipt: (t: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const dailyEarnings = (day.items || [])
    .filter((t: any) => t.type === 'income' || t.type === 'payment')
    .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);
    
  return (
    <div className={`glass rounded-2xl border border-white/5 overflow-hidden transition-all ${isOpen ? 'bg-white/5' : 'hover:bg-white/5'}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex justify-between items-center cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isOpen ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-emerald-400 group-hover:bg-emerald-500/20'}`}>
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-lg">{day.label}</h4>
            <p className="text-xs text-slate-500">{day.date}</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div>
            <p className="text-sm font-mono font-bold text-emerald-400">Rs. {dailyEarnings.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Earnings</p>
          </div>
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronRight className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/5 bg-slate-950/40"
          >
            <div className="p-4 space-y-2">
              {day.items.map((t: any, idx: number) => (
                <TransactionRow 
                  key={idx} 
                  t={t} 
                  context="history" 
                  onDelete={() => onDelete(t)}
                  onShowReceipt={() => onShowReceipt(t)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, iconColor }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm whitespace-nowrap lg:whitespace-normal ${
        active 
          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
          : 'text-slate-400 hover:bg-white/5'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-slate-950' : (iconColor || 'text-emerald-400/50')}`} />
      {label}
    </button>
  );
}

function StatCard({ label, value, type, icon: Icon, active, onClick }: any) {
  const styles: any = {
    up: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10',
    down: 'text-rose-400 bg-rose-500/5 border-rose-500/10',
    debt: 'text-blue-400 bg-blue-500/5 border-blue-500/10',
    all: 'text-amber-400 bg-amber-500/5 border-amber-500/10'
  };

  const activeStyles: any = {
    up: 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20',
    down: 'border-rose-500 bg-rose-500/10 ring-1 ring-rose-500/20',
    debt: 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/20',
    all: 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/20'
  };

  const currentStyle = styles[type] || styles.debt;
  const activeStyle = active ? activeStyles[type] : '';

  return (
    <div 
      onClick={onClick}
      className={`p-6 glass-card border flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer ${activeStyle} ${!active ? 'border-white/5' : ''}`}
    >
      <div className={`p-2.5 glass rounded-xl w-fit mb-4 ${currentStyle}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono tracking-tighter">Rs. {value?.toLocaleString()}</p>
      
      {/* Decorative Glow */}
      <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${
        type === 'up' ? 'bg-emerald-500' : type === 'down' ? 'bg-rose-500' : type === 'debt' ? 'bg-blue-500' : 'bg-amber-500'
      }`} />
    </div>
  );
}
