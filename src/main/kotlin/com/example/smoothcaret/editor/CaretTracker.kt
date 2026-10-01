package com.example.smoothcaret.editor

import com.example.smoothcaret.animation.*
import com.example.smoothcaret.compat.IdeCompatibility
import com.example.smoothcaret.compat.NativeCaretVisibility
import com.example.smoothcaret.render.*
import com.example.smoothcaret.settings.*
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.*
import com.intellij.openapi.editor.ex.EditorEx
import com.intellij.openapi.editor.colors.EditorColors
import com.intellij.openapi.editor.event.*
import com.intellij.openapi.ui.Painter
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.IdeGlassPane
import com.intellij.ui.scale.JBUIScale
import java.awt.*
import java.awt.event.*
import java.beans.PropertyChangeListener
import java.util.IdentityHashMap
import javax.swing.*
import kotlin.math.*

private class RenderedCaret(x: Double, y: Double) {
    val top = AnimationState(x, y)
    val bottom = AnimationState(x, y)
    val trail = TrailRenderer()
    var width = 2.0
    var startedAt = 0L
    var effectAt = 0L
    var jellyAt = 0L
    var typing = false
    var landingDx = 1.0
    var landingDy = 0.0
    var moving = false
    fun snap() { top.snap(); bottom.snap(); moving = false; trail.clear(); effectAt = 0; jellyAt = 0 }
}

class CaretTracker(private val editor: Editor) : Disposable {
    private val content = editor.contentComponent
    private val nativeCaret = (editor as? EditorEx)?.let { extended ->
        NativeCaretVisibility { enabled ->
            val previous = extended.setCaretEnabled(enabled)
            repaintNativeCarets()
            previous
        }
    }
    private val states = IdentityHashMap<Caret, RenderedCaret>()
    private val renderer = CaretRenderer()
    private var options = SmoothCaretSettings.instance().state.copy()
    private var glass: JComponent? = null
    private var painterScope: Disposable? = null
    private var disposed = false
    private var queued = false
    private var typingQueued = false
    private var blinkVisible = true
    private var lastFrame = 0L
    private var lastBounds: Rectangle? = null
    private val motionTimer = Timer(5) { frame() }.apply { isCoalesce = true }
    private val blinkTimer = Timer(options.blinkMs) { blinkVisible = !blinkVisible; repaintRegion() }
    private val focus = object : FocusAdapter() {
        override fun focusGained(e: FocusEvent) { refresh() }
        override fun focusLost(e: FocusEvent) { stop(); repaintRegion() }
    }
    private val hierarchy = HierarchyListener { refresh() }
    private val layout = object : ComponentAdapter() {
        override fun componentResized(e: ComponentEvent) { schedule(true) }
        override fun componentShown(e: ComponentEvent) { refresh() }
        override fun componentHidden(e: ComponentEvent) { stop(); repaintRegion() }
    }
    private val property = PropertyChangeListener { if (it.propertyName == "font") schedule(true) }
    private val painter = object : Painter {
        override fun needsRepaint() = true
        override fun addListener(listener: Painter.Listener) {}
        override fun removeListener(listener: Painter.Listener) {}
        override fun paint(component: Component, graphics: Graphics2D) { paintOverlay(graphics) }
    }

