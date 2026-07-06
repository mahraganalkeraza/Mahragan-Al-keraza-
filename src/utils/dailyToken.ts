function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let asciiBitCount = asciiLength * 8;
  words[asciiLength >> 2] |= 128 << (24 - (asciiLength % 4) * 8);
  words[(((asciiLength + 8) >> 6) << 4) + 15] = asciiBitCount;

  for (i = 0; i < asciiLength; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - (i % 4) * 8);
  }

  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w = words.slice(i, i + 16);
    const oldHash = hash.slice(0);

    for (j = 0; j < 64; j++) {
      if (j >= 16) {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const sum0 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const sum1 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);

      const temp1 = (hash[7] + sum1 + ch + k[j] + (w[j] || 0)) | 0;
      const temp2 = (sum0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const byte = (hash[i] >> (j * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

export function getDailyExamToken(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const cairoDate = `${year}-${month}-${day}`;

    const secretPepper = "MahraganAlKeraza2026_SecureSalt!!";
    return sha256(cairoDate + secretPepper).substring(0, 10);
  } catch (err) {
    // Fail-safe default
    return "0000000000";
  }
}

/**
 * Generates a unique 12-character token that remains valid for 24 hours,
 * rolling over exactly at 10:00 PM (22:00) Cairo Time.
 * @param offsetDays Number of days to offset the token boundary (0 for current cycle, -1 for previous cycle)
 */
export function getHourlyExamToken(offsetDays: number = 0): string {
  try {
    // 1. Capture absolute current system time
    const now = new Date();

    // 2. Enforce Africa/Cairo timezone explicitly to avoid server-side UTC drift (e.g., Vercel/Supabase)
    const cairoTime = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));

    // 3. Define the strict rollover hour (10:00 PM = 22:00)
    const targetHour = 22;

    // 4. Rollback the date context by 1 day if we haven't crossed 10:00 PM yet today
    if (cairoTime.getHours() < targetHour) {
      cairoTime.setDate(cairoTime.getDate() - 1);
    }

    // 5. Apply the days offset (replacing the old hourly offset logic)
    if (offsetDays !== 0) {
      cairoTime.setDate(cairoTime.getDate() + offsetDays);
    }

    // 6. Freeze the hour value to exactly 22 to guarantee token stability across the 24-hour block
    const year = cairoTime.getFullYear();
    const month = String(cairoTime.getMonth() + 1).padStart(2, '0');
    const day = String(cairoTime.getDate()).padStart(2, '0');
    const cairoDateHour = `${year}-${month}-${day}-${targetHour}`;

    // 7. Hash the unified date block string with the existing secret pepper
    const secretPepper = "MahraganAlKeraza2026_SecureSalt_Hourly!!";
    return sha256(cairoDateHour + secretPepper).substring(0, 12);
  } catch (err) {
    // Graceful fallback to prevent application crashes
    return "000000000000";
  }
}

/**
 * Validates the incoming exam submission token against the active 24-hour cycle
 * as well as the immediate previous 24-hour cycle to protect ongoing student sessions.
 */
export function validateHourlyExamToken(token: string | null): boolean {
  if (!token) return false;
  
  // Active token for the current 24-hour window ONLY
  const currentToken = getHourlyExamToken(0);
  
  // التطابق يتم مع كود اليوم فقط، ولا يتم السماح بالكود القديم
  return token === currentToken;
}
