"""Болельщики и арка для слоёв сцены.
1) Толпа crowd.png → границы людей по столбцам (минимумы непрозрачности) — печатает CROWD_SLICES для GameStage:
   каждый человек подпрыгивает отдельно.
2) Арка finish-arch.png → arch-back.png (левая стойка и перекладина, позади бегунов) и arch-front.png
   (правая, ближняя к зрителю стойка — поверх бегунов): бегуны пробегают внутри арки."""
from PIL import Image

D = 'src/assets/sprites/items/'
im = Image.open(D + 'crowd.png').convert('RGBA')
w, h = im.size
a = im.split()[3]
cols = [sum(1 for y in range(h) if a.getpixel((x, y))) for x in range(w)]
sm = [sum(cols[max(0, x - 1):x + 2]) for x in range(w)]
cuts = [0]
for x in range(6, w - 6):
    if sm[x] == min(sm[x - 5:x + 6]) and x - cuts[-1] >= 8:
        cuts.append(x)
cuts.append(w)
print('CROWD_SLICES =', [[cuts[i], cuts[i + 1] - cuts[i]] for i in range(len(cuts) - 1)])

arch = Image.open(D + 'finish-arch.png').convert('RGBA')
FRONT_X, FRONT_Y = 52, 30  # правая стойка ниже перекладины
front = Image.new('RGBA', arch.size)
front.paste(arch.crop((FRONT_X, FRONT_Y, arch.width, arch.height)), (FRONT_X, FRONT_Y))
back = arch.copy()
back.paste((0, 0, 0, 0), (FRONT_X, FRONT_Y, arch.width, arch.height))
back.save(D + 'arch-back.png', optimize=True)
front.save(D + 'arch-front.png', optimize=True)
