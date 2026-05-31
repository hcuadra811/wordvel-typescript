/**
 * Runtime WordVel API client helpers.
 *
 * These live in @wordvel/typescript so any framework (React, Vue, Svelte, vanilla)
 * can easily fetch pages and site data from a WordVel-powered Laravel API.
 *
 * All WordPress/WordVel API interaction should live here (or in thin re-exports).
 */

/**
 * Low-level helper to fetch any WordVel resource.
 * Handles the Laravel API-kit envelope `{ data: T }` and language headers.
 */
export async function fetchWordVelResource(options, path) {
  const base = (options && options.baseUrl ? options.baseUrl : '').replace(/\/$/, '');
  const cleanPath = (path || '').replace(/^\//, '');
  const url = base + '/' + cleanPath;

  const headers = {
    Accept: 'application/json',
    ...(options && options.headers ? options.headers : {}),
  };

  const lang = options && options.language;
  if (lang) {
    headers['Accept-Language'] = lang;
    headers['X-Wordvel-Language'] = lang;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const text = await response.text().catch(function () { return ''; });
    throw new Error(
      'WordVel API error ' + response.status + ' for ' + cleanPath + ': ' + (text || response.statusText)
    );
  }

  const payload = await response.json();

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

/**
 * Generic page fetcher.
 *
 * Usage:
 *   const page = await fetchPage({ baseUrl: 'http://...', language: 'es' }, 'home');
 */
export async function fetchPage(options, slug) {
  return fetchWordVelResource(options, 'pages/' + slug);
}

/**
 * Fetch site-level chrome (menus, theme options, etc.).
 *
 * Usage:
 *   const site = await fetchSite({ baseUrl: '...', language: 'en' });
 */
export async function fetchSite(options) {
  return fetchWordVelResource(options, 'site');
}

/**
 * Create a convenient client instance bound to a base configuration.
 *
 * const client = createWordVelClient({ baseUrl: '...', language: 'es' });
 * const page = await client.fetchPage('about');
 * const site = await client.fetchSite();
 */
export function createWordVelClient(baseOptions) {
  const base = baseOptions || {};
  return {
    fetchPage: function (slug, overrides) {
      return fetchPage(Object.assign({}, base, overrides || {}), slug);
    },
    fetchSite: function (overrides) {
      return fetchSite(Object.assign({}, base, overrides || {}));
    },
    fetchResource: function (path, overrides) {
      return fetchWordVelResource(Object.assign({}, base, overrides || {}), path);
    },
  };
}

/**
 * Find a block's data by its type (common helper for WordVel block arrays).
 */
export function blockData(page, type) {
  if (!page || !page.blocks) return null;
  var found = page.blocks.find(function (b) { return b && b.type === type; });
  return found ? found.data : null;
}

/**
 * Safely extract a media URL (handles string or { url } object).
 */
export function mediaUrl(media) {
  if (typeof media === 'string') return media;
  if (media && typeof media === 'object' && 'url' in media) {
    return media.url || '';
  }
  return '';
}

/**
 * Safely extract a media alt text.
 */
export function mediaAlt(media, fallback) {
  if (fallback === undefined) fallback = '';
  if (typeof media === 'string') return fallback;
  if (media && typeof media === 'object' && 'alt' in media) {
    return media.alt || fallback;
  }
  return fallback;
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
