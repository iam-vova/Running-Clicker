<script setup lang="ts">
// «Снаряжение»: ветки вещей (кроссовки, еда, напитки, экипировка) и гаджеты (пульсометр).
import { GENERATORS, UPGRADES } from '../../game/config.ts'
import { buyUpgrade, fmt } from '../../game/logic.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { GEAR_BOOSTS, bought, upgradeState } from '../../composables/shop.ts'
import { icon } from '../../utils/assets.ts'
import BoostRow from './BoostRow.vue'

const genName = (id: string) => GENERATORS.find((g) => g.id === id)?.name ?? id
</script>

<template>
  <ul class="list">
    <BoostRow v-for="b in GEAR_BOOSTS" :key="b.id" :boost="b" />
    <!-- Гаджеты: строка видна всегда — закрыт / можно купить / куплено -->
    <li v-for="u in UPGRADES" :key="u.id" class="item" :class="{ locked: upgradeState(u) === 'locked' }">
      <img class="ico" :src="icon(u.icon)" alt="" />
      <div class="info">
        <div class="name">{{ t(u.name) }}</div>
        <div class="meta">{{ t(u.desc) }}</div>
        <div v-if="upgradeState(u) === 'locked'" class="meta">{{ t('Откроется на ур. {n} «{gen}»', { n: u.need, gen: t(genName(u.gen)) }) }}</div>
        <div v-else-if="upgradeState(u) === 'owned'" class="meta owned">{{ t('Куплено ✓') }}</div>
      </div>
      <button v-if="upgradeState(u) !== 'owned'" class="buy" :disabled="upgradeState(u) === 'locked' || state.km < u.cost" @click="bought(buyUpgrade(state, u.id))">
        {{ t('{v} км', { v: fmt(u.cost) }) }}
      </button>
    </li>
  </ul>
</template>
