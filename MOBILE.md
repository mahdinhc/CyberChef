# CyberChef Mobile (React Native / Expo, Android)

* `mobile/` – native React Native UI (Material 3 style, light/dark, safe-area aware).
* `mobile/engine/` – bundles the **real CyberChef core** (all operations) into one `engine.js`,
  which runs in a hidden Android WebView and talks to the UI over a message bridge.
* `.github/workflows/android-apk.yml` – builds everything and uploads `CyberChef-mobile.apk`.

## Build
Push to GitHub (or run the workflow manually: Actions → Build Android APK → Run workflow),
then download the `CyberChef-mobile-apk` artifact. The APK is signed with the debug key so it installs directly.

## Features
Search/browse all operations by category, favourites, per-operation argument editors for every
CyberChef argument type, reorder/disable/delete steps, auto-bake, copy/share output,
save/load recipes, import/export CyberChef-format recipe JSON, state restored on launch.

## Known limits
Output is text (image/binary previews are not rendered). Tesseract OCR assets are not bundled.
