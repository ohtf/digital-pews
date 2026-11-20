// SPDX-FileCopyrightText: 2026 The Royal College of Paediatrics and Child Health
// SPDX-License-Identifier: LGPL-3.0-or-later

import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prepareDocs, checkNavigation, isPublicReferenceSource } from '../../s/prepare-docs.mjs';
import { SCENARIOS } from '../../demo/scenarios.js';

const temporary = mkdtempSync(path.join(tmpdir(), 'pews-docs-'));
const { config, destination } = prepareDocs(path.join(temporary, '.docs-source'));
afterAll(() => rmSync(temporary, { recursive: true, force: true }));

describe('documentation staging', () => {
  it('includes the LinkedIn footer link without dropping the existing social links', () => {
    for (const link of ['https://github.com/ohtf', 'https://x.com/ohtfdotorg', 'https://bsky.app/profile/openhealthtech.bsky.social', 'https://www.linkedin.com/company/147007030', 'mailto:hello@openhealthtechnology.org']) {
      expect(config).toContain(`link: ${link}`);
    }
    expect(config).toContain('icon: fontawesome/brands/linkedin');
    expect(config).toContain('name: OHTF on LinkedIn');
  });

  it('includes every scenario exactly once with an isolated, deep-linked frame', () => {
    for (const scenario of SCENARIOS) {
      expect(config.split(`: demo/${scenario.id}.md`)).toHaveLength(2);
      const page = readFileSync(path.join(destination, `demo/${scenario.id}.md`), 'utf8');
      expect(page).toContain(`src="../_demo/demo.html?embed=1#${scenario.id}"`);
      expect(page).toContain('not approved for clinical use');
      expect(page).toContain('title=');
    }
  });

  it('has no missing or orphaned navigation pages', () => {
    expect(() => checkNavigation(config, destination)).not.toThrow();
    expect(() => checkNavigation(`${config}\n  - Missing: absent.md\n`, destination)).toThrow('Missing nav page');
    const orphan = path.join(destination, 'orphan.md');
    writeFileSync(orphan, '# Orphan');
    expect(() => checkNavigation(config, destination)).toThrow('Unlisted page');
    rmSync(orphan);
  });

  it('preserves source provenance and maps published links without copying rules', () => {
    const safety = readFileSync(path.join(destination, 'SAFETY.md'), 'utf8');
    expect(safety).toContain('edit_uri: SAFETY.md');
    expect(safety).toContain('](spec/product-boundary.md)');
    expect(safety).toContain('https://github.com/ohtf/digital-pews/blob/main/chart/');
  });

  it('does not publish private workspace files', () => {
    expect(config).not.toContain('.private');
    expect(readFileSync(path.join(destination, 'index.md'), 'utf8')).not.toContain('data:image/');
    expect(existsSync(path.join(destination, 'reference-sources/ed-pews'))).toBe(false);
  });

  it('excludes the restricted reference directory even when those files are absent in CI', () => {
    for (const file of ['alpha.pdf', 'clinical.xlsx', 'nested/ui.xlsx']) {
      expect(isPublicReferenceSource(path.join('reference-sources', 'ed-pews', file))).toBe(false);
    }
    expect(isPublicReferenceSource(path.join('reference-sources', 'ed-pews'))).toBe(false);
    for (const file of ['README.md', 'emergency-department-npews-chart-5-12-years-GCS.pdf', 'images/chart-5-12-years-1.png']) {
      expect(isPublicReferenceSource(path.join('reference-sources', file))).toBe(true);
    }
  });

  it('stages one shared hero image for the landing page and project overview', () => {
    const image = readFileSync(path.join(destination, 'img/inpatient-chart.png'));
    expect(image.equals(readFileSync(new URL('../../docs/img/inpatient-chart.png', import.meta.url)))).toBe(true);
    for (const file of ['index.md', 'project.md']) {
      const page = readFileSync(path.join(destination, file), 'utf8');
      expect(page).toContain('](img/inpatient-chart.png)');
      expect(page).toContain('Inpatient NPEWS prototype with synthetic data. Not approved for clinical use.');
      expect(page).not.toContain('.private/');
    }
  });
});
