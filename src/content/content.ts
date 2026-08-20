import { getReadingRegion, startRegionSelect, toggleTranslator } from './region-select';
import { runOCR } from '../ocr/tesseract';
import { sortReadingOrder, groupNearbyText } from '../ocr/reading-order';
import { scrollAndCapture, resetCapture } from './scanner';
import { translate } from '../translation/translation-manager';

(window as any).__test = { runOCR, scrollAndCapture, resetCapture, translate };

console.log('content loaded');

setTimeout(async () => {
  const settings = await browser.storage.local.get([
    'openrouter_api_key', 'openrouter_model', 'groq_api_key', 'groq_model',
  ]);
  console.log('[TEST] settings loaded:', {
    hasOpenRouterKey: !!settings.openrouter_api_key,
    openrouterModel: settings.openrouter_model,
    hasGroqKey: !!settings.groq_api_key,
    groqModel: settings.groq_model,
  });

  try {
    const result = await translate(
      ['우리가', '그렇게', '둘이', '떨어지라고', '수없이', '말렸는데도'],
      { sourceLang: 'korean', targetLang: 'english' },
    );
    console.log('[TEST] translation result:', result);
  } catch (err) {
    console.error('[TEST] translation failed:', err);
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
