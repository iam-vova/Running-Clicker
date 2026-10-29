# Слои снаряжения поверх листов кадров персонажа (накладываются CSS-фонами и анимируются вместе с базой).
#   shoes-1..4  — кроссовки разных уровней (перекраска обуви)
#   kit-1..3    — экипировка: 1 шорты (ниже колена — кожа), 2 + беговой пояс, 3 + трейловый жилет поверх футболки
# python3 tools/sprites/gear_layers.py   → src/assets/sprites/<he|she>/<anim>-<layer>.png
import numpy as np
from PIL import Image

ROOT = 'src/assets/sprites'
F = 64
SHOES = {  # (светлый, средний, тёмный)
    1: ((90, 160, 245), (60, 120, 210), (40, 80, 160)),      # беговые кроссовки — синие
    2: ((255, 170, 70), (235, 125, 40), (180, 85, 25)),      # с амортизацией — оранжевые
    3: ((225, 245, 80), (180, 215, 40), (120, 160, 30)),     # темповые — лаймовые
    4: ((255, 110, 190), (230, 60, 150), (160, 30, 110)),    # карбон — розовые
}
VEST = ((70, 80, 100), (45, 52, 68), (26, 30, 42))            # трейловый жилет — графитовый
STRAP = (22, 30, 60)
FLASK = ((235, 245, 255), (150, 205, 245))                     # мягкая фляга: блик и вода
BELT = ((44, 44, 58), (20, 20, 28))
BUCKLE = (255, 120, 40)
SKIN = {'he': ((239, 191, 155), (228, 170, 135)), 'she': ((248, 188, 153), (239, 151, 120))}

def lum(p): return 0.3 * p[..., 0] + 0.59 * p[..., 1] + 0.11 * p[..., 2]

def classify(fr, who):
    rgb = fr[..., :3].astype(int); a = fr[..., 3] > 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    L = lum(rgb); sat = rgb.max(-1) - rgb.min(-1)
    y = np.arange(F)[:, None] * np.ones((1, F), int)
    skin = a & (r > 200) & (g > 135) & (g < 215) & (b > 95) & (b < 185) & (r - g > 22)
    dark = L < 42
    shoe = a & ~dark & (L >= 150) & (sat < 40) & (y >= 50)
    pantsish = a & ~dark & ~skin & ~shoe & (y >= 34) & ((sat < 32) | ((b >= r) & (b - r < 70)))
    if who == 'he':
        shirt = a & ~dark & ~skin & (y >= 15) & (y <= 44) & (r > 105) & (r - b > 70) & (g < 0.82 * r)
    else:
        shirt = a & ~dark & ~skin & (y >= 14) & (y <= 44) & (g > r + 12) & (b > r - 5) & (L > 95)
    return shoe, pantsish & ~shirt, shirt, L

def tone(L, cols, lo, hi):
    t = np.clip((L - lo) / max(hi - lo, 1), 0, 1)
    return np.where((t > 0.66)[..., None], cols[0], np.where((t > 0.33)[..., None], cols[1], cols[2]))

def vest_layer(o, shirt, L, top):
    yy = np.arange(F)
    mid = max(top - 5, 0)
    xs = np.nonzero(shirt[mid])[0]
    if len(xs) == 0: return
    # самый длинный непрерывный отрезок футболки посередине корпуса — туловище (руки отдельно)
    runs = np.split(xs, np.nonzero(np.diff(xs) > 1)[0] + 1)
    run = max(runs, key=len); x0, x1 = run[0], run[-1]
    w = x1 - x0 + 1
    # плечи: идём вверх, пока футболка в колонке туловища занимает больше половины ширины
    y0 = mid
    while y0 - 1 >= 0 and shirt[y0 - 1, x0:x1 + 1].sum() >= 0.5 * w: y0 -= 1
    box = shirt.copy(); box[:y0] = False; box[top:] = False; box[:, :max(x0 - 1, 0)] = False; box[:, x1 + 2:] = False
    col = tone(L, VEST, 60, 200)
    o[box, :3] = col[box]; o[box, 3] = 255
    # лямка-кант по переднему краю и мягкая фляга на груди
    for y in range(y0, top):
        r = np.nonzero(box[y])[0]
        if len(r): o[y, r[-1], :3] = STRAP; o[y, r[-1], 3] = 255
    fy = y0 + 2
    for k in range(4):
        y = fy + k
        r = np.nonzero(box[y])[0] if y < top else []
        if len(r) >= 4:
            xf = r[-1] - 2
            o[y, xf:xf + 2, :3] = FLASK[0] if k == 0 else FLASK[1]; o[y, xf:xf + 2, 3] = 255

def layers_for(sheet, who):
    h, w = sheet.shape[:2]; n = w // F
    out = {k: np.zeros_like(sheet) for k in ['shoes-1', 'shoes-2', 'shoes-3', 'shoes-4', 'kit-1', 'kit-2', 'kit-3']}
    for i in range(n):
        fr = sheet[:, i * F:(i + 1) * F]
        shoe, pants, shirt, L = classify(fr, who)
        sl = slice(i * F, (i + 1) * F)
        for lv, cols in SHOES.items():
            col = tone(L, cols, 150, 245)
            o = out[f'shoes-{lv}'][:, sl]; o[shoe, :3] = col[shoe]; o[shoe, 3] = 255
        # колено: верх штанов + 9 строк (на каждом кадре своё положение)
        ys = np.nonzero(pants.any(1))[0]
        if len(ys) == 0: continue
        top = ys[0]; knee = top + 9
        below = pants & (np.arange(F)[:, None] >= knee)
        skin_col = np.where((L >= 95)[..., None], SKIN[who][0], SKIN[who][1])
        for lv in (1, 2, 3):
            o = out[f'kit-{lv}'][:, sl]
            o[below, :3] = skin_col[below]; o[below, 3] = 255
            if lv >= 2:  # пояс: 2 строки на верху штанов
                band = (pants | shirt) & (np.arange(F)[:, None] >= top) & (np.arange(F)[:, None] <= top + 1)
                bc = np.empty((F, F, 3), int); bc[:] = BELT[1]; bc[top] = BELT[0]
                o[band, :3] = bc[band]; o[band, 3] = 255
                xs = np.nonzero(band[top + 1])[0]
                if len(xs): o[top + 1, xs[len(xs) // 2], :3] = BUCKLE
            if lv >= 3:  # трейловый жилет: корпус между плечами и поясом, руки и лицо не трогаем; фляга на груди
                vest_layer(o, shirt, L, top)
    return out

for who in ('he', 'she'):
    for anim in ('idle', 'run', 'finish'):
        sheet = np.asarray(Image.open(f'{ROOT}/{who}/{anim}.png').convert('RGBA')).copy()
        for k, img in layers_for(sheet, who).items():
            Image.fromarray(img).save(f'{ROOT}/{who}/{anim}-{k}.png', optimize=True)
print('ok')
