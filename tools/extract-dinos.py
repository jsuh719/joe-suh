#!/usr/bin/env python3
"""
Turn a background-removed sheet of five dinosaurs into five clean PNGs.

    python3 tools/extract-dinos.py dinos.png

Expects: one image, five dinosaurs left to right in the order
trex, trike, stego, ptero, surf, background already keyed out.

Why this exists: background removers leave the key colour smeared through the
semi-transparent rim, and sometimes trapped in concave pockets (between the
stegosaurus's back plates, for one). Against a dark green page that shows up as
a bright pink halo. This strips it without chewing up the silhouette.

Needs: pillow, numpy, scipy
"""
import sys, os
from PIL import Image
import numpy as np
from scipy import ndimage

NAMES = ['trex', 'trike', 'stego', 'ptero', 'surf']

# Four of the five have no pink anywhere in their palette, so residue can be
# stripped hard. The surfer is purple, and purple legitimately leans magenta --
# its residue sits on the outline rather than in the body, so it gets a
# conservative threshold to avoid eating the dinosaur itself.
THRESH = {'trex': 12, 'trike': 12, 'stego': 12, 'ptero': 12, 'surf': 95}
PAD = 8

def main(src, outdir='dino'):
    os.makedirs(outdir, exist_ok=True)
    a = np.array(Image.open(src).convert('RGBA')).astype(float)
    rgb, al = a[..., :3].copy(), a[..., 3].copy()
    R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    score = np.minimum(R, B) - G          # magenta lean

    # 1. mild global pass so residue can't bridge two creatures
    al *= 1 - np.clip((score - 90) / 80.0, 0, 1)

    # 2. find the five, left to right
    lab, n = ndimage.label(al > 40, np.ones((3, 3)))
    sizes = ndimage.sum(al > 40, lab, range(1, n + 1))
    keep = sorted([i + 1 for i in np.argsort(sizes)[::-1][:5]],
                  key=lambda k: np.where(lab == k)[1].min())

    # 3. per-creature magenta removal
    tmap = np.full(al.shape, 1e6)
    for nm, k in zip(NAMES, keep):
        tmap[ndimage.binary_dilation(lab == k, np.ones((9, 9)))] = THRESH[nm]
    al *= 1 - np.clip((score - tmap) / 40.0, 0, 1)

    # 4. flood body colour outward so no soft pixel keeps the key colour
    known = al >= 250
    out, mask = rgb.copy(), known.copy()
    offs = [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)]
    for _ in range(10):
        acc = np.zeros_like(out); cnt = np.zeros(al.shape)
        src_ = np.where(mask[..., None], out, 0.0)
        for dy, dx in offs:
            acc += np.roll(src_, (dy, dx), axis=(0, 1))
            cnt += np.roll(mask.astype(float), (dy, dx), axis=(0, 1))
        fill = (~mask) & (cnt > 0)
        out[fill] = acc[fill] / cnt[fill][..., None]
        mask |= fill

    # 5. tighten the matte, cut each one out, pad to a common square
    al = np.clip((al - 22) * (255.0 / (238 - 22)), 0, 255)
    lab2, _ = ndimage.label(al > 28, np.ones((3, 3)))
    sizes2 = ndimage.sum(al > 28, lab2, range(1, lab2.max() + 1))
    keep2 = sorted([i + 1 for i in np.argsort(sizes2)[::-1][:5]],
                   key=lambda k: np.where(lab2 == k)[1].min())

    crops = {}
    for nm, k in zip(NAMES, keep2):
        own = lab2 == k
        keepmask = ndimage.binary_dilation(own, np.ones((7, 7))) & \
                   ~ndimage.binary_dilation((lab2 > 0) & ~own, np.ones((3, 3)))
        ys, xs = np.where(own)
        x0, y0 = max(0, xs.min() - PAD), max(0, ys.min() - PAD)
        x1 = min(al.shape[1], xs.max() + 1 + PAD)
        y1 = min(al.shape[0], ys.max() + 1 + PAD)
        px = np.dstack([out, al * keepmask]).clip(0, 255).astype(np.uint8)
        crops[nm] = Image.fromarray(px[y0:y1, x0:x1])

    # One square canvas for all five keeps them the same relative scale, which
    # is what the page's sizing rules assume.
    S = max(max(im.size) for im in crops.values()) + 16
    for nm, im in crops.items():
        c = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        c.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
        c.save(f'{outdir}/{nm}.png')
        q = np.array(c).astype(int)
        s2 = np.minimum(q[..., 0], q[..., 2]) - q[..., 1]
        bad = ((q[..., 3] > 40) & (s2 > THRESH[nm] + 25)).sum()
        print(f'  {outdir}/{nm}.png  {S}x{S}  residual pink: {bad}')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'dinos.png')
