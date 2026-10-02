# Validation — Fluffy Cursor 1.1.1

Validated on Windows, 2026-10-02.

## Build and tests

- `gradlew.bat test buildPlugin`: successful against IntelliJ IDEA 2024.3.6, JVM target 21.
- Final regression run: **28 tests, zero failures**.
- Tests cover bounded spring convergence, refresh-rate timing equivalence, directional stretching, single forward/back landing recoil, reduced typing deformation, idle rendering, native-caret restoration, and settings serialization/migration.
- The analytic six-vertex motion polygon is compared with the previous generic convex hull in eight movement directions plus idle, at normal and quarter strength. Sampled geometry matches.

## Optimization

The per-frame geometry path no longer constructs point lists, sorts them, builds hull lists or allocates a transform/new path. It writes six vertices into a renderer-owned path. Glow stroke objects are cached. Animation timers already stop after settlement; repaint remains restricted to changed bounds.

No quantitative FPS/CPU benchmark was performed; these changes reduce identified allocations, not a claim of measured FPS improvement.

## Compatibility

- Declared platform builds: 243–262 (2024.3–2026.2).
- The artifact contains JVM JARs, with no bundled platform-specific binaries.
- JetBrains Plugin Verifier reports **Compatible** for this exact 1.1.1 artifact on IntelliJ IDEA 2026.2.3 (IU-262.10968.63), PyCharm 2026.2.3 (PY-262.10968.92), and Rider 2026.2.3.1 (RD-262.10968.170).
- These were the latest stable releases returned by JetBrains' product release API on 2026-10-02. The default `verifyPlugin` task pins these three targets for repeatable checks.
- Previous API verification also accepted the native-caret hiding API on IDEA 2024.3.6, IDEA 2026.1.4 and PyCharm 2026.1.4.
- The release has not been manually checked in a live IDE. Linux/Wayland and macOS runtime behavior remain untested.
- Stable internal plugin ID and settings storage preserve upgrade compatibility with Smooth Caret.

Artifact: `build/distributions/fluffy-cursor-1.1.1.zip`.

## VS Code edition — 1.0.0

Validated on Windows, 2026-10-02. The VSIX is a separate artifact from the JetBrains plugin.

- `npm test`: **12 tests, zero failures**. Coverage includes 60/200/240 Hz timing equivalence, single landing recoil, reduced typing stretch, settings validation, idempotent installation, byte-for-byte restoration, later customization preservation, conflict detection, corrupted backup rejection, and desktop workbench path discovery.
- Playwright checks in headless Edge passed on a Monaco-shaped DOM fixture: motion rendering, idle scheduling, typing settlement, scroll snapping, multicursor rendering, modern native EditContext focus, native-caret restoration on focus loss, and disposal. These are renderer integration checks, not a full Monaco/desktop visual test.
- Extension-host smoke test passed in **VS Code 1.140.0** using an isolated profile: extension activation, all three commands registered, configuration defaults, and opening a text document.
- `vsce package --no-dependencies` produced `vscode/fluffy-cursor-1.0.0.vsix`. It contains only the extension manifest, guide/license, and four small JavaScript files; no SDKs, test tools, or native dependencies are bundled.
- The full effect was not installed into the user's existing VS Code. That workbench already contains Neovide and Jelly Cursor scripts; the installer detects this conflict instead of stacking another cursor renderer.
- Manual visual behavior in desktop VS Code, actual monitor refresh rate, and Linux/macOS runtime behavior remain untested. Full effects depend on internal workbench markup, require a writable installation, and may trigger VS Code's integrity warning. Reinstallation after IDE updates may be necessary.
