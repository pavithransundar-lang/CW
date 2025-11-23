import React, { useEffect, useState, useMemo } from 'react';
import { WalletData, INITIAL_WALLET_STATE, Transaction, TransactionType, Settings } from './types';
import { subscribeToWallet, updateWalletData, resetWallet, isMockMode } from './services/firebase';
import { CoinsIcon, BankIcon, ClockIcon, TrendingUpIcon, LockIcon, SettingsIcon, FireIcon, DownloadIcon, SunIcon, MoonIcon } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import { TimerModal } from './components/TimerModal';

function App() {
  const [data, setData] = useState<WalletData>(INITIAL_WALLET_STATE);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Timer State
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  // Bank Action State
  const [bankAmount, setBankAmount] = useState('');

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = subscribeToWallet((walletData) => {
      // Handle Daily Reset Check
      const today = new Date().toISOString().split('T')[0];
      if (walletData.lastActiveDate !== today) {
        // Reset class earnings for the new day
        const resetEarnings: Record<string, number> = {};
        const classes = walletData.settings.classes || INITIAL_WALLET_STATE.settings.classes;
        classes.forEach(c => resetEarnings[c] = 0);
        
        updateWalletData({
          classEarnings: resetEarnings,
          lastActiveDate: today
        });
      }

      // Ensure selectedClass is valid
      const currentClasses = walletData.settings.classes || [];
      
      // Fix migration if classEarnings is number (legacy)
      if (typeof walletData.classEarnings === 'number') {
        walletData.classEarnings = INITIAL_WALLET_STATE.classEarnings;
      }

      setData(walletData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect to set initial selected class once data is loaded or changed
  useEffect(() => {
    if (!loading && data.settings.classes.length > 0) {
        // If current selected class is not in the list (deleted or renamed), or empty
        if (!selectedClass || !data.settings.classes.includes(selectedClass)) {
            setSelectedClass(data.settings.classes[0]);
        }
    }
  }, [loading, data.settings.classes, selectedClass]);

  // --- Actions ---

  const addTransaction = (type: TransactionType, amount: number, description: string) => {
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      type,
      amount,
      description,
      timestamp: Date.now(),
      className: selectedClass
    };
    
    // Calculate new state based on type
    const updates: Partial<WalletData> = {
      history: [newTx, ...data.history].slice(0, 50), // Keep last 50
    };

    if (type === 'EARN') {
      updates.balance = data.balance + amount;
      
      // Update specific class earnings
      const currentClassEarnings = { ...data.classEarnings };
      currentClassEarnings[selectedClass] = (currentClassEarnings[selectedClass] || 0) + amount;
      updates.classEarnings = currentClassEarnings;

      updates.stats = {
        ...data.stats,
        totalLifetimeEarnings: data.stats.totalLifetimeEarnings + amount
      };
    } else if (type === 'SPEND') {
      updates.balance = data.balance - amount;
    } else if (type === 'DEPOSIT') {
      updates.balance = data.balance - amount;
      updates.savedBalance = data.savedBalance + amount;
      
      // Streak Logic
      const today = new Date().toISOString().split('T')[0];
      const last = data.stats.lastDepositDate;
      let newStreak = data.stats.currentStreak;
      
      if (last !== today) {
        // If last was yesterday, increment. Else if not today, reset to 1.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];
        
        if (last === yStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      updates.stats = {
        ...data.stats,
        totalLifetimeSavings: data.stats.totalLifetimeSavings + amount,
        lastDepositDate: today,
        currentStreak: newStreak
      };

    } else if (type === 'WITHDRAW') {
      updates.savedBalance = data.savedBalance - amount;
      updates.balance = data.balance + amount;
    }

    updateWalletData(updates);
  };

  const handleStartClass = () => {
     // Reset only for current class
     const currentClassEarnings = { ...data.classEarnings };
     currentClassEarnings[selectedClass] = 0;
     updateWalletData({ classEarnings: currentClassEarnings });
  };

  const handleNextClass = () => {
      const classes = data.settings.classes;
      const currentIndex = classes.indexOf(selectedClass);
      if (currentIndex >= 0 && currentIndex < classes.length - 1) {
          setSelectedClass(classes[currentIndex + 1]);
      } else {
          // Loop back
          setSelectedClass(classes[0]);
      }
  };

  const handleShopPurchase = (cost: number, minutes: number) => {
    if (data.balance >= cost) {
      addTransaction('SPEND', cost, `Purchased ${minutes}m Screen Time`);
      setTimerMinutes(minutes);
      setIsTimerOpen(true);
    }
  };

  const handleBankAction = (type: 'DEPOSIT' | 'WITHDRAW') => {
    const val = parseFloat(bankAmount);
    if (isNaN(val) || val <= 0) return;
    
    if (type === 'DEPOSIT') {
      if (data.balance >= val) {
        addTransaction('DEPOSIT', val, 'Deposit to Bank');
        setBankAmount('');
      } else {
        alert("Insufficient funds in wallet.");
      }
    } else {
      if (data.savedBalance >= val) {
        addTransaction('WITHDRAW', val, 'Withdraw from Bank');
        setBankAmount('');
      } else {
        alert("Insufficient funds in bank.");
      }
    }
  };

  const handleImport = () => {
    const lines = importText.split('\n');
    let importedCount = 0;
    lines.forEach(line => {
      const [type, amtStr, desc] = line.split(',');
      if (type && amtStr) {
        if (type.trim().toUpperCase() === 'EARN') {
             const amt = parseFloat(amtStr);
             if (!isNaN(amt)) {
                 addTransaction('EARN', amt, desc || 'Imported');
                 importedCount++;
             }
        }
      }
    });
    alert(`Imported ${importedCount} earning records.`);
    setIsImportOpen(false);
    setImportText('');
  };

  const exportHistory = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
        + "Date,Class,Type,Amount,Description\n"
        + data.history.map(row => {
            return `${new Date(row.timestamp).toLocaleDateString()},${row.className || 'General'},${row.type},${row.amount},"${row.description}"`
        }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "wallet_history.csv");
    document.body.appendChild(link);
    link.click();
  };

  // --- Derived State ---
  const currency = data.settings.currencySymbol;
  
  // Use optional chaining or fallback for classEarnings in case of migration lag
  const currentClassEarned = (data.classEarnings && data.classEarnings[selectedClass]) || 0;
  const earningsProgress = (currentClassEarned / data.settings.maxClassEarnings) * 100;
  
  const bestRatio = useMemo(() => {
    if (data.settings.shopItems.length === 0) return 0;
    return Math.max(...data.settings.shopItems.map(i => i.minutes / i.cost));
  }, [data.settings.shopItems]);
  
  const estimatedMinutes = Math.floor(data.balance * bestRatio);

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Get next class name for UI
  const nextClassName = useMemo(() => {
      const idx = data.settings.classes.indexOf(selectedClass);
      if (idx !== -1 && idx < data.settings.classes.length - 1) {
          return data.settings.classes[idx + 1];
      }
      return data.settings.classes[0];
  }, [selectedClass, data.settings.classes]);

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-emerald-600 font-bold text-xl">Loading Classroom Wallet...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20 transition-colors duration-200">
      
      {/* --- Minimal Header --- */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                    <CoinsIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white hidden sm:block">
                    {data.settings.appTitle}
                </h1>
            </div>
            
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 hidden sm:block">
                    {todayDate}
                </span>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                     {darkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
                </button>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">
                      <SettingsIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        
        {/* --- HERO: SESSION & PROGRESS --- */}
        {/* High contrast, dedicated zone for "What is happening NOW" */}
        <section className="bg-gray-900 dark:bg-black rounded-3xl p-1 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                 <ClockIcon className="w-64 h-64 text-white" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row">
                
                {/* Left: Class Context */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-800">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-400 text-sm font-bold tracking-widest uppercase">Current Class</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        {selectedClass}
                    </h2>
                    
                    <button 
                        onClick={handleNextClass}
                        className="group flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-4 py-3 w-fit transition-all active:scale-95"
                    >
                        <span className="text-gray-400 font-medium text-sm">Next:</span>
                        <span className="font-bold">{nextClassName}</span>
                        <svg className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>

                {/* Right: Progress Context */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                             <span className="text-gray-400 text-xs uppercase font-bold tracking-widest">Earnings this period</span>
                             <div className="text-3xl font-bold text-white mt-1">
                                <span className="text-emerald-400">{currency}{currentClassEarned.toFixed(2)}</span>
                                <span className="text-gray-600 text-xl"> / {data.settings.maxClassEarnings}</span>
                             </div>
                        </div>
                        <button onClick={handleStartClass} className="text-gray-600 hover:text-white text-xs underline transition">
                            Reset Class
                        </button>
                    </div>

                    {/* Big Progress Bar */}
                    <div className="h-6 w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                        <div 
                            className={`h-full transition-all duration-700 ease-out flex items-center justify-end px-2 ${earningsProgress >= 100 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                            style={{ width: `${Math.min(100, Math.max(5, earningsProgress))}%` }}
                        >
                        </div>
                    </div>
                    <p className="mt-3 text-sm text-gray-400 font-medium">
                        {earningsProgress >= 100 
                            ? "⚠️ Class Limit Reached! Great job!" 
                            : "Keep participating to fill the bar!"}
                    </p>
                </div>
            </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* --- LEFT COLUMN: WALLET & SPENDING (8 cols) --- */}
            <div className="lg:col-span-8 space-y-8">
                
                {/* 1. BIG WALLET DISPLAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl p-6 border-2 border-emerald-100 dark:border-emerald-800/30 flex flex-col justify-between">
                         <div>
                            <div className="flex items-center gap-2 mb-2">
                                <CoinsIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <h3 className="text-emerald-900 dark:text-emerald-100 font-bold uppercase tracking-wide text-sm">My Wallet</h3>
                            </div>
                            <div className="text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {currency}{data.balance.toFixed(2)}
                            </div>
                         </div>
                         <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                            <ClockIcon className="w-8 h-8 text-blue-500" />
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Reward Power</div>
                                <div className="text-lg font-bold text-gray-800 dark:text-white">~{estimatedMinutes} Minutes</div>
                            </div>
                         </div>
                    </div>

                    {/* Bank / Savings Card - Simplified */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-3xl p-6 border-2 border-blue-100 dark:border-blue-800/30">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <BankIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <h3 className="text-blue-900 dark:text-blue-100 font-bold uppercase tracking-wide text-sm">Savings</h3>
                            </div>
                             <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-lg text-xs font-bold">
                                <FireIcon className="w-3 h-3" /> {data.stats.currentStreak} Day Streak
                            </div>
                        </div>
                        <div className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-6">
                             {currency}{data.savedBalance.toFixed(2)}
                        </div>
                        
                        <div className="space-y-2">
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                value={bankAmount}
                                onChange={(e) => setBankAmount(e.target.value)}
                                className="w-full text-center text-lg font-bold bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-xl py-2 px-4 focus:ring-4 focus:ring-blue-200 outline-none dark:text-white"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => handleBankAction('DEPOSIT')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl transition shadow-lg shadow-blue-200 dark:shadow-none">
                                    Deposit
                                </button>
                                <button onClick={() => handleBankAction('WITHDRAW')} className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-800 font-bold py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 transition">
                                    Withdraw
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. REWARD SHOP (Cards) */}
                <div>
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="bg-purple-100 dark:bg-purple-900/30 p-1.5 rounded-lg text-purple-600">🛍️</span> Spend Rewards
                     </h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {data.settings.shopItems.map(item => {
                            const canAfford = data.balance >= item.cost;
                            return (
                            <button 
                                key={item.id}
                                disabled={!canAfford}
                                onClick={() => handleShopPurchase(item.cost, item.minutes)}
                                className={`relative group flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-300 border-b-4 active:border-b-0 active:translate-y-1
                                ${canAfford 
                                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-sm hover:shadow-xl cursor-pointer' 
                                    : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed grayscale'}
                                `}
                            >
                                <div className="text-3xl font-black text-gray-800 dark:text-white mb-1">{item.minutes}m</div>
                                <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">{item.label}</div>
                                
                                <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1
                                    ${canAfford ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}
                                `}>
                                    {currency}{item.cost.toFixed(2)}
                                </div>
                                {!canAfford && <div className="absolute top-4 right-4 text-gray-300"><LockIcon className="w-5 h-5"/></div>}
                            </button>
                            );
                        })}
                     </div>
                </div>

            </div>

            {/* --- RIGHT COLUMN: TEACHER CONTROLS (4 cols) --- */}
            <div className="lg:col-span-4 space-y-8">
                
                {/* ADD FUNDS PANEL */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none">
                     <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg text-emerald-600">➕</span> Add Earnings
                     </h3>
                     
                     <div className="grid grid-cols-1 gap-3">
                        {[0.50, 1.00, 2.00].map(amt => {
                            const isOverLimit = (currentClassEarned + amt) > data.settings.maxClassEarnings;
                            return (
                                <button
                                    key={amt}
                                    disabled={isOverLimit}
                                    onClick={() => addTransaction('EARN', amt, 'Good Job')}
                                    className={`w-full py-4 px-6 rounded-2xl flex items-center justify-between border-2 transition-all active:scale-95
                                        ${isOverLimit 
                                            ? 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-400 cursor-not-allowed' 
                                            : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 group'}
                                    `}
                                >
                                    <span className="font-bold text-gray-600 dark:text-gray-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200">
                                        {amt === 0.50 ? "Good Effort" : amt === 1.00 ? "Great Job" : "Excellent"}
                                    </span>
                                    <span className={`text-xl font-black ${isOverLimit ? 'text-gray-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        +{currency}{amt.toFixed(2)}
                                    </span>
                                </button>
                            )
                        })}
                         {/* Manual / Large Amount */}
                         <button
                            disabled={(currentClassEarned + 5) > data.settings.maxClassEarnings}
                            onClick={() => addTransaction('EARN', 5.00, 'Super Star')}
                            className="mt-2 w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:shadow-xl hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                            🌟 Super Star (+{currency}5.00)
                         </button>
                     </div>
                </div>

                {/* GOALS */}
                <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-3xl p-6 border-2 border-yellow-100 dark:border-yellow-900/30">
                    <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-100 mb-4">Class Rules</h3>
                    <ul className="space-y-4">
                        {data.settings.goals.map((goal, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <div className="min-w-[24px] h-[24px] rounded-full bg-yellow-200 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200 flex items-center justify-center font-bold text-xs">
                                    {idx + 1}
                                </div>
                                <span className="text-yellow-900 dark:text-yellow-100 font-medium text-sm leading-tight mt-1">{goal}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* History Link (Subtle) */}
                <div className="text-center">
                    <button onClick={() => setIsImportOpen(!isImportOpen)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium underline">
                        Manage History / Import
                    </button>
                    {isImportOpen && (
                        <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl absolute right-4 left-4 lg:left-auto lg:w-96 z-50 border border-gray-100">
                             <h4 className="font-bold mb-2 dark:text-white">Quick Import</h4>
                             <textarea 
                                className="w-full text-xs p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white mb-2" 
                                rows={4} 
                                placeholder="Paste CSV data here..."
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                             />
                             <div className="flex gap-2">
                                <button onClick={handleImport} className="flex-1 bg-gray-900 text-white rounded-lg py-2 text-sm">Run Import</button>
                                <button onClick={exportHistory} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm">Download CSV</button>
                             </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
      </main>

      {/* --- Modals --- */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={data.settings}
        onSave={(newSettings) => updateWalletData({ settings: newSettings })}
        onReset={resetWallet}
      />

      <TimerModal 
        isOpen={isTimerOpen}
        onClose={() => setIsTimerOpen(false)}
        minutes={timerMinutes}
      />
    </div>
  );
}

export default App;