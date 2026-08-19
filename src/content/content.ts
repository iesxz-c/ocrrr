import { getReadingRegion, startRegionSelect, toggleTranslator } from './region-select';
import { runOCR } from '../ocr/tesseract';
import { sortReadingOrder, groupNearbyText } from '../ocr/reading-order';
import { scrollAndCapture, resetCapture } from './scanner';

(window as any).__test = { runOCR, scrollAndCapture, resetCapture };

console.log('content loaded');

setTimeout(async () => {
  resetCapture();
  await scrollAndCapture(500);
  const band = await scrollAndCapture(500);
  if (band) {
    const results = await runOCR(band, 'korean', 0);
    console.log('[TEST] raw OCR order:', results.map((r) => r.text));

    const sorted = sortReadingOrder(results);
    console.log('[TEST] sorted reading order:', sorted.map((r) => r.text));

    const groups = groupNearbyText(results, 80);
    console.log('[TEST] groups:', groups.map((g) => g.map((r) => r.text)));
  }
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
