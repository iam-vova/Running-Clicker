<script setup lang="ts">
// «Снаряжение»: ветки вещей (кроссовки, еда, напитки, экипировка) и гаджеты (пульсометр).
import { UPGRADES } from '../../../game/config.ts'
import { buyUpgrade, fmt } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { genName, upgradeDesc, upgradeName } from '../../../i18n/names.ts'
import { GEAR_BOOSTS, bought, upgradeState } from '../../../composables/shop.ts'
import { icon } from '../../../utils/assets.ts'
import BoostRow from '../BoostRow/BoostRow.vue'

</script>

<template>
  <div class="gear-sheet">
    <ul class="shop-list">
      <BoostRow v-for="b in GEAR_BOOSTS" :key="b.id" :boost="b" />
      <!-- Гаджеты: строка видна всегда — закрыт / можно купить / куплено -->
      <li v-for="u in UPGRADES" :key="u.id" class="shop-item" :class="{ 'shop-item--locked': upgradeState(u) === 'locked' }">
        <img class="icon" :src="icon(u.icon)" alt="" />
        <div class="shop-item__info">
          <div class="shop-item__name">{{ upgradeName(u.id) }}</div>
          <div class="shop-item__meta">{{ upgradeDesc(u.id, u.gen) }}</div>
          <div v-if="upgradeState(u) === 'locked'" class="shop-item__meta">{{ t('gear.unlocksAt', { n: u.need, gen: genName(u.gen) }) }}</div>
          <div v-else-if="upgradeState(u) === 'owned'" class="shop-item__meta shop-item__meta--owned">{{ t('gear.owned') }}</div>
        </div>
        <button v-if="upgradeState(u) !== 'owned'" class="button button--price" :disabled="upgradeState(u) === 'locked' || state.km < u.cost" @click="bought(buyUpgrade(state, u.id))">
          {{ t('units.km', { v: fmt(u.cost) }) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
