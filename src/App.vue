<script setup lang="ts">
// Корневая раскладка: сцена на весь экран, HUD сверху, панель вкладок снизу, окна и карточки поверх.
// Логика игры — в game/, общее состояние интерфейса — в composables/, экраны — в components/.
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { state, toast } from './game/state.ts'
import { startMusic, unlock } from './sound.ts'
import { useRaceFlow } from './composables/useRaceFlow.ts'
import { useScale } from './composables/useScale.ts'
import { useSheets } from './composables/useSheets.ts'
import { bgVars, sheetVars } from './utils/assets.ts'
import GameStage from './components/stage/GameStage.vue'
import GameHud from './components/hud/GameHud.vue'
import TabBar from './components/TabBar.vue'
import BottomSheet from './components/sheets/BottomSheet.vue'
import TrainSheet from './components/sheets/TrainSheet.vue'
import GearSheet from './components/sheets/GearSheet.vue'
import RaceSheet from './components/sheets/RaceSheet.vue'
import ProfileSheet from './components/sheets/ProfileSheet.vue'
import SettingsSheet from './components/sheets/SettingsSheet.vue'
import AwayModal from './components/modals/AwayModal.vue'
import ResultModal from './components/modals/ResultModal.vue'
import CharacterPicker from './components/modals/CharacterPicker.vue'

const { px } = useScale()
const { sheet, sheetTitle, closeSheet } = useSheets()
const { lastResult, showResult, away, startFlow } = useRaceFlow()
startFlow()

const SHEETS = { train: TrainSheet, gear: GearSheet, race: RaceSheet, more: ProfileSheet, settings: SettingsSheet }

/** Масштаб и листы кадров персонажа — CSS-переменные для всей игры */
const rootVars = computed(() => ({ '--px': px.value, ...bgVars, ...sheetVars(state.character ?? 'he') }))

// звук и музыка включаются по первому касанию (требование браузеров, особенно iOS)
function onFirstTouch() {
  unlock()
  startMusic()
}
// и будят его на каждом касании: после сворачивания iOS прерывает звук. touchend/click — жесты, которые iOS точно считает «пользовательскими»
const GESTURES = ['pointerdown', 'touchend', 'click'] as const
onMounted(() => GESTURES.forEach((g) => addEventListener(g, onFirstTouch, true)))
onBeforeUnmount(() => GESTURES.forEach((g) => removeEventListener(g, onFirstTouch, true)))
</script>

<template>
  <main class="app" :style="rootVars">
    <GameStage />
    <GameHud />
    <TabBar />

    <BottomSheet v-if="sheet" :title="sheetTitle" @close="closeSheet">
      <component :is="SHEETS[sheet]" />
    </BottomSheet>

    <div v-if="toast" class="toast" role="status">{{ toast }}</div>

    <ResultModal v-if="showResult && lastResult" :result="lastResult" />
    <AwayModal v-else-if="away" :report="away" />
    <CharacterPicker v-if="!state.character" />
  </main>
</template>

<style scoped>
.app {
  /* фоны сцены: день / ночь (картинки — из bgVars, чтобы не дублировать их в CSS) */
  --route: var(--route-day);
  --stadium: var(--stadium-day);
  --sky: #8ed6fa; /* = голубое небо панорамы: выше картинки небо продолжается без шва */
  /* пиксельные кнопки 9-slice (tools/sprites/buttons.py): нейтральная — тёмная днём, светлая ночью */
  --btn-neutral: url('./assets/ui/btn-dark.png');
  --btn-neutral-down: url('./assets/ui/btn-dark-down.png');
  --btn-off: url('./assets/ui/btn-off-light.png');
  --tile: calc(64px * var(--px));
  --nav-h: calc(64px + env(safe-area-inset-bottom, 0px));
  position: relative;
  height: 100%;
  max-width: 480px;
  margin: 0 auto;
  overflow: hidden;
  color: var(--fg);
  /* игра, а не страница: без серо-белой подсветки тапа, выделения текста и меню долгого нажатия (iOS) */
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
  -webkit-user-select: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .app {
    --route: var(--route-night);
    --stadium: var(--stadium-night);
    --sky: #070a1f;
    --btn-neutral: url('./assets/ui/btn-light.png');
    --btn-neutral-down: url('./assets/ui/btn-light-down.png');
    --btn-off: url('./assets/ui/btn-off-dark.png');
  }
}
:root[data-theme='dark'] .app {
  --route: var(--route-night);
  --stadium: var(--stadium-night);
  --sky: #070a1f;
  --btn-neutral: url('./assets/ui/btn-light.png');
  --btn-neutral-down: url('./assets/ui/btn-light-down.png');
  --btn-off: url('./assets/ui/btn-off-dark.png');
}
.toast {
  position: absolute;
  left: 50%;
  bottom: calc(var(--nav-h) + 12px);
  transform: translateX(-50%);
  width: calc(100% - 32px);
  background: var(--fg);
  color: var(--bg);
  border-radius: 12px;
  padding: 12px 16px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
  z-index: 4;
  pointer-events: none;
}
</style>
