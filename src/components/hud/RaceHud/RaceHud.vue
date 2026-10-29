<script setup lang="ts">
// Забег на трассе: дистанция, отрыв от лимита и прогноз, дорожка с тенью лимита, запас сил. «Сдаться» — в окне «Забег».
import { computed } from 'vue'
import { fmtClock } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { raceName } from '../../../i18n/names.ts'
import { useRace } from '../../../composables/useRace.ts'
import { icon } from '../../../utils/assets.ts'

const { activeRace, live } = useRace()
const enough = computed(() => !!live.value && live.value.energy >= live.value.need)
/** На ультра сил без гелей не хватит — но хватит, если ловить гели впереди */
const enoughWithGels = computed(() => !!live.value && live.value.energy + live.value.gelsAhead >= live.value.need)
/** Подсказка на первых двух забегах: как тратить силы. В карточке забега — на сцене её закрывали бегуны и плашки */
const tip = computed(() => {
  const l = live.value
  if (!l || state.races.length >= 2) return ''
  if (l.spareTaps > 0) return t('raceHud.tipTap')
  return l.gelsAhead > 0 ? t('raceHud.tipGel') : t('raceHud.tipSave')
})
/** Хватит ли сил до финиша: хватает / жди гель / не хватит / стена (сколько рывков — в панели рывка внизу) */
const energyState = computed(() => {
  const l = live.value
  if (!l) return ''
  if (l.wall) return t('raceHud.stWall')
  if (enough.value) return t('raceHud.stOk')
  return enoughWithGels.value ? t('raceHud.stWaitGel') : t('raceHud.stNotEnough')
})
/** Название крупно: «3» + «км»; «Марафон» — целиком */
const title = computed(() => {
  const name = activeRace.value ? raceName(activeRace.value.id) : ''
  const m = name.match(/^([\d.,]+)\s*(.*)$/)
  return m ? { num: m[1], unit: m[2] } : { num: name, unit: '' }
})
/** Прогноз минус лимит: «−0:21» — успеваешь с запасом, «+1:05» — не успеваешь */
const late = computed(() => !!live.value && !!activeRace.value && live.value.finish > activeRace.value.cutoff)
const gapText = computed(() => {
  if (!live.value || !activeRace.value) return ''
  const g = live.value.finish - activeRace.value.cutoff
  return (g > 0 ? '+' : '−') + fmtClock(Math.abs(g))
})
</script>

<template>
  <div v-if="state.activeRace && activeRace && live" class="race-hud">
    <!-- дистанция крупно · отрыв от лимита и прогноз финиша -->
    <div class="race-hud__head">
      <span class="race-hud__name">
        <b>{{ title.num }}</b><span v-if="title.unit" class="race-hud__unit">{{ title.unit }}</span>
      </span>
      <span class="race-hud__finish">
        <span class="status" :class="late ? 'status--late' : 'status--ok'">{{ gapText }}</span>
        <span class="text text--muted"> / </span>
        <b class="race-hud__forecast status" :class="late ? 'status--late' : 'status--ok'">{{ fmtClock(live.finish) }}</b>
      </span>
    </div>
    <div class="race-hud__row race-hud__sub">
      <span>{{ state.activeRace.covered.toFixed(2) }} / {{ activeRace.km }} {{ t('hud.kmUnit') }}</span>
      <span>{{ t('race.cutoff') }} <b>{{ fmtClock(activeRace.cutoff) }}</b></span>
    </div>
    <!-- пройдено: точка — бегун, силуэт — тень лимита, флаг — финиш -->
    <span class="race-hud__label">{{ t('raceHud.distanceLabel') }}</span>
    <div class="race-hud__track">
      <div class="race-hud__distance" :aria-label="t('raceHud.covered', { c: state.activeRace.covered.toFixed(2), k: activeRace.km })" role="progressbar" :aria-valuenow="Math.round(live.runner * 100)" aria-valuemin="0" aria-valuemax="100">
        <i class="race-hud__distance-fill" :class="{ 'race-hud__distance-fill--ok': live.leadM >= 0 }" :style="{ width: live.runner * 100 + '%' }"></i>
        <span class="sprite sprite--run race-hud__ghost" :style="{ left: live.ghost * 100 + '%' }" aria-hidden="true"></span>
        <span class="race-hud__dot" :style="{ left: live.runner * 100 + '%' }"></span>
      </div>
      <img class="icon race-hud__flag" :src="icon('flag')" alt="" />
    </div>
    <!-- силы: рывки тратят, гели возвращают; отметка — сколько нужно до финиша ровным бегом -->
    <div class="race-hud__row">
      <span class="race-hud__label">{{ t('raceHud.energy') }}</span>
      <b class="race-hud__label status" :class="live.wall ? 'status--late' : enough || live.spareTaps > 0 ? 'status--ok' : 'status--maybe'">{{ energyState }}</b>
    </div>
    <div class="race-hud__energy" role="progressbar" :aria-label="t('raceHud.energyReserve')" :aria-valuenow="Math.round(live.energy * 100)" aria-valuemin="0" aria-valuemax="100">
      <!-- светлым — сколько ещё вернут гели впереди, если их ловить -->
      <i v-if="live.gelsAhead > 0" class="race-hud__energy-gels" :style="{ width: Math.min(live.energy + live.gelsAhead, live.scale) / live.scale * 100 + '%' }"></i>
      <i class="race-hud__energy-fill" :class="{ 'race-hud__energy-fill--ok': enough }" :style="{ width: (live.energy / live.scale) * 100 + '%' }"></i>
      <span class="race-hud__energy-need" :style="{ left: (Math.min(live.need, live.scale) / live.scale) * 100 + '%' }"></span>
    </div>
    <p v-if="tip" class="race-hud__tip">{{ tip }}</p>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
