# Emergency department PEWS

Status: source intake and preliminary assessment, 10 November 2026; component-separation proposal added 15 November 2026. No ED profile is implemented or clinically approved. The current digital chart remains based on the existing inpatient references. The architecture below is proposed for agreement, not a settled clinical contract.

## Authoritative sources and scope

The four public NHS England ED charts with GCS are stored alongside the original inpatient PDFs. The [source register](../reference-sources/README.md) records exact URLs, publication labels and SHA-256 hashes. NHS England identifies this GCS/neurological-assessment version as the default ED chart. Other variants are available through SPOT NHS Futures and must not be treated as interchangeable without review.

The new sources meet D16's requirement for evidence of distinct ED semantics, but do not establish that the existing inpatient algorithm can be reused unchanged. This work remains within the [component-only boundary](product-boundary.md): scoring and charting, not triage workflow, observation entry, record storage or operational escalation.

## Preliminary findings

Text was extracted from both pages of all four ED PDFs. Page 1 of the 5-to-12-year chart was also visually inspected. These findings are not a completed threshold-by-threshold comparison or clinical sign-off.

| Source evidence | Implication for the digital component |
| --- | --- |
| Page 1 distinguishes “Triage, assessment and initial observations” from “Ongoing observations”. In the inspected 5-to-12-year chart, initial and ongoing BP presentation differs. | Compare phase-specific scoring and display explicitly. Do not assume one ruleset with different time windows is sufficient. |
| All four charts retain a BP row and explicitly describe non-measurement codes: Not Attempted (No Concern), printed `NCO`, scores 0; Unsuccessful Attempt (No Concern), `U0`, scores 0; Unsuccessful Attempt (Concern), `U4`, scores 4; Not Attempted (Concern) scores 4, with no code printed in that list. | These charts do not simply omit BP. Verify the digital coding and phase applicability before implementing. Do not infer no concern from a missing value or invent a code for the fourth case. |
| Initial carer question asks about change since the decision to attend; the ongoing question asks about change since the previous assessment. | Preserve clinical meaning in host inputs and explanatory labels; do not infer the assessment phase from observation order. |
| Page 1 says “If V or less do GCS”; page 2 includes GCS components/total, pupils, limb movement and other neurological observations. | Define the supported display/data scope and escalation mapping from authoritative rules. Do not invent a GCS-to-PEWS conversion or assume the existing pupil model covers the whole neurological chart. |
| Page 2 includes ED escalation records and team-contact timings. | Trace applicable calculation/presentation rules, while leaving contact, acknowledgement and clinical-record workflows to the host. |

## Implementation sequence and acceptance gates

1. Obtain the current draft digital specification from SPOT NHS Futures through an authorised user. Record its version, date, source and any redistribution restrictions. Obtain additional chart variants only if they are within the agreed implementation scope.
2. Compare all four ED age bands, both assessment phases, scoring bands, oxygen/support rules, BP derogations, concern triggers, escalation thresholds and neurological requirements against the current canonical JSON and source specifications. Record page/section evidence and unresolved conflicts. Separately assess the newly published inpatient PDFs without replacing the existing baseline.
3. Agree an explicit clinical-profile and assessment-phase contract. Prefer shared age-band, plotting and scoring primitives with source-backed profile configuration over a copied ED renderer. Clinical profile selection is not a cosmetic presentation option and must not be inferred from missing BP, an ED location string or a short time window. Existing integrations must preserve inpatient behaviour.
4. Add independent source-derived expected results for every age band and applicable phase, covering threshold edges, all BP derogations, missing versus explicitly not measured values, oxygen devices, non-score triggers and ED-to-inpatient transitions. Missing input must not silently become a zero score.
5. Implement the bounded ED profile with synthetic demonstration scenarios, visible profile/phase identification and visual comparison against the corresponding NHS chart. Verify skip-line breaks, age transitions and inpatient regression behaviour.
6. Update requirements traceability and the safety file, particularly H-001 (incorrect score), H-003 (escalation), H-004 (misleading chart), H-006 (missing data) and H-009 (scope misunderstanding). Clinical review and the existing formal release gates remain required.

