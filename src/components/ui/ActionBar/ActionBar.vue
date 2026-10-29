<script setup lang="ts">
// Кнопки-иконки внизу поверх травы: «Прокачка» (тренировки + снаряжение) и «Забег» слева, профиль-медаль справа. Это игровые кнопки,
// а не панель навигации: у каждой — бейдж «сколько можно купить» / «пора на старт» / точка «забег идёт».
import { computed } from 'vue'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { affordGear, affordTrain } from '../../../composables/shop.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import { icon } from '../../../utils/assets.ts'

const { sheet, toggleSheet } = useSheets()
const { nextRace, ready } = useRace()
/** На забеге доступен только «Забег»: скорость зафиксирована на старте, прокачка посреди забега сбивает с толку */
const racing = computed(() => !!state.activeRace)
const upgradeBadge = computed(() => (racing.value ? 0 : affordTrain.value + affordGear.value))
const raceReadyBadge = computed(() => !racing.value && !!nextRace.value && ready(nextRace.value.id))
const upgradeOpen = computed(() => sheet.value === 'train' || sheet.value === 'gear')
</script>

<template>
  <nav class="action-bar">
    <button class="action-bar__button" :class="{ 'action-bar__button--active': upgradeOpen }" :disabled="racing" :aria-label="t('tabs.upgrade')" @click="toggleSheet('train')">
      <img class="icon" :src="icon('sneaker')" alt="" />
      <i v-if="upgradeBadge" class="action-bar__badge">{{ upgradeBadge }}</i>
    </button>
    <button class="action-bar__button" :class="{ 'action-bar__button--active': sheet === 'race' }" :aria-label="t('tabs.race')" @click="toggleSheet('race')">
      <img class="icon action-bar__flag" :src="icon('flag')" alt="" />
      <i v-if="racing" class="action-bar__live-dot" :aria-label="t('tabs.raceLive')"></i>
      <i v-else-if="raceReadyBadge" class="action-bar__badge">!</i>
    </button>
    <button
      class="action-bar__button action-bar__button--profile"
      :class="{ 'action-bar__button--active': sheet === 'more' }"
      :disabled="racing"
      :aria-label="t('tabs.profile')"
      @click="toggleSheet('more')"
    >
      <img class="icon" :src="icon('medal')" alt="" />
    </button>
  </nav>
</template>

<style lang="scss" src="./styles/component.scss"></style>
