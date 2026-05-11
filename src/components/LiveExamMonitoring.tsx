import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Activity, Users, Monitor, Clock, TrendingUp, ShieldAlert, Smartphone } from 'lucide-react';

export const LiveExamMonitoring: React.FC<{ results: any[], globalChurchFilter: string }> = ({ results, globalChurchFilter }) => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'exam_logs'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setLogs(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  // Filtered results
  const filteredResults = results.filter(r => globalChurchFilter === 'الكل' || r.churchName === globalChurchFilter);
  
  // Stats per stage
  const stageStats = filteredResults.reduce((acc: any, r) => {
    const stage = r.data?.['المرحلة'] || r.stage || 'غير محدد';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  // Device duplication detection
  const deviceCounts = logs.reduce((acc: any, log) => {
    if (log.deviceId) {
      acc[log.deviceId] = (acc[log.deviceId] || 0) + 1;
    }
    return acc;
  }, {});

  const activeSessions = logs.filter(l => {
      const logTime = new Date(l.timestamp).getTime();
      return (Date.now() - logTime) < 20 * 60 * 1000; // 20 minutes
  }).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">الجلسات النشطة (٢٠ د)</p>
              <h3 className="text-2xl font-black text-slate-800">{activeSessions}</h3>
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '40%' }} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">إجمالي المسجلين</p>
              <h3 className="text-2xl font-black text-slate-800">{filteredResults.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
              <Monitor size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase">الأجهزة الفريدة (الأخيرة)</p>
              <h3 className="text-2xl font-black text-slate-800">{Object.keys(deviceCounts).length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-indigo-600" /> توزيع المراحل
          </h4>
          <div className="space-y-3">
            {Object.entries(stageStats).map(([stage, count]: any) => (
              <div key={stage} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <span className="font-bold text-slate-600 text-sm">{stage}</span>
                 <span className="font-black text-indigo-600">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-600" /> مراقبة الأجهزة والنشاط المباشر
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-xs font-black text-slate-400 uppercase border-b border-slate-100">
                   <th className="pb-4">الطالب</th>
                   <th className="pb-4">الكنيسة</th>
                   <th className="pb-4">الجهاز / IP</th>
                   <th className="pb-4">التكرار</th>
                   <th className="pb-4">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.slice(0, 20).map((log) => {
                  const count = deviceCounts[log.deviceId] || 0;
                  const isWarning = count > 3;
                  return (
                    <tr key={log.id} className="text-xs group">
                      <td className="py-4 font-black text-slate-700">{log.studentName || 'غير معروف'}</td>
                      <td className="py-4 text-slate-500 font-bold">{log.churchName}</td>
                      <td className="py-4">
                         <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 font-bold text-slate-600">
                               <Smartphone size={12} /> {log.deviceType}
                            </span>
                            <span className="text-[10px] text-slate-300 font-mono">{log.ip}</span>
                         </div>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full font-black ${isWarning ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                          {count}
                        </span>
                      </td>
                      <td className="py-4 text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString('ar-EG')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
             <div className="text-center py-12 text-slate-300 italic">بانتظار دخول الطلاب...</div>
          )}
        </div>
      </div>
    </div>
  );
};
