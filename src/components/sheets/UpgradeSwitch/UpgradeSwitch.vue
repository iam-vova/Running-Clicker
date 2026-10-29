<script setup lang="ts">
// Разделы «Прокачки»: тренировки и снаряжение. Живёт в панели окна над прокруткой (Teleport из раздела).
import { computed } from 'vue'
import { t } from '../../../i18n/index.ts'
import { affordGear, affordTrain } from '../../../composables/shop.ts'
import { useSheets } from '../../../composables/useSheets.ts'

const { sheet, openUpgrade } = useSheets()
const tabs = computed(() => [
  { id: 'train' as const, label: t('tabs.train'), badge: affordTrain.value },
  { id: 'gear' as const, label: t('tabs.gear'), badge: affordGear.value },
])
</script>

<template>
  <div class="upgrade-switch" role="tablist">
    <button
      v-for="tb in tabs"
      :key="tb.id"
      class="upgrade-switch__tab"
      :class="{ 'upgrade-switch__tab--active': sheet === tb.id }"
      role="tab"
      :aria-selected="sheet === tb.id"
      @click="openUpgrade(tb.id)"
    >
      {{ tb.label }}
      <i v-if="tb.badge" class="upgrade-switch__badge">{{ tb.badge }}</i>
    </button>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
