package com.example.smoothcaret
import com.example.smoothcaret.animation.AnimationState
import com.example.smoothcaret.render.CaretRenderer
import com.example.smoothcaret.render.CaretGeometry
import com.example.smoothcaret.render.TrailRenderer
import com.example.smoothcaret.settings.CaretOptions
import com.example.smoothcaret.settings.CursorStyle
import java.awt.Color
import java.awt.image.BufferedImage
import org.junit.Test
import kotlin.test.*
import kotlin.math.abs
class RenderingTest {
    @Test fun landingHasExactlyOneForwardSwingAndOneSmallerReturn() {
        fun offset(p: Double) = com.example.smoothcaret.render.LandingInertia.offset(p, 20.0, 1.0, 0.0, 1.0).y
        assertEquals(2.4, offset(0.28), 1e-9)
        assertEquals(-2.4 * 0.28, offset(0.65), 1e-9)
        val directions = (1..100).map { kotlin.math.sign(offset(it / 100.0) - offset((it - 1) / 100.0)) }
            .filter { it != 0.0 }
        assertEquals(2, directions.zipWithNext().count { (a, b) -> a != b })
        assertEquals(0.0, offset(1.0))
    }
    @Test fun landingInertiaFollowsJumpDirectionAndDecaysWithoutChangingShape() {
        val right = com.example.smoothcaret.render.LandingInertia.offset(0.125, 20.0, 1.0, 1.0, 0.0)
        val left = com.example.smoothcaret.render.LandingInertia.offset(0.125, 20.0, 1.0, -1.0, 0.0)
        val down = com.example.smoothcaret.render.LandingInertia.offset(0.125, 20.0, 1.0, 0.0, 1.0)
        assertTrue(right.x > 0); assertEquals(0.0, right.y)
        assertEquals(-right.x, left.x); assertEquals(right.x, down.y); assertEquals(0.0, down.x)
        val returning = com.example.smoothcaret.render.LandingInertia.offset(0.75, 20.0, 1.0, 1.0, 0.0)
        assertTrue(returning.x < 0 && abs(returning.x) < right.x)
        val typing = com.example.smoothcaret.render.LandingInertia.offset(0.125, 20.0, 0.25, 1.0, 0.0)
        assertEquals(right.x * 0.25, typing.x)
        assertEquals(0.0, com.example.smoothcaret.render.LandingInertia.offset(1.0, 20.0, 1.0, 1.0, 1.0).x)
    }
    @Test fun landingJellyDeformsBrieflyAndReturnsToExactIdleShape() {
        fun render(progress: Double): BufferedImage {
            val image = BufferedImage(100, 100, BufferedImage.TYPE_INT_ARGB)
            val g = image.createGraphics()
            try {
                g.setRenderingHint(java.awt.RenderingHints.KEY_ANTIALIASING, java.awt.RenderingHints.VALUE_ANTIALIAS_ON)
                val s = AnimationState(40.0, 30.0)
                CaretRenderer().paint(g, s, s, 2.0, 20.0, Color.CYAN, Color.CYAN, 0.0,
                    CaretOptions(glow = false, opacity = 1.0), true, progress)
            } finally { g.dispose() }
            return image
        }
        val idle = render(1.0).getRGB(0, 0, 100, 100, null, 0, 100)
        assertContentEquals(idle, render(0.0).getRGB(0, 0, 100, 100, null, 0, 100))
        assertFalse(idle.contentEquals(render(0.125).getRGB(0, 0, 100, 100, null, 0, 100)))
        assertContentEquals(idle, render(1.1).getRGB(0, 0, 100, 100, null, 0, 100))
    }
    @Test fun jumpDistanceIncreasesWidthAndDirectionalStretchButIdleStaysThin() {
        fun bounds(jump: Double, speed: Double) = com.example.smoothcaret.render.MotionCaretShape.create(
            AnimationState(50.0, 50.0).apply { vx = speed; jumpDistance = jump }, 2.0, 20.0).bounds2D
        val small = bounds(20.0, 40.0)
        val large = bounds(1000.0, 40.0)
        assertTrue(large.width > small.width)
        assertTrue(large.height >= 20.0)
        assertTrue(large.width <= 24.0)
        assertEquals(2.0, bounds(1000.0, 0.0).width)
        val vertical = com.example.smoothcaret.render.MotionCaretShape.create(
            AnimationState(50.0, 50.0).apply { vy = 40.0; jumpDistance = 1000.0 }, 2.0, 20.0).bounds2D
        assertTrue(vertical.width > 2.0)
        assertTrue(vertical.height > 20.0)
        assertTrue(vertical.minY < 50.0)
    }
    @Test fun distantTrailingEdgeCannotDrawASeparateThinLine() {
        val image = BufferedImage(100, 160, BufferedImage.TYPE_INT_ARGB)
        val g = image.createGraphics()
        try {
            val top = AnimationState(40.0, 30.0).apply { vy = -40.0; jumpDistance = 800.0 }
            val bottom = AnimationState(40.0, 110.0)
            val options = CaretOptions(glow = false, opacity = 1.0)
            CaretRenderer().paint(g, top, bottom, 2.0, 20.0, Color.CYAN, Color.CYAN, 0.0, options, true)
            assertEquals(Color.CYAN.rgb, image.getRGB(40, 40))
            assertEquals(0, image.getRGB(40, 100))
            assertEquals(0, image.getRGB(40, 120))
        } finally { g.dispose() }
    }
    @Test fun movingNeonStretchesBehindMotionAndReturnsToThinIdleShape() {
        val options = com.example.smoothcaret.presets.PresetManager.create("Neon").copy(glow = false, opacity = 1.0)
        for (velocity in listOf(-40.0, 0.0, 40.0)) {
            val image = BufferedImage(120, 80, BufferedImage.TYPE_INT_ARGB)
            val g = image.createGraphics()
            try {
                val s = AnimationState(60.0, 20.0); s.vx = velocity
                CaretRenderer().paint(g, s, s, 2.0, 20.0, Color.CYAN, Color.CYAN, 0.0, options, true)
                assertEquals(Color.CYAN.rgb, image.getRGB(60, 30))
                assertEquals(if (velocity > 0) Color.CYAN.rgb else 0, image.getRGB(55, 30))
                assertEquals(if (velocity < 0) Color.CYAN.rgb else 0, image.getRGB(66, 30))
            } finally { g.dispose() }
        }
    }
    @Test fun longHorizontalJumpLeavesSeveralFullHeightGhosts() {
        val options = com.example.smoothcaret.presets.PresetManager.create("Neon").copy(trail = true)
        val trail = TrailRenderer(); trail.add(0.0, 20.0, 0, options)
        val image = BufferedImage(140, 80, BufferedImage.TYPE_INT_ARGB)
        val g = image.createGraphics()
        try {
            trail.paint(g, 5, 2.0, 20.0, Color.CYAN, options, 100.0, 20.0)
            // Full-height silhouettes, not the old one-pixel horizontal ribbon.
            assertTrue(image.getRGB(90, 25) ushr 24 > 0)
            assertTrue(image.getRGB(80, 25) ushr 24 > 0)
            assertEquals(0, image.getRGB(25, 25))
        } finally { g.dispose() }
    }
    @Test fun verticalTailRemainsVisibleAfterCaretIsPaintedOverIt() {
        for (previousY in listOf(68.0, 92.0)) {
            val options = CaretOptions(trail = true, glow = false, opacity = 1.0, trailOpacity = 0.45)
            val trail = TrailRenderer()
            trail.add(20.0, previousY, 0, options)
            val image = BufferedImage(60, 160, BufferedImage.TYPE_INT_ARGB)
            val g = image.createGraphics()
            try {
                trail.paint(g, 5, 2.0, 20.0, Color.CYAN, options, 20.0, 80.0)
                val s = AnimationState(20.0, 80.0)
                CaretRenderer().paint(g, s, s, 2.0, 20.0, Color.CYAN, Color.CYAN, 0.0, options, true)
                val outsideY = if (previousY < 80) 74 else 105
                assertTrue(image.getRGB(20, outsideY) ushr 24 >= 20, "Visible tail outside caret, previousY=$previousY")
                assertEquals(Color.CYAN.rgb, image.getRGB(20, 90))
            } finally { g.dispose() }
        }
    }
    @Test fun horizontalTrailAlsoFormsAShortRibbon() {
        val trail = TrailRenderer()
        val options = CaretOptions(trail = true, trailOpacity = 0.3)
        trail.add(0.0, 20.0, 0, options)
        val image = BufferedImage(160, 60, BufferedImage.TYPE_INT_ARGB)
        val g = image.createGraphics()
        try {
            trail.paint(g, 10, 4.0, 20.0, Color.WHITE, options, 100.0, 20.0)
            assertTrue(image.getRGB(90, 30) ushr 24 > 0)
            assertEquals(0, image.getRGB(25, 30))
        } finally { g.dispose() }
    }
    @Test fun longJumpTrailIsConnectedShortAndFadesOut() {
        val trail = TrailRenderer()
        val options = CaretOptions(trail = true, trailOpacity = 0.3)
        trail.add(20.0, 0.0, 0, options)
        val image = BufferedImage(60, 160, BufferedImage.TYPE_INT_ARGB)
        val g = image.createGraphics()
        try {
            trail.paint(g, 10, 4.0, 20.0, Color.WHITE, options, 20.0, 100.0)
            assertTrue(image.getRGB(21, 90) ushr 24 > 0)
            assertEquals(0, image.getRGB(21, 30))
            assertEquals(0, image.getRGB(21, 10))
            trail.expire(200, options.trailFadeMs)
            assertFalse(trail.active())
        } finally { g.dispose() }
    }
    @Test fun verticalCaretStraddlesInsertionBoundaryWithoutCoveringNextGlyphInterior() {
        val options = CaretOptions(glow = false, opacity = 1.0)
        val image = BufferedImage(40, 40, BufferedImage.TYPE_INT_ARGB)
        val g = image.createGraphics()
        try {
            val x = CaretGeometry.left(20.0, options.width, options.cursorStyle)
            val s = AnimationState(x, 2.0)
            CaretRenderer().paint(g, s, s, options.width, 20.0, Color.WHITE, Color.WHITE, 0.0, options, true)
            assertEquals(Color.WHITE.rgb, image.getRGB(19, 10))
            assertEquals(Color.WHITE.rgb, image.getRGB(20, 10))
            assertEquals(0, image.getRGB(21, 10))
            assertEquals(0, image.getRGB(22, 10))
            assertEquals(19.5, CaretGeometry.left(20.0, 1.0, CursorStyle.LINE))
            assertEquals(20.0, CaretGeometry.left(20.0, 10.0, CursorStyle.BLOCK))
            assertEquals(20.0, CaretGeometry.left(20.0, 10.0, CursorStyle.UNDERLINE))
        } finally { g.dispose() }
    }
    @Test fun trailIsBoundedSpacedAndExpires() {
        val trail = TrailRenderer()
        val options = CaretOptions(trail = true, trailLength = 3, trailSpacing = 4.0)
        for (i in 0..99) trail.add(i * 10.0, 20.0, i.toLong(), options)
        val bounds = assertNotNull(trail.bounds(5.0, 20.0))
        assertTrue(bounds.width <= 39); assertEquals(964, bounds.x)
        trail.expire(1000, options.trailFadeMs)
        assertFalse(trail.active()); assertNull(trail.bounds(5.0, 20.0))
    }
    @Test fun caretRespectsClipAndBlinkVisibility() {
        val image = BufferedImage(100, 100, BufferedImage.TYPE_INT_ARGB)
        val g = image.createGraphics()
        try {
            g.clipRect(10, 10, 10, 20)
            val renderer = CaretRenderer(); val s = AnimationState(12.0, 12.0)
            val options = CaretOptions(glow = false, opacity = 1.0)
            renderer.paint(g, s, s, 5.0, 25.0, Color.WHITE, Color.WHITE, 0.0, options, false)
            assertEquals(0, image.getRGB(12, 12))
            renderer.paint(g, s, s, 5.0, 25.0, Color.WHITE, Color.WHITE, 0.0, options, true)
            assertEquals(Color.WHITE.rgb, image.getRGB(13, 13)); assertEquals(0, image.getRGB(13, 35))
        } finally { g.dispose() }
    }
}
