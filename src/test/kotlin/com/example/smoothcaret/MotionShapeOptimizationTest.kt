package com.example.smoothcaret

import com.example.smoothcaret.animation.AnimationState
import com.example.smoothcaret.render.MotionCaretShape
import java.awt.geom.Path2D
import org.junit.Test
import kotlin.math.*
import kotlin.test.assertEquals

class MotionShapeOptimizationTest {
    @Test fun analyticPolygonMatchesGenericHullInEveryDirection() {
        for ((vx, vy) in listOf(40.0 to 0.0, -40.0 to 0.0, 0.0 to 40.0, 0.0 to -40.0,
            30.0 to 40.0, -30.0 to 40.0, 30.0 to -40.0, -30.0 to -40.0, 0.0 to 0.0)) {
            for (strength in listOf(1.0, 0.25)) {
                val s = AnimationState(50.0, 50.0).apply { this.vx = vx; this.vy = vy; jumpDistance = 200.0 }
                val actual = MotionCaretShape.create(s, 2.0, 20.0, strength)
                val reference = referenceHull(s, strength)
                for (x in 25..80) for (y in 25..95) {
                    assertEquals(reference.contains(x + 0.37, y + 0.29), actual.contains(x + 0.37, y + 0.29),
                        "direction=$vx,$vy strength=$strength point=$x,$y")
                }
            }
        }
    }

    private fun referenceHull(s: AnimationState, strength: Double): Path2D.Double {
        val speed = hypot(s.vx, s.vy)
        val activity = (speed / 5.0).coerceIn(0.0, 1.0)
        val jump = (s.jumpDistance / 160.0).coerceIn(0.0, 1.0)
        val width = 2 + 2 * activity * (0.5 + 0.5 * jump) * strength
        val length = min(20 * (0.65 + 0.3 * jump), speed * (0.3 + 0.15 * jump)) * strength
        val dx = if (speed > 0.001) -s.vx / speed * length else 0.0
        val dy = if (speed > 0.001) -s.vy / speed * length else 0.0
        val left = s.x + (2 - width) / 2
        val points = listOf(0.0 to 0.0, width to 0.0, width to 20.0, 0.0 to 20.0)
            .flatMap { (x, y) -> listOf((left + x) to (s.y + y), (left + x + dx) to (s.y + y + dy)) }
            .distinct().sortedWith(compareBy<Pair<Double, Double>> { it.first }.thenBy { it.second })
        fun cross(a: Pair<Double, Double>, b: Pair<Double, Double>, c: Pair<Double, Double>) =
            (b.first - a.first) * (c.second - a.second) - (b.second - a.second) * (c.first - a.first)
        fun half(items: List<Pair<Double, Double>>): List<Pair<Double, Double>> {
            val hull = mutableListOf<Pair<Double, Double>>()
            for (p in items) {
                while (hull.size >= 2 && cross(hull[hull.size - 2], hull.last(), p) <= 0) hull.removeAt(hull.lastIndex)
                hull.add(p)
            }
            return hull.dropLast(1)
        }
        val direction = if (abs(s.vx) > 0.01) sign(s.vx) else sign(s.vy)
        val lean = -direction * 0.06 * activity * strength
        val hull = half(points) + half(points.reversed())
        return Path2D.Double().apply {
            hull.forEachIndexed { i, (x, y) ->
                val px = x + lean * (y - (s.y + 10))
                if (i == 0) moveTo(px, y) else lineTo(px, y)
            }
            closePath()
        }
    }
}
