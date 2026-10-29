<script setup lang="ts">
// Финал игры: финиш 100 миль — пряжка, итоги всего пути и лучшие времена по дистанциям.
import { RACES } from '../../../game/config.ts'
import { fmt, fmtClock } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { raceName } from '../../../i18n/names.ts'
import { playMinutes } from '../../../analytics.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import type { Result } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'
import { fmtHours } from '../../../utils/format.ts'
import ModalCard from '../../ui/ModalCard/ModalCard.vue'

defineProps<{ result: Result }>()
const { closeResult } = useRaceFlow()
</script>

<template>
  <ModalCard class="finale-modal" :label="t('finale.title')">
    <img class="icon icon--x2" :src="icon('medal-100mi')" alt="" />
    <h2>{{ t('finale.title') }}</h2>
    <p class="text text--muted">{{ t('finale.subtitle') }}</p>
    <dl class="splits splits--two">
      <div>
        <dt class="splits__label">{{ t('result.time') }}</dt>
        <dd class="splits__value status status--ok">{{ fmtClock(result.time) }}</dd>
      </div>
      <div>
        <dt class="splits__label">{{ t('result.place') }}</dt>
        <dd class="splits__value">{{ result.place }}/{{ result.field }}</dd>
      </div>
    </dl>
    <ul class="finale-modal__stats">
      <li>{{ t('finale.playTime') }} <b>{{ fmtHours(playMinutes() / 60) }}</b></li>
      <li>{{ t('finale.totalKm') }} <b>{{ t('units.km', { v: fmt(state.totalKm) }) }}</b></li>
      <li>{{ t('finale.medals') }} <b>{{ state.medals }}</b></li>
      <li>{{ t('finale.taps') }} <b>{{ fmt(state.clicks) }}</b></li>
    </ul>
    <!-- лучшие времена по всем дистанциям: путь от 1 км до 100 миль -->
    <ul class="finale-modal__times">
      <li v-for="r in RACES" :key="r.id">
        <img class="icon icon--inline" :src="icon(`medal-${r.id}`)" alt="" />
        <span>{{ raceName(r.id) }}</span>
        <b>{{ state.bestTimes[r.id] ? fmtClock(state.bestTimes[r.id]!) : '—' }}</b>
      </li>
    </ul>
    <button class="button button--primary button--wide" @click="closeResult">{{ t('finale.continue') }}</button>
  </ModalCard>
</template>

<style lang="scss" src="./styles/component.scss"></style>
