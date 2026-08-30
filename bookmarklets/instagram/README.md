# Instagram RI Bookmarklet

## Active runtime
- `bookmarklet-url.txt` — bookmark URL stored on the device.
- `bridge-stable.svg` — external transfer bridge used by the loader.
- `current-target.txt` — compatibility pointer. **Must always contain exactly `current.js`.**
- `current.js` — the only active runtime body. All releases update this file in place.

## Product docs
- `PRODUCT_STRUCTURE.md` — product/UI structure.
- `MEDIA_SAVE_RULES.md` — media save behavior and naming rules.
- `SAVE_STATUS.md` — save implementation/test status.

## Update invariant
1. Never point `current-target.txt` at a versioned file.
2. Never make the bookmarklet loader depend on `save-vXXX.js`, `media-vXXX.js`, or another experimental filename.
3. A tested release is published by replacing `current.js` only.
4. `bridge-stable.svg` and `bookmarklet-url.txt` are infrastructure files and should not be changed for normal feature releases.
5. Historical experiments belong under `archive/legacy/`, not in the active root.

## Current release
- Active body: `current.js`
- Version is declared inside `current.js`.
