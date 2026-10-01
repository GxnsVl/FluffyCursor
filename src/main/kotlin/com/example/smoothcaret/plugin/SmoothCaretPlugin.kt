package com.example.smoothcaret.plugin
import com.example.smoothcaret.editor.EditorTracker
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity
class SmoothCaretPlugin : StartupActivity.DumbAware {
    override fun runActivity(project: Project) {
        ApplicationManager.getApplication().invokeLater {
            if (!project.isDisposed) ApplicationManager.getApplication().getService(EditorTracker::class.java).start()
        }
    }
}
