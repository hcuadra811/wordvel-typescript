import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export async function loadManifest(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return JSON.parse(await readFile(resolve(input), 'utf8'));
}

export function createPlaceholderProps(fields = []) {
  return Object.fromEntries(fields.map((field) => [field.key, placeholderValue(field, '')]));
}

export async function collectPreviewCss(config = {}) {
  const documentPath = config.document ?? config.html ?? './index.html';
  const documentCss = documentPath === false ? '' : await readDocumentCss(documentPath);
  const explicitCss = config.css ? await readCss(config.css) : '';

  return joinCss([documentCss, explicitCss]);
}

export function createPreviewArtifact(input) {
  return {
    blocks: normalizePreviewBlocks(input.blocks ?? input.renderedBlocks ?? {}),
    css: input.css ?? '',
  };
}

export async function syncPreviewArtifact(config) {
  const artifact = config.artifact ?? createPreviewArtifact(config);

  if (!config.endpoint) {
    return artifact;
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(config.headers ?? {}),
    },
    body: JSON.stringify(artifact),
  });

  if (!response.ok) {
    throw new Error(`WordVel preview sync failed with HTTP ${response.status}: ${await response.text()}`);
  }

  return {
    artifact,
    response: await response.json(),
  };
}

export async function createWordVelPreview(config) {
  const manifest = await loadManifest(config.manifest);
  const css = await collectPreviewCss(config);
  const placeholders = createPreviewPlaceholders(manifest);

  if (typeof config.renderPreviewBlocks !== 'function') {
    throw new Error(
      'wordvel-typescript sync now expects config.renderPreviewBlocks. Use @wordvel/react for React component configs.',
    );
  }

  const renderedBlocks = await config.renderPreviewBlocks({ manifest, placeholders, config });

  return createPreviewArtifact({
    blocks: renderedBlocks,
    css,
  });
}

export async function syncWordVelPreview(config) {
  const artifact = await createWordVelPreview(config);

  return syncPreviewArtifact({
    artifact,
    endpoint: config.endpoint,
    headers: config.headers,
  });
}

export function createPreviewPlaceholders(manifest) {
  return Object.fromEntries(
    (manifest.blocks ?? []).map((schema) => [schema.key, createPlaceholderProps(schema.fields ?? [])]),
  );
}

export function createInlineEditBinding(field) {
  const kind = normalizeInlineEditKind(field.kind ?? field.type);

  return {
    field: {
      path: field.path,
      kind,
      label: field.label,
      required: Boolean(field.required),
    },
    attributes: {
      'data-wordvel-inline-field': field.path,
      'data-wordvel-inline-kind': kind,
    },
  };
}

export function createInlineEditPatch(input) {
  if (!input.blockClientId) {
    throw new Error('Inline edit patches require a blockClientId.');
  }

  if (!input.path) {
    throw new Error('Inline edit patches require a field path.');
  }

  return {
    blockClientId: input.blockClientId,
    path: input.path,
    value: input.value,
  };
}

export function getValueAtPath(data, path) {
  return pathSegments(path).reduce((value, segment) => {
    if (value == null) {
      return undefined;
    }

    return value[segment];
  }, data);
}

export function setValueAtPath(data, path, value) {
  const segments = pathSegments(path);

  if (segments.length === 0) {
    return value;
  }

  return setAtSegment(data, segments, value);
}

export function normalizeInlineEditableField(field, pathPrefix = '') {
  const path = [pathPrefix, field.path ?? field.key].filter(Boolean).join('.');

  return {
    path,
    kind: normalizeInlineEditKind(field.kind ?? field.type),
    label: field.label,
    required: Boolean(field.required),
  };
}

export function isInlineEditableField(field) {
  try {
    normalizeInlineEditKind(field.kind ?? field.type);
    return Boolean(field.path ?? field.key);
  } catch {
    return false;
  }
}

