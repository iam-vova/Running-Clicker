<script setup lang="ts">
// Строка ветки бустеров: иконка текущего уровня · название, множитель, уровни, следующий шаг · цена.
import { buyBoost, fmt, nextBoost } from '../../game/logic.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { STAT_NAME, bought, currentLevel, nextDesc } from '../../composables/shop.ts'
import type { Boost } from '../../composables/shop.ts'
import { icon } from '../../utils/assets.ts'
import { xMult } from '../../utils/format.ts'

const props = defineProps<{ boost: Boost }>()
const b = props.boost
</script>

<template>
  <li class="item">
    <img class="ico" :class="{ start: currentLevel(b).start }" :src="icon(currentLevel(b).icon)" alt="" />
    <div class="info">
      <div class="name">
        {{ t(b.name) }}
        <span class="chip" :class="b.stat">{{ t(STAT_NAME[b.stat]) }} {{ xMult(b.levels[state.boosts[b.id] - 1]?.mult ?? 1) }}</span>
      </div>
      <div class="now-name">{{ t(currentLevel(b).name) }}</div>
      <div class="pips" :aria-label="t('Уровень {a} из {b}', { a: state.boosts[b.id], b: b.levels.length })">
        <i v-for="(_, i) in b.levels" :key="i" :class="{ on: i < state.boosts[b.id] }"></i>
      </div>
      <div class="meta">
        {{ nextBoost(state, b.id) ? t('Дальше: {name}, {desc}', { name: t(nextBoost(state, b.id)!.name), desc: nextDesc(b) }) : t('Максимальный уровень') }}
      </div>
    </div>
    <button v-if="nextBoost(state, b.id)" class="buy" :disabled="state.km < nextBoost(state, b.id)!.cost" @click="bought(buyBoost(state, b.id))">
      {{ t('{v} км', { v: fmt(nextBoost(state, b.id)!.cost) }) }}
    </button>
  </li>
</template>

<style scoped>
.name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.chip {
  font-size: 12px;
  border-radius: 999px;
  padding: 2px 8px;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.chip.speed {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
}
.chip.stamina {
  background: color-mix(in srgb, var(--lane) 16%, transparent);
  color: var(--lane);
}
.chip.click {
  background: color-mix(in srgb, var(--ok) 16%, transparent);
  color: var(--ok);
}
.now-name {
  font-size: 14px;
  margin-top: 2px;
}
.pips {
  display: flex;
  gap: 4px;
  max-width: 160px;
  margin: 6px 0 4px;
}
.pips i {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--line);
}
.pips i.on {
  background: var(--fg);
}
</style>
