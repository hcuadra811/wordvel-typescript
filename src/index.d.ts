export type WordVelManifest = {
  blocks?: WordVelBlockSchema[];
  regions?: WordVelRegionSchema[];
  theme_options?: WordVelThemeOptionsSchema[];
};

export type WordVelBlockSchema = {
  key: string;
  name?: string;
  label?: string;
  fields?: WordVelFieldSchema[];
};

export type WordVelRegionSchema = {
  key: string;
  name?: string;
  label?: string;
  fields?: WordVelFieldSchema[];
};

export type WordVelThemeOptionsSchema = {
  key: string;
  name?: string;
  label?: string;
  fields?: WordVelFieldSchema[];
};

export type WordVelFieldSchema = {
  key: string;
  type: string;
  label?: string;
  required?: boolean;
  default?: unknown;
  options?: Record<string, unknown>;
  fields?: WordVelFieldSchema[];
  inline?: boolean | InlineEditableField;
};

export type WordVelPreviewArtifact = {
  blocks: Record<string, WordVelBlockPreview>;
  css: string;
};

export type WordVelBlockPreview = {
  html: string;
};

export type CssCollectionConfig = {
  css?: string | string[];
  document?: string | false;
  html?: string | false;
};

export type CreatePreviewArtifactInput = {
  blocks?: Record<string, string | WordVelBlockPreview>;
  renderedBlocks?: Record<string, string | WordVelBlockPreview>;
  css?: string;
};

export type SyncPreviewArtifactConfig = CreatePreviewArtifactInput & {
  artifact?: WordVelPreviewArtifact;
  endpoint?: string;
  headers?: Record<string, string>;
};

export type SyncPreviewResult =
  | WordVelPreviewArtifact
  | {
      artifact: WordVelPreviewArtifact;
      response: unknown;
    };

export type WordVelPreviewSyncConfig = CssCollectionConfig & {
  manifest: string | WordVelManifest;
  endpoint?: string;
  headers?: Record<string, string>;
  renderPreviewBlocks?: (input: {
    manifest: WordVelManifest;
    placeholders: Record<string, Record<string, unknown>>;
    config: WordVelPreviewSyncConfig;
  }) => Promise<Record<string, string | WordVelBlockPreview>> | Record<string, string | WordVelBlockPreview>;
};

export type InlineEditableKind = 'text' | 'richText' | 'url' | 'number' | 'boolean' | 'select';

export type InlineEditableField = {
  path: string;
  kind: InlineEditableKind;
  label?: string;
  required?: boolean;
};

export type InlineEditPatch = {
  blockClientId: string;
  path: string;
  value: unknown;
};

export type InlineEditBinding = {
  field: InlineEditableField;
  attributes: Record<string, string>;
};

export type CreateInlineEditPatchInput = InlineEditPatch;

export function loadManifest(input: string | WordVelManifest): Promise<WordVelManifest>;
export function createPlaceholderProps(fields?: WordVelFieldSchema[]): Record<string, unknown>;
export function collectPreviewCss(config?: CssCollectionConfig): Promise<string>;
export function createPreviewArtifact(input: CreatePreviewArtifactInput): WordVelPreviewArtifact;
export function syncPreviewArtifact(config: SyncPreviewArtifactConfig): Promise<SyncPreviewResult>;
export function createWordVelPreview(config: WordVelPreviewSyncConfig): Promise<WordVelPreviewArtifact>;
export function syncWordVelPreview(config: WordVelPreviewSyncConfig): Promise<SyncPreviewResult>;
export function createPreviewPlaceholders(manifest: WordVelManifest): Record<string, Record<string, unknown>>;
export function createInlineEditBinding(field: InlineEditableField): InlineEditBinding;
export function createInlineEditPatch(input: CreateInlineEditPatchInput): InlineEditPatch;
export function getValueAtPath(data: unknown, path: string): unknown;
export function setValueAtPath<TData>(data: TData, path: string, value: unknown): TData;
export function normalizeInlineEditableField(
  field: WordVelFieldSchema | InlineEditableField,
  pathPrefix?: string,
): InlineEditableField;
export function isInlineEditableField(field: WordVelFieldSchema | InlineEditableField): boolean;
