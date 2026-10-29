<script setup lang="ts">
// «Тренировки»: генераторы км (покупка по ×1/×10/×100) и техника бега.
import { GENERATORS, OFFLINE } from '../../../game/config.ts'
import type { GenId } from '../../../game/config.ts'
import { buyGen, fmt, genCostN, genLevelRate, genRate, genUnlocked, labStamina, offlineEff, offlineHours } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { genName, raceName } from '../../../i18n/names.ts'
import { TRAIN_BOOSTS, bought } from '../../../composables/shop.ts'
import { BULK, useBulk } from '../../../composables/useBulk.ts'
import { icon } from '../../../utils/assets.ts'
import { fmtHours, pct, xMult } from '../../../utils/format.ts'
import BoostRow from '../BoostRow/BoostRow.vue'

const { bulk, setBulk } = useBulk()
const cost = (id: GenId) => genCostN(id, state.owned[id], bulk.value)
/** Как тренировка влияет на офлайн: клуб — лимит часов, тренер — эффективность */
function offlineEffect(id: GenId) {
  if (id === 'club') return t('train.offlineHours', { h: fmtHours(offlineHours(state)) }) + (offlineHours(state) < OFFLINE.maxHours ? '' : t('common.maxSuffix'))
  if (id === 'lab') return t('train.labStamina', { x: xMult(labStamina(state)) })
  if (id === 'coach') return t('train.offlineEff', { p: pct(offlineEff(state)) }) + (offlineEff(state) < OFFLINE.maxEff ? '' : t('common.maxSuffix'))
  return null
}
</script>

<template>
  <div class="train-sheet">
    <!-- «Покупать по» — в панели над прокруткой окна, всегда видна -->
    <Teleport defer to=".bottom-sheet__toolbar">
      <div class="train-sheet__bulk" role="radiogroup" :aria-label="t('train.bulkLabel')">
        <span class="text text--muted text--small train-sheet__bulk-label">{{ t('train.bulk') }}</span>
        <button
          v-for="n in BULK"
          :key="n"
          class="train-sheet__bulk-option"
          :class="{ 'train-sheet__bulk-option--active': bulk === n }"
          role="radio"
          :aria-checked="bulk === n"
          @click="setBulk(n)"
        >
          ×{{ n }}
        </button>
      </div>
    </Teleport>
    <ul class="shop-list">
      <li v-for="g in GENERATORS" :key="g.id" class="shop-item" :class="{ 'shop-item--locked': !genUnlocked(state, g.id) }">
        <img class="icon" :src="icon(g.icon)" alt="" />
        <div class="shop-item__info">
          <div class="shop-item__name">{{ genName(g.id) }} <span class="train-sheet__level">{{ t('train.level', { n: state.owned[g.id] }) }}</span></div>
          <div v-if="genUnlocked(state, g.id)" class="shop-item__meta">
            <div>{{ t('train.perLevel', { v: fmt(genLevelRate(state, g.id) / 60) }) }}</div>
            <div>{{ t('train.total', { v: fmt(genRate(state, g.id) / 60), n: (Math.floor(state.owned[g.id] / 25) + 1) * 25 }) }}</div>
            <div v-if="offlineEffect(g.id)" class="train-sheet__offline">{{ offlineEffect(g.id) }}</div>
          </div>
          <div v-else class="shop-item__meta">{{ t('train.unlocksAfter', { name: raceName(g.unlockRace!) }) }}</div>
        </div>
        <button v-if="genUnlocked(state, g.id)" class="button button--price" :disabled="state.km < cost(g.id)" @click="bought(buyGen(state, g.id, bulk), 'gen', g.id, bulk)">
          {{ t('units.km', { v: fmt(cost(g.id)) }) }}
        </button>
      </li>
    </ul>
    <!-- Техника бега — навык, а не вещь: живёт в «Тренировках» -->
    <ul class="shop-list">
      <BoostRow v-for="b in TRAIN_BOOSTS" :key="b.id" :boost="b" />
    </ul>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
