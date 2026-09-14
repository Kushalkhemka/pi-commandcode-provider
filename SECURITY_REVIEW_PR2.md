# PR 2 security review

Reviewed GitHub Advanced Security comments against the routing implementation.
This is a review of the reported paths, not an exhaustive security audit.

## Changes

- Router destinations require HTTPS, except literal loopback HTTP for local development. Embedded credentials, URL queries and fragments are rejected. The default is `https://cc.opensec.in`; a different trusted router requires explicit local configuration.
- Lease and usage uploads reject redirects. Lease failures expose only the HTTP status, not remote bodies that might echo credentials.
- Lease fetching accepts an injected transport. Tests exercise destination validation, redirect settings and error redaction.
- The shutdown timer now uses an explicit function callback. The original `setTimeout(resolve, 1500)` also received a function and was not string evaluation.
- Semgrep recognizes the documented OpenSec router variables and existing quota-board configuration prefix. Two existing dashboard/provider fetch helpers have narrowly scoped, explained suppressions after checking their callers and fixed origins. Other rules remain enabled across the repository.

## CodeQL dispositions

Alerts 31 and 32 (`js/insufficient-password-hash`) identify SHA-256 values used only as in-memory cache indexes for bearer tokens. They are not persisted password verifiers, nor used to authenticate callers. Adding password-stretching work to each cache lookup would not improve this boundary.

Alert 17 is the existing truncated SHA-256 display/account-matching fingerprint in generic quota-board telemetry. It is not a password verifier or authorization mechanism. It must not be treated as a cryptographically unique identity; member lease telemetry instead uses authenticated lease ownership and event IDs.

Alert 33 (`js/file-access-to-http`) follows a selected credential from Pi's local credential storage into the router's Authorization header. This is intentional authentication, not uploading an auth file or unrelated local content. The control-plane payload contains session/model/rotation metadata; usage uploads contain counters, not prompts or model output. Destination validation and redirect rejection further constrain this flow.

## Validation and scope

The full Pi test suite passes, including real Pi against mock endpoints. All-file formatting and the 14-rule Semgrep scan pass after resolving baseline formatting. Oh My Pi checks and their dedicated fixtures were removed at the user's request; CI still tests Pi and runs CodeQL, Semgrep, secrets and dependency checks.

No npm version is published and no running Pi installation is updated by this PR.
