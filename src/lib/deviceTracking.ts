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
}

export const getDeviceFingerprint = (): DeviceFingerprint => {
  const parser = new UAParser();
  const res = parser.getResult();
  const ua = navigator.userAgent;

  let deviceId = localStorage.getItem('coptic_fingerprint_id');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('coptic_fingerprint_id', deviceId);
  }

  return {
    uuid: deviceId,
    brand: res.device.vendor || 'Unknown',
    model: res.device.model || 'Unknown',
    vendor: res.device.vendor || 'Unknown',
    os: `${res.os.name || 'Unknown OS'} ${res.os.version || ''}`.trim(),
    browser: `${res.browser.name || 'Other'} ${res.browser.version || ''}`.trim(),
    resolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language
  };
};
