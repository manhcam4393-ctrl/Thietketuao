export interface ImageSettings {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  hue: number;
  sharpen: number;
  clarity: number;
}

export const defaultImageSettings: ImageSettings = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  hue: 0,
  sharpen: 0,
  clarity: 0,
};

export function applyFilters(imageData: ImageData, settings: ImageSettings) {
  const data = imageData.data;
  const { exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, saturation, vibrance, hue, sharpen, clarity } = settings;

  // Pre-calculate factors
  const expFactor = Math.pow(2, exposure / 50); // -100->0.25, 0->1, 100->4
  const contFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  const tempFactor = temperature / 100; 
  const tintFactor = tint / 100; 
  
  const satFactor = 1 + (saturation / 100);
  const vibFactor = vibrance / 100;
  const clarityFactor = clarity / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 1. Temperature & Tint
    r = r + tempFactor * 30;
    b = b - tempFactor * 30;
    g = g + tintFactor * 30;

    // 2. Exposure
    r *= expFactor;
    g *= expFactor;
    b *= expFactor;

    // 3. Contrast
    if (contrast !== 0) {
      r = contFactor * (r - 128) + 128;
      g = contFactor * (g - 128) + 128;
      b = contFactor * (b - 128) + 128;
    }

    // Clarity (Midtone contrast)
    if (clarity !== 0) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const midDist = 1 - Math.abs(lum - 128) / 128; // 1 at 128, 0 at 0 and 255
      if (midDist > 0) {
        const diffR = r - 128;
        const diffG = g - 128;
        const diffB = b - 128;
        r += diffR * clarityFactor * midDist;
        g += diffG * clarityFactor * midDist;
        b += diffB * clarityFactor * midDist;
      }
    }

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // 4. Highlights, Shadows, Whites, Blacks
    const lum2 = 0.299 * r + 0.587 * g + 0.114 * b;
    
    if (shadows !== 0 && lum2 < 128) {
      const shadowMult = 1 + (shadows / 100) * (1 - lum2 / 128);
      r *= shadowMult; g *= shadowMult; b *= shadowMult;
    }
    
    if (highlights !== 0 && lum2 > 128) {
      const highMult = 1 + (highlights / 100) * ((lum2 - 128) / 127);
      r *= highMult; g *= highMult; b *= highMult;
    }

    if (whites !== 0 && lum2 > 200) {
      const whiteMult = 1 + (whites / 100) * ((lum2 - 200) / 55);
      r *= whiteMult; g *= whiteMult; b *= whiteMult;
    }

    if (blacks !== 0 && lum2 < 55) {
      const blackMult = 1 + (blacks / 100) * (1 - lum2 / 55);
      r *= blackMult; g *= blackMult; b *= blackMult;
    }

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    // 5. Saturation, Vibrance, Hue
    if (saturation !== 0 || vibrance !== 0 || hue !== 0) {
      let rNorm = r / 255;
      let gNorm = g / 255;
      let bNorm = b / 255;
      let max = Math.max(rNorm, gNorm, bNorm), min = Math.min(rNorm, gNorm, bNorm);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
          case gNorm: h = (bNorm - rNorm) / d + 2; break;
          case bNorm: h = (rNorm - gNorm) / d + 4; break;
        }
        h /= 6;
      }

      if (hue !== 0) {
        h += hue / 360;
        if (h > 1) h -= 1;
        if (h < 0) h += 1;
      }

      if (saturation !== 0) {
        s *= satFactor;
      }

      if (vibrance !== 0) {
        s += vibFactor * (1 - s) * s;
      }

      s = Math.max(0, Math.min(1, s));

      if (s === 0) {
        r = g = b = l * 255;
      } else {
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3) * 255;
        g = hue2rgb(p, q, h) * 255;
        b = hue2rgb(p, q, h - 1/3) * 255;
      }
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  // 6. Sharpen
  if (sharpen !== 0) {
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);
    const amount = sharpen / 100;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          const top = tempData[((y - 1) * width + x) * 4 + c];
          const bottom = tempData[((y + 1) * width + x) * 4 + c];
          const left = tempData[(y * width + x - 1) * 4 + c];
          const right = tempData[(y * width + x + 1) * 4 + c];
          const center = tempData[i + c];
          
          const laplacian = (center * 4) - top - bottom - left - right;
          data[i + c] = Math.max(0, Math.min(255, center + laplacian * amount));
        }
      }
    }
  }
}
