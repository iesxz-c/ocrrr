import Tesseract from 'tesseract.js';
import { preprocessForOCR } from './preprocessing';

export interface OCRResult {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

const LANG_MAP: Record<string, string> = {
  korean: 'kor',
  japanese: 'jpn_vert',
  chinese_simplified: 'chi_sim',
  chinese_traditional: 'chi_tra',
  english: 'eng',
  auto: 'osd',
};

const WORKER_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_CONFIDENCE_THRESHOLD = 40;

interface CachedWorker {
  worker: Tesseract.Worker;
  timer: ReturnType<typeof setTimeout>;
}

const workers = new Map<string, CachedWorker>();

function resolveLangCode(sourceLang: string): string {
  return LANG_MAP[sourceLang] ?? sourceLang;
}

async function getWorker(lang: string): Promise<Tesseract.Worker> {
  const cached = workers.get(lang);
  if (cached) {
    clearTimeout(cached.timer);
    cached.timer = scheduleTerminate(lang);
    return cached.worker;
  }

  const worker = await Tesseract.createWorker(lang, undefined, {
    logger: () => {},
  });

  workers.set(lang, { worker, timer: scheduleTerminate(lang) });
  return worker;
}

function scheduleTerminate(lang: string): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    const entry = workers.get(lang);
    if (entry) {
      entry.worker.terminate();
      workers.delete(lang);
    }
  }, WORKER_TIMEOUT_MS);
}

function toBbox(b: Tesseract.Bbox): OCRResult['bbox'] {
  return {
    x: b.x0,
    y: b.y0,
    width: b.x1 - b.x0,
    height: b.y1 - b.y0,
  };
}

async function recognizeAndParse(
  imageDataUrl: string,
  tessLang: string,
  confidenceThreshold: number,
): Promise<OCRResult[]> {
  const worker = await getWorker(tessLang);

  const { data } = await worker.recognize(imageDataUrl, {}, { blocks: true, text: true });
  console.log('[manhwa-translator] raw Tesseract response:', data);
  if (!data.blocks) return [];

  const results: OCRResult[] = [];

  for (const block of data.blocks) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const word of line.words) {
          if (word.confidence < confidenceThreshold) continue;
          const trimmed = word.text.trim();
          if (!trimmed) continue;
          results.push({
            text: trimmed,
            confidence: word.confidence,
            bbox: toBbox(word.bbox),
          });
        }
      }
    }
  }

  return results;
}

export async function runOCR(
  dataUrl: string,
  sourceLang: string,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD,
  usePreprocessing = false,
): Promise<OCRResult[]> {
  const tessLang = resolveLangCode(sourceLang);
  const image = usePreprocessing
    ? await preprocessForOCR(dataUrl, sourceLang)
    : dataUrl;
  return recognizeAndParse(image, tessLang, confidenceThreshold);
}

export async function terminateAll(): Promise<void> {
  for (const [lang, entry] of workers) {
    clearTimeout(entry.timer);
    await entry.worker.terminate();
    workers.delete(lang);
  }
}
