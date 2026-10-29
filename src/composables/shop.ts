// Магазин: ветки бустеров (техника — в «Тренировках», остальное — в «Снаряжении»), гаджеты и счётчики на вкладках.
import { computed } from 'vue'
import { BOOSTS, GENERATORS, UPGRADES } from '../game/config.ts'
import { genCost, genUnlocked, nextBoost, upgradeVisible } from '../game/logic.ts'
import { state } from '../game/state.ts'
import { t } from '../i18n.ts'
import { sfx } from '../sound.ts'
import { xMult } from '../utils/format.ts'

export type Boost = (typeof BOOSTS)[number]
export type Upgrade = (typeof UPGRADES)[number]

/** Техника бега — навык, живёт в «Тренировках»; остальные ветки — вещи в «Снаряжении» */
export const TRAIN_BOOSTS = BOOSTS.filter((b) => b.id === 'technique')
export const GEAR_BOOSTS = BOOSTS.filter((b) => b.id !== 'technique')
export const STAT_NAME = { speed: 'скорость', stamina: 'выносливость', click: 'рывок' } as const

/** Текущий уровень ветки (или стартовый, серый) */
export function currentLevel(b: Boost) {
  const lvl = state.boosts[b.id]
  return lvl ? { ...b.levels[lvl - 1], start: false } : { name: b.start as string, icon: b.levels[0].icon, start: true }
}
/** Что даст следующий уровень */
export function nextDesc(b: Boost) {
  const n = nextBoost(state, b.id)!
  return 'pct' in n && n.pct ? t('{m} и +{p}% секундного дохода', { m: xMult(n.mult), p: n.pct * 100 }) : xMult(n.mult)
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
