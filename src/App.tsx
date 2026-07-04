import React, { useState } from 'react';
import AdminDisplayGate from './components/AdminDisplayGate';
import ExamEngine from './components/ExamEngine';
import { QrCode, ClipboardList } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'gate' | 'engine'>('gate');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative select-none">
      {/* Top View Switcher */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-4 z-50 sticky top-0" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-xs font-black text-slate-100">بوابة مهرجان الكرازة 2026</span>
        </div>
        
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('gate')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'gate'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode size={14} />
            رمز الـ QR اليومي
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('engine')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${
              activeTab === 'engine'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList size={14} />
            منظومة الامتحانات
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'gate' ? <AdminDisplayGate /> : <ExamEngine />}
      </div>
    </div>
  );
}

