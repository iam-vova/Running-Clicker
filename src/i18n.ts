// Локализация: русский текст — основной и служит ключом, английский берётся из словаря EN.
// Шаблоны с параметрами: t('Забег {name}', { name }) → «Забег 5 км» / «Race: 5 km».
import { ref, watchEffect } from 'vue'

export type Lang = 'ru' | 'en'
const KEY = 'ultramarathon-lang'

function initial(): Lang {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'ru' || saved === 'en') return saved
  } catch {
    /* хранилище недоступно */
  }
  return 'ru'
}

export const lang = ref<Lang>(initial())

export function setLang(l: Lang) {
  lang.value = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    /* не запомним — не страшно */
  }
}

watchEffect(() => {
  document.documentElement.lang = lang.value
})

/** Перевод строки: в русской версии — сам ключ, в английской — из словаря (нет перевода — ключ). */
export function t(ru: string, p: Record<string, string | number> = {}): string {
  const s = lang.value === 'en' ? (EN[ru] ?? ru) : ru
  return s.replace(/\{(\w+)\}/g, (_, k) => String(p[k] ?? ''))
}

/** Локаль для чисел (1,5 / 1.5). */
export const numLocale = () => (lang.value === 'en' ? 'en' : 'ru')

/** «медаль / медали / медалей» и «medal / medals». */
export function medalsWord(n: number): string {
  if (lang.value === 'en') return n === 1 ? 'medal' : 'medals'
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'медаль'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'медали'
  return 'медалей'
}

