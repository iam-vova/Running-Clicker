# Ультрамарафон

Пиксельный idle-кликер про бег (Vue 3 + TypeScript + Vite). Вся игра собирается в один `dist/index.html`.

```bash
npm ci
npm run dev      # локально
npm run build    # сборка в dist/
npm run sim      # симуляция баланса (RUSH=1 — игрок, который стартует как можно раньше)
```

Дизайн и баланс — в [GAME.md](GAME.md).

## Публикация

Каждый push в `main` собирает игру и выкладывает её на GitHub Pages (`.github/workflows/deploy.yml`).
Один раз: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
