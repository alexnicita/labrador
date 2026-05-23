# CI/CD

This document defines how Labrador keeps deployment fast and safe.

## Principles

- Every service MUST have a repeatable local check.
- Every deployable service SHOULD have CI before production use.
- CI MUST be fast enough that agents actually wait for it.
- Deployment configuration MUST live in the repo where possible.
- Secrets MUST live in platform secret stores, not git.

## Frontend

The frontend lives in `src/frontend` and deploys to Vercel.

Required local check:

```bash
cd src/frontend
npm run check
```

The check MUST include lint, typecheck, and production build.

## Backend

The realtime backend lives in `src/backend` and deploys to Railway.

Expected local check after initialization:

```bash
cd src/backend
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
```

Backend CI MUST be added once the Rust service is initialized.

## Deployment Discipline

Agents SHOULD verify:

- Git working tree state before committing.
- Local checks before push when practical.
- GitHub Actions after push.
- Platform deployment status after push.
- Public URL when user-facing UI changed.

## Deadline Rule

Fast does not mean skipping CI. Fast means CI is small, deterministic, and aligned with
the current service.

