<script setup lang="ts">
// Выбор персонажа при первом запуске. Сменить можно в настройках.
import { CHARACTERS } from '../../../game/config.ts'
import { state } from '../../../game/state.ts'
import { t } from '../../../i18n/index.ts'
import { characterName } from '../../../i18n/names.ts'
import { sheetVars } from '../../../utils/assets.ts'
</script>

<template>
  <section class="character-picker" role="dialog" :aria-label="t('picker.label')">
    <h1 class="character-picker__title">{{ t('picker.title') }}</h1>
    <p class="character-picker__subtitle">{{ t('picker.subtitle') }}</p>
    <div class="character-picker__options">
      <button v-for="c in CHARACTERS" :key="c.id" class="character-picker__option" :style="sheetVars(c.id)" :aria-label="characterName(c.id)" @click="state.character = c.id">
        <span class="sprite sprite--idle character-picker__sprite" aria-hidden="true"></span>
      </button>
    </div>
  </section>
</template>

<style lang="scss" src="./styles/component.scss"></style>
