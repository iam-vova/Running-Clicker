<script setup lang="ts">
import { computed } from 'vue'
// Результат забега: финиш (медаль, время, награды; на повторе — сравнение с рекордом) или сход (где и почему, «Прокачаться» / «Ещё раз»).
import { fmtClock } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { genName, raceName } from '../../../i18n/names.ts'
import { raceReward } from '../../../composables/useRace.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import type { Result } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'
import { dnfKm } from '../../../utils/format.ts'
import ModalCard from '../../ui/ModalCard/ModalCard.vue'

const props = defineProps<{ result: Result }>()
/** Повтор быстрее прошлого рекорда */
const record = computed(() => !props.result.prevBest || props.result.time < props.result.prevBest)
const { closeResult, goTrain, retry } = useRaceFlow()
</script>

<template>
  <ModalCard class="result-modal" :label="t('result.label')" :align="result.ok ? 'center' : 'left'">
    <template v-if="result.ok">
      <img class="icon icon--x2" :src="icon(`medal-${result.id}`)" alt="" />
      <h2>{{ t('result.finishTitle', { name: raceName(result.id) }) }}</h2>
      <dl class="splits splits--two">
        <div>
          <dt class="splits__label">{{ t('result.time') }}</dt>
          <dd class="splits__value status status--ok">{{ fmtClock(result.time) }}</dd>
        </div>
        <!-- повтор: вместо лимита — прошлый рекорд -->
        <div v-if="result.replay && result.prevBest">
          <dt class="splits__label">{{ t('result.record') }}</dt>
          <dd class="splits__value">{{ fmtClock(result.prevBest) }}</dd>
        </div>
        <div v-else>
          <dt class="splits__label">{{ t('race.cutoff') }}</dt>
          <dd class="splits__value">{{ fmtClock(result.cutoff) }}</dd>
        </div>
      </dl>
      <p v-if="result.replay" class="status" :class="record ? 'status--ok' : 'text text--muted'">
        {{ !result.prevBest ? t('result.firstRecord') : record ? t('result.newRecord', { d: fmtClock(result.prevBest - result.time) }) : t('result.slower', { d: fmtClock(result.time - result.prevBest) }) }}
      </p>
      <ul v-else class="result-modal__rewards">
        <li><b>{{ t('result.plusMedal') }}</b> {{ t('result.medalsTotal', { n: state.medals }) }}</li>
        <li><b>{{ raceReward(result.id) }}</b></li>
        <li v-if="result.unlocked">{{ t('result.unlocked') }} <b>{{ genName(result.unlocked) }}</b></li>
        <li v-if="result.next">{{ t('result.nextRace') }} <b>{{ raceName(result.next) }}</b></li>
        <li v-else>{{ t('result.allDone') }}</li>
      </ul>
      <button class="button button--primary button--wide" @click="closeResult">{{ t('result.next') }}</button>
    </template>
    <template v-else>
      <h2>{{ t('result.dnfTitle', { c: dnfKm(result.covered, result.km), k: result.km }) }}</h2>
      <p v-if="result.gaveUp" class="text text--muted">{{ t(state.character === 'she' ? 'result.gaveUp.she' : 'result.gaveUp.he', { t: fmtClock(result.time) }) }}</p>
      <p v-else class="text text--muted">{{ t('result.ghostPassed', { t: fmtClock(result.cutoff) }) }}</p>
      <div class="result-modal__actions">
        <button class="button button--primary button--wide" @click="goTrain">{{ t('result.levelUp') }}</button>
        <button class="button result-modal__again" @click="retry">{{ t('result.retry') }}</button>
      </div>
    </template>
  </ModalCard>
</template>

<style lang="scss" src="./styles/component.scss"></style>
