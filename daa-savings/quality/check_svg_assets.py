#!/usr/bin/env python3
"""Fail high-resolution SVG exports when embedded raster graphics must be enlarged.

Usage: python check_svg_assets.py file.svg --export-width 4344
This is an asset-fidelity gate, not a substitute for brand or layout approval.
"""
import argparse
import base64
import io
import json
import re
import xml.etree.ElementTree as ET
from PIL import Image

NS = {'svg': 'http://www.w3.org/2000/svg'}
HREFS = ('{http://www.w3.org/1999/xlink}href', 'href')

def numeric(value):
    m = re.match(r'^\s*([\d.]+)', str(value or ''))
    return float(m.group(1)) if m else None

def inspect(svg_path, export_width, max_upscale):
    root = ET.parse(svg_path).getroot()
    vb = root.get('viewBox')
    native_width = float(vb.split()[2]) if vb else numeric(root.get('width'))
    if not native_width or native_width <= 0:
        raise ValueError('Missing SVG source width')
    factor = export_width / native_width
    layers = []
    for idx, el in enumerate(root.findall('.//svg:image', NS), 1):
        href = next((el.get(k) for k in HREFS if el.get(k)), '')
        if not href.startswith('data:image/'):
            layers.append({'layer': idx, 'status': 'EXTERNAL_UNVERIFIED'})
            continue
        im = Image.open(io.BytesIO(base64.b64decode(href.split(',', 1)[1])))
        dw, dh = numeric(el.get('width')), numeric(el.get('height'))
        if not dw or not dh:
            layers.append({'layer': idx, 'status': 'MISSING_DISPLAY_DIMENSIONS'})
            continue
        rw, rh = dw * factor, dh * factor
        scale = max(rw / im.width, rh / im.height)
        layers.append({'layer': idx, 'embedded_pixels': [im.width, im.height],
                       'output_pixels': [round(rw), round(rh)],
                       'upscale': round(scale, 2),
                       'status': 'FAIL_RASTER_UPSCALE' if scale > max_upscale else 'PASS'})
    return {'source_width': native_width, 'export_width': export_width,
            'all_assets_pass': bool(layers) and all(x['status'] == 'PASS' for x in layers),
            'layers': layers,
            'limitation': 'Original brand files, text clipping, calculations, and inbox layout require separate QA.'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('svg')
    parser.add_argument('--export-width', type=int, required=True)
    parser.add_argument('--max-upscale', type=float, default=1.25)
    a = parser.parse_args()
    report = inspect(a.svg, a.export_width, a.max_upscale)
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['all_assets_pass'] else 2)
