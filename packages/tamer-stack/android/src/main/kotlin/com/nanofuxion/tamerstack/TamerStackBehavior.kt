package com.nanofuxion.tamerstack

import com.lynx.tasm.behavior.Behavior
import com.lynx.tasm.behavior.LynxContext
import com.lynx.tasm.behavior.shadow.ShadowNode
import com.lynx.tasm.behavior.ui.LynxUI

/**
 * Full Behavior registration for <stack-screen> that pairs UI and ShadowNode.
 *
 * Using a custom Behavior subclass is necessary because the autolinker's elements
 * registration only provides createUI(). We need createShadowNode() as well so
 * the layout engine measures children at screen dimensions rather than 0x0.
 */
class TamerStackBehavior : Behavior("stack-screen") {

    override fun createUI(context: LynxContext): LynxUI<*> = TamerStackElement(context)

    override fun createShadowNode(): ShadowNode = TamerStackShadowNode()
}
