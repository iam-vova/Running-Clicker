// Магазин: ветки бустеров (техника — в «Тренировках», остальное — в «Снаряжении»), гаджеты и счётчики на вкладках.
import { computed } from 'vue'
import { BOOSTS, GENERATORS, UPGRADES } from '../game/config.ts'
import { genCost, genUnlocked, nextBoost, upgradeVisible } from '../game/logic.ts'
import { state } from '../game/state.ts'
import { t } from '../i18n/index.ts'
import { sfx } from '../sound.ts'
import { xMult } from '../utils/format.ts'

export type Boost = (typeof BOOSTS)[number]
export type Upgrade = (typeof UPGRADES)[number]

/** Техника бега — навык, живёт в «Тренировках»; остальные ветки — вещи в «Снаряжении» */
export const TRAIN_BOOSTS = BOOSTS.filter((b) => b.id === 'technique')
export const GEAR_BOOSTS = BOOSTS.filter((b) => b.id !== 'technique')

/** Текущий уровень ветки (0 — стартовый, серая иконка первого уровня) */
export function currentLevel(b: Boost) {
  const level = state.boosts[b.id]
  return { level, icon: b.levels[Math.max(level - 1, 0)].icon, start: level === 0 }
}
/** Что даст следующий уровень */
export function nextDesc(b: Boost) {
  const n = nextBoost(state, b.id)!
  return 'pct' in n && n.pct ? t('boost.techniqueBonus', { m: xMult(n.mult), p: n.pct * 100 }) : xMult(n.mult)
}
/** Гаджет: закрыт (мало уровней тренировки) / можно купить / куплен */
export const upgradeState = (u: Upgrade) =>
  state.upgrades.includes(u.id) ? 'owned' : state.owned[u.gen] >= u.need ? 'open' : 'locked'

/** Покупка прошла — «монетка» */
export const bought = (ok: boolean) => ok && sfx.buy()

/** Сколько покупок доступно прямо сейчас — бейджи на вкладках */
export const affordTrain = computed(
  () =>
    GENERATORS.filter((g) => genUnlocked(state, g.id) && state.km >= genCost(g.id, state.owned[g.id])).length +
    TRAIN_BOOSTS.filter((b) => (nextBoost(state, b.id)?.cost ?? Infinity) <= state.km).length,
)
export const affordGear = computed(
  () =>
    GEAR_BOOSTS.filter((b) => (nextBoost(state, b.id)?.cost ?? Infinity) <= state.km).length +
    UPGRADES.filter((u) => upgradeVisible(state, u.id) && state.km >= u.cost).length,
)
