#!/usr/bin/env python3
"""ProseBeacon icon generator.

Renders the `pb` mark (red "P" + green loupe on a dark rounded tile) from pure
geometry and writes:

  assets/pb.png        512x512 raster master (Linux / .desktop)
  assets/pb.ico        Windows multi-size icon (16/32/48/256)
  assets/pb.icns       macOS icon container
  assets/pb-16.png …   individual sizes

No third-party dependency: PNG, ICO and ICNS are encoded with zlib + struct.
Run:  python3 tools/make-icons.py
"""
from __future__ import annotations

import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, '..', 'assets'))

BG = (11, 18, 32)          # #0b1220
RED = (229, 72, 77)        # #e5484d
GREEN = (48, 164, 108)     # #30a46c
EDGE = (34, 49, 77)        # subtle tile border


# ----------------------------------------------------------------- geometry
def rounded_rect(x, y, x0, y0, x1, y1, radius):
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    for cx, cy in ((x0 + radius, y0 + radius), (x1 - radius, y0 + radius),
                   (x0 + radius, y1 - radius), (x1 - radius, y1 - radius)):
        dx, dy = abs(x - cx), abs(y - cy)
        in_corner_x = (x < x0 + radius) if cx == x0 + radius else (x > x1 - radius)
        in_corner_y = (y < y0 + radius) if cy == y0 + radius else (y > y1 - radius)
        if in_corner_x and in_corner_y and dx * dx + dy * dy > radius * radius:
            return False
    return True


def in_p(x, y):
    """The 'P' glyph: stem + bowl with a counter."""
    stem = 20 <= x <= 27 and 18 <= y <= 46
    bowl = 20 <= x <= 38 and 18 <= y <= 36
    if bowl and x > 29:  # round the right side of the bowl
        bowl = ((x - 29) ** 2 + (y - 27) ** 2) <= 81
    hole = 27 <= x <= 32 and 25 <= y <= 29
    if hole and x > 29.5:
        hole = ((x - 29.5) ** 2 + (y - 27) ** 2) <= 4
    return stem or (bowl and not hole)


def in_loupe(x, y):
    """Magnifier: annulus + handle."""
    dx, dy = x - 44, y - 41
    distance = dx * dx + dy * dy
    if 16 <= distance <= 56.25:          # ring r 4..7.5
        return True
    # handle from (49.3, 46.3) to (55, 52), thickness 3.6
    ax, ay, bx, by = 49.3, 46.3, 55.0, 52.0
    vx, vy = bx - ax, by - ay
    t = max(0.0, min(1.0, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)))
    px, py = ax + t * vx - x, ay + t * vy - y
    return px * px + py * py <= 3.24


def pixel(x, y):
    if not rounded_rect(x, y, 0.5, 0.5, 63, 63, 14):
        return None
    if in_loupe(x, y):
        return GREEN
    if in_p(x, y):
        return RED
    if rounded_rect(x, y, 0.5, 0.5, 63, 63, 14) and not rounded_rect(x, y, 1.8, 1.8, 61.8, 61.8, 12.8):
        return EDGE
    return BG


def render(size, supersample=2):
    """Render the 64-unit design at `size` px with box supersampling."""
    scale = size / 64.0
    rows = []
    for row in range(size):
        line = bytearray()
        for col in range(size):
            total_r = total_g = total_b = total_a = 0
            hits = 0
            for sy in range(supersample):
                for sx in range(supersample):
                    ux = (col + (sx + 0.5) / supersample) / scale
                    uy = (row + (sy + 0.5) / supersample) / scale
                    colour = pixel(ux, uy)
                    hits += 1
                    if colour is None:
                        continue
                    total_r += colour[0]
                    total_g += colour[1]
                    total_b += colour[2]
                    total_a += 1
            if total_a == 0:
                line += b'\x00\x00\x00\x00'
                continue
            alpha = total_a / hits
            # premultiplied blend against transparency
            line += bytes((
                round(total_r / total_a),
                round(total_g / total_a),
                round(total_b / total_a),
                round(alpha * 255),
            ))
        rows.append(bytes(line))
    return rows


# ------------------------------------------------------------------- codecs
def png(size, rows):
    raw = b''.join(b'\x00' + row for row in rows)
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


def ico(images):
    """images: list of (size, png_bytes). PNG payloads are allowed since Vista."""
    count = len(images)
    header = struct.pack('<HHH', 0, 1, count)
    entries = b''
    payloads = b''
    offset = len(header) + 16 * count
    for size, data in images:
        dimension = 0 if size >= 256 else size
        entries += struct.pack('<BBBBHHII', dimension, dimension, 0, 0, 1, 32, len(data), offset)
        payloads += data
        offset += len(data)
    return header + entries + payloads


ICNS_TYPES = {16: b'icp4', 32: b'icp5', 64: b'icp6', 128: b'ic07', 256: b'ic08', 512: b'ic09', 1024: b'ic10'}


def icns(images):
    body = b''
    for size, data in images:
        tag = ICNS_TYPES[size]
        body += tag + struct.pack('>I', len(data) + 8) + data
    return b'icns' + struct.pack('>I', len(body) + 8) + body


def upscale(rows, source_size, target_size):
    """Nearest-neighbour upsample for the largest ICNS slot."""
    ratio = target_size / source_size
    out = []
    for row in range(target_size):
        src = min(source_size - 1, int(row / ratio))
        line = bytearray()
        for col in range(target_size):
            start = min(source_size - 1, int(col / ratio)) * 4
            line += rows[src][start:start + 4]
        out.append(bytes(line))
    return out


def main():
    os.makedirs(ASSETS, exist_ok=True)
    sizes = [16, 32, 48, 64, 128, 256]
    cache = {}
    for size in sizes:
        supersample = 4 if size <= 64 else 2
        rows = render(size, supersample)
        cache[size] = rows
        data = png(size, rows)
        with open(os.path.join(ASSETS, f'pb-{size}.png'), 'wb') as handle:
            handle.write(data)
        print(f'  pb-{size}.png  {len(data):>7,} bytes')

    master_rows = upscale(cache[256], 256, 512)
    master = png(512, master_rows)
    with open(os.path.join(ASSETS, 'pb.png'), 'wb') as handle:
        handle.write(master)
    print(f'  pb.png (512)   {len(master):>7,} bytes')

    icon = ico([(size, png(size, cache[size])) for size in (16, 32, 48, 256)])
    with open(os.path.join(ASSETS, 'pb.ico'), 'wb') as handle:
        handle.write(icon)
    print(f'  pb.ico         {len(icon):>7,} bytes')

    apple = icns([(size, png(size, cache[size])) for size in (16, 32, 64, 128, 256)] + [(512, master)])
    with open(os.path.join(ASSETS, 'pb.icns'), 'wb') as handle:
        handle.write(apple)
    print(f'  pb.icns        {len(apple):>7,} bytes')

    # Tiny transparent-free variant for terminal/favicons.
    with open(os.path.join(ASSETS, 'favicon.png'), 'wb') as handle:
        handle.write(png(32, cache[32]))
    print('  favicon.png')


if __name__ == '__main__':
    main()
