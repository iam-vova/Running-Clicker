"""Соперники: кадры бега PixelLab (8 кадров 64×64, вид сбоку) → лист в ряд src/assets/sprites/rivals/<n>.png.
Запуск: python3 tools/sprites/rivals.py <n> <url-шаблон с {i}>"""
import io, subprocess, sys
from PIL import Image

n, tpl = sys.argv[1], sys.argv[2]
sheet = Image.new('RGBA', (64 * 8, 64))
for i in range(8):
    data = subprocess.run(["curl", "-sSf", tpl.replace("{i}", str(i))], capture_output=True, check=True).stdout
    sheet.paste(Image.open(io.BytesIO(data)).convert('RGBA'), (64 * i, 0))
sheet.save(f'src/assets/sprites/rivals/{n}.png', optimize=True)
print('ok', n)
