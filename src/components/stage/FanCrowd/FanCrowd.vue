<script setup lang="ts">
// Ряд болельщиков (crowd.png 160×64): каждый человек — отдельный кусок картинки и подпрыгивает в своём ритме.
// Границы людей — tools/sprites/crowd_arch.py
import crowdImg from '../../../assets/sprites/items/crowd.png'

/** [x, ширина] каждого человека в исходной картинке */
const CROWD_SLICES = [[0, 12], [12, 12], [24, 13], [37, 13], [50, 11], [61, 8], [69, 9], [78, 13], [91, 16], [107, 14], [121, 13], [134, 10], [144, 16]]
// ритм и высота прыжка — от номера человека, а не случайно: одинаково при каждой отрисовке
const fans = CROWD_SLICES.map(([x, w], i) => ({
  '--x': x,
  '--w': w,
  '--jump': 1 + ((i * 5) % 3), // 1–3 игровых пикселя
  animationDuration: `${0.42 + ((i * 7) % 5) * 0.06}s`,
  animationDelay: `${-((i * 0.173) % 0.6).toFixed(3)}s`,
}))
</script>

<template>
  <span class="fan-crowd" :style="{ '--crowd': `url(${crowdImg})` }" aria-hidden="true">
    <i v-for="(f, i) in fans" :key="i" class="fan-crowd__fan" :style="f"></i>
  </span>
</template>

<style lang="scss" src="./styles/component.scss"></style>
