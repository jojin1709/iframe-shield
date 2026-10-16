import { IframeShieldEngine } from './engine.js';
import { DEFAULT_TRUSTED_DOMAINS, DEFAULT_AD_DOMAINS } from './rules.js';

let defaultInstance = null;

export const IframeShield = {
  /**
   * Initializes the ad shield with optional configuration
   */
  init(options = {}) {
    if (!defaultInstance) {
      defaultInstance = new IframeShieldEngine(options);
      defaultInstance.startInterception();
    }
    return defaultInstance;
  },

  /**
   * Returns current blocking and scanning statistics
   */
  getStats() {
    return defaultInstance ? defaultInstance.stats : { scanned: 0, blocked: 0, sandboxed: 0, history: [] };
  },

  /**
   * Whitelist a domain dynamically
   */
  allowDomain(domain) {
    if (!domain) return;
    if (defaultInstance) {
      defaultInstance.options.trustedDomains.push(domain);
    }
  },

  /**
   * Blacklist an ad domain dynamically
   */
  blockDomain(domain) {
    if (!domain) return;
    if (defaultInstance) {
      defaultInstance.options.adDomains.push(domain);
    }
  },

  /**
   * Register a callback fired whenever an ad or untrusted iframe is blocked
   */
  onBlocked(callback) {
    if (defaultInstance) {
      defaultInstance.options.onBlocked = callback;
    }
  },

  /**
   * Manually trigger a DOM scan for existing iframes
   */
  scan() {
    if (defaultInstance) {
      defaultInstance.scan();
    }
  },

  /**
   * Cleanly stop interception and restore browser methods
   */
  destroy() {
    if (defaultInstance) {
      defaultInstance.stop();
      defaultInstance = null;
    }
  },

  /**
   * Create an isolated engine instance (useful for unit testing or custom wrappers)
   */
  createInstance(options = {}) {
    return new IframeShieldEngine(options);
  },

  /**
   * Generate recommended Content Security Policy (CSP) directives for Cloudflare / web servers
   */
  generateCSP(customDomains = []) {
    const trusted = [...DEFAULT_TRUSTED_DOMAINS, ...customDomains]
      .filter(d => !d.includes('/'))
      .map(d => `https://${d}`);

    const uniqueSources = Array.from(new Set(["'self'", ...trusted])).join(' ');
    return `frame-src ${uniqueSources}; frame-ancestors 'self';`;
  },

  /**
   * Expose default lists for developer inspection
   */
  DEFAULT_TRUSTED_DOMAINS,
  DEFAULT_AD_DOMAINS
};

// Automatic initialization when included directly in a browser <script> tag
if (typeof window !== 'undefined') {
  window.IframeShield = IframeShield;

  // Auto-init unless explicitly turned off via window.__IFRAME_SHIELD_NO_AUTO__
  if (!window.__IFRAME_SHIELD_NO_AUTO__) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        IframeShield.init();
      });
    } else {
      IframeShield.init();
    }
  }
}

export default IframeShield;
