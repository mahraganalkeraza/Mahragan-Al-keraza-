
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { VideoOff, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess }) => {
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const validateAndProceed = async (decodedText: string, scanner: Html5Qrcode) => {
    setIsValidating(true);
    let studentId = decodedText.trim();
    try {
      if (decodedText.includes("{")) {
        const payload = JSON.parse(decodedText);
        studentId = (payload.studentID || payload.id || decodedText).toString().trim();
      }
    } catch (e) {}
    
    const finalId = studentId.toLowerCase();

    try {
      // 1️⃣ Step 1: Check for Prior Submission
      const { data: submittedData, error: subError } = await supabase
        .from('view_central_filtered_results')
        .select('student_id, submission_status')
        .eq('student_id', finalId)
        .eq('submission_status', 'submitted')
        .maybeSingle();

      if (subError) throw subError;
      if (submittedData) {
        alert("عفواً، لقد قمت بتسليم هذا الامتحان بالفعل!");
        setIsValidating(false);
        // Restart scanner if aborted? Instructions just say abort login.
        // We'll keep scanner stopped for now as per current stop logic.
        return;
      }

      // 2️⃣ Step 2: Check for Concurrent Active Sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('active_sessions')
        .select('student_id, status')
        .eq('student_id', finalId)
        .eq('status', 'active')
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (sessionData) {
        alert("عفواً، الامتحان مفتوح بالفعل على جهاز آخر! برجاء مراجعة الكنترول.");
        setIsValidating(false);
        return;
      }

      // 3️⃣ Step 3: Authorization & Session Creation
      // Lock the gate by inserting into active_sessions
      const { error: lockError } = await supabase
        .from('active_sessions')
        .insert({
          student_id: finalId,
          status: 'active',
          allowReentry: true,
          lastUpdate: new Date().toISOString()
        });

      if (lockError) {
        // If insert fails because of primary key or other constraint, it might already exist but not be 'active'
        // or just a race condition. Treat as failure to lock.
        console.error("Locking failed:", lockError);
      }

      // All checks passed
      setIsValidating(false);
      onScanSuccess(decodedText);

    } catch (err: any) {
      console.error("Validation error:", err);
      alert("حدث خطأ أثناء رصد الجلسة: " + err.message);
      setIsValidating(false);
    }
  };

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    qrCodeRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        html5QrCode.stop().then(() => {
          validateAndProceed(decodedText, html5QrCode);
        }).catch(err => {
          console.error("Failed to stop scanner", err);
          validateAndProceed(decodedText, html5QrCode);
        });
      },
      (errorMessage) => {
        // Optional: handle scan errors
      }
    ).catch((err) => {
      console.error("Unable to start scanning", err);
      // Fallback if environment (back camera) fails
      html5QrCode.start(
        { facingMode: "user" },
        config,
        (decodedText) => {
          html5QrCode.stop().then(() => {
            validateAndProceed(decodedText, html5QrCode);
          });
        },
        () => {}
      ).catch(e => {
        console.error("Fallback failed", e);
        setErrorMsg('لا يمكن الوصول إلى الكاميرا. يرجى إعطاء الصلاحية أو استخدام الإدخال اليدوي. (NotAllowedError)');
      });
    });

    return () => {
      if (qrCodeRef.current && qrCodeRef.current.isScanning) {
        qrCodeRef.current.stop().catch(err => console.error(err));
      }
    };
  }, [onScanSuccess]);

  if (errorMsg) {
    return (
      <div className="w-full aspect-square bg-slate-100 flex flex-col items-center justify-center p-6 rounded-xl text-center border-4 border-slate-200">
        <VideoOff size={48} className="text-slate-400 mb-4" />
        <p className="text-slate-600 font-bold">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square bg-black overflow-hidden rounded-xl">
      {isValidating && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <Loader2 size={40} className="text-white animate-spin mb-3" />
          <p className="text-white font-bold text-sm">جاري التحقق من الجلسة...</p>
        </div>
      )}
      <div id="qr-reader" className="w-full h-full" />
      <div className="absolute inset-0 border-2 border-primary/30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
      </div>
    </div>
  );
};
