# Пиксельные иконки 32×32 для кнопок звука и музыки (вкл/выкл), в палитре шестерёнки.
# python3 tools/sprites/audio_icons.py → src/assets/icons/sound-{on,off}.png
import math
import numpy as np
from PIL import Image
OUT, HI, MID, SH = (38, 34, 48), (226, 228, 234), (176, 178, 190), (118, 114, 136)
RED = (220, 70, 50)
N = 32

def finish(mask, path, cross=False):
    img = np.zeros((N, N, 4), np.uint8)
    for y in range(N):
        for x in range(N):
            if not mask[y, x]: continue
            edge = any(not (0 <= x + dx < N and 0 <= y + dy < N and mask[y + dy, x + dx]) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge: col = OUT
            else:
                l = ((N / 2 - x) + (N / 2 - y)) / N
                col = HI if l > 0.2 else MID if l > -0.15 else SH
            img[y, x] = (*col, 255)
    if cross:  # красная диагональ с тёмной обводкой
        for t in range(4, 29):
            for w in (-1, 0, 1):
                x, y = t, t + w
                for dx, dy in ((0, 0), (1, 0), (0, 1)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < N and 0 <= yy < N: img[yy, xx] = (*OUT, 255)
        for t in range(5, 28):
            img[t, t] = (*RED, 255); img[t, t + 1 if t < 31 else t] = (*RED, 255)
    Image.fromarray(img).save(path)

# динамик: корпус + раструб + 2 волны
sp = np.zeros((N, N), bool)
for y in range(N):
    for x in range(N):
        if 5 <= x <= 11 and 12 <= y <= 20: sp[y, x] = True                      # корпус
        if 11 <= x <= 18 and abs(y - 16) <= 4 + (x - 11) * 1.0: sp[y, x] = True  # раструб
        r = math.hypot(x - 17, y - 16)
        if x > 20 and (5 <= r <= 8.2 or 10 <= r <= 13.2) and abs(y - 16) <= r * 0.75: sp[y, x] = True  # волны
finish(sp, 'src/assets/icons/sound-on.png')
sp_off = sp.copy(); sp_off[:, 20:] = False
finish(sp_off, 'src/assets/icons/sound-off.png', cross=True)

print('ok')
