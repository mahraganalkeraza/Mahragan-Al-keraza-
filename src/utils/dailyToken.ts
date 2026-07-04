const SALT = "MahraganAlKeraza2026_SecureSalt_Hourly";

/**
 * Computes the date key in the Africa/Cairo timezone,
 * rolling over to the next day's key at exactly 10:00 PM (22:00) Cairo time.
 */
export function getCairoDateKey(): string {
  try {
    const now = new Date();
    const cairoString = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
    const cairoNow = new Date(cairoString);
    
    const hour = cairoNow.getHours();
    const windowStart = new Date(cairoNow);
    
    // If it is before 10:00 PM, the current active exam session started at 10:00 PM yesterday.
    if (hour < 22) {
      windowStart.setDate(windowStart.getDate() - 1);
    }
    
    const year = windowStart.getFullYear();
    const month = String(windowStart.getMonth() + 1).padStart(2, '0');
    const day = String(windowStart.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (err) {
    // Fallback if Intl or timezone is not fully supported
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Deterministically generates an 8-character uppercase alphanumeric token
 * based on the active Cairo date key and the secure salt.
 */
export function getHourlyExamToken(): string {
  const dateKey = getCairoDateKey();
  const rawInput = `${SALT}_${dateKey}`;
  
  let hash = 0;
  for (let i = 0; i < rawInput.length; i++) {
    const char = rawInput.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  
  // Transform the hash into a beautiful 8-character uppercase token
  // Combining hash value with salt parts to add additional security and visual appeal
  const absHash = Math.abs(hash);
  const part1 = absHash.toString(36).toUpperCase().padStart(5, '0');
  
  // Generate a secondary salt-based deterministic code
  let hash2 = 17;
  for (let i = dateKey.length - 1; i >= 0; i--) {
    hash2 = (hash2 * 31) + dateKey.charCodeAt(i);
    hash2 |= 0;
  }
  const part2 = Math.abs(hash2).toString(36).toUpperCase().slice(0, 3).padEnd(3, 'X');
  
  return `${part1}${part2}`;
}
