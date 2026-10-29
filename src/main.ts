// Press Start 2P — пиксельный шрифт для крупных чисел (вшит в сборку)
import '@fontsource/press-start-2p/latin-400.css'
import '@fontsource/press-start-2p/cyrillic-400.css'
// глобальные стили — до компонентов: стили компонента (тот же вес селектора) должны идти после и перекрывать общие блоки
import './styles/index.scss'
import { createApp } from 'vue'
import App from './App/App.vue'

createApp(App).mount('#app')
