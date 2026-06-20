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

  // 1. Unique ID Generation (DEV-XXXXX)
  let deviceToken = localStorage.getItem('device_hardware_token');
  if (!deviceToken) {
    deviceToken = `DEV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    localStorage.setItem('device_hardware_token', deviceToken);
  }

  let legacyId = localStorage.getItem('coptic_fingerprint_id');
  if (!legacyId) {
    legacyId = uuidv4();
    localStorage.setItem('coptic_fingerprint_id', legacyId);
  }

  // 2. Hardware Sniffing (Model + OS)
  const vendor = res.device.vendor || '';
  const model = res.device.model || '';
  const fullModel = vendor || model ? `${vendor} ${model}`.trim() : 'Unknown Device';

  return {
    uuid: deviceToken, // Using the user's requested token format as the UUID
    brand: res.device.vendor || 'Unknown',
    model: fullModel,
    vendor: res.device.vendor || 'Unknown',
    os: `${res.os.name || 'Unknown OS'} ${res.os.version || ''}`.trim(),
    browser: `${res.browser.name || 'Other'} ${res.browser.version || ''}`.trim(),
    resolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language
  };
};
