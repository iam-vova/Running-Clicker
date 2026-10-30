import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

/** SDK площадки — до кода игры: Яндекс раздаёт свой по относительному пути, CrazyGames — со своего CDN */
const SDK: Record<string, string> = {
  yandex: '/sdk.js',
  crazygames: 'https://sdk.crazygames.com/crazygames-sdk-v3.js',
}
const platformSdk = (src: string): Plugin => ({
  name: 'platform-sdk',
  transformIndexHtml: (html) => html.replace('</head>', `    <script src="${src}"></script>\n  </head>`),
})

// singlefile: вся игра в одном index.html — удобно для itch.io, площадок и превью
export default defineConfig(({ mode }) => ({
  plugins: [vue(), viteSingleFile(), ...(SDK[mode] ? [platformSdk(SDK[mode])] : [])],
}))
