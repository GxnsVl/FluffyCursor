package com.example.smoothcaret.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.messages.Topic

enum class AnimationMode { SMOOTH, SPRING }
enum class CursorStyle { LINE, THICK_LINE, BLOCK, UNDERLINE }

data class CaretOptions(
    var preset: String = "Terminal", var enabled: Boolean = true,
    var hideNativeCaret: Boolean = true,
    var animationMode: AnimationMode = AnimationMode.SPRING,
    var cursorStyle: CursorStyle = CursorStyle.THICK_LINE,
    var useThemeColor: Boolean = true, var color: String = "#8AB4F8",
    var width: Double = 2.0, var opacity: Double = 0.95,
    var blink: Boolean = false, var blinkMs: Int = 600,
    var smoothing: Double = 0.28, var speed: Double = 1.0,
    var stiffness: Double = 0.30, var damping: Double = 0.70,
    var maxDurationMs: Int = 220, var snapDistance: Double = 600.0,
    var reduceSmallMovements: Boolean = true, var disableWhileScrolling: Boolean = true,
    var trail: Boolean = false, var trailLength: Int = 3, var trailOpacity: Double = 0.08,
    var trailFadeMs: Int = 100, var trailSpacing: Double = 4.0,
    var glow: Boolean = true, var glowRadius: Double = 3.0, var glowOpacity: Double = 0.08,
    var glowColor: String = "#8AB4F8", var glowUsesCursorColor: Boolean = true,
    var landingPulse: Boolean = false, var ripple: Boolean = false, var particles: Boolean = false
) {
    fun normalized(): CaretOptions = copy(
        width = width.coerceIn(1.0, 30.0), opacity = opacity.coerceIn(0.05, 1.0),
        blinkMs = blinkMs.coerceIn(100, 3000), smoothing = smoothing.coerceIn(0.01, 1.0),
        speed = speed.coerceIn(0.1, 4.0), stiffness = stiffness.coerceIn(0.01, 0.5),
        damping = damping.coerceIn(0.1, 0.95), maxDurationMs = maxDurationMs.coerceIn(16, 2000),
        snapDistance = snapDistance.coerceIn(10.0, 10000.0), trailLength = trailLength.coerceIn(1, 40),
        trailOpacity = trailOpacity.coerceIn(0.0, 1.0), trailFadeMs = trailFadeMs.coerceIn(16, 2000),
        trailSpacing = trailSpacing.coerceIn(1.0, 50.0), glowRadius = glowRadius.coerceIn(0.0, 20.0),
        glowOpacity = glowOpacity.coerceIn(0.0, 1.0)
    )
}
fun interface SettingsListener { fun changed() }
@State(name = "SmoothCaretSettings", storages = [Storage("smooth-caret.xml")])
class SmoothCaretSettings : PersistentStateComponent<CaretOptions> {
    private var options = CaretOptions()
    override fun getState(): CaretOptions = options
    override fun loadState(state: CaretOptions) {
        // Upgrade the old built-in preset widths; edited presets are stored as Custom.
        val upgraded = when {
            state.preset == "Terminal" && state.width == 5.0 -> state.copy(width = 2.0)
            state.preset == "Minimal" && state.width == 4.0 -> state.copy(width = 2.0)
            state.preset == "Neon" && state.glowRadius == 10.0 && state.glowOpacity == 0.25 && state.trailLength == 10 && state.trailOpacity == 0.2 ->
                state.copy(glowRadius = 12.0, glowOpacity = 0.35, trailLength = 12, trailOpacity = 0.45, trailFadeMs = 160, trailSpacing = 1.0, snapDistance = 1400.0, disableWhileScrolling = false)
            state.preset == "Neon" && state.trailLength == 6 && state.trailOpacity == 0.24 && state.trailFadeMs == 120 ->
                state.copy(trailLength = 12, trailOpacity = 0.45, trailFadeMs = 160, trailSpacing = 1.0)
            else -> state
        }
        // Remove ghost copies from existing presets, including customized colors.
        // Main-caret stretching is independent of this optional effect.
        val responsive = if ((upgraded.stiffness == 0.18 && upgraded.damping == 0.78) ||
            (upgraded.stiffness == 0.23 && upgraded.damping == 0.72)) {
            upgraded.copy(stiffness = 0.30, damping = 0.70,
                maxDurationMs = if (upgraded.maxDurationMs == 350 || upgraded.maxDurationMs == 280) 220 else upgraded.maxDurationMs)
        } else upgraded
        options = responsive.copy(trail = false).normalized()
    }
    fun update(state: CaretOptions) {
        options = state.normalized()
        ApplicationManager.getApplication().messageBus.syncPublisher(TOPIC).changed()
    }
    companion object {
        val TOPIC = Topic.create("Fluffy Cursor settings", SettingsListener::class.java)
        fun instance(): SmoothCaretSettings = ApplicationManager.getApplication().getService(SmoothCaretSettings::class.java)
    }
}
