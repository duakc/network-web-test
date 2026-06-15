import { useEffect, useRef, useState } from "react";

/**
 * Reports when an element first scrolls into the viewport. Used to lazily kick
 * off latency tests only for the rows the user actually looks at. Once seen, it
 * stays `true` (we don't need to re-trigger on scroll-out/in).
 */
export function useInView<T extends Element>(
  options: IntersectionObserverInit = { rootMargin: "120px" },
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    }, options);

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return [ref, inView];
}