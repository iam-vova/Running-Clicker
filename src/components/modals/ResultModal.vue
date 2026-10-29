<script setup lang="ts">
// Результат забега: финиш (медаль, время, награды) или сход (где и почему, «Прокачаться» / «Ещё раз»).
import { fmtClock } from '../../game/logic.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { useRaceFlow } from '../../composables/useRaceFlow.ts'
import type { Result } from '../../composables/useRaceFlow.ts'
import { icon } from '../../utils/assets.ts'
import { dnfKm } from '../../utils/format.ts'
import ModalCard from '../ui/ModalCard.vue'

defineProps<{ result: Result }>()
const { closeResult, goTrain, retry } = useRaceFlow()
</script>

<template>
  <ModalCard :label="t('Результат забега')" :align="result.ok ? 'center' : 'left'">
    <template v-if="result.ok">
      <img class="ico x2" :src="icon(`medal-${result.id}`)" alt="" />
      <h2>{{ t('Финиш! {name}', { name: t(result.name) }) }}</h2>
      <dl class="splits two">
        <div>
          <dt>{{ t('Время') }}</dt>
          <dd class="ok">{{ fmtClock(result.time) }}</dd>
        </div>
        <div>
          <dt>{{ t('Лимит') }}</dt>
          <dd>{{ fmtClock(result.cutoff) }}</dd>
        </div>
      </dl>
      <ul class="rewards">
        <li><b>{{ t('+1 медаль') }}</b> {{ t('· всего {n}', { n: state.medals }) }}</li>
        <li><b>{{ t(result.reward) }}</b></li>
        <li v-if="result.unlocked">{{ t('Открыта тренировка:') }} <b>{{ t(result.unlocked) }}</b></li>
        <li v-if="result.next">{{ t('Следующий старт:') }} <b>{{ t(result.next) }}</b></li>
        <li v-else>{{ t('Все дистанции пройдены — дальше марафон в следующей версии') }}</li>
      </ul>
      <button class="primary" @click="closeResult">{{ t('Дальше') }}</button>
    </template>
    <template v-else>
      <h2>{{ t('Сход на {c} из {k} км', { c: dnfKm(result.covered, result.km), k: result.km }) }}</h2>
      <p v-if="result.gaveUp" class="muted">{{ t(state.character === 'she' ? 'Ты сошла с дистанции на {t}.' : 'Ты сошёл с дистанции на {t}.', { t: fmtClock(result.time) }) }}</p>
      <p v-else class="muted">{{ t('Тень лимита обогнала тебя на {t}.', { t: fmtClock(result.cutoff) }) }}</p>
      <div class="actions">
        <button class="primary" @click="goTrain">{{ t('Прокачаться') }}</button>
        <button class="again" @click="retry">{{ t('Ещё раз') }}</button>
      </div>
    </template>
  </ModalCard>
</template>

<style scoped>
.rewards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.actions {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
}
/* «Ещё раз» — нейтральная пиксельная кнопка рядом с главной */
.again {
  border: 8px solid transparent;
  border-bottom-width: 12px;
  border-image: var(--btn-neutral) 4 4 6 4 fill / 8px 8px 12px 8px stretch;
  image-rendering: pixelated;
  background: none;
  color: var(--bg);
  font-weight: 600;
  padding: 7px 4px;
}
.again:active {
  border-image-source: var(--btn-neutral-down);
}
</style>
