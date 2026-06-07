import { useEffect } from 'react';
import { tipForInteractiveElement } from '../lib/actionTooltips';

const INTERACTIVE_SELECTOR = [
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'a.btn',
  '[role="button"]',
  '.app-select-wrap',
].join(', ');

function enrichNativeTitle(el) {
  const tip = tipForInteractiveElement(el);
  if (tip) el.title = tip;
}

function scanInteractiveElements(root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll(INTERACTIVE_SELECTOR).forEach(enrichNativeTitle);
}

/**
 * Asigna title a controles sin tooltip: al cargar, al cambiar el DOM y al pasar el cursor.
 */
export function useNativeTooltips(containerRef) {
  useEffect(() => {
    const root = containerRef?.current || document.querySelector('.dashboard-main') || document.body;

    scanInteractiveElements(root);

    let debounceId;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceId);
      debounceId = setTimeout(() => scanInteractiveElements(root), 150);
    });
    observer.observe(root, { childList: true, subtree: true });

    const onPointerOver = (event) => {
      const el = event.target.closest(INTERACTIVE_SELECTOR);
      if (el && root.contains(el)) enrichNativeTitle(el);
    };
    root.addEventListener('pointerover', onPointerOver, true);

    return () => {
      clearTimeout(debounceId);
      observer.disconnect();
      root.removeEventListener('pointerover', onPointerOver, true);
    };
  }, [containerRef]);
}

export default useNativeTooltips;
