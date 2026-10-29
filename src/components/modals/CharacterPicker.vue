<script setup lang="ts">
// Выбор персонажа при первом запуске. Сменить можно в настройках.
import { CHARACTERS } from '../../game/config.ts'
import { state } from '../../game/state.ts'
import { t } from '../../i18n.ts'
import { sheetVars } from '../../utils/assets.ts'
</script>

<template>
  <section class="picker" role="dialog" :aria-label="t('Выбор персонажа')">
    <h1 class="title">{{ t('Выбери бегуна') }}</h1>
    <p class="sub">{{ t('Характеристики одинаковые — выбирай, кто нравится. Сменить можно в любой момент в настройках.') }}</p>
    <div class="row">
      <button v-for="c in CHARACTERS" :key="c.id" class="pick" :style="sheetVars(c.id)" :aria-label="t(c.name)" @click="state.character = c.id">
        <span class="sprite idle" aria-hidden="true"></span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.picker {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 16px;
  padding: 24px max(16px, env(safe-area-inset-right, 0px)) 24px max(16px, env(safe-area-inset-left, 0px));
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  text-align: center;
}
.title {
  margin: 0;
  font-family: var(--display);
  font-weight: 700;
  font-size: 34px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sub {
  margin: 0;
  max-width: 30ch;
  color: var(--muted);
}
.row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}
.pick {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 20px 8px 28px;
  border: 2px solid var(--line);
  border-radius: 18px;
  background: var(--stadium) center bottom / calc(512px * var(--px)) calc(384px * var(--px)) repeat-x;
  image-rendering: pixelated;
}
.pick:hover {
  border-color: var(--accent);
}
.pick .sprite {
  width: calc(64px * var(--px));
  height: calc(64px * var(--px));
}
</style>
