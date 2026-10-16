/**
 * TypeScript definitions for iframe-shield
 * Developed by JOJIN JOHN
 */

export type ShieldAction = 'sandbox' | 'remove' | 'blank';

export interface BlockEvent {
  timestamp: number;
  src: string;
  reason: string;
  matched: string | null;
  action: ShieldAction;
}

export interface ShieldStats {
  scanned: number;
  blocked: number;
  sandboxed: number;
  history: BlockEvent[];
}

export interface ShieldOptions {
  /**
   * Action to perform when an ad or unauthorized iframe is detected.
   * @default 'sandbox'
   */
  action?: ShieldAction;

  /**
   * Safe sandbox flags applied to untrusted/ad frames to neuter redirects and popups.
   * @default 'allow-scripts allow-same-origin'
   */
  sandboxFlags?: string;

  /**
   * Automatically apply safe sandbox attributes to any 3rd-party frame not in the trusted whitelist.
   * @default true
   */
  sandboxUntrusted?: boolean;

  /**
   * Automatically neutralize 1x1 or 0x0 hidden tracking frames.
   * @default true
   */
  blockTrackingPixels?: boolean;

  /**
   * Detect transparent overlay clickjacking attempts (opacity near 0 with high z-index).
   * @default true
   */
  blockClickjackingOverlays?: boolean;

  /**
   * Classify iframes matching standard IAB ad banner dimensions.
   * @default false
   */
  matchDimensions?: boolean;

  /**
   * Additional trusted domains to whitelist (e.g. ['partner.com']).
   */
  trustedDomains?: string[];

  /**
   * Additional ad domains to block.
   */
  adDomains?: string[];

  /**
   * Custom regex patterns to match against iframe URLs.
   */
  adPatterns?: RegExp[];

  /**
   * Callback fired whenever an ad iframe is intercepted.
   */
  onBlocked?: (event: BlockEvent, iframe: HTMLIFrameElement) => void;

  /**
   * Enable verbose console logging.
   * @default false
   */
  debug?: boolean;
}

export interface IframeShieldEngine {
  options: ShieldOptions;
  stats: ShieldStats;
  processIframe(iframe: HTMLIFrameElement): boolean;
  scan(): void;
  stop(): void;
}

export interface IframeShieldStatic {
  /**
   * Initialize the shield with options and begin DOM interception.
   */
  init(options?: ShieldOptions): IframeShieldEngine;

  /**
   * Get current scanning and blocking metrics.
   */
  getStats(): ShieldStats;

  /**
   * Dynamically whitelist a domain at runtime.
   */
  allowDomain(domain: string): void;

  /**
   * Dynamically blacklist an ad domain at runtime.
   */
  blockDomain(domain: string): void;

  /**
   * Register a callback triggered when an ad is intercepted.
   */
  onBlocked(callback: (event: BlockEvent, iframe: HTMLIFrameElement) => void): void;

  /**
   * Manually trigger a DOM scan for existing iframes.
   */
  scan(): void;

  /**
   * Stop interception and restore original DOM methods.
   */
  destroy(): void;

  /**
   * Create an isolated engine instance (useful for unit tests).
   */
  createInstance(options?: ShieldOptions): IframeShieldEngine;

  /**
   * Generate recommended Content Security Policy (CSP) header values for Cloudflare / HTTP servers.
   */
  generateCSP(customDomains?: string[]): string;

  DEFAULT_TRUSTED_DOMAINS: string[];
  DEFAULT_AD_DOMAINS: string[];
}

export declare const IframeShield: IframeShieldStatic;
export default IframeShield;

declare global {
  interface Window {
    IframeShield?: IframeShieldStatic;
    __IFRAME_SHIELD_NO_AUTO__?: boolean;
  }
}
