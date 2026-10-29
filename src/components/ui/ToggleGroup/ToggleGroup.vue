<script setup lang="ts" generic="T extends string | boolean">
// Компактный переключатель-«таблетка» с сегментами (настройки). Сегмент — текст или слот #option.
defineProps<{ label: string; options: readonly { value: T; label: string; style?: Record<string, string> }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="toggle-group" role="radiogroup" :aria-label="label">
    <button
      v-for="o in options"
      :key="String(o.value)"
      class="toggle-group__option"
      :class="{ 'toggle-group__option--active': model === o.value, 'toggle-group__option--custom': !!$slots.option }"
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

<style lang="scss" src="./styles/component.scss"></style>
