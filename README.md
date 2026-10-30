# Hundred Miler: Running Clicker

Пиксельный idle-кликер про бег (Vue 3 + TypeScript + Vite). Вся игра собирается в один `dist/index.html`.

```bash
npm ci
npm run dev      # локально
npm run build    # сборка в dist/
npm run build:yandex  # сборка для Яндекс Игр: dist-yandex/ и архив hundred-miler-yandex.zip
npm run build:crazy   # сборка для CrazyGames: dist-crazygames/ и архив hundred-miler-crazygames.zip
npm run sim      # симуляция баланса (RUSH=1 — игрок, который стартует как можно раньше)
node --experimental-strip-types sim/calibrate.ts   # подбор лимитов забегов под целевые минуты (TARGET='{"1k":3,…}')
```

Дизайн и баланс — в [GAME.md](GAME.md).

## Структура

```
src/
  game/          логика без Vue: config (числа баланса), logic (чистые функции), state (сейв, цикл, офлайн)
  composables/   общее состояние интерфейса — синглтоны на уровне модуля:
                 useRace (прогноз, готовность, показатели забега), useRaceFlow (финиш, сход, офлайн),
                 useSheets (какое окно открыто), shop (бустеры, бейджи), useTheme, useScale, useBulk
  components/    stage/GameStage · hud/{GameHud, NextRaceCard, RaceHud}
                 sheets/{BottomSheet, TrainSheet, GearSheet, RaceSheet, ProfileSheet, SettingsSheet, BoostRow}
                 modals/{ResultModal, AwayModal, CharacterPicker} · ui/{TabBar, ToggleGroup, ModalCard, ReadyBar}
  App/           корневая раскладка
  utils/         assets (иконки, спрайты, фоны), format (время, проценты, множители)
  styles/        index.scss → base.scss (токены, шрифты) + blocks/ (общие БЭМ-блоки: button, icon, sprite, shop-item…)
  i18n/          локализация: index.ts (t, язык), names.ts (названия по id), locales/<код>.ts — по файлу на язык
  sound.ts       Web Audio: эффекты, музыка, вибрация
```

### Компоненты и стили

- Каждый компонент — папка: `BoostRow/BoostRow.vue` + `BoostRow/styles/`.
- Классы по БЭМ. Корневой блок называется как компонент в kebab-case: `BoostRow.vue` → `.boost-row`, элементы `.boost-row__pips`, модификаторы `.boost-row__pip--on`.
- В `styles/` — по файлу на каждый блок компонента (`boost-row.scss`), все они подключаются в `styles/component.scss`, а он — в компоненте: `<style lang="scss" src="./styles/component.scss">`.
- Блоки, которые нужны нескольким компонентам (кнопки, иконки, спрайт, строка магазина), — в `src/styles/blocks/`, компонент миксует их: `class="shop-item boost-row"`.
- Логика игры — только в `game/` (её же гоняет `sim/`).

## Локализация

- Язык по умолчанию и запасной — английский. При первом запуске берётся язык браузера, если он есть в игре, иначе английский; выбор в настройках запоминается.
- Ключи смысловые: `t('race.title', { name })`. Источник ключей — `src/i18n/locales/en.ts`; остальные языки типизированы `Messages`, поэтому пропущенный или лишний ключ — ошибка компиляции, как и `t('опечатка')`.
- Множественное число — объект форм по `Intl.PluralRules`: `{ one, few, many, other }`, вызов `t('profile.medalsFor', { count })`.
- Названия забегов, тренировок и уровней не хранятся в `config.ts` — они в словаре по id (`race.5k`, `gen.jog`, `boost.shoes.2`), доступ через `i18n/names.ts`.
- **Новый язык:** скопировать `locales/en.ts` в `locales/<код>.ts` (например `pt-BR.ts`), перевести значения, указать `code` и `name` (на самом языке). Больше ничего: файл подключится сам и появится в списке языков.

## Аналитика

`src/analytics.ts` — анонимные события в PostHog (US Cloud) через HTTP API, без SDK. Только в прод-сборке; игрок может выключить в настройках.
Без личных данных: случайный id браузера, `$process_person_profile: false`.

| Событие | Поля |
| --- | --- |
| `app_open` | — |
| `offline_return` | `away_min`, `counted_min`, `km` |
| `purchase` | `kind` (gen/boost/upgrade), `id`, `level`, `count` |
| `race_start` | `race`, `forecast_min`, `best_min`, `cutoff_min`, `ready` (ok/maybe/late) |
| `race_finish`, `race_dnf` | `race`, `time_min`, `cutoff_min`, `covered_km`, `gave_up`, `taps`, `gels` |

У каждого события есть `play_min` (минуты активной игры с первого запуска), `races_done`, `income_kmh`, `lang`,
`tz` (часовой пояс — страна без IP), `locale` (язык браузера с регионом), `platform` (web / yandex / crazygames).

## Публикация

Каждый push в `main` собирает игру и выкладывает её на GitHub Pages (`.github/workflows/deploy.yml`).
Один раз: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Яндекс Игры

`npm run build:yandex` собирает версию с их SDK (`<script src="/sdk.js">`) и упаковывает её в `hundred-miler-yandex.zip` —
этот архив загружается в консоль разработчика. Вся связь с площадкой — в `src/platform.ts`; без SDK (GitHub Pages) там заглушки.

- язык: выбор игрока → язык площадки → язык браузера;
- разметка геймплея (`GameplayAPI.start/stop`): игра идёт, пока вкладка видна и площадка не поставила паузу;
- `game_api_pause/resume` (меню площадки, реклама) — игра и звук стоят;
- облачные сохранения: сейв в `player.setData` не чаще раза в 30 с и сразу при уходе; при запуске берётся более свежий из облака и браузера;
- реклама за награду — «×2» в окне «Пока тебя не было»;
- на мониторе сцена на всю ширину окна, интерфейс — колонкой по центру; правый клик не открывает меню, пробел — тап.

Проверка в черновике: открыть игру с `?debug-mode=16` — в левом нижнем углу `IT`, если SDK инициализирован.

### CrazyGames

`npm run build:crazy` — версия с CrazyGames SDK v3 (`crazygames-sdk-v3.js` с их CDN), архив `hundred-miler-crazygames.zip`.
Тот же `src/platform.ts`, отличия от Яндекса:

- `loadingStart/loadingStop` вокруг загрузки; `gameplayStart/Stop` только по паузе для рекламы — уход со вкладки площадка ловит сама;
- настройка площадки `muteAudio` главнее внутриигровой: звук и музыка молчат;
- сохранения — модуль Data (`data.setItem('save', …)`): при подаче включить **Progress Save → Yes, using the Data Module**;
- `happytime()` — первый финиш дистанции или новый рекорд;
- без окна выбора персонажа (требование «сразу в игру»): персонаж случайный, сменить — в настройках;
- язык — из браузера.

Сначала игра идёт в Basic Launch (без монетизации, SDK необязателен), Full Launch — после отбора по метрикам.
