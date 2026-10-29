// Данные игры. Числа синхронизированы с GAME.md.

export const CLICK_KM = 0.15
/** 1 секунда реального времени = 1 минута на трассе: км за секунду = км/ч ÷ 60. */
export const TIME_SCALE = 60

/**
 * Модель бегуна. Скорость на 1 км растёт от объёма тренировок (логарифмически),
 * время на дистанции — по формуле Ригеля: T(D) = D^k / v, где k — показатель усталости.
 * Выносливость снижает k: чем она выше, тем меньше бегун замедляется на длинной дистанции.
 */
export const RUNNER = {
  baseSpeed: 7, // км/ч на 1 км у новичка (доход ≤ одной трусцы)
  maxSpeed: 22, // потолок, к которому скорость стремится, но не достигает (мировой рекорд на 1 км ≈ 26 км/ч)
  speedHalf: 3, // через столько порядков дохода (×1000) пройдена половина пути от baseSpeed к maxSpeed
  fatigueBase: 1.06, // k у хорошо подготовленного бегуна (классический Ригель)
  fatigueExtra: 0.12, // k = fatigueBase + fatigueExtra / выносливость
  // --- запас сил на забеге (доля от 1) ---
  reserve: 0.1, // столько сил остаётся на финише при ровном беге без рывков
  tapFrac: 0.004, // рывок продвигает на такую долю дистанции
  tapFracPerTechnique: 0.001, // + за каждый уровень техники бега
  sprintCost: 3, // рывок — спринт: метр рывка стоит в 1 + sprintCost/выносливость^¼ раз дороже метра ровного бега
  wallSpeed: 0.6, // силы кончились — «стена»: скорость падает до этой доли
  feeds: [1 / 3, 2 / 3], // пункты питания: на этих долях дистанции пролетает гель
  feedEnergy: 0.15, // столько сил возвращает гель на трассе
}
/**
 * Офлайн: пока игра закрыта, тренировки идут медленнее, чем при открытой игре, и не дольше лимита.
 * Забег на паузе — награды за забег офлайн не начисляются.
 */
export const OFFLINE = {
  baseHours: 4, maxHours: 8, hoursPerClub: 0.1, // «Беговой клуб»: каждый уровень +6 мин к лимиту
  baseEff: 0.5, maxEff: 0.9, effPerCoach: 0.01, // «Личный тренер»: каждый уровень +1% эффективности
  minAwaySec: 60,
}


/** Стартовые персонажи: одинаковые характеристики, различается только внешний вид (ТЗ v0.4, §3) */
export const CHARACTERS = [
  { id: 'he', name: 'Бегун' },
  { id: 'she', name: 'Бегунья' },
] as const

export type CharId = (typeof CHARACTERS)[number]['id']

export const GENERATORS = [
  { id: 'jog', name: 'Утренняя трусца', icon: 'jog', base: 10, rate: 6, growth: 1.15, unlockRace: null },
  { id: 'club', name: 'Беговой клуб', icon: 'club', base: 100, rate: 60, growth: 1.15, unlockRace: null },
  { id: 'intervals', name: 'Интервалы на стадионе', icon: 'stopwatch', base: 1100, rate: 480, growth: 1.14, unlockRace: '5k' },
  { id: 'coach', name: 'Личный тренер', icon: 'coach', base: 12000, rate: 2820, growth: 1.13, unlockRace: '10k' },
  { id: 'camp', name: 'Сборы в горах', icon: 'camp', base: 130000, rate: 15600, growth: 1.13, unlockRace: '15k' },
] as const

export type GenId = (typeof GENERATORS)[number]['id']

