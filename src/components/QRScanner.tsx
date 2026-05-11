
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess }) => {
  const qrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    qrCodeRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        html5QrCode.stop().then(() => {
          onScanSuccess(decodedText);
        }).catch(err => {
          console.error("Failed to stop scanner", err);
          onScanSuccess(decodedText);
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
            onScanSuccess(decodedText);
          });
        },
        () => {}
      ).catch(e => console.error("Fallback failed", e));
    });

    return () => {
      if (qrCodeRef.current && qrCodeRef.current.isScanning) {
        qrCodeRef.current.stop().catch(err => console.error(err));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="relative w-full aspect-square bg-black overflow-hidden rounded-xl">
      <div id="qr-reader" className="w-full h-full" />
      <div className="absolute inset-0 border-2 border-primary/30 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
      </div>
    </div>
  );
};
