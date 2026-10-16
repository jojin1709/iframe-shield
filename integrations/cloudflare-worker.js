/**
 * Cloudflare Worker Integration for iframe-shield
 * Developed by JOJIN JOHN
 *
 * This worker runs on Cloudflare's Edge to:
 * 1. Inject iframe-shield directly into the HTML <head> of outgoing responses.
 * 2. Attach strict Content-Security-Policy (CSP) headers to block unauthorized iframes.
 * 3. Enforce X-Frame-Options: SAMEORIGIN to prevent clickjacking of your site.
 */

export default {
  async fetch(request, env, ctx) {
    // Forward request to origin
    const response = await fetch(request);

    // Only modify HTML responses
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return response;
    }

    // HTML Rewriter to inject iframe-shield SDK into <head>
    const rewriter = new HTMLRewriter().on('head', {
      element(element) {
        element.append(
          `\n<!-- Injected by Cloudflare Edge Worker via iframe-shield (Developed by JOJIN JOHN) -->\n` +
          `<script src="https://cdn.jsdelivr.net/npm/iframe-shield/dist/iframe-shield.min.js"></script>\n`,
          { html: true }
        );
      }
    });

    const transformedResponse = rewriter.transform(response);

    // Clone headers to attach security directives
    const newHeaders = new Headers(transformedResponse.headers);

    // 1. Anti-Clickjacking: Only allow your domain to frame itself
    if (!newHeaders.has('X-Frame-Options')) {
      newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    }

    // 2. Strict Content Security Policy for allowed iframes
    const csp = [
      "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://js.stripe.com https://challenges.cloudflare.com https://recaptcha.net https://maps.google.com;",
      "frame-ancestors 'self';"
    ].join(' ');

    if (!newHeaders.has('Content-Security-Policy')) {
      newHeaders.set('Content-Security-Policy', csp);
    }

    return new Response(transformedResponse.body, {
      status: transformedResponse.status,
      statusText: transformedResponse.statusText,
      headers: newHeaders
    });
  }
};
