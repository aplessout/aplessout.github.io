"""Generate solid dark PWA icons with a red play triangle, no imaging library needed."""
import struct
import zlib


def png(path: str, size: int) -> None:
    bg = (11, 11, 15)
    fg = (229, 9, 20)
    rows = []
    cx, cy = size / 2, size / 2
    tri_left = cx - size * 0.16
    tri_right = cx + size * 0.20
    half = size * 0.22
    for y in range(size):
        row = bytearray()
        for x in range(size):
            inside = False
            if tri_left <= x <= tri_right:
                progress = (x - tri_left) / max(tri_right - tri_left, 1)
                if abs(y - cy) <= half * (1 - progress):
                    inside = True
            r, g, b = fg if inside else bg
            row += bytes((r, g, b))
        rows.append(row)

    raw = b"".join(b"\x00" + bytes(r) for r in rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    with open(path, "wb") as fh:
        fh.write(b"\x89PNG\r\n\x1a\n")
        fh.write(chunk(b"IHDR", ihdr))
        fh.write(chunk(b"IDAT", zlib.compress(raw, 9)))
        fh.write(chunk(b"IEND", b""))
    print(f"wrote {path} ({size}x{size})")


png("public/icon-192.png", 192)
png("public/icon-512.png", 512)
png("public/apple-touch-icon.png", 180)
