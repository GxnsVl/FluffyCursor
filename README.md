# Fluffy Cursor

Animated caret for JetBrains IDEs: responsive movement, directional stretching, subtle glow, and a single forward/back landing recoil. Typing uses a faster, lighter effect. Ghost copies are disabled by default.

## Download and install

1. Download **[fluffy-cursor-1.1.0.zip](https://github.com/GxnsVl/FluffyCursor/releases/download/v1.1.0/fluffy-cursor-1.1.0.zip)** from the [Releases](https://github.com/GxnsVl/FluffyCursor/releases) page. Choose the plugin ZIP, not the Source code archive.
2. In IntelliJ IDEA, open **Settings → Plugins → ⚙ → Install Plugin from Disk…**.
3. Select the ZIP **without extracting it**, then restart your IDE.
4. Open **Settings → Tools → Fluffy Cursor**, choose **Neon**, and click **Apply** for a brighter glow and more pronounced movement.

The same ZIP works as an installation package for **Windows, Linux (including CachyOS), and macOS**. No separate system package is needed. Supported platform versions: **2024.3–2026.1**, builds **243–261**. The plugin contains JVM code and no bundled native libraries. Linux/macOS runtime behavior has not yet been manually tested.

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

Output: `build/distributions/fluffy-cursor-1.1.0.zip`.
The Gradle wrapper and the official IntelliJ Platform Gradle plugin are included/configured. Compilation targets JVM 21 and IntelliJ IDEA 2024.3.6.

## Validation and architecture

See [VALIDATION.md](VALIDATION.md) for build/test results and their limits, and [ARCHITECTURE.md](ARCHITECTURE.md) for rendering/lifecycle details. The renamed, optimized release has automated regression coverage; it has not yet been manually checked in a live IDE.

## License

[MIT](LICENSE). Unaffiliated with JetBrains, Neovide, or VS Code.
