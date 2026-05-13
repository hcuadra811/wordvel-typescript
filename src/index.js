import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

export async function createWordVelPreview(config) {
  const React = requireFromApp('react');
  const { renderToStaticMarkup } = requireFromApp('react-dom/server');
  const manifest = await readJson(config.manifest);
  const blocks = {};

  for (const schema of manifest.blocks ?? []) {
    const Component = config.blocks?.[schema.key];

    if (!Component) {
      continue;
    }

    blocks[schema.key] = {
      html: renderToStaticMarkup(React.createElement(Component, placeholderProps(schema.fields ?? []))),
    };
  }

  const documentCss = await readDocumentCss(config.document ?? config.html ?? './index.html');
  const css = config.css ? await readCss(config.css) : '';

  return {
    blocks,
    css: joinCss([documentCss, css]),
  };
}

export async function syncWordVelPreview(config) {
  const artifact = await createWordVelPreview(config);

  if (!config.endpoint) {
    return artifact;
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
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

function placeholderProps(fields, prefix = '') {
  return Object.fromEntries(fields.map((field) => [field.key, placeholderValue(field, prefix)]));
}

function placeholderValue(field, prefix) {
  if (field.type === 'repeater') {
    return Array.from({ length: 12 }, (_, index) => placeholderProps(field.fields ?? [], `${prefix}${field.key}.${index}.`));
  }

  if (field.type === 'image' || field.type === 'media') {
    return null;
  }

  if (field.type === 'icon') {
    return firstOptionKey(field.options?.icons) ?? '{{ icon }}';
  }

  return `{{ ${prefix}${field.key} }}`;
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
  return parts.filter((part) => part.trim() !== '').join('\n');
}
async function readJson(path) {
  return JSON.parse(await readFile(resolve(path), 'utf8'));
}

async function readCss(paths) {
  const cssPaths = Array.isArray(paths) ? paths : [paths];
  const files = await Promise.all(cssPaths.map((path) => readFile(resolve(path), 'utf8')));

  return files.join('\n');
}

function requireFromApp(packageName) {
  return createRequire(resolve(process.cwd(), 'package.json'))(packageName);
}
