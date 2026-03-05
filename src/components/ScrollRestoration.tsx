import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const scrollPositions = new Map<string, number>();

const ScrollRestoration = () => {
  const { pathname } = useLocation();
  const prevPath = useRef(pathname);

  useEffect(() => {
    // Save scroll position of previous page
    if (prevPath.current !== pathname) {
      scrollPositions.set(prevPath.current, window.scrollY);
      prevPath.current = pathname;
    }

    // Restore scroll position or scroll to top
    const saved = scrollPositions.get(pathname);
    if (saved !== undefined) {
      // Use rAF to ensure DOM is ready
      requestAnimationFrame(() => window.scrollTo(0, saved));
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

export default ScrollRestoration;
