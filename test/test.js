import assert from 'node:assert/strict';
import { parseUrl, matchesDomainList, classifyIframe, matchesAdDimensions, isHiddenTrackingFrame } from '../src/classifier.js';
import { IframeShieldEngine } from '../src/engine.js';
import { DEFAULT_TRUSTED_DOMAINS, DEFAULT_AD_DOMAINS } from '../src/rules.js';
import { IframeShield } from '../src/index.js';

console.log('🧪 Starting IframeShield Verification Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (error) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${error.message}`);
  }
}

// Mock browser environment for Node.js test runner
global.window = {
  location: {
    protocol: 'https:',
    hostname: 'example.com',
    href: 'https://example.com/app/index.html'
  }
};

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.style = {};
    this.parentNode = null;
    this.dataset = {};
  }
  setAttribute(name, val) {
    this.attributes[name.toLowerCase()] = String(val);
  }
  getAttribute(name) {
    return this.attributes[name.toLowerCase()] || null;
  }
  hasAttribute(name) {
    return name.toLowerCase() in this.attributes;
  }
  removeAttribute(name) {
    delete this.attributes[name.toLowerCase()];
  }
  removeChild(child) {
    if (child.parentNode === this) {
      child.parentNode = null;
    }
  }
}

class MockIframe extends MockElement {
  constructor() {
    super('iframe');
    this._src = '';
  }
  get src() {
    return this.getAttribute('src') || this._src;
  }
  set src(val) {
    this._src = val;
    this.setAttribute('src', val);
  }
}

global.HTMLIFrameElement = MockIframe;

// --- Test Cases ---

runTest('1. Parse URL correctly handles standard and protocol-relative URLs', () => {
  const p1 = parseUrl('https://adservice.google.com/pagead/lvz?param=1');
  assert.equal(p1.hostname, 'adservice.google.com');

  const p2 = parseUrl('//popads.net/serve.js');
  assert.equal(p2.hostname, 'popads.net');

  const p3 = parseUrl('about:blank');
  assert.equal(p3.isSpecial, true);
});

runTest('2. Whitelist: YouTube and Stripe embeds are classified as trusted', () => {
  const ytFrame = new MockIframe();
  ytFrame.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  const ytResult = classifyIframe(ytFrame);
  assert.equal(ytResult.isTrusted, true);
  assert.equal(ytResult.isBlocked, false);

  const stripeFrame = new MockIframe();
  stripeFrame.src = 'https://js.stripe.com/v3/elements-inner-card.html';
  const stripeResult = classifyIframe(stripeFrame);
  assert.equal(stripeResult.isTrusted, true);
  assert.equal(stripeResult.isBlocked, false);
});

runTest('3. Ad Networks: DoubleClick, PopAds, and Taboola are classified as blocked', () => {
  const ad1 = new MockIframe();
  ad1.src = 'https://securepubads.g.doubleclick.net/gampad/ads?iu=123';
  const res1 = classifyIframe(ad1);
  assert.equal(res1.isBlocked, true);
  assert.equal(res1.reason, 'known_ad_network');

  const ad2 = new MockIframe();
  ad2.src = 'https://serve.popads.net/banner.html';
  const res2 = classifyIframe(ad2);
  assert.equal(res2.isBlocked, true);
  assert.equal(res2.reason, 'known_ad_network');
});

runTest('4. Ad URL Regex: URLs with /ads/ or clicktag are detected', () => {
  const customAd = new MockIframe();
  customAd.src = 'https://unlisted-cdn.net/ads/banner/display.html?clicktag=http://track.com';
  const res = classifyIframe(customAd);
  assert.equal(res.isBlocked, true);
  assert.equal(res.reason, 'ad_url_pattern');
});

runTest('5. Tracking Pixels: 1x1 and 0x0 hidden frames are blocked', () => {
  const tracker = new MockIframe();
  tracker.src = 'https://tracker.thirdparty.com/sync';
  tracker.setAttribute('width', '1');
  tracker.setAttribute('height', '1');
  const res = classifyIframe(tracker, { blockTrackingPixels: true });
  assert.equal(res.isBlocked, true);
  assert.equal(res.reason, 'hidden_tracking_iframe');
});