function placeholderValue(field, prefix) {
  if (field.default !== undefined && field.default !== null) {
    return field.default;
  }

  if (field.type === 'repeater') {
    const itemCount = field.preview_items || field.previewItems || field.options?.preview_items || field.options?.previewItems || 8;

    return Array.from({ length: itemCount }, (_, index) =>
      Object.fromEntries(
        (field.fields ?? []).map((nestedField) => [
          nestedField.key,
          placeholderValue(nestedField, `${prefix}${field.key}.${index}.`),
        ]),
      ),
    );
  }

  if (field.type === 'group' || field.type === 'object') {
    return createNestedPlaceholderProps(field.fields ?? [], `${prefix}${field.key}.`);
  }

  if (field.type === 'localized_text') {
    return `{{ ${prefix}${field.key} }}`;
  }

  if (field.type === 'image' || field.type === 'media') {
    return {
      id: '',
      url: `{{ ${prefix}${field.key}.url }}`,
      alt: `{{ ${prefix}${field.key}.alt }}`,
      width: '',
      height: '',
    };
  }

  if (field.type === 'number') {
    return 0;
  }

  if (field.type === 'boolean' || field.type === 'toggle') {
    return false;
  }

  if (field.type === 'select') {
    return firstOptionKey(field.options?.choices ?? field.options) ?? `{{ ${prefix}${field.key} }}`;
  }

  if (field.type === 'url' || field.type === 'link') {
    return '#';
  }

  if (field.type === 'icon') {
    return firstOptionKey(field.options?.icons ?? field.options) ?? '{{ icon }}';
  }

  return `{{ ${prefix}${field.key} }}`;
}

function createNestedPlaceholderProps(fields, prefix) {
  return Object.fromEntries(fields.map((field) => [field.key, placeholderValue(field, prefix)]));
}

function normalizePreviewBlocks(blocks) {
  return Object.fromEntries(
    Object.entries(blocks).map(([key, value]) => [
      key,
      typeof value === 'string'
        ? {
            html: value,
          }
        : value,
    ]),
  );
}

function firstOptionKey(options) {
  if (!options || typeof options !== 'object') {
    return null;
  }

  return Object.keys(options)[0] ?? null;
}

async function readDocumentCss(path) {
  let html;

  try {
    html = await readFile(resolve(path), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return '';
    }

    throw error;
  }

  const stylesheetLinks = extractStylesheetLinks(html);
  const stylesheets = await Promise.all(stylesheetLinks.map((link) => readLinkedStylesheet(link, path)));

  return joinCss(stylesheets);
}

function extractStylesheetLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => ({ rel: readHtmlAttribute(tag, 'rel'), href: readHtmlAttribute(tag, 'href') }))
    .filter((link) => link.href && link.rel?.split(/\s+/).includes('stylesheet'))
    .map((link) => link.href);
}

async function readLinkedStylesheet(href, documentPath) {
  if (isRemoteUrl(href)) {
    try {
      const response = await fetch(href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 Chrome/124 Safari/537.36',
        },
      });

      if (response.ok) {
        return await response.text();
      }
    } catch {
      // Fall back to @import if the stylesheet cannot be resolved during sync.
    }

    return `@import url("${escapeCssString(href)}");`;
  }

  try {
    return await readFile(resolve(dirname(documentPath), href.replace(/^\//, '')), 'utf8');
  } catch {
    return `@import url("${escapeCssString(href)}");`;
  }
}

function isRemoteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function readHtmlAttribute(tag, name) {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, 'i');

  return tag.match(pattern)?.[1] ?? null;
}

function escapeCssString(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function joinCss(parts) {
  return parts.filter((part) => typeof part === 'string' && part.trim() !== '').join('\n');
}

async function readCss(paths) {
  const cssPaths = Array.isArray(paths) ? paths : [paths];
  const files = await Promise.all(cssPaths.map((path) => readFile(resolve(path), 'utf8')));

  return files.join('\n');
}

function normalizeInlineEditKind(kind) {
  const normalizedKinds = {
    text: 'text',
    string: 'text',
    textarea: 'text',
    rich_text: 'richText',
    richText: 'richText',
    wysiwyg: 'richText',
    url: 'url',
    link: 'url',
    number: 'number',
    boolean: 'boolean',
    toggle: 'boolean',
    select: 'select',
  };

  const normalized = normalizedKinds[kind];

  if (!normalized) {
    throw new Error(`Unsupported inline editable field kind: ${kind}`);
  }

  return normalized;
}

function pathSegments(path) {
  if (typeof path !== 'string' || path.trim() === '') {
    return [];
  }

  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean)
    .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));
}

function setAtSegment(data, segments, value) {
  const [segment, ...rest] = segments;
  const next = Array.isArray(data)
    ? [...data]
    : data == null && typeof segment === 'number'
      ? []
      : { ...(data ?? {}) };

  if (rest.length === 0) {
    next[segment] = value;
    return next;
  }

  next[segment] = setAtSegment(next[segment], rest, value);

  return next;
}
