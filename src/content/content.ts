import { getReadingRegion, startRegionSelect, toggleTranslator } from './region-select';
import { runOCR } from '../ocr/tesseract';
import { scrollAndCapture, resetCapture } from './scanner';

(window as any).__test = { runOCR, scrollAndCapture, resetCapture };

console.log('content loaded');

setTimeout(async () => {
  console.log('[TEST] scrollY before:', window.scrollY, 'documentHeight:', document.documentElement.scrollHeight, 'innerHeight:', window.innerHeight);
  window.scrollBy(0, 800);
  await new Promise((r) => setTimeout(r, 300));
  console.log('[TEST] scrollY after:', window.scrollY);
}, 3000);

document.addEventListener('keydown', async (e: KeyboardEvent) => {
  if (!e.ctrlKey || !e.shiftKey || e.key !== 'T') return;
  e.preventDefault();

  const region = await getReadingRegion();
  if (!region) {
    await startRegionSelect();
  } else {
    toggleTranslator();
  }
});
