package com.example.smoothcaret.animation
import com.example.smoothcaret.settings.*
import kotlin.math.*
class AnimationState(var x: Double, var y: Double) {
    var vx = 0.0; var vy = 0.0
    var targetX = x; var targetY = y
    var jumpDistance = 0.0
    fun snap() { x = targetX; y = targetY; vx = 0.0; vy = 0.0; jumpDistance = 0.0 }
    fun settled() = hypot(x - targetX, y - targetY) < 0.15 && abs(vx) + abs(vy) < 0.15
}
object SmoothAnimator {
    fun step(s: AnimationState, smoothing: Double) {
        s.x += (s.targetX - s.x) * smoothing; s.y += (s.targetY - s.y) * smoothing
        s.vx = 0.0; s.vy = 0.0
    }
}
object SpringAnimator {
    fun step(s: AnimationState, stiffness: Double, damping: Double) {
        s.vx = (s.vx + (s.targetX - s.x) * stiffness) * damping
        s.vy = (s.vy + (s.targetY - s.y) * stiffness) * damping
        s.x += s.vx; s.y += s.vy
    }
}
object CaretAnimator {
    fun step(s: AnimationState, options: CaretOptions, trailing: Boolean = false, elapsedSeconds: Double = 1.0 / 60.0) {
        if (elapsedSeconds <= 0.0) return
        val time = elapsedSeconds * 60.0
        val beforeX = s.targetX - s.x; val beforeY = s.targetY - s.y
        when (options.animationMode) {
            AnimationMode.SMOOTH -> SmoothAnimator.step(s, 1.0 - (1.0 - options.smoothing).pow(time))
            AnimationMode.SPRING -> {
                val stiffness = options.stiffness * if (trailing) 0.85 else 1.0
                springAxis(s, true, stiffness, options.damping, time)
                springAxis(s, false, stiffness, options.damping, time)
            }
        }
        // Navigation lands at the first target crossing; the renderer provides
        // the single forward/back recoil instead of repeated spring oscillation.
        if (s.jumpDistance > 0 && beforeX * (s.targetX - s.x) + beforeY * (s.targetY - s.y) <= 0.0) s.snap()
        else if (s.settled()) s.snap()
    }

    // Exact damped-spring evolution: every repaint gets a new position, without
    // accumulating whole 60 Hz steps or changing motion speed with refresh rate.
    private fun springAxis(s: AnimationState, horizontal: Boolean, stiffness: Double, damping: Double, time: Double) {
        val target = if (horizontal) s.targetX else s.targetY
        val offset = (if (horizontal) s.x else s.y) - target
        val velocity = if (horizontal) s.vx else s.vy
        val decay = -ln(damping) / 2.0
        val discriminant = stiffness * damping - decay * decay
        val envelope = exp(-decay * time)
        val c: Double
        val f: Double
        when {
            discriminant > 1e-10 -> {
                val frequency = sqrt(discriminant)
                c = cos(frequency * time)
                f = sin(frequency * time) / frequency
            }
            discriminant < -1e-10 -> {
                val frequency = sqrt(-discriminant)
                c = cosh(frequency * time)
                f = sinh(frequency * time) / frequency
            }
            else -> { c = 1.0; f = time }
        }
        val position = target + envelope * (offset * c + (velocity + decay * offset) * f)
        val nextVelocity = envelope * (velocity * c - (decay * velocity + stiffness * damping * offset) * f)
        if (horizontal) { s.x = position; s.vx = nextVelocity }
        else { s.y = position; s.vy = nextVelocity }
    }
}
