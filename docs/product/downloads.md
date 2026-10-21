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

After the v4.0.0 draft contains its final assets:

1. Inspect each final asset and record the GitHub release ID, asset ID, filename, byte size, GitHub `sha256:` digest, architecture, platform, and slot. Do not register draft assets or copy values from a build log.
2. Save the review evidence as `docs/release-integrity-v4.0.0.json`, following the v2.3.1 record. Tie it to the release tag, publication timestamp, source commit, and artifact hashes.
3. Add confirmed packaging facts to `packageRequirements` and one `reviewedReleases["v4.0.0"]` entry. List every installer slot exposed by the normalizer. Do not reuse v2.3.1 operating-system claims unless v4.0.0 acceptance established them.
4. Extend `src/lib/release-requirements.test.mjs` from the independent integrity record. Verify the exact release passes and changed release IDs, missing or extra slots, asset IDs, filenames, sizes, hashes, and architectures all fail closed.
5. Run `pnpm test` and `pnpm run build`, then verify `/api/releases/latest`, `/download`, and one identity-bound download per published artifact against the deployed site.

Publishing a GitHub release can make its installers visible before requirements are registered. That state is intentional: the site labels requirements unconfirmed instead of attaching old facts to new binaries.
