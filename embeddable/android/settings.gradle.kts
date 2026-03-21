pluginManagement {
    repositories {
        google { content { includeGroupByRegex("com\\.android.*"); includeGroupByRegex("com\\.google.*"); includeGroupByRegex("androidx.*") } }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}

rootProject.name = "TamerEmbeddable"
include(":lib")
include(":jiggle")
project(":jiggle").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/jiggle/android")
include(":tamer-biometric")
project(":tamer-biometric").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-biometric/android")
include(":tamer-dev-client")
project(":tamer-dev-client").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-dev-client/android")
include(":tamer-display-browser")
project(":tamer-display-browser").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-display-browser/android")
include(":tamer-icons")
project(":tamer-icons").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-icons/android")
include(":tamer-insets")
project(":tamer-insets").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-insets/android")
include(":tamer-linking")
project(":tamer-linking").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-linking/android")
include(":tamer-router")
project(":tamer-router").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-router/android")
include(":tamer-secure-store")
project(":tamer-secure-store").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-secure-store/android")
include(":tamer-system-ui")
project(":tamer-system-ui").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-system-ui/android")
include(":tamer-text-input")
project(":tamer-text-input").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-text-input/android")
include(":tamer-transports")
project(":tamer-transports").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/node_modules/tamer-transports/android")
include(":tamer-webview")
project(":tamer-webview").projectDir = file("/Volumes/Storage/Projects/tamer4lynx/packages/tamer-webview/android")
