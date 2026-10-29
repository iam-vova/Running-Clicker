<script setup lang="ts">
// Окно, выезжающее снизу над панелью вкладок: затемнение, заголовок, крестик, прокручиваемое содержимое.
import { t } from '../../../i18n/index.ts'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="bottom-sheet">
    <div class="bottom-sheet__backdrop" @click="emit('close')"></div>
    <section class="bottom-sheet__panel" role="dialog" :aria-label="title">
      <header class="bottom-sheet__head">
        <h2 class="bottom-sheet__title">{{ title }}</h2>
        <button class="bottom-sheet__close" :aria-label="t('common.close')" @click="emit('close')">✕</button>
      </header>
      <div class="bottom-sheet__body">
        <slot />
      </div>
    </section>
  </div>
</template>

<style lang="scss" src="./styles/component.scss"></style>
