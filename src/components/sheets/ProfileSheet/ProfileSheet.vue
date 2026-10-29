<script setup lang="ts">
// «Профиль»: медали и рекорды по дистанциям, общий пробег, как работает время и офлайн, сброс.
import { ref } from 'vue'
import { RACES } from '../../../game/config.ts'
import { fmt, fmtClock, offlineEff, offlineHours } from '../../../game/logic.ts'
import { resetGame, showToast, state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { raceName } from '../../../i18n/names.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'
import { fmtHours, pct } from '../../../utils/format.ts'

const { closeSheet } = useSheets()
const { clearResults } = useRaceFlow()
const confirmReset = ref(false)
function reset() {
  resetGame()
  clearResults()
  confirmReset.value = false
  closeSheet()
  showToast(t('profile.resetDone'))
}
</script>

<template>
  <div class="profile-sheet">
    <div class="profile-sheet__summary">
      <img class="icon icon--x2" :src="icon('medal')" alt="" />
      <div>
        <b class="profile-sheet__medal-count">{{ state.medals }}</b>
        <span class="text text--muted">{{ t('profile.medalsFor', { count: state.medals }) }}</span>
      </div>
    </div>
    <ul class="profile-sheet__medals">
      <li v-for="r in RACES" :key="r.id" class="profile-sheet__medal" :class="{ 'profile-sheet__medal--got': state.races.includes(r.id) }">
        <img class="icon profile-sheet__medal-icon" :src="icon(`medal-${r.id}`)" alt="" />
        <span class="profile-sheet__medal-name">{{ raceName(r.id) }}</span>
        <span class="profile-sheet__medal-time">{{ state.bestTimes[r.id] ? fmtClock(state.bestTimes[r.id]!) : state.races.includes(r.id) ? t('profile.finished') : '—' }}</span>
      </li>
    </ul>
    <div class="setting-row">
      <span>{{ t('profile.total') }}</span>
      <b>{{ t('units.km', { v: fmt(state.totalKm) }) }}</b>
    </div>
    <p class="text text--muted text--small">{{ t('profile.timeNote') }}</p>
    <p class="text text--muted text--small">{{ t('profile.offlineNote', { h: fmtHours(offlineHours(state)), p: pct(offlineEff(state)) }) }}</p>
    <div class="setting-row">
      <button v-if="!confirmReset" class="link-button" @click="confirmReset = true">{{ t('profile.reset') }}</button>
      <span v-else>
        {{ t('profile.resetAsk') }}
        <button class="link-button link-button--danger" @click="reset">{{ t('profile.resetConfirm') }}</button>
        <button class="link-button" @click="confirmReset = false">{{ t('common.cancel') }}</button>
      </span>
    </div>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
