<script setup lang="ts">
// HUD поверх сцены: углы (без звука, настройки), счётчик км, карточка следующего забега или забега на трассе, скорость.
import { computed } from 'vue'
import { fmt, kmPerSec, runSpeed } from '../../../game/logic.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { muted, setMuted } from '../../../sound.ts'
import { useRace } from '../../../composables/useRace.ts'
import { useSheets } from '../../../composables/useSheets.ts'
import { useRaceFlow } from '../../../composables/useRaceFlow.ts'
import { icon } from '../../../utils/assets.ts'
import NextRaceCard from '../NextRaceCard/NextRaceCard.vue'
import RaceHud from '../RaceHud/RaceHud.vue'

const { nextRace, live } = useRace()
const { toggleSheet } = useSheets()
const { runout, celebrating, showResult } = useRaceFlow()
const perSec = computed(() => kmPerSec(state))
const speed = computed(() => runSpeed(state))
</script>

<template>
  <header class="game-hud" aria-live="polite">
    <!-- Ресурс: тратится на тренировки и снаряжение -->
    <!-- на забеге счётчик км, доход и скорость скрыты: на экране только забег -->
    <div v-if="!live" class="game-hud__label">{{ t('hud.trainingKm') }}</div>
    <!-- «Без звука» слева: глушит всё; раздельно звук и музыка — в настройках (шестерёнка справа) -->
    <button class="game-hud__corner game-hud__corner--mute" :aria-label="t('hud.mute')" :aria-pressed="muted" @click="setMuted(!muted)">
      <img class="icon" :src="icon(muted ? 'sound-off' : 'sound-on')" alt="" />
    </button>
    <button class="game-hud__corner game-hud__corner--settings" :aria-label="t('settings.title')" @click="toggleSheet('settings')">
      <img class="icon" :src="icon('gear')" alt="" />
    </button>
    <template v-if="!live">
      <div class="game-hud__km">{{ fmt(state.km) }}</div>
      <div class="game-hud__line"><b class="status status--accent">+{{ fmt(perSec) }}</b> {{ t('hud.perSecond') }}</div>
      <!-- Статистика: не тратится -->
      <div class="game-hud__line game-hud__line--total">{{ t('hud.total', { km: fmt(state.totalKm) }) }}</div>
    </template>

    <RaceHud v-if="live" />
    <!-- следующий забег — только когда итог прошлого закрыт: не раньше финишной анимации и окна результата -->
    <NextRaceCard v-else-if="nextRace && !runout && !celebrating && !showResult" />

    <!-- Скорость бегуна — закреплена под карточкой забега, не зависит от персонажа -->
    <span v-if="!live" class="game-hud__speed">{{ t('units.kmh', { v: speed.toFixed(1) }) }}</span>
  </header>
</template>

<style lang="scss" src="./styles/component.scss"></style>
