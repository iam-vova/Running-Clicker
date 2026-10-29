<script setup lang="ts">
// Карточка следующего забега: прогноз против лимита и готовность. Тап — окно «Забег».
import { fmtClock } from '../../../game/logic.ts'
import { t } from '../../../i18n.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import ReadyBar from '../../ui/ReadyBar/ReadyBar.vue'

const { nextRace, eta, readiness, readyPct } = useRace()
const { toggleSheet } = useSheets()
</script>

<template>
  <button v-if="nextRace" class="next-race-card" @click="toggleSheet('race')">
    <span class="next-race-card__row">
      <b>{{ t('Забег {name}', { name: t(nextRace.name) }) }}</b>
      <span class="text text--muted">{{ t('лимит {t}', { t: fmtClock(nextRace.cutoff) }) }}</span>
    </span>
    <span class="next-race-card__row">
      <span>{{ t('Прогноз финиша') }} <b class="status" :class="`status--${readiness}`">{{ fmtClock(eta) }}</b></span>
      <b class="status" :class="`status--${readiness}`">{{ readiness === 'ok' ? t('Готов к старту ✓') : readiness === 'maybe' ? t('Успеешь с рывками') : t('Готовность {p}%', { p: Math.floor(readyPct * 100) }) }}</b>
    </span>
    <ReadyBar :pct="readyPct" :state="readiness" :label="t('Готовность к забегу')" />
  </button>
</template>

<style lang="scss" src="./styles/component.scss"></style>
