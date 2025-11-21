import React, { useState } from 'react';
import { Settings, DEFAULT_SETTINGS } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (newSettings: Settings) => void;
  onReset: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, settings, onSave, onReset }) => {
  const [formData, setFormData] = useState<Settings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'shop' | 'goals'>('general');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab('general')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'general' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500'}`}>General</button>
          <button onClick={() => setActiveTab('shop')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'shop' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500'}`}>Shop Prices</button>
          <button onClick={() => setActiveTab('goals')} className={`flex-1 py-3 text-sm font-medium ${activeTab === 'goals' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500'}`}>Class Goals</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">App Title</label>
                <input 
                  type="text" 
                  value={formData.appTitle}
                  onChange={e => setFormData({...formData, appTitle: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Student Name</label>
                <input 
                  type="text" 
                  value={formData.studentName}
                  onChange={e => setFormData({...formData, studentName: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Class Earnings ({formData.currencySymbol})</label>
                <input 
                  type="number" 
                  value={formData.maxClassEarnings}
                  onChange={e => setFormData({...formData, maxClassEarnings: parseFloat(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700">Currency Symbol</label>
                <input 
                  type="text" 
                  value={formData.currencySymbol}
                  onChange={e => setFormData({...formData, currencySymbol: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 border p-2"
                />
              </div>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="space-y-4">
              {formData.shopItems.map((item, idx) => (
                <div key={item.id} className="flex items-end gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Label</label>
                    <input type="text" value={item.label} onChange={(e) => {
                      const newItems = [...formData.shopItems];
                      newItems[idx].label = e.target.value;
                      setFormData({...formData, shopItems: newItems});
                    }} className="w-full border-gray-300 rounded border p-1 text-sm" />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500">Cost</label>
                    <input type="number" value={item.cost} onChange={(e) => {
                       const newItems = [...formData.shopItems];
                       newItems[idx].cost = parseFloat(e.target.value);
                       setFormData({...formData, shopItems: newItems});
                    }} className="w-full border-gray-300 rounded border p-1 text-sm" />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-gray-500">Mins</label>
                    <input type="number" value={item.minutes} onChange={(e) => {
                       const newItems = [...formData.shopItems];
                       newItems[idx].minutes = parseFloat(e.target.value);
                       setFormData({...formData, shopItems: newItems});
                    }} className="w-full border-gray-300 rounded border p-1 text-sm" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-3">
              {formData.goals.map((goal, idx) => (
                <div key={idx} className="flex gap-2">
                   <input 
                    type="text" 
                    value={goal}
                    onChange={(e) => handleGoalChange(idx, e.target.value)}
                    className="flex-1 border-gray-300 rounded border p-2 text-sm" 
                  />
                  <button onClick={() => {
                     const newGoals = formData.goals.filter((_, i) => i !== idx);
                     setFormData({...formData, goals: newGoals});
                  }} className="text-red-500 px-2 hover:bg-red-50 rounded">&times;</button>
                </div>
              ))}
              <button onClick={() => setFormData({...formData, goals: [...formData.goals, "New Goal"]})} className="text-sm text-emerald-600 font-medium">+ Add Goal</button>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <button onClick={() => {
            if(confirm("Are you sure you want to delete all data? This cannot be undone.")) {
              onReset();
              onClose();
            }
          }} className="text-red-600 text-sm hover:underline">Reset All Data</button>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};