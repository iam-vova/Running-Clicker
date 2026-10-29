<script setup lang="ts">
// Карточка следующего забега: прогноз против лимита и готовность. Тап — окно «Забег».
import { fmtClock } from '../../game/logic.ts'
import { t } from '../../i18n.ts'
import { useRace } from '../../composables/useRace.ts'
import { useSheets } from '../../composables/useSheets.ts'

const { nextRace, eta, readiness, readyPct } = useRace()
const { toggleSheet } = useSheets()
</script>

<template>
  <button v-if="nextRace" class="card" @click="toggleSheet('race')">
    <span class="race-row">
      <b>{{ t('Забег {name}', { name: t(nextRace.name) }) }}</b>
      <span class="muted">{{ t('лимит {t}', { t: fmtClock(nextRace.cutoff) }) }}</span>
    </span>
    <span class="race-row">
      <span>{{ t('Прогноз финиша') }} <b :class="readiness">{{ fmtClock(eta) }}</b></span>
      <b :class="readiness">{{ readiness === 'ok' ? t('Готов к старту ✓') : readiness === 'maybe' ? t('Успеешь с рывками') : t('Готовность {p}%', { p: Math.floor(readyPct * 100) }) }}</b>
    </span>
    <span class="ready" role="progressbar" :aria-valuenow="Math.round(readyPct * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="t('Готовность к забегу')">
      <i :class="readiness" :style="{ width: readyPct * 100 + '%' }"></i>
    </span>
  </button>
</template>

<style scoped>
.card {
  pointer-events: auto;
  margin-top: 10px;
  width: 100%;
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid var(--line);
  text-shadow: none;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: left;
}
</style>
