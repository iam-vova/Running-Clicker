<script setup lang="ts">
// Карточка следующего забега: прогноз против лимита и готовность. Тап — окно «Забег».
import { fmtClock } from '../../../game/logic.ts'
import { t } from '../../../i18n/index.ts'
import { raceName } from '../../../i18n/names.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import ReadyBar from '../../ui/ReadyBar/ReadyBar.vue'

const { nextRace, eta, readiness, readyPct } = useRace()
const { toggleSheet } = useSheets()
</script>

<template>
  <button v-if="nextRace" class="next-race-card" @click="toggleSheet('race')">
    <span class="next-race-card__row">
      <b>{{ t('race.title', { name: raceName(nextRace.id) }) }}</b>
      <span class="text text--muted">{{ t('race.cutoffShort', { t: fmtClock(nextRace.cutoff) }) }}</span>
    </span>
    <span class="next-race-card__row">
      <span>{{ t('race.forecast') }} <b class="status" :class="`status--${readiness}`">{{ fmtClock(eta) }}</b></span>
      <b class="status" :class="`status--${readiness}`">{{ readiness === 'ok' ? t('nextRace.ready') : readiness === 'maybe' ? t('nextRace.maybe') : t('nextRace.readiness', { p: Math.floor(readyPct * 100) }) }}</b>
    </span>
    <ReadyBar :pct="readyPct" :state="readiness" :label="t('race.readiness')" />
  </button>
</template>

<style lang="scss" src="./styles/component.scss"></style>
