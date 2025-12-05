# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Track rollout of `/docs/api` as the canonical interactive reference.
- Expand tenant-aware examples across the OpenAPI specification.

## [1.2.0] - 2025-12-04
### Added
- Interactive API reference at `/docs/api` backed by the maintained `openapi.yaml`.
- Tenant-aware cURL snippets, authentication guidance, and 401/403/429 coverage for every endpoint in the OpenAPI document.
- Deprecation and versioning policy documentation for predictable change management.

### Changed
- Elevated API version metadata to `1.2.0` to reflect the documentation and lifecycle updates.

## [1.1.0] - 2024-11-15
### Added
- Prompt version activation and circuit breaker health telemetry endpoints.
- Documentation index refresh to align with SDUI and billing feature sets.

### Fixed
- Hardened request auditing and session timeout middleware on public routers.

## [1.0.0] - 2024-10-01
### Added
- Initial stable release of the ValueCanvas platform and OpenAPI contract.
- Canvas generation, refinement, and prompt management endpoints with bearer authentication.
