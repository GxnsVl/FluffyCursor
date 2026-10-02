package com.example.smoothcaret.settings

import com.example.smoothcaret.presets.PresetManager
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.options.ConfigurationException
import java.awt.BorderLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.Insets
import java.awt.Color
import javax.swing.*

private class Binding(val read: (CaretOptions) -> Unit, val write: (CaretOptions) -> Unit)

class SmoothCaretSettingsComponent {
    val panel = JPanel(BorderLayout())
    private val tabs = JTabbedPane()
    private val bindings = mutableListOf<Binding>()
    private val preset = JComboBox(PresetManager.names)
    private var loading = false
    private var row = 0
    private lateinit var section: JPanel

    init {
        val top = JPanel().apply { add(JLabel("Preset:")); add(preset) }
        panel.add(top, BorderLayout.NORTH); panel.add(tabs, BorderLayout.CENTER)
        panel.add(JLabel("<html><small>Open source · MIT license · Kotlin + IntelliJ Platform APIs<br>Changes apply when you click Apply. The native caret is restored when disabled.</small></html>"), BorderLayout.SOUTH)
        newSection("General")
        help("Start with Neon for a brighter look, or Terminal for a quieter caret. Choose a color below, then click Apply.")
        check("Enable Fluffy Cursor", { enabled }, { enabled = it })
        check("Hide native caret (when supported)", { hideNativeCaret }, { hideNativeCaret = it })
        combo("Animation", AnimationMode.entries.toTypedArray(), { animationMode }, { animationMode = it })
        combo("Cursor style", CursorStyle.entries.toTypedArray(), { cursorStyle }, { cursorStyle = it })
        check("Use theme caret color", { useThemeColor }, { useThemeColor = it })
        text("Custom caret color (#RRGGBB)", { color }, { color = it })
        number("Width (logical px)", 1.0, 30.0, 0.5, { width }, { width = it })
        number("Opacity", 0.05, 1.0, 0.05, { opacity }, { opacity = it })
        check("Blink overlay", { blink }, { blink = it })
        integer("Blink interval (ms)", 100, 3000, 50, { blinkMs }, { blinkMs = it })
        newSection("Animation")
        help("Higher stiffness feels sharper. Typing automatically uses a faster, lighter effect; landing recoil follows the movement direction.")
        number("Smooth interpolation factor", 0.01, 1.0, 0.01, { smoothing }, { smoothing = it })
        number("Animation speed", 0.1, 4.0, 0.1, { speed }, { speed = it })
        number("Spring stiffness", 0.01, 0.5, 0.01, { stiffness }, { stiffness = it })
        number("Spring damping", 0.1, 0.95, 0.01, { damping }, { damping = it })
        integer("Maximum animation duration (ms)", 16, 2000, 10, { maxDurationMs }, { maxDurationMs = it })
        number("Snap distance (editor px)", 10.0, 10000.0, 10.0, { snapDistance }, { snapDistance = it })
        check("Reduce animation for small movements", { reduceSmallMovements }, { reduceSmallMovements = it })
        check("Snap and clear trail while scrolling", { disableWhileScrolling }, { disableWhileScrolling = it })
        newSection("Trail and glow")
        help("Glow adds a soft halo. Trail creates separate fading copies; the short directional stretch works without enabling trail.")
        check("Enable trail", { trail }, { trail = it })
        integer("Trail length (samples)", 1, 40, 1, { trailLength }, { trailLength = it })
        number("Trail opacity", 0.0, 1.0, 0.01, { trailOpacity }, { trailOpacity = it })
        integer("Trail fade duration (ms)", 16, 2000, 10, { trailFadeMs }, { trailFadeMs = it })
        number("Trail spacing (editor px)", 1.0, 50.0, 1.0, { trailSpacing }, { trailSpacing = it })
        check("Enable glow", { glow }, { glow = it })
        number("Glow radius (logical px)", 0.0, 20.0, 0.5, { glowRadius }, { glowRadius = it })
        number("Glow opacity", 0.0, 1.0, 0.01, { glowOpacity }, { glowOpacity = it })
        check("Use cursor color for glow", { glowUsesCursorColor }, { glowUsesCursorColor = it })
        text("Glow color (#RRGGBB)", { glowColor }, { glowColor = it })
        newSection("Optional effects")
        help("Keep these off for a distraction-free editor. Presets leave all optional effects disabled.")
        check("Landing pulse", { landingPulse }, { landingPulse = it })
        check("Ripple", { ripple }, { ripple = it })
        check("Particles / sparks", { particles }, { particles = it })
        addRow("", JLabel("All optional effects are OFF in every preset."))
        preset.addActionListener {
            if (!loading && preset.selectedItem != "Custom") load(PresetManager.create(preset.selectedItem as String))
        }
    }
    private fun edited() { if (!loading) preset.selectedItem = "Custom" }
    private fun help(message: String) {
        val label = JLabel("<html><div style='width:380px'>$message</div></html>")
        section.add(label, GridBagConstraints().apply { gridx = 0; gridy = row++; gridwidth = 2; weightx = 1.0; fill = GridBagConstraints.HORIZONTAL; insets = Insets(10, 10, 14, 10) })
    }
    private fun newSection(name: String) {
        section = JPanel(GridBagLayout()); row = 0
        val wrapper = JPanel(BorderLayout()).apply { add(section, BorderLayout.NORTH) }
        tabs.addTab(name, JScrollPane(wrapper).apply { border = BorderFactory.createEmptyBorder() })
    }
    private fun addRow(label: String, input: JComponent) {
        section.add(JLabel(label), GridBagConstraints().apply { gridx = 0; gridy = row; anchor = GridBagConstraints.WEST; insets = Insets(5, 10, 5, 10) })
        section.add(input, GridBagConstraints().apply { gridx = 1; gridy = row++; weightx = 1.0; fill = GridBagConstraints.HORIZONTAL; insets = Insets(5, 10, 5, 10) })
    }
    private fun check(label: String, get: CaretOptions.() -> Boolean, set: CaretOptions.(Boolean) -> Unit) {
        val c = JCheckBox(); addRow(label, c); c.addActionListener { edited() }
        bindings.add(Binding({ c.isSelected = it.get() }, { it.set(c.isSelected) }))
    }
    private fun number(label: String, min: Double, max: Double, step: Double, get: CaretOptions.() -> Double, set: CaretOptions.(Double) -> Unit) {
        val c = JSpinner(SpinnerNumberModel(min, min, max, step)); addRow(label, c); c.addChangeListener { edited() }
        bindings.add(Binding({ c.value = it.get() }, { c.commitEdit(); it.set((c.value as Number).toDouble()) }))
    }
    private fun integer(label: String, min: Int, max: Int, step: Int, get: CaretOptions.() -> Int, set: CaretOptions.(Int) -> Unit) {
        val c = JSpinner(SpinnerNumberModel(min, min, max, step)); addRow(label, c); c.addChangeListener { edited() }
        bindings.add(Binding({ c.value = it.get() }, { c.commitEdit(); it.set((c.value as Number).toInt()) }))
    }
    private fun text(label: String, get: CaretOptions.() -> String, set: CaretOptions.(String) -> Unit) {
        val c = JTextField(12)
        val chooser = JButton("Choose color…")
        val input = JPanel(BorderLayout(8, 0)).apply { add(c, BorderLayout.CENTER); add(chooser, BorderLayout.EAST) }
        addRow(label, input)
        c.toolTipText = "Use #RRGGBB, for example #FFFFFF for white. Custom caret color requires theme color to be off."
        chooser.addActionListener {
            val initial = try { Color.decode(c.text) } catch (_: NumberFormatException) { Color.CYAN }
            JColorChooser.showDialog(panel, "Choose color", initial)?.let { c.text = "#%02X%02X%02X".format(it.red, it.green, it.blue) }
        }
        c.document.addDocumentListener(object : javax.swing.event.DocumentListener {
            override fun insertUpdate(e: javax.swing.event.DocumentEvent) { edited() }
            override fun removeUpdate(e: javax.swing.event.DocumentEvent) { edited() }
            override fun changedUpdate(e: javax.swing.event.DocumentEvent) { edited() }
        })
        bindings.add(Binding({ c.text = it.get() }, { it.set(c.text.trim()) }))
    }
    private fun <T> combo(label: String, values: Array<T>, get: CaretOptions.() -> T, set: CaretOptions.(T) -> Unit) {
        val c = JComboBox(values); addRow(label, c); c.addActionListener { edited() }
        c.renderer = object : DefaultListCellRenderer() {
            override fun getListCellRendererComponent(list: JList<*>?, value: Any?, index: Int, isSelected: Boolean, cellHasFocus: Boolean): java.awt.Component {
                val display = if (value is Enum<*>) value.name.lowercase().replace('_', ' ').replaceFirstChar { it.titlecase() } else value
                return super.getListCellRendererComponent(list, display, index, isSelected, cellHasFocus)
            }
        }
        bindings.add(Binding({ c.selectedItem = it.get() }, {
            @Suppress("UNCHECKED_CAST")
            it.set(c.selectedItem as T)
        }))
    }
    fun load(options: CaretOptions) {
        loading = true
        try { preset.selectedItem = options.preset; bindings.forEach { it.read(options) } } finally { loading = false }
    }
    fun read(): CaretOptions = CaretOptions().also { options ->
        options.preset = preset.selectedItem as String; bindings.forEach { it.write(options) }
    }.normalized()
}

class SmoothCaretConfigurable : Configurable {
    private var ui: SmoothCaretSettingsComponent? = null
    override fun getDisplayName() = "Fluffy Cursor"
    override fun createComponent(): JComponent = SmoothCaretSettingsComponent().also { ui = it; it.load(SmoothCaretSettings.instance().state) }.panel
    override fun isModified(): Boolean = try { ui?.read()?.let { it != SmoothCaretSettings.instance().state } ?: false } catch (_: java.text.ParseException) { true }
    override fun apply() {
        val options = try { ui?.read() ?: return } catch (_: java.text.ParseException) { throw ConfigurationException("Enter a valid numeric value.") }
        if (!Regex("#[0-9a-fA-F]{6}").matches(options.color) || !Regex("#[0-9a-fA-F]{6}").matches(options.glowColor))
            throw ConfigurationException("Colors must use #RRGGBB format.")
        SmoothCaretSettings.instance().update(options)
    }
    override fun reset() { ui?.load(SmoothCaretSettings.instance().state) }
    override fun disposeUIResources() { ui = null }
}
