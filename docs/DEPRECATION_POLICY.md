# Deprecation Policy

**Last Updated:** 2024-12-02

This policy documents how ValueCanvas versions and deprecates public APIs so integrators can plan upgrades with confidence.

## Versioning Strategy
- **Version identifier:** Header-based using `X-API-Version` (e.g., `2024-12-01`).
- **Defaults:** Requests without a header are routed to the current stable version published in `/docs/api`.
- **Compatibility:** Minor, backward-compatible changes are allowed within a version. Breaking changes require a new version identifier.
- **Discovery:** Each version is represented in `openapi.yaml` and surfaced through the `/docs/api` portal.

## Deprecation Windows
- **Notice period:** Minimum **6 months** between public deprecation announcement and removal.
- **Overlap:** At least **2 active versions** are maintained during deprecation windows.
- **Communication:** Deprecations are announced in `CHANGELOG.md`, release notes, and the `/docs/api` banner.

## Breaking Changes
Breaking changes include:
- Removing or renaming fields, endpoints, or headers.
- Changing request/response semantics.
- Introducing stricter validation that rejects previously valid payloads.

## Support Expectations
- **Sunset headers:** When applicable, responses include `Sunset` and `Deprecation` headers indicating the planned removal date.
- **Error signaling:** Deprecated endpoints MAY return `X-Deprecation-Info` with migration guidance.
- **Backporting:** Security fixes are backported to all supported versions; features are only added to the latest stable version.

## Release Notes Template
All PRs must include a Release Notes section describing API-impacting changes. The template lives at `.github/PULL_REQUEST_TEMPLATE.md`.

## Operational Checklist
- [ ] Announce the deprecation in `CHANGELOG.md`.
- [ ] Update `openapi.yaml` with the new `X-API-Version` value and status notes.
- [ ] Post release notes with migration steps and timelines.
- [ ] Monitor error budgets and rate-limit signals during the overlap period.
