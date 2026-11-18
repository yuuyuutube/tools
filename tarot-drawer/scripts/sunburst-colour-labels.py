# Build colour-region label maps for Sunburst cards from the user's line art
# and the original colour reference (docs/tarot-sunburst/color-spec-with-effect-demo).
#
# Same idea as the hand-authored masks of batches 01–02: every enclosed region
# of the supplied line drawing gets one swatch (Y/O/B densities + optional
# dark N tint). Instead of drawing a polygon per region, the swatch is read
# from the colour reference and snapped to the shared swatch library below.
# Big open regions (sky / ground connected through the margin) are split per
# pixel along the reference, then smoothed.
#
#   python scripts/sunburst-colour-labels.py 7 8 9      # selected cards
#   python scripts/sunburst-colour-labels.py all        # 7–21
#
# Output per card:
#   docs/tarot-sunburst/batch-XX/N-labels.png   (R channel = swatch index)
# and src/print/sunburst/colour-swatches.js (generated, shared index table).
# Needs numpy + Pillow only.
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DOCS = os.path.join(ROOT, 'docs', 'tarot-sunburst')
W, H = 1024, 1536
DS = 1024 / 819  # design (819 × 1229) → master pixels
BATCH_OF = {n: '%02d' % ((n - 1) // 3 + 1) for n in range(1, 22)}

# Same densities as batch-01/02 masks; extra entries extend the library for
# colours those cards did not need (grey stone, black sphinx, purple…).
SWATCHES = [
    ('white', [.035, 0, .015], 0),
    ('cream', [.065, .02, 0], 0),
    ('skin', [.19, .065, 0], 0),
    ('gold', [.88, .09, 0], 0),
    ('ochre-sky', [.68, .025, 0], 0),
    ('pale-gold', [.4, .02, 0], 0),
    ('green', [.5, 0, .46], 0),
    ('meadow', [.45, 0, .3], 0),
    ('sage', [.3, .03, .3], 0),
    ('red', [.2, .88, 0], 0),
    ('orange', [.62, .55, 0], 0),
    ('wood', [.48, .28, .15], 0),
    ('hair', [.52, .29, .12], 0),
    ('dark-brown', [.45, .35, .4], .15),
    ('blue', [.07, .01, .43], 0),
    ('deep-blue', [.06, .015, .58], 0),
    ('navy', [.06, .025, .72], .68),
    ('black', [.08, .04, .6], .9),
    ('pale-sky', [.08, 0, .2], 0),
    ('water', [.025, 0, .38], 0),
    ('stone', [.18, .055, .14], 0),
    ('grey', [.1, .04, .22], .12),
    ('sand', [.32, .1, .06], 0),
    ('purple', [.06, .34, .42], 0),
    ('pink', [.1, .3, 0], 0),
    ('slate', [.12, .05, .4], .3),
    ('charcoal', [.08, .04, .55], .45),
]
NAMES = [s[0] for s in SWATCHES]
PAPER = np.array([246, 239, 224], float)
INK = {'Y': [232, 183, 77], 'O': [222, 83, 43], 'B': [62, 112, 150], 'N': [30, 40, 74]}


def render(ink, dark):
    c = PAPER.copy()
    for d, k in zip(ink, 'YOB'):
        c = c * (1 - d + d * np.array(INK[k]) / 255)
    if dark:
        c = c * (1 - dark + dark * np.array(INK['N']) / 255)
    return c


SW_RGB = np.array([render(i, d) for _, i, d in SWATCHES])


def to_lab(rgb):
    c = rgb / 255.0
    c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])
    xyz = c @ m.T / np.array([.9505, 1, 1.089])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


SW_LAB = to_lab(SW_RGB)
# Per-card overrides: design-coordinate point → swatch (applied to the enclosed
# region under the point), plus swatches a card must not use.
OVERRIDES = {}
OVERRIDES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sunburst-colour-overrides.json')
if os.path.exists(OVERRIDES_PATH):
    OVERRIDES = {int(k): v for k, v in json.load(open(OVERRIDES_PATH, encoding='utf-8')).items()}