export const RACES = [
  // reward — только множитель; открытую тренировку UI берёт из GENERATORS.unlockRace
  // cutoff — контрольное время, минуты на трассе. Цепочка из ТЗ v0.4, лимиты откалиброваны симуляцией
  { id: '1k', name: '1 км', km: 1, cutoff: 5.5, mult: 1.2, reward: 'доход ×1.2' },
  { id: '3k', name: '3 км', km: 3, cutoff: 15.5, mult: 1.3, reward: 'доход ×1.3' },
  { id: '5k', name: '5 км', km: 5, cutoff: 27, mult: 1.5, reward: 'доход ×1.5' },
  { id: '10k', name: '10 км', km: 10, cutoff: 50, mult: 1.5, reward: 'доход ×1.5' },
  { id: '15k', name: '15 км', km: 15, cutoff: 70, mult: 1.5, reward: 'доход ×1.5' },
  { id: 'half', name: 'Полумарафон', km: 21.1, cutoff: 97, mult: 2, reward: 'доход ×2' },
] as const

export type RaceId = (typeof RACES)[number]['id']

// rate генераторов — в км/ч
export const UPGRADES = [
  { id: 'hrm', name: 'Пульсометр', icon: 'heart', cost: 1000, desc: 'Беговой клуб ×2', gen: 'club', need: 10 },
] as const

export type UpgradeId = (typeof UPGRADES)[number]['id']

/**
 * Бустеры: ветки, которые прокачиваются уровень за уровнем.
 * speed — множитель ко всему доходу; stamina — множитель к темпу на забегах; click — множитель рывка.
 * mult — итоговый множитель ветки на этом уровне (не накопительный).
 * pct (только техника) — доля секундного дохода, которую рывок добавляет сверху.
 */
export const BOOSTS = [
  {
    id: 'technique', name: 'Техника бега', stat: 'click', start: 'Бег как получится',
    levels: [
      { name: 'Каденс 180', icon: 'technique', cost: 50, mult: 5, pct: 0 },
      { name: 'Беговые упражнения', icon: 'technique', cost: 500, mult: 8, pct: 0.03 },
      { name: 'Плиометрика', icon: 'technique', cost: 5000, mult: 10, pct: 0.06 },
      { name: 'Финишный спурт', icon: 'technique', cost: 60000, mult: 10, pct: 0.12 },
    ],
  },
  {
    id: 'shoes', name: 'Кроссовки', stat: 'speed', start: 'Старые кеды',
    levels: [
      { name: 'Беговые кроссовки', icon: 'sneaker', cost: 60, mult: 1.25 },
      { name: 'Кроссовки с амортизацией', icon: 'cushion', cost: 900, mult: 1.6 },
      { name: 'Темповые кроссовки', icon: 'tempo', cost: 15000, mult: 2.2 },
      { name: 'Карбоновая пластина', icon: 'carbon', cost: 250000, mult: 3.5 },
    ],
  },
  {
    id: 'food', name: 'Еда', stat: 'speed', start: 'Бегаешь голодным',
    levels: [
      { name: 'Варёная картошка', icon: 'potato', cost: 40, mult: 1.15 },
      { name: 'Макароны', icon: 'pasta', cost: 600, mult: 1.4 },
      { name: 'Финики и мармелад', icon: 'dates', cost: 8000, mult: 1.8 },
      { name: 'Беговые гели', icon: 'gel', cost: 120000, mult: 2.6 },
    ],
  },
  {
    id: 'drink', name: 'Напитки', stat: 'stamina', start: 'Без воды',
    levels: [
      { name: 'Вода', icon: 'water', cost: 25, mult: 1.2 },
      { name: 'Кола на пунктах питания', icon: 'cola', cost: 2500, mult: 1.6 },
      { name: 'Электролиты', icon: 'electrolytes', cost: 40000, mult: 2.2 },
    ],
  },
  {
    id: 'gear', name: 'Экипировка', stat: 'stamina', start: 'Футболка и треники',
    levels: [
      { name: 'Шорты с карманами', icon: 'shorts', cost: 150, mult: 1.2 },
      { name: 'Беговой пояс', icon: 'belt', cost: 4000, mult: 1.5 },
      { name: 'Трейловый жилет', icon: 'vest', cost: 70000, mult: 2 },
    ],
  },
] as const

export type BoostId = (typeof BOOSTS)[number]['id']
export type Stat = (typeof BOOSTS)[number]['stat']
