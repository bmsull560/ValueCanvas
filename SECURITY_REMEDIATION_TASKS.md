# Security Remediation Task List

## Scope
This plan tracks remediation work for the critical and high/medium issues identified in `SECURITY_AUDIT.md`. Tasks are prioritized by exploitability and business impact.

## Task Breakdown

### 1. Remove LLM secrets from the client bundle (Critical)
- **Goal:** Prevent exposure of OpenAI/Together API keys in browser builds.
- **Actions:**
  - Move all LLM calls from `src/services/AgentFabricService.ts` to a server or edge function layer.
  - Inject LLM credentials only on the server; remove `VITE_*` keys from client config and environment usage.
  - Add authenticated API route for LLM requests with usage logging and rate limiting.
  - Verify no other client code references these keys (search for `VITE_OPENAI_API_KEY` / `VITE_TOGETHER_API_KEY`).
- **Deliverables:** Backend proxy endpoints, updated frontend service calls, removed client-side secret references.

### 2. Sanitize HTML rendering to prevent XSS (High)
- **Goal:** Ensure all rendered HTML from documentation/narratives is sanitized.
- **Actions:**
  - Introduce a shared sanitizer utility (e.g., `src/utils/sanitizeHtml.ts`) using `DOMPurify` or an equivalent allowlist.
  - Update `src/views/DocumentationView.tsx` and `src/components/Components/NarrativeBlock.tsx` to sanitize content before calling `dangerouslySetInnerHTML`, or refactor to avoid raw HTML when possible.
  - Add unit tests covering malicious payloads (e.g., `<script>`, `onerror`, `javascript:` URLs) to verify sanitization.
  - Consider adding a strict Content Security Policy (CSP) in `index.html`/server headers to reduce XSS impact.
- **Deliverables:** Sanitization utility, updated rendering components, automated tests, optional CSP configuration.

### 3. Enforce server-side authentication and rate limiting (Medium)
- **Goal:** Prevent brute force and credential stuffing by moving throttling off the client.
- **Actions:**
  - Implement server-side login rate limiting (reverse proxy/WAF/edge functions) and ensure failures are logged centrally.
  - Keep the client `RateLimiter` only as a UX hint; primary enforcement must occur server-side.
  - Add monitoring/alerts on repeated auth failures.
- **Deliverables:** Deployed server-side rate limiter, updated auth flow documentation, logging/alerting configuration.

### 4. Require authenticated Supabase writes with RLS (Medium)
- **Goal:** Stop anonymous writes/mutations of workflow data.
- **Actions:**
  - Audit Supabase tables touched by `src/lib/agent-fabric/AgentFabric.ts` and enable restrictive RLS policies requiring a validated `user_id`.
  - Update client logic to reject operations without an authenticated user; remove the `anonymous-user` fallback.
  - Move high-risk write paths to Supabase edge functions or server endpoints that validate session claims.
  - Add tests exercising authorized vs unauthorized writes to prevent regressions.
- **Deliverables:** RLS policies, updated client/server write paths, regression tests.

### 5. Strengthen security logging and monitoring (Supporting)
- **Goal:** Improve detection of abuse across auth, LLM usage, and workflow mutations.
- **Actions:**
  - Centralize security logs for auth failures, LLM proxy usage, and Supabase write attempts (success/failure).
  - Define alert thresholds for anomalies (e.g., spikes in failed logins or LLM requests).
  - Document operational runbooks for responding to alerts.
- **Deliverables:** Logging pipelines, alert definitions, updated runbooks.

## Acceptance Criteria
- No LLM API keys present in client bundles; all LLM calls pass through authenticated server/edge routes.
- All HTML rendering paths sanitize or avoid untrusted HTML; tests cover common XSS payloads.
- Login rate limiting enforced server-side with observable logs.
- Supabase write operations require authenticated users and respect RLS; anonymous writes rejected.
- Security logging and alerting in place for auth, LLM, and data-write surfaces.
