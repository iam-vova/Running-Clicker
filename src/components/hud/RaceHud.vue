<script setup lang="ts">
// Забег на трассе: таймер, прогноз, дистанция с тенью лимита, запас сил, «Сдаться».
import { ref } from 'vue'
import { fmtClock } from '../../game/logic.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { useRace } from '../../composables/useRace.ts'
import { useRaceFlow } from '../../composables/useRaceFlow.ts'
import { icon } from '../../utils/assets.ts'

const { activeRace, live } = useRace()
const { quitRace } = useRaceFlow()
/** «Сдаться»: первый тап просит подтверждения, второй — сход */
const confirmQuit = ref(false)
</script>

<template>
  <div v-if="state.activeRace && activeRace && live" class="card">
    <div class="race-row">
      <b>{{ t('На трассе: {name}', { name: t(activeRace.name) }) }}</b>
      <span class="timer"><img class="ico-inline" :src="icon('stopwatch')" alt="" />{{ fmtClock(state.activeRace.elapsed) }}</span>
    </div>
    <div class="race-row">
      <span>{{ t('Прогноз финиша') }} <b :class="live.finish > activeRace.cutoff ? 'late' : 'ok'">{{ fmtClock(live.finish) }}</b></span>
      <span class="muted">{{ t('лимит {t}', { t: fmtClock(activeRace.cutoff) }) }}</span>
    </div>
    <div class="distance" :aria-label="t('Пройденная дистанция')" role="progressbar" :aria-valuenow="Math.round(live.runner * 100)" aria-valuemin="0" aria-valuemax="100">
      <i class="fill" :class="{ ok: live.leadM >= 0 }" :style="{ width: live.runner * 100 + '%' }"></i>
      <span class="ghost sprite run" :style="{ left: live.ghost * 100 + '%' }" aria-hidden="true"></span>
      <span class="dot" :style="{ left: live.runner * 100 + '%' }"></span>
    </div>
    <div class="race-row">
      <span>{{ t('{c} из {k} км', { c: state.activeRace.covered.toFixed(2), k: activeRace.km }) }}</span>
      <b :class="live.leadM >= 0 ? 'ok' : 'late'">
        {{ live.leadM >= 0 ? t('отрыв от тени +{m} м', { m: Math.round(live.leadM) }) : t('тень впереди на {m} м', { m: Math.round(-live.leadM) }) }}
      </b>
    </div>
    <!-- Запас сил: рывки тратят, гели на пунктах питания возвращают; отметка — сколько нужно до финиша ровным бегом -->
    <div class="race-row">
      <span>{{ t('Силы') }} <b :class="live.wall ? 'late' : live.energy >= live.need ? 'ok' : 'maybe'">{{ Math.round(live.energy * 100) }}%</b></span>
      <span class="muted">{{ live.wall ? t('Стена! Лови гель') : live.energy >= live.need ? t('хватит до финиша') : t('не хватит до финиша') }}</span>
    </div>
    <div class="energy" role="progressbar" :aria-label="t('Запас сил')" :aria-valuenow="Math.round(live.energy * 100)" aria-valuemin="0" aria-valuemax="100">
      <i :class="live.energy >= live.need ? 'ok' : 'late'" :style="{ width: live.energy * 100 + '%' }"></i>
      <span class="need" :style="{ left: Math.min(live.need, 1) * 100 + '%' }"></span>
    </div>
    <div class="quit-row">
      <button v-if="!confirmQuit" class="quit" @click="confirmQuit = true">{{ t('Сдаться') }}</button>
      <template v-else>
        <span class="muted">{{ t('Сойти с дистанции?') }}</span>
        <button class="quit danger" @click="quitRace">{{ t('Да, сойти') }}</button>
        <button class="quit" @click="confirmQuit = false">{{ t('Бежать дальше') }}</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.card {
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
}
.timer {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
/* Пройденная дистанция — сплошная «дорожка» с точкой бегуна и мини-тенью лимита */
.distance {
  position: relative;
  height: 12px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--accent) 22%, var(--line));
}
.fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 5px;
  background: var(--accent);
}
.fill.ok {
  background: var(--ok);
}
.ghost {
  position: absolute;
  top: -6px;
  width: 24px;
  height: 24px;
  transform: translateX(-50%);
  filter: brightness(0);
  opacity: 0.45;
  pointer-events: none;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .ghost {
    filter: brightness(0) invert(1);
    opacity: 0.28;
  }
}
:root[data-theme='dark'] .ghost {
  filter: brightness(0) invert(1);
  opacity: 0.28;
}
.dot {
  position: absolute;
  top: -3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  transform: translateX(-50%);
  background: var(--fg);
  border: 3px solid var(--surface);
}
/* Запас сил: метка — сколько нужно до финиша ровным бегом */
.energy {
  position: relative;
  height: 10px;
  border-radius: 5px;
  background: var(--line);
}
.energy i {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 5px;
  background: var(--warn);
  transition: width 0.15s;
}
.energy i.ok {
  background: var(--lane);
}
.need {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 2px;
  margin-left: -1px;
  background: var(--fg);
}
.quit-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  pointer-events: auto;
}
.quit {
  border: 0;
  background: none;
  padding: 2px 0;
  font-size: 13px;
  color: var(--muted);
  text-decoration: underline;
}
.quit.danger {
  color: var(--accent);
  font-weight: 600;
}
</style>
