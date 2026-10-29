# Ультрамарафон

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
                 useRace (прогноз, готовность, живые показатели забега), useRaceFlow (финиш, сход, офлайн),
                 useSheets (какое окно открыто), shop (бустеры, бейджи), useTheme, useScale, useBulk
  components/
    stage/       GameStage — сцена: фон, бегун, тень лимита, арка, гели, рывок
    hud/         GameHud, NextRaceCard, RaceHud
    sheets/      BottomSheet (обёртка) + Train/Gear/Race/Profile/Settings, BoostRow
    modals/      ResultModal, AwayModal, CharacterPicker
    ui/          ToggleGroup, ModalCard
    TabBar.vue
  utils/         assets (иконки, листы спрайтов, фоны), format (время, проценты, множители)
  styles/        base.css (токены, шрифты), ui.css (общие примитивы: кнопки, списки, шкалы, спрайты)
  i18n.ts        ru/en: русская строка — ключ
  sound.ts       Web Audio: эффекты, музыка, вибрация
  App.vue        только раскладка
```

Правило: логика игры — в `game/` (её же гоняет `sim/`), стили компонента — в его `<style scoped>`, в `ui.css` — только то, что используют несколько компонентов.

## Публикация

Каждый push в `main` собирает игру и выкладывает её на GitHub Pages (`.github/workflows/deploy.yml`).
Один раз: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
