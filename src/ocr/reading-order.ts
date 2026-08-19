import { OCRResult } from './tesseract';

export function sortReadingOrder(results: OCRResult[]): OCRResult[] {
  if (results.length === 0) return [];

  const sorted = [...results].sort((a, b) => a.bbox.y - b.bbox.y);

  const lineHeights: number[] = [];
  for (const r of results) {
    lineHeights.push(r.bbox.height);
  }
  const medianHeight = lineHeights.sort((a, b) => a - b)[lineHeights.length >> 1];
  const rowTolerance = medianHeight * 0.6;

  const rows: OCRResult[][] = [];
  let currentRow: OCRResult[] = [sorted[0]];
  let rowY = sorted[0].bbox.y;

  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    if (Math.abs(r.bbox.y - rowY) <= rowTolerance) {
      currentRow.push(r);
    } else {
      currentRow.sort((a, b) => a.bbox.x - b.bbox.x);
      rows.push(currentRow);
      currentRow = [r];
      rowY = r.bbox.y;
    }
  }
  currentRow.sort((a, b) => a.bbox.x - b.bbox.x);
  rows.push(currentRow);

  return rows.flat();
}

export function groupNearbyText(
  results: OCRResult[],
  maxGapPx = 80,
): OCRResult[][] {
  if (results.length === 0) return [];

  const ordered = sortReadingOrder(results);
  const groups: OCRResult[][] = [[ordered[0]]];

  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const curr = ordered[i];
    const gap = curr.bbox.y - (prev.bbox.y + prev.bbox.height);

    if (gap <= maxGapPx) {
      groups[groups.length - 1].push(curr);
    } else {
      groups.push([curr]);
    }
  }

  return groups;
}
