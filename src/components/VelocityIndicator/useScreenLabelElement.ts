import { useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Creates a styled <div> inside a screen-label root and returns a ref to it.
 *
 * Uses a layout effect so the element exists before the first frame writes to it.
 */
export function useScreenLabelElement(
  rootRef: RefObject<HTMLDivElement | null>,
  cssText: string
): RefObject<HTMLDivElement | null> {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    root.replaceChildren();
    const element = document.createElement('div');
    element.style.cssText = cssText;
    root.append(element);
    elementRef.current = element;

    return () => {
      elementRef.current = null;
      root.replaceChildren();
    };
  }, [rootRef, cssText]);

  return elementRef;
}
