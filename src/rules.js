/**
 * Default rules and patterns for iframe ad detection and whitelisting
 */

export const DEFAULT_TRUSTED_DOMAINS = [
  // Video & Audio Embeds
  'youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'twitch.tv',
  'player.twitch.tv',
  'spotify.com',
  'soundcloud.com',
  'dailymotion.com',

  // Payment & Security Providers
  'js.stripe.com',
  'hooks.stripe.com',
  'checkout.stripe.com',
  'paypal.com',
  'sandbox.paypal.com',
  'google.com/recaptcha',
  'recaptcha.net',
  'challenges.cloudflare.com',
  'hcaptcha.com',

  // Maps & Forms & Common Tools
  'maps.google.com',
  'google.com/maps',
  'docs.google.com',
  'typeform.com',
  'codepen.io',
  'codesandbox.io',
  'figma.com'
];

export const DEFAULT_AD_DOMAINS = [
  // Common Ad Networks & Exchanges
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adservice.google.com',
  'adnxs.com',
  'rubiconproject.com',
  'criteo.com',
  'criteo.net',
  'openx.net',
  'pubmatic.com',
  'taboola.com',
  'outbrain.com',
  'popads.net',
  'popcash.net',
  'propellerads.com',
  'adsterra.com',
  'exoclick.com',
  'juicyads.com',
  'trafficjunky.com',
  'revcontent.com',
  'media.net',
  'yieldmo.com',
  'smartadserver.com',
  'adform.net',
  'amazon-adsystem.com',
  'adroll.com',
  'infolinks.com',
  'bidvertiser.com',
  'mgid.com',
  'zergnet.com'
];

export const AD_URL_PATTERNS = [
  /\/ads?\//i,
  /\/adserver\//i,
  /\/banner\//i,
  /\/popunder/i,
  /\/interstitial/i,
  /[?&#]ad_type=/i,
  /[?&#]clicktag=/i,
  /[?&#]advertiser=/i,
  /\/affiliate_frame/i,
  /\/sponsor_frame/i
];

export const AD_DIMENSIONS = [
  { width: 300, height: 250 }, // Medium Rectangle
  { width: 728, height: 90 },  // Leaderboard
  { width: 160, height: 600 }, // Wide Skyscraper
  { width: 300, height: 600 }, // Half Page
  { width: 320, height: 50 },  // Mobile Leaderboard
  { width: 320, height: 100 }, // Large Mobile Banner
  { width: 468, height: 60 },  // Banner
  { width: 120, height: 600 }, // Skyscraper
  { width: 970, height: 90 },  // Large Leaderboard
  { width: 970, height: 250 }  // Billboard
];
