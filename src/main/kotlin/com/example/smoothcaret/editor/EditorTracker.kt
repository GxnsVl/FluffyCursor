package com.example.smoothcaret.editor
import com.example.smoothcaret.compat.IdeCompatibility
import com.example.smoothcaret.settings.SmoothCaretSettings
import com.example.smoothcaret.settings.SettingsListener
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.openapi.editor.colors.EditorColorsListener
import com.intellij.openapi.editor.event.EditorFactoryEvent
import com.intellij.openapi.editor.event.EditorFactoryListener
import com.intellij.openapi.util.Disposer
import java.util.IdentityHashMap

class EditorTracker : Disposable {
    private val controllers = IdentityHashMap<Editor, CaretTracker>()
    private var started = false
    fun start() {
        if (started) return
        started = true
        val factory = EditorFactory.getInstance()
        factory.addEditorFactoryListener(object : EditorFactoryListener {
            override fun editorCreated(event: EditorFactoryEvent) { attach(event.editor) }
            override fun editorReleased(event: EditorFactoryEvent) { controllers.remove(event.editor)?.let(Disposer::dispose) }
        }, this)
        val connection = ApplicationManager.getApplication().messageBus.connect(this)
        connection.subscribe(SmoothCaretSettings.TOPIC, SettingsListener { refresh() })
        connection.subscribe(LafManagerListener.TOPIC, LafManagerListener { refresh() })
        connection.subscribe(EditorColorsManager.TOPIC, EditorColorsListener { refresh() })
        factory.allEditors.forEach(::attach)
    }
    private fun attach(editor: Editor) {
        if (editor.isDisposed || !IdeCompatibility.supports(editor) || controllers.containsKey(editor)) return
        val controller = CaretTracker(editor)
        controllers[editor] = controller
        Disposer.register(this, controller)
    }
    private fun refresh() {
        ApplicationManager.getApplication().invokeLater { controllers.values.forEach { it.refresh() } }
    }
    override fun dispose() { controllers.clear() }
}
