# OHTF Zensical branding bundle

This is a portable, pinned snapshot of the [official OHTF website](https://github.com/ohtf/openhealthtechnology.org-website), not a separately published theme package. `manifest.json` records the source commit, input hashes and imported-file hashes. The website remains the authority for the brand until OHTF establishes a dedicated shared-theme repository.

## What is shared

- `base.yml`: the website's modern variant, Inter/JetBrains Mono typography, mark/favicon, light/dark palettes, navigation behaviour, social links and generator setting. Only the main-site-specific `custom_dir` is removed and the mark's asset paths are relocated.
- `assets/ohtf.css`: the website's complete stylesheet, copied byte-for-byte, including Surgical Green and its exact tint scale. Landing/adviser selectors remain available for future sites but have no effect without those page classes.
- `assets/ohtf-mark.svg`: the official mark, copied byte-for-byte.
- `stage.mjs`: a dependency-free Node adapter that verifies the snapshot and copies its public assets into a site's documentation tree.

The imported branding/configuration is **CC-BY-SA-4.0**, attributed to Open Health Technology Foundation contributors. The adapter is **LGPL-3.0-or-later**, matching Digital PEWS code. Preserve the licence notices and provide the corresponding texts from `LICENSES/` when redistributing. This does not relicense project code, clinical reference material or existing documentation.

## Adopt in another project

Copy this directory (and the referenced licence texts) without modifying the imported files. Use Node 22+ and a compatible Zensical modern theme; this consumer is validated with Zensical 0.1.0. At build time, stage the assets:

```bash
node theme/ohtf/stage.mjs docs
```

In the project's root `mkdocs.yml`:

```yaml
INHERIT: theme/ohtf/base.yml
site_name: Project name
site_url: https://example.org/project/
extra_css:
  - ohtf/ohtf.css
  - stylesheets/project.css
```

Zensical merges inherited mappings but replaces lists. Retain `ohtf/ohtf.css` when adding project CSS. Keep project title, navigation, repository links, footer/legal/licensing statements and content in the consuming site. The main website's hero/adviser templates are content, not generic theme chrome, and are intentionally not imported. Consumers with different navigation structure may override navigation features while retaining the brand settings.

Digital PEWS calls `stageTheme()` from its documentation staging process. PEWS-specific iframe geometry lives only in `docs/stylesheets/extra.css`. No branding CSS is loaded inside the clinical chart iframe, and clinical band/escalation colours must never be overridden by a documentation theme.

## Refresh deliberately

```bash
s/sync-ohtf-theme /path/to/openhealthtechnology.org-website
s/sync-ohtf-theme --check /path/to/openhealthtechnology.org-website
```

The upstream checkout must have the official origin and clean branding/config files. The importer performs no network calls and changes only the vendored snapshot; review and commit its diff, then build and inspect both colour schemes at phone/tablet/desktop widths. A clean checkout/CI needs neither that sibling directory nor network access to obtain theme files. `verifyTheme()` rejects accidental local edits to imported files.

This directory is deliberately self-contained for later extraction into an OHTF-owned theme repository or package, once multiple sites adopt the contract. Do not introduce a mutable CDN dependency or publish a package/repository without maintainer approval. Moving to a central source should migrate the main website and project sites together, rather than silently create competing brand authorities.
