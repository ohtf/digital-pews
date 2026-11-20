// SPDX-FileCopyrightText: 2026 Open Health Technology Foundation contributors
// SPDX-License-Identifier: LGPL-3.0-or-later
// Portable branding adapter: no project data, runtime dependencies or network.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const sha256 = data => createHash('sha256').update(data).digest('hex');

export function verifyTheme(root = ROOT) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  const expected = ['assets/ohtf-avatar.svg', 'assets/ohtf-mark.svg', 'assets/ohtf.css', 'base.yml'];
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{40}$/.test(manifest.sourceRevision) ||
      JSON.stringify(Object.keys(manifest.files).sort()) !== JSON.stringify(expected)) {
    throw new Error('Unsupported OHTF theme manifest');
  }
  for (const [file, expectedHash] of Object.entries(manifest.files)) {
    if (sha256(readFileSync(path.join(root, file))) !== expectedHash) {
      throw new Error(`OHTF theme drift: ${file}. Refresh from the canonical website rather than editing the snapshot.`);
    }
  }
  return manifest;
}

export function stageTheme(docsDirectory, root = ROOT) {
  verifyTheme(root);
  const output = path.join(docsDirectory, 'ohtf');
  mkdirSync(output, { recursive: true });
  for (const file of ['ohtf.css', 'ohtf-mark.svg', 'ohtf-avatar.svg']) {
    writeFileSync(path.join(output, file), readFileSync(path.join(root, 'assets', file)));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node theme/ohtf/stage.mjs /path/to/docs-directory');
  stageTheme(path.resolve(process.argv[2]));
}
