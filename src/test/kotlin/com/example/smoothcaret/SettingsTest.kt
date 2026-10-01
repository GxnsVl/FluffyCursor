package com.example.smoothcaret

import com.example.smoothcaret.settings.*
import com.intellij.util.xmlb.XmlSerializer
import org.junit.Test
import kotlin.test.*

class SettingsTest {
    @Test fun savedGhostCopiesAreDisabledWithoutChangingCustomColor() {
        val service = SmoothCaretSettings()
        service.loadState(CaretOptions(preset = "Custom", trail = true, useThemeColor = false, color = "#FF4081"))
        assertFalse(service.state.trail)
        assertEquals("#FF4081", service.state.color)
        assertFalse(service.state.useThemeColor)
    }
    @Test fun upgradesOldNeonButPreservesCustomizedGlow() {
        val service = SmoothCaretSettings()
        val old = CaretOptions(preset = "Neon", glowRadius = 10.0, glowOpacity = 0.25, trailLength = 10, trailOpacity = 0.2)
        service.loadState(old)
        assertEquals(12.0, service.state.glowRadius)
        assertEquals(0.35, service.state.glowOpacity)
        assertEquals(12, service.state.trailLength)
        service.loadState(CaretOptions(preset = "Neon", trailLength = 6, trailOpacity = 0.24, trailFadeMs = 120, disableWhileScrolling = false))
        assertEquals(0.45, service.state.trailOpacity)
        assertEquals(1.0, service.state.trailSpacing)
        assertFalse(service.state.disableWhileScrolling)
        service.loadState(old.copy(preset = "Custom"))
        assertEquals(0.25, service.state.glowOpacity)
    }
    @Test fun upgradesOldPresetWidthsAndPreservesCustomWidth() {
        val service = SmoothCaretSettings()
        for ((preset, width) in listOf("Terminal" to 5.0, "Minimal" to 4.0)) {
            service.loadState(CaretOptions(preset = preset, width = width))
            assertEquals(2.0, service.state.width)
        }
        service.loadState(CaretOptions(preset = "Custom", width = 5.0))
        assertEquals(5.0, service.state.width)
    }
    @Test fun serializationRoundTripPreservesCustomizedOptions() {
        val original = CaretOptions(preset = "Custom", color = "#123456", width = 6.5,
            animationMode = AnimationMode.SMOOTH, cursorStyle = CursorStyle.UNDERLINE,
            trail = false, glowColor = "#654321", blink = true, ripple = true)
        val xml = XmlSerializer.serialize(original)
        val restored = XmlSerializer.deserialize(xml, CaretOptions::class.java)
        assertEquals(original, restored)
        val service = SmoothCaretSettings()
        service.loadState(restored)
        assertEquals(original, service.state)
    }
    @Test fun missingFieldsRetainDefaultValues() {
        val xml = org.jdom.Element("state")
        val restored = XmlSerializer.deserialize(xml, CaretOptions::class.java)
        assertEquals(CaretOptions(), restored)
    }
}
