package com.example.smoothcaret.compat

/** Owns a temporary rendering override, preserving the editor's previous state. */
class NativeCaretVisibility(private val setEnabled: (Boolean) -> Boolean) {
    private var previousEnabled: Boolean? = null
    fun update(hide: Boolean) {
        if (hide) {
            if (previousEnabled == null) previousEnabled = setEnabled(false)
        } else {
            val previous = previousEnabled ?: return
            setEnabled(previous)
            previousEnabled = null
        }
    }
}
