
import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scanner.render(
        (decodedText) => {
            scanner.clear();
            onScanSuccess(decodedText);
        },
        (error) => {
            console.warn(error);
        }
    );
    scannerRef.current = scanner;

    return () => {
      scanner.clear();
    };
  }, [onScanSuccess]);

  return <div id="qr-reader" className="w-full max-w-sm mx-auto" />;
};
