<script setup lang="ts" generic="T extends string | boolean">
// Компактный переключатель-«таблетка» с сегментами (настройки). Сегмент — текст или слот #option.
defineProps<{ label: string; options: readonly { value: T; label: string; style?: Record<string, string> }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="toggle" role="radiogroup" :aria-label="label">
    <button
      v-for="o in options"
      :key="String(o.value)"
      class="toggle-btn"
      :class="{ on: model === o.value, custom: !!$slots.option }"
      role="radio"
      :aria-checked="model === o.value"
      :aria-label="$slots.option ? o.label : undefined"
      :style="o.style"
      @click="model = o.value"
    >
      <slot name="option" :option="o">{{ o.label }}</slot>
    </button>
  </div>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  border-radius: 999px;
  background: var(--line);
}
.toggle-btn {
  border: 0;
  background: transparent;
  height: 32px;
  min-width: 44px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-weight: 600;
  font-size: 14px;
  color: var(--muted);
}
.toggle-btn.on {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
}
/* сегмент с картинкой (персонаж): шире, без отступов */
.toggle-btn.custom {
  width: 52px;
  padding: 0;
  overflow: hidden;
}
</style>
