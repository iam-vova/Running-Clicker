<script setup lang="ts">
// Забег на трассе: место, таймер, прогноз против лимита, дистанция с тенью лимита, запас сил. «Сдаться» — в окне «Забег».
import { computed } from 'vue'
import { fmtClock } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { raceName } from '../../../i18n/names.ts'
import { useRace } from '../../../composables/useRace.ts'

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
/** Что делать с силами: сколько рывков в запасе, или беречь их до геля / до финиша */
const energyHint = computed(() => {
  const l = live.value
  if (!l) return ''
  if (l.wall) return t('raceHud.wall')
  if (l.spareTaps > 0) return t('raceHud.spareTaps', { count: l.spareTaps })
  if (enough.value) return t('raceHud.noSpare')
  return enoughWithGels.value ? t('raceHud.waitGel') : t('raceHud.notEnough')
})
</script>

<template>
  <div v-if="state.activeRace && activeRace && live" class="race-hud">
    <!-- дистанция и место · прогноз финиша против лимита -->
    <div class="race-hud__row">
      <span>
        <b class="race-hud__title">{{ raceName(activeRace.id) }}</b>
        <span class="race-hud__place">{{ t('raceHud.place', { p: live.place, n: live.field }) }}</span>
      </span>
      <span>
        {{ t('raceHud.finish') }} <b class="status" :class="live.finish > activeRace.cutoff ? 'status--late' : 'status--ok'">{{ fmtClock(live.finish) }}</b>
        <span class="text text--muted"> / {{ fmtClock(activeRace.cutoff) }}</span>
      </span>
    </div>
    <!-- пройдено: точка — бегун, силуэт — тень лимита; зелёная заливка — впереди тени -->
    <div class="race-hud__distance" :aria-label="t('raceHud.covered', { c: state.activeRace.covered.toFixed(2), k: activeRace.km })" role="progressbar" :aria-valuenow="Math.round(live.runner * 100)" aria-valuemin="0" aria-valuemax="100">
      <i class="race-hud__distance-fill" :class="{ 'race-hud__distance-fill--ok': live.leadM >= 0 }" :style="{ width: live.runner * 100 + '%' }"></i>
      <span class="sprite sprite--run race-hud__ghost" :style="{ left: live.ghost * 100 + '%' }" aria-hidden="true"></span>
      <span class="race-hud__dot" :style="{ left: live.runner * 100 + '%' }"></span>
    </div>
    <!-- силы: рывки тратят, гели возвращают; отметка — сколько нужно до финиша ровным бегом; справа — что делать -->
    <div class="race-hud__energy-row">
      <div class="race-hud__energy" role="progressbar" :aria-label="t('raceHud.energyReserve')" :aria-valuenow="Math.round(live.energy * 100)" aria-valuemin="0" aria-valuemax="100">
        <i class="race-hud__energy-fill" :class="{ 'race-hud__energy-fill--ok': enough }" :style="{ width: live.energy * 100 + '%' }"></i>
        <span class="race-hud__energy-need" :style="{ left: Math.min(live.need, 1) * 100 + '%' }"></span>
      </div>
      <b class="race-hud__energy-hint status" :class="live.wall ? 'status--late' : live.spareTaps > 0 ? 'status--ok' : 'status--maybe'">{{ energyHint }}</b>
    </div>
    <p v-if="tip" class="race-hud__tip">{{ tip }}</p>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
