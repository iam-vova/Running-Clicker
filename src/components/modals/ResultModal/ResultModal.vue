<script setup lang="ts">
// Результат забега: финиш (медаль, время, награды) или сход (где и почему, «Прокачаться» / «Ещё раз»).
import { fmtClock } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import type { Result } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'
import { dnfKm } from '../../../utils/format.ts'
import ModalCard from '../../ui/ModalCard/ModalCard.vue'

defineProps<{ result: Result }>()
const { closeResult, goTrain, retry } = useRaceFlow()
</script>

<template>
  <ModalCard class="result-modal" :label="t('Результат забега')" :align="result.ok ? 'center' : 'left'">
    <template v-if="result.ok">
      <img class="icon icon--x2" :src="icon(`medal-${result.id}`)" alt="" />
      <h2>{{ t('Финиш! {name}', { name: t(result.name) }) }}</h2>
      <dl class="splits splits--two">
        <div>
          <dt class="splits__label">{{ t('Время') }}</dt>
          <dd class="splits__value status status--ok">{{ fmtClock(result.time) }}</dd>
        </div>
        <div>
          <dt class="splits__label">{{ t('Лимит') }}</dt>
          <dd class="splits__value">{{ fmtClock(result.cutoff) }}</dd>
        </div>
      </dl>
      <ul class="result-modal__rewards">
        <li><b>{{ t('+1 медаль') }}</b> {{ t('· всего {n}', { n: state.medals }) }}</li>
        <li><b>{{ t(result.reward) }}</b></li>
        <li v-if="result.unlocked">{{ t('Открыта тренировка:') }} <b>{{ t(result.unlocked) }}</b></li>
        <li v-if="result.next">{{ t('Следующий старт:') }} <b>{{ t(result.next) }}</b></li>
        <li v-else>{{ t('Все дистанции пройдены — дальше марафон в следующей версии') }}</li>
      </ul>
      <button class="button button--primary button--wide" @click="closeResult">{{ t('Дальше') }}</button>
    </template>
    <template v-else>
      <h2>{{ t('Сход на {c} из {k} км', { c: dnfKm(result.covered, result.km), k: result.km }) }}</h2>
      <p v-if="result.gaveUp" class="text text--muted">{{ t(state.character === 'she' ? 'Ты сошла с дистанции на {t}.' : 'Ты сошёл с дистанции на {t}.', { t: fmtClock(result.time) }) }}</p>
      <p v-else class="text text--muted">{{ t('Тень лимита обогнала тебя на {t}.', { t: fmtClock(result.cutoff) }) }}</p>
      <div class="result-modal__actions">
        <button class="button button--primary button--wide" @click="goTrain">{{ t('Прокачаться') }}</button>
        <button class="button result-modal__again" @click="retry">{{ t('Ещё раз') }}</button>
      </div>
    </template>
  </ModalCard>
</template>

<style lang="scss" src="./styles/component.scss"></style>