R53 remains open: the newly published BP derogations are evidence to resolve the ED policy question, not permission to rescale inpatient scores or silently score unavailable BP as normal. No canonical thresholds, colours, scorer behaviour or public API have changed during source intake.

## Proposed component boundary

Prefer **two explicit public components in this repository**, not a runtime variant switch on `<npews-chart>`:

| Boundary | Existing inpatient NPEWS | Proposed ED-PEWS |
| --- | --- | --- |
| Public element | `<npews-chart>` | `<ed-pews-chart>` |
| Native-module entry point | `chart/npews-chart.js` | `chart/ed-pews-chart.js` (proposed) |
| Clinical policy | Existing inpatient canonical JSON, scorer and escalation rules | Separate ED canonical JSON, scorer, phase-aware escalation and source references |
| Inputs | Existing patient/observation contract remains compatible | Explicit ED contract with assessment phase and ED-specific observation semantics |
| Output identity | Inpatient NPEWS | ED-PEWS, assessment phase and clinical-rule revision |
| Review evidence | Existing inpatient tests and reference charts | Separate source-derived ED fixtures and corresponding ED chart references |

These are names and boundaries for discussion, not files or APIs already implemented. Keep native ES modules, no runtime framework and no chart-source build step. A separate repository/package is not needed to achieve clinical separation; package exports can follow once distribution work is ready.

An ED component must not be a subclass or thin alias that invokes today's inpatient `render()` with different labels. `chart/chart.js` directly imports the inpatient config/scorer, keeps patient, observations and view state in module globals, and uses document-wide IDs. `npews-chart.js` also coordinates document-level styles/layout. Different custom-element names alone would not prevent policy, state or style leakage.

### What may be shared

- Pure calendar/age calculations, time-coordinate maths, axis/grid drawing and pointer handling, after evidence confirms equivalent semantics.
- Instance-scoped rendering infrastructure accepting an explicit component-owned policy and chart definition. It must not silently default an ED request to inpatient policy.
- Clinically reviewed common colour tokens or visual primitives only where the corresponding NHS references support equivalence; preserve existing inpatient colours.

Keep clinical thresholds, phase rules, BP interpretation, concern-question meaning, neurological rules, escalation mappings and clinical labels owned by their respective profiles. Shared mechanics do not imply shared clinical rules. ED must not import the inpatient scorer as its implicit policy, even where individual thresholds happen to agree.

Extract shared infrastructure incrementally under inpatient regression tests, rather than copying the full renderer or doing an unbounded framework rewrite. Scope DOM lookup, styles, event listeners, resize handling and view state to each instance. This overlaps R25-R27. Until isolation is evidenced, compare components in separate iframe documents; do not claim support for both in one document. Pure ED policy/fixture work can proceed independently of renderer extraction once R64 resolves its clinical inputs.

### Proposed input and result safeguards

- Component identity fixes the clinical profile; `.options` controls presentation only. Do not expose `variant: 'ed'` on `<npews-chart>` or infer ED from location, missing BP, observation order, age or time-window length.
- Require an explicit assessment phase on each ED observation, covering the source's initial and ongoing assessments. Final machine identifiers and phase-transition validation remain to be agreed. Do not assume the first supplied observation is triage: hosts may send only a partial history.
- Define an ED-specific schema/version discriminator and validate it at the ED boundary. Agree how incompatible ED-tagged data is rejected by the inpatient boundary without breaking existing valid inpatient integrations. Contract design must not promise runtime validation the current component does not yet provide.
- Represent measured BP, explicitly not measured BP, and absent/invalid data distinctly. Preserve attempted/not attempted and concern/no-concern meaning. The final coding contract must be source-backed; do not invent the unprinted fourth derogation code or treat generic missing data as a documented zero-scoring derogation.
- Define GCS components/total, AVPU, pupils and additional neurological observations according to the agreed scope and authoritative sources. Do not introduce a GCS-to-PEWS mapping without evidence. Decide explicitly whether the full page-2 neurological chart is required in the first ED component.
- Return or expose profile identity, clinical-rule/source revision, age band, phase, component scores, total completeness, escalation and reason provenance together. The precise result API is to be designed. Incomplete or unsupported data must not masquerade as a complete zero-score/normal result.
- Keep ED and inpatient observation streams and computed scores distinct. On transfer, the host selects the appropriate component and explicitly maps supported raw inputs while retaining provenance; it must not carry an ED-computed score into inpatient scoring, silently reclassify the whole history or draw one continuous trend across incompatible clinical profiles. Within ED, phase changes must remain visible and follow agreed source-backed plotting rules.

