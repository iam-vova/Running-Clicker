<script setup lang="ts">
// «Забег»: следующий старт (прогноз, лимит, темп, готовность, награда) и список дистанций.
import { RACES } from '../../game/config.ts'
import { canStartRace, fmtClock } from '../../game/logic.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { useRace } from '../../composables/useRace.ts'
import { useRaceFlow } from '../../composables/useRaceFlow.ts'
import { useSheets } from '../../composables/useSheets.ts'
import { icon } from '../../utils/assets.ts'
import { paceText } from '../../utils/format.ts'

const { nextRace, activeRace, eta, etaBest, avgSpeed, gap, readiness, readyPct, raceStatus, rewardText, ready, go } = useRace()
const { lastResult } = useRaceFlow()
const { closeSheet } = useSheets()
const start = () => go() && closeSheet()
const mark = (id: (typeof RACES)[number]['id']) => ({ done: 'check', next: 'next', locked: 'lock' })[raceStatus(id)]
</script>

<template>
  <template v-if="activeRace">
    <p class="lead">{{ t('Ты на трассе {name}. Закрой окно: тапы — рывки за счёт сил, гели на пунктах питания возвращают силы.', { name: t(activeRace.name) }) }}</p>
    <button class="primary" @click="closeSheet">{{ t('К трассе') }}</button>
  </template>
  <template v-else-if="nextRace">
    <h3 class="race-name">{{ t('Забег {name}', { name: t(nextRace.name) }) }}</h3>
    <dl class="splits">
      <div>
        <dt>{{ t('Прогноз финиша') }}</dt>
        <dd :class="readiness">{{ fmtClock(eta) }}</dd>
      </div>
      <div>
        <dt>{{ t('Лимит') }}</dt>
        <dd>{{ fmtClock(nextRace.cutoff) }}</dd>
      </div>
      <div>
        <dt>{{ t('Темп') }}</dt>
        <dd>{{ paceText(avgSpeed) }}</dd>
      </div>
    </dl>
    <div class="race-row small">
      <span class="muted">{{ t('Готовность к забегу') }}</span>
      <b :class="readiness">{{ gap > 0 ? `${Math.floor(readyPct * 100)}%` : t('Готов ✓') }}</b>
    </div>
    <div class="ready" role="progressbar" :aria-valuenow="Math.round(readyPct * 100)" aria-valuemin="0" aria-valuemax="100">
      <i :class="readiness" :style="{ width: readyPct * 100 + '%' }"></i>
    </div>
    <p v-if="lastResult" class="last" :class="lastResult.ok ? 'ok' : 'late'">
      {{ lastResult.ok ? t('Прошлая попытка: финиш {name} за {t}', { name: t(lastResult.name), t: fmtClock(lastResult.time) }) : t('Прошлая попытка: сход на {d} км', { d: lastResult.covered.toFixed(1) }) }}
    </p>
    <p class="verdict" :class="gap > 0 ? 'late' : 'ok'">
      {{ gap > 0 ? t('Не успеваешь на {t}', { t: fmtClock(gap) }) : t('Успеваешь с запасом {t}', { t: fmtClock(-gap) }) }}
    </p>
    <p class="muted" :class="{ maybe: readiness === 'maybe' }">
      {{ t('С рывками и гелями — до {t}.', { t: fmtClock(etaBest) }) }}
      {{ readiness === 'ok' ? t('Хороший шанс на личный рекорд.') : readiness === 'maybe' ? t('Успеешь, если правильно расходовать силы.') : t('Пока не хватит даже с ними.') }}
    </p>
    <p class="muted">{{ t('Награда: {r}', { r: rewardText(nextRace) }) }}</p>
    <button class="primary" :class="{ risky: !ready(nextRace.id) }" :disabled="!canStartRace(state, nextRace.id)" @click="start">
      {{ ready(nextRace.id) ? t('Старт') : t('Старт — рискнуть') }}
    </button>
  </template>
  <template v-else>
    <h3 class="race-name">{{ t('Все забеги пройдены') }}</h3>
    <p class="muted">{{ t('Следующий старт — 30 км и марафон. Появятся в следующей версии.') }}</p>
  </template>

  <h3 class="section">{{ t('Дистанции') }}</h3>
  <ul class="races">
    <li v-for="r in RACES" :key="r.id" :class="raceStatus(r.id)">
      <img class="mark" :src="icon(mark(r.id))" alt="" />
      <span>{{ t(r.name) }}</span>
      <span class="cut">{{ t('лимит {t}', { t: fmtClock(r.cutoff) }) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.lead,
.verdict,
.last {
  margin: 0;
}
.verdict {
  font-weight: 600;
}
.last {
  font-size: 13px;
  font-weight: 600;
}
.race-name {
  font-size: 26px;
}
.races {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}
.races li {
  display: grid;
  grid-template-columns: 24px 1fr auto;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--line);
  font-variant-numeric: tabular-nums;
}
.races li.locked {
  color: var(--muted);
}
.races li.next {
  font-weight: 600;
}
.mark {
  width: 16px;
  height: 16px;
  image-rendering: pixelated;
}
.cut {
  color: var(--muted);
  font-size: 13px;
}
</style>
