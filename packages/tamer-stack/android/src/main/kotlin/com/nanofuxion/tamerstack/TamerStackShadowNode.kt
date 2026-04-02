package com.nanofuxion.tamerstack

import com.lynx.tasm.behavior.shadow.AlignContext
import com.lynx.tasm.behavior.shadow.AlignParam
import com.lynx.tasm.behavior.shadow.CustomMeasureFunc
import com.lynx.tasm.behavior.shadow.MeasureContext
import com.lynx.tasm.behavior.shadow.MeasureMode
import com.lynx.tasm.behavior.shadow.MeasureParam
import com.lynx.tasm.behavior.shadow.MeasureResult
import com.lynx.tasm.behavior.shadow.NativeLayoutNodeRef
import com.lynx.tasm.behavior.shadow.ShadowNode
import com.lynx.tasm.utils.DisplayMetricsHolder

/**
 * Zero-size shadow node for <stack-screen>.
 *
 * The element takes no space in the parent Lynx layout — its single child is measured
 * at full screen dimensions so the promoted native container can fill the screen.
 * Registered via [TamerStackBehavior.createShadowNode] rather than annotation.
 */
open class TamerStackShadowNode : ShadowNode(), CustomMeasureFunc {

    init {
        setCustomMeasureFunc(this)
    }

    override fun measure(param: MeasureParam?, context: MeasureContext?): MeasureResult {
        if (childCount > 0) {
            val firstChild = getChildAt(0)
            if (firstChild is NativeLayoutNodeRef) {
                val metrics = DisplayMetricsHolder.getRealScreenDisplayMetrics(mContext)
                val childParam = MeasureParam().apply {
                    mWidth = metrics.widthPixels.toFloat()
                    mHeight = metrics.heightPixels.toFloat()
                    mWidthMode = MeasureMode.EXACTLY
                    mHeightMode = MeasureMode.EXACTLY
                }
                firstChild.measureNativeNode(context, childParam)
            }
        }
        return MeasureResult(0f, 0f)
    }

    override fun align(param: AlignParam?, context: AlignContext?) {
        if (childCount > 0) {
            val firstChild = getChildAt(0)
            if (firstChild is NativeLayoutNodeRef) {
                firstChild.alignNativeNode(context, AlignParam())
            }
        }
    }
}
