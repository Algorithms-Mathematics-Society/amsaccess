# Downloads

Supported platforms:

- Windows
- macOS
- Linux

Each release should include:

- installer
- version number
- release notes
- checksum/signature
- changelog entry

The desktop shell is the primary product surface.

## Registering a reviewed release

The public GitHub latest-release feed controls which version and installers appear. Release-specific system requirements are stricter: `src/lib/release-requirements.ts` exposes them only for a release registered with its exact GitHub release ID and every published installer identity. Unknown versions remain downloadable through identity-bound links, but their requirements stay unconfirmed.

For each accepted release:

1. Refetch the published release and record its release ID, publication timestamp, source commit, and every installer asset ID, filename, byte size, GitHub `sha256:` digest, architecture, platform, and slot. Draft metadata is insufficient.
2. Independently download the installers and checksum manifests, then save the review evidence in `docs/release-integrity-<version>.json`.
3. Register the exact release and confirmed packaging facts in `src/lib/release-requirements.ts`. Do not reuse operating-system claims unless acceptance established them.
4. Extend `src/lib/release-requirements.test.mjs` from the independent record. Changed release IDs, installer identities, missing or extra slots, and unknown releases must fail closed.
5. Run `pnpm test` and `pnpm run build`, then verify `/api/releases/latest`, `/download`, and one identity-bound download per published artifact against the deployed site.

Publishing can make installers visible before their requirements are registered. That state is intentional: the site labels requirements unconfirmed instead of attaching old facts to new binaries.

## v4.0.0 release evidence

Release `420029337` was published on 22 October 2026 at 04:03:24 UTC from source `092897b5dd2e51d6ab32055e2a3a3c756b8d7054`. Its seven installer identities are unchanged from the independently downloaded candidate: byte sizes and SHA-256 hashes match the GitHub API and all four checksum manifests. The exact published identities are recorded in `docs/release-integrity-v4.0.0.json`.

The integrity record covers artifact identity and packaging. It does not certify physical camera behavior, every desktop environment, signing/notarization, backend capacity, or a future release. v4.0.1 must remain unregistered until its published assets are independently verified.
