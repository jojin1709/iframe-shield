/**
 * Express.js Middleware for iframe-shield
 * Developed by JOJIN JOHN
 *
 * Sets Content-Security-Policy (CSP) and X-Frame-Options headers on Node.js / Express servers.
 */

import { IframeShield } from 'iframe-shield';

/**
 * Express middleware that attaches anti-clickjacking and iframe security headers
 *
 * Usage:
 * ```javascript
 * import express from 'express';
 * import { iframeShieldMiddleware } from './express-middleware.js';
 *
 * const app = express();
 * app.use(iframeShieldMiddleware({
 *   customAllowedDomains: ['my-partner.com']
 * }));
 * ```
 */
export function iframeShieldMiddleware(options = {}) {
  const customDomains = options.customAllowedDomains || [];
  const cspHeaderValue = IframeShield.generateCSP(customDomains);

  return function(req, res, next) {
    // 1. Prevent external sites from framing your site (anti-clickjacking)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // 2. Strict Content Security Policy for allowed iframes
    res.setHeader('Content-Security-Policy', cspHeaderValue);

    next();
  };
}

export default iframeShieldMiddleware;
