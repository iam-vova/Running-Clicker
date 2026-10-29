<script setup lang="ts">
// HUD поверх сцены: углы (без звука, настройки), счётчик км, карточка следующего забега или забега на трассе, скорость.
import { computed } from 'vue'
import { fmt, kmPerSec, runSpeed } from '../../game/logic.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { muted, setMuted } from '../../sound.ts'
import { useRace } from '../../composables/useRace.ts'
import { useSheets } from '../../composables/useSheets.ts'
import { icon } from '../../utils/assets.ts'
import NextRaceCard from './NextRaceCard.vue'
import RaceHud from './RaceHud.vue'

const { nextRace, live } = useRace()
const { toggleSheet } = useSheets()
const perSec = computed(() => kmPerSec(state))
const speed = computed(() => runSpeed(state))
</script>

<template>
  <header class="hud" aria-live="polite">
    <!-- Ресурс: тратится на тренировки и снаряжение -->
    <div class="label">{{ t('Тренировочные км') }}</div>
    <!-- «Без звука» слева: глушит всё; раздельно звук и музыка — в настройках (шестерёнка справа) -->
    <button class="corner-btn mute" :aria-label="t('Без звука')" :aria-pressed="muted" @click="setMuted(!muted)">
      <img :src="icon(muted ? 'sound-off' : 'sound-on')" alt="" />
    </button>
    <button class="corner-btn settings" :aria-label="t('Настройки')" @click="toggleSheet('settings')"><img :src="icon('gear')" alt="" /></button>
    <div class="km">{{ fmt(state.km) }}</div>
    <div class="hud-line"><b class="accent">+{{ fmt(perSec) }}</b> {{ t('в секунду') }}</div>
    <!-- Статистика: не тратится -->
    <div class="hud-line total">{{ t('Общий пробег {km} км', { km: fmt(state.totalKm) }) }}</div>

    <RaceHud v-if="live" />
    <NextRaceCard v-else-if="nextRace" />

    <!-- Скорость бегуна — закреплена под карточкой забега, не зависит от персонажа -->
    <span class="plate">{{ t('{v} км/ч', { v: speed.toFixed(1) }) }}</span>
  </header>
</template>

<style scoped>
.hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 18px max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px));
  display: grid;
  justify-items: center;
  gap: 2px;
  pointer-events: none;
  text-shadow: 0 1px 0 color-mix(in srgb, var(--sky) 70%, transparent);
}
.label {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 12px;
  font-weight: 600;
}
.km {
  font-family: var(--num);
  font-synthesis: none;
  font-weight: 700;
  font-size: min(44px, calc((100vw - 120px) / 6)); /* 6 знаков помещаются между угловыми кнопками */
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.hud-line {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.hud-line.total {
  opacity: 0.75;
}
.plate {
  margin-top: 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  text-shadow: none;
  border: 1px solid var(--line);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}
.corner-btn {
  position: absolute;
  top: max(10px, env(safe-area-inset-top, 0px));
  width: 44px;
  height: 44px;
  padding: 6px;
  border: 0;
  background: none;
  pointer-events: auto;
}
.corner-btn.mute {
  left: max(10px, env(safe-area-inset-left, 0px));
}
.corner-btn.settings {
  right: max(10px, env(safe-area-inset-right, 0px));
}
.corner-btn img {
  width: 32px;
  height: 32px;
  display: block;
  image-rendering: pixelated;
}
</style>
