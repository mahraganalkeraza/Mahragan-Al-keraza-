import { v4 as uuidv4 } from 'uuid';
import { UAParser } from 'ua-parser-js';

export interface DeviceFingerprint {
  uuid: string;
  brand: string;
  model: string;
  os: string;
  browser: string;
  resolution: string;
  language: string;
  vendor: string;
  ua: string;
}

export const getDeviceFingerprint = (): DeviceFingerprint => {
  const parser = new UAParser();
  const res = parser.getResult();
  const ua = navigator.userAgent;

  let deviceId = localStorage.getItem('device_hardware_token');
  if (!deviceId) {
    // Generate a unique shorthand token: DEV-XXXXX
    deviceId = `DEV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    localStorage.setItem('device_hardware_token', deviceId);
  }

  // Refined browser detection to avoid "Netscape" issues
  const browserName = res.browser.name || 'Other';
  const browserVersion = res.browser.version || '';
  const fullBrowser = browserName === 'Netscape' ? 'Generic Browser' : `${browserName} ${browserVersion}`.trim();

  return {
    uuid: deviceId,
    brand: res.device.vendor || 'Unknown',
    model: res.device.model || 'Unknown',
    vendor: res.device.vendor || 'Unknown',
    os: `${res.os.name || 'Unknown OS'} ${res.os.version || ''}`.trim(),
    browser: fullBrowser,
    resolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    ua: ua
  };
};
