// Масштаб пикселей: фон 384 px высотой примерно на весь экран, только целые множители (2–4).
import { ref } from 'vue'

const px = ref(2)
const fit = () => (px.value = Math.max(2, Math.min(4, Math.round((window.innerHeight - 64) / 400))))
fit()
addEventListener('resize', fit)

export const useScale = () => ({ px })
