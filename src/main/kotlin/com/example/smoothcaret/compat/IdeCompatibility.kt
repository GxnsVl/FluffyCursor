package com.example.smoothcaret.compat
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.editor.EditorKind
import com.intellij.openapi.wm.IdeGlassPane
import javax.swing.JComponent
import javax.swing.SwingUtilities
object IdeCompatibility {
    fun supports(editor: Editor) = !editor.isViewer && !editor.isOneLineMode && editor.editorKind == EditorKind.MAIN_EDITOR
    fun glass(editor: Editor): JComponent? =
        (SwingUtilities.getRootPane(editor.contentComponent)?.glassPane as? JComponent)?.takeIf { it is IdeGlassPane }
}
