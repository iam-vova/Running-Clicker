<script setup lang="ts">
import { computed, ref } from 'vue'
// «Забег»: следующий старт (прогноз, лимит, темп, готовность, награда) и список дистанций.
import { RACES } from '../../../game/config.ts'
import type { RaceId } from '../../../game/config.ts'
import { allRacesDone, canStartRace, fmtClock, nightPace } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { raceName } from '../../../i18n/names.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import { icon } from '../../../utils/assets.ts'
import { paceText } from '../../../utils/format.ts'
import ReadyBar from '../../ui/ReadyBar/ReadyBar.vue'

const { nextRace, activeRace, eta, etaBest, avgSpeed, gap, readiness, readyPct, raceStatus, rewardText, ready, go, goRace } = useRace()
const { lastResult, quitRace } = useRaceFlow()
const confirmQuit = ref(false)
const quit = () => {
  confirmQuit.value = false
  quitRace()
}
const { closeSheet } = useSheets()
const start = () => go() && closeSheet()
/** После финала строки дистанций — кнопки повтора на личный рекорд */
const replayMode = computed(() => !activeRace.value && allRacesDone(state))
const replay = (id: RaceId) => goRace(id) && closeSheet()
/** Ночной участок следующего забега (доли дистанции) */
const night = computed(() => (nextRace.value as { night?: readonly [number, number] } | null)?.night ?? null)
const MARK = { done: 'check', next: 'next', locked: 'lock' } as const
const mark = (id: RaceId) => MARK[raceStatus(id)]
</script>

<template>
  <div class="race-sheet">
    <template v-if="activeRace">
      <p class="race-sheet__lead">{{ t('raceSheet.onCourse', { name: raceName(activeRace.id) }) }}</p>
      <button class="button button--primary" @click="closeSheet">{{ t('raceSheet.backToCourse') }}</button>
      <!-- «Сдаться»: первый тап просит подтверждения -->
      <div class="race-sheet__quit">
        <button v-if="!confirmQuit" class="link-button" @click="confirmQuit = true">{{ t('raceHud.quit') }}</button>
        <template v-else>
          <span class="text text--muted">{{ t('raceHud.quitAsk') }}</span>
          <button class="link-button race-sheet__quit-confirm" @click="quit">{{ t('raceHud.quitConfirm') }}</button>
          <button class="link-button" @click="confirmQuit = false">{{ t('raceHud.keepRunning') }}</button>
        </template>
      </div>
    </template>
    <template v-else-if="nextRace">
      <h3 class="race-sheet__name">{{ t('race.title', { name: raceName(nextRace.id) }) }}</h3>
      <dl class="splits">
        <div>
          <dt class="splits__label">{{ t('race.forecast') }}</dt>
          <dd class="splits__value status" :class="`status--${readiness}`">{{ fmtClock(eta) }}</dd>
        </div>
        <div>
          <dt class="splits__label">{{ t('race.cutoff') }}</dt>
          <dd class="splits__value">{{ fmtClock(nextRace.cutoff) }}</dd>
        </div>
        <div>
          <dt class="splits__label">{{ t('race.pace') }}</dt>
          <dd class="splits__value">{{ paceText(avgSpeed) }}</dd>
        </div>
      </dl>
      <div class="race-sheet__row text text--small">
        <span class="text text--muted">{{ t('race.readiness') }}</span>
        <b class="status" :class="`status--${readiness}`">{{ gap > 0 ? `${Math.floor(readyPct * 100)}%` : t('raceSheet.ready') }}</b>
      </div>
      <ReadyBar :pct="readyPct" :state="readiness" />
      <!-- прошлая попытка именно этой дистанции (после схода); после финиша следующий забег другой — не показываем -->
      <p v-if="lastResult && lastResult.id === nextRace.id" class="race-sheet__last status" :class="lastResult.ok ? 'status--ok' : 'status--late'">
        {{ lastResult.ok ? t('raceSheet.lastFinish', { name: raceName(lastResult.id), t: fmtClock(lastResult.time) }) : t('raceSheet.lastDnf', { d: lastResult.covered.toFixed(1) }) }}
      </p>
      <p class="race-sheet__verdict status" :class="gap > 0 ? 'status--late' : 'status--ok'">
        {{ gap > 0 ? t('raceSheet.late', { t: fmtClock(gap) }) : t('raceSheet.onTime', { t: fmtClock(-gap) }) }}
      </p>
      <p class="text text--muted" :class="{ 'status--maybe': readiness === 'maybe' }">
        {{ t('raceSheet.best', { t: fmtClock(etaBest) }) }}
        {{ readiness === 'ok' ? t('raceSheet.chanceOk') : readiness === 'maybe' ? t('raceSheet.chanceMaybe') : t('raceSheet.chanceLate') }}
      </p>
      <p v-if="night" class="text text--muted">{{ t('raceSheet.night', { from: Math.round(night[0] * 100), p: Math.round(nightPace(state) * 100) }) }}</p>
      <p class="text text--muted">{{ t('raceSheet.reward', { r: rewardText(nextRace) }) }}</p>
      <button class="button button--primary" :class="{ 'button--risky': !ready(nextRace.id) }" :disabled="!canStartRace(state, nextRace.id)" @click="start">
        {{ ready(nextRace.id) ? t('raceSheet.start') : t('raceSheet.startRisky') }}
      </button>
    </template>
    <template v-else>
      <h3 class="race-sheet__name">{{ t('raceSheet.allDone') }}</h3>
      <p class="text text--muted">{{ t('raceSheet.replayHint') }}</p>
    </template>

    <h3 class="race-sheet__section">{{ t('raceSheet.distances') }}</h3>
    <ul class="race-sheet__races">
      <li v-for="r in RACES" :key="r.id">
        <!-- после финала: тап по дистанции — повтор на рекорд -->
        <button v-if="replayMode" class="race-sheet__race race-sheet__race--replay" @click="replay(r.id)">
          <img class="race-sheet__race-mark" :src="icon('next')" alt="" />
          <span>{{ raceName(r.id) }}</span>
          <span class="race-sheet__race-cutoff">{{ state.bestTimes[r.id] ? t('raceSheet.record', { t: fmtClock(state.bestTimes[r.id]!) }) : '' }}</span>
        </button>
        <div v-else class="race-sheet__race" :class="`race-sheet__race--${raceStatus(r.id)}`">
          <img class="race-sheet__race-mark" :src="icon(mark(r.id))" alt="" />
          <span>{{ raceName(r.id) }}</span>
          <span class="race-sheet__race-cutoff">{{ t('race.cutoffShort', { t: fmtClock(r.cutoff) }) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
