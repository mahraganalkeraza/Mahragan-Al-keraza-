function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541747 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855378 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSrgb = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const R = Math.round(Math.max(0, Math.min(1, toSrgb(r))) * 255);
  const G = Math.round(Math.max(0, Math.min(1, toSrgb(g))) * 255);
  const B = Math.round(Math.max(0, Math.min(1, toSrgb(b_))) * 255);

  return [R, G, B];
}

function oklabToRgb(l: number, a: number, b: number): [number, number, number] {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541747 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855378 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_ = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSrgb = (x: number) => {
    return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };

  const R = Math.round(Math.max(0, Math.min(1, toSrgb(r))) * 255);
  const G = Math.round(Math.max(0, Math.min(1, toSrgb(g))) * 255);
  const B = Math.round(Math.max(0, Math.min(1, toSrgb(b_))) * 255);

  return [R, G, B];
}

export function replaceOklchInString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('oklch')) return str;

  return str.replace(/oklch\s*\(([^)]+)\)/gi, (match, contents) => {
    const parts = contents.trim().split(/[\s,/]+/);
    if (parts.length < 3) return match;

    const lStr = parts[0];
    const cStr = parts[1];
    const hStr = parts[2];
    const aStr = parts[3];

    const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
    const c = parseFloat(cStr);
    let hDeg = parseFloat(hStr);

    if (hStr.endsWith('deg')) {
      hDeg = parseFloat(hStr);
    } else if (hStr.endsWith('rad')) {
      hDeg = (parseFloat(hStr) * 180) / Math.PI;
    } else if (hStr.endsWith('turn')) {
      hDeg = parseFloat(hStr) * 360;
    } else if (hStr.endsWith('grad')) {
      hDeg = (parseFloat(hStr) * 360) / 400;
    }

    let a = 1;
    if (aStr !== undefined) {
      a = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
    }

    if (isNaN(l) || isNaN(c) || isNaN(hDeg)) return match;

    const [r, g, b] = oklchToRgb(l, c, hDeg);
    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  });
}

export function replaceOklabInString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  if (!str.includes('oklab')) return str;

  return str.replace(/oklab\s*\(([^)]+)\)/gi, (match, contents) => {
    const parts = contents.trim().split(/[\s,/]+/);
    if (parts.length < 3) return match;

    const lStr = parts[0];
    const aStrVal = parts[1];
    const bStrVal = parts[2];
    const alphaStr = parts[3];

    const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
    const a = parseFloat(aStrVal);
    const b = parseFloat(bStrVal);

    let alpha = 1;
    if (alphaStr !== undefined) {
      alpha = alphaStr.endsWith('%') ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr);
    }

    if (isNaN(l) || isNaN(a) || isNaN(b)) return match;

    const [r, g, b_val] = oklabToRgb(l, a, b);
    if (alpha === 1) {
      return `rgb(${r}, ${g}, ${b_val})`;
    } else {
      return `rgba(${r}, ${g}, ${b_val}, ${alpha})`;
    }
  });
}

export function cleanColors(str: string): string {
  let cleaned = str;
  if (typeof cleaned === 'string') {
    if (cleaned.includes('oklch')) {
      cleaned = replaceOklchInString(cleaned);
    }
    if (cleaned.includes('oklab')) {
      cleaned = replaceOklabInString(cleaned);
    }
  }
  return cleaned;
}

export const withStylesCleaned = async <T,>(fn: () => Promise<T>): Promise<T> => {
  if (typeof window === 'undefined') return await fn();

  const originalGetComputedStyle = window.getComputedStyle;
  const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue;
  
  const hasOkl = (s: any) => typeof s === 'string' && (s.includes('oklch') || s.includes('oklab'));

  // 1. Patch getComputedStyle
  window.getComputedStyle = function (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'cssText') {
          const originalCssText = target.cssText;
          if (hasOkl(originalCssText)) {
            return cleanColors(originalCssText);
          }
          return originalCssText;
        }
        const val = Reflect.get(target, prop);
        if (hasOkl(val)) {
          return cleanColors(val);
        }
        if (typeof val === 'function') {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const originalVal = target.getPropertyValue(propertyName);
              if (hasOkl(originalVal)) {
                return cleanColors(originalVal);
              }
              return originalVal;
            };
          }
          return val.bind(target);
        }
        return val;
      }
    });
  };

  // 2. Patch CSSStyleDeclaration.prototype.getPropertyValue
  CSSStyleDeclaration.prototype.getPropertyValue = function (propertyName: string) {
    const originalVal = originalGetPropertyValue.call(this, propertyName);
    if (hasOkl(originalVal)) {
      return cleanColors(originalVal);
    }
    return originalVal;
  };

  // 3. Patch getters on CSSStyleDeclaration.prototype (including cssText)
  const declProto = CSSStyleDeclaration.prototype;
  const declDescriptors = Object.getOwnPropertyDescriptors(declProto);
  const declRestorers: Array<() => void> = [];

  for (const [prop, descriptor] of Object.entries(declDescriptors)) {
    if (descriptor && typeof descriptor.get === 'function' && prop !== 'getPropertyValue') {
      const originalGet = descriptor.get;
      try {
        Object.defineProperty(declProto, prop, {
          get() {
            const val = originalGet.call(this);
            if (hasOkl(val)) {
              return cleanColors(val);
            }
            return val;
          },
          set(newVal) {
            if (descriptor.set) {
              descriptor.set.call(this, newVal);
            }
          },
          configurable: true,
          enumerable: descriptor.enumerable
        });
        declRestorers.push(() => {
          Object.defineProperty(declProto, prop, descriptor);
        });
      } catch (e) {
        // Some properties might be read-only or not redefinable
      }
    }
  }

  // 4. Patch CSSRule.prototype.cssText and CSSStyleRule.prototype.cssText
  const ruleRestorers: Array<() => void> = [];
  const patchCssText = (proto: any) => {
    if (!proto) return;
    const desc = Object.getOwnPropertyDescriptor(proto, 'cssText');
    if (desc && typeof desc.get === 'function') {
      const originalGet = desc.get;
      try {
        Object.defineProperty(proto, 'cssText', {
          get() {
            const val = originalGet.call(this);
            if (hasOkl(val)) {
              return cleanColors(val);
            }
            return val;
          },
          set(newVal) {
            if (desc.set) desc.set.call(this, newVal);
          },
          configurable: true,
          enumerable: desc.enumerable
        });
        ruleRestorers.push(() => {
          Object.defineProperty(proto, 'cssText', desc);
        });
      } catch (e) {
        // ignore
      }
    }
  };

  if (typeof CSSRule !== 'undefined') patchCssText(CSSRule.prototype);
  if (typeof CSSStyleRule !== 'undefined') patchCssText(CSSStyleRule.prototype);

  try {
    return await fn();
  } finally {
    // Restore everything
    window.getComputedStyle = originalGetComputedStyle;
    CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue;
    declRestorers.forEach(restore => restore());
    ruleRestorers.forEach(restore => restore());
  }
};
