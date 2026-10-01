package com.example.smoothcaret.render

import com.example.smoothcaret.animation.AnimationState
import java.awt.geom.Path2D
import kotlin.math.*

object MotionCaretShape {
    fun create(s: AnimationState, width: Double, height: Double, strength: Double = 1.0): Path2D.Double =
        Path2D.Double().also { write(s, width, height, strength, it) }

    fun write(s: AnimationState, width: Double, height: Double, strength: Double, path: Path2D.Double) {
        val speed = hypot(s.vx, s.vy)
        val activity = (speed / (height * 0.25)).coerceIn(0.0, 1.0)
        val jump = (s.jumpDistance / (height * 8.0)).coerceIn(0.0, 1.0)
        val bodyWidth = width + min(width, height * 0.1) * activity * (0.5 + 0.5 * jump) * strength
        val length = min(height * (0.65 + 0.3 * jump), speed * (0.3 + 0.15 * jump)) * strength
        val dx = if (speed > 0.001) -s.vx / speed * length else 0.0
        val dy = if (speed > 0.001) -s.vy / speed * length else 0.0
        val left = s.x + (width - bodyWidth) / 2
        val direction = if (abs(s.vx) > 0.01) sign(s.vx) else sign(s.vy)
        val lean = -direction * 0.06 * activity * strength
        val ax = abs(dx); val ay = abs(dy)
        val cy = s.y + height / 2
        fun point(x: Double, y: Double, first: Boolean = false) {
            val px = left + if (dx < 0) bodyWidth - x else x
            val py = s.y + if (dy < 0) height - y else y
            val tiltedX = px + lean * (py - cy)
            if (first) path.moveTo(tiltedX, py) else path.lineTo(tiltedX, py)
        }
        // Exact swept rectangle: six vertices, no point lists, sorting or hull allocation.
        path.reset()
        point(0.0, 0.0, true)
        point(bodyWidth, 0.0)
        point(bodyWidth + ax, ay)
        point(bodyWidth + ax, height + ay)
        point(ax, height + ay)
        point(0.0, height)
        path.closePath()
    }
}
