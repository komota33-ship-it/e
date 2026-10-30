"""Package the offline game into verified, browser-sized download parts."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parent
version = json.loads((ROOT / 'package.json').read_text())['version'].removesuffix('.0')
parser = argparse.ArgumentParser()
parser.add_argument('--parts-dir', type=Path, default=ROOT / 'dist' / 'downloads' / f'v{version}')
parser.add_argument('--part-size-mib', type=int, default=10)
args = parser.parse_args()
assert 1 <= args.part_size_mib <= 32
html = ROOT / 'dist' / 'lift-v-ad.html'
archive = ROOT / 'dist' / f'lift-v-ad-v{version}.zip'
readme = f'''ЛИФТ В АД — ПРОТОТИП {version}

Распакуйте ZIP и откройте lift-v-ad.html в современном браузере.
Интернет для игры не требуется. Управление рассчитано на компьютер.
A/D или стрелки — движение; Shift — бег; Q — уклонение; Пробел/W — прыжок.
Мышь/ЛКМ — прицел/огонь; F — огонь; R — перезарядка; E — действие.
I/Tab — рюкзак; Esc — закрыть/пауза; G/H/V/L — граната/лечение/нож/фонарь.

Новые возможности и ограничения этой версии описаны в README.md.
Лаборатория доступна между попытками. Покупки действуют со следующего старта.
Для изготовления: встаньте у стола или технического ящика → I → Изготовление.

Сохранения находятся в браузере. Для автономного HTML хранение зависит от
разрешений браузера и пути файла. Не очищайте данные сайта. Для сохранения
прежнего прогресса используйте тот же браузер и прежний путь к HTML-файлу.
Не переносите старый архив в папку с частями новой версии.
'''
with ZipFile(archive, 'w', ZIP_DEFLATED, compresslevel=6) as z:
    z.write(html, 'lift-v-ad.html')
    z.writestr('ПРОЧТИ_МЕНЯ.txt', readme)
    z.write(ROOT / 'README.md', 'README.md')
with ZipFile(archive) as z:
    assert z.testzip() is None
    assert hashlib.sha256(z.read('lift-v-ad.html')).digest() == hashlib.sha256(html.read_bytes()).digest()
args.parts_dir.mkdir(parents=True, exist_ok=True)
args.parts_dir.chmod(0o755)
parts = []
for stale in args.parts_dir.glob(f'lift-v{version}.zip.[0-9][0-9][0-9]'):
    stale.unlink()
with archive.open('rb') as f:
    for i, chunk in enumerate(iter(lambda: f.read(args.part_size_mib * 1024 * 1024), b''), 1):
        part = args.parts_dir / f'lift-v{version}.zip.{i:03d}'
        part.write_bytes(chunk)
        part.chmod(0o644)
        parts.append(part)
expected = hashlib.sha256(archive.read_bytes()).hexdigest()
combined = hashlib.sha256()
for part in parts:
    combined.update(part.read_bytes())
assert combined.hexdigest() == expected
checks = '\n'.join(f'if not exist "{p.name}" goto missing' for p in parts)
inputs = '+'.join(f'"{p.name}"' for p in parts)
output = f'lift-v{version}-restored.zip'
bat = f'''@echo off
setlocal
cd /d "%~dp0"
{checks}
if exist "{output}" goto exists
copy /b {inputs} "{output}"
if errorlevel 1 goto failed
powershell.exe -NoProfile -NonInteractive -Command "if ((Get-FileHash -LiteralPath '{output}' -Algorithm SHA256).Hash -ne '{expected}') {{ exit 1 }}"
if errorlevel 1 goto failed
echo SUCCESS: {output} is complete and verified.
echo Extract the ZIP, then open lift-v-ad.html.
goto end
:missing
echo Put all {len(parts)} numbered files next to this BAT.
goto end
:exists
echo {output} already exists. Nothing was overwritten.
echo Rename it before rebuilding, or extract it if already complete.
goto end
:failed
echo Assembly or verification failed. Check that all four downloads completed.
echo Rename any incomplete output ZIP before retrying.
:end
pause
'''
assembler = args.parts_dir / f'assemble-game-v{version}.bat'
assembler.write_bytes(bat.replace('\n', '\r\n').encode('ascii'))
assembler.chmod(0o644)
(args.parts_dir / 'SHA256.txt').write_text(expected + '  ' + output + '\n')
(args.parts_dir / 'SHA256.txt').chmod(0o644)
(args.parts_dir / 'INSTRUCTIONS.txt').write_text(
    f'ЛИФТ В АД {version}\n\n'
    f'Скачайте все {len(parts)} пронумерованных файлов и assemble-game-v{version}.bat '
    'в одну папку. Не переименовывайте части.\n'
    'В Windows дважды щёлкните по BAT. Он соберёт ZIP и проверит SHA-256.\n'
    f'Распакуйте lift-v{version}-restored.zip и откройте lift-v-ad.html в браузере.\n'
    'Интернет во время игры не требуется.\n', encoding='utf-8')
(args.parts_dir / 'INSTRUCTIONS.txt').chmod(0o644)
print(f'Verified archive: {archive} ({archive.stat().st_size/1024/1024:.1f} MiB)')
for p in [*parts, assembler]:
    print(f'{p}: {p.stat().st_size} bytes')
