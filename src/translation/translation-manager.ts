import { translateViaOpenRouter } from './openrouter';
import { translateViaGroq } from './groq';

export interface TranslationSettings {
  sourceLang: string;
  targetLang: string;
}

export async function translate(
  groupedText: string[],
  settings: TranslationSettings,
): Promise<string[]> {
  const { sourceLang, targetLang } = settings;

  try {
    const result = await translateViaOpenRouter(groupedText, sourceLang, targetLang);
    console.log('[manhwa-translator] translated via OpenRouter');
    return result;
  } catch (orErr) {
    console.warn('[manhwa-translator] OpenRouter failed, trying Groq:', orErr);
  }

  try {
    const result = await translateViaGroq(groupedText, sourceLang, targetLang);
    console.log('[manhwa-translator] translated via Groq');
    return result;
  } catch (groqErr) {
    console.error('[manhwa-translator] Groq also failed:', groqErr);
    throw new Error('Both translation providers failed');
  }
}
