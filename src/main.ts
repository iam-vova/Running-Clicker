// Press Start 2P — пиксельный шрифт для крупных чисел (вшит в сборку)
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/press-start-2p/cyrillic-400.css'
// глобальные стили — до компонентов: стили компонента (тот же вес селектора) должны идти после и перекрывать общие блоки
import './styles/index.scss'
import { createApp, nextTick } from 'vue'
import { initPlatform, platformReady } from './platform.ts'

// сначала площадка (SDK, облачный сейв), потом игра: состояние и язык читаются при импорте App
void (async () => {
  await initPlatform()
  const { default: App } = await import('./App/App.vue')
  createApp(App).mount('#app')
  await nextTick()
  platformReady()
})()
