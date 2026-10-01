# Fluffy Cursor

Animated caret for JetBrains IDEs: responsive movement, directional stretching, subtle glow, and a single forward/back landing recoil. Typing uses a faster, lighter effect. Ghost copies are disabled by default.

## Скачать и установить

1. Скачайте **[fluffy-cursor-1.1.0.zip](https://github.com/GxnsVl/FluffyCursor/releases/download/v1.1.0/fluffy-cursor-1.1.0.zip)** со страницы [Releases](https://github.com/GxnsVl/FluffyCursor/releases).
2. В IntelliJ IDEA откройте **Settings → Plugins → ⚙ → Install Plugin from Disk…**.
3. Выберите ZIP **без распаковки** и перезапустите IDE.
4. Откройте **Settings → Tools → Fluffy Cursor**, выберите **Neon** и нажмите **Apply** для яркого свечения и выразительных переходов.

Один ZIP используется на **Windows, Linux (включая CachyOS) и macOS**. Отдельный системный пакет не нужен. Поддерживаемые версии платформы: **2024.3–2026.1**, сборки **243–261**. Плагин содержит JVM-код и не включает нативные библиотеки. Запуск на Linux/macOS пока не проверен вручную.

[Официальная инструкция JetBrains по установке ZIP](https://www.jetbrains.com/help/idea/managing-plugins.html#install_plugin_from_disk).

### Настройка цвета

На вкладке **General** снимите **Use theme caret color**, укажите **Custom caret color (#RRGGBB)** и нажмите **Apply**. Например: `#00E5FF` — голубой, `#B388FF` — фиолетовый, `#FF4081` — розовый. На вкладке **Trail and glow** опция **Glow uses cursor color** связывает цвет свечения с кареткой.

### Обновление со Smooth Caret

Плагин переименован в Fluffy Cursor. Внутренний ID сохранён, поэтому он обновляет старую версию без установки второй копии. Настройки цвета сохраняются. При загрузке прежних настроек отключаются копии следа и обновляются старые стандартные параметры пружины.

## Поведение

- Тонкая каретка 2 px в покое; при прыжке она немного расширяется и растягивается по направлению движения.
- Один небольшой перелёт вперёд, меньший возврат назад и остановка.
- При печати: ускоренная анимация, ограничение движения 70 ms и четверть силы деформации.
- Плавность рассчитывается по реальному времени; таймер запрашивает обновления каждые 5 ms во время анимации.
- Нативная каретка скрывается, пока активна пользовательская; её прежнее состояние восстанавливается при отключении.
- Частицы, ripple и landing pulse выключены. Копии следа выключены по умолчанию.
- Таймер останавливается после завершения эффекта; перерисовываются только затронутые области.

Фактическая частота кадров зависит от нагрузки IDE, JVM и оконного композитора; 200 FPS не гарантируются.

## Build from source

Requires a full **JDK 21 or newer** and internet access for the first dependency download.

Linux/macOS:

```sh
bash ./gradlew test buildPlugin
```

Windows PowerShell:

```powershell
.\gradlew.bat test buildPlugin
```

Output: `build/distributions/fluffy-cursor-1.1.0.zip`.
The Gradle wrapper and the official IntelliJ Platform Gradle plugin are included/configured. Compilation targets JVM 21 and IntelliJ IDEA 2024.3.6.

## Validation and architecture

See [VALIDATION.md](VALIDATION.md) for build/test results and their limits, and [ARCHITECTURE.md](ARCHITECTURE.md) for rendering/lifecycle details. The renamed, optimized release has automated regression coverage; it has not yet been manually checked in a live IDE.

## License

[MIT](LICENSE). Unaffiliated with JetBrains, Neovide, or VS Code.