### Presentation and demonstration separation

Use explicit “ED-PEWS” and “Inpatient NPEWS” identities, not colour alone or the generic “PEWS” label as the only distinction. Show the current ED phase with its assessment and retain its identity when scrolling. Historical phase changes need visible identification. Match each profile's authoritative NHS reference; do not add arbitrary colours or change the existing chart palette to distinguish products.

Keep demonstration entry points and scenario registries separate, with distinct documentation navigation groups and iframe documents. Existing inpatient links and synthetic scenarios retain their behaviour. ED examples must be labelled synthetic and development-only, not clinically approved. A host must deliberately choose the component rather than an automatic environment-dependent switch.

## Proposed delivery slices

1. **Reconcile sources (R64, R53).** Obtain the authorised draft digital specification and create an evidence matrix across four age bands and two phases, including every scoring boundary, BP state, oxygen/support rule, non-score trigger, escalation rule and neurological requirement. Record source revision, page/section and unresolved conflicts. No threshold edits based solely on assumptions or visual similarity.
2. **Agree the boundary (R67).** Review the separate-element proposal, phase placement, input validation, neurological page scope, result identity and transfer behaviour. Specify examples and failure behaviour before freezing schemas. Clinical review must settle policy; architecture review cannot substitute for it.
3. **Establish independent clinical fixtures (R65).** Derive expected results from the reviewed sources, not from either scorer. Cover every age/phase, threshold edge, BP derogation, unknown/missing state, oxygen modality, non-score trigger and neurological case. Retain inpatient expectations unchanged; include birthdays and ED-to-inpatient transfer cases.
4. **Prove isolation and shared mechanics (R68, R25-R27).** Characterise existing inpatient rendering, extract an instance-scoped rendering seam only as needed, and test two instances, both component types, style isolation, data reassignment, disconnect/reconnect and listener cleanup. No clinical change should be hidden in this extraction.
5. **Implement ED policy and chart (R65).** Add separate canonical ED rules and generated artifacts, pure scoring functions, validation and an ED shell wired explicitly to its policy. Build initial/ongoing synthetic scenarios across all age bands. Validate both pages' agreed scope against the ED paper references and run all inpatient regressions.
6. **Review evidence and release deliberately (R65, R52).** Test keyboard/touch access, responsive layouts, skip-line breaks, phase and age transitions, component coexistence, unmistakable identity and fail-closed incomplete states. Update traceability and assess H-001/H-003/H-004/H-006/H-009 for wrong-profile/phase selection and cross-instance leakage. Clinical deployment remains subject to the existing safety gates; implementation or a development prerelease is not clinical approval.

The immediate next slice is the source comparison and agreement on component/neurological scope, not an ED runtime toggle. Access to the draft specification and clinical adjudication of conflicts are external dependencies; the public PDFs and this proposal do not resolve them.

## Documentation

Use [`docs/index.md`](../docs/index.md) as the reader-facing documentation entry point and `spec/` as the durable design record. Keep the source register in `reference-sources/`; do not duplicate clinical rules in the demo or documentation site. Roadmap R63-R68 track source intake, specification reconciliation, implementation, the Zensical site, boundary agreement and rendering isolation.
