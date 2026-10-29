# Пиксельные кнопки 9-slice (12×14, срез 4/4/6/4): ступенчатые углы, контур темнее заливки, светлая кромка сверху,
# «толщина» снизу. Обычная и нажатая (без толщины, ниже на 2 px) — для оранжевой, тёмной и светлой кнопки.
# python3 tools/sprites/buttons.py → src/assets/ui/btn-<color>[-down].png
from PIL import Image
UP = [
    "..OOOOOOOO..",
    ".OHHHHHHHHO.",
    "OHHFFFFFFFFO",
    "OHFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFSO",
    "OSSSSSSSSSSO",
    "ODDDDDDDDDDO",
    ".ODDDDDDDDO.",
    "..OOOOOOOO..",
]
DOWN = [
    "............",
    "............",
    "..OOOOOOOO..",
    ".OSSSSSSSSO.",
    "OSFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    "OFFFFFFFFFFO",
    ".OFFFFFFFFO.",
    "..OOOOOOOO..",
]
COLORS = {  # O контур, H блик, F заливка, S тень, D толщина
    'accent': {'O': (140, 58, 10), 'H': (255, 200, 140), 'F': (255, 128, 40), 'S': (238, 108, 26), 'D': (196, 82, 14)},  # чистый оранжевый, без красноты
    'dark': {'O': (4, 8, 6), 'H': (104, 124, 116), 'F': (46, 60, 55), 'S': (36, 48, 44), 'D': (10, 16, 13)},  # грань светлее толщины — объём виден
    'light': {'O': (120, 136, 130), 'H': (255, 255, 255), 'F': (227, 235, 232), 'S': (200, 210, 206), 'D': (160, 172, 168)},
}
OFF = {  # неактивная кнопка: приглушённая, без блика, но с той же толщиной снизу (UP-шаблон) — текст по центру грани
    'off-light': {'O': (186, 197, 193), 'H': (226, 232, 229), 'F': (226, 232, 229), 'S': (226, 232, 229), 'D': (198, 208, 204)},
    'off-dark': {'O': (44, 56, 51), 'H': (20, 28, 25), 'F': (20, 28, 25), 'S': (20, 28, 25), 'D': (34, 44, 40)},
}
for name, c in OFF.items():
    im = Image.new('RGBA', (12, 14), (0, 0, 0, 0))
    for y, row in enumerate(UP):
        for x, ch in enumerate(row):
            if ch != '.': im.putpixel((x, y), (*c[ch], 255))
    im.save(f'src/assets/ui/btn-{name}.png')
for name, c in COLORS.items():
    for suffix, art in (('', UP), ('-down', DOWN)):
        im = Image.new('RGBA', (12, 14), (0, 0, 0, 0))
        for y, row in enumerate(art):
            for x, ch in enumerate(row):
                if ch != '.': im.putpixel((x, y), (*c[ch], 255))
        im.save(f'src/assets/ui/btn-{name}{suffix}.png')
print('ok')
