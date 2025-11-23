import React, { useState } from 'react';
import { Settings, ShopItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (newSettings: Settings) => void;
  onReset: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave, onReset }) => {
  const [formData, setFormData] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'shop' | 'goals' | 'classes'>('general');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleGoalChange = (idx: number, val: string) => {
    const newGoals = [...formData.goals];
    newGoals[idx] = val;
    setFormData({ ...formData, goals: newGoals });
  };

  const handleClassChange = (idx: number, val: string) => {
    const newClasses = [...formData.classes];
    newClasses[idx] = val;
    setFormData({ ...formData, classes: newClasses });
  };

  const handleAddShopItem = () => {
    const newItem: ShopItem = {
      id: Date.now().toString(),
      label: 'New Reward',
      cost: 1.00,
      minutes: 5
    };
    setFormData({
      ...formData,
      shopItems: [...formData.shopItems, newItem]
    });
  };

  const handleRemoveShopItem = (index: number) => {
    const newItems = formData.shopItems.filter((_, i) => i !== index);
    setFormData({ ...formData, shopItems: newItems });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transform transition-all">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-700/50">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>

        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
          <button onClick={() => setActiveTab('general')} className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === 'general' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>General</button>
          <button onClick={() => setActiveTab('classes')} className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === 'classes' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Classes</button>
          <button onClick={() => setActiveTab('shop')} className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === 'shop' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Shop Prices</button>
          <button onClick={() => setActiveTab('goals')} className={`flex-1 min-w-[80px] py-3 text-sm font-medium transition-colors ${activeTab === 'goals' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/30' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Class Goals</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App Title</label>
                <input 
                  type="text" 
                  value={formData.appTitle}
                  onChange={e => setFormData({...formData, appTitle: e.target.value})}
                  className="block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student Name</label>
                    <input 
                    type="text" 
                    value={formData.studentName}
                    onChange={e => setFormData({...formData, studentName: e.target.value})}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teacher Name</label>
                    <input 
                    type="text" 
                    value={formData.teacherName}
                    onChange={e => setFormData({...formData, teacherName: e.target.value})}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5 text-sm"
                    />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Class Earnings</label>
                  <input 
                    type="number" 
                    value={formData.maxClassEarnings}
                    onChange={e => setFormData({...formData, maxClassEarnings: parseFloat(e.target.value)})}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5 text-sm"
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency Symbol</label>
                  <input 
                    type="text" 
                    value={formData.currencySymbol}
                    onChange={e => setFormData({...formData, currencySymbol: e.target.value})}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'classes' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Define your class periods here.</p>
              {formData.classes.map((cls, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                   <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                     {idx + 1}
                   </div>
                   <input 
                    type="text" 
                    value={cls}
                    onChange={(e) => handleClassChange(idx, e.target.value)}
                    className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg border p-2 text-sm focus:ring-purple-500 focus:border-purple-500" 
                  />
                  <button onClick={() => {
                     const newClasses = formData.classes.filter((_, i) => i !== idx);
                     setFormData({...formData, classes: newClasses});
                  }} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              <button onClick={() => setFormData({...formData, classes: [...formData.classes, `Period ${formData.classes.length + 1}`]})} className="text-sm text-purple-600 dark:text-purple-400 font-semibold hover:text-purple-700 flex items-center gap-1 mt-2">
                <span>+</span> Add Class
              </button>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {formData.shopItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-end gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-1">Label</label>
                      <input type="text" value={item.label} onChange={(e) => {
                        const newItems = [...formData.shopItems];
                        newItems[idx].label = e.target.value;
                        setFormData({...formData, shopItems: newItems});
                      }} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md border p-1.5 text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-1">Cost ({formData.currencySymbol})</label>
                      <input type="number" step="0.10" value={item.cost} onChange={(e) => {
                         const newItems = [...formData.shopItems];
                         newItems[idx].cost = parseFloat(e.target.value);
                         setFormData({...formData, shopItems: newItems});
                      }} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md border p-1.5 text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-gray-500 dark:text-gray-400 font-medium ml-1">Mins</label>
                      <input type="number" value={item.minutes} onChange={(e) => {
                         const newItems = [...formData.shopItems];
                         newItems[idx].minutes = parseFloat(e.target.value);
                         setFormData({...formData, shopItems: newItems});
                      }} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md border p-1.5 text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <button 
                      onClick={() => handleRemoveShopItem(idx)}
                      className="mb-1 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                      title="Remove Item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleAddShopItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <span className="text-lg">+</span> Add Shop Item
              </button>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-3">
              {formData.goals.map((goal, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                   <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                     {idx + 1}
                   </div>
                   <input 
                    type="text" 
                    value={goal}
                    onChange={(e) => handleGoalChange(idx, e.target.value)}
                    className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg border p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500" 
                  />
                  <button onClick={() => {
                     const newGoals = formData.goals.filter((_, i) => i !== idx);
                     setFormData({...formData, goals: newGoals});
                  }} className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              <button onClick={() => setFormData({...formData, goals: [...formData.goals, "New Goal"]})} className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 flex items-center gap-1 mt-2">
                <span>+</span> Add Goal
              </button>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <button onClick={() => {
            if(confirm("Are you sure you want to delete all data? This cannot be undone.")) {
              onReset();
              onClose();
            }
          }} className="text-red-600 dark:text-red-400 text-sm hover:text-red-800 hover:underline px-2">Reset All Data</button>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md transition hover:shadow-lg transform hover:-translate-y-0.5">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};