plugins {
    id("com.android.library") version "8.9.1"
    id("org.jetbrains.kotlin.android") version "2.0.21"
}

val lynxSdk: String = run {
    val text = file("../package.json").readText()
    Regex("\"lynxSdk\"\\s*:\\s*\"([^\"]+)\"").find(text)?.groupValues?.get(1)
        ?: error("package.json must define \"lynxSdk\": \"x.y.z\"")
}

android {
    namespace = "com.tamer4lynx.tamerasset"
    compileSdk = 35

    defaultConfig {
        minSdk = 28
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("org.lynxsdk.lynx:lynx:$lynxSdk")
    implementation("org.lynxsdk.lynx:lynx-jssdk:$lynxSdk")
    implementation("com.squareup.okhttp3:okhttp:4.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
