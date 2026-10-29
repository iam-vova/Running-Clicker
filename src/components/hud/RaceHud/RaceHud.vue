<script setup lang="ts">
// Забег на трассе: таймер, прогноз, дистанция с тенью лимита, запас сил, «Сдаться».
import { computed, ref } from 'vue'
import { fmtClock } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { raceName } from '../../../i18n/names.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'

const { activeRace, live } = useRace()
const { quitRace } = useRaceFlow()
/** «Сдаться»: первый тап просит подтверждения, второй — сход */
const confirmQuit = ref(false)
const enough = computed(() => !!live.value && live.value.energy >= live.value.need)
</script>

<template>
  <div v-if="state.activeRace && activeRace && live" class="race-hud">
    <div class="race-hud__row">
      <b>{{ t('raceHud.title', { name: raceName(activeRace.id) }) }}</b>
      <span class="race-hud__timer"><img class="icon icon--inline" :src="icon('stopwatch')" alt="" />{{ fmtClock(state.activeRace.elapsed) }}</span>
    </div>
    <div class="race-hud__row">
      <span>{{ t('race.forecast') }} <b class="status" :class="live.finish > activeRace.cutoff ? 'status--late' : 'status--ok'">{{ fmtClock(live.finish) }}</b></span>
      <span class="text text--muted">{{ t('race.cutoffShort', { t: fmtClock(activeRace.cutoff) }) }}</span>
    </div>
    <div class="race-hud__distance" :aria-label="t('raceHud.distance')" role="progressbar" :aria-valuenow="Math.round(live.runner * 100)" aria-valuemin="0" aria-valuemax="100">
      <i class="race-hud__distance-fill" :class="{ 'race-hud__distance-fill--ok': live.leadM >= 0 }" :style="{ width: live.runner * 100 + '%' }"></i>
      <span class="sprite sprite--run race-hud__ghost" :style="{ left: live.ghost * 100 + '%' }" aria-hidden="true"></span>
      <span class="race-hud__dot" :style="{ left: live.runner * 100 + '%' }"></span>
    </div>
    <div class="race-hud__row">
      <span>{{ t('raceHud.covered', { c: state.activeRace.covered.toFixed(2), k: activeRace.km }) }}</span>
      <b class="status" :class="live.leadM >= 0 ? 'status--ok' : 'status--late'">
        {{ live.leadM >= 0 ? t('raceHud.ahead', { m: Math.round(live.leadM) }) : t('raceHud.behind', { m: Math.round(-live.leadM) }) }}
      </b>
    </div>
    <!-- Запас сил: рывки тратят, гели на пунктах питания возвращают; отметка — сколько нужно до финиша ровным бегом -->
    <div class="race-hud__row">
      <span>{{ t('raceHud.energy') }} <b class="status" :class="live.wall ? 'status--late' : enough ? 'status--ok' : 'status--maybe'">{{ Math.round(live.energy * 100) }}%</b></span>
      <span class="text text--muted">{{ live.wall ? t('raceHud.wall') : enough ? t('raceHud.enough') : t('raceHud.notEnough') }}</span>
    </div>
    <div class="race-hud__energy" role="progressbar" :aria-label="t('raceHud.energyReserve')" :aria-valuenow="Math.round(live.energy * 100)" aria-valuemin="0" aria-valuemax="100">
      <i class="race-hud__energy-fill" :class="{ 'race-hud__energy-fill--ok': enough }" :style="{ width: live.energy * 100 + '%' }"></i>
      <span class="race-hud__energy-need" :style="{ left: Math.min(live.need, 1) * 100 + '%' }"></span>
    </div>
    <div class="race-hud__quit-row">
      <button v-if="!confirmQuit" class="race-hud__quit" @click="confirmQuit = true">{{ t('raceHud.quit') }}</button>
      <template v-else>
        <span class="text text--muted">{{ t('raceHud.quitAsk') }}</span>
        <button class="race-hud__quit race-hud__quit--danger" @click="quitRace">{{ t('raceHud.quitConfirm') }}</button>
        <button class="race-hud__quit" @click="confirmQuit = false">{{ t('raceHud.keepRunning') }}</button>
      </template>
    </div>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
