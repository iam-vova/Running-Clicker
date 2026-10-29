# Медали по дистанциям: перекраска icons/medal.png — металл по уровню (бронза/серебро/золото), лента по дистанции.
# python3 tools/sprites/medals.py → src/assets/icons/medal-<id>.png
import numpy as np
from PIL import Image
src = np.asarray(Image.open('src/assets/icons/medal.png').convert('RGBA')).astype(float)
RIBBON_ROWS = 7
BLUE = [(48, 132, 205), (49, 132, 203), (32, 79, 154)]
RED = [(248, 62, 38), (184, 25, 14)]
METAL = {
    'bronze': [(70, 32, 12), (168, 98, 48), (238, 178, 120)],
    'silver': [(58, 62, 74), (156, 162, 176), (246, 248, 252)],
    'gold': None,
    'platinum': [(40, 52, 70), (150, 196, 214), (236, 252, 255)],  # марафон — «платина» с голубым отливом
}
MEDALS = {  # id: (металл, (цвет полосы вместо синей, вместо красной))
    '1k': ('bronze', ((60, 170, 90), (245, 245, 240))),
    '3k': ('bronze', ((40, 160, 170), (250, 210, 60))),
    '5k': ('silver', ((130, 80, 200), (245, 245, 240))),
    '10k': ('silver', ((48, 132, 205), (248, 62, 38))),
    '15k': ('gold', ((240, 120, 30), (40, 40, 48))),
    'half': ('gold', ((210, 40, 40), (250, 200, 50))),
    '30k': ('gold', ((30, 60, 140), (245, 245, 240))),
    'marathon': ('platinum', ((20, 20, 24), (240, 190, 40))),
    '50k': ('platinum', ((40, 120, 60), (120, 80, 40))),  # ультра — трейловые цвета: лес и земля
    '100k': ('platinum', ((24, 30, 70), (230, 230, 240))),  # ночь: тёмно-синяя лента со светлой полосой
}
def shade(c, k):  # тёмный вариант цвета полосы
    return tuple(int(v * k) for v in c)
for mid, (metal, (c1, c2)) in MEDALS.items():
    a = src.copy()
    rgb = a[..., :3]
    for y in range(RIBBON_ROWS):
        for x in range(a.shape[1]):
            p = tuple(int(v) for v in rgb[y, x])
            if p in BLUE[:2]: rgb[y, x] = c1
            elif p == BLUE[2]: rgb[y, x] = shade(c1, 0.65)
            elif p == RED[0]: rgb[y, x] = c2
            elif p == RED[1]: rgb[y, x] = shade(c2, 0.7)
    if METAL[metal]:
        dark, mid_, light = (np.array(c, float) for c in METAL[metal])
        r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
        warm = (a[..., 3] > 0) & (r > g) & (g >= b) & (r - b > 40)
        warm[:RIBBON_ROWS] = False
        L = (0.3 * r + 0.59 * g + 0.11 * b) / 255
        t = np.clip((L - 0.15) / 0.75, 0, 1)[..., None]
        col = np.where(t < 0.5, dark + (mid_ - dark) * (t / 0.5), mid_ + (light - mid_) * ((t - 0.5) / 0.5))
        rgb[warm] = col[warm]
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(f'src/assets/icons/medal-{mid}.png')
print('ok')
