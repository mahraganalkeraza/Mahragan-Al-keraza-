import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Activity, Users, Monitor, Clock, TrendingUp, ShieldAlert, Smartphone, ShieldX, UserMinus, RotateCcw } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: any, op: OperationType, path: string) {
  console.error(`Firestore Error [${op}] at ${path}:`, error);
  const authInfo = {
    uid: auth.currentUser?.uid,
    email: auth.currentUser?.email,
  };
  throw new Error(JSON.stringify({ error: error.message, operationType: op, path, authInfo }));
}

export const LiveExamMonitoring: React.FC<{ 
  results: any[], 
  globalChurchFilter: string,
  onResetExam: (studentId: string, name?: string) => void
}> = ({ results, globalChurchFilter, onResetExam }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeSessionsData, setActiveSessionsData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    const unsubLogs = onSnapshot(query(collection(db, 'exam_logs'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      setLogs(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    const unsubSessions = onSnapshot(collection(db, 'active_sessions'), (snap) => {
      setActiveSessionsData(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    return () => {
      unsubLogs();
      unsubSessions();
    };
  }, []);

  const handleTerminateSession = async (studentId: string, deviceId?: string) => {
    console.log('Admin calling handleTerminateSession:', { studentId, deviceId });
    if (!confirm('هل أنت متأكد من طرد هذا الطالب وحظر جهازه من الامتحان؟')) return;
    
    setIsProcessing(studentId);
    try {
      const sessionRef = doc(db, 'active_sessions', studentId);
      // 1. Mark session as terminated (this triggers the Kill Switch on student's side)
      await updateDoc(sessionRef, {
        status: 'terminated',
        terminatedAt: new Date().toISOString()
      }).catch(err => {
        console.warn('Session doc might not exist, attempting to create terminated placeholder', err);
        return setDoc(sessionRef, {
          id: studentId,
          status: 'terminated',
          terminatedAt: new Date().toISOString()
        });
      });

      // 2. Blacklist the device if available
      if (deviceId) {
        await setDoc(doc(db, 'blacklist', deviceId), {
          studentId,
          reason: 'Remote termination by admin',
          timestamp: new Date().toISOString()
        });
      }

      alert('تم إنهاء الجلسة بنجاح');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.UPDATE, `active_sessions/${studentId}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleClearBlacklist = async (deviceId: string) => {
    console.log('Admin calling handleClearBlacklist:', deviceId);
    if (!confirm('هل تريد فك الحظر عن هذا الجهاز؟')) return;
    try {
      await deleteDoc(doc(db, 'blacklist', deviceId));
      alert('تم فك الحظر بنجاح');
    } catch (e: any) {
      handleFirestoreError(e, OperationType.DELETE, `blacklist/${deviceId}`);
    }
  };

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

  // Group logs by studentId to prevent row duplication
  const groupedLogs = Object.values(logs.reduce((acc: any, log) => {
    const studentId = log.studentId;
    if (!acc[studentId] || new Date(log.timestamp) > new Date(acc[studentId].timestamp)) {
      // Store latest log but keep cumulative stats
      acc[studentId] = {
        ...log,
        attempts: (acc[studentId]?.attempts || 0) + 1
      };
    } else {
      acc[studentId].attempts += 1;
    }
    return acc;
  }, {})).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
                   <th className="pb-4">محاولات الطالب</th>
                   <th className="pb-4">التوقيت</th>
                   <th className="pb-4">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groupedLogs.slice(0, 50).map((log: any) => {
                  const fp = log.fingerprint;
                  const isActive = activeSessionsData.some(s => s.id === log.studentId && s.status === 'active');
                  const isTerminated = activeSessionsData.some(s => s.id === log.studentId && s.status === 'terminated');
                  
                  // Detect if this device UUID has been used by DIFFERENT students
                  const distinctStudentsForThisDevice = logs.filter(l => l.deviceId === log.deviceId && l.deviceId)
                    .reduce((acc: Set<string>, curr) => acc.add(curr.studentId), new Set<string>());
                  
                  const isDeviceShared = distinctStudentsForThisDevice.size > 1;
                  
                  return (
                    <tr key={log.studentId} className={`text-xs group ${isDeviceShared ? 'bg-amber-50' : ''} ${isTerminated ? 'opacity-50 grayscale' : ''}`}>
                      <td className="py-4 font-black text-slate-700">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             {log.studentName || 'غير معروف'}
                             {isActive && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" title="نشط الآن" />}
                             {isTerminated && <span className="bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded text-[9px] uppercase font-black">تم الطرد</span>}
                          </div>
                          {isDeviceShared && (
                            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                              <ShieldAlert size={10} /> تنبيه: هذا الجهاز استخدمه {distinctStudentsForThisDevice.size} طلاب
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-slate-500 font-bold">{log.churchName}</td>
                      <td className="py-4">
                         <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1 font-bold text-slate-600">
                               <Smartphone size={12} /> {fp ? `${fp.brand} ${fp.model} (${fp.os})` : log.deviceType}
                            </span>
                            <div className="flex gap-2 items-center text-[9px] text-slate-300 font-mono">
                               <span>{log.ip}</span>
                               {fp && <span>• {fp.browser} • {fp.resolution}</span>}
                            </div>
                         </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded-full font-black bg-slate-100 text-slate-500">
                          {log.attempts} محاولة
                        </span>
                      </td>
                      <td className="py-4 text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString('ar-EG')}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          {isActive && !isTerminated && (
                            <button
                              onClick={() => handleTerminateSession(log.studentId, log.deviceId)}
                              disabled={isProcessing === log.studentId}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 font-black"
                              title="طرد وحظر الجهاز"
                            >
                              <ShieldX size={16} />
                              <span className="hidden group-hover:inline text-[10px]">طرد</span>
                            </button>
                          )}
                          
                          <button 
                            onClick={() => onResetExam(log.studentId, log.studentName)}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="إعادة فتح الامتحان (تصفير المحاولة)"
                          >
                            <RotateCcw size={16} />
                          </button>

                          {!isActive && log.deviceId && (
                             <button 
                               onClick={() => handleClearBlacklist(log.deviceId)}
                               className="p-2 text-slate-300 hover:text-emerald-500 rounded-lg transition-colors"
                               title="فك حظر الجهاز"
                             >
                               <UserMinus size={16} />
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {groupedLogs.length === 0 && (
             <div className="text-center py-12 text-slate-300 italic">بانتظار دخول الطلاب...</div>
          )}
        </div>
      </div>
    </div>
  );
};
