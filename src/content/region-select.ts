interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getReadingRegion(): Promise<Region | null> {
  const result = await browser.storage.local.get('readingRegion');
  const val = result.readingRegion;
  if (
    val && typeof val === 'object' &&
    'x' in val && 'y' in val && 'width' in val && 'height' in val
  ) {
    return val as Region;
  }
  return null;
}

export async function clearReadingRegion(): Promise<void> {
  await browser.storage.local.remove('readingRegion');
}

export function startRegionSelect(): Promise<Region | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      cursor: crosshair;
      z-index: 2147483647;
    `;
    document.documentElement.appendChild(overlay);

    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.75);
      color: #fff;
      padding: 8px 16px;
      border-radius: 6px;
      font: 14px system-ui, sans-serif;
      z-index: 2147483647;
      pointer-events: none;
    `;
    hint.textContent = 'Click and drag to select reading area — Esc to cancel';
    document.documentElement.appendChild(hint);

    const box = document.createElement('div');
    box.style.cssText = `
      position: absolute;
      border: 2px dashed #fff;
      background: rgba(255, 255, 255, 0.1);
      display: none;
      z-index: 2147483647;
      pointer-events: none;
    `;
    document.documentElement.appendChild(box);

    let startX = 0;
    let startY = 0;

    function cleanup() {
      overlay.remove();
      hint.remove();
      box.remove();
      document.removeEventListener('keydown', onKey);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    }

    function onMouseDown(e: MouseEvent) {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = `${startX}px`;
      box.style.top = `${startY}px`;
      box.style.width = '0px';
      box.style.height = '0px';
      box.style.display = 'block';
      overlay.removeEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      box.style.width = `${w}px`;
      box.style.height = `${h}px`;
    }

    function onMouseUp(e: MouseEvent) {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const vpX = Math.min(e.clientX, startX);
      const vpY = Math.min(e.clientY, startY);
      const vpW = Math.abs(e.clientX - startX);
      const vpH = Math.abs(e.clientY - startY);

      cleanup();

      if (vpW < 10 || vpH < 10) {
        resolve(null);
        return;
      }

      const region: Region = {
        x: vpX + window.scrollX,
        y: vpY + window.scrollY,
        width: vpW,
        height: vpH,
      };

      browser.storage.local.set({ readingRegion: region });
      resolve(region);
    }

    document.addEventListener('keydown', onKey);
    overlay.addEventListener('mousedown', onMouseDown);
  });
}

let translatorActive = false;

export function toggleTranslator(): void {
  translatorActive = !translatorActive;
  console.log(`[manhwa-translator] translator ${translatorActive ? 'ON' : 'OFF'}`);
}
