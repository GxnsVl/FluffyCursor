# Fluffy Cursor for VS Code

A desktop VS Code edition of Fluffy Cursor: a thin caret at rest, directional stretching during jumps, subtle neon glow, and one small forward/back landing recoil. Typing is faster and uses quarter-strength deformation. No ghost copies, particles, ripple, or repeated wobbling.

## Install

1. Download **[fluffy-cursor-1.0.0.vsix](https://github.com/GxnsVl/FluffyCursor/releases/download/vscode-v1.0.0/fluffy-cursor-1.0.0.vsix)**. The JetBrains `.zip` is a separate plugin and cannot be installed in VS Code.
2. In VS Code, open **Extensions → ⋯ → Install from VSIX…**, select the file, and reload if prompted. Alternatively: `code --install-extension fluffy-cursor-1.0.0.vsix`.
3. Disable any existing custom cursor scripts (Neovide, Jelly Cursor, etc.) using their original extension. Fluffy Cursor refuses to install over recognized conflicting renderers.
4. Open the Command Palette (**Ctrl+Shift+P**, or **Cmd+Shift+P** on macOS), run **Fluffy Cursor: Install / Update Full Effect**, then choose **Reload Window**.

Installing the VSIX registers commands and settings. The full effect is installed only when you run the command in step 4.

## Why the extra command?

VS Code's public extension API does not expose a renderer for replacing the editor caret. Full stretching and recoil use a small local script injected into the desktop workbench. The installer backs up the HTML, adds a marked script tag, and keeps all existing unrelated content. It does not change document text or intercept keyboard input. It does not disable VS Code's integrity checks, alter its checksums, or download remote scripts.

API reference: [VS Code extension API](https://code.visualstudio.com/api/references/vscode-api). Desktop input layouts are based on the [VS Code editor sources](https://github.com/microsoft/vscode/tree/main/src/vs/editor/browser/controller/editContext).

This is an unsupported workbench customization. VS Code may display an installation-integrity warning. Updates can remove the injection or change internal editor markup: run the install command again after updating, and use the remove command if an update breaks rendering. The installer obtains the current `appRoot`, including newer versioned Windows installation folders. Older version folders are left untouched.

## Customize

Run **Fluffy Cursor: Open Settings** or search Settings for `Fluffy Cursor`. After changing settings, run **Install / Update Full Effect** again and reload.

| Setting | Default | Purpose |
| --- | --- | --- |
| `fluffyCursor.color` | `#00E5FF` | Custom caret and glow color |
| `fluffyCursor.useThemeColor` | `false` | Use the editor theme's caret color |
| `fluffyCursor.width` | `2` | Resting width in logical pixels |
| `fluffyCursor.stiffness` | `0.30` | Spring response |
| `fluffyCursor.damping` | `0.70` | Velocity retention |
| `fluffyCursor.stretch` | `1` | Directional stretching strength |
| `fluffyCursor.glow` | `0.35` | Glow opacity; zero disables it |
| `fluffyCursor.landingInertia` | `true` | One small forward/back landing recoil |
| `fluffyCursor.enabled` | `true` | Enable the injected renderer |

The rendering loop uses `requestAnimationFrame` and elapsed-time physics, so it follows the display's refresh rate rather than a fixed 60 Hz timer. It stops scheduling frames after movement settles. Actual frame rate depends on VS Code, the compositor, and system load.

The native caret is hidden only while a focused editor has a valid replacement overlay. It is restored on focus loss. Split editors and up to 100 simultaneous carets are supported; larger multicursor selections retain native rendering. Scrolling, editor switches, font-size changes, and very large jumps snap without long streaks. The terminal and browser-based VS Code are outside this extension's scope.

## Remove or recover

1. Run **Fluffy Cursor: Remove Full Effect**, then reload.
2. Uninstall the VSIX normally if desired.

Remove the effect **before** uninstalling the extension: uninstalling a VSIX alone does not run workbench cleanup. If the extension is already gone, reinstall the VSIX and run the removal command.

Removal restores the original HTML byte-for-byte when it has not otherwise changed. If another tool edited it after installation, removal strips only Fluffy Cursor's marked section, preserving those later changes. The renderer and backup are removed. Reinstalling VS Code is also a recovery option if its workbench becomes unusable.

## Windows, Linux / CachyOS, and macOS

The same VSIX is used on all three operating systems. Full effects require a writable VS Code installation. User-owned or portable installations are the simplest option. Linux system packages under `/usr`, Flatpak/Snap read-only installations, and protected macOS application bundles may prevent installation. Permission failures are reported without automatic privilege escalation. Changes to a signed application on macOS may affect its signature. Browser-based VS Code is unsupported.

## Build and validation

Requires Node.js 22 or newer:

```sh
cd vscode
npm ci
npm test
npm run package
```

Browser checks use Playwright and an installed Edge browser by default:

```sh
npm run test:browser
# Or, with Chrome installed:
FLUFFY_TEST_BROWSER=chrome npm run test:browser
```

See [VALIDATION.md](https://github.com/GxnsVl/FluffyCursor/blob/main/VALIDATION.md) for exact checks and limitations. The minimum declared VS Code version is 1.85; every older version has not been individually tested. Workbench markup is an internal detail and can change independently of the extension API.

## License

MIT. Unaffiliated with Microsoft, JetBrains, Neovide, or other cursor extensions.
