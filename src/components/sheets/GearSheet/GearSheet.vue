<script setup lang="ts">
// «Снаряжение»: ветки вещей (кроссовки, еда, напитки, экипировка) и гаджеты (пульсометр).
import { GENERATORS, UPGRADES } from '../../../game/config.ts'
import { buyUpgrade, fmt } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n.ts'
import { GEAR_BOOSTS, bought, upgradeState } from '../../../composables/shop.ts'
import { icon } from '../../../utils/assets.ts'
import BoostRow from '../BoostRow/BoostRow.vue'

const genName = (id: string) => GENERATORS.find((g) => g.id === id)?.name ?? id
</script>

<template>
  <div class="gear-sheet">
    <ul class="shop-list">
      <BoostRow v-for="b in GEAR_BOOSTS" :key="b.id" :boost="b" />
      <!-- Гаджеты: строка видна всегда — закрыт / можно купить / куплено -->
      <li v-for="u in UPGRADES" :key="u.id" class="shop-item" :class="{ 'shop-item--locked': upgradeState(u) === 'locked' }">
        <img class="icon" :src="icon(u.icon)" alt="" />
        <div class="shop-item__info">
          <div class="shop-item__name">{{ t(u.name) }}</div>
          <div class="shop-item__meta">{{ t(u.desc) }}</div>
          <div v-if="upgradeState(u) === 'locked'" class="shop-item__meta">{{ t('Откроется на ур. {n} «{gen}»', { n: u.need, gen: t(genName(u.gen)) }) }}</div>
          <div v-else-if="upgradeState(u) === 'owned'" class="shop-item__meta shop-item__meta--owned">{{ t('Куплено ✓') }}</div>
        </div>
        <button v-if="upgradeState(u) !== 'owned'" class="button button--price" :disabled="upgradeState(u) === 'locked' || state.km < u.cost" @click="bought(buyUpgrade(state, u.id))">
          {{ t('{v} км', { v: fmt(u.cost) }) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
