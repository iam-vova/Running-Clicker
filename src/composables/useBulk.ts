// Пакетная прокачка тренировок: ×1 / ×10 / ×100, выбор запоминается в этом браузере.
import { ref } from 'vue'

export const BULK = [1, 10, 100] as const
const KEY = 'ultramarathon-bulk'
const bulk = ref<number>(1)
try {
  const saved = Number(localStorage.getItem(KEY))
  if (BULK.includes(saved as never)) bulk.value = saved
} catch {
  /* хранилище недоступно */
}
function setBulk(n: number) {
  bulk.value = n
  try {
    localStorage.setItem(KEY, String(n))
  } catch {
    /* хранилище недоступно */
  }
}

export const useBulk = () => ({ bulk, setBulk })
