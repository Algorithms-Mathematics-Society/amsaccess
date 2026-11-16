# Bundled AMS house fonts

These are the exact WOFF2 files previously served by `next/font/google` in
amsaccess build `c2e313e` (PR #36). Bundling them removes the Google Fonts network
request from builds; it does not change the selected typefaces.

- **Inter:** normal variable weights 100–900, seven Unicode subsets.
- **Source Serif 4:** normal weights 400 and 600, six Unicode subsets. Both
  weights use the same variable binary for each subset. Font metadata identifies
  version 4.004.

`manifest.json` records each original build artifact and its SHA-256 checksum.
All Inter files were also compared byte-for-byte with Google's current CSS/CDN
responses on 2026-11-16. The current Source Serif 4 endpoint returns different
binary representations, so these files deliberately retain the existing build's
bytes rather than silently upgrading them.

Original Google Fonts CSS endpoints:

- https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap
- https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600&display=swap

The accompanying licenses are unmodified upstream SIL Open Font License 1.1
texts, retrieved from the Google Fonts repository:

- `inter-OFL.txt`: https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt
  (upstream project: https://github.com/rsms/inter)
- `source-serif-4-OFL.txt`: https://github.com/google/fonts/blob/main/ofl/sourceserif4/OFL.txt
  (upstream project: https://github.com/adobe-fonts/source-serif)

`src/app/fonts.css` preserves the previous Unicode ranges, font-display: swap,
weight declarations, and Arial/Times New Roman fallback metrics. The root layout
preloads only the two Latin files, as before. Filenames contain content hashes
because the existing site headers cache font files immutably for one year.

For an intentional future font update, update the binaries, checksums, CSS and
preloads together, retain the applicable licenses, and verify visual metrics.
There is no font downloader in the build.
