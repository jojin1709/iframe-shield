/**
 * React & Next.js Hook for iframe-shield
 * Developed by JOJIN JOHN
 */

import { useEffect, useState } from 'react';
import { IframeShield } from 'iframe-shield';

/**
 * React hook to initialize iframe-shield inside Next.js / React applications.
 *
 * Usage:
 * ```jsx
 * import { useIframeShield } from './react-nextjs';
 *
 * function App() {
 *   const { stats, isReady } = useIframeShield({
 *     action: 'sandbox',
 *     trustedDomains: ['my-partner.com']
 *   });
 *
 *   return <div>Protected! Blocked ads: {stats.blocked}</div>;
 * }
 * ```
 */
export function useIframeShield(options = {}) {
  const [stats, setStats] = useState({ scanned: 0, blocked: 0, sandboxed: 0, history: [] });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const engine = IframeShield.init({
      ...options,
      onBlocked: (event, iframe) => {
        setStats({ ...IframeShield.getStats() });
        if (options.onBlocked) {
          options.onBlocked(event, iframe);
        }
      }
    });

    setIsReady(true);
    setStats({ ...IframeShield.getStats() });

    return () => {
      IframeShield.destroy();
    };
  }, []);

  return { stats, isReady, IframeShield };
}
