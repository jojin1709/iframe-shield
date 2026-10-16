import { classifyIframe } from './classifier.js';

export class IframeShieldEngine {
  constructor(options = {}) {
    this.options = {
      action: 'sandbox', // 'sandbox' | 'remove' | 'blank'
      sandboxFlags: 'allow-scripts allow-same-origin',
      sandboxUntrusted: true, // Apply safe sandbox to all third-party frames not in whitelist
      blockTrackingPixels: true,
      matchDimensions: false,
      debug: false,
      trustedDomains: [],
      adDomains: [],
      adPatterns: [],
      onBlocked: null,
      ...options
    };

    this.stats = {
      scanned: 0,
      blocked: 0,
      sandboxed: 0,
      history: []
    };

    this.observer = null;
    this.isIntercepting = false;
    this.originalCreateElement = null;
    this.originalAppendChild = null;
    this.originalInsertBefore = null;
    this.processedFrames = new WeakSet();
  }

  log(...args) {
    if (this.options.debug) {
      console.log('[IframeShield]', ...args);
    }
  }

  /**
   * Process a single iframe element
   */
  processIframe(iframe) {
    if (!iframe || !(iframe instanceof HTMLIFrameElement) || this.processedFrames.has(iframe)) {
      return false;
    }

    this.stats.scanned++;
    const classification = classifyIframe(iframe, this.options);

    this.log('Inspected iframe:', {
      src: iframe.src || iframe.getAttribute('src'),
      classification
    });

    if (classification.isBlocked) {
      this.handleBlockedIframe(iframe, classification);
      this.processedFrames.add(iframe);
      return true;
    }

    if (classification.shouldSandbox) {
      this.applySandbox(iframe, 'untrusted_third_party');
      this.processedFrames.add(iframe);
      return true;
    }

    this.processedFrames.add(iframe);
    return false;
  }

  /**
   * Applies the configured blocking action to an ad iframe
   */
  handleBlockedIframe(iframe, classification) {
    this.stats.blocked++;
    const event = {
      timestamp: Date.now(),
      src: iframe.getAttribute('src') || iframe.src,
      reason: classification.reason,
      matched: classification.matched || null,
      action: this.options.action
    };

    this.stats.history.push(event);
    if (this.stats.history.length > 100) {
      this.stats.history.shift();
    }

    if (typeof this.options.onBlocked === 'function') {
      try {
        this.options.onBlocked(event, iframe);
      } catch (err) {
        console.error('[IframeShield] Error in onBlocked callback:', err);
      }
    }

    this.log(`BLOCKED ad iframe (${classification.reason}):`, iframe);

    switch (this.options.action) {
      case 'remove':
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        } else {
          // If not attached yet, neutralize it
          iframe.src = 'about:blank';
          iframe.style.display = 'none';
        }
        break;

      case 'blank':
        iframe.src = 'about:blank';
        iframe.style.display = 'none';
        iframe.setAttribute('data-iframe-shield-blocked', 'true');
        break;

      case 'sandbox':
      default:
        this.applySandbox(iframe, classification.reason);
        break;
    }
  }

  /**
   * Applies safe sandbox attributes to neutralize popups, top-navigation & redirects
   */
  applySandbox(iframe, reason) {
    this.stats.sandboxed++;
    const safeFlags = this.options.sandboxFlags || 'allow-scripts allow-same-origin';
    iframe.setAttribute('sandbox', safeFlags);
    iframe.setAttribute('data-iframe-shield-sandboxed', reason);
    this.log(`Sandboxed iframe with flags "${safeFlags}" (Reason: ${reason})`);
  }

  /**
   * Intercepts DOM creation and insertions so ads can be caught before execution
   */
  startInterception() {
    if (this.isIntercepting || typeof window === 'undefined') return;
    this.isIntercepting = true;

    const self = this;

    // 1. Monkey-patch document.createElement to intercept new iframes
    if (typeof document !== 'undefined' && document.createElement) {
      this.originalCreateElement = document.createElement;
      document.createElement = function(tagName, options) {
        const element = self.originalCreateElement.call(document, tagName, options);
        if (typeof tagName === 'string' && tagName.toLowerCase() === 'iframe') {
          self.hookIframeAttributes(element);
        }
        return element;
      };
    }

    // 2. Monkey-patch appendChild
    if (typeof Node !== 'undefined' && Node.prototype.appendChild) {
      this.originalAppendChild = Node.prototype.appendChild;
      Node.prototype.appendChild = function(child) {
        if (child instanceof HTMLIFrameElement) {
          self.processIframe(child);
          if (self.options.action === 'remove' && !child.parentNode && child.src === 'about:blank') {
            return child; // Do not append removed elements
          }
        }
        return self.originalAppendChild.call(this, child);
      };
    }

    // 3. Setup MutationObserver for elements added via innerHTML / template strings
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      this.observer = new MutationObserver(mutations => {
        for (let i = 0; i < mutations.length; i++) {
          const addedNodes = mutations[i].addedNodes;
          for (let j = 0; j < addedNodes.length; j++) {
            const node = addedNodes[j];
            if (node.nodeType === 1) { // ELEMENT_NODE
              if (node.tagName === 'IFRAME') {
                self.processIframe(node);
              } else if (node.querySelectorAll) {
                const iframes = node.querySelectorAll('iframe');
                for (let k = 0; k < iframes.length; k++) {
                  self.processIframe(iframes[k]);
                }
              }
            }
          }
        }
      });

      this.observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    // Scan any existing iframes currently in the DOM
    this.scan();
  }

  /**
   * Hooks into an iframe's src and setAttribute to catch late-binding URLs
   */
  hookIframeAttributes(iframe) {
    const self = this;
    const originalSetAttribute = iframe.setAttribute;

    iframe.setAttribute = function(name, value) {
      const res = originalSetAttribute.call(this, name, value);
      if (name.toLowerCase() === 'src') {
        self.processIframe(iframe);
      }
      return res;
    };
  }

  /**
   * Scans all iframes currently attached in document
   */
  scan() {
    if (typeof document === 'undefined') return;
    const iframes = document.querySelectorAll('iframe');
    for (let i = 0; i < iframes.length; i++) {
      this.processIframe(iframes[i]);
    }
  }

  /**
   * Disables interception and restores original DOM methods
   */
  stop() {
    if (this.originalCreateElement) {
      document.createElement = this.originalCreateElement;
      this.originalCreateElement = null;
    }
    if (this.originalAppendChild) {
      Node.prototype.appendChild = this.originalAppendChild;
      this.originalAppendChild = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isIntercepting = false;
  }
}
