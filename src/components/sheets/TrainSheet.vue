<script setup lang="ts">
// «Тренировки»: генераторы км (покупка по ×1/×10/×100) и техника бега.
import { GENERATORS, OFFLINE, RACES } from '../../game/config.ts'
import type { GenId } from '../../game/config.ts'
import { buyGen, fmt, genCostN, genLevelRate, genRate, genUnlocked, offlineEff, offlineHours } from '../../game/logic.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { TRAIN_BOOSTS, bought } from '../../composables/shop.ts'
import { BULK, useBulk } from '../../composables/useBulk.ts'
import { icon } from '../../utils/assets.ts'
import { fmtHours, pct } from '../../utils/format.ts'
import BoostRow from './BoostRow.vue'

const { bulk, setBulk } = useBulk()
const raceName = (id: string) => t(RACES.find((r) => r.id === id)?.name ?? id)
const cost = (id: GenId) => genCostN(id, state.owned[id], bulk.value)
/** Как тренировка влияет на офлайн: клуб — лимит часов, тренер — эффективность */
function offlineEffect(id: GenId) {
  if (id === 'club') return t('офлайн до {h}', { h: fmtHours(offlineHours(state)) }) + (offlineHours(state) < OFFLINE.maxHours ? '' : t(' (макс.)'))
  if (id === 'coach') return t('офлайн {p} дохода', { p: pct(offlineEff(state)) }) + (offlineEff(state) < OFFLINE.maxEff ? '' : t(' (макс.)'))
  return null
}
</script>

<template>
  <div class="seg" role="radiogroup" :aria-label="t('Сколько уровней покупать')">
    <span class="muted small">{{ t('Покупать по') }}</span>
    <button v-for="n in BULK" :key="n" class="seg-btn" :class="{ on: bulk === n }" role="radio" :aria-checked="bulk === n" @click="setBulk(n)">×{{ n }}</button>
  </div>
  <ul class="list">
    <li v-for="g in GENERATORS" :key="g.id" class="item" :class="{ locked: !genUnlocked(state, g.id) }">
      <img class="ico" :src="icon(g.icon)" alt="" />
      <div class="info">
        <div class="name">{{ t(g.name) }} <span class="count">{{ t('ур. {n}', { n: state.owned[g.id] }) }}</span></div>
        <div v-if="genUnlocked(state, g.id)" class="meta">
          <div>{{ t('+{v} км/с за уровень', { v: fmt(genLevelRate(state, g.id) / 60) }) }}</div>
          <div>{{ t('всего {v} км/с · ×2 на ур. {n}', { v: fmt(genRate(state, g.id) / 60), n: (Math.floor(state.owned[g.id] / 25) + 1) * 25 }) }}</div>
          <div v-if="offlineEffect(g.id)" class="offline">{{ offlineEffect(g.id) }}</div>
        </div>
        <div v-else class="meta">{{ t('Откроется после забега {name}', { name: raceName(g.unlockRace!) }) }}</div>
      </div>
      <button v-if="genUnlocked(state, g.id)" class="buy" :disabled="state.km < cost(g.id)" @click="bought(buyGen(state, g.id, bulk))">
        {{ t('{v} км', { v: fmt(cost(g.id)) }) }}
      </button>
    </li>
  </ul>
  <!-- Техника бега — навык, а не вещь: живёт в «Тренировках» -->
  <ul class="list">
    <BoostRow v-for="b in TRAIN_BOOSTS" :key="b.id" :boost="b" />
  </ul>
</template>

<style scoped>
.seg {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-bottom: 4px;
}
.seg .muted {
  margin-right: auto;
}
.seg-btn {
  min-width: 52px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.seg-btn.on {
  background: var(--fg);
  color: var(--bg);
  border-color: var(--fg);
}
.count {
  font-family: var(--display);
  color: var(--accent);
  margin-left: 4px;
  white-space: nowrap;
}
.offline {
  color: var(--lane);
}
</style>
