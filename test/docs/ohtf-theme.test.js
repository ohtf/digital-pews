// SPDX-FileCopyrightText: 2026 Open Health Technology Foundation contributors
// SPDX-License-Identifier: LGPL-3.0-or-later

import { afterAll, describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyTheme, stageTheme } from '../../theme/ohtf/stage.mjs';
import { configurationBlock, sharedConfiguration } from '../../s/sync-ohtf-theme.mjs';

const temporary = mkdtempSync(path.join(tmpdir(), 'pews-theme-'));
afterAll(() => rmSync(temporary, { recursive: true, force: true }));
const bundle = new URL('../../theme/ohtf/', import.meta.url);
const read = file => readFileSync(new URL(file, bundle), 'utf8');

describe('portable OHTF branding', () => {
  it('verifies every imported asset and records its upstream provenance', () => {
    const manifest = verifyTheme();
    expect(manifest.sourceRepository).toBe('https://github.com/ohtf/openhealthtechnology.org-website');
    expect(manifest.license).toBe('CC-BY-SA-4.0');
    expect(manifest.sourceFiles['docs/stylesheets/extra.css']).toBe(manifest.files['assets/ohtf.css']);
    expect(manifest.sourceFiles['docs/assets/ohtf-mark.svg']).toBe(manifest.files['assets/ohtf-mark.svg']);
    expect(manifest.sourceFiles['docs/assets/ohtf-avatar.svg']).toBe(manifest.files['assets/ohtf-avatar.svg']);
  });

  it('stages exact public assets without requiring a sibling checkout', () => {
    const docs = path.join(temporary, 'docs');
    stageTheme(docs);
    for (const file of ['ohtf.css', 'ohtf-mark.svg', 'ohtf-avatar.svg']) {
      expect(readFileSync(path.join(docs, 'ohtf', file), 'utf8')).toBe(read(`assets/${file}`));
    }
  });

  it.each(['base.yml', 'assets/ohtf.css', 'assets/ohtf-mark.svg', 'assets/ohtf-avatar.svg'])('rejects drift in %s', file => {
    const copy = path.join(temporary, file.replaceAll('/', '-'));
    cpSync(bundle, copy, { recursive: true });
    writeFileSync(path.join(copy, file), 'unreviewed change');
    expect(() => verifyTheme(copy)).toThrow(`OHTF theme drift: ${file}`);
  });

  it('rejects unknown manifest versions and file inventories', () => {
    const copy = path.join(temporary, 'invalid-manifest');
    cpSync(bundle, copy, { recursive: true });
    const manifest = JSON.parse(read('manifest.json'));
    for (const invalid of [{ ...manifest, schemaVersion: 2 }, { ...manifest, files: { '../outside.css': 'bad' } }]) {
      writeFileSync(path.join(copy, 'manifest.json'), JSON.stringify(invalid));
      expect(() => verifyTheme(copy)).toThrow('Unsupported OHTF theme manifest');
    }
  });

  it('keeps shared theme configuration apart from project content', () => {
    const upstream = `site_name: Main website\ntheme:\n  variant: modern\n  custom_dir: overrides\n  logo: assets/ohtf-mark.svg\n  favicon: assets/ohtf-mark.svg\n  font:\n    text: Inter\n  features:\n    - navigation.instant\n\nextra:\n  generator: false\n\nnav:\n  - Main: index.md\n`;
    const shared = sharedConfiguration(upstream);
    expect(shared).toContain('logo: ohtf/ohtf-mark.svg');
    expect(shared).toContain('favicon: ohtf/ohtf-mark.svg');
    expect(shared).toContain('    text: Inter');
    expect(shared).toContain('    - navigation.instant');
    expect(shared).toContain('  generator: false');
    expect(shared).not.toMatch(/custom_dir|site_name|^nav:/m);
    expect(() => sharedConfiguration(upstream.replace('variant: modern', 'variant: classic'))).toThrow('Review');
    expect(() => configurationBlock('site_name: Missing\n', 'theme')).toThrow('Missing upstream theme');
  });

  it('retains the last configuration value without a trailing newline', () => {
    expect(configurationBlock('extra:\n  generator: false', 'extra')).toBe('extra:\n  generator: false');
  });

  it('uses the current official avatar for branding and the demo', () => {
    expect(read('base.yml')).toContain('logo: ohtf/ohtf-avatar.svg');
    expect(read('base.yml')).toContain('favicon: ohtf/ohtf-avatar.svg');
    expect(readFileSync(new URL('../../demo/assets/ohtf-avatar.svg', import.meta.url), 'utf8')).toBe(read('assets/ohtf-avatar.svg'));
    const demo = readFileSync(new URL('../../demo/demo.html', import.meta.url), 'utf8');
    expect(demo).toContain('src="assets/ohtf-avatar.svg"');
    expect(demo).toContain('alt="Open Health Technology Foundation"');
    const upstream = 'theme:\n  variant: modern\n  logo: assets/ohtf-avatar.svg\n  favicon: assets/ohtf-avatar.svg\nextra:\n  generator: false\n';
    expect(sharedConfiguration(upstream)).toContain('logo: ohtf/ohtf-avatar.svg');
  });

  it('loads branding only in the documentation host, never in chart frames', () => {
    const config = readFileSync(new URL('../../mkdocs.yml', import.meta.url), 'utf8');
    expect(config).toContain('INHERIT: theme/ohtf/base.yml');
    expect(config).toMatch(/extra_css:\n  - ohtf\/ohtf.css\n  - stylesheets\/extra.css/);
    for (const file of ['../../demo/demo.html', '../../demo/index.html', '../../chart/styles.css']) {
      expect(readFileSync(new URL(file, import.meta.url), 'utf8')).not.toContain('ohtf.css');
    }
    const css = readFileSync(new URL('../../docs/stylesheets/extra.css', import.meta.url), 'utf8');
    expect(css).toContain('body:has(.pews-demo) .md-grid');
    expect(css).not.toMatch(/--band-|--esc-|--md-primary|#[a-f\d]{3,8}\b/i);
  });
});
