<script setup lang="ts">
// Нижняя панель: четыре вкладки с бейджами «сколько можно купить» и точкой «забег идёт».
import { state } from '../game/state.ts'
import { t } from '../i18n.ts'
import { affordGear, affordTrain } from '../composables/shop.ts'
import { useRace } from '../composables/useRace.ts'
import { TABS, useSheets } from '../composables/useSheets.ts'
import type { Sheet } from '../composables/useSheets.ts'
import { icon } from '../utils/assets.ts'

const { sheet, toggleSheet } = useSheets()
const { nextRace, ready } = useRace()

function badge(id: Sheet): string | number {
  if (id === 'train') return affordTrain.value || ''
  if (id === 'gear') return affordGear.value || ''
  if (id === 'race') return state.activeRace ? '●' : nextRace.value && ready(nextRace.value.id) ? '!' : ''
  return ''
}
</script>

<template>
  <nav class="tabs">
    <button v-for="s in TABS" :key="s.id" class="tab" :class="{ on: sheet === s.id }" @click="toggleSheet(s.id)">
      <img class="ico" :class="{ outlined: s.icon === 'flag' }" :src="icon(s.icon)" alt="" />
      <span>{{ t(s.label) }}</span>
      <i v-if="badge(s.id) === '●'" class="live-dot" :aria-label="t('Забег идёт')"></i>
      <i v-else-if="badge(s.id)" class="badge">{{ badge(s.id) }}</i>
    </button>
  </nav>
</template>

<style scoped>
.tabs {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--nav-h);
  padding: 0 max(8px, env(safe-area-inset-right, 0px)) env(safe-area-inset-bottom, 0px) max(8px, env(safe-area-inset-left, 0px));
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--surface);
  border-top: 1px solid var(--line);
  z-index: 3;
}
.tab {
  position: relative;
  border: 0;
  background: none;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 2px;
  font-size: 12px;
  color: var(--muted);
}
.tab.on {
  color: var(--accent);
}
.tab:not(.on) .ico {
  filter: saturate(0.6);
  opacity: 0.85;
}
/* Тёмный флажок «Забег» в тёмной теме теряется на фоне панели — светлый пиксельный контур */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) .ico.outlined {
    filter: drop-shadow(1px 0 0 #9aa8a2) drop-shadow(-1px 0 0 #9aa8a2) drop-shadow(0 1px 0 #9aa8a2) drop-shadow(0 -1px 0 #9aa8a2);
  }
}
:root[data-theme='dark'] .ico.outlined {
  filter: drop-shadow(1px 0 0 #9aa8a2) drop-shadow(-1px 0 0 #9aa8a2) drop-shadow(0 1px 0 #9aa8a2) drop-shadow(0 -1px 0 #9aa8a2);
}
/* идёт забег — маленькая зелёная пульсирующая точка */
.live-dot {
  position: absolute;
  top: 12px;
  left: calc(50% + 12px);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 0 2px var(--surface);
  animation: live 1.4s ease-in-out infinite;
}
@keyframes live {
  50% {
    transform: scale(0.7);
    opacity: 0.6;
  }
}
.badge {
  position: absolute;
  top: 8px;
  left: calc(50% + 8px);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--accent);
  color: var(--accent-fg);
  font-style: normal;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
}
</style>
