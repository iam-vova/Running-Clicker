<script setup lang="ts">
// «Профиль»: медали и рекорды по дистанциям, общий пробег, как работает время и офлайн, сброс.
import { ref } from 'vue'
import { RACES } from '../../../game/config.ts'
import { fmt, fmtClock, offlineEff, offlineHours } from '../../../game/logic.ts'
import { resetGame, showToast, state } from '../../../game/state.ts'
import { medalsWord, t } from '../../../i18n.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import { icon } from '../../../utils/assets.ts'
import { fmtHours, pct } from '../../../utils/format.ts'

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
  <div class="profile-sheet">
    <div class="profile-sheet__summary">
      <img class="icon icon--x2" :src="icon('medal')" alt="" />
      <div>
        <b class="profile-sheet__medal-count">{{ state.medals }}</b>
        <span class="text text--muted">{{ t('{w} за финиши', { w: medalsWord(state.medals) }) }}</span>
      </div>
    </div>
    <ul class="profile-sheet__medals">
      <li v-for="r in RACES" :key="r.id" class="profile-sheet__medal" :class="{ 'profile-sheet__medal--got': state.races.includes(r.id) }">
        <img class="icon profile-sheet__medal-icon" :src="icon(`medal-${r.id}`)" alt="" />
        <span class="profile-sheet__medal-name">{{ t(r.name) }}</span>
        <span class="profile-sheet__medal-time">{{ state.bestTimes[r.id] ? fmtClock(state.bestTimes[r.id]!) : state.races.includes(r.id) ? t('финиш') : '—' }}</span>
      </li>
    </ul>
    <div class="setting-row">
      <span>{{ t('Общий пробег') }}</span>
      <b>{{ t('{v} км', { v: fmt(state.totalKm) }) }}</b>
    </div>
    <p class="text text--muted text--small">{{ t('Секунда в игре — минута на трассе. Тренировки набегают километры, а скорость бегуна растёт вместе с ними.') }}</p>
    <p class="text text--muted text--small">{{ t('Прогресс сохраняется в этом браузере. Пока игра закрыта, бегун тренируется до {h} с эффективностью {p}, а забег стоит на паузе.', { h: fmtHours(offlineHours(state)), p: pct(offlineEff(state)) }) }}</p>
    <div class="setting-row">
      <button v-if="!confirmReset" class="link-button" @click="confirmReset = true">{{ t('Сбросить прогресс') }}</button>
      <span v-else>
        {{ t('Стереть всё?') }}
        <button class="link-button link-button--danger" @click="reset">{{ t('Да, сбросить') }}</button>
        <button class="link-button" @click="confirmReset = false">{{ t('Отмена') }}</button>
      </span>
    </div>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
