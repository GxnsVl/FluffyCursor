plugins {
    kotlin("jvm") version "2.2.10"
    id("org.jetbrains.intellij.platform") version "2.19.0"
}
group = "com.example.smoothcaret"
version = "1.2.0"
repositories {
    mavenCentral()
    intellijPlatform { defaultRepositories() }
}
dependencies {
    intellijPlatform {
        val localIde = providers.gradleProperty("localIdePath").orNull
        if (localIde != null) local(localIde) else intellijIdea("2024.3.6")
        pluginVerifier()
    }
    testImplementation(kotlin("test"))
    testImplementation("junit:junit:4.13.2")
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21) } }
java { sourceCompatibility = JavaVersion.VERSION_21; targetCompatibility = JavaVersion.VERSION_21 }
intellijPlatform {
    pluginConfiguration {
        ideaVersion { sinceBuild = "243"; untilBuild = "262.*" }
    }
    pluginVerification {
        ides {
            val verifyIde = providers.gradleProperty("verifierIdePath").orNull
            if (verifyIde == null) {
                create(org.jetbrains.intellij.platform.gradle.IntelliJPlatformType.IntellijIdeaUltimate, "2026.2.3")
                create(org.jetbrains.intellij.platform.gradle.IntelliJPlatformType.PyCharmProfessional, "2026.2.3")
                create(org.jetbrains.intellij.platform.gradle.IntelliJPlatformType.Rider, "2026.2.3.1")
            } else local(verifyIde)
            providers.gradleProperty("verifierPyCharmPath").orNull?.let { local(it) }
            providers.gradleProperty("verifierBaselinePath").orNull?.let { local(it) }
        }
    }
}
tasks.wrapper { gradleVersion = "9.6.0" }
