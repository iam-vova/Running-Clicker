<script setup lang="ts">
// Карточка по центру поверх затемнённой сцены (результат забега, возвращение после офлайна).
defineProps<{ label: string; align?: 'center' | 'left' }>()
</script>

<template>
  <section class="modal-card" role="dialog" :aria-label="label">
    <div class="modal-card__panel" :class="{ 'modal-card__panel--left': align === 'left' }">
      <slot />
    </div>
  </section>
</template>

<style lang="scss" src="./styles/component.scss"></style>
