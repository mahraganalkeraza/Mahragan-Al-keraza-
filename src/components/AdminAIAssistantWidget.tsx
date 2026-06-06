import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, RotateCcw, MessageSquare } from 'lucide-react';
import Draggable from 'react-draggable';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminAIAssistantWidget({ 
  participants = [], 
  churches = [], 
  isOpen: isOpenProp, 
  onClose 
}: { 
  participants?: any[], 
  churches?: any[], 
  isOpen?: boolean, 
  onClose?: () => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isCurrentlyOpen = isOpenProp !== undefined ? isOpenProp : isOpen;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setIsOpen(false);
    }
  };
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom drag tracking for snapping
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const nodeRef = useRef(null);

  async function getGlobalAdminSnapshot() {
    try {
      const churchesSnap = await getDocs(collection(db, "churches"));
      const resultsSnap = await getDocs(collection(db, "online_results"));
      
      return JSON.stringify({
        churches: churchesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        totalResultsRecorded: resultsSnap.size
      });
    } catch (err: any) {
      console.warn("CRITICAL ADMIN FIRESTORE ERROR (Using local parameters fallback):", err);
      return JSON.stringify({
        churches: [],
        totalResultsRecorded: 0,
        quotaExceeded: true,
        errorMsg: err?.message || String(err)
      });
    }
  }

  const sendMessage = async () => {
    if (!input.trim() && !error) return; // Allow triggering retry if error exists even if input is empty
    setIsLoading(true);
    setError(null);
    const userMsg = input || "إعادة المحاولة";
    if (input.trim()) {
      setInput('');
      setMessages(prev => [...prev, {role: 'user' as const, text: userMsg}]);
    }
    
    try {
      // Create lightweight context
      const globalData = await getGlobalAdminSnapshot();

      const churchStats = churches.map(c => ({
        name: c.name,
        subscribers: c.subscribers || participants.filter(p => p.churchName === c.name).length
      }));
      
      const context = {
        totalParticipants: participants.length,
        churchesStats: churchStats,
        stagesStats: participants.reduce((acc, p) => {
           acc[p.stage] = (acc[p.stage] || 0) + 1;
           return acc;
        }, {}),
        globalFirestoreData: globalData // stringified JSON
      };

      const aiHistory = messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
      }));

      const resp = await fetch('/api/gemini', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
          prompt: userMsg,
          history: aiHistory,
          context
        }) // no churchName restrictions
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        throw new Error(errData?.error || `Failed to reach AI (Status: ${resp.status})`);
      }
      const data = await resp.json();
      setMessages(prev => [...prev, {role: 'model', text: data.text}]);
    } catch (e: any) {
      console.error("Assistant Error detail:", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: any, data: any) => {
    setIsDragging(true);
    setPosition({ x: data.x, y: data.y });
  };

  const onDragStop = (e: any, data: any) => {
    setIsDragging(false);
    
    // Smart Docking: Snap to left or right edge of the screen bounds
    const viewportWidth = window.innerWidth;
    // FAB is 64px width (w-16)
    const midPoint = viewportWidth / 2;
    
    // Determine closest edge. Because we might be using bounds="window", 
    // the react-draggable coordinates are relative to initial position.
    // If it's too complex to compute absolute positions, we can just snap to relative x bounds.
    const isLeft = data.clientX < midPoint;
    
    // Soft reset x position based on drop side
    if (isLeft) {
      setPosition({ x: -viewportWidth + 100, y: data.y }); // Just snap it Left
    } else {
      setPosition({ x: 0, y: data.y }); // Snap it Right
    }
  };

  return (
    <>
      {isOpenProp === undefined && (
        <Draggable
          nodeRef={nodeRef}
          position={position}
          onDrag={handleDrag}
          onStop={onDragStop}
          bounds="window"
        >
          <div 
            ref={nodeRef}
            className="active:scale-95 group"
            style={{
              position: 'fixed',
              bottom: '32px',
              right: position.x === 0 && !isDragging ? '32px' : 'auto', // Keep default right positioning if not explicitly dragged
              left: position.x === 0 && !isDragging ? 'auto' : undefined,
              width: '64px',
              height: '64px',
              backgroundColor: '#1e3a8a',
              borderRadius: '50%',
              zIndex: '999999',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(30, 58, 138, 0.8)',
              cursor: isDragging ? 'grabbing' : 'pointer',
              transition: isDragging ? 'none' : 'all 0.2s ease', // Smooth snapping when released
              touchAction: 'none', // Prevent scrolling while dragging
              animation: isDragging ? 'none' : 'admin-pulse-glow 2s infinite'
            }} 
            onClick={(e) => {
               // Prevent click event when dragging 
               if (!isDragging) setIsOpen(!isOpen);
            }}
          >
            {isOpen ? (
              <MessageSquare size={26} color="white" className="filter drop-shadow-md" />
            ) : (
              <span style={{ fontSize: '28px' }}>✨</span>
            )}
          </div>
        </Draggable>
      )}

      {isCurrentlyOpen && (
        <div className="fixed bottom-[110px] right-[32px] md:right-[40px] z-[999999] w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4" dir="rtl">
          <div className="flex justify-between items-center mb-4">
             <h2 className="font-black text-slate-800 flex items-center gap-2"><Bot size={20}/> المساعد الذكي (خاص بالمنطقة 18)</h2>
             <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center">×</button>
          </div>
          <div className="h-72 overflow-y-auto mb-4 p-4 bg-slate-50 rounded-xl space-y-3 shadow-inner">
             {messages.length === 0 && (
                <div className="text-center text-slate-400 mt-10">
                  <Bot size={48} className="mx-auto mb-2 opacity-20"/>
                  <p>أهلاً بك يا أدمن. كيف يمكنني مساعدتك اليوم؟</p>
                  <p className="text-xs mt-2">اسألني عن أعداد المشتركين، الإحصاءات العامة، والمزيد.</p>
                </div>
             )}
             {messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-lg w-4/5 text-sm ${m.role === 'user' ? 'bg-coptic-blue text-white ml-auto rounded-tl-none' : 'bg-white mr-auto border text-slate-800 rounded-tr-none shadow-sm'}`}>
                   {m.text}
                </div>
             ))}
             {isLoading && (
                  <div className="bg-white border rounded-lg mr-auto p-3 text-sm text-slate-500 shadow-sm flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
                     <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-75"></span>
                     <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                  </div>
             )}
             {error && (() => {
                const urlRegex = /(https:\/\/console\.firebase\.google\.com[^\s"']*)/g;
                const match = error.match(urlRegex);
                if (match) {
                  const indexUrl = match[0].replace(/[.,;)]+$/, "");
                  return (
                    <div className="bg-red-50 p-4 rounded-xl text-right" dir="rtl">
                      <p className="text-red-700 font-extrabold mb-2 text-sm">
                        🚨 خطأ في فيربيز: يتطلب هذا الاستعلام فهارس (Composite Indexes).
                      </p>
                      <p className="text-[11px] text-slate-600 mb-4 font-mono leading-relaxed bg-white p-3 border border-red-100 rounded-lg select-all max-h-24 overflow-y-auto">
                        {error}
                      </p>
                      <a
                        href={indexUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-md transition-all animate-pulse mb-3 select-none"
                      >
                         🚀 اضغط هنا لإنشاء الفهرس المركب فوراً في Firebase Console
                      </a>
                      <button 
                        className="flex items-center gap-2 mx-auto justify-center w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold shadow-sm" 
                        onClick={sendMessage}
                      >
                         <RotateCcw size={16}/> إرسال مجدداً بعد الضغط والإنشاء
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="bg-red-50 p-4 rounded-xl text-center">
                    <p className="text-red-700 font-bold mb-2 text-sm">{error}</p>
                    <button className="flex items-center gap-2 mx-auto justify-center w-full py-2 bg-red-100 text-red-800 rounded-lg text-sm" onClick={sendMessage}>
                       <RotateCcw size={16}/> إرسال مجدداً
                    </button>
                  </div>
                );
             })()}
          </div>
          <div className="flex gap-2">
            <input 
               className="flex-1 p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-coptic-blue" 
               value={input} 
               onChange={(e) => setInput(e.target.value)} 
               onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
               placeholder="كيف يمكنني مساعدتك اليوم؟..." 
               disabled={isLoading}
            />
            <button 
               onClick={sendMessage} 
               disabled={isLoading || !input.trim()} 
               className="p-3 bg-coptic-blue text-white rounded-xl disabled:opacity-50 hover:bg-coptic-blue/90"
            >
               <Send size={20}/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
