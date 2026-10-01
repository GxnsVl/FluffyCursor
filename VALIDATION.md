# Validation — Fluffy Cursor 1.1.0

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

- Declared platform builds: 243–261 (2024.3–2026.1).
- The artifact contains JVM JARs, with no bundled platform-specific binaries.
- Previous API verification accepted the native-caret hiding API on IDEA 2024.3.6, IDEA 2026.1.4 and PyCharm 2026.1.4; this exact renamed release was not re-run through Plugin Verifier.
- The release has not been manually checked in a live IDE. Linux/Wayland and macOS runtime behavior remain untested.
- Stable internal plugin ID and settings storage preserve upgrade compatibility with Smooth Caret.

Artifact: `build/distributions/fluffy-cursor-1.1.0.zip`.
