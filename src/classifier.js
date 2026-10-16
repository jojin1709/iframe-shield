import { DEFAULT_TRUSTED_DOMAINS, DEFAULT_AD_DOMAINS, AD_URL_PATTERNS, AD_DIMENSIONS } from './rules.js';

/**
 * Normalizes and extracts hostname/path info from a URL string or iframe
 */
export function parseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === 'about:blank' || trimmed.startsWith('javascript:')) {
    return { isSpecial: true, url: trimmed };
  }

  try {
    // Handle protocol-relative URLs
    const fullUrl = trimmed.startsWith('//') ? window.location.protocol + trimmed : trimmed;
    const parsed = new URL(fullUrl, window.location.href);
    return {
      hostname: parsed.hostname.toLowerCase(),
      pathname: parsed.pathname.toLowerCase(),
      href: parsed.href,
      fullUrl: fullUrl
    };
  } catch {
    return { hostname: '', pathname: '', href: rawUrl, fullUrl: rawUrl };
  }
}

/**
 * Checks if a hostname matches a list of domain patterns (supports subdomains)
 */
export function matchesDomainList(hostname, domainList) {
  if (!hostname || !Array.isArray(domainList)) return false;
  const cleanHost = hostname.toLowerCase();

  return domainList.some(domain => {
    const cleanDomain = domain.toLowerCase();
    // Check if domain includes path like "google.com/recaptcha"
    if (cleanDomain.includes('/')) {
      return false; // Handled separately if needed
    }
    return cleanHost === cleanDomain || cleanHost.endsWith('.' + cleanDomain);
  });
}

/**
 * Checks if an iframe matches standard IAB advertisement dimensions
 */
export function matchesAdDimensions(iframe) {
  if (!iframe) return false;
  
  const widthAttr = parseInt(iframe.getAttribute('width') || iframe.style.width || iframe.offsetWidth, 10);
  const heightAttr = parseInt(iframe.getAttribute('height') || iframe.style.height || iframe.offsetHeight, 10);

  if (isNaN(widthAttr) || isNaN(heightAttr)) return false;

  return AD_DIMENSIONS.some(dim => dim.width === widthAttr && dim.height === heightAttr);
}

/**
 * Checks if an iframe appears to be a zero-pixel or hidden tracking frame
 */
export function isHiddenTrackingFrame(iframe) {
  if (!iframe) return false;
  const w = parseInt(iframe.getAttribute('width') || iframe.style.width, 10);
  const h = parseInt(iframe.getAttribute('height') || iframe.style.height, 10);

  if ((w === 0 || w === 1) && (h === 0 || h === 1)) {
    return true;
  }
  return false;
}

/**
 * Checks if an iframe appears to be a clickjacking transparent overlay
 */
export function isClickjackingOverlay(iframe) {
  if (!iframe || !iframe.style) return false;
  const style = iframe.style;
  const opacity = parseFloat(style.opacity || iframe.getAttribute('opacity'));
  const zIndex = parseInt(style.zIndex, 10);
  const position = style.position;

  // Transparent iframe placed on top of content
  if (!isNaN(opacity) && opacity <= 0.05 && !isNaN(zIndex) && zIndex >= 100) {
    return true;
  }
  if ((position === 'fixed' || position === 'absolute') && opacity === 0) {
    return true;
  }
  return false;
}

/**
 * Checks if an iframe uses srcdoc to deliver known ad scripts
 */
export function matchesSrcDocAd(iframe, adDomains, adPatterns) {
  if (!iframe) return null;
  const srcdoc = iframe.getAttribute('srcdoc') || iframe.srcdoc;
  if (!srcdoc || typeof srcdoc !== 'string') return null;

  const lower = srcdoc.toLowerCase();
  for (const domain of adDomains) {
    if (lower.includes(domain.toLowerCase())) {
      return { matched: domain, reason: 'srcdoc_ad_script' };
    }
  }
  for (const pattern of adPatterns) {
    if (pattern.test(srcdoc)) {
      return { matched: pattern.toString(), reason: 'srcdoc_ad_pattern' };
    }
  }
  return null;
}

/**
 * Classifies an iframe element against configured rules
 */
export function classifyIframe(iframe, options = {}) {
  const trustedDomains = [...DEFAULT_TRUSTED_DOMAINS, ...(options.trustedDomains || [])];
  const adDomains = [...DEFAULT_AD_DOMAINS, ...(options.adDomains || [])];
  const customPatterns = options.adPatterns || [];
  const allPatterns = [...AD_URL_PATTERNS, ...customPatterns];

  // 0. Check for clickjacking transparent overlay
  if (options.blockClickjackingOverlays !== false && isClickjackingOverlay(iframe)) {
    return { isBlocked: true, isTrusted: false, reason: 'clickjacking_transparent_overlay' };
  }

  // 0b. Check for srcdoc injected ad script
  const srcDocAd = matchesSrcDocAd(iframe, adDomains, allPatterns);
  if (srcDocAd) {
    return { isBlocked: true, isTrusted: false, reason: srcDocAd.reason, matched: srcDocAd.matched };
  }

  const src = iframe.getAttribute('src') || iframe.src || iframe.dataset.src || '';
  const parsed = parseUrl(src);

  // If no source is set yet, it might be populated later
  if (!parsed) {
    return { isBlocked: false, isTrusted: false, reason: null };
  }

  // Same-origin check
  if (parsed.hostname && window.location.hostname && parsed.hostname === window.location.hostname.toLowerCase()) {
    return { isBlocked: false, isTrusted: true, reason: 'same_origin' };
  }

  // 1. Check if domain is trusted (YouTube, Stripe, reCAPTCHA, etc.)
  if (parsed.hostname && matchesDomainList(parsed.hostname, trustedDomains)) {
    return { isBlocked: false, isTrusted: true, reason: 'trusted_domain' };
  }

  // Check trusted domain with path (e.g., google.com/recaptcha)
  if (parsed.href) {
    const isTrustedPath = trustedDomains.some(t => t.includes('/') && parsed.href.toLowerCase().includes(t.toLowerCase()));
    if (isTrustedPath) {
      return { isBlocked: false, isTrusted: true, reason: 'trusted_path' };
    }
  }

  // 2. Check if domain matches known ad networks
  if (parsed.hostname && matchesDomainList(parsed.hostname, adDomains)) {
    return { isBlocked: true, isTrusted: false, reason: 'known_ad_network', matched: parsed.hostname };
  }

  // 3. Check if URL matches ad patterns
  if (parsed.fullUrl) {
    for (const pattern of allPatterns) {
      if (pattern.test(parsed.fullUrl)) {
        return { isBlocked: true, isTrusted: false, reason: 'ad_url_pattern', matched: pattern.toString() };
      }
    }
  }

  // 4. Check for hidden 0-pixel tracking iframe
  if (options.blockTrackingPixels !== false && isHiddenTrackingFrame(iframe)) {
    return { isBlocked: true, isTrusted: false, reason: 'hidden_tracking_iframe' };
  }

  // 5. Check ad banner standard dimensions (if option enabled)
  if (options.matchDimensions && matchesAdDimensions(iframe)) {
    return { isBlocked: true, isTrusted: false, reason: 'standard_ad_dimensions' };
  }

  // 6. Generic untrusted iframe handling
  // If sandboxUntrusted is enabled, sandbox any third-party iframe that wasn't in the whitelist
  if (options.sandboxUntrusted) {
    return { isBlocked: false, shouldSandbox: true, isTrusted: false, reason: 'untrusted_third_party' };
  }

  return { isBlocked: false, isTrusted: false, reason: null };
}
