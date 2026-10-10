# Download, integrity, requirements and release alignment

Reviewed 10 October 2026. Internal implementation evidence; not public page content.

## Implemented behavior

Every website installer link binds the displayed version, release ID, asset ID, exact filename, byte size, architecture and published SHA-256. The public download resolver fetches fresh metadata and requires an exact match before redirecting. A newer release, recreated release or changed asset produces a clear refresh-required response instead of silently selecting another binary. It does not fetch arbitrary historical tags or establish a policy that all assessments must use the newest release.

Malformed, duplicate or partial selectors fail before an upstream fetch. Missing release metadata fails unavailable. Both page refreshes and download resolution share the existing public-read rate limit. Fresh refreshes skip the metadata request when limited. Redirects and error responses use no-store.

The metadata parser accepts only uploaded assets with positive integer IDs/sizes, safe filenames, and exact trusted repository/tag/filename URLs. SHA-256 values must have the expected format; absent/invalid values are explicitly unavailable. Raw release names/bodies and repository links are not rendered on public pages.

Each installer has collapsed file details containing version, filename, exact byte size, published hash, copy feedback and a platform-specific verification command. Copy denial offers manual selection. A checksum comparison checks bytes; it is not a publisher signature or malware assurance. The upstream publisher could replace an asset after redirect validation, so users still need to compare the downloaded file with the displayed checksum.

Requirements are shared across downloads, product and documentation and keyed to the reviewed release. Unknown releases receive a clear unconfirmed-requirements state instead of inheriting old minimums. Installer architecture/package matching is separate from a tested OS support commitment and the app’s actual readiness checks.

The release page now publishes a factual availability entry from the same current-release metadata. It includes version/date/packages and setup links, with no invented fixes or internal release notes. Its CTA says “View current downloads,” avoiding a version-specific promise through an unversioned destination.

## Artifact evidence

Release v2.3.1 was published 8 October 2026. Annotated tag object: 0ba0c584; resolved commit: 5b2b025ecec6c27079bcb10bd8363033e244eb1c.

An independent subagent downloaded all seven installers without executing them. Every computed SHA-256 matched both the exact filename’s published manifest entry and the release API digest. All byte sizes matched. Four checksum manifests were cross-checked.

Reproducible verification record: docs/release-integrity-v2.3.1.json. Downloaded binaries remain outside the repository in /tmp/access-release-integrity-audit/.

## Requirements evidence and limits

| Platform | Verified release facts | Remaining limits |
|---|---|---|
| Windows | x64 EXE/MSI; WebView2 bootstrapper can require internet | No approved tested Windows-version matrix; no native ARM64/32-bit installer in this release |
| macOS | Apple silicon and Intel DMG; package minimum macOS12 | Package minimum is not proof of every device/configuration; no universal DMG in this release |
| Linux | x86_64 DEB/RPM/AppImage; build runner Ubuntu22.04 | Build runner is not a supported-distro matrix; package format alone does not establish desktop/library compatibility |

Sources: desktop v2.3.1 tauri.conf.json, release workflow, Cargo.lock and pinned Tauri configuration. Windows install docs contain stale/contradictory elevation/version guidance and were not copied.

No minimum RAM/storage/resolution figures were invented. No code-signing or notarization badge is presented: workflow evidence is not independent validation of distributed signatures. The guide directs blocked installations to organizer/IT support and does not recommend disabling protections.

Still needed from product/release owners: approved OS/distro support matrix, per-artifact signature verification, and a supported policy for organizer-pinned older versions. These gaps are stated without blocking accurate current-release downloads.

## Review findings resolved

- Added refresh-page rate limiting before uncached metadata requests.
- Changed the changelog action to a version-neutral label.
- Put organizer-specified version guidance above downloads and into candidate setup.

Independent integrity and requirements/copy reviewers confirmed no remaining findings in their scopes.

## Validation

- Production build passed after review corrections.
- 36 release-integrity and recommendation unit tests passed, also rerun independently.
- 81 responsive browser assertions passed at320/390/768/1024/1440px: seven bound files, hash/copy behavior, overflow, requirement reuse and public release entry.
- 23 isolated production-server HTTP assertions passed: exact redirect, invalid/legacy links, changed/newer release, replaced assets, digest/architecture mismatch, upstream outage, no-store, shared rate limit and no upstream work for rejected/limited requests.
- Live metadata smoke check confirmed seven bound installer links and one exact current-asset redirect, without downloading or executing through that check.
- Website/app authentication, assessment services and monitoring behavior unchanged. Only public website release metadata/resolution was changed.

## Delivery

Reviewed locally, not pushed or deployed. Builds on the earlier unpublished routing and privacy batches. Preview: http://127.0.0.1:3200/download.
