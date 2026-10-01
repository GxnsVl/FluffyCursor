package com.example.smoothcaret
import com.example.smoothcaret.animation.*
import com.example.smoothcaret.presets.PresetManager
import com.example.smoothcaret.settings.*
import org.junit.Test
import kotlin.test.*

class AnimationTest {
    @Test fun motionIsIndependentOfRefreshRateAndIrregularFrames() {
        for (mode in AnimationMode.entries) {
            for ((stiffness, damping) in listOf(0.18 to 0.78, 0.01 to 0.1, 0.5 to 0.95)) {
                val options = CaretOptions(animationMode = mode, stiffness = stiffness, damping = damping)
                fun simulate(frames: List<Double>): AnimationState {
                    val s = AnimationState(0.0, 0.0)
                    s.targetX = 100.0; s.targetY = -40.0
                    frames.forEach { CaretAnimator.step(s, options, elapsedSeconds = it) }
                    return s
                }
                val baseline = simulate(List(6) { 1.0 / 60.0 })
                for (frames in listOf(List(20) { 1.0 / 200.0 }, List(24) { 1.0 / 240.0 }, listOf(0.003, 0.027, 0.011, 0.009, 0.05))) {
                    val actual = simulate(frames)
                    assertEquals(baseline.x, actual.x, 1e-8)
                    assertEquals(baseline.y, actual.y, 1e-8)
                    assertEquals(baseline.vx, actual.vx, 1e-8)
                    assertEquals(baseline.vy, actual.vy, 1e-8)
                }
            }
        }
    }
    @Test fun fiveMillisecondFramesMoveEveryTimeAndZeroElapsedDoesNotMove() {
        for (mode in AnimationMode.entries) {
            val options = CaretOptions(animationMode = mode)
            val s = AnimationState(0.0, 0.0); s.targetX = 100.0
            CaretAnimator.step(s, options, elapsedSeconds = 0.0)
            assertEquals(0.0, s.x)
            repeat(10) {
                val previous = s.x
                CaretAnimator.step(s, options, elapsedSeconds = 0.005)
                assertTrue(s.x > previous, "$mode frame $it")
            }
        }
    }
    @Test fun interpolationMovesTowardBothCoordinates() {
        val s = AnimationState(0.0, 0.0); s.targetX = 100.0; s.targetY = -40.0
        SmoothAnimator.step(s, 0.25)
        assertEquals(25.0, s.x); assertEquals(-10.0, s.y)
    }
    @Test fun springIsBoundedAndSettlesForAllPresets() {
        for (name in PresetManager.names) {
            val o = PresetManager.create(name)
            val s = AnimationState(0.0, 0.0); s.targetX = 100.0; s.targetY = 200.0
            repeat(240) {
                CaretAnimator.step(s, o)
                assertTrue(s.x.isFinite() && s.y.isFinite())
                assertTrue(s.x in -50.0..150.0 && s.y in -100.0..300.0)
            }
            assertTrue(s.settled(), name)
        }
    }
    @Test fun directionChangeConverges() {
        val s = AnimationState(0.0, 0.0); val o = CaretOptions()
        s.targetX = 100.0; repeat(5) { CaretAnimator.step(s, o) }
        s.targetX = -50.0; repeat(150) { CaretAnimator.step(s, o, true) }
        assertEquals(-50.0, s.x, 0.15)
    }
    @Test fun defaultsAreQuietAndPresetsAreIndependent() {
        for (name in PresetManager.names) {
            val o = PresetManager.create(name)
            assertFalse(o.particles); assertFalse(o.ripple); assertFalse(o.landingPulse)
        }
        val terminal = PresetManager.create("Terminal")
        assertEquals(2.0, terminal.width); assertEquals(0.30, terminal.stiffness); assertEquals(0.70, terminal.damping)
        terminal.width = 29.0
        assertEquals(2.0, PresetManager.create("Terminal").width)
    }
    @Test fun settingsClampUnsafeInputs() {
        val o = CaretOptions(stiffness = 3.0, damping = 2.0, trailLength = 999, width = -5.0).normalized()
        assertEquals(0.5, o.stiffness); assertEquals(0.95, o.damping)
        assertEquals(40, o.trailLength); assertEquals(1.0, o.width)
    }
}
