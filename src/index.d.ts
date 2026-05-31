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

export function createInlineEditBinding(field: InlineEditableField): InlineEditBinding;
export function createInlineEditPatch(input: CreateInlineEditPatchInput): InlineEditPatch;
export function getValueAtPath(data: unknown, path: string): unknown;
export function setValueAtPath<TData>(data: TData, path: string, value: unknown): TData;
export function normalizeInlineEditableField(
  field: WordVelFieldSchema | InlineEditableField,
  pathPrefix?: string,
): InlineEditableField;
export function isInlineEditableField(field: WordVelFieldSchema | InlineEditableField): boolean;

// ---------------------------------------------------------------------------
// Runtime API client (generic page/site fetching for any WordVel backend)
// ---------------------------------------------------------------------------

export interface WordVelFetchOptions {
  baseUrl: string;
  language?: string;
  headers?: Record<string, string>;
}

export interface WordVelPage {
  id: number;
  slug: string;
  title: string;
  status: string;
  blocks: Array<{ type: string; data: Record<string, unknown> }>;
  [key: string]: unknown;
}

export function fetchWordVelResource<T = unknown>(
  options: WordVelFetchOptions,
  path: string
): Promise<T>;

export function fetchPage(
  options: WordVelFetchOptions,
  slug: string
): Promise<WordVelPage>;

export function fetchSite<T = unknown>(options: WordVelFetchOptions): Promise<T>;

export function createWordVelClient(baseOptions: WordVelFetchOptions): {
  fetchPage: (slug: string, overrides?: Partial<WordVelFetchOptions>) => Promise<WordVelPage>;
  fetchSite: (overrides?: Partial<WordVelFetchOptions>) => Promise<unknown>;
  fetchResource: <T = unknown>(path: string, overrides?: Partial<WordVelFetchOptions>) => Promise<T>;
};

export function blockData(
  page: { blocks?: Array<{ type: string; data?: unknown }> } | null | undefined,
  type: string
): unknown;

export function mediaUrl(media: unknown): string;
export function mediaAlt(media: unknown, fallback?: string): string;
