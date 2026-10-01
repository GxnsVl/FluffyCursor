package com.example.smoothcaret.render

import com.example.smoothcaret.settings.CursorStyle

object CaretGeometry {
    // Vertical carets straddle the insertion boundary; block/underline occupy the cell.
    fun left(insertionX: Double, width: Double, style: CursorStyle): Double = when (style) {
        CursorStyle.LINE, CursorStyle.THICK_LINE -> insertionX - width / 2.0
        CursorStyle.BLOCK, CursorStyle.UNDERLINE -> insertionX
    }
}
