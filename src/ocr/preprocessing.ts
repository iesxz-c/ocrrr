export function toGrayscale(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = gray;
    d[i + 1] = gray;
    d[i + 2] = gray;
  }
  return out;
}

export function upscale2x(imageData: ImageData): ImageData {
  const { data, width, height } = imageData;
  const w2 = width * 2;
  const h2 = height * 2;
  const out = new ImageData(w2, h2);
  const src = data;
  const dst = out.data;
  for (let y = 0; y < h2; y++) {
    const sy = (y >> 1) * width;
    for (let x = 0; x < w2; x++) {
      const sx = (x >> 1) * 4;
      const si = (sy + (x >> 1)) * 4;
      const di = (y * w2 + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
  return out;
}

export function adaptiveThreshold(
  imageData: ImageData,
  blockSize = 15,
  c = 10,
): ImageData {
  const { data, width, height } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const d = out.data;

  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      rowSum += data[si];
      integral[(y + 1) * (width + 1) + (x + 1)] =
        integral[y * (width + 1) + (x + 1)] + rowSum;
    }
  }

  const half = blockSize >> 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x1 = Math.max(0, x - half);
      const y1 = Math.max(0, y - half);
      const x2 = Math.min(width - 1, x + half);
      const y2 = Math.min(height - 1, y + half);
      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      const sum =
        integral[(y2 + 1) * (width + 1) + (x2 + 1)] -
        integral[y1 * (width + 1) + (x2 + 1)] -
        integral[(y2 + 1) * (width + 1) + x1] +
        integral[y1 * (width + 1) + x1];

      const threshold = sum / count - c;
      const di = (y * width + x) * 4;
      const val = data[di] < threshold ? 0 : 255;
      d[di] = val;
      d[di + 1] = val;
      d[di + 2] = val;
    }
  }
  return out;
}

export function denoise(imageData: ImageData, radius = 1): ImageData {
  const { data, width, height } = imageData;
  const out = new ImageData(new Uint8ClampedArray(data), width, height);
  const d = out.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const neighbors: number[] = [];
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          neighbors.push(data[(ny * width + nx) * 4]);
        }
      }
      neighbors.sort((a, b) => a - b);
      const median = neighbors[neighbors.length >> 1];
      const di = (y * width + x) * 4;
      d[di] = median;
      d[di + 1] = median;
      d[di + 2] = median;
    }
  }
  return out;
}

export async function preprocessForOCR(
  dataUrl: string,
  _sourceLang: string,
): Promise<string> {
  const img = await loadImage(dataUrl);

  const offscreen = document.createElement('canvas');
  offscreen.width = img.naturalWidth;
  offscreen.height = img.naturalHeight;
  const ctx = offscreen.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  let current = ctx.getImageData(0, 0, offscreen.width, offscreen.height);

  current = toGrayscale(current);
  current = upscale2x(current);
  current = adaptiveThreshold(current);
  current = denoise(current);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = current.width;
  outCanvas.height = current.height;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.putImageData(current, 0, 0);
  return outCanvas.toDataURL();
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}
