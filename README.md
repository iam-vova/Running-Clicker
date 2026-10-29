# Hundred Miler: Running Clicker

Пиксельный idle-кликер про бег (Vue 3 + TypeScript + Vite). Вся игра собирается в один `dist/index.html`.

```bash
npm ci
npm run dev      # локально
npm run build    # сборка в dist/
npm run sim      # симуляция баланса (RUSH=1 — игрок, который стартует как можно раньше)
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

У каждого события есть `play_min` (минуты активной игры с первого запуска), `races_done`, `income_kmh`, `lang`.

## Публикация

Каждый push в `main` собирает игру и выкладывает её на GitHub Pages (`.github/workflows/deploy.yml`).
Один раз: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
