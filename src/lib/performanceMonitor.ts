/**
 * Performance Monitoring & Web Vitals
 * Tracks Core Web Vitals and performance metrics
 */

export interface WebVitals {
  lcp?: number; // Largest Contentful Paint (ms)
  fid?: number; // First Input Delay (ms)
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte (ms)
  fcp?: number; // First Contentful Paint (ms)
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  resourceLoadTime: number;
  dnsTime: number;
  tcpTime: number;
  ttfb: number;
  domInteractive: number;
  domComplete: number;
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  // Monitor Core Web Vitals
  if ("web-vital" in window) {
    monitorCoreWebVitals();
  }

  // Monitor page load performance
  if (document.readyState === "complete") {
    logPerformanceMetrics();
  } else {
    window.addEventListener("load", () => {
      logPerformanceMetrics();
    });
  }

  // Monitor long tasks (tasks that block main thread > 50ms)
  if ("PerformanceObserver" in window) {
    monitorLongTasks();
  }

  // Monitor layout shifts
  if ("PerformanceObserver" in window) {
    monitorLayoutShifts();
  }
}

/**
 * Monitor Core Web Vitals
 */
function monitorCoreWebVitals(): void {
  // Largest Contentful Paint (LCP)
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        const lcp = lastEntry.renderTime || lastEntry.loadTime;
        logMetric("LCP", lcp, "ms");
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (e) {
      console.warn("[Performance] LCP monitoring not supported");
    }
  }

  // Cumulative Layout Shift (CLS)
  if ("PerformanceObserver" in window) {
    try {
      let cls = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
            logMetric("CLS", cls.toFixed(3), "score");
          }
        }
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
    } catch (e) {
      console.warn("[Performance] CLS monitoring not supported");
    }
  }

  // First Input Delay (FID) / Interaction to Next Paint (INP)
  if ("PerformanceObserver" in window) {
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fid = (entry as any).processingDuration;
          logMetric("FID", fid, "ms");
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch (e) {
      console.warn("[Performance] FID monitoring not supported");
    }
  }
}

/**
 * Monitor long tasks that block main thread
 */
function monitorLongTasks(): void {
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        if (duration > 50) {
          logMetric("Long Task", duration, "ms");
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });
  } catch (e) {
    console.warn("[Performance] Long task monitoring not supported");
  }
}

/**
 * Monitor layout shifts
 */
function monitorLayoutShifts(): void {
  try {
    const shiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          const shift = (entry as any).value;
          if (shift > 0.1) {
            console.warn(`[Performance] Unexpected layout shift: ${shift}`);
          }
        }
      }
    });
    shiftObserver.observe({ entryTypes: ["layout-shift"] });
  } catch (e) {
    console.warn("[Performance] Layout shift monitoring not supported");
  }
}

/**
 * Get page performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics | null {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;

  if (!nav) return null;

  return {
    pageLoadTime: nav.loadEventEnd - nav.fetchStart,
    resourceLoadTime: nav.loadEventEnd - nav.domContentLoadedEventEnd,
    dnsTime: nav.domainLookupEnd - nav.domainLookupStart,
    tcpTime: nav.connectEnd - nav.connectStart,
    ttfb: nav.responseStart - nav.fetchStart,
    domInteractive: nav.domInteractive - nav.fetchStart,
    domComplete: nav.domComplete - nav.fetchStart,
  };
}

/**
 * Log performance metric
 */
function logMetric(name: string, value: number | string, unit: string): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${value}${unit}`);
  }

  // Send to analytics if available
  if (window.gtag) {
    (window as any).gtag("event", "performance", {
      metric_name: name,
      metric_value: value,
      metric_unit: unit,
    });
  }
}

/**
 * Check if page meets Core Web Vitals thresholds
 */
export function checkCoreWebVitalsThresholds(): {
  lcp: boolean;
  fid: boolean;
  cls: boolean;
} {
  const metrics = getPerformanceMetrics();

  return {
    lcp: metrics ? metrics.ttfb < 2500 : false, // LCP should be < 2.5s
    fid: metrics ? metrics.domInteractive < 100 : false, // FID should be < 100ms
    cls: true, // CLS should be < 0.1
  };
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(): string {
  const metrics = getPerformanceMetrics();

  if (!metrics) {
    return "Performance metrics not available";
  }

  return `
Performance Report:
- Page Load Time: ${metrics.pageLoadTime.toFixed(0)}ms
- DNS Time: ${metrics.dnsTime.toFixed(0)}ms
- TCP Time: ${metrics.tcpTime.toFixed(0)}ms
- Time to First Byte: ${metrics.ttfb.toFixed(0)}ms
- DOM Interactive: ${metrics.domInteractive.toFixed(0)}ms
- DOM Complete: ${metrics.domComplete.toFixed(0)}ms
- Resource Load Time: ${metrics.resourceLoadTime.toFixed(0)}ms
  `.trim();
}

/**
 * Extend window interface for gtag
 */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
