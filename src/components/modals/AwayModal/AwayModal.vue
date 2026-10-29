<script setup lang="ts">
// «Пока тебя не было»: сколько натренировал бегун офлайн и по каким правилам. Пока открыто — забег на паузе.
import { fmt } from '../../../game/logic.ts'
import type { OfflineReport } from '../../../game/logic.ts'
import { t } from '../../../i18n.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'
import { fmtAway, fmtHours, pct } from '../../../utils/format.ts'
import ModalCard from '../../ui/ModalCard/ModalCard.vue'

defineProps<{ report: OfflineReport }>()
const { closeAway } = useRaceFlow()
</script>

<template>
  <ModalCard class="away-modal" :label="t('Пока тебя не было')">
    <img class="icon icon--x2" :src="icon('jog')" alt="" />
    <div>
      <h2>{{ t('Пока тебя не было') }}</h2>
      <p class="text text--muted">{{ t('Бегун продолжал тренироваться') }}</p>
    </div>
    <dl class="splits splits--two">
      <div>
        <dt class="splits__label">{{ t('Время отсутствия') }}</dt>
        <dd class="splits__value">{{ fmtAway(report.away) }}</dd>
      </div>
      <div>
        <dt class="splits__label">{{ t('Тренировочные км') }}</dt>
        <dd class="splits__value status status--ok">+{{ fmt(report.km) }}</dd>
      </div>
    </dl>
    <p class="text text--muted text--small">
      <template v-if="report.counted < report.away">{{ t('Засчитано {h} — это лимит (растёт с «Беговым клубом»). ', { h: fmtHours(report.hours) }) }}</template>
      {{ t('Офлайн тренировки идут на {p} от темпа в игре (растёт с «Личным тренером»).', { p: pct(report.eff) }) }}
      <template v-if="report.racePaused"><br />{{ t('Забег стоял на паузе — продолжишь с того же места.') }}</template>
    </p>
    <button class="button button--primary button--wide" @click="closeAway">{{ t('Продолжить') }}</button>
  </ModalCard>
</template>

<style lang="scss" src="./styles/component.scss"></style>
