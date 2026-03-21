plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    id("org.jetbrains.kotlin.kapt")
}

android {
    namespace = "com.tamer.embeddable"
    compileSdk = 35
    defaultConfig {
        minSdk = 28
        ndk { abiFilters += listOf("armeabi-v7a", "arm64-v8a") }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(libs.lynx)
    implementation(libs.lynx.jssdk)
    implementation(libs.lynx.trace)
    implementation(libs.primjs)
    implementation(libs.lynx.service.image)
    implementation(libs.lynx.service.http)
    implementation(libs.lynx.service.log)
    implementation(libs.fresco)
    implementation(libs.animated.gif)
    implementation(libs.animated.webp)
    implementation(libs.webpsupport)
    implementation(libs.animated.base)
    implementation(libs.okhttp)
    kapt(libs.lynx.processor)
    implementation(project(":jiggle"))
    implementation(project(":tamer-biometric"))
    implementation(project(":tamer-dev-client"))
    implementation(project(":tamer-display-browser"))
    implementation(project(":tamer-icons"))
    implementation(project(":tamer-insets"))
    implementation(project(":tamer-linking"))
    implementation(project(":tamer-router"))
    implementation(project(":tamer-secure-store"))
    implementation(project(":tamer-system-ui"))
    implementation(project(":tamer-text-input"))
    implementation(project(":tamer-transports"))
    implementation(project(":tamer-webview"))
}
