# Публикация The Listening Garden на GitHub

Проект готов к публикации. Команда сборки и установка пакетов не нужны. Все действия выполняйте из папки **listening-garden**, а не из родительской SCREENS с другими проектами.

## Название, описание и topics

**Repository name:** `listening-garden`

**Description** — скопируйте в поле описания репозитория:

> An interactive Chinese-inspired musical garden with playable instruments, ambient soundscapes, guided lessons, and local melody recording. Built with vanilla JavaScript and Web Audio.

**Topics** — добавляйте отдельно, без запятых:

```text
javascript
web-audio
canvas
svg
interactive-art
generative-audio
chinese-instruments
music
soundscape
creative-coding
responsive-design
github-pages
```

Когда сайт заработает, добавьте его адрес в поле **Website** в блоке **About** репозитория.

## Способ 1 — загрузить файлы через браузер

1. На GitHub нажмите **New repository** и задайте имя `listening-garden`.
2. Вставьте описание выше. Для публикации через GitHub Pages на GitHub Free выберите **Public**. Оставьте создание README, `.gitignore` и лицензии выключенным: эти файлы уже подготовлены.
3. Нажмите **Create repository**, затем ссылку **uploading an existing file**. В существующем репозитории используйте **Add file → Upload files**.
4. Перетащите **содержимое** локальной папки `listening-garden`: HTML, CSS, JavaScript, `assets`, README, LICENSE, PUBLISHING и файлы, начинающиеся с точки. **Не загружайте `listening-garden.zip` и папку `.git`.**
5. Проверьте, что `index.html` лежит сразу в корне репозитория, а изображения — внутри `assets/`. Не создавайте дополнительную внешнюю папку `listening-garden` в репозитории.
6. Если проводник скрывает `.nojekyll`, `.gitignore` или `.gitattributes`, включите показ скрытых файлов. Пустой `.nojekyll` также можно создать через **Add file → Create new file**, указав `.nojekyll` как имя и оставив содержимое пустым.
7. Введите сообщение `Prepare The Listening Garden for publication` и сохраните файлы в ветку `main` кнопкой **Commit changes**.

GitHub не распаковывает загруженный ZIP в сайт. Если пользуетесь архивом, сначала распакуйте его локально, затем загрузите файлы.

## Способ 2 — отправить через Git

Создайте на GitHub пустой репозиторий, как в первых двух шагах выше. В PowerShell перейдите в папку проекта (замените путь своим):

```powershell
Set-Location 'C:\Projects\listening-garden'
```

Следующие команды создают первый коммит и отправляют проект. Замените `YOUR-USERNAME` своим логином GitHub:

```sh
git init -b main
git add .
git status
git commit -m "Prepare The Listening Garden for publication"
git remote add origin https://github.com/YOUR-USERNAME/listening-garden.git
git push -u origin main
```

Перед коммитом убедитесь, что в `git status` нет ZIP-архива: он исключён через `.gitignore`. Если Git попросит имя и email автора, задайте их для этого репозитория через `git config user.name` и `git config user.email`; email можно взять из настроек GitHub, включая адрес noreply. При отправке войдите в GitHub через предложенный менеджер учётных данных.

## Включить сайт GitHub Pages

В репозитории откройте **Settings → Pages**. В разделе **Build and deployment** установите:

| Поле | Значение |
| --- | --- |
| Source | Deploy from a branch |
| Branch | main |
| Folder | / (root) |

Нажмите **Save**. После завершения публикации адрес появится в Pages; состояние развёртывания можно посмотреть во вкладке **Actions**. Используйте HTTPS-адрес сайта.

Если имя репозитория `listening-garden`, ожидаемый адрес:

```text
https://YOUR-USERNAME.github.io/listening-garden/
```

Это шаблон: замените `YOUR-USERNAME` своим логином. Окончательный адрес берите из **Settings → Pages**. Инструкция сверена с [документацией GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Проверка после публикации

- Открываются все четыре экрана: Gate, Chimes, Silk, Learn.
- Изображения и логотип загружаются; мобильное меню и плеер не перекрывают инструменты.
- После касания звучат инструменты; отдельные регуляторы громкости работают.
- Выбор собственного трека и переключение Original/Garden работают.
- Короткую запись можно остановить, прослушать и скачать.
- Если включить Remember my settings, параметры восстанавливаются после перезагрузки.

Проверьте Safari на настоящем iPhone, если он входит в целевые устройства: эмуляция размеров на компьютере не заменяет такую проверку.

## Как обновлять сайт

Измените файлы в этой папке и загрузите их в ту же ветку `main`. Через Git:

```sh
git add .
git commit -m "Update the garden"
git push
```

GitHub Pages опубликует изменения из выбранной ветки. Если видна старая версия, сначала проверьте завершение развёртывания, затем обновите страницу без кэша.

## Лицензия

В проект добавлена **MIT License**. Она разрешает использование, изменение и распространение, включая коммерческое, с сохранением уведомления об авторстве и лицензии. Строка автора сейчас: `The Listening Garden contributors`. Если хотите персональное указание авторства, замените её в `LICENSE` на своё имя или публичный псевдоним перед публикацией.

Текст лицензии: [LICENSE](LICENSE). Краткое объяснение условий: [MIT на Choose a License](https://choosealicense.com/licenses/mit/).

## Если сайт не открывается

- **404:** убедитесь, что выбран `main / (root)` и в корне есть `index.html`.
- **Нет изображений:** загрузите папку `assets` целиком, сохранив имена и регистр букв.
- **Вместо сайта виден список файлов или README:** проверьте наличие `index.html` в выбранной папке публикации.
- **Нет звука:** нажмите на инструмент или Play и проверьте Sound, громкость браузера и устройства.
- **Нет записи:** используйте HTTPS и браузер с поддержкой MediaRecorder.