def shift_min(a, r):
    out = a.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            out &= np.roll(np.roll(a, dy, 0), dx, 1)
    return out


def label_components(free):
    """4-connected components via run-length union-find."""
    h, w = free.shape
    parent = []

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    runs_prev = []
    run_label = np.zeros((h, w), np.int32) - 1
    for y in range(h):
        row = free[y].astype(np.int8)
        d = np.diff(np.concatenate([[0], row, [0]]))
        starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
        runs = []
        j = 0
        for s, e in zip(starts, ends):
            lab = len(parent)
            parent.append(lab)
            while j < len(runs_prev) and runs_prev[j][1] <= s:
                j += 1
            k = j
            while k < len(runs_prev) and runs_prev[k][0] < e:
                a, b = find(lab), find(runs_prev[k][2])
                if a != b:
                    parent[max(a, b)] = min(a, b)
                k += 1
            runs.append((s, e, lab))
            run_label[y, s:e] = lab
        runs_prev = runs
    roots = np.array([find(i) for i in range(len(parent))], np.int32)
    _, compact = np.unique(roots, return_inverse=True)
    out = np.full((h, w), -1, np.int32)
    m = run_label >= 0
    out[m] = compact[run_label[m]]
    return out, compact.max() + 1


def box_blur(a, r):
    if r <= 0:
        return a
    k = 2 * r + 1
    p = np.pad(a, ((r + 1, r), (r + 1, r)) + ((0, 0),) * (a.ndim - 2), mode='edge')
    c = p.cumsum(0).cumsum(1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def align(ink_mask, ref_dark):
    """Search translation/scale so the reference's drawn lines fit the line art."""
    best = (-1, 0, 0, 1.0)
    a = box_blur(ink_mask.astype(float), 3)
    a = a[200:1350, 120:900] - a[200:1350, 120:900].mean()
    for s in [.99, 1.0, 1.01]:
        img = ref_dark.resize((round(W * s), round(H * s)), Image.BILINEAR)
        r = np.asarray(img, float) / 255
        cx, cy = (r.shape[1] - W) // 2, (r.shape[0] - H) // 2
        for dy in range(-12, 13, 3):
            for dx in range(-12, 13, 3):
                y0, x0 = 200 + cy + dy, 120 + cx + dx
                if y0 < 0 or x0 < 0:
                    continue
                b = r[y0:y0 + 1150, x0:x0 + 780]
                if b.shape != a.shape:
                    continue
                b = box_blur(b, 3)
                v = (a * (b - b.mean())).sum()
                if v > best[0]:
                    best = (v, dx, dy, s)
    _, dx0, dy0, s = best
    # refine at 1px
    img = ref_dark.resize((round(W * s), round(H * s)), Image.BILINEAR)
    r = np.asarray(img, float) / 255
    cx, cy = (r.shape[1] - W) // 2, (r.shape[0] - H) // 2
    for dy in range(dy0 - 2, dy0 + 3):
        for dx in range(dx0 - 2, dx0 + 3):
            b = box_blur(r[200 + cy + dy:1350 + cy + dy, 120 + cx + dx:900 + cx + dx], 3)
            if b.shape != a.shape:
                continue
            v = (a * (b - b.mean())).sum()
            if v > best[0]:
                best = (v, dx, dy, s)
    return best[1:]


def build(n):
    line = Image.open(os.path.join(DOCS, 'line', f'{n}.png')).convert('L').resize((W, H), Image.LANCZOS)
    lum = np.asarray(line, float) / 255
    ink = 1 - lum
    ref_im = Image.open(os.path.join(DOCS, 'color-spec-with-effect-demo', f'{n}.png')).convert('RGB')
    ref_dark = ref_im.convert('L').point(lambda v: 255 if v < 95 else 0).resize((W, H), Image.BILINEAR)
    dx, dy, s = align(ink > .5, ref_dark)
    big = ref_im.resize((round(W * s), round(H * s)), Image.LANCZOS)
    cx, cy = (big.width - W) // 2 + dx, (big.height - H) // 2 + dy
    pad = Image.new('RGB', (big.width + 200, big.height + 200), (246, 239, 224))
    pad.paste(big, (100, 100))
    ref = pad.crop((cx + 100, cy + 100, cx + 100 + W, cy + 100 + H))
    ref_rgb = np.asarray(ref, float)
    # The reference is a halftone print; average the dots away, and keep the
    # reference's own linework from voting by ignoring very dark, thin pixels.
    soft = box_blur(ref_rgb, 4)
    lab = to_lab(soft)
    excluded = [NAMES.index(x) for x in OVERRIDES.get(n, {}).get('exclude', [])]
    best_d = np.full((H, W), np.inf, np.float32)
    cls = np.zeros((H, W), np.int32)
    for i, sw in enumerate(SW_LAB):
        if i in excluded:
            continue
        d = ((lab - sw) ** 2).sum(-1).astype(np.float32)
        better = d < best_d
        best_d[better] = d[better]
        cls[better] = i
    ref_line = np.asarray(ref.convert('L'), float) < 80
    ref_line_near = box_blur(ref_line.astype(float), 2) > .35

    # Reference picture window (819-unit coords: border at x 63–756, y ≈135–995,
    # rounded top corners), inset past its border line.
    yy, xx = np.mgrid[0:H, 0:W] / DS

    def rounded(x0, x1, y0, y1, r):
        m = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
        for cx in (x0 + r, x1 - r):
            side = (xx < cx) if cx == x0 + r else (xx > cx)
            m &= ~((yy < y0 + r) & side & ((xx - cx) ** 2 + (yy - (y0 + r)) ** 2 > r * r))
        return m
    # valid: enclosed shapes may vote here. core: open background is read only
    # here, well clear of the reference's rounded border, so its frame line
    # never becomes background colour.
    valid = rounded(76, 743, 150, 984, 70)
    core = rounded(82, 737, 168, 968, 110)
    free = ink <= .22
    # Close hairline gaps for region finding only.
    closed = shift_min(free, 1)
    comp, count = label_components(closed)
    interior = shift_min(closed, 3)
    labels = np.full((H, W), -1, np.int32)
    k = len(SWATCHES)
    flat_comp = comp.ravel()
    flat_cls = cls.ravel()
    use = (interior & ~ref_line_near & valid).ravel()
    sizes = np.bincount(flat_comp[flat_comp >= 0], minlength=count)
    votes = np.zeros((count, k), np.int64)
    sel = (flat_comp >= 0) & use
    np.add.at(votes, (flat_comp[sel], flat_cls[sel]), 1)
    sel2 = flat_comp >= 0
    votes_all = np.zeros((count, k), np.int64)
    np.add.at(votes_all, (flat_comp[sel2], flat_cls[sel2]), 1)
    votes = np.where(votes.sum(1, keepdims=True) > 8, votes, votes_all)
    top = votes.argmax(1)
    share = votes.max(1) / np.maximum(1, votes.sum(1))
    touches = np.zeros(count, bool)
    for edge in (comp[0], comp[-1], comp[:, 0], comp[:, -1]):
        touches[np.unique(edge[edge >= 0])] = True
    # Enclosed shapes stay one flat colour like the batch-01/02 masks; only
    # open areas (sky / ground through the margin) follow the reference per pixel.
    perpixel = touches | ((sizes > 60000) & (share < .45))
    pp = (comp >= 0) & perpixel[np.maximum(comp, 0)]
    # Background is read only from open-area pixels, so enclosed shapes
    # (a canopy, a figure) never bleed into the sky around them.
    core = core & pp
    # Smoothed per-pixel classes for open regions, read only inside the
    # reference's own picture window, then extended outward to the site window.
    best_v = np.full((H, W), -1.0)
    sm = np.full((H, W), -1, np.int32)
    for i in np.unique(cls[core]):
        v = box_blur(((cls == i) & core).astype(float), 12)
        better = (v > best_v) & (v > 0)
        best_v[better] = v[better]
        sm[better] = i
    # Broad classes for the extension so it reads as calm bands, not streaks.
    best_c = np.full((H // 4, W // 4), -1.0)
    q = np.full((H // 4, W // 4), -1, np.int32)
    small_cls, small_valid = cls[::4, ::4], core[::4, ::4]
    for i in np.unique(cls[core]):
        v = box_blur(((small_cls == i) & small_valid).astype(float), 10)
        better = (v > best_c) & (v > 0) & small_valid
        best_c[better] = v[better]
        q[better] = i
    for _ in range(80):
        miss = q < 0
        if not miss.any():
            break
        for sh in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb = np.roll(q, sh, (0, 1))
            fill = miss & (nb >= 0)
            q[fill] = nb[fill]
            miss = q < 0
    q[q < 0] = 0
    # Calm the extension: a wide mode filter removes thin streaks (a cloud
    # edge, a lantern glow) and keeps only broad bands such as sky / water.
    inner = small_valid
    best_m = np.full(q.shape, -1.0)
    qm = q.copy()
    for i in np.unique(q):
        v = box_blur((q == i).astype(float), 12)
        better = v > best_m
        best_m[better] = v[better]
        qm[better] = i
    q = np.where(inner, q, qm)
    up = np.repeat(np.repeat(q, 4, 0), 4, 1)[:H, :W]
    sm = np.where(core, np.maximum(sm, 0), up)
    # Below the reference picture the ground continues as one calm colour.
    band = core & (yy > 900) & ((xx < 230) | (xx > 590))
    if band.any():
        ground = np.bincount(cls[band], minlength=len(SWATCHES)).argmax()
        if 'ground' in OVERRIDES.get(n, {}):
            ground = NAMES.index(OVERRIDES[n]['ground'])
        sm = np.where(~core & (yy > 960), ground, sm)
    # Above / around the top corners the sky continues as one colour.
    sky_band = core & (yy < 330)
    if sky_band.any():
        sky_cls = np.where(cls == NAMES.index('gold'), NAMES.index('ochre-sky'), cls)
        sky_cls = np.where(sky_cls == NAMES.index('slate'), NAMES.index('blue'), sky_cls)
        sky = np.bincount(sky_cls[sky_band], minlength=len(SWATCHES)).argmax()
        if 'sky' in OVERRIDES.get(n, {}):
            sky = NAMES.index(OVERRIDES[n]['sky'])
        sm = np.where(~core & (yy < 330), sky, sm)
        # Optional horizon: the open background above it is one flat sky.
        if 'horizon' in OVERRIDES.get(n, {}):
            sm = np.where(yy < OVERRIDES[n]['horizon'], sky, sm)
    mapped = np.where(comp >= 0, top[np.maximum(comp, 0)], -1)
    # Open sky reads as the batch-01/02 ochre sky, not the solid gold of props.
    sm = np.where(sm == NAMES.index('gold'), NAMES.index('ochre-sky'), sm)
    # Halftone averaging muddies open blue skies; print them as clean blue.
    sm = np.where(sm == NAMES.index('slate'), NAMES.index('blue'), sm)
    sm = np.where(sm == NAMES.index('black'), NAMES.index('navy'), sm)
    labels = np.where(pp, sm, mapped)
    # Overrides: points (design coords) pin a whole region; rects force pixels.
    ov = OVERRIDES.get(n, {})
    # A shape that holds two colours in the reference (a lion's mane and
    # body drawn as one outline) follows the reference inside its outline.
    for x, y in ov.get('follow', []):
        c = comp[round(y * DS), round(x * DS)]
        if c < 0:
            continue
        M = comp == c
        ys, xs = np.nonzero(M)
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        sub_m, sub_c = M[y0:y1, x0:x1], cls[y0:y1, x0:x1]
        best, pick = np.full(sub_m.shape, -1.0), np.zeros(sub_m.shape, np.int32)
        for i in np.unique(sub_c[sub_m]):
            v = box_blur(((sub_c == i) & sub_m).astype(float), 8)
            better = v > best
            best[better], pick[better] = v[better], i
        region = labels[y0:y1, x0:x1]
        region[sub_m] = pick[sub_m]
    for rect in ov.get('rects', []):
        x, y, w, h, name = rect[:5]
        only = rect[5] if len(rect) > 5 else None
        X0, Y0, X1, Y1 = round(x * DS), round(y * DS), round((x + w) * DS), round((y + h) * DS)
        sub = labels[Y0:Y1, X0:X1]
        if only:
            sub[np.isin(sub, [NAMES.index(o) for o in only])] = NAMES.index(name)
        else:
            sub[comp[Y0:Y1, X0:X1] >= 0] = NAMES.index(name)
    for x, y, w, h, name in ov.get('regions', []):
        # every region whose centre lies in the rect
        X0, Y0, X1, Y1 = round(x * DS), round(y * DS), round((x + w) * DS), round((y + h) * DS)
        ids = np.unique(comp[Y0:Y1, X0:X1])
        for c in ids:
            if c < 0 or touches[c]:
                continue
            ys, xs = np.nonzero(comp == c) if sizes[c] < 40000 else (None, None)
            if ys is None:
                continue
            if X0 <= xs.mean() < X1 and Y0 <= ys.mean() < Y1:
                labels[comp == c] = NAMES.index(name)
    # Polygons (design coords) recolour the given classes inside an outline
    # traced along the ink, e.g. a hill band whose top edge is a drawn line.
    for pts, name, only in ov.get('polys', []):
        im = Image.new('L', (W, H), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(im).polygon([(x * DS, y * DS) for x, y in pts], fill=255)
        M = (np.asarray(im) > 0) & np.isin(labels, [NAMES.index(o) for o in only])
        labels[M] = NAMES.index(name)
    for x, y, name in ov.get('points', []):
        X, Y = round(x * DS), round(y * DS)
        c = comp[Y, X]
        if c < 0:
            print(f'  override at {x},{y} lands on a line; skipped')
            continue
        labels[comp == c] = NAMES.index(name)
    # Lines and closed gaps take the nearest region label.
    for _ in range(12):
        miss = labels < 0
        if not miss.any():
            break
        for sh in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nb = np.roll(labels, sh, (0, 1))
            fill = miss & (nb >= 0)
            labels[fill] = nb[fill]
            miss = labels < 0
    labels[labels < 0] = 0
    out_dir = os.path.join(DOCS, f'batch-{BATCH_OF[n]}')
    Image.fromarray(labels.astype(np.uint8), 'L').save(os.path.join(out_dir, f'{n}-labels.png'), optimize=True)
    # Quick flat preview: swatch colour × line ink.
    col = SW_RGB[labels] * (1 - ink[..., None]) + np.array([30, 40, 74]) * ink[..., None]
    prev_dir = os.environ.get('PREVIEW_DIR')
    if prev_dir:
        side = np.concatenate([col, np.asarray(ref, float)], 1)
        Image.fromarray(side.clip(0, 255).astype(np.uint8)).resize((1024, 768)).save(os.path.join(prev_dir, f'{n}-flat.png'))
    used = {NAMES[i]: int(c) for i, c in enumerate(np.bincount(labels.ravel(), minlength=k)) if c}
    print(f'card {n}: align dx={dx} dy={dy} s={s}; regions={count}; swatches={used}')


def write_js():
    path = os.path.join(ROOT, 'src', 'print', 'sunburst', 'colour-swatches.js')
    rows = ',\n'.join(
        f" {{id:'{name}',ink:{json.dumps(ink)}{',dark:' + str(dark) if dark else ''}}}" for name, ink, dark in SWATCHES)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('// Generated by scripts/sunburst-colour-labels.py — swatch index = value in N-labels.png.\n'
                '// Densities match the batch-01/02 masks (WHITE, SKIN, GOLD, GREEN, RED, WOOD, BLUE…).\n'
                f'export const SWATCHES=[\n{rows}\n];\n')


if __name__ == '__main__':
    args = sys.argv[1:]
    cards = range(7, 22) if args in ([], ['all']) else [int(a) for a in args]
    write_js()
    for n in cards:
        build(n)
