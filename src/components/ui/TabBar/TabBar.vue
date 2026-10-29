<script setup lang="ts">
// Нижняя панель: четыре вкладки с бейджами «сколько можно купить» и точкой «забег идёт».
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n.ts'
import { affordGear, affordTrain } from '../../../composables/shop.ts'
import { useRace } from '../../../composables/useRace.ts'
import { TABS, useSheets } from '../../../composables/useSheets.ts'
import type { Sheet } from '../../../composables/useSheets.ts'
import { icon } from '../../../utils/assets.ts'

const { sheet, toggleSheet } = useSheets()
const { nextRace, ready } = useRace()

function badge(id: Sheet): string | number {
  if (id === 'train') return affordTrain.value || ''
  if (id === 'gear') return affordGear.value || ''
  if (id === 'race') return state.activeRace ? '●' : nextRace.value && ready(nextRace.value.id) ? '!' : ''
  return ''
}
</script>

<template>
  <nav class="tab-bar">
    <button v-for="s in TABS" :key="s.id" class="tab-bar__tab" :class="{ 'tab-bar__tab--active': sheet === s.id }" @click="toggleSheet(s.id)">
      <img class="icon tab-bar__icon" :class="{ 'tab-bar__icon--outlined': s.icon === 'flag' }" :src="icon(s.icon)" alt="" />
      <span>{{ t(s.label) }}</span>
      <i v-if="badge(s.id) === '●'" class="tab-bar__live-dot" :aria-label="t('Забег идёт')"></i>
      <i v-else-if="badge(s.id)" class="tab-bar__badge">{{ badge(s.id) }}</i>
    </button>
  </nav>
</template>

<style lang="scss" src="./styles/component.scss"></style>
