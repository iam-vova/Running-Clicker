<script setup lang="ts">
// Корневая раскладка: сцена на весь экран, HUD сверху, панель вкладок снизу, окна и карточки поверх.
// Логика игры — в game/, общее состояние интерфейса — в composables/, экраны — в components/.
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { state, toast } from '../game/state.ts'
import { startMusic, unlock } from '../sound.ts'
import { useRace } from '../composables/useRace.ts'
import { useRaceFlow } from '../composables/useRaceFlow.ts'
import { useScale } from '../composables/useScale.ts'
import { useSheets } from '../composables/useSheets.ts'
import { bgVars, sheetVars } from '../utils/assets.ts'
import GameStage from '../components/stage/GameStage/GameStage.vue'
import GameHud from '../components/hud/GameHud/GameHud.vue'
import ActionBar from '../components/ui/ActionBar/ActionBar.vue'
import BottomSheet from '../components/sheets/BottomSheet/BottomSheet.vue'
import TrainSheet from '../components/sheets/TrainSheet/TrainSheet.vue'
import GearSheet from '../components/sheets/GearSheet/GearSheet.vue'
import RaceSheet from '../components/sheets/RaceSheet/RaceSheet.vue'
import ProfileSheet from '../components/sheets/ProfileSheet/ProfileSheet.vue'
import SettingsSheet from '../components/sheets/SettingsSheet/SettingsSheet.vue'
import AwayModal from '../components/modals/AwayModal/AwayModal.vue'
import ResultModal from '../components/modals/ResultModal/ResultModal.vue'
import FinaleModal from '../components/modals/FinaleModal/FinaleModal.vue'
import CharacterPicker from '../components/modals/CharacterPicker/CharacterPicker.vue'

const { px } = useScale()
const { sheet, sheetTitle, closeSheet } = useSheets()
const { lastResult, showResult, away, startFlow } = useRaceFlow()
/** Ночной участок забега: сцена ночная при любой теме */
const { nightNow } = useRace()
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
  <main class="app" :class="{ 'app--night': nightNow }" :style="rootVars">
    <GameStage />
    <GameHud />
    <ActionBar />

    <BottomSheet v-if="sheet" :title="sheetTitle" :dialog="sheet === 'settings'" @close="closeSheet">
      <component :is="SHEETS[sheet]" />
    </BottomSheet>

    <div v-if="toast" class="app__toast" role="status">{{ toast }}</div>

    <!-- первый финиш 100 миль — финал игры с итогами вместо обычного результата -->
    <FinaleModal v-if="showResult && lastResult?.ok && lastResult.id === '100mi' && !lastResult.replay" :result="lastResult" />
    <ResultModal v-else-if="showResult && lastResult" :result="lastResult" />
    <AwayModal v-else-if="away" :report="away" />
    <CharacterPicker v-if="!state.character" />
  </main>
</template>

<style lang="scss" src="./styles/component.scss"></style>
