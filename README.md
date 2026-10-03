# Fluffy Cursor

Animated caret for JetBrains IDEs, VS Code / Code OSS, and Google Colab: responsive movement, directional stretching, subtle glow, and a single forward/back landing recoil. Typing uses a faster, lighter effect. Ghost copies are disabled by default.

**VS Code edition:** download the separate `.vsix` and follow the [VS Code installation guide](vscode/README.md). Its full effect uses an opt-in, reversible desktop workbench customization.

**Open source · MIT license.** You can inspect, modify, redistribute, and contribute to this project. Source code, build instructions, and validation results are included in this repository.

**The current VS Code / Code OSS edition modifies editor interface files.** Full effects add a local script to the desktop workbench and require write access and a reload. This unsupported customization may trigger an integrity warning and need reinstallation after updates. The JetBrains edition uses public editor APIs and does not modify installation files.

## Install in Google Colab (Chrome / Edge / Firefox)

1. Download **[fluffy-cursor-colab-1.0.0.zip](https://github.com/GxnsVl/FluffyCursor/releases/download/colab-v1.0.0/fluffy-cursor-colab-1.0.0.zip)** and extract it to a folder you will keep.
2. Open **chrome://extensions** or **edge://extensions**, enable **Developer mode**, and click **Load unpacked**.
3. Select the extracted folder containing `manifest.json`, then reload your Colab tabs.
4. Click a code cell to use the effect. Pin Fluffy Cursor to the toolbar and click its icon to configure presets, color, stretch, and glow.
5. Click **Save & apply to Colab**. Settings update open Colab tabs immediately.

For **Firefox 140+**, download the separate [Firefox XPI](https://github.com/GxnsVl/FluffyCursor/releases/download/colab-firefox-v1.0.0/fluffy-cursor-colab-firefox-1.0.0.xpi), open `about:debugging#/runtime/this-firefox`, and choose **Load Temporary Add-on**. Select the XPI and reload Colab. This unsigned build lasts until Firefox restarts; permanent installation requires Mozilla signing.

This browser edition runs only on the Colab domain, stores settings locally, and does not modify notebook text or browser installation files. It is not listed in browser extension stores. To uninstall, remove it from Extensions and reload Colab tabs. See the [Colab guide](colab/README.md) for privacy, source, and limitations.

## Install in VS Code

1. Download **[fluffy-cursor-1.1.0.vsix](https://github.com/GxnsVl/FluffyCursor/releases/download/vscode-v1.1.0/fluffy-cursor-1.1.0.vsix)**. Use the `.vsix` package for VS Code.
2. Open **Extensions** (**Ctrl+Shift+X**, or **Cmd+Shift+X** on macOS), click **⋯ → Install from VSIX…**, and select the downloaded file.
3. Disable existing custom cursor effects such as **Neovide** or **Jelly Cursor** using the extension that installed them, then reload VS Code. Fluffy Cursor detects recognized conflicting effects and refuses to stack another renderer on top.
4. Open the Command Palette (**Ctrl+Shift+P**, or **Cmd+Shift+P** on macOS), run **Fluffy Cursor: Install / Update Full Effect**, and choose **Reload Window**.
5. Run **Fluffy Cursor: Open Settings** for the visual settings page. Choose Balanced, Calm, Neon, or Snappy; use the color picker and sliders, and click inside the live preview to try motion. Click **Save & apply to editor**, then reload to use the new settings. **Save only** keeps the settings without updating installation files.

You can also install the package from a terminal:

```sh
code --install-extension fluffy-cursor-1.1.0.vsix
```

Then complete steps 3–4 to enable the full effect. Installing the VSIX alone registers the extension's commands and settings.

Full stretching and inertia use a reversible modification of the desktop VS Code workbench. This requires a writable installation and may trigger an installation-integrity warning. After updating VS Code, run **Install / Update Full Effect** again if the effect disappears. Windows, Linux (including CachyOS), and macOS use the same VSIX; protected or read-only installations may prevent the full effect. Browser-based VS Code is unsupported.

To remove it, run **Fluffy Cursor: Remove Full Effect**, reload, then uninstall the extension. See the [complete VS Code guide](vscode/README.md) for permissions, recovery, and settings.

## Install in IntelliJ IDEA, PyCharm, or Rider

1. Download **[fluffy-cursor-1.2.0.zip](https://github.com/GxnsVl/FluffyCursor/releases/download/v1.2.0/fluffy-cursor-1.2.0.zip)** from the [Releases](https://github.com/GxnsVl/FluffyCursor/releases) page. Choose the plugin ZIP, not the Source code archive.
2. In IntelliJ IDEA, PyCharm, or Rider, open **Settings → Plugins → ⚙ → Install Plugin from Disk…**.
3. Select the ZIP **without extracting it**, then restart your IDE.
4. Open **Settings → Tools → Fluffy Cursor**, choose **Neon**, and click **Apply** for a brighter glow and more pronounced movement.

The same ZIP works as an installation package for **Windows, Linux (including CachyOS), and macOS**. No separate system package is needed. Supported platform versions: **2024.3–2026.2**, builds **243–262**. The plugin contains JVM code and no bundled native libraries. Linux/macOS runtime behavior has not yet been manually tested.

[Official JetBrains instructions for installing a plugin ZIP](https://www.jetbrains.com/help/idea/managing-plugins.html#install_plugin_from_disk).

### Change the color

On the **General** tab, disable **Use theme caret color**, enter a value in **Custom caret color (#RRGGBB)**, and click **Apply**. Examples: `#00E5FF` for cyan, `#B388FF` for purple, or `#FF4081` for pink. On the **Trail and glow** tab, enable **Glow uses cursor color** to match the glow to the caret.

### Upgrade from Smooth Caret

Smooth Caret has been renamed to Fluffy Cursor. Its internal plugin ID is unchanged, so installing this release updates the existing plugin without creating a second copy. Your color settings are preserved. Loading older settings disables ghost copies and upgrades the previous default spring tuning.

## Behavior

- A thin 2 px caret at rest; it widens slightly and stretches along the direction of a jump.
- One small forward overshoot, a smaller backward return, then a stop.
- Faster animation while typing: movement capped at 70 ms with quarter-strength deformation.
- Animation follows elapsed time, with updates requested every 5 ms while active.
- The native caret is hidden while the custom caret is active; its previous state is restored when disabled.
- Particles, ripple, and landing pulse are disabled. Ghost copies are disabled by default.
- The timer stops when effects finish; only affected regions are repainted.

Actual frame rate depends on IDE load, the JVM, and the window compositor; 200 FPS is not guaranteed.

## What it is built with

The **JetBrains edition** uses Kotlin, Swing, and IntelliJ Platform editor APIs. A clipped glass-pane overlay renders a six-vertex swept caret shape. Exact elapsed-time damped-spring physics drives motion, with a single directional landing recoil. Native caret visibility is restored when the effect is inactive; timers stop after settlement.

The **VS Code / Code OSS edition** uses JavaScript, SVG, DOM observers, and `requestAnimationFrame`. A local bundled script tracks editor cursor layout and renders the effect without changing document text. The visual settings page uses the official VS Code webview API with a local preview. Its full-effect installer adds a marked script tag and a backup to the workbench directory; removal restores the original page or preserves later unrelated changes. No telemetry, network-loaded renderer, or bundled native library is included.

See [ARCHITECTURE.md](ARCHITECTURE.md) for implementation details and [VALIDATION.md](VALIDATION.md) for tests and known limits. Contributions and bug reports are welcome through this repository's issues and pull requests. Fluffy Cursor is independent of Microsoft and JetBrains.

## Build from source

Requires a full **JDK 21 or newer** and internet access for the first dependency download.

Linux/macOS:

```sh
bash ./gradlew test buildPlugin
```

Windows PowerShell:

```powershell
.\gradlew.bat test buildPlugin
```

Output: `build/distributions/fluffy-cursor-1.2.0.zip`.
The Gradle wrapper and the official IntelliJ Platform Gradle plugin are included/configured. Compilation targets JVM 21 and IntelliJ IDEA 2024.3.6.

## Validation and architecture

See [VALIDATION.md](VALIDATION.md) for build/test results and their limits, and [ARCHITECTURE.md](ARCHITECTURE.md) for rendering/lifecycle details. The renamed, optimized release has automated regression coverage; it has not yet been manually checked in a live IDE.

## License

[MIT](LICENSE). Unaffiliated with JetBrains, Neovide, or VS Code.

## Compatibility verification

Run `bash ./gradlew verifyPlugin` (or `.\gradlew.bat verifyPlugin` on Windows) to verify the plugin against IntelliJ IDEA and PyCharm 2026.2.3, and Rider 2026.2.3.1. Gradle downloads the verification IDEs on the first run. The plugin still targets JVM 21 and builds against the 2024.3.6 SDK to retain older supported IDE versions.
