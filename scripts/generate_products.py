#!/usr/bin/env python3
"""
Generador de products.json a partir de imágenes en /img

Convención recomendada de nombres (ejemplos):
  categoria__slug__caption-1.jpg
  ropa__bufanda-colorida__detalle-1.jpg
  regalos__muneco-tejido__frente.jpg
  decoracion__rosas-eternas__detalle2.png

Reglas de parseo:
 - separador principal: "__" (doble guión bajo)
 - primera parte = categoría
 - segunda parte = slug (se usará para el nombre: slug -> 'Bufanda Colorida')
 - resto (si existe) se combina como caption/parte de descripción
 - si un archivo no sigue la convención, se agrupa bajo categoría "Sin categoría" y el nombre toma la parte antes de la extensión

Salida:
 - genera/actualiza `products.json` en la raíz del proyecto con objetos:
   { id, name, price(0), description, category, images: ["img/archivo.jpg", ...] }
 - si existe `products.json` hace copia de seguridad a `products.json.bak` antes de sobrescribir

Uso (PowerShell o terminal):
  python scripts\generate_products.py

Nota: revisa además que las imágenes existan en la carpeta `img/`. El script no sube archivos, solo genera JSON.
"""

import os
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / 'img'
OUT_FILE = ROOT / 'products.json'
ARCHIVE_DIR = ROOT / 'archive'

import shutil
import datetime

EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}

def slug_to_title(slug: str) -> str:
    # reemplaza guiones/underscores por espacios y capitaliza
    s = re.sub(r'[-_]+', ' ', slug)
    return s.strip().title()


def parse_filename(fname: str):
    """Parsea: categoria__slug__caption.ext -> (category, slug, caption)"""
    name = Path(fname).stem
    parts = name.split('__')
    if len(parts) >= 2:
        category = parts[0].strip()
        slug = parts[1].strip()
        caption = ' '.join(p.strip() for p in parts[2:]) if len(parts) > 2 else ''
    else:
        # intentar con un solo guion bajo: categoria_slug_caption.ext
        parts2 = name.split('_')
        if len(parts2) >= 2:
            category = parts2[0].strip()
            slug = parts2[1].strip()
            caption = ' '.join(p.strip() for p in parts2[2:]) if len(parts2) > 2 else ''
        else:
            # fallback
            category = 'Sin categoría'
            slug = parts[0].strip()
            caption = ''
    # limpiar
    if not category:
        category = 'Sin categoría'
    if not slug:
        slug = Path(fname).stem
    return category, slug, caption


def main():
    if not IMG_DIR.exists():
        print(f"No existe la carpeta de imágenes: {IMG_DIR}")
        return

    files = [f for f in sorted(os.listdir(IMG_DIR)) if Path(f).suffix.lower() in EXTS]
    if not files:
        print(f"No se encontraron imágenes en {IMG_DIR}")
        return

    groups = {}  # key = slug, value = dict(category, images, captions, slug)

    for f in files:
        category, slug, caption = parse_filename(f)
        key = slug.lower()
        rel = str(Path('img') / f).replace('\\', '/')
        if key not in groups:
            groups[key] = { 'category': category.title(), 'slug': slug, 'images': [], 'captions': [] }
        groups[key]['images'].append(rel)
        groups[key]['captions'].append(caption)

    # Generar lista de productos
    products = []
    next_id = 1
    # Si hay products.json existente, intentar mantener IDs incrementales
    if OUT_FILE.exists():
        try:
            existing = json.loads(OUT_FILE.read_text(encoding='utf-8'))
            ids = [p.get('id', 0) for p in existing if isinstance(p, dict)]
            if ids:
                next_id = max(ids) + 1
        except Exception:
            next_id = 1

    for slug_key, data in groups.items():
        name = slug_to_title(data['slug'])
        category = data['category']
        images = data['images']
        # build a description using captions (if any not empty)
        captions = [c for c in data['captions'] if c]
        description = captions[0] if captions else f"Producto {name} en categoría {category}."

        product = {
            'id': next_id,
            'name': name,
            'price': 0.0,
            'description': description,
            'category': category,
            'images': images
        }
        products.append(product)
        next_id += 1

    # Respaldar si existe: crear carpeta archive/ y guardar con timestamp
    if OUT_FILE.exists():
        ARCHIVE_DIR.mkdir(exist_ok=True)
        ts = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        bak_path = ARCHIVE_DIR / f'products.json.bak.{ts}'
        print(f"Respaldando {OUT_FILE} -> {bak_path}")
        shutil.copy(str(OUT_FILE), str(bak_path))

    # Escribir products.json
    OUT_FILE.write_text(json.dumps(products, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"Generado {OUT_FILE} con {len(products)} productos.")
    print("Revisa el archivo y ajusta precios/descripciones si lo deseas.")

if __name__ == '__main__':
    main()
