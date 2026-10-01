package com.example.smoothcaret
import com.example.smoothcaret.compat.NativeCaretVisibility
import org.junit.Test
import kotlin.test.*
class NativeCaretVisibilityTest {
    @Test fun hidesOnceAndRestoresOnFallback() {
        var enabled = true
        val calls = mutableListOf<Boolean>()
        val visibility = NativeCaretVisibility { value ->
            calls.add(value)
            val previous = enabled; enabled = value; previous
        }
        visibility.update(true); visibility.update(true)
        assertFalse(enabled); assertEquals(listOf(false), calls)
        visibility.update(false); visibility.update(false)
        assertTrue(enabled); assertEquals(listOf(false, true), calls)
        visibility.update(true); visibility.update(false)
        assertTrue(enabled)
    }
    @Test fun preservesAlreadyDisabledNativeCaret() {
        var enabled = false
        val visibility = NativeCaretVisibility { value -> val old = enabled; enabled = value; old }
        visibility.update(true); visibility.update(false)
        assertFalse(enabled)
    }
}
