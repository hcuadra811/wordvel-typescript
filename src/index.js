/**
 * @wordvel/typescript
 *
 * Browser-safe entry point.
 * Only contains runtime fetching and data helpers that work in the browser.
 *
 * For editor preview / sync tooling (Node.js only), import from:
 *   import { syncWordVelPreview } from '@wordvel/typescript/tooling';
 */

// Re-export only the safe runtime functionality
export * from './runtime.js';
