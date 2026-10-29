# Фон маршрута: одна цельная панорама от PixelLab (400×384, tools/bg/route-src.png), доработанная кодом:
# - мачта прожектора убрана, вдоль дорожки — парковые фонари (днём выключены, ночью горят и светят на тротуар);
# - небо днём голубое; ночью — градиент со звёздами, облака приглушённые, часть окон горит;
# - опущена на 44 строки (дорожка под ногами бегуна, строка 357) и зеркально замкнута в петлю 800×384.
# python3 panorama_single.py tools/bg/route-src.png src/assets/bg
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert('RGB')).astype(np.int16)
H, W = a.shape[:2]

SKY_SRC = np.array([154, 245, 225])     # мятное небо картинки
SKY_DAY = np.array([142, 214, 250])     # голубое небо (= --sky днём в CSS)
CLOUDS = {(251, 250, 249): (58, 66, 112), (232, 246, 246): (46, 53, 95)}
WINDOW = np.array([128, 197, 203])      # стекло окон
LAMPS_X = [72, 168, 262]                # фонари вдоль дорожки (между деревьями, лавками, домами)
SIDEWALK = 271                          # верх тротуара в исходнике

bayer = np.array([[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
                  [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
                  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]]) / 64.0

def same(img, c):
    return (np.abs(img - np.array(c)).sum(-1) == 0)

# --- 1. убрать мачту прожектора: голова — небо, столб — соседние пиксели слева/справа
a[46:90, 186:246] = SKY_SRC   # облаков в этом прямоугольнике нет
# столб: восстанавливаем фон за ним (кроны, облака, ограда) инпейнтингом, затем возвращаем цвета к палитре картинки
import cv2
hole = np.zeros((H, W), np.uint8); hole[88:SIDEWALK, 211:220] = 255
fill = cv2.inpaint(a.astype(np.uint8)[..., ::-1], hole, 4, cv2.INPAINT_TELEA)[..., ::-1].astype(np.int16)
ys, xs = np.nonzero(hole)
for y in range(88, SIDEWALK):               # цвета — только из соседей по строке (±12 px), без стекла окон
    near = np.concatenate([a[max(88, y - 3):y + 4, 199:211].reshape(-1, 3), a[max(88, y - 3):y + 4, 220:232].reshape(-1, 3)])
    near = near[np.abs(near - WINDOW).sum(-1) != 0]
    pal = np.unique(near, axis=0)
    for x in range(211, 220):
        a[y, x] = pal[np.abs(pal - fill[y, x]).sum(-1).argmin()]
# крона, которую закрывал столб: дорисовываем по эллипсу (центр 189,198; полуоси 25×30) зеркально с видимой половины,
# снаружи — фон справа от столба (облако, тёмная зелень). Иначе у кроны оставался прямой срез.
for y in range(165, 236):
    for x in range(211, 221):
        if ((x - 189) / 25) ** 2 + ((y - 198) / 30) ** 2 <= 1:
            a[y, x] = a[y, 378 - x]
        else:
            a[y, x] = a[y, 221]
# ограда и основание столба (строки 246–271): продолжаем узор прутьев соседним участком справа
a[246:SIDEWALK, 211:221] = a[246:SIDEWALK, 222:232]

# --- 2. фонари (вид сбоку): основание, тонкий чугунный столб с кольцом, фонарь-лантерна с колпаком
IRON, IRON_HI = np.array([52, 48, 66]), np.array([96, 90, 120])
GLASS_OFF, GLASS_ON, GLASS_CORE = np.array([214, 222, 214]), np.array([255, 222, 140]), np.array([255, 248, 214])
TOP = 214   # верх колпака

def draw_lamp(img, x, lit):
    for y in range(TOP + 13, SIDEWALK - 3):               # столб
        img[y, x] = IRON; img[y, x + 1] = IRON_HI
    img[SIDEWALK - 3:SIDEWALK, x - 2:x + 4] = IRON         # основание
    img[SIDEWALK - 3, x - 1:x + 3] = IRON_HI
    img[TOP + 30, x - 1:x + 3] = IRON                      # кольцо
    img[TOP, x:x + 2] = IRON                               # колпак
    img[TOP + 1, x - 1:x + 3] = IRON
    img[TOP + 2, x - 3:x + 5] = IRON
    img[TOP + 3:TOP + 10, x - 2] = IRON; img[TOP + 3:TOP + 10, x + 3] = IRON   # рамка
    img[TOP + 3:TOP + 10, x - 1:x + 3] = GLASS_ON if lit else GLASS_OFF        # стекло
    if lit: img[TOP + 5:TOP + 8, x:x + 2] = GLASS_CORE
    img[TOP + 10, x - 2:x + 4] = IRON                      # низ фонаря
    img[TOP + 11:TOP + 13, x:x + 2] = IRON

def glow(img, x, strength=0.5):
    """Свет фонаря ночью: мягкий ореол вокруг фонаря и пятно света на тротуаре."""
    cy, cx = TOP + 6, x + 0.5
    warm = np.array([255, 214, 130])
    for y in range(TOP - 14, SIDEWALK + 16):
        for xx in range(x - 26, x + 28):
            if not (0 <= xx < W): continue
            d = np.hypot((xx - cx) / 1.0, (y - cy) / 1.0)
            t = max(0.0, 1 - d / 15) * strength                 # ореол
            if y >= SIDEWALK:                                    # пятно на тротуаре (эллипс)
                e = np.hypot((xx - cx) / 24, (y - SIDEWALK - 4) / 9)
                t = max(t, max(0.0, 1 - e) ** 1.5 * 0.4)
            if t > 0.02:                                         # мягкий ореол, без россыпи точек
                img[y, xx] = (img[y, xx] * (1 - t) + warm * t).astype(np.int16)

# --- 3. день
day = a.copy()
day[same(day, SKY_SRC)] = SKY_DAY
for x in LAMPS_X: draw_lamp(day, x, lit=False)

# --- 4. ночь: перекраска + звёзды + горящие окна + фонари
def night(img):
    f = img.astype(np.float32)
    o = f * np.array([0.32, 0.36, 0.55]) + np.array([4, 6, 22])
    sky = same(img, SKY_SRC)
    rows = np.linspace(0, 1, img.shape[0])[:, None]
    sky_col = np.stack([7 + 18 * rows, 10 + 22 * rows, 31 + 40 * rows], -1) * np.ones((1, img.shape[1], 1))
    o[sky] = sky_col[sky]
    for c, nc in CLOUDS.items():
        o[same(img, c) & (np.arange(img.shape[0])[:, None] < 250)] = nc
    rng = np.random.default_rng(7)
    ys, xs = np.nonzero(sky & (np.arange(img.shape[0])[:, None] < 230) & (np.arange(img.shape[0])[:, None] > 2))  # не в верхней строке: она размножается при сдвиге
    pick = rng.random(len(ys)) < 0.004
    o[ys[pick], xs[pick]] = [235, 235, 255]
    return np.clip(o, 0, 255).astype(np.int16)

nt = night(a)
# окна: каждое окно — связная область стекла; горит примерно каждое третье (выбор фиксирован)
from scipy import ndimage
glass = same(a, WINDOW); glass[:, :265] = False   # окна только у домов (правая часть картинки)
lab, n = ndimage.label(glass)
rng = np.random.default_rng(3)
for k in range(1, n + 1):
    if rng.random() < 0.35:
        m = lab == k
        nt[m] = [255, 206, 112]
        ys, xs = np.nonzero(m)
        nt[ys.min(), xs[ys == ys.min()]] = [255, 232, 160]   # светлая полоска сверху окна
for x in LAMPS_X:
    draw_lamp(nt, x, lit=True)
    glow(nt, x)
    draw_lamp(nt, x, lit=True)   # фонарь поверх ореола

def finish(img):
    SHIFT = 44
    img = np.concatenate([np.repeat(img[:1], SHIFT, axis=0), img[:-SHIFT]], axis=0)
    loop = np.concatenate([img, img[:, ::-1]], axis=1)
    return Image.fromarray(np.clip(loop, 0, 255).astype(np.uint8)).quantize(256, dither=Image.Dither.NONE)

finish(day).save(f'{out}/route.png', optimize=True)
finish(nt).save(f'{out}/route-night.png', optimize=True)
print('ok')
