import QRCode from 'qrcode';
import { saveAs } from 'file-saver';

export interface StudentQRData {
  id?: string;
  student_id?: string;
  name: string;
  churchName?: string;
  stage?: string;
}

/**
 * Generates a high-quality, branded QR Code image card on the client canvas
 * and triggers an instant PNG file download.
 * Requires 0 server/database requests or storage egress.
 */
export async function downloadStudentQRCode(student: StudentQRData): Promise<void> {
  try {
    const studentId = String(student.id || student.student_id || 'N/A').trim();
    const studentName = (student.name || 'مشترك').trim();
    const churchName = (student.churchName || '').trim();
    const stage = (student.stage || '').trim();

    // 1. Generate QR Code Data URL (using Student ID as payload for scanner compatibility)
    const qrDataUrl = await QRCode.toDataURL(studentId, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a', // Slate 900
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H'
    });

    // 2. Load QR image element
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((resolve, reject) => {
      qrImg.onload = resolve;
      qrImg.onerror = reject;
    });

    // 3. Create Offscreen Canvas
    const canvasWidth = 500;
    const canvasHeight = 620;
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context unavailable');
    }

    // Background fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Border around card
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4);

    // Header Banner
    ctx.fillStyle = '#0f172a'; // Navy/Slate 900
    ctx.fillRect(0, 0, canvasWidth, 90);

    // Header Title Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Cairo, Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('مهرجان الكرازة المرقسية 2026', canvasWidth / 2, 42);

    ctx.fillStyle = '#38bdf8'; // Sky blue text
    ctx.font = 'bold 14px Cairo, Tahoma, Arial, sans-serif';
    ctx.fillText('بطاقة إثبات هضور وتأكيد المشترك', canvasWidth / 2, 68);

    // Draw QR Code
    const qrSize = 280;
    const qrX = (canvasWidth - qrSize) / 2;
    const qrY = 110;

    // Soft border around QR code box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    // Student Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Cairo, Tahoma, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(studentName, canvasWidth / 2, 435);

    // Student ID Tag Box
    const idText = `الكود: ${studentId}`;
    ctx.font = 'bold 16px Courier New, monospace';
    const idWidth = ctx.measureText(idText).width + 30;
    const idX = (canvasWidth - idWidth) / 2;

    ctx.fillStyle = '#eff6ff'; // Light Blue
    ctx.fillRect(idX, 455, idWidth, 32);
    ctx.strokeStyle = '#bfdbfe';
    ctx.strokeRect(idX, 455, idWidth, 32);

    ctx.fillStyle = '#1e40af'; // Blue 800
    ctx.fillText(idText, canvasWidth / 2, 476);

    // Church and Stage info
    if (churchName || stage) {
      ctx.fillStyle = '#475569'; // Slate 600
      ctx.font = 'bold 15px Cairo, Tahoma, Arial, sans-serif';
      const infoText = [churchName, stage].filter(Boolean).join(' • ');
      ctx.fillText(infoText, canvasWidth / 2, 525);
    }

    // Footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Cairo, Tahoma, Arial, sans-serif';
    ctx.fillText('أسقفية الشباب - نظام الكرازة الإلكتروني الموحد', canvasWidth / 2, 580);

    // 4. Convert Canvas to PNG Blob & Download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to generate PNG blob');
      }
      const sanitize = (str: string) => str.replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').trim();
      const safeName = sanitize(studentName) || 'Student';
      const safeId = sanitize(studentId) || 'ID';
      const fileName = `QR_${safeName}_${safeId}.png`;

      saveAs(blob, fileName);
    }, 'image/png');

  } catch (err) {
    console.error('Error generating QR Code PNG:', err);
    alert('حدث خطأ أثناء تحميل كود الـ QR للمشترك');
  }
}
