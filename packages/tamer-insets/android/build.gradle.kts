plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.nanofuxion.tamerinsets"
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
    // These should ideally use libs.lynx but for now we hardcode if needed
    // Assuming libs is available because this will be built within the same project
    compileOnly("org.lynxsdk.lynx:lynx:3.3.1")
    compileOnly("org.lynxsdk.lynx:lynx-jssdk:3.3.1")
    implementation("androidx.core:core-ktx:1.10.1")
}
