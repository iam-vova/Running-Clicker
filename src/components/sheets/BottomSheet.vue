<script setup lang="ts">
// Окно, выезжающее снизу над панелью вкладок: заголовок, крестик, прокручиваемое содержимое.
import { t } from '../../i18n.ts'

defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="backdrop" @click="emit('close')"></div>
  <section class="sheet" role="dialog" :aria-label="title">
    <header class="head">
      <h2>{{ title }}</h2>
      <button class="close" :aria-label="t('Закрыть')" @click="emit('close')">✕</button>
    </header>
    <div class="body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0 0 var(--nav-h);
  background: rgb(0 0 0 / 0.35);
  z-index: 1;
}
.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--nav-h);
  max-height: calc(100% - var(--nav-h) - 72px);
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 24px rgb(0 0 0 / 0.18);
  z-index: 2;
  animation: sheet-in 0.18s ease-out;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px));
  border-bottom: 1px solid var(--line);
}
.head h2 {
  flex: 1;
}
.close {
  border: 0;
  background: var(--surface);
  width: 32px;
  height: 32px;
  border-radius: 50%;
}
.body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px max(16px, env(safe-area-inset-right, 0px)) 20px max(16px, env(safe-area-inset-left, 0px));
  display: grid;
  gap: 12px;
  align-content: start;
}
</style>
