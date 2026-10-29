<script setup lang="ts">
// Строка ветки бустеров: иконка текущего уровня · название, множитель, уровни, следующий шаг · цена.
import { buyBoost, fmt, nextBoost } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { boostLevelName, boostName, statName } from '../../../i18n/names.ts'
import { bought, currentLevel, nextDesc } from '../../../composables/shop.ts'
import type { Boost } from '../../../composables/shop.ts'
import { icon } from '../../../utils/assets.ts'
import { xMult } from '../../../utils/format.ts'

const props = defineProps<{ boost: Boost }>()
const b = props.boost
</script>

<template>
  <li class="shop-item boost-row">
    <img class="icon" :class="{ 'icon--start': currentLevel(b).start }" :src="icon(currentLevel(b).icon)" alt="" />
    <div class="shop-item__info">
      <div class="shop-item__name boost-row__name">
        {{ boostName(b.id) }}
        <span class="boost-row__chip" :class="`boost-row__chip--${b.stat}`">{{ statName(b.stat) }} {{ xMult(b.levels[state.boosts[b.id] - 1]?.mult ?? 1) }}</span>
      </div>
      <div class="boost-row__level">{{ boostLevelName(b.id, currentLevel(b).level) }}</div>
      <div class="boost-row__pips" :aria-label="t('boost.level', { a: state.boosts[b.id], b: b.levels.length })">
        <i v-for="(_, i) in b.levels" :key="i" class="boost-row__pip" :class="{ 'boost-row__pip--on': i < state.boosts[b.id] }"></i>
      </div>
      <div class="shop-item__meta">
        {{ nextBoost(state, b.id) ? t('boost.next', { name: boostLevelName(b.id, currentLevel(b).level + 1), desc: nextDesc(b) }) : t('boost.max') }}
      </div>
    </div>
    <button v-if="nextBoost(state, b.id)" class="button button--price" :disabled="state.km < nextBoost(state, b.id)!.cost" @click="bought(buyBoost(state, b.id), 'boost', b.id)">
      {{ t('units.km', { v: fmt(nextBoost(state, b.id)!.cost) }) }}
    </button>
  </li>
</template>

<style lang="scss" src="./styles/component.scss"></style>
