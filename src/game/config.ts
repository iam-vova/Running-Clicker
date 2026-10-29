// Данные игры. Числа синхронизированы с GAME.md.
// Тексты (названия забегов, тренировок, уровней) — не здесь, а в i18n/locales по id: race.5k, gen.jog, boost.shoes.2.

export const CLICK_KM = 0.15
/** Каждый тап вне забега добавляет ещё такую долю секундного дохода: тап не обесценивается к середине игры */
export const CLICK_INCOME_PCT = 0.05
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
  sprintCost: 6, // рывок — спринт: метр рывка стоит в 1 + sprintCost/выносливость^¼ раз дороже метра ровного бега
  wallSpeed: 0.6, // силы кончились — «стена»: скорость падает до этой доли
  feeds: [1 / 3, 2 / 3], // пункты питания: на этих долях дистанции пролетает гель
  feedEnergy: 0.15, // столько сил возвращает гель на трассе
  // ночной участок (100 км, 100 миль): темп там — такая доля дневного по уровню ультра-снаряжения (0 — без него).
  // Фонарь, палки, соль, ультра-кроссовки, GPS-часы, опыт ночных стартов — каждая покупка заметно ускоряет ночь
  nightPace: [0.7, 0.8, 0.84, 0.87, 0.9, 0.95, 1],
  // шкала рывка: указатель бегает туда-обратно; попал в центр — рывок дальше за те же силы
  timing: {
    period: 1.2, // с, полный цикл туда-обратно
    perfect: 0.08, // полуширина зелёной зоны (доля шкалы от центра)
    good: 0.25, // полуширина жёлтой зоны
    lock: 0.35, // с после тапа указатель стоит; тапы в это время не засчитываются
    mult: { perfect: 2, good: 1, miss: 0.7 }, // во сколько раз дальше обычного рывка
  },
}
/**
 * Офлайн: пока игра закрыта, тренировки идут медленнее, чем при открытой игре, и не дольше лимита.
 * Забег на паузе — награды за забег офлайн не начисляются.
 */
/**
 * «Спортивная лаборатория» (открывается после 30 км): кроме км, каждый уровень даёт выносливость —
 * без неё марафон не пробежать, напитки и экипировка к этому моменту уже на максимуме.
 */
export const LAB_STAMINA_PER_LEVEL = 0.03
/**
 * «Трейловые тренировки» (после 50 км): кроме км, каждый уровень усиливает «ультра» (меньше усталость на длинной
 * дистанции). Скорость бегуна к этому времени почти у потолка — к 100 км и 100 милям ведёт именно выносливость.
 */
export const TRAIL_ULTRA_PER_LEVEL = 0.04

export const OFFLINE = {
  // вся игра до 50 км — около 2 ч активной игры, поэтому офлайн скромный: база — 15 мин дохода за возвращение
  // (было 4 ч × 50% = 2 ч дохода: одно возвращение перескакивало несколько забегов — фидбек плейтеста)
  baseHours: 1, maxHours: 4, hoursPerClub: 0.1, // «Беговой клуб»: каждый уровень +6 мин к лимиту
  baseEff: 0.25, maxEff: 0.5, effPerCoach: 0.01, // «Личный тренер»: каждый уровень +1% эффективности
  minAwaySec: 60,
}


/** Стартовые персонажи: одинаковые характеристики, различается только внешний вид (ТЗ v0.4, §3) */
export const CHARACTERS = [
  { id: 'he' },
  { id: 'she' },
] as const

export type CharId = (typeof CHARACTERS)[number]['id']

export const GENERATORS = [
  { id: 'jog', icon: 'jog', base: 10, rate: 1.5, growth: 1.15, unlockRace: null },
  { id: 'club', icon: 'club', base: 100, rate: 15, growth: 1.15, unlockRace: null },
  { id: 'intervals', icon: 'stopwatch', base: 1100, rate: 120, growth: 1.14, unlockRace: '5k' },
  { id: 'coach', icon: 'coach', base: 12000, rate: 705, growth: 1.13, unlockRace: '10k' },
  { id: 'camp', icon: 'camp', base: 130000, rate: 3900, growth: 1.13, unlockRace: '15k' },
  { id: 'lab', icon: 'lab', base: 1500000, rate: 22500, growth: 1.12, unlockRace: '30k' },
  { id: 'trail', icon: 'trail', base: 5e9, rate: 7.5e7, growth: 1.15, unlockRace: '50k' },
] as const

export type GenId = (typeof GENERATORS)[number]['id']

