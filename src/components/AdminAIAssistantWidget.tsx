import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, RotateCcw, MessageSquare } from 'lucide-react';
import Draggable from 'react-draggable';

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminAIAssistantWidget({ participants = [], churches = [] }: { participants?: any[], churches?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
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
    } catch (error) {
      console.error("CRITICAL ADMIN FIRESTORE ERROR:", error);
      throw error; // Let the Error Boundary handle it gracefully
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    const userMsg = input;
    setInput('');
    const newMessages = [...messages, {role: 'user' as const, text: userMsg}];
    setMessages(newMessages);
    
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
      if (!resp.ok) throw new Error("Failed to reach AI");
      const data = await resp.json();
      setMessages([...newMessages, {role: 'model', text: data.text}]);
    } catch (e) {
      setError("حدث خطأ في جلب البيانات، إضغط لإعادة المحاولة");
      setMessages(messages); // Revert or leave as is
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
      <div style={{
        position: 'fixed',
        bottom: '40px',
        right: '40px',
        width: '65px',
        height: '65px',
        backgroundColor: '#1e3a8a', // Dark Premium Blue
        borderRadius: '50%',
        zIndex: '999999', // Forces it above tables, sidebars, and overlays
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.4)',
        cursor: 'pointer'
      }} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <Bot size={24} color="white" /> : <MessageSquare size={24} color="white" />}
      </div>

      {isOpen && (
        <div className="fixed bottom-[115px] right-[40px] z-[999999] w-[400px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 p-4" dir="rtl">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-black text-slate-800 flex items-center gap-2"><Bot size={20}/> مساعد الأدمن الذكي (بصلاحيات عالمية)</h3>
             <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center">×</button>
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
             {error && (
                <div className="bg-red-50 p-4 rounded-xl text-center">
                  <p className="text-red-700 font-bold mb-2 text-sm">{error}</p>
                  <button className="flex items-center gap-2 mx-auto justify-center w-full py-2 bg-red-100 text-red-800 rounded-lg text-sm" onClick={sendMessage}>
                     <RotateCcw size={16}/> إرسال مجدداً
                  </button>
                </div>
             )}
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
