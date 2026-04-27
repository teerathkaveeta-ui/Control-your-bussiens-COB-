import React, { useState, useEffect } from 'react';
import { 
  auth, 
  loginWithGoogle, 
  addTransaction, 
  getRecentTransactions, 
  updateCustomerDebt,
  setShopStatus,
  getShopData
} from './services/firebase';
import { parseBusinessInput, answerBusinessQuestion } from './services/gemini';
import VoiceRecorder from './components/VoiceRecorder';
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
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

const Logo = () => (
  <div className="flex items-end gap-[2px] h-8 w-10">
    <div className="w-2 h-3 bg-emerald-500 rounded-[1px] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
    <div className="w-2 h-5 bg-emerald-400 rounded-[1px] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
    <div className="w-2 h-8 bg-emerald-300 rounded-[1px] shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
  </div>
);

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
          <p className="text-slate-400 mb-6 max-w-xs">App reset ho rahi hai, please thora intezar krein.</p>
          <button onClick={() => window.location.reload()} className="bg-emerald-500 text-slate-950 px-6 py-2 rounded-xl font-bold">Refresh App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [view, setView] = useState<'dashboard' | 'history' | 'customers' | 'ai' | 'whatsapp'>('dashboard');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '' });
  const [shopOn, setShopOn] = useState(false);
  const [lastSessionStart, setLastSessionStart] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: any) => {
      setUser(user);
      if (user) {
        const shopData = await getShopData();
        setShopOn(shopData.shopOn);
        setLastSessionStart(shopData.lastSessionStart);
        loadData(user.uid);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleShop = async () => {
    const newState = !shopOn;
    await setShopStatus(newState);
    setShopOn(newState);
    if (newState) {
      setLastSessionStart(Date.now());
    } else {
      setLastSessionStart(null);
    }
    const msg = newState ? "Dukan khul gayi hai." : "Dukan barha di gayi hai.";
    setAiResponse(msg);
    speak(msg);
  };

  const loadData = async (uid: string) => {
    const data = await getRecentTransactions(uid);
    setTransactions(data);
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

  const handleTranscript = async (transcript: string) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      setIsProcessing(true);
      const result = await parseBusinessInput(transcript);
      
      if (result.intent === 'record') {
        const parsed = result.data;
        await addTransaction(user.uid, {
          ...parsed,
          rawInput: transcript,
        });

        if ((parsed.type === 'debt' || parsed.type === 'payment') && parsed.customerName) {
          // If payment, amount is negative in terms of debt balance
          const debtChange = parsed.type === 'payment' ? -parsed.amount : parsed.amount;
          await updateCustomerDebt(user.uid, parsed.customerName, debtChange);
        }

        await loadData(user.uid);
        const responseText = parsed.type === 'payment' 
          ? `COB ne Rs. ${parsed.amount} ki wapsi record kar li hai. Ahmed ka hisab kat gaya hai.`
          : `COB ne Rs. ${parsed.amount} record kar liya hai. Description: ${parsed.description}.`;
        setAiResponse(responseText);
        speak(responseText);
      } else if (result.intent === 'query') {
        // Question mode
        const context = transactions.slice(0, 50).map(t => 
          `${t.description}: Rs. ${t.amount} (${t.type})${t.customerName ? ' for ' + t.customerName : ''}`
        ).join('\n');
        
        const answer = await answerBusinessQuestion(result.question, context);
        setAiResponse(answer);
        speak(answer);
      }
    } catch (error) {
      console.error("Failed to process voice:", error);
      const errorMsg = "COB ko samajh nahi aaya. Dubara boliye?";
      setAiResponse(errorMsg);
      speak(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
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
          className="flex items-center gap-4 bg-white text-slate-950 px-10 py-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all font-bold group"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          Get Started with COB
        </button>
      </motion.div>
    </div>
  );

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

        const dateStr = format(date, 'yyyy-MM-dd');
        if (!groups[dateStr]) groups[dateStr] = [];
        groups[dateStr].push(t);
      });
      
      // Sort dates and map to "Day 1", "Day 2" etc.
      const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
      return sortedDates.map((date, index) => ({
        label: `Day ${sortedDates.length - index}`,
        date: format(new Date(date), 'PPP'),
        items: groups[date]
      }));
    } catch (e) {
      console.error("History grouping error:", e);
      return [];
    }
  };

  const dayWiseHistory = groupTransactionsByDay();

  // Filter transactions for "Daily" counts based on shop session
  const dailyTransactions = shopOn ? transactions.filter(t => {
    const tTime = t.timestamp?.toDate ? t.timestamp.toDate().getTime() : (t.timestamp?.seconds * 1000 || Date.now());
    return lastSessionStart ? tTime >= lastSessionStart : true;
  }) : [];

  const totalIncome = dailyTransactions
    .filter(t => t.type === 'income' || t.type === 'payment')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
    
  const totalExpense = dailyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + (t.amount || 0), 0);
    
  const totalDailyDebt = dailyTransactions
    .filter(t => t.type === 'debt')
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  // Total debt balance is net outstanding (All time)
  const totalDebtBalance = transactions.reduce((acc, t) => {
    if (t.type === 'debt') return acc + (t.amount || 0);
    if (t.type === 'payment') return acc - (t.amount || 0);
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col lg:flex-row">
      {/* Background Mesh Gradients */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <nav className="w-full lg:w-72 glass lg:border-r border-white/5 p-6 flex flex-col z-50 lg:h-screen lg:fixed">
        <div className="flex items-center gap-3 mb-12">
          <Logo />
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight leading-none">COB</span>
            <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase mt-1">AI Assistant</span>
          </div>
        </div>
        
        <div className="flex lg:flex-col gap-2 flex-grow overflow-x-auto lg:overflow-visible no-scrollbar pb-4 lg:pb-0">
          <NavItem icon={BarChart3} label="Ajj ki Kamai" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
          <NavItem icon={History} label="Hisab Kitab" active={view === 'history'} onClick={() => setView('history')} />
          <NavItem icon={Users} label="Lenden / Udhaari" active={view === 'customers'} onClick={() => setView('customers')} />
          <NavItem icon={ShoppingBag} label="Products (Prices)" active={view === 'whatsapp'} onClick={() => setView('whatsapp')} />
          <NavItem icon={MessageSquare} label="COB WhatsApp" active={view === 'ai'} onClick={() => setView('ai')} />
        </div>

        <div className="hidden lg:block pt-6 border-t border-white/5">
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
      </nav>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 p-4 lg:p-10 relative z-10 max-w-7xl mx-auto w-full pb-24 lg:pb-10">
        {/* Mobile secondary info - simplified */}
        <header className="flex justify-end items-center mb-6 lg:hidden">
          <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-white/10" />
        </header>

        <section className="mb-12">
          <h2 className="text-4xl font-bold mb-2 tracking-tight">Kese hain <span className="text-emerald-400">aap</span>?</h2>
          <p className="text-slate-400 font-light italic">"COB is monitoring your shop's transactions in real-time."</p>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard label="Ajj ki Kamai" value={totalIncome} type="up" icon={TrendingUp} onClick={() => setView('history')} />
          <StatCard label="Ajj ke Kharchay" value={totalExpense} type="down" icon={Wallet} onClick={() => setView('history')} />
          <StatCard label="Ajj ka Udhaar" value={totalDailyDebt} type="debt" icon={CreditCard} onClick={() => setView('customers')} />
          <StatCard label="Udhaar (Ardē)" value={totalDebtBalance} type="all" icon={Smartphone} onClick={() => setView('customers')} />
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
        <section className="glass rounded-[2rem] p-10 flex flex-col items-center mb-12 shadow-inner border shadow-white/5">
          <VoiceRecorder onTranscript={handleTranscript} isProcessing={isProcessing} />
          
          <div className="mt-8 w-full max-w-lg relative group">
            <input 
              type="text" 
              placeholder="COB ko batayein..." 
              className="w-full glass bg-white/5 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-light italic text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleTranscript((e.target as HTMLInputElement).value)}
            />
            <button className="absolute right-3 top-2.5 p-2 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 active:scale-90 transition-transform">
              <Send className="w-4 h-4 text-slate-950" />
            </button>
          </div>

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
              <button 
                onClick={() => document.querySelector('nav')?.classList.toggle('-translate-x-full')}
                className="lg:hidden p-2 hover:bg-white/10 rounded-xl"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex flex-col">
                <h3 className="font-bold text-xl uppercase tracking-tight">
                  {view === 'dashboard' && 'Ajj ke Kaam'}
                  {view === 'history' && 'Purani History'}
                  {view === 'customers' && 'Pending Hisab'}
                  {view === 'ai' && 'COB WhatsApp Sync'}
                  {view === 'whatsapp' && 'Product List'}
                </h3>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1">Database Sync: Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(view === 'dashboard' || view === 'history') && (
                <button 
                  onClick={() => setShowHistoryDetail(true)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  title="Full History"
                >
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
              )}
              {view === 'history' && <button className="p-2 glass rounded-lg text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-widest">Filter</button>}
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
                {(view === 'dashboard' ? dailyTransactions : transactions).map((t) => (
                  <TransactionRow key={t.id} t={t} />
                ))}
              </div>
            )}

            {view === 'customers' && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(transactions.reduce((acc: any, t) => {
                  if (t.customerName) {
                    if (!acc[t.customerName]) acc[t.customerName] = { name: t.customerName, total: 0 };
                    if (t.type === 'debt') acc[t.customerName].total += (t.amount || 0);
                    if (t.type === 'payment') acc[t.customerName].total -= (t.amount || 0);
                  }
                  return acc;
                }, {})).filter((c: any) => c.total > 0).map((customer: any, idx) => (
                  <div key={idx} className="glass p-5 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 glass rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{customer.name}</p>
                        <p className="text-xs text-rose-400 font-mono italic">Kul Baqi: Rs. {customer.total.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button className="p-2 glass rounded-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 text-emerald-400" title="Payment Record">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button className="p-2 glass rounded-lg opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 text-blue-400">
                        <Smartphone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {transactions.filter(t => t.type === 'debt').length === 0 && (
                  <p className="col-span-2 text-center py-20 text-slate-600 font-light italic tracking-tight">"Everyone has cleared their bills! COB is impressed."</p>
                )}
              </div>
            )}

            {view === 'ai' && (
              <div className="p-8 space-y-8">
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
              </div>
            )}

            {view === 'whatsapp' && (
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-lg font-bold">Manage Products</h4>
                    <p className="text-xs text-slate-500">Add products for AI to reply on WhatsApp</p>
                  </div>
                  <button 
                    onClick={() => setShowProductForm(!showProductForm)}
                    className="p-3 bg-emerald-500 text-slate-950 rounded-xl font-bold flex items-center gap-2 text-sm hover:scale-105 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
                </div>

                {showProductForm && (
                  <div className="glass p-6 rounded-2xl space-y-4 border-emerald-500/20 bg-emerald-500/5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Product Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Sugar, Oil" 
                          className="w-full glass bg-white/5 p-3 rounded-lg text-sm border-white/10"
                          value={newProduct.name}
                          onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Price (Rs)</label>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          className="w-full glass bg-white/5 p-3 rounded-lg text-sm border-white/10"
                          value={newProduct.price}
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 font-mono">Description</label>
                        <input 
                          type="text" 
                          placeholder="Optional details" 
                          className="w-full glass bg-white/5 p-3 rounded-lg text-sm border-white/10"
                          value={newProduct.description}
                          onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowProductForm(false)} className="px-5 py-2 text-xs font-bold text-slate-400">Cancel</button>
                      <button 
                        onClick={() => {
                          if (newProduct.name && newProduct.price) {
                            setProducts([...products, { ...newProduct, id: Date.now() }]);
                            setNewProduct({ name: '', description: '', price: '' });
                            setShowProductForm(false);
                          }
                        }}
                        className="px-6 py-2 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold"
                      >
                        Save Product
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {products.map(p => (
                    <div key={p.id} className="glass p-4 rounded-xl flex justify-between items-center group hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.description || 'No description'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="font-mono font-bold text-emerald-400 text-lg">Rs. {p.price}</p>
                        <button 
                          onClick={() => setProducts(products.filter(item => item.id !== p.id))}
                          className="p-2 opacity-0 group-hover:opacity-100 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {products.length === 0 && !showProductForm && (
                   <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                      <ShoppingBag className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-500 italic">"Koi product nahi mila. Aap yahan product list bana saktay hain."</p>
                    </div>
                  )}
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
                    
                    <div className="space-y-3 pl-4 border-l border-white/10">
                      {day.items.map((t, tIdx) => (
                        <div key={tIdx} className="flex justify-between items-center py-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              t.type === 'income' || t.type === 'payment' ? 'bg-emerald-500' : 
                              t.type === 'expense' ? 'bg-rose-500' : 'bg-blue-500'
                            }`} />
                            <span className="text-sm font-medium">{t.description}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`text-sm font-mono font-bold ${
                              t.type === 'income' || t.type === 'payment' ? 'text-emerald-400' : 
                              t.type === 'expense' || t.type === 'debt' ? 'text-rose-400' : 'text-blue-400'
                            }`}>
                              {t.type === 'expense' || t.type === 'debt' ? '-' : '+'}Rs. {t.amount}
                            </span>
                          </div>
                        </div>
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

function TransactionRow({ t }: any) {
  return (
    <div className="p-5 glass rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all border-none mb-2">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
          t.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 
          t.type === 'expense' ? 'bg-rose-500/20 text-rose-400' : 
          t.type === 'payment' ? 'bg-amber-500/20 text-amber-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {t.type === 'income' ? <Plus className="w-6 h-6" /> : 
           t.type === 'payment' ? <CheckCircle2 className="w-6 h-6" /> :
           <History className="w-6 h-6" />}
        </div>
        <div>
          <p className="font-bold text-lg leading-tight">{t.description}</p>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1">
            {t.timestamp?.seconds ? format(new Date(t.timestamp.seconds * 1000), 'p, MMM d') : 'Just now'}
            {t.customerName && ` • Target: ${t.customerName}`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xl font-bold font-mono tracking-tighter ${
          t.type === 'income' || t.type === 'payment' ? 'text-emerald-400' : 
          t.type === 'expense' ? 'text-rose-400' : 
          'text-blue-400'
        }`}>
          {t.type === 'expense' || t.type === 'debt' ? '-' : '+'}Rs. {t.amount?.toLocaleString()}
        </p>
        <div className={`text-[8px] uppercase font-bold tracking-widest opacity-30 mt-1 ${
          t.type === 'income' ? 'text-emerald-400' : 
          t.type === 'expense' ? 'text-rose-400' : 
          t.type === 'payment' ? 'text-amber-400' :
          'text-blue-400'
        }`}>
          {t.type === 'payment' ? 'Udhar Wapsi' : t.type}
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm whitespace-nowrap lg:whitespace-normal ${
        active 
          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
          : 'text-slate-400 hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {label}
    </button>
  );
}

function StatCard({ label, value, type, icon: Icon, onClick }: any) {
  const styles: any = {
    up: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10',
    down: 'text-rose-400 bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10',
    debt: 'text-blue-400 bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10',
    all: 'text-amber-400 bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10'
  };

  const currentStyle = styles[type] || styles.debt;

  return (
    <div 
      onClick={onClick}
      className={`p-6 glass-card border-white/5 relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer ${currentStyle.split(' ')[1] || ''}`}
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
