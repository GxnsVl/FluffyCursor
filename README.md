# Fluffy Cursor

Animated caret for JetBrains IDEs: responsive movement, directional stretching, subtle glow, and a single forward/back landing recoil. Typing uses a faster, lighter effect. Ghost copies are disabled by default.

**VS Code edition:** download the separate `.vsix` and follow the [VS Code installation guide](vscode/README.md). Its full effect uses an opt-in, reversible desktop workbench customization.

## Install in VS Code

1. Download **[fluffy-cursor-1.0.1.vsix](https://github.com/GxnsVl/FluffyCursor/releases/download/vscode-v1.0.1/fluffy-cursor-1.0.1.vsix)**. Use the `.vsix` package for VS Code.
2. Open **Extensions** (**Ctrl+Shift+X**, or **Cmd+Shift+X** on macOS), click **⋯ → Install from VSIX…**, and select the downloaded file.
3. Disable existing custom cursor effects such as **Neovide** or **Jelly Cursor** using the extension that installed them, then reload VS Code. Fluffy Cursor detects recognized conflicting effects and refuses to stack another renderer on top.
4. Open the Command Palette (**Ctrl+Shift+P**, or **Cmd+Shift+P** on macOS), run **Fluffy Cursor: Install / Update Full Effect**, and choose **Reload Window**.
5. To change color, width, glow, or spring settings, run **Fluffy Cursor: Open Settings**. After making changes, run **Install / Update Full Effect** again and reload.

You can also install the package from a terminal:

```sh
code --install-extension fluffy-cursor-1.0.1.vsix
```

Then complete steps 3–4 to enable the full effect. Installing the VSIX alone registers the extension's commands and settings.

Full stretching and inertia use a reversible modification of the desktop VS Code workbench. This requires a writable installation and may trigger an installation-integrity warning. After updating VS Code, run **Install / Update Full Effect** again if the effect disappears. Windows, Linux (including CachyOS), and macOS use the same VSIX; protected or read-only installations may prevent the full effect. Browser-based VS Code is unsupported.

To remove it, run **Fluffy Cursor: Remove Full Effect**, reload, then uninstall the extension. See the [complete VS Code guide](vscode/README.md) for permissions, recovery, and settings.

## Install in IntelliJ IDEA, PyCharm, or Rider

1. Download **[fluffy-cursor-1.1.1.zip](https://github.com/GxnsVl/FluffyCursor/releases/download/v1.1.1/fluffy-cursor-1.1.1.zip)** from the [Releases](https://github.com/GxnsVl/FluffyCursor/releases) page. Choose the plugin ZIP, not the Source code archive.
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

Output: `build/distributions/fluffy-cursor-1.1.1.zip`.
The Gradle wrapper and the official IntelliJ Platform Gradle plugin are included/configured. Compilation targets JVM 21 and IntelliJ IDEA 2024.3.6.

## Validation and architecture

See [VALIDATION.md](VALIDATION.md) for build/test results and their limits, and [ARCHITECTURE.md](ARCHITECTURE.md) for rendering/lifecycle details. The renamed, optimized release has automated regression coverage; it has not yet been manually checked in a live IDE.

## License

[MIT](LICENSE). Unaffiliated with JetBrains, Neovide, or VS Code.

## Compatibility verification

Run `bash ./gradlew verifyPlugin` (or `.\gradlew.bat verifyPlugin` on Windows) to verify the plugin against IntelliJ IDEA and PyCharm 2026.2.3, and Rider 2026.2.3.1. Gradle downloads the verification IDEs on the first run. The plugin still targets JVM 21 and builds against the 2024.3.6 SDK to retain older supported IDE versions.