const EN: Record<string, string> = {
  // --- вкладки и окна
  'Тренировки': 'Training',
  'Снаряжение': 'Gear',
  'Забег': 'Race',
  'Профиль': 'Profile',
  'Настройки': 'Settings',
  'Закрыть': 'Close',
  // --- сцена и HUD
  'нет сил': 'no energy',
  '+{n} м': '+{n} m',
  '+{n} км': '+{n} km',
  '+{n}% сил': '+{n}% energy',
  'Поймать гель': 'Catch the gel',
  'Нажимай на экран, чтобы бежать': 'Tap the screen to run',
  'Тренировочные км': 'Training km',
  'в секунду': 'per second',
  'Общий пробег {km} км': 'Total distance {km} km',
  '{v} км/ч': '{v} km/h',
  '{v} км': '{v} km',
  '/км': '/km',
  // --- карточка забега
  'Забег {name}': 'Race: {name}',
  'лимит {t}': 'limit {t}',
  'Прогноз финиша': 'Finish forecast',
  'Готов к старту ✓': 'Ready to start ✓',
  'Успеешь с рывками': 'Doable with dashes',
  'Готовность {p}%': 'Readiness {p}%',
  'Готовность к забегу': 'Race readiness',
  'На трассе: {name}': 'On course: {name}',
  'Пройденная дистанция': 'Distance covered',
  '{c} из {k} км': '{c} of {k} km',
  'отрыв от тени +{m} м': '+{m} m ahead of the pace ghost',
  'тень впереди на {m} м': 'pace ghost {m} m ahead',
  'Силы': 'Energy',
  'Стена! Лови гель': 'The wall! Catch a gel',
  'хватит до финиша': 'enough to finish',
  'не хватит до финиша': 'not enough to finish',
  'Запас сил': 'Energy reserve',
  // --- тренировки
  'Сколько уровней покупать': 'How many levels to buy',
  'Покупать по': 'Buy',
  'ур. {n}': 'lv. {n}',
  '+{v} км/с за уровень': '+{v} km/s per level',
  'всего {v} км/с · ×2 на ур. {n}': 'total {v} km/s · ×2 at lv. {n}',
  'Откроется после забега {name}': 'Unlocks after the {name} race',
  'Апгрейды': 'Upgrades',
  'Откроется на ур. {n} «{gen}»': 'Unlocks at lv. {n} of “{gen}”',
  'Куплено ✓': 'Owned ✓',
  'офлайн до {h}': 'offline up to {h}',
  'офлайн {p} дохода': 'offline {p} of income',
  ' (макс.)': ' (max)',
  '{h} ч': '{h} h',
  '{m} мин': '{m} min',
  '{s} с': '{s} s',
  // --- снаряжение
  'скорость': 'speed',
  'выносливость': 'endurance',
  'рывок': 'dash',
  'Уровень {a} из {b}': 'Level {a} of {b}',
  'Дальше: {name}, {desc}': 'Next: {name}, {desc}',
  '{m} и +{p}% секундного дохода': '{m} and +{p}% of per-second income',
  'Максимальный уровень': 'Max level',
  // --- окно «Забег»
  'Ты на трассе {name}. Закрой окно: тапы — рывки за счёт сил, гели на пунктах питания возвращают силы.':
    'You are racing the {name}. Close this window: taps are dashes that spend energy, gels at aid stations restore it.',
  'К трассе': 'Back to the course',
  'Лимит': 'Limit',
  'Темп': 'Pace',
  'Готов ✓': 'Ready ✓',
  'Прошлая попытка: финиш {name} за {t}': 'Last attempt: finished {name} in {t}',
  'Прошлая попытка: сход на {d} км': 'Last attempt: DNF at {d} km',
  'Не успеваешь на {t}': 'Short by {t}',
  'Успеваешь с запасом {t}': 'On time with {t} to spare',
  'Нужно бежать быстрее на': 'You need to run faster by',
  'Закрыть разрыв можно так:': 'To close the gap:',
  'Что прокачать:': 'What to improve:',
  'Скорость +{p}%': 'Speed +{p}%',
  '— тренировки, кроссовки, еда': '— training, shoes, food',
  'Выносливость ×{v}': 'Endurance ×{v}',
  '(сейчас ×{v}) — напитки, экипировка': '(now ×{v}) — drinks, kit',
  'Одной выносливостью не закрыть — нужна скорость': 'Endurance alone won’t close it — you need speed',
  'С рывками и гелями — до {t}.': 'With dashes and gels — down to {t}.',
  'Хороший шанс на личный рекорд.': 'Good chance for a personal best.',
  'Успеешь, если правильно расходовать силы.': 'You’ll make it if you pace your energy.',
  'Пока не хватит даже с ними.': 'Not enough even with them yet.',
  'Награда: {r}': 'Reward: {r}',
  '{reward} и тренировка «{name}»': '{reward} and the “{name}” training',
  'Стартовать можно с любой подготовкой. На трассе тап — рывок, он тратит силы. Силы кончились — «стена», бег замедляется. На ⅓ и ⅔ дистанции пролетает гель — поймай, чтобы вернуть силы. Если тень лимита обгонит тебя до финиша — сход без награды.':
    'You can start with any preparation. On the course a tap is a dash that spends energy. Out of energy — you hit the wall and slow down. At ⅓ and ⅔ of the distance a gel flies by — catch it to restore energy. If the pace ghost passes you before the finish — DNF, no reward.',
  'Старт': 'Start',
  'Старт — рискнуть': 'Start — take the risk',
  'Все забеги пройдены': 'All races completed',
  'Следующий старт — 30 км и марафон. Появятся в следующей версии.': 'Next up: 30 km and the marathon. Coming in the next version.',
  'Дистанции': 'Distances',
  // --- профиль
  '{w} за финиши': '{w} for finishes',
  'финиш': 'finished',
  'Общий пробег': 'Total distance',
  'Секунда в игре — минута на трассе. Тренировки набегают километры, а скорость бегуна растёт вместе с ними.':
    'One second in the game is one minute on the course. Training adds kilometers, and the runner’s speed grows with them.',
  'Прогресс сохраняется в этом браузере. Пока игра закрыта, бегун тренируется до {h} с эффективностью {p}, а забег стоит на паузе.':
    'Progress is saved in this browser. While the game is closed, the runner trains for up to {h} at {p} efficiency, and races are paused.',
  'Сбросить прогресс': 'Reset progress',
  'Стереть всё?': 'Erase everything?',
  'Да, сбросить': 'Yes, reset',
  'Отмена': 'Cancel',
  'Начинаем с нуля': 'Starting from scratch',
  // --- настройки
  'Персонаж': 'Runner',
  'Тема': 'Theme',
  'Язык': 'Language',
  'Звук': 'Sound',
  'Музыка': 'Music',
  'Без звука': 'Mute',
  'Вкл': 'On',
  'Выкл': 'Off',
  'Авто': 'Auto',
  'День': 'Day',
  'Ночь': 'Night',
  // --- возвращение
  'Пока тебя не было': 'While you were away',
  'Бегун продолжал тренироваться': 'Your runner kept training',
  'Время отсутствия': 'Time away',
  'Засчитано {h} — это лимит (растёт с «Беговым клубом»). ': 'Counted {h} — that’s the limit (grows with Running club). ',
  'Офлайн тренировки идут на {p} от темпа в игре (растёт с «Личным тренером»).':
    'Offline training runs at {p} of the in-game rate (grows with Personal coach).',
  'Забег стоял на паузе — продолжишь с того же места.': 'Your race was paused — you’ll continue from the same spot.',
  'Продолжить': 'Continue',
  // --- результат
  'Результат забега': 'Race result',
  'Финиш! {name}': 'Finish! {name}',
  'Время': 'Time',
  '+1 медаль': '+1 medal',
  '· всего {n}': '· total {n}',
  'Открыта тренировка:': 'New training unlocked:',
  'Следующий старт:': 'Next race:',
  'Все дистанции пройдены — дальше марафон в следующей версии': 'All distances done — the marathon comes in the next version',
  'Дальше': 'Next',
  'Сход на {c} из {k} км': 'DNF at {c} of {k} km',
  'Тень лимита обогнала тебя на {t}. Медали нет, но весь прогресс остаётся.': 'The pace ghost passed you at {t}. No medal, but all progress stays.',
  'Прокачаться': 'Level up',
  'Ты сошёл с дистанции на {t}.': 'You dropped out at {t}.',
  'Ты сошла с дистанции на {t}.': 'You dropped out at {t}.',
  'Тень лимита обогнала тебя на {t}.': 'The pace ghost passed you at {t}.',
  'Сдаться': 'Give up',
  'Забег идёт': 'Race in progress',
  'Сойти с дистанции?': 'Drop out of the race?',
  'Да, сойти': 'Yes, drop out',
  'Бежать дальше': 'Keep running',
  'Ты сошёл с дистанции на {t}. Медали нет, но весь прогресс остаётся.': 'You dropped out at {t}. No medal, but all progress stays.',
  'Ты сошла с дистанции на {t}. Медали нет, но весь прогресс остаётся.': 'You dropped out at {t}. No medal, but all progress stays.',
  'Ещё раз': 'Try again',
  // --- выбор персонажа
  'Выбор персонажа': 'Choose runner',
  'Выбери бегуна': 'Choose your runner',
  'Характеристики одинаковые — выбирай, кто нравится. Сменить можно в любой момент в настройках.':
    'Stats are the same — pick whoever you like. You can switch anytime in Settings.',
  'Оставить как есть': 'Keep as is',
  // --- данные игры (config.ts)
  'Бегун': 'Male',
  'Бегунья': 'Female',
  '1 км': '1 km',
  '3 км': '3 km',
  '5 км': '5 km',
  '10 км': '10 km',
  '15 км': '15 km',
  'Полумарафон': 'Half marathon',
  'доход ×1.2': 'income ×1.2',
  'доход ×1.3': 'income ×1.3',
  'доход ×1.5': 'income ×1.5',
  'доход ×2': 'income ×2',
  'Утренняя трусца': 'Morning jog',
  'Беговой клуб': 'Running club',
  'Интервалы на стадионе': 'Track intervals',
  'Личный тренер': 'Personal coach',
  'Сборы в горах': 'Altitude camp',
  'Пульсометр': 'Heart rate monitor',
  'Беговой клуб ×2': 'Running club ×2',
  'Техника бега': 'Running form',
  'Бег как получится': 'Running however',
  'Каденс 180': 'Cadence 180',
  'Беговые упражнения': 'Running drills',
  'Плиометрика': 'Plyometrics',
  'Финишный спурт': 'Finishing kick',
  'Кроссовки': 'Shoes',
  'Старые кеды': 'Old sneakers',
  'Беговые кроссовки': 'Running shoes',
  'Кроссовки с амортизацией': 'Cushioned shoes',
  'Темповые кроссовки': 'Tempo shoes',
  'Карбоновая пластина': 'Carbon plate',
  'Еда': 'Food',
  'Бегаешь голодным': 'Running hungry',
  'Варёная картошка': 'Boiled potatoes',
  'Макароны': 'Pasta',
  'Финики и мармелад': 'Dates and gummies',
  'Беговые гели': 'Energy gels',
  'Напитки': 'Drinks',
  'Без воды': 'No water',
  'Вода': 'Water',
  'Кола на пунктах питания': 'Cola at aid stations',
  'Электролиты': 'Electrolytes',
  'Экипировка': 'Kit',
  'Футболка и треники': 'T-shirt and sweatpants',
  'Шорты с карманами': 'Shorts with pockets',
  'Беговой пояс': 'Running belt',
  'Трейловый жилет': 'Trail vest',
}
