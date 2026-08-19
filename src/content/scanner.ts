import { getReadingRegion } from './region-select';

let previousScrollY: number | null = null;

export function resetCapture(): void {
  previousScrollY = null;
}

interface CaptureResponse {
  dataUrl?: string;
  error?: string;
}

async function requestCaptureVisibleTab(): Promise<string> {
  const response = (await browser.runtime.sendMessage({ type: 'captureVisibleTab' })) as CaptureResponse;
  if (!response || response.error) {
    throw new Error(response?.error ?? 'captureVisibleTab failed');
  }
  return response.dataUrl!;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load captured image'));
    img.src = dataUrl;
  });
}

function cropImage(
  dataUrl: string,
  cropY: number,
  cropHeight: number,
  cropX: number,
  cropWidth: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight,
      );
      resolve(canvas.toDataURL());
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = dataUrl;
  });
}

export async function captureNextBand(): Promise<string | null> {
  const currentScrollY = Math.round(window.scrollY);

  if (previousScrollY === null) {
    previousScrollY = currentScrollY;
    return null;
  }

  if (currentScrollY === previousScrollY) {
    return null;
  }

  const vpHeight = window.innerHeight;
  const vpWidth = window.innerWidth;

  const prevTop = previousScrollY;
  const prevBottom = prevTop + vpHeight;
  const currentTop = currentScrollY;
  const currentBottom = currentTop + vpHeight;

  previousScrollY = currentScrollY;

  const bandTop = Math.max(prevBottom, currentTop);
  const bandBottom = currentBottom;

  if (bandTop >= bandBottom) {
    return null;
  }

  const region = await getReadingRegion();

  const dataUrl = await requestCaptureVisibleTab();
  const img = await loadImage(dataUrl);

  const imgScale = img.naturalHeight / vpHeight;

  let cropX: number;
  let cropW: number;

  if (region && region.width > 0) {
    const regionLeft = region.x;
    const regionRight = region.x + region.width;
    cropX = Math.max(regionLeft, 0) * imgScale;
    cropW = (Math.min(regionRight, vpWidth) - Math.max(regionLeft, 0)) * imgScale;
  } else {
    cropX = 0;
    cropW = img.naturalWidth;
  }

  const cropY = (bandTop - currentTop) * imgScale;
  const cropH = (bandBottom - bandTop) * imgScale;

  if (cropW <= 0 || cropH <= 0) {
    return null;
  }

  return cropImage(dataUrl, cropY, cropH, cropX, cropW);
}

export async function scrollAndCapture(pixelsPerStep: number): Promise<string | null> {
  const vpHeight = window.innerHeight;
  if (pixelsPerStep > vpHeight) {
    pixelsPerStep = vpHeight;
    console.warn('[manhwa-translator] clamped scroll step to viewport height to avoid uncaptured gap');
  }

  const scrollBefore = window.scrollY;
  window.scrollBy(0, pixelsPerStep);

  await new Promise((r) => setTimeout(r, 300));

  if (window.scrollY === scrollBefore) {
    return null;
  }

  return captureNextBand();
}
