<script setup lang="ts">
// «Забег»: следующий старт (прогноз, лимит, темп, готовность, награда) и список дистанций.
import { RACES } from '../../../game/config.ts'
import type { RaceId } from '../../../game/config.ts'
import { canStartRace, fmtClock } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import { icon } from '../../../utils/assets.ts'
import { paceText } from '../../../utils/format.ts'
import ReadyBar from '../../ui/ReadyBar/ReadyBar.vue'

const { nextRace, activeRace, eta, etaBest, avgSpeed, gap, readiness, readyPct, raceStatus, rewardText, ready, go } = useRace()
const { lastResult } = useRaceFlow()
const { closeSheet } = useSheets()
const start = () => go() && closeSheet()
const MARK = { done: 'check', next: 'next', locked: 'lock' } as const
const mark = (id: RaceId) => MARK[raceStatus(id)]
</script>

<template>
  <div class="race-sheet">
    <template v-if="activeRace">
      <p class="race-sheet__lead">{{ t('Ты на трассе {name}. Закрой окно: тапы — рывки за счёт сил, гели на пунктах питания возвращают силы.', { name: t(activeRace.name) }) }}</p>
      <button class="button button--primary" @click="closeSheet">{{ t('К трассе') }}</button>
    </template>
    <template v-else-if="nextRace">
      <h3 class="race-sheet__name">{{ t('Забег {name}', { name: t(nextRace.name) }) }}</h3>
      <dl class="splits">
        <div>
          <dt class="splits__label">{{ t('Прогноз финиша') }}</dt>
          <dd class="splits__value status" :class="`status--${readiness}`">{{ fmtClock(eta) }}</dd>
        </div>
        <div>
          <dt class="splits__label">{{ t('Лимит') }}</dt>
          <dd class="splits__value">{{ fmtClock(nextRace.cutoff) }}</dd>
        </div>
        <div>
          <dt class="splits__label">{{ t('Темп') }}</dt>
          <dd class="splits__value">{{ paceText(avgSpeed) }}</dd>
        </div>
      </dl>
      <div class="race-sheet__row text text--small">
        <span class="text text--muted">{{ t('Готовность к забегу') }}</span>
        <b class="status" :class="`status--${readiness}`">{{ gap > 0 ? `${Math.floor(readyPct * 100)}%` : t('Готов ✓') }}</b>
      </div>
      <ReadyBar :pct="readyPct" :state="readiness" />
      <p v-if="lastResult" class="race-sheet__last status" :class="lastResult.ok ? 'status--ok' : 'status--late'">
        {{ lastResult.ok ? t('Прошлая попытка: финиш {name} за {t}', { name: t(lastResult.name), t: fmtClock(lastResult.time) }) : t('Прошлая попытка: сход на {d} км', { d: lastResult.covered.toFixed(1) }) }}
      </p>
      <p class="race-sheet__verdict status" :class="gap > 0 ? 'status--late' : 'status--ok'">
        {{ gap > 0 ? t('Не успеваешь на {t}', { t: fmtClock(gap) }) : t('Успеваешь с запасом {t}', { t: fmtClock(-gap) }) }}
      </p>
      <p class="text text--muted" :class="{ 'status--maybe': readiness === 'maybe' }">
        {{ t('С рывками и гелями — до {t}.', { t: fmtClock(etaBest) }) }}
        {{ readiness === 'ok' ? t('Хороший шанс на личный рекорд.') : readiness === 'maybe' ? t('Успеешь, если правильно расходовать силы.') : t('Пока не хватит даже с ними.') }}
      </p>
      <p class="text text--muted">{{ t('Награда: {r}', { r: rewardText(nextRace) }) }}</p>
      <button class="button button--primary" :class="{ 'button--risky': !ready(nextRace.id) }" :disabled="!canStartRace(state, nextRace.id)" @click="start">
        {{ ready(nextRace.id) ? t('Старт') : t('Старт — рискнуть') }}
      </button>
    </template>
    <template v-else>
      <h3 class="race-sheet__name">{{ t('Все забеги пройдены') }}</h3>
      <p class="text text--muted">{{ t('Следующий старт — 30 км и марафон. Появятся в следующей версии.') }}</p>
    </template>

    <h3 class="race-sheet__section">{{ t('Дистанции') }}</h3>
    <ul class="race-sheet__races">
      <li v-for="r in RACES" :key="r.id" class="race-sheet__race" :class="`race-sheet__race--${raceStatus(r.id)}`">
        <img class="race-sheet__race-mark" :src="icon(mark(r.id))" alt="" />
        <span>{{ t(r.name) }}</span>
        <span class="race-sheet__race-cutoff">{{ t('лимит {t}', { t: fmtClock(r.cutoff) }) }}</span>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
