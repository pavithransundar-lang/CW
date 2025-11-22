import React, { useEffect, useState, useMemo } from 'react';
import { WalletData, INITIAL_WALLET_STATE, Transaction, TransactionType, Settings } from './types';
import { subscribeToWallet, updateWalletData, resetWallet, isMockMode } from './services/firebase';
import { CoinsIcon, BankIcon, ClockIcon, TrendingUpIcon, LockIcon, SettingsIcon, FireIcon, DownloadIcon } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import { TimerModal } from './components/TimerModal';

function App() {
  const [data, setData] = useState<WalletData>(INITIAL_WALLET_STATE);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  
  // Timer State
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  // Bank Action State
  const [bankAmount, setBankAmount] = useState('');

  // Import State
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

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
        // We will receive the update in the next snapshot
      }

      // Ensure selectedClass is valid
      const currentClasses = walletData.settings.classes || [];
      if (currentClasses.length > 0 && (!selectedClass || !currentClasses.includes(selectedClass))) {
        setSelectedClass(currentClasses[0]);
      }

      // Fix migration if classEarnings is number (legacy)
      if (typeof walletData.classEarnings === 'number') {
        walletData.classEarnings = INITIAL_WALLET_STATE.classEarnings;
      }

      setData(walletData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedClass]);

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

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-emerald-600">Loading Wallet...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">
      {isMockMode && (
        <div className="bg-amber-100 text-amber-800 px-4 py-2 text-xs text-center font-medium">
          Demo Mode: Data is stored locally. Configure Firebase for cloud sync.
        </div>
      )}

      {/* --- Header --- */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <CoinsIcon className="w-6 h-6 text-emerald-500" />
                    {data.settings.appTitle}
                    </h1>
                    <div className="text-sm text-gray-500 mt-1">
                        Student: <span className="font-semibold text-gray-700">{data.settings.studentName}</span>
                        <span className="mx-2">•</span>
                        Teacher: <span className="font-semibold text-gray-700">{data.settings.teacherName}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">
                        {todayDate}
                    </div>
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition">
                    <SettingsIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* --- Class Selector --- */}
        <div className="flex overflow-x-auto pb-2 space-x-2 no-scrollbar">
            {data.settings.classes.map(cls => (
                <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        selectedClass === cls 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    {cls}
                </button>
            ))}
        </div>

        {/* --- Dashboard Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. Wallet Balance */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <CoinsIcon className="w-32 h-32" />
            </div>
            <p className="text-emerald-100 font-medium">Current Balance</p>
            <div className="text-4xl font-bold mt-2">{currency} {data.balance.toFixed(2)}</div>
            <div className="mt-4 flex items-center gap-2 text-emerald-50 bg-white/20 px-3 py-1 rounded-full w-fit text-sm backdrop-blur-sm">
              <ClockIcon className="w-4 h-4" />
              <span>~{estimatedMinutes} mins available</span>
            </div>
          </div>

          {/* 2. Bank / Savings */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-500 font-medium flex items-center gap-2">
                  <BankIcon className="w-5 h-5 text-blue-500" /> Savings Bank
                </h3>
                <div className="flex items-center gap-1 text-orange-500 text-sm font-bold bg-orange-50 px-2 py-1 rounded-full">
                  <FireIcon className="w-4 h-4" />
                  {data.stats.currentStreak} Day Streak
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{currency} {data.savedBalance.toFixed(2)}</div>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Amount" 
                  value={bankAmount}
                  onChange={(e) => setBankAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBankAction('DEPOSIT')}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition"
                >
                  Deposit
                </button>
                <button 
                  onClick={() => handleBankAction('WITHDRAW')}
                  className="flex-1 bg-gray-50 text-gray-600 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition"
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>

          {/* 3. Class Earnings (Selected Class) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-500 font-medium flex items-center gap-2">
                  <TrendingUpIcon className="w-5 h-5 text-purple-500" /> 
                  <span className="truncate max-w-[100px]">{selectedClass}</span> Earnings
                </h3>
                <button onClick={handleStartClass} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset Class</button>
             </div>
             
             <div className="text-center py-2">
                <span className="text-2xl font-bold text-gray-800">{currency} {currentClassEarned.toFixed(2)}</span>
                <span className="text-gray-400 text-sm"> / {currency} {data.settings.maxClassEarnings.toFixed(2)}</span>
             </div>

             <div className="w-full bg-gray-100 rounded-full h-3 mt-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${earningsProgress >= 100 ? 'bg-red-500' : 'bg-purple-500'}`} 
                  style={{ width: `${Math.min(100, earningsProgress)}%` }}
                />
             </div>
             <p className="text-center text-xs text-gray-400 mt-2">
               {earningsProgress >= 100 ? "Daily Limit Reached" : "Daily Progress"}
             </p>
          </div>
        </div>

        {/* --- Action Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Controls */}
          <div className="lg:col-span-2 space-y-6">
             
             {/* Shop */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-emerald-500" /> Reward Shop
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {data.settings.shopItems.map(item => {
                    const canAfford = data.balance >= item.cost;
                    return (
                      <button 
                        key={item.id}
                        disabled={!canAfford}
                        onClick={() => handleShopPurchase(item.cost, item.minutes)}
                        className={`group relative p-4 rounded-xl border-2 transition-all text-left
                          ${canAfford 
                            ? 'border-emerald-100 bg-emerald-50/50 hover:border-emerald-500 hover:shadow-md cursor-pointer' 
                            : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'}
                        `}
                      >
                         <div className="font-semibold text-gray-800">{item.minutes} Mins</div>
                         <div className="text-sm text-gray-500 mb-2">{item.label}</div>
                         <div className={`text-sm font-bold ${canAfford ? 'text-emerald-600' : 'text-gray-400'}`}>
                           {currency} {item.cost.toFixed(2)}
                         </div>
                         {!canAfford && (
                            <div className="absolute top-2 right-2 text-gray-300">
                               <LockIcon className="w-4 h-4" />
                            </div>
                         )}
                      </button>
                    );
                  })}
                </div>
             </div>

             {/* Teacher Tools / Earnings */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">
                    Add Funds <span className="text-gray-400 font-normal text-sm ml-2">to {selectedClass}</span>
                </h2>
                <div className="flex flex-wrap gap-3">
                   {[0.50, 1.00, 2.00, 5.00].map(amt => {
                      const isOverLimit = (currentClassEarned + amt) > data.settings.maxClassEarnings;
                      return (
                        <button
                          key={amt}
                          disabled={isOverLimit}
                          onClick={() => addTransaction('EARN', amt, 'Class Reward')}
                          className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold border-b-4 active:border-b-0 active:translate-y-1 transition
                            ${isOverLimit 
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                              : 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'}
                          `}
                        >
                          +{currency} {amt.toFixed(2)}
                        </button>
                      )
                   })}
                </div>
             </div>

             {/* History Log */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800">History</h2>
                  <div className="flex gap-2">
                     <button onClick={() => setIsImportOpen(!isImportOpen)} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md text-gray-600 transition">Import</button>
                     <button onClick={exportHistory} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-md text-gray-600 transition flex items-center gap-1">
                        <DownloadIcon className="w-3 h-3" /> Export
                     </button>
                  </div>
                </div>

                {isImportOpen && (
                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <textarea 
                           className="w-full text-xs p-2 border rounded" 
                           rows={3} 
                           placeholder="Paste CSV: EARN,5.00,Reason"
                           value={importText}
                           onChange={e => setImportText(e.target.value)}
                        />
                        <button onClick={handleImport} className="mt-2 bg-gray-800 text-white text-xs px-3 py-1 rounded">Process Import</button>
                    </div>
                )}
                
                <div className="overflow-y-auto max-h-[300px]">
                   <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0">
                         <tr>
                           <th className="px-4 py-3">Time</th>
                           <th className="px-4 py-3">Description</th>
                           <th className="px-4 py-3 text-right">Amount</th>
                         </tr>
                      </thead>
                      <tbody>
                        {data.history.length === 0 ? (
                           <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No transactions yet.</td></tr>
                        ) : (
                           data.history.map(tx => (
                              <tr key={tx.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                 <td className="px-4 py-3 text-gray-500">
                                    <div className="flex flex-col">
                                        <span>{new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        {tx.className && <span className="text-[10px] text-purple-500 font-semibold">{tx.className}</span>}
                                    </div>
                                 </td>
                                 <td className="px-4 py-3 font-medium text-gray-700">
                                   <span className={`inline-block w-2 h-2 rounded-full mr-2 
                                     ${tx.type === 'EARN' ? 'bg-emerald-400' : 
                                       tx.type === 'SPEND' ? 'bg-red-400' : 
                                       tx.type === 'DEPOSIT' ? 'bg-blue-400' : 'bg-gray-400'}`} 
                                   />
                                   {tx.description}
                                 </td>
                                 <td className={`px-4 py-3 text-right font-bold 
                                   ${tx.type === 'EARN' ? 'text-emerald-600' : 
                                     tx.type === 'SPEND' ? 'text-red-600' : 'text-gray-600'}`}>
                                    {tx.type === 'SPEND' || tx.type === 'DEPOSIT' ? '-' : '+'}
                                    {currency} {tx.amount.toFixed(2)}
                                 </td>
                              </tr>
                           ))
                        )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
             {/* Goals List */}
             <div className="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-100 p-6">
                <h2 className="text-lg font-bold text-yellow-800 mb-4">Goals & Rules</h2>
                <ul className="space-y-3">
                   {data.settings.goals.map((goal, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-yellow-900 text-sm">
                         <div className="min-w-[6px] h-[6px] mt-1.5 rounded-full bg-yellow-400" />
                         {goal}
                      </li>
                   ))}
                </ul>
             </div>

             {/* Gamification Stats */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Achievements</h2>
                <div className="grid grid-cols-2 gap-3">
                   {/* Hardcoded badges logic for demo */}
                   <div className={`p-3 rounded-lg border text-center ${data.stats.totalLifetimeSavings > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
                      <div className="text-2xl mb-1">🏦</div>
                      <div className="text-xs font-bold">First Save</div>
                   </div>
                   <div className={`p-3 rounded-lg border text-center ${data.stats.totalLifetimeEarnings >= 50 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
                      <div className="text-2xl mb-1">💰</div>
                      <div className="text-xs font-bold">Big Earner</div>
                   </div>
                   <div className={`p-3 rounded-lg border text-center ${data.stats.currentStreak >= 3 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
                      <div className="text-2xl mb-1">🔥</div>
                      <div className="text-xs font-bold">On Fire</div>
                   </div>
                   <div className={`p-3 rounded-lg border text-center ${data.balance >= 20 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
                      <div className="text-2xl mb-1">💎</div>
                      <div className="text-xs font-bold">Rich</div>
                   </div>
                </div>
                <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                   <div className="flex justify-between">
                     <span>Lifetime Earnings:</span>
                     <span>{currency} {data.stats.totalLifetimeEarnings.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between mt-1">
                     <span>Lifetime Savings:</span>
                     <span>{currency} {data.stats.totalLifetimeSavings.toFixed(2)}</span>
                   </div>
                </div>
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