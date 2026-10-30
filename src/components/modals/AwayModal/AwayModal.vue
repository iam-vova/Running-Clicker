<script setup lang="ts">
// «Пока тебя не было»: сколько натренировал бегун офлайн и по каким правилам. Пока открыто — забег на паузе.
import { ref } from 'vue'
import { fmt } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { canReward, showRewarded } from '../../../platform.ts'
import type { OfflineReport } from '../../../game/logic.ts'
import { t } from '../../../i18n/index.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'
import { fmtAway, fmtHours, pct } from '../../../utils/format.ts'
import ModalCard from '../../ui/ModalCard/ModalCard.vue'

const props = defineProps<{ report: OfflineReport }>()
const { closeAway } = useRaceFlow()
/** ×2 за рекламу (Яндекс Игры): ещё столько же км; один раз на окно */
const doubled = ref(false)
async function double() {
  if (!(await showRewarded())) return
  state.km += props.report.km
  state.totalKm += props.report.km
  doubled.value = true
}
</script>

<template>
  <ModalCard class="away-modal" :label="t('away.title')">
    <img class="icon icon--x2" :src="icon('jog')" alt="" />
    <div>
      <h2>{{ t('away.title') }}</h2>
      <p class="text text--muted">{{ t('away.subtitle') }}</p>
    </div>
    <dl class="splits splits--two">
      <div>
        <dt class="splits__label">{{ t('away.timeAway') }}</dt>
        <dd class="splits__value">{{ fmtAway(report.away) }}</dd>
      </div>
      <div>
        <dt class="splits__label">{{ t('hud.trainingKm') }}</dt>
        <dd class="splits__value status status--ok">+{{ fmt(doubled ? report.km * 2 : report.km) }}</dd>
      </div>
    </dl>
    <p class="text text--muted text--small">
      <template v-if="report.counted < report.away">{{ t('away.capped', { h: fmtHours(report.hours) }) }}</template>
      {{ t('away.efficiency', { p: pct(report.eff) }) }}
      <template v-if="report.racePaused"><br />{{ t('away.racePaused') }}</template>
    </p>
    <button v-if="canReward && !doubled" class="button button--primary button--wide" @click="double">{{ t('away.double') }}</button>
    <button class="button button--wide" :class="{ 'button--primary': !canReward || doubled }" @click="closeAway">{{ t('away.continue') }}</button>
  </ModalCard>
</template>

<style lang="scss" src="./styles/component.scss"></style>
