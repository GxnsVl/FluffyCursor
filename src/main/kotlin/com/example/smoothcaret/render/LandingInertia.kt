package com.example.smoothcaret.render

import java.awt.geom.Point2D
import kotlin.math.*

object LandingInertia {
    fun offset(progress: Double, height: Double, strength: Double, dx: Double, dy: Double): Point2D.Double {
        val distance = hypot(dx, dy)
        if (progress !in 0.0..<1.0 || distance < 0.001) return Point2D.Double()
        fun ease(t: Double) = t * t * (3 - 2 * t)
        val wave = when {
            progress < 0.28 -> ease(progress / 0.28)
            progress < 0.65 -> 1.0 - 1.28 * ease((progress - 0.28) / 0.37)
            else -> -0.28 * (1.0 - ease((progress - 0.65) / 0.35))
        }
        val amplitude = min(3.0, height * 0.12) * strength * wave
        return Point2D.Double(dx / distance * amplitude, dy / distance * amplitude)
    }
}
