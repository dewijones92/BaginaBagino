import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Optional release signing. Place a key.properties at android/key.properties
// (or set ENV vars BAGINA_KEYSTORE_PATH, BAGINA_KEYSTORE_PASSWORD,
// BAGINA_KEY_ALIAS, BAGINA_KEY_PASSWORD) to enable. Without it the release
// build falls back to the debug key — handy for local builds.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

fun envOrProp(envName: String, propName: String): String? {
    return System.getenv(envName) ?: keystoreProperties.getProperty(propName)
}

val releaseStoreFile = envOrProp("BAGINA_KEYSTORE_PATH", "storeFile")
val releaseStorePassword = envOrProp("BAGINA_KEYSTORE_PASSWORD", "storePassword")
val releaseKeyAlias = envOrProp("BAGINA_KEY_ALIAS", "keyAlias")
val releaseKeyPassword = envOrProp("BAGINA_KEY_PASSWORD", "keyPassword")
val hasReleaseSigning = listOf(releaseStoreFile, releaseStorePassword, releaseKeyAlias, releaseKeyPassword).all { !it.isNullOrEmpty() }

android {
    namespace = "com.dewijones92.bagina"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.dewijones92.bagina"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                val storeFilePath = releaseStoreFile!!
                storeFile = file(storeFilePath).let {
                    if (it.isAbsolute) it else rootProject.file(storeFilePath)
                }
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseSigning) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

flutter {
    source = "../.."
}
