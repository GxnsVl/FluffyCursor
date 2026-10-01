package com.example.smoothcaret.render

import com.example.smoothcaret.animation.AnimationState
import com.example.smoothcaret.settings.CaretOptions
import com.example.smoothcaret.settings.CursorStyle
import java.awt.*
import java.awt.geom.Path2D
import java.awt.geom.Rectangle2D
import java.awt.geom.AffineTransform
import kotlin.math.*

class TrailRenderer {
    private val xs = DoubleArray(40)
    private val ys = DoubleArray(40)
    private val times = LongArray(40)
    private var head = 0
    private var count = 0
    fun clear() { count = 0 }
    fun add(x: Double, y: Double, now: Long, options: CaretOptions) {
        if (!options.trail) return
        if (count > 0) {
            val last = (head + 39) % 40
            if (hypot(x - xs[last], y - ys[last]) < options.trailSpacing) return
        }
        xs[head] = x; ys[head] = y; times[head] = now
        head = (head + 1) % 40
        count = min(count + 1, options.trailLength)
    }
    fun expire(now: Long, fadeMs: Int) {
        while (count > 0 && now - times[(head - count + 40) % 40] >= fadeMs) count--
    }
    fun active() = count > 0
    fun bounds(width: Double, height: Double): Rectangle? {
        if (count == 0) return null
        var minX = Double.POSITIVE_INFINITY; var minY = minX
        var maxX = Double.NEGATIVE_INFINITY; var maxY = maxX
        for (i in 0 until count) {
            val j = (head - count + i + 40) % 40
            minX = min(minX, xs[j]); minY = min(minY, ys[j])
            maxX = max(maxX, xs[j]); maxY = max(maxY, ys[j])
        }
        return Rectangle(floor(minX).toInt(), floor(minY).toInt(), ceil(maxX - minX + width).toInt() + 2, ceil(maxY - minY + height).toInt() + 2).apply {
            grow(ceil(max(width, height * 0.6) / 2).toInt(), ceil(height / 2).toInt())
        }
    }
    fun paint(g: Graphics2D, now: Long, width: Double, height: Double, color: Color, o: CaretOptions,
              currentX: Double? = null, currentY: Double? = null) {
        if (!o.trail) return
        g.color = color
        if (currentX != null && currentY != null) {
            // Sample the travelled path by distance, rather than drawing a hairline.
            // Short, fading caret silhouettes remain readable at any timer rate.
            val limit = height * 3.0
            val spacing = max(3.0, height * 0.45)
            var travelled = 0.0
            var nextSample = spacing
            var x: Double = currentX; var y: Double = currentY
            for (i in 0 until count) {
                val j = (head - 1 - i + 40) % 40
                val dx = xs[j] - x; val dy = ys[j] - y
                val distance = hypot(dx, dy)
                if (distance < 0.001) continue
                val endDistance = min(limit, travelled + distance)
                val age = (1.0 - (now - times[j]).toDouble() / o.trailFadeMs).coerceIn(0.0, 1.0)
                while (nextSample <= endDistance) {
                    val t = (nextSample - travelled) / distance
                    val strength = 1.0 - nextSample / limit
                    val ghostWidth = width + min(height * 0.6, abs(dx) * 0.25) * strength
                    val ghostHeight = height * (0.75 + 0.25 * strength)
                    g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER,
                        (o.trailOpacity * age * strength).toFloat())
                    g.fill(Rectangle2D.Double(x + dx * t + (width - ghostWidth) / 2,
                        y + dy * t + (height - ghostHeight) / 2, ghostWidth, ghostHeight))
                    nextSample += spacing
                }
                travelled += distance
                x = xs[j]; y = ys[j]
                if (travelled >= limit) break
            }
            return
        }
        for (i in 0 until count) {
            val j = (head - count + i + 40) % 40
            val alpha = o.trailOpacity * (1.0 - (now - times[j]).toDouble() / o.trailFadeMs).coerceIn(0.0, 1.0)
            g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, alpha.toFloat())
            g.fill(Rectangle2D.Double(xs[j], ys[j], width, height))
        }
    }
}