export const RACES = [
  // mult — награда (множитель дохода); открытую тренировку UI берёт из GENERATORS.unlockRace
  // cutoff — контрольное время, минуты на трассе. Цепочка из ТЗ v0.4, лимиты откалиброваны симуляцией
  { id: '1k', km: 1, cutoff: 7, mult: 1.2 },
  { id: '3k', km: 3, cutoff: 16.5, mult: 1.3 },
  { id: '5k', km: 5, cutoff: 27.5, mult: 1.5 },
  { id: '10k', km: 10, cutoff: 50, mult: 1.5 },
  { id: '15k', km: 15, cutoff: 66, mult: 1.5 },
  { id: 'half', km: 21.1, cutoff: 92.5, mult: 2 },
  { id: '30k', km: 30, cutoff: 134.5, mult: 1.5 },
  { id: 'marathon', km: 42.195, cutoff: 177.5, mult: 2 },
  // ультра: сил без гелей не хватит (reserve < 0 — «стена» на ~70% дистанции), гели — каждые 1/6 дистанции
  { id: '50k', km: 50, cutoff: 188, mult: 2, feeds: [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6], reserve: -0.4 },
  // финал: гели чаще, без них «стена» ещё раньше; night — участок дистанции в темноте (доли от старта)
  { id: '100k', km: 100, cutoff: 340, mult: 2, feeds: [1, 2, 3, 4, 5, 6, 7].map((i) => i / 8), reserve: -0.8, night: [0.55, 1] },
  { id: '100mi', km: 160.9, cutoff: 535, mult: 3, feeds: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => i / 10), reserve: -1.2, night: [0.35, 0.8] },
] as const

export type RaceId = (typeof RACES)[number]['id']

// rate генераторов — в км/ч. Темп игры откалиброван sim/calibrate.ts: тренировки дают км вчетверо медленнее, чем в v0.10, рывок — прежний
export const UPGRADES = [
  // гаджеты: каждый ×2 к своей тренировке, открывается на need-м уровне тренировки
  { id: 'app', icon: 'phone-app', cost: 150, gen: 'jog', need: 10 },
  { id: 'hrm', icon: 'heart', cost: 1000, gen: 'club', need: 10 },
  { id: 'spikes', icon: 'spikes', cost: 15000, gen: 'intervals', need: 10 },
  { id: 'plan', icon: 'calendar', cost: 160000, gen: 'coach', need: 10 },
  { id: 'oximeter', icon: 'oximeter', cost: 1.8e6, gen: 'camp', need: 10 },
  { id: 'lactate', icon: 'lactate', cost: 2e7, gen: 'lab', need: 10 },
] as const

export type UpgradeId = (typeof UPGRADES)[number]['id']

/**
 * Бустеры: ветки, которые прокачиваются уровень за уровнем.
 * speed — множитель ко всему доходу; stamina — множитель к темпу на забегах; click — множитель рывка;
 * ultra — делитель базовой усталости (длинные дистанции). unlockRace — ветка закрыта до этого забега.
 * mult — итоговый множитель ветки на этом уровне (не накопительный).
 * pct (только техника) — доля секундного дохода, которую рывок добавляет сверху.
 */
export const BOOSTS = [
  {
    id: 'technique', stat: 'click',
    levels: [
      { icon: 'technique', cost: 50, mult: 5, pct: 0 },
      { icon: 'technique', cost: 500, mult: 8, pct: 0.03 },
      { icon: 'technique', cost: 5000, mult: 10, pct: 0.06 },
      { icon: 'technique', cost: 60000, mult: 10, pct: 0.12 },
      { icon: 'technique', cost: 900000, mult: 12, pct: 0.2 },
    ],
  },
  {
    id: 'shoes', stat: 'speed',
    levels: [
      { icon: 'sneaker', cost: 60, mult: 1.25 },
      { icon: 'cushion', cost: 900, mult: 1.6 },
      { icon: 'tempo', cost: 15000, mult: 2.2 },
      { icon: 'carbon', cost: 250000, mult: 3.5 },
    ],
  },
  {
    id: 'food', stat: 'speed',
    levels: [
      { icon: 'potato', cost: 40, mult: 1.15 },
      { icon: 'pasta', cost: 600, mult: 1.4 },
      { icon: 'dates', cost: 8000, mult: 1.8 },
      { icon: 'gummies', cost: 30000, mult: 2.2 },
      { icon: 'gel', cost: 120000, mult: 2.6 },
    ],
  },
  {
    id: 'drink', stat: 'stamina',
    levels: [
      { icon: 'water', cost: 25, mult: 1.2 },
      { icon: 'cola', cost: 2500, mult: 1.6 },
      { icon: 'electrolytes', cost: 40000, mult: 2.2 },
    ],
  },
  {
    id: 'gear', stat: 'stamina',
    levels: [
      { icon: 'shorts', cost: 150, mult: 1.2 },
      { icon: 'belt', cost: 4000, mult: 1.5 },
      { icon: 'vest', cost: 70000, mult: 2 },
    ],
  },
  {
    // ультра-снаряжение: открывается после марафона, снижает усталость на длинной дистанции (базовый показатель Ригеля)
    id: 'ultra', stat: 'ultra', unlockRace: 'marathon',
    levels: [
      { icon: 'headlamp', cost: 3e9, mult: 1.25 },
      { icon: 'poles', cost: 3e10, mult: 1.6 },
      { icon: 'salt', cost: 3e11, mult: 2 },
      { icon: 'ultra-shoes', cost: 3e12, mult: 2.5 },
      { icon: 'gps-watch', cost: 2e14, mult: 3 },
      { icon: 'night-run', cost: 5e14, mult: 3.5 },
    ],
  },
] as const

export type BoostId = (typeof BOOSTS)[number]['id']
export type Stat = (typeof BOOSTS)[number]['stat']
