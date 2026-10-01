# Kelechek — Android-приложение (Flutter)

Обёртка над сайтом `https://qelechek.kg` (WebView): весь функционал сайта, вход, оплата Finik,
сканирование QR камерой. Приложение добавляет к User-Agent `KelechekApp/<версия>`.

## Сборка и публикация APK

```powershell
npm run apk          # из корня репозитория
```

Скрипт `scripts/build-apk.mjs` собирает релизный APK (arm, arm64), копирует его в
`apps/web/public/downloads/kelechek.apk` и пишет `app.json` (версия, размер).
Сайт отдаёт файл по ссылке `/downloads/kelechek.apk`, страница скачивания — `/mobile`.

Новая версия: поднимите `version:` в `pubspec.yaml` (например `1.0.1+2` — номер после `+`
обязательно увеличивать), выполните `npm run apk` и задеплойте сайт.

Другой адрес сайта (например, для теста): `flutter build apk --dart-define=BASE_URL=https://...`.

## Подпись

Релиз подписывается ключом `android/app/kelechek-release.jks`, пароли — в `android/key.properties`.
Оба файла не в git. **Сохраните их в надёжном месте**: без этого ключа обновления не установятся
поверх уже установленного приложения. Если `key.properties` нет, APK подписывается debug-ключом.
