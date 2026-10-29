// Крайние случаи забега: без тапов, умные тапы, спам тапами (стена)
import { newState, startRace, tick, click, raceLive, forecast, bestForecast } from '../src/game/logic.ts'
for (const mode of ['passive', 'spam'] as const) {
  const s = newState()
  s.owned.jog = 2
  startRace(s, '1k')
  const fc = forecast(s, 1)
  let t = 0, res = null, wallAt = -1
  while (!res) {
    if (mode === 'spam' && t < 3) for (let i = 0; i < 1; i++) click(s)
    if (wallAt < 0 && raceLive(s)?.wall) wallAt = t
    res = tick(s, 0.1); t += 0.1
  }
  console.log(mode, 'прогноз', fc.toFixed(2), 'лучший', bestForecast(s, '1k').toFixed(2), '→', res.ok ? 'финиш' : 'сход', res.time.toFixed(2), 'стена с', wallAt.toFixed(1))
}
