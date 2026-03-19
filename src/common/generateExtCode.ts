import { getAndroidModuleClassNames } from './config';
import type { DiscoveredModule } from './discoverModules';

export function generateLynxExtensionsKotlin(packages: DiscoveredModule[], projectPackage: string): string {
    const modulePackages = packages.filter((p) => getAndroidModuleClassNames(p.config.android).length > 0);
    const elementPackages = packages.filter((p) => p.config.android?.elements && Object.keys(p.config.android.elements).length > 0);

    const seenNames = new Set<string>();
    const allModuleClasses = modulePackages.flatMap((p) => getAndroidModuleClassNames(p.config.android))
        .filter((fullClassName) => {
            const simple = fullClassName.split('.').pop()!;
            if (seenNames.has(simple)) return false;
            seenNames.add(simple);
            return true;
        });
    const moduleImports = allModuleClasses.map((c) => `import ${c}`).join('\n');
    const elementImports = elementPackages
        .flatMap((p) => Object.values(p.config.android!.elements!).map((cls) => `import ${cls}`))
        .filter((v, i, a) => a.indexOf(v) === i)
        .join('\n');

    const moduleRegistrations = allModuleClasses
        .map((fullClassName) => {
            const simpleClassName = fullClassName.split('.').pop()!;
            return `        LynxEnv.inst().registerModule("${simpleClassName}", ${simpleClassName}::class.java)`;
        })
        .join('\n');

    const behaviorRegistrations = elementPackages
        .flatMap((p) =>
            Object.entries(p.config.android!.elements!).map(([tag, fullClassName]) => {
                const simpleClassName = fullClassName.split('.').pop()!;
                return `        LynxEnv.inst().addBehavior(object : com.lynx.tasm.behavior.Behavior("${tag}") {
            override fun createUI(context: com.lynx.tasm.behavior.LynxContext): com.lynx.tasm.behavior.ui.LynxUI<*> {
                return ${simpleClassName}(context)
            }
        })`;
            })
        )
        .join('\n');

    const allRegistrations = [moduleRegistrations, behaviorRegistrations].filter(Boolean).join('\n');

    const hostViewPackages = modulePackages.filter((p) => p.config.android?.attachHostView);
    const hostViewLines = hostViewPackages
        .flatMap((p) =>
            getAndroidModuleClassNames(p.config.android).map((fullClassName) => {
                const simpleClassName = fullClassName.split('.').pop()!;
                return `        ${simpleClassName}.attachHostView(view)`;
            })
        )
        .join('\n');
    const hostViewMethod =
        hostViewPackages.length > 0
            ? `\n    fun onHostViewChanged(view: android.view.View?) {\n${hostViewLines}\n    }`
            : '\n    fun onHostViewChanged(view: android.view.View?) {}\n';

    return `package ${projectPackage}.generated

import android.content.Context
import com.lynx.tasm.LynxEnv
import com.lynx.tasm.LynxViewBuilder
import com.lynx.xelement.XElementBehaviors
${moduleImports}
${elementImports}

object GeneratedLynxExtensions {
    fun register(context: Context) {
${allRegistrations}
    }

    fun configureViewBuilder(viewBuilder: LynxViewBuilder) {
        viewBuilder.addBehaviors(XElementBehaviors().create())
    }${hostViewMethod}
}
`;
}

export function generateActivityLifecycleKotlin(packages: DiscoveredModule[], projectPackage: string): string {
    const hooks: Record<string, string[]> = {
        onCreate: [],
        onNewIntent: [],
        onResume: [],
        onPause: [],
        onDestroy: [],
        onViewAttached: [],
        onViewDetached: [],
        onBackPressed: [],
        onWindowFocusChanged: [],
        onCreateDelayed: [],
    };

    for (const pkg of packages) {
        const patches = pkg.config.android?.activityPatches;
        if (!patches) continue;
        for (const [hook, call] of Object.entries(patches)) {
            if (hook in hooks) hooks[hook as keyof typeof hooks]!.push(call);
        }
    }

    const bodyLines = (arr: string[]) =>
        arr.length > 0 ? arr.map((c) => `        ${c}`).join('\n') : '        // no patches';

    const backPressedBody =
        hooks.onBackPressed.length > 0
            ? hooks.onBackPressed.map((c) => `        ${c}(fallback)`).join('\n')
            : '        fallback(false)';

    const windowFocusBody =
        hooks.onWindowFocusChanged.length > 0
            ? `        if (hasFocus) {\n${hooks.onWindowFocusChanged.map((c) => `            ${c}`).join('\n')}\n        }`
            : '        // no patches';

    const createDelayedBody =
        hooks.onCreateDelayed.length > 0
            ? `        listOf(150L, 400L, 800L).forEach { delay ->\n            handler.postDelayed({\n${hooks.onCreateDelayed.map((c) => `                ${c}`).join('\n')}\n            }, delay)\n        }`
            : '        // no patches';

    return `package ${projectPackage}.generated

import android.content.Intent
import com.lynx.tasm.LynxView

object GeneratedActivityLifecycle {
    fun onCreate(intent: Intent?) {
${bodyLines(hooks.onCreate)}
    }

    fun onNewIntent(intent: Intent?) {
${bodyLines(hooks.onNewIntent)}
    }

    fun onViewAttached(lynxView: LynxView?) {
${bodyLines(hooks.onViewAttached)}
    }

    fun onViewDetached() {
${bodyLines(hooks.onViewDetached)}
    }

    fun onResume() {
${bodyLines(hooks.onResume)}
    }

    fun onPause() {
${bodyLines(hooks.onPause)}
    }

    fun onDestroy() {
${bodyLines(hooks.onDestroy)}
    }

    fun onBackPressed(fallback: (Boolean) -> Unit) {
${backPressedBody}
    }

    fun onWindowFocusChanged(hasFocus: Boolean) {
${windowFocusBody}
    }

    fun onCreateDelayed(handler: android.os.Handler) {
${createDelayedBody}
    }
}
`;
}
