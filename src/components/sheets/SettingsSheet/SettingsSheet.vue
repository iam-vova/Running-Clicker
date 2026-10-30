<script setup lang="ts">
// «Настройки»: иконка и подпись слева, переключатель справа — персонаж, тема, звук, музыка, язык.
import { computed } from 'vue'
import { CHARACTERS } from '../../../game/config.ts'
import type { CharId } from '../../../game/config.ts'
import { state } from '../../../game/state.ts'
import { LOCALES, lang, setLang, t } from '../../../i18n/index.ts'
import { characterName } from '../../../i18n/names.ts'
import { musicOn, setMusic, setSound, soundOn } from '../../../sound.ts'
import { analyticsOn, setAnalytics } from '../../../analytics.ts'
import { THEMES, useTheme } from '../../../composables/useTheme.ts'
import { icon, sheetVars } from '../../../utils/assets.ts'
import ToggleGroup from '../../ui/ToggleGroup/ToggleGroup.vue'

const { themePref, setTheme } = useTheme()

const character = computed({ get: () => state.character ?? 'he', set: (v: CharId) => (state.character = v) })
const theme = computed({ get: () => themePref.value, set: setTheme })
const sound = computed({ get: () => soundOn.value, set: setSound })
const music = computed({ get: () => musicOn.value, set: setMusic })
const analytics = computed({ get: () => analyticsOn.value, set: setAnalytics })

const charOptions = computed(() => CHARACTERS.map((c) => ({ value: c.id, label: characterName(c.id), style: sheetVars(c.id) })))
const themeOptions = computed(() => THEMES.map((th) => ({ value: th.id, label: t(th.label) })))
const onOff = computed(() => [
  { value: true, label: t('common.on') },
  { value: false, label: t('common.off') },
])
</script>

<template>
  <div class="settings-sheet">
    <div class="setting-row">
      <span class="setting-row__label"><img class="icon" :src="icon('jog')" alt="" />{{ t('settings.character') }}</span>
      <ToggleGroup v-model="character" :label="t('settings.character')" :options="charOptions">
        <template #option><span class="sprite sprite--idle sprite--tiny settings-sheet__character" aria-hidden="true"></span></template>
      </ToggleGroup>
    </div>
    <div class="setting-row">
      <span class="setting-row__label"><img class="icon" :src="icon('theme')" alt="" />{{ t('settings.theme') }}</span>
      <ToggleGroup v-model="theme" :label="t('settings.theme')" :options="themeOptions" />
    </div>
    <div class="setting-row">
      <span class="setting-row__label"><img class="icon" :src="icon('sound-on')" alt="" />{{ t('settings.sound') }}</span>
      <ToggleGroup v-model="sound" :label="t('settings.sound')" :options="onOff" />
    </div>
    <div class="setting-row">
      <span class="setting-row__label"><img class="icon" :src="icon('music')" alt="" />{{ t('settings.music') }}</span>
      <ToggleGroup v-model="music" :label="t('settings.music')" :options="onOff" />
    </div>
    <div class="setting-row">
      <span class="setting-row__label"><img class="icon" :src="icon('globe')" alt="" />{{ t('settings.language') }}</span>
      <!-- языков может быть много — список, а не переключатель; названия на самих языках -->
      <select class="settings-sheet__language" :aria-label="t('settings.language')" :value="lang" @change="setLang(($event.target as HTMLSelectElement).value)">
        <option v-for="l in LOCALES" :key="l.code" :value="l.code">{{ l.name }}</option>
      </select>
    </div>
    <div class="setting-row">
      <span class="setting-row__label"><img class="icon" :src="icon('stats')" alt="" />{{ t('settings.analytics') }}</span>
      <ToggleGroup v-model="analytics" :label="t('settings.analytics')" :options="onOff" />
    </div>
    <p class="text text--muted text--small">{{ t('settings.analyticsNote') }}</p>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
