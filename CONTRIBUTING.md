# Contributing to iframe-shield

Thank you for your interest in contributing to **iframe-shield**!

## How You Can Help

1. **Submitting New Ad Networks**: If you encounter a new ad network or tracking domain bypassing the shield, add it to `src/rules.js` under `DEFAULT_AD_DOMAINS` and submit a PR with a test case in `test/test.js`.
2. **Submitting Trusted Embeds**: If a legitimate payment, mapping, or audio/video provider is being incorrectly flagged, propose an addition to `DEFAULT_TRUSTED_DOMAINS`.
3. **Bug Fixes & Performance**: Optimizations to the DOM interception or classification logic.

## Development Workflow

1. Clone the repository:
   ```bash
   git clone https://github.com/jojin1709/iframe-shield.git
   cd iframe-shield
   ```
2. Run the test suite:
   ```bash
   npm test
   ```
3. Build distribution bundles:
   ```bash
   npm run build
   ```
4. Test locally in the browser:
   Open `demo/index.html` in your browser to verify changes visually.

## Code Standards
- Keep core code zero-dependency.
- Ensure all automated tests pass (`npm test`).
- Maintain TypeScript definitions in `types/index.d.ts` if modifying the public API.
