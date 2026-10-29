<script setup lang="ts">
// «Профиль»: медали и рекорды по дистанциям, общий пробег, как работает время и офлайн, сброс.
import { ref } from 'vue'
import { RACES } from '../../game/config.ts'
import { fmt, fmtClock, offlineEff, offlineHours } from '../../game/logic.ts'
import { resetGame, showToast, state } from '../../game/state.ts'
import { medalsWord, t } from '../../i18n.ts'
import { useSheets } from '../../composables/useSheets.ts'
import { icon } from '../../utils/assets.ts'
import { fmtHours, pct } from '../../utils/format.ts'

const { closeSheet } = useSheets()
const confirmReset = ref(false)
function reset() {
  resetGame()
  confirmReset.value = false
  closeSheet()
  showToast(t('Начинаем с нуля'))
}
</script>

<template>
  <div class="medal-sum">
    <img class="ico x2" :src="icon('medal')" alt="" />
    <div>
      <b class="medal-count">{{ state.medals }}</b>
      <span class="muted">{{ t('{w} за финиши', { w: medalsWord(state.medals) }) }}</span>
    </div>
  </div>
  <ul class="medals">
    <li v-for="r in RACES" :key="r.id" :class="{ got: state.races.includes(r.id) }">
      <img class="ico" :src="icon(`medal-${r.id}`)" alt="" />
      <span class="m-name">{{ t(r.name) }}</span>
      <span class="m-time">{{ state.bestTimes[r.id] ? fmtClock(state.bestTimes[r.id]!) : state.races.includes(r.id) ? t('финиш') : '—' }}</span>
    </li>
  </ul>
  <div class="setting">
    <span>{{ t('Общий пробег') }}</span>
    <b>{{ t('{v} км', { v: fmt(state.totalKm) }) }}</b>
  </div>
  <p class="muted small">{{ t('Секунда в игре — минута на трассе. Тренировки набегают километры, а скорость бегуна растёт вместе с ними.') }}</p>
  <p class="muted small">{{ t('Прогресс сохраняется в этом браузере. Пока игра закрыта, бегун тренируется до {h} с эффективностью {p}, а забег стоит на паузе.', { h: fmtHours(offlineHours(state)), p: pct(offlineEff(state)) }) }}</p>
  <div class="setting">
    <button v-if="!confirmReset" class="link" @click="confirmReset = true">{{ t('Сбросить прогресс') }}</button>
    <span v-else>
      {{ t('Стереть всё?') }}
      <button class="link danger" @click="reset">{{ t('Да, сбросить') }}</button>
      <button class="link" @click="confirmReset = false">{{ t('Отмена') }}</button>
    </span>
  </div>
</template>

<style scoped>
.medal-sum {
  display: flex;
  align-items: center;
  gap: 12px;
}
.medal-count {
  display: block;
  font-family: var(--num);
  font-synthesis: none;
  font-size: 32px;
  line-height: 1;
}
.medals {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.medals li {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 10px 4px;
  border-radius: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}
.medals li:not(.got) {
  color: var(--muted);
}
.medals li:not(.got) .ico {
  filter: grayscale(1);
  opacity: 0.35;
}
.m-name {
  font-weight: 600;
  font-size: 13px;
  text-align: center;
}
.m-time {
  font-size: 12px;
  color: var(--muted);
}
</style>
