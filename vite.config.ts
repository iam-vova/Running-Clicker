import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

/** Сборка для Яндекс Игр: их SDK по относительному пути /sdk.js (раздаёт сама площадка) — до кода игры */
const yandexSdk = (): Plugin => ({
  name: 'yandex-sdk',
  transformIndexHtml: (html) => html.replace('</head>', '    <script src="/sdk.js"></script>\n  </head>'),
})

// singlefile: вся игра в одном index.html — удобно для itch.io, Яндекс Игр и превью
export default defineConfig(({ mode }) => ({
  plugins: [vue(), viteSingleFile(), ...(mode === 'yandex' ? [yandexSdk()] : [])],
}))
