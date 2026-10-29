<script setup lang="ts">
// Штрихованная шкала готовности к забегу (это не дистанция): цвет — успеваешь / с рывками / не успеваешь.
defineProps<{ pct: number; state: 'ok' | 'maybe' | 'late'; label?: string }>()
</script>

<template>
  <span class="ready-bar" role="progressbar" :aria-valuenow="Math.round(pct * 100)" aria-valuemin="0" aria-valuemax="100" :aria-label="label">
    <i class="ready-bar__fill" :class="`ready-bar__fill--${state}`" :style="{ width: pct * 100 + '%' }"></i>
  </span>
</template>

<style lang="scss" src="./styles/component.scss"></style>
