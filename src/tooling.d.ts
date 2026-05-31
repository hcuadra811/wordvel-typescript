export * from './index.js';

import type {
  CreatePreviewArtifactInput,
  CssCollectionConfig,
  SyncPreviewArtifactConfig,
  SyncPreviewResult,
  WordVelBlockPreview,
  WordVelFieldSchema,
  WordVelManifest,
  WordVelPreviewArtifact,
  WordVelPreviewSyncConfig,
} from './index.js';

export function loadManifest(input: string | WordVelManifest): Promise<WordVelManifest>;
export function createPlaceholderProps(fields?: WordVelFieldSchema[]): Record<string, unknown>;
export function collectPreviewCss(config?: CssCollectionConfig): Promise<string>;
export function createPreviewArtifact(input: CreatePreviewArtifactInput): WordVelPreviewArtifact;
export function syncPreviewArtifact(config: SyncPreviewArtifactConfig): Promise<SyncPreviewResult>;
export function createWordVelPreview(config: WordVelPreviewSyncConfig): Promise<WordVelPreviewArtifact>;
export function syncWordVelPreview(config: WordVelPreviewSyncConfig): Promise<SyncPreviewResult>;
export function createPreviewPlaceholders(manifest: WordVelManifest): Record<string, Record<string, unknown>>;