    init {
        editor.caretModel.addCaretListener(object : CaretListener {
            override fun caretPositionChanged(event: CaretEvent) { schedule() }
            override fun caretAdded(event: CaretEvent) { schedule() }
            override fun caretRemoved(event: CaretEvent) { schedule() }
        }, this)
        editor.document.addDocumentListener(object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) { typingQueued = true; schedule() }
        }, this)
        editor.scrollingModel.addVisibleAreaListener(VisibleAreaListener {
            // Visible-area changes include font/layout changes. Repaint the old screen bounds too.
            schedule(options.disableWhileScrolling)
        }, this)
        content.addFocusListener(focus); content.addHierarchyListener(hierarchy)
        content.addComponentListener(layout); content.addPropertyChangeListener(property)
        refresh()
    }

    private var snapQueued = false
    private fun schedule(snap: Boolean = false) {
        if (!SwingUtilities.isEventDispatchThread()) {
            ApplicationManager.getApplication().invokeLater { if (!disposed) schedule(snap) }
            return
        }
        snapQueued = snapQueued || snap
        if (queued || disposed) return
        queued = true
        ApplicationManager.getApplication().invokeLater {
            queued = false
            if (!disposed && !editor.isDisposed) {
                val shouldSnap = snapQueued; snapQueued = false
                val typing = typingQueued; typingQueued = false
                syncTargets(shouldSnap, typing)
            }
        }
    }

    fun refresh() {
        if (disposed || editor.isDisposed) return
        options = SmoothCaretSettings.instance().state.copy()
        val newGlass = IdeCompatibility.glass(editor)
        if (glass !== newGlass) {
            repaintRegion()
            painterScope?.let(Disposer::dispose)
            painterScope = null; glass = newGlass
            if (newGlass != null) {
                val scope = Disposer.newDisposable("Smooth caret painter")
                Disposer.register(this, scope); painterScope = scope
                (newGlass as IdeGlassPane).addPainter(content, painter, scope)
            }
        }
        states.values.forEach { it.snap() }
        blinkTimer.delay = options.blinkMs
        syncTargets(true)
    }

    private fun active() = !disposed && !editor.isDisposed && options.enabled && content.isShowing && content.hasFocus() && glass != null
    private fun repaintNativeCarets() {
        // setCaretEnabled changes a rendering flag without invalidating its old pixels.
        // Invalidate the real caret positions as well as our animated positions.
        if (editor.isDisposed) return
        for (caret in editor.caretModel.allCarets) {
            val position = caret.visualPosition
            val point = editor.visualPositionToXY(position)
            val next = editor.visualPositionToXY(VisualPosition(position.line, position.column + 1))
            val width = max(abs(next.x - point.x), JBUIScale.scale(editor.settings.lineCursorWidth))
            content.repaint(point.x - width - 2, point.y - 2, width * 3 + 4, editor.lineHeight + 4)
        }
    }
    private fun syncTargets(forceSnap: Boolean, typing: Boolean = false) {
        val now = System.nanoTime() / 1_000_000
        val carets = editor.caretModel.allCarets
        states.keys.removeIf { it !in carets }
        val height = editor.lineHeight.toDouble()
        for (caret in carets) {
            val point = editor.visualPositionToXY(caret.visualPosition)
            val s = states.getOrPut(caret) { RenderedCaret(point.x.toDouble(), point.y.toDouble()) }
            val next = editor.visualPositionToXY(VisualPosition(caret.visualPosition.line, caret.visualPosition.column + 1))
            val cellWidth = abs(next.x - point.x).toDouble().takeIf { it > 0 } ?: height * 0.5
            s.width = when (options.cursorStyle) {
                CursorStyle.LINE -> JBUIScale.scale(1f).toDouble()
                CursorStyle.THICK_LINE -> JBUIScale.scale(options.width.toFloat()).toDouble()
                CursorStyle.BLOCK, CursorStyle.UNDERLINE -> cellWidth
            }
            val left = CaretGeometry.left(point.x.toDouble(), s.width, options.cursorStyle)
            val changed = s.top.targetX != left || s.top.targetY != point.y.toDouble()
            s.top.targetX = left; s.top.targetY = point.y.toDouble()
            s.bottom.targetX = s.top.targetX; s.bottom.targetY = s.top.targetY
            val distance = hypot(s.top.x - s.top.targetX, s.top.y - s.top.targetY)
            if (changed && distance > 0.001) {
                s.landingDx = (s.top.targetX - s.top.x) / distance
                s.landingDy = (s.top.targetY - s.top.y) / distance
            }
            if (forceSnap || !active() || distance > options.snapDistance || (options.reduceSmallMovements && distance < 2)) s.snap()
            else if (changed) { s.typing = typing; s.top.jumpDistance = distance; s.bottom.jumpDistance = distance; s.startedAt = now; s.moving = true; s.effectAt = 0; s.jellyAt = 0 }
        }
        blinkVisible = true
        nativeCaret?.update(active() && options.hideNativeCaret)
        if (active()) {
            if (options.blink) blinkTimer.restart() else blinkTimer.stop()
            if (states.values.any { it.moving || it.trail.active() }) startMotion()
        } else stop()
        repaintRegion()
    }

    private fun startMotion() {
        if (!motionTimer.isRunning) { lastFrame = System.nanoTime(); motionTimer.start() }
    }
    private fun stop() {
        motionTimer.stop(); blinkTimer.stop()
        if (!editor.isDisposed) nativeCaret?.update(false)
    }
    private fun frame() {
        if (!active()) { stop(); repaintRegion(); return }
        val nano = System.nanoTime(); val now = nano / 1_000_000
        val elapsedSeconds = ((nano - lastFrame) / 1_000_000_000.0).coerceIn(0.0, 0.05) * options.speed
        lastFrame = nano
        var running = false
        for (s in states.values) {
            if (s.moving) {
                s.trail.add(s.top.x, s.top.y, now, options)
                val stepTime = elapsedSeconds * if (s.typing) 3.0 else 1.0
                CaretAnimator.step(s.top, options, elapsedSeconds = stepTime)
                CaretAnimator.step(s.bottom, options, true, stepTime)
                val duration = if (s.typing) min(options.maxDurationMs, 70) else options.maxDurationMs
                if ((s.top.settled() && s.bottom.settled()) || now - s.startedAt >= duration) {
                    s.top.snap(); s.bottom.snap(); s.moving = false
                    if (options.animationMode == AnimationMode.SPRING) s.jellyAt = now
                    if (options.landingPulse || options.ripple || options.particles) s.effectAt = now
                }
            }
            s.trail.expire(now, options.trailFadeMs)
            if (s.effectAt > 0 && now - s.effectAt >= 250) s.effectAt = 0
            if (s.jellyAt > 0 && now - s.jellyAt >= if (s.typing) 120 else 260) s.jellyAt = 0
            running = running || s.moving || s.trail.active() || s.effectAt > 0 || s.jellyAt > 0
        }
        repaintRegion()
        if (!running) motionTimer.stop()
    }

    private fun bounds(): Rectangle? {
        var result: Rectangle? = null
        val h = editor.lineHeight.toDouble()
        val margin = ceil(JBUIScale.scale(options.glowRadius.toFloat())).toInt() +
            if (options.ripple || options.particles) 40 else max(6, ceil(h * 1.0).toInt())
        for (s in states.values) {
            val r = Rectangle(floor(min(s.top.x, s.bottom.x)).toInt(), floor(min(s.top.y, s.bottom.y)).toInt(),
                ceil(abs(s.top.x - s.bottom.x) + s.width).toInt() + 2, ceil(abs(s.top.y - s.bottom.y) + h).toInt() + 2)
            s.trail.bounds(s.width, h)?.let { r.add(it) }; r.grow(margin, margin)
            if (result == null) result = r else result.add(r)
        }
        return result
    }
    private fun repaintRegion() {
        val target = glass ?: return
        val current = if (content.isShowing && !editor.isDisposed) bounds()?.intersection(editor.scrollingModel.visibleArea)
            ?.takeIf { !it.isEmpty }?.let { SwingUtilities.convertRectangle(content, it, target) } else null
        val dirty = lastBounds?.let { Rectangle(it) }
        if (current != null) {
            if (dirty == null) target.repaint(current.x, current.y, current.width, current.height)
            else dirty.add(current)
        }
        if (dirty != null) target.repaint(dirty.x, dirty.y, dirty.width, dirty.height)
        lastBounds = current
    }

    private fun paintOverlay(graphics: Graphics2D) {
        if (!active()) return
        val g = graphics.create() as Graphics2D
        try {
            g.clip(editor.scrollingModel.visibleArea)
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            val color = if (options.useThemeColor) editor.colorsScheme.getColor(EditorColors.CARET_COLOR) ?: editor.colorsScheme.defaultForeground else decode(options.color)
            val glowColor = if (options.glowUsesCursorColor) color else decode(options.glowColor)
            val now = System.nanoTime() / 1_000_000
            for (s in states.values) {
                s.trail.paint(g, now, s.width, editor.lineHeight.toDouble(), color, options, s.top.x, s.top.y)
                renderer.paint(g, s.top, s.bottom, s.width, editor.lineHeight.toDouble(), color, glowColor,
                    JBUIScale.scale(options.glowRadius.toFloat()).toDouble(), options, blinkVisible || s.moving,
                    if (s.jellyAt > 0) (now - s.jellyAt) / (if (s.typing) 120.0 else 260.0) else 1.0,
                    if (s.typing) 0.25 else 1.0, s.landingDx, s.landingDy)
                if (s.effectAt > 0) renderer.effects(g, s.top.x, s.top.y, s.width, editor.lineHeight.toDouble(), (now - s.effectAt) / 250.0, color, options)
            }
        } finally { g.dispose() }
    }
    private fun decode(value: String) = try { Color.decode(value) } catch (_: NumberFormatException) { Color.CYAN }
    override fun dispose() {
        disposed = true; stop(); repaintRegion()
        content.removeFocusListener(focus); content.removeHierarchyListener(hierarchy)
        content.removeComponentListener(layout); content.removePropertyChangeListener(property)
        states.clear()
    }
}
