import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// singlefile: вся игра в одном index.html — удобно для itch.io и превью
export default defineConfig({ plugins: [vue(), viteSingleFile()] })