object GlowRenderer {
    private val strokes = Array(20) { BasicStroke(((it + 1) * 2).toFloat(), BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND) }
    fun paint(g: Graphics2D, shape: Shape, color: Color, radius: Double, opacity: Double) {
        g.color = color
        val steps = ceil(radius).toInt().coerceIn(1, 20)
        for (i in steps downTo 1) {
            g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, (opacity / steps * (steps - i + 1) / steps).toFloat())
            g.stroke = strokes[i - 1]
            g.draw(shape)
        }
    }
}

class CaretRenderer {
    private val shape = Path2D.Double()
    fun paint(g: Graphics2D, top: AnimationState, bottom: AnimationState, width: Double, height: Double,
              color: Color, glowColor: Color, glowRadius: Double, options: CaretOptions, visible: Boolean,
              landingProgress: Double = 1.0, effectStrength: Double = 1.0,
              landingDx: Double = 1.0, landingDy: Double = 0.0) {
        if (!visible) return
        shape.reset()
        if (options.cursorStyle == CursorStyle.UNDERLINE) {
            shape.append(Rectangle2D.Double(bottom.x, bottom.y + height - 2, width, 2.0), false)
        } else if (options.cursorStyle == CursorStyle.LINE || options.cursorStyle == CursorStyle.THICK_LINE) {
            // One silhouette: no separately lagging thin edge or overlapping body.
            MotionCaretShape.write(top, width, height, effectStrength, shape)
        } else {
            if (!options.useThemeColor) {
                val velocity = hypot(top.vx, top.vy)
                if (velocity > 0.01) {
                    val stretch = min(height * 0.65, velocity * 0.3)
                    val dx = -top.vx / velocity * stretch
                    val dy = -top.vy / velocity * stretch
                    shape.append(Rectangle2D.Double(top.x + min(0.0, dx), top.y + min(0.0, dy),
                        width + abs(dx), height + abs(dy)), false)
                }
            }
            shape.moveTo(top.x, top.y); shape.lineTo(top.x + width, top.y)
            shape.lineTo(bottom.x + width, bottom.y + height); shape.lineTo(bottom.x, bottom.y + height); shape.closePath()
        }
        if (landingProgress in 0.0..<1.0) {
            val offset = LandingInertia.offset(landingProgress, height, effectStrength, landingDx, landingDy)
            shape.transform(AffineTransform.getTranslateInstance(offset.x, offset.y))
        }
        if (options.glow && glowRadius > 0) GlowRenderer.paint(g, shape, glowColor, glowRadius, options.glowOpacity)
        g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, options.opacity.toFloat())
        g.color = color; g.fill(shape)
    }

    fun effects(g: Graphics2D, x: Double, y: Double, width: Double, height: Double, progress: Double, color: Color, o: CaretOptions) {
        if (progress !in 0.0..1.0) return
        g.color = color
        g.composite = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, ((1.0 - progress) * 0.35).toFloat())
        val cx = x + width / 2; val cy = y + height / 2
        if (o.landingPulse) g.fill(Rectangle2D.Double(x - progress * 3, y - progress * 3, width + progress * 6, height + progress * 6))
        if (o.ripple) {
            val r = progress * 24
            g.stroke = BasicStroke(1f); g.draw(java.awt.geom.Ellipse2D.Double(cx - r, cy - r, r * 2, r * 2))
        }
        if (o.particles) for (i in 0 until 8) {
            val a = i * PI / 4; val r = progress * 24
            g.fill(java.awt.geom.Ellipse2D.Double(cx + cos(a) * r, cy + sin(a) * r + progress * progress * 8, 2.0, 2.0))
        }
    }
}
