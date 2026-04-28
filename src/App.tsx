import React, { useState, useEffect } from 'react';
import { 
  auth, 
  loginWithGoogle, 
  addTransaction, 
  getRecentTransactions, 
  updateCustomerDebt,
  getCustomers,
  setShopStatus,
  getShopData
} from './services/firebase';
import { parseBusinessInput, answerBusinessQuestion } from './services/gemini';
import VoiceRecorder from './components/VoiceRecorder';
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
          <h1 className="text-2xl font-bold text-white mb-2">Kuch masla ho gaya!</h1>
          <p className="text-slate-400 mb-6 max-w-xs">App reset ho rahi hai, please thora intezar krein ya refresh karein.</p>
          <div className="flex gap-4">
            <button onClick={() => window.location.reload()} className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-xl font-bold">Refresh App</button>
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

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full animate-pulse"></div>
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full text-emerald-400 relative z-10"
    >
      <path 
        d="M3 18L9 12L13 16L21 8" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
      />
      <circle cx="21" cy="8" r="2" fill="currentColor" />
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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'history' | 'customers' | 'ai' | 'whatsapp' | 'alldays' | 'store'>('dashboard');
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '' });
  const [shopOn, setShopOn] = useState(false);
  const [lastSessionStart, setLastSessionStart] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [coins, setCoins] = useState(1500); 
  const [shopSize, setShopSize] = useState('Small');
  const [chatInput, setChatInput] = useState('');
  const [transcriptQueue, setTranscriptQueue] = useState<string[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualEntry, setManualEntry] = useState({ amount: '', type: 'income', description: '', customerName: '', phone: '' });
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const lastProcessedTranscript = React.useRef<string | null>(null);

  // Effect to process transcript queue
  useEffect(() => {
    if (transcriptQueue.length > 0 && !isProcessing) {
      const nextTranscript = transcriptQueue[0];
      setTranscriptQueue(prev => prev.slice(1));
      processTranscript(nextTranscript);
    }
  }, [transcriptQueue, isProcessing]);

  // Manual refresh helper
  const refreshData = async () => {
    if (user) {
      await loadData(user.uid);
      setAiResponse("Hisab refresh ho gaya hai.");
    }
  };

  async function loadData(uid: string) {
    try {
      // Limit to 1500 roughly (approx 150 days * 10 transactions/day)
      const data = await getRecentTransactions(uid, 1500); 
      setTransactions(Array.isArray(data) ? data : []);
      
      const custList = await getCustomers(uid);
      setCustomers(Array.isArray(custList) ? custList : []);
      
      // Load products too
      const p = localStorage.getItem(`products_${uid}`);
      if (p) {
        try {
          const parsedP = JSON.parse(p);
          if (Array.isArray(parsedP)) setProducts(parsedP);
        } catch (e) {
          console.error("Products parse error", e);
        }
      }
      
      const n = localStorage.getItem(`notifications_${uid}`);
      if (n) {
        try {
          const parsedN = JSON.parse(n);
          if (Array.isArray(parsedN)) setNotifications(parsedN);
        } catch (e) {
          console.error("Notifications parse error", e);
        }
      }

      const c = localStorage.getItem(`coins_${uid}`);
      if (c) {
        const parsedC = parseInt(c);
        if (!isNaN(parsedC)) setCoins(parsedC);
      }

      const s = localStorage.getItem(`shopSize_${uid}`);
      if (s) setShopSize(s);
    } catch (err) {
      console.error("Failed to load data:", err);
      setTransactions([]);
    }
  }

  // Persist products and notifications to localstorage (since getRecentTransactions handles db for now)
  useEffect(() => {
    if (user) {
      localStorage.setItem(`products_${user.uid}`, JSON.stringify(products));
    }
  }, [products, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`notifications_${user.uid}`, JSON.stringify(notifications));
      localStorage.setItem(`coins_${user.uid}`, coins.toString());
      localStorage.setItem(`shopSize_${user.uid}`, shopSize);
    }
  }, [notifications, coins, shopSize, user]);

  const saveProduct = () => {
    if (newProduct.name && newProduct.price) {
      if (editingProduct) {
        setProducts(products.map(p => p.id === editingProduct.id ? { ...newProduct, id: p.id } : p));
        setEditingProduct(null);
      } else {
        setProducts([{ ...newProduct, id: Date.now() }, ...products]);
      }
      setNewProduct({ name: '', description: '', price: '' });
      setShowProductForm(false);
    }
  };

  const startEdit = (product: any) => {
    setEditingProduct(product);
    setNewProduct({ name: product.name, description: product.description, price: product.price });
    setShowProductForm(true);
  };

  useEffect(() => {
    // Safety timeout: Ensure loading finishes even if auth listener takes too long
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsubscribe = auth.onAuthStateChanged(async (u: any) => {
      try {
        clearTimeout(safetyTimeout);
        try {
          await SplashScreen.hide();
        } catch (e) {
          console.warn("SplashScreen hide failed (probably not on device)", e);
        }
        setUser(u);
        if (u) {
          const shopData = await getShopData();
          setShopOn(shopData.shopOn);
          setLastSessionStart(shopData.lastSessionStart);
          await loadData(u.uid);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 rounded-full blur-[120px]"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center"
      >
        <div className="mb-8 p-6 glass rounded-[2.5rem] shadow-2xl relative group">
          <Logo />
          <div className="absolute inset-0 bg-emerald-500/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
        <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">Control Your Business <span className="text-emerald-400 font-mono text-2xl ml-2 uppercase">(COB)</span></h1>
        <p className="text-xl text-slate-400 mb-12 max-w-md leading-relaxed font-light">
          Boliye, COB yaad rakhe ga. Your AI business partner for the modern shop.
        </p>
        <button 
          onClick={loginWithGoogle}
          className="flex items-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-[2rem] font-bold text-lg hover:bg-emerald-50 transition-all shadow-2xl shadow-white/10 active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
          Get Started with Google
        </button>
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

    const msg = newState ? "Dukan khul gayi hai. Barkat barsay!" : "Dukan barha di gayi hai. Kal milain ge.";
    setAiResponse(msg);
    speak(msg);
  };

  const resetDay = async () => {
    const now = Date.now();
    localStorage.setItem('lastSessionStart', now.toString());
    setLastSessionStart(now);
    const msg = "Theek hai Sain, ajj ka naya hisab shuru ho chuka hai.";
    setAiResponse(msg);
    speak(msg);
  };

  const speak = (text: string) => {
    // stop previous
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Look for Urdu, then Hindi, then Indian English for better accent
      const preferredVoice = voices.find(v => v.lang.startsWith('ur')) || 
                             voices.find(v => v.lang.startsWith('hi')) ||
                             voices.find(v => v.lang.includes('IN'));
                             
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = 'en-GB';
      }
      
      utterance.rate = 0.85; // Slightly slower for better comprehension
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  };

  const handleTranscript = (transcript: string) => {
    if (!user) return;
    setTranscriptQueue(prev => [...prev, transcript]);
  };

  const processTranscript = async (transcript: string) => {
    if (!transcript.trim()) {
      console.log("Skipping empty transcript");
      return;
    }

    setIsProcessing(true);
    setLastTranscript(transcript);
    console.log("Processing transcript:", transcript);
    
    // Safety timeouts for handling slow responses
    const slowWarningTimeout = setTimeout(() => {
      if (isProcessing) {
        const slowMsg = "Sain! Response thora slow hai, please thora aur intezar karein ya refresh karein.";
        setAiResponse(slowMsg);
        speak("Response thora slow hai, thora intezar karein.");
      }
    }, 8000);

    const timeoutDuration = 20000; 
    const processingTimeout = setTimeout(() => {
      setIsProcessing(prev => {
        if (prev) {
          console.log("Processing timed out");
          const finalMsg = "Sain! COB ko response milne me kafi dair ho rahi hai. Please page refresh karein ya dobara boliye.";
          setAiResponse(finalMsg);
          speak("Response nahi aaya. Please repeat karein ya refresh karein.");
          return false;
        }
        return prev;
      });
    }, timeoutDuration);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is missing. Please add it to Settings.");
      }

      console.log("Calling parseBusinessInput...");
      let result;
      try {
        result = await parseBusinessInput(transcript);
        console.log("Gemini parsed result:", result);
      } catch (parseError: any) {
        console.error("Gemini parse failed:", parseError);
        // Direct regex attempt if API call itself failed
        const nums = transcript.match(/(\d+)/g);
        if (nums && nums.length > 0) {
          result = { 
            intent: "record", 
            actions: [{ 
              amount: parseInt(nums[0], 10), 
              type: "income", 
              description: "Sale (Auto-detected)" 
            }] 
          };
        } else {
          throw parseError; // Re-throw if no numbers found either
        }
      }
      
      clearTimeout(processingTimeout);
      clearTimeout(slowWarningTimeout);
      
      if (result.intent === 'record') {
        let fullResponse = "";
        let recordedCount = 0;
        let actions = result.actions || [];

        // FALLBACK: If Gemini failed to find actions/amounts but it is a record intent
        if (actions.length === 0 || !actions.some((a: any) => a.amount > 0)) {
           console.log("No valid actions found, trying regex fallback");
           const nums = transcript.match(/(\d+)/g);
           if (nums) {
             const amount = parseInt(nums[nums.length - 1], 10);
             let type = 'income';
             if (transcript.match(/(kharcha|expense|خرچہ|kharch)/i)) type = 'expense';
             if (transcript.match(/(udhar|udhari|baqi|ادھار|باقیہ)/i)) type = 'debt';
             if (transcript.match(/(jama|wapsi|mil gaye|جمع|واپسی)/i)) type = 'payment';
             
             actions = [{
               amount,
               type,
               description: `Direct Record: ${transcript.length > 25 ? transcript.slice(0, 22) + '...' : transcript}`
             }];
           }
        }

        for (const actionData of actions) {
          const parsed = actionData;
          
          if (!parsed.amount || isNaN(parsed.amount) || parsed.amount <= 0) {
            console.log("Skipping invalid amount action:", parsed);
            continue;
          }

          console.log("Saving to Firebase:", parsed);
          await addTransaction(user.uid, {
            ...parsed,
            rawInput: transcript,
          });

          recordedCount++;

          if ((parsed.type === 'debt' || parsed.type === 'payment') && parsed.customerName) {
            let actualAmount = parsed.amount;
            
            if (actualAmount === -1) {
              const balance = transactions.reduce((acc, currentT) => {
                if (currentT.customerName === parsed.customerName) {
                  if (currentT.type === 'debt') return acc + (currentT.amount || 0);
                  if (currentT.type === 'payment') return acc - (currentT.amount || 0);
                }
                return acc;
              }, 0);
              actualAmount = balance;
              parsed.amount = balance;
            }

            const debtChange = parsed.type === 'payment' ? -actualAmount : actualAmount;
            await updateCustomerDebt(user.uid, parsed.customerName, debtChange);
          }

          const actionText = parsed.type === 'payment' 
            ? `Rs. ${parsed.amount} wapsi.`
            : parsed.type === 'debt'
            ? `Rs. ${parsed.amount} udhaar.`
            : parsed.type === 'income'
            ? `Rs. ${parsed.amount} kamai.`
            : `Rs. ${parsed.amount} record.`;
          fullResponse += actionText + " ";
        }

        if (recordedCount > 0) {
          await loadData(user.uid);
          const finalMsg = "Zabardast! COB ne record kar liya: " + fullResponse;
          setAiResponse(finalMsg);
          speak(finalMsg);
        } else {
          const failMsg = `Sain! COB ko "${transcript}" samajh nahi aaya. Amount aur type (Sale/Kharcha/Udhar) saaf boliye.`;
          setAiResponse(failMsg);
          speak(failMsg);
        }
      } else if (result.intent === 'query') {
        const context = transactions.slice(0, 60).map(t => 
          `${t.description}: Rs. ${t.amount} (${t.type})${t.customerName ? ' for ' + t.customerName : ''}`
        ).join('\n');
        
        const answer = await answerBusinessQuestion(result.question, context, products, coins, shopSize);
        clearTimeout(processingTimeout);

        if (answer.includes('UPGRADE_SUCCESS')) {
          setCoins(prev => prev - 1000);
          const nextSize = shopSize === 'Small' ? 'Medium' : shopSize === 'Medium' ? 'Large' : 'Palatial';
          setShopSize(nextSize);
          const cleanAnswer = answer.replace('UPGRADE_SUCCESS', '').trim();
          setAiResponse(cleanAnswer);
          speak(cleanAnswer);
          return;
        }

        if (answer.toLowerCase().includes('rate list mein nahi') || answer.toLowerCase().includes('available nahi')) {
           const match = transcript.match(/(hai|rate|price|btayen) (.*)/i);
           const itemName = match ? match[2] : "Unknown Item";
           
           if (!notifications.some(n => n.item === itemName)) {
             setNotifications([{
               id: Date.now(),
               item: itemName,
               message: `Sain! "${itemName}" rate list mein nahi mila. Kya add karu?`,
               timestamp: new Date().toISOString(),
               rawTranscript: transcript
             }, ...notifications]);
           }
        }

        setAiResponse(answer);
        speak(answer);
      }
    } catch (error: any) {
      clearTimeout(processingTimeout);
      console.error("Failed to process voice:", error);
      let errorMsg = "Sain! COB ko apka baat samajh nahi aaya. Thora saaf Urdu me boliye.";
      
      if (error?.message?.includes('GEMINI_API_KEY')) {
        errorMsg = "Sain! Gemini API key ka koi masla hai. Settings me check karein.";
      } else if (error?.message?.includes('permission')) {
        errorMsg = "API permission denied. Key check karein.";
      }
      
      setAiResponse(errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
      clearTimeout(processingTimeout);
      clearTimeout(slowWarningTimeout);
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
          <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase mt-1">AI Assistant</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 flex-grow overflow-x-auto lg:overflow-visible no-scrollbar pb-4 lg:pb-0">
        <NavItem icon={BarChart3} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={History} label="Ajj ka Hisab" active={view === 'history'} onClick={() => { setView('history'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={Users} label={`Udhaar (Rs. ${totalDebtBalance})`} active={view === 'customers'} onClick={() => { setView('customers'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={ShoppingBag} label="Rate List & Stock" active={view === 'whatsapp'} onClick={() => { setView('whatsapp'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={MessageSquare} iconColor="text-[#25D366]" label="AI WhatsApp Bot" active={view === 'ai'} onClick={() => { setView('ai'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={IndianRupee} label={`Shop Store (${coins} Coins)`} active={view === 'store'} onClick={() => { setView('store'); setIsMobileMenuOpen(false); }} />
        <NavItem icon={Calendar} label="Purana Hisab" active={view === 'alldays'} onClick={() => { setView('alldays'); setIsMobileMenuOpen(false); }} />
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
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 glass rounded-xl">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            {user && (
              <button 
                onClick={resetDay}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-500/30 transition-all shadow-lg active:scale-95"
                title="Ajj ka hisab yahan se shuru karein"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Start Day</span>
                <span className="sm:hidden">Start</span>
              </button>
            )}
            <Logo />
            <span className="font-bold">COB</span>
          </div>
          <img src={user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner'} alt={user.displayName || 'Owner'} className="w-8 h-8 rounded-full border border-white/10" />
        </header>

        <section className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-4xl font-bold mb-2 tracking-tight">Kese hain <span className="text-emerald-400">aap</span>?</h2>
            <p className="text-slate-400 font-light italic">"COB is monitoring your shop's transactions in real-time."</p>
          </div>
          
          <div className="flex">
             {user && (
                <button 
                  onClick={resetDay}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-slate-950 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 transform hover:-translate-y-0.5 group"
                >
                  <History className="w-5 h-5 group-hover:rotate-[-45deg] transition-transform" />
                  Start This Day Again
                </button>
             )}
          </div>
        </section>

        {/* Cloud Sync Warning for Simulated Mode */}
        {user && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 glass rounded-3xl border border-yellow-500/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-yellow-500 mb-1">Cloud Backup: Band Hai</h3>
                <p className="text-sm text-slate-400 max-w-sm">Apka sara hisab abhi sirf isi dukan (device) par hai. Link share karne ya mobile badalne ke liye humein Cloud (Firebase) se jorna hoga.</p>
              </div>
            </div>
            <button 
              onClick={() => setAiResponse("Sain! Cloud Backup (Firebase) setting filhal band hai. Aap agent se kaho 'Set up Firebase' taake apka sara data mehfooz ho jaye.")}
              className="w-full md:w-auto px-8 py-4 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-2xl font-bold uppercase tracking-widest hover:bg-yellow-500/20 transition-all active:scale-95"
            >
              Info Lein
            </button>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <StatCard 
            label="Ajj ki Kamai (Jama)" 
            value={totalIncome} 
            type="up" 
            icon={TrendingUp} 
            active={activeStatFilter === 'income'}
            onClick={() => setActiveStatFilter(activeStatFilter === 'income' ? null : 'income')} 
          />
          <StatCard 
            label="Ajj ke Kharchay" 
            value={totalExpense} 
            type="down" 
            icon={Wallet} 
            active={activeStatFilter === 'expense'}
            onClick={() => setActiveStatFilter(activeStatFilter === 'expense' ? null : 'expense')} 
          />
          <StatCard 
            label="Ajj ka Naya Udhaar" 
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
            {shopOn ? 'Dukan Barhaein (End Shop)' : 'Dukan Kholein (Start Shop)'}
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
                  placeholder="COB ko batayein (Boliye ya Type krein)..." 
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
               <h3 className="text-xl font-bold text-center mb-2">Manual Record Karein</h3>
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
                      <option value="income">Income (Kamai)</option>
                      <option value="expense">Expense (Kharcha)</option>
                      <option value="debt">Udhaar (Debt)</option>
                      <option value="payment">Jama (Payment)</option>
                    </select>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Customer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ahmed" 
                      className="w-full glass bg-white/10 p-4 rounded-xl text-sm border-white/10"
                      value={manualEntry.customerName}
                      onChange={e => setManualEntry({...manualEntry, customerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Mobile / Phone</label>
                    <input 
                      type="text" 
                      placeholder="0300..." 
                      className="w-full glass bg-white/10 p-4 rounded-xl text-sm border-white/10"
                      value={manualEntry.phone}
                      onChange={e => setManualEntry({...manualEntry, phone: e.target.value})}
                    />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Kaam / Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sale, Bijli Bill" 
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
                    setAiResponse("Zabardast! Manual entry record ho gayi hai.");
                    setManualEntry({ amount: '', type: 'income', description: '', customerName: '', phone: '' });
                    setShowManualForm(false);
                    speak("Record update ho gaya hai.");
                  } catch (e) {
                    setAiResponse("Koi masla aa gaya manual check me.");
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                className="w-full py-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-lg"
               >
                 Ajj ka Record Save Karein
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
                  {activeStatFilter === 'income' && "Ajj ki Kamai (Jama)"}
                  {activeStatFilter === 'expense' && "Ajj ke Kharchay"}
                  {activeStatFilter === 'debt' && "Naya Udhaar (Baqi)"}
                  {activeStatFilter === 'all_debt' && "Kul Udhaar Details"}
                  {!activeStatFilter && view === 'dashboard' && 'Ajj ke Kaam'}
                  {view === 'history' && 'Ajj ka Hisab'}
                  {view === 'alldays' && 'Purani History (All Days)'}
                  {view === 'customers' && 'Pending Hisab'}
                  {view === 'ai' && 'COB WhatsApp Sync'}
                  {view === 'whatsapp' && 'Product List'}
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
                  <TransactionRow key={t.id} t={t} context={activeStatFilter || (view === 'dashboard' && activeStatFilter === null ? 'dashboard' : null)} />
                ))}
              </div>
            )}

            {view === 'alldays' && (
              <div className="p-4 space-y-4">
                {dayWiseHistory.map((day, idx) => (
                  <DayCard key={day.id || idx} day={day} />
                ))}
                {dayWiseHistory.length === 0 && (
                  <div className="py-24 text-center">
                    <Calendar className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-500 italic">"Abhi tak koi purani history nahi mili."</p>
                  </div>
                )}
              </div>
            )}

            {view === 'customers' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {customers.filter(c => (c.totalDebt || 0) > 0).map((customer: any, idx) => (
                  <div key={idx} className="glass p-5 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{customer.name}</p>
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                             <Smartphone className="w-3 h-3" />
                             {customer.phone}
                          </div>
                        )}
                        <p className="text-xs text-rose-400 font-mono italic">Hisab Baqi: Rs. {(customer.totalDebt || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const text = `Assalamu Alaikum ${customer.name}, aapka is waqt ka COB Udhaar balance Rs. ${customer.totalDebt} hai. Shukriya.`;
                          const phoneNum = customer.phone?.replace(/[^0-9]/g, '');
                          window.open(phoneNum ? `https://wa.me/${phoneNum}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`);
                        }}
                        className="p-3 glass rounded-xl text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all active:scale-95 flex items-center gap-2"
                       >
                        <Share2 className="w-4 h-4" />
                        <span className="text-[10px] font-bold font-mono">Bill Send</span>
                      </button>
                    </div>
                  </div>
                ))}
                {customers.filter(c => (c.totalDebt || 0) > 0).length === 0 && (
                  <p className="col-span-2 text-center py-20 text-slate-600 font-light italic tracking-tight">"Everyone has cleared their bills! COB is impressed."</p>
                )}
              </div>
            )}

            {(view === 'ai' || view === 'whatsapp') && (
              <div className="p-8 space-y-8">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setView('ai')}
                    className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${
                      view === 'ai' ? 'bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/20' : 'bg-white/5 text-slate-400 border border-white/5'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" /> Bot Settings
                  </button>
                  <button 
                    onClick={() => setView('whatsapp')}
                    className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 ${
                      view === 'whatsapp' ? 'bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/20' : 'bg-white/5 text-slate-400 border border-white/5'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5" /> Rate List & Stock
                  </button>
                </div>
                
                {view === 'ai' ? (
                  <>
                    <div className="glass rounded-3xl p-8 bg-emerald-500/5 border-emerald-500/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <MessageSquare className="w-32 h-32 text-emerald-500" />
                      </div>
                      <h4 className="font-bold text-2xl text-emerald-400 mb-4 flex items-center gap-3">
                        <Smartphone className="w-6 h-6" /> WhatsApp Business Bot
                      </h4>
                      <p className="text-slate-300 mb-8 max-w-xl leading-relaxed italic text-sm">
                        "Connect your WhatsApp to let COB answer customer price queries automatically."
                      </p>
                      
                      <div className="space-y-4 max-w-sm ml-auto scale-90 origin-right">
                        <div className="glass px-4 py-3 rounded-2xl rounded-tr-none bg-blue-500/10 border-blue-500/20 ml-auto">
                          <p className="text-[8px] text-blue-300 mb-1 font-mono uppercase font-bold opacity-50">Customer</p>
                          <p className="text-xs">Sugar ka kya rate hai?</p>
                        </div>
                        <div className="glass px-4 py-3 rounded-2xl rounded-tl-none bg-emerald-500/20 border-emerald-500/30">
                          <p className="text-[8px] text-emerald-400 mb-1 font-mono uppercase font-bold opacity-50">COB Bot</p>
                          <p className="text-xs">Aaj sugar 145 Rs per kg hai.</p>
                        </div>
                      </div>
                      
                      <button className="mt-8 w-full py-4 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">
                        Link WhatsApp Number
                      </button>
                    </div>

                    {notifications.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold flex items-center gap-2">
                            <Bell className="w-4 h-4 text-rose-400" />
                            Bot Alerts (Missing Items)
                          </h4>
                          <button 
                            onClick={() => setNotifications([])}
                            className="text-[10px] uppercase font-bold text-slate-500 hover:text-rose-400 underline"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {notifications.map((n) => (
                            <div key={n.id} className="glass p-5 rounded-2xl border-rose-500/20 bg-rose-500/5 flex justify-between items-center group shadow-lg">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-rose-400 shadow-inner">
                                  <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-200">{n.message}</p>
                                  <p className="text-[10px] text-slate-500 font-mono mt-1">{safeFormat(n.timestamp, 'p')} · {n.item}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setView('whatsapp');
                                  setNewProduct({ name: n.item, description: '', price: '' });
                                  setShowProductForm(true);
                                }}
                                className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-xl text-xs font-bold opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-105 active:scale-95"
                              >
                                Add Rate List
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h4 className="text-lg font-bold">Product Inventory (Rate List)</h4>
                        <p className="text-xs text-slate-500">Add prices here so AI can answer customers on WhatsApp</p>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingProduct(null);
                          setNewProduct({ name: '', description: '', price: '' });
                          setShowProductForm(!showProductForm);
                        }}
                        className="p-3 bg-emerald-500 text-slate-950 rounded-xl font-bold flex items-center gap-2 text-sm hover:scale-105 transition-all shadow-lg"
                      >
                        <Plus className="w-4 h-4" /> {showProductForm ? 'Cancel' : 'Add New Item'}
                      </button>
                    </div>

                    {showProductForm && (
                      <div className="glass p-6 rounded-2xl space-y-4 border-emerald-500/20 bg-emerald-500/10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Product Name</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Sugar / Chini" 
                              className="w-full glass bg-white/5 p-3 rounded-lg text-sm border-white/10"
                              value={newProduct.name}
                              onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Price (Rs.)</label>
                            <input 
                              type="number" 
                              placeholder="0.00" 
                              className="w-full glass bg-white/5 p-3 rounded-lg text-sm border-white/10"
                              value={newProduct.price}
                              onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Details / Info</label>
                            <textarea 
                              placeholder="Rate per kg, or special discounts etc." 
                              className="w-full glass bg-white/5 p-3 rounded-lg text-sm border-white/10 h-24 resize-none"
                              value={newProduct.description}
                              onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => {
                              setShowProductForm(false);
                              setEditingProduct(null);
                            }} 
                            className="px-5 py-2 text-xs font-bold text-slate-400"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => {
                              if (!newProduct.name || !newProduct.price) return;
                              if (editingProduct) {
                                setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...newProduct } : p));
                                setEditingProduct(null);
                              } else {
                                setProducts([...products, { ...newProduct, id: Date.now() }]);
                              }
                              setNewProduct({ name: '', description: '', price: '' });
                              setShowProductForm(false);
                            }}
                            className="px-8 py-2 bg-emerald-500 text-slate-950 rounded-lg text-sm font-bold shadow-lg active:scale-95"
                          >
                            {editingProduct ? 'Update Price' : 'Add to List'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-4 px-4 text-[10px] uppercase font-bold text-slate-600 font-mono tracking-widest">
                        <div className="col-span-8">Product / Description</div>
                        <div className="col-span-4 text-right">Price (PKR)</div>
                      </div>
                      {products.map(p => (
                        <div key={p.id} className="glass p-5 rounded-2xl flex flex-col gap-2 group hover:bg-white/5 transition-all border-white/5">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                              </div>
                              <p className="font-bold text-lg">{p.name}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="font-mono font-bold text-emerald-400 text-xl tracking-tighter">Rs. {p.price}</p>
                              <button 
                                onClick={() => {
                                  setEditingProduct(p);
                                  setNewProduct({ name: p.name, description: p.description, price: p.price });
                                  setShowProductForm(true);
                                }}
                                className="p-2 opacity-0 group-hover:opacity-100 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                title="Edit Price"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setProducts(products.filter(item => item.id !== p.id))}
                                className="p-2 opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                title="Delete"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="pl-14">
                            <p className="text-sm text-slate-400 leading-relaxed italic">{p.description || 'No detailed description added.'}</p>
                          </div>
                        </div>
                      ))}
                      {products.length === 0 && !showProductForm && (
                        <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                          <ShoppingBag className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                          <p className="text-slate-500 italic">"Koi product nahi mila. Aap yahan product list bana saktay hain taki COB WhatsApp par jawab de sakay."</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'store' && (
              <div className="p-8 space-y-8">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-3xl flex items-center justify-center mb-4 shadow-2xl">
                    <IndianRupee className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-bold">COB Store</h3>
                  <p className="text-slate-400 mt-2 max-w-md">Use your COB Coins to grow your business into an empire!</p>
                  <div className="mt-4 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 font-bold">
                    Balance: {coins} Coins
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StoreItem 
                    title="Medium Shop Expansion"
                    description="Expand your shop with more inventory space and faster COB processing."
                    cost={1000}
                    disabled={shopSize !== 'Small'}
                    purchased={shopSize === 'Medium' || shopSize === 'Large' || shopSize === 'Palatial'}
                    onBuy={() => {
                      if (coins >= 1000) {
                        setCoins(prev => prev - 1000);
                        setShopSize('Medium');
                        speak("Mubarak ho! Aapki dukan ab Medium ho gayi hai.");
                      }
                    }}
                  />
                  <StoreItem 
                    title="Large Inventory Hub"
                    description="Access advanced data insights and manage up to 500 products."
                    cost={2500}
                    disabled={shopSize !== 'Medium'}
                    purchased={shopSize === 'Large' || shopSize === 'Palatial'}
                    onBuy={() => {
                      if (coins >= 2500) {
                        setCoins(prev => prev - 2500);
                        setShopSize('Large');
                        speak("Aapki dukan ab bare level par aa gayi hai. Large Shop unlocked!");
                      }
                    }}
                  />
                   <StoreItem 
                    title="AI WhatsApp Pro"
                    description="Let AI handle multiple customers on WhatsApp at once."
                    cost={0}
                    purchased={true}
                    onBuy={() => {}}
                  />
                </div>
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
                    <h2 className="text-xl font-bold">Rozana History</h2>
                    <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Daily Business Records</p>
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
                      {day.items.map((t, tIdx) => (
                        <TransactionRow key={tIdx} t={t} context="history" />
                      ))}
                    </div>
                  </div>
                ))}
                
                {dayWiseHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500 italic">
                    <History className="w-12 h-12 mb-4 opacity-20" />
                    <p>Koi history nahi mili.</p>
                  </div>
                )}
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
          <span>Gemini 3.0 Pro</span>
          <span>Sync Status: Stable</span>
        </div>
      </footer>
    </div>
  );
}

function TransactionRow({ t, context }: any) {
  const isDebtContext = context === 'all_debt' || context === 'debt' || context === 'customers';
  
  let amountSign = '+';
  let colorStyle = 'text-emerald-400 bg-emerald-500/20';
  let typeLabel = t.type;

  if (isDebtContext) {
    if (t.type === 'debt') { 
      amountSign = '+'; 
      colorStyle = 'text-rose-400 bg-rose-500/20'; 
      typeLabel = 'Udhaar Diya (Baqiya)';
    }
    if (t.type === 'payment') { 
      amountSign = '-'; 
      colorStyle = 'text-emerald-400 bg-emerald-500/20'; 
      typeLabel = 'Udhaar Wapsi (Jama)';
    }
  } else {
    if (t.type === 'income') { 
      amountSign = '+'; 
      colorStyle = 'text-emerald-400 bg-emerald-500/20'; 
      typeLabel = 'Kamai';
    }
    if (t.type === 'payment') { 
      amountSign = '-'; 
      colorStyle = 'text-emerald-400 bg-emerald-500/20'; 
      typeLabel = 'Udhaar Wapsi (Jama)';
    }
    if (t.type === 'expense') { 
      amountSign = '-'; 
      colorStyle = 'text-rose-400 bg-rose-500/20'; 
      typeLabel = 'Kharcha';
    }
    if (t.type === 'debt') { 
      amountSign = '+'; 
      colorStyle = 'text-blue-400 bg-blue-500/20'; 
      typeLabel = 'Udhaar Diya';
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
      <div className="flex items-center gap-6">
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
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            const text = `COB Business Bill:
Item: ${t.description}
Price: Rs. ${t.amount}
Date: ${t.timestamp?.seconds ? safeFormat(new Date(t.timestamp.seconds * 1000), 'p, MMM d') : 'Ajj'}
Shukriya!`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
          }}
          className="p-3 bg-white/5 hover:bg-emerald-500 hover:text-slate-950 rounded-xl transition-all shadow-lg active:scale-95 group/wa"
          title="Share via WhatsApp"
        >
          <Share2 className="w-4 h-4" />
        </button>
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

function DayCard({ day }: { day: any }) {
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
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Kamai</p>
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
                <TransactionRow key={idx} t={t} context="history" />
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
