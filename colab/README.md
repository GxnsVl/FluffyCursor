# Fluffy Cursor for Google Colab

An open-source, MIT-licensed browser extension for **Google Colab**. It adds directional stretching, subtle neon glow, and one forward/back landing recoil to the active code-cell caret. Typing uses a faster, lighter effect. Multiple carets snap without crossing trails.

## Install in Chrome or Edge

1. Download [fluffy-cursor-colab-1.0.0.zip](https://github.com/GxnsVl/FluffyCursor/releases/download/colab-v1.0.0/fluffy-cursor-colab-1.0.0.zip) and extract it to a folder you will keep.
2. Open `chrome://extensions` in Chrome, or `edge://extensions` in Edge.
3. Enable **Developer mode**.
4. Click **Load unpacked**, and select the extracted folder containing `manifest.json`.
5. Reload existing Google Colab tabs and click inside a code cell.
6. Pin Fluffy Cursor to the browser toolbar. Click its icon to open settings.

This package is installed locally; it is not published in the Chrome Web Store or Edge Add-ons. Windows, Linux/CachyOS, and macOS use the same files. Firefox uses the separate build below. Mobile browsers are not supported.

## Install in Firefox (desktop 140 or newer)

1. Download [fluffy-cursor-colab-firefox-1.0.0.xpi](https://github.com/GxnsVl/FluffyCursor/releases/download/colab-firefox-v1.0.0/fluffy-cursor-colab-firefox-1.0.0.xpi).
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**, then select the downloaded XPI.
4. Reload Google Colab, click a code cell, and open Fluffy Cursor from the Extensions toolbar menu to customize it.

**This release is unsigned. Temporary installation lasts until Firefox restarts.** Reload the XPI after a restart. A permanent installation in regular Firefox requires Mozilla signing; this project is not listed on Firefox Add-ons yet. Do not disable signature verification. See [Mozilla's temporary installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) and [signing requirements](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

The Firefox manifest explicitly declares no data collection and requests storage plus access only to the Colab domain. Settings and effects match the Chrome/Edge edition. To remove the temporary extension, use **Remove** in `about:debugging` and reload Colab.

## Customize

Choose Balanced, Calm, Neon, or Snappy. Use the color picker or enter `#FFFFFF` for white. Tune width, responsiveness, spring retention, stretch, and glow. Click the preview to try a jump before saving. Click **Save & apply to Colab**: open Colab tabs update immediately without a reload. Disable theme matching to use your custom color.

Disabling **Enable Fluffy Cursor** immediately restores the native caret. To uninstall, remove the extension in the browser's Extensions page, then reload existing Colab tabs. Keep the extracted installation folder until you remove the extension.

## Privacy and implementation

The extension runs only on `https://colab.research.google.com/*` and requests only browser **storage** permission. Settings use local browser storage, not account sync. No telemetry, network requests, notebook text collection, or remote code is included. It observes native cursor geometry and temporarily changes caret styling to draw a pointer-transparent SVG overlay.

Unlike the VS Code / Code OSS full-effect edition, **this browser edition does not modify installation files**. It changes only the local visual presentation of the Colab page. It does not alter notebook cell text, run cells, connect a runtime, or save notebook data.

Built with Manifest V3 content scripts, JavaScript, SVG, DOM observers, requestAnimationFrame, and the same elapsed-time spring/recoil physics as the desktop editions. The code-cell DOM can change when Colab updates; unsupported layouts retain the native caret. Remote collaborator cursors and embedded output widgets are not targeted. Display refresh rate, browser load, and compositor behavior determine the actual frame rate.

## Build

From the repository root, with Node.js installed:

```sh
node colab/build.js
node colab/build.js --firefox
```

Load `colab/dist` unpacked in Chrome/Edge, or select `colab/dist-firefox/manifest.json` as a temporary add-on in Firefox. The build copies the shared physics and adapts the shared VS Code renderer without modifying the desktop extension. It includes no Node.js dependencies or SDK files.

[Source code](https://github.com/GxnsVl/FluffyCursor) · MIT license · Unaffiliated with Google, Microsoft, and JetBrains.
