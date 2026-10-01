package com.example.smoothcaret.presets
import com.example.smoothcaret.settings.*
object PresetManager {
    val names = arrayOf("Minimal", "Terminal", "Neovide", "Jelly", "Neon", "Custom")
    fun create(name: String): CaretOptions = when (name) {
        "Minimal" -> CaretOptions(preset = name, animationMode = AnimationMode.SMOOTH, width = 2.0, trailLength = 2, glowOpacity = 0.05)
        "Neovide" -> CaretOptions(preset = name, cursorStyle = CursorStyle.BLOCK, opacity = 0.55, stiffness = 0.22, trailLength = 5, trailOpacity = 0.12)
        "Jelly" -> CaretOptions(preset = name, stiffness = 0.12, damping = 0.83, maxDurationMs = 450, trailLength = 5)
        "Neon" -> CaretOptions(preset = name, useThemeColor = false, color = "#00E5FF", glowRadius = 12.0, glowOpacity = 0.35, trailLength = 12, trailOpacity = 0.45, trailFadeMs = 160, trailSpacing = 1.0, snapDistance = 1400.0, disableWhileScrolling = false)
        else -> CaretOptions(preset = name)
    }
}