runTest('6. Untrusted third-party iframe receives sandbox instruction', () => {
  const thirdParty = new MockIframe();
  thirdParty.src = 'https://random-blog-widget.org/widget.html';
  const res = classifyIframe(thirdParty, { sandboxUntrusted: true });
  assert.equal(res.isBlocked, false);
  assert.equal(res.shouldSandbox, true);
  assert.equal(res.reason, 'untrusted_third_party');
});

runTest('7. Engine sandbox action applies safe sandbox flags to ad frames', () => {
  const engine = new IframeShieldEngine({ action: 'sandbox' });
  const adFrame = new MockIframe();
  adFrame.src = 'https://criteo.com/delivery/lg.php';

  const processed = engine.processIframe(adFrame);
  assert.equal(processed, true);
  assert.equal(adFrame.getAttribute('sandbox'), 'allow-scripts allow-same-origin');
  assert.equal(adFrame.hasAttribute('sandbox'), true);
  assert.equal(engine.stats.blocked, 1);
  assert.equal(engine.stats.sandboxed, 1);
});

runTest('8. Engine remove action detaches ad iframe from DOM', () => {
  const engine = new IframeShieldEngine({ action: 'remove' });
  const parent = new MockElement('div');
  const adFrame = new MockIframe();
  adFrame.src = 'https://adsterra.com/tag.php';
  adFrame.parentNode = parent;

  engine.processIframe(adFrame);
  assert.equal(adFrame.parentNode, null);
  assert.equal(engine.stats.blocked, 1);
});

runTest('9. onBlocked callback receives event details', () => {
  let callbackFired = false;
  let receivedEvent = null;

  const engine = new IframeShieldEngine({
    action: 'sandbox',
    onBlocked: (event, iframe) => {
      callbackFired = true;
      receivedEvent = event;
    }
  });

  const adFrame = new MockIframe();
  adFrame.src = 'https://propellerads.com/zone?id=999';
  engine.processIframe(adFrame);

  assert.equal(callbackFired, true);
  assert.equal(receivedEvent.reason, 'known_ad_network');
  assert.equal(receivedEvent.matched, 'propellerads.com');
});

runTest('10. Dynamic whitelisting via trustedDomains prevents blocking', () => {
  const engine = new IframeShieldEngine({
    trustedDomains: ['custom-partner.com']
  });

  const partnerFrame = new MockIframe();
  partnerFrame.src = 'https://custom-partner.com/embed/widget';

  const processed = engine.processIframe(partnerFrame);
  assert.equal(processed, false);
  assert.equal(engine.stats.blocked, 0);
  assert.equal(partnerFrame.hasAttribute('sandbox'), false);
});

runTest('11. Clickjacking: Transparent overlay with high z-index is intercepted', () => {
  const overlayFrame = new MockIframe();
  overlayFrame.src = 'https://unknown-domain.com/click';
  overlayFrame.style = { opacity: '0.01', zIndex: '9999', position: 'fixed' };

  const res = classifyIframe(overlayFrame);
  assert.equal(res.isBlocked, true);
  assert.equal(res.reason, 'clickjacking_transparent_overlay');
});

runTest('12. SrcDoc: Embedded ad script payload inside srcdoc is intercepted', () => {
  const docFrame = new MockIframe();
  docFrame.setAttribute('srcdoc', '<html><body><script src="https://securepubads.g.doubleclick.net/tag.js"></script></body></html>');

  const res = classifyIframe(docFrame);
  assert.equal(res.isBlocked, true);
  assert.equal(res.reason, 'srcdoc_ad_script');
});

runTest('13. CSP Generator: generateCSP produces valid frame-src and frame-ancestors', () => {
  const csp = IframeShield.generateCSP(['my-partner.com']);
  assert.equal(csp.includes("frame-src 'self'"), true);
  assert.equal(csp.includes('https://challenges.cloudflare.com'), true);
  assert.equal(csp.includes('https://my-partner.com'), true);
  assert.equal(csp.includes("frame-ancestors 'self'"), true);
});

console.log(`\n========================================`);
console.log(`Results: ${passedTests}/${totalTests} tests passed.`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
