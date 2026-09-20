#!/usr/bin/env python3
"""Writes icons/icon-192.png, icons/icon-512.png, icons/apple-touch-icon.png (180).
Dark green square with a gold Triforce. No dependencies."""
import struct, zlib, os

BG = (31, 77, 58)
FG = (232, 190, 84)

def inside(p, a, b, c):
    (px, py), (ax, ay), (bx, by), (cx, cy) = p, a, b, c
    d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by)
    d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy)
    d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay)
    neg = d1 < 0 or d2 < 0 or d3 < 0
    pos = d1 > 0 or d2 > 0 or d3 > 0
    return not (neg and pos)

def triforce(size):
    s = size
    h = s * 0.62
    w = h * 2 / 3 ** 0.5
    cx, top = s / 2, s * 0.21
    A = (cx, top); B = (cx - w / 2, top + h); C = (cx + w / 2, top + h)
    mAB = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
    mAC = ((A[0] + C[0]) / 2, (A[1] + C[1]) / 2)
    mBC = ((B[0] + C[0]) / 2, (B[1] + C[1]) / 2)
    tris = [(A, mAB, mAC), (mAB, B, mBC), (mAC, mBC, C)]
    rows = []
    for y in range(s):
        row = bytearray([0])
        for x in range(s):
            p = (x + 0.5, y + 0.5)
            row.extend(FG if any(inside(p, *t) for t in tris) else BG)
        rows.append(bytes(row))
    return b''.join(rows)

def png(size, raw):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

os.makedirs('icons', exist_ok=True)
for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)]:
    with open(os.path.join('icons', name), 'wb') as f:
        f.write(png(size, triforce(size)))
    print('wrote icons/' + name)
