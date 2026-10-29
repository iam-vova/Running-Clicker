<script setup lang="ts">
// «Настройки»: подпись слева, переключатель справа — персонаж, тема, звук, музыка, язык.
import { computed } from 'vue'
import { CHARACTERS } from '../../../game/config.ts'
import type { CharId } from '../../../game/config.ts'
import { state } from '../../../game/state.ts'
import { lang, setLang, t } from '../../../i18n.ts'
import type { Lang } from '../../../i18n.ts'
import { musicOn, setMusic, setSound, soundOn } from '../../../sound.ts'
import { THEMES, useTheme } from '../../../composables/useTheme.ts'
import { sheetVars } from '../../../utils/assets.ts'
import ToggleGroup from '../../ui/ToggleGroup/ToggleGroup.vue'

const { themePref, setTheme } = useTheme()

const character = computed({ get: () => state.character ?? 'he', set: (v: CharId) => (state.character = v) })
const theme = computed({ get: () => themePref.value, set: setTheme })
const sound = computed({ get: () => soundOn.value, set: setSound })
const music = computed({ get: () => musicOn.value, set: setMusic })
const language = computed({ get: () => lang.value, set: setLang })

const charOptions = computed(() => CHARACTERS.map((c) => ({ value: c.id, label: t(c.name), style: sheetVars(c.id) })))
const themeOptions = computed(() => THEMES.map((th) => ({ value: th.id, label: t(th.label) })))
const onOff = computed(() => [
  { value: true, label: t('Вкл') },
  { value: false, label: t('Выкл') },
])
const LANGS: { value: Lang; label: string }[] = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
]
</script>

<template>
  <div class="settings-sheet">
    <div class="setting-row">
      <span>{{ t('Персонаж') }}</span>
      <ToggleGroup v-model="character" :label="t('Персонаж')" :options="charOptions">
        <template #option><span class="sprite sprite--idle sprite--tiny settings-sheet__character" aria-hidden="true"></span></template>
      </ToggleGroup>
    </div>
    <div class="setting-row">
      <span>{{ t('Тема') }}</span>
      <ToggleGroup v-model="theme" :label="t('Тема')" :options="themeOptions" />
    </div>
    <div class="setting-row">
      <span>{{ t('Звук') }}</span>
      <ToggleGroup v-model="sound" :label="t('Звук')" :options="onOff" />
    </div>
    <div class="setting-row">
      <span>{{ t('Музыка') }}</span>
      <ToggleGroup v-model="music" :label="t('Музыка')" :options="onOff" />
    </div>
    <div class="setting-row">
      <span>{{ t('Язык') }}</span>
      <ToggleGroup v-model="language" :label="t('Язык')" :options="LANGS" />
    </div>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
