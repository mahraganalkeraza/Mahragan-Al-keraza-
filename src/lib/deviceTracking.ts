import { v4 as uuidv4 } from 'uuid';

export interface DeviceFingerprint {
  uuid: string;
  brand: string;
  model: string;
  os: string;
  browser: string;
  resolution: string;
  language: string;
}

export const getDeviceFingerprint = (): DeviceFingerprint => {
  const ua = navigator.userAgent;
  let deviceId = localStorage.getItem('coptic_fingerprint_id');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('coptic_fingerprint_id', deviceId);
  }

  // Basic parsing for Brand/Model/OS
  let brand = 'Unknown';
  let model = 'Unknown';
  let os = 'Unknown OS';

  if (/android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s+([\d.]+)/);
    if (match) os += ` ${match[1]}`;
    
    if (/Samsung|SM-|GT-/i.test(ua)) brand = 'Samsung';
    else if (/Huawei|HONOR/i.test(ua)) brand = 'Huawei';
    else if (/Xiaomi|Redmi|POCO/i.test(ua)) brand = 'Xiaomi';
    else if (/OPPO/i.test(ua)) brand = 'OPPO';
    else if (/Pixel/i.test(ua)) brand = 'Google Pixel';
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    brand = 'Apple';
    os = 'iOS';
    const match = ua.match(/OS\s+([\d_]+)/);
    if (match) os += ` ${match[1].replace(/_/g, '.')}`;
    
    if (/iPhone/.test(ua)) model = 'iPhone';
    else if (/iPad/.test(ua)) model = 'iPad';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  } else if (/Macintosh/i.test(ua)) {
    os = 'macOS';
  }

  // Browser Signature
  let browser = 'Other';
  if (/Edg/.test(ua)) browser = 'Edge';
  else if (/Chrome/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua)) browser = 'Safari';
  else if (/Firefox/.test(ua)) browser = 'Firefox';

  return {
    uuid: deviceId,
    brand,
    model,
    os,
    browser,
    resolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language
  };
};
