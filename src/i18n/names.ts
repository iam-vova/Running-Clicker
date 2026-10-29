// Названия игровых сущностей по id из config.ts: ключи вида race.5k, gen.jog, boost.shoes.2.
// Шаблонные ключи проверяются типами: новый id без перевода в en.ts — ошибка компиляции.
import type { BoostId, CharId, GenId, RaceId, Stat, UpgradeId } from '../game/config.ts'
import { t } from './index.ts'

export const raceName = (id: RaceId) => t(`race.${id}`)
export const genName = (id: GenId) => t(`gen.${id}`)
export const boostName = (id: BoostId) => t(`boost.${id}`)
/** Название уровня ветки; 0 — стартовый (ещё ничего не куплено) */
export const boostLevelName = (id: BoostId, level: number) => t(`boost.${id}.${level}` as `boost.${BoostId}.${0 | 1 | 2 | 3}`)
export const statName = (s: Stat) => t(`stat.${s}`)
export const upgradeName = (id: UpgradeId) => t(`upgrade.${id}`)
export const upgradeDesc = (id: UpgradeId, gen: GenId) => t(`upgrade.${id}.desc`, { gen: genName(gen) })
export const characterName = (id: CharId) => t(`character.${id}`)
