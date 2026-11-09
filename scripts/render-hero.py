# The hero loop behind every page (public/assets/video/net-*.mp4): navy and baby blue, seamless over 8 s.
# The site uses "hex", a security network gliding toward the viewer with light running along it; "flow" and "wave"
# were the other concepts offered. Render and encode:
#   python3 scripts/render-hero.py hex 1920 1080 | ffmpeg -f rawvideo -pix_fmt rgb24 -s 1920x1080 -r 30 -i - \
#     -c:v libx264 -preset slow -crf 22 -g 15 -keyint_min 15 -pix_fmt yuv420p -an -movflags +faststart net-1080.mp4
# (-g 15: a keyframe every half second, so scrubbing by scroll seeks smoothly, Safari included)
#   python3 scripts/render-hero.py <flow|wave|hex> W H [frame]  -> raw rgb24 frames on stdout (one frame if given)
import sys, math, numpy as np
mode, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
only = int(sys.argv[4]) if len(sys.argv) > 4 else None
FPS, SEC = 30, 8; N = FPS * SEC; s = H / 1080
EDGE = np.array([5, 18, 38], np.float32); CORE = np.array([14, 40, 78], np.float32)
DOT = np.array([169, 216, 245], np.float32); GLOW = np.array([62, 149, 216], np.float32); PULSE = np.array([236, 248, 255], np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
d = np.sqrt(((xx - W * .5) / (W * .7)) ** 2 + ((yy - H * 1.0) / (H * .8)) ** 2)
BG = EDGE + (CORE - EDGE) * (np.clip(1 - d, 0, 1) ** 1.5)[..., None]

def splat(img, x, y, w):
    m = (x >= 0) & (x < W - 1) & (y >= 0) & (y < H - 1); x, y, w = x[m], y[m], w[m]
    x0, y0 = x.astype(int), y.astype(int); fx, fy = x - x0, y - y0
    for dx, dy, ww in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        np.add.at(img, (y0 + dy, x0 + dx), w * ww)
def _box(a, r, axis):
    pad = [(0, 0), (0, 0)]; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64); n = a.shape[axis]
    return ((np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(0, n), axis=axis)) / (2 * r + 1)).astype(np.float32)
def blur(a, sigma):
    r = max(1, int(round(math.sqrt(4 * sigma * sigma + 1) - 1) // 2))
    for _ in range(3): a = _box(_box(a, r, 0), r, 1)
    return a
TAU = 2 * math.pi
rng = np.random.default_rng(11)

# --- flow: fibre-optic "pipeline" strands sweeping across the lower half, light pulses running along them
if mode == 'flow':
    K = 46; xs = np.linspace(-0.05, 1.05, int(1400 * s) + 200)
    base = rng.uniform(0.58, 0.95, K); amp = rng.uniform(0.02, 0.07, K); f1 = rng.integers(1, 3, K); ph = rng.uniform(0, TAU, K)
    pul = [(k, rng.uniform(0, 1), rng.integers(1, 3)) for k in range(K) for _ in range(2)]
    def frame(t, L, P):
        for k in range(K):
            # converge toward the middle like strands entering one pipe
            pinch = 1 - 0.55 * np.exp(-((xs - 0.5) / 0.22) ** 2)
            y = 0.76 + (base[k] - 0.76) * pinch + amp[k] * np.sin(TAU * (f1[k] * xs - t) + ph[k]) * pinch
            splat(L, xs * W, y * H, np.full(xs.shape, 0.16, np.float32))
        for k, u, sp in pul:
            x0 = (u + sp * t) % 1.0 * 1.1 - 0.05; tr = np.linspace(0, 0.08, 24); xx_ = x0 - tr
            pinch = 1 - 0.55 * np.exp(-((xx_ - 0.5) / 0.22) ** 2)
            y = 0.76 + (base[k] - 0.76) * pinch + amp[k] * np.sin(TAU * (f1[k] * xx_ - t) + ph[k]) * pinch
            splat(P, xx_ * W, y * H, (1 - tr / 0.08) * 0.9)
# --- wave: an ocean of points in perspective, rolling toward the viewer
elif mode == 'wave':
    gx, gz = np.meshgrid(np.linspace(-1.6, 1.6, int(220 * s) + 60), np.linspace(0.15, 1, 90))
    gx, gz = gx.ravel().astype(np.float32), gz.ravel().astype(np.float32)
    def frame(t, L, P):
        h = 0.06 * np.sin(TAU * (3 * gz + t)) + 0.035 * np.sin(TAU * (2 * gx + 2 * gz - t)) + 0.02 * np.sin(TAU * (5 * gx - t * 2))
        z = 0.35 + gz * 2.6; px = W * 0.5 + gx / z * W * 0.55; py = H * 0.52 + (0.42 - h) / z * H * 0.9
        b = (1 - gz) ** 1.3 * (0.35 + 2.5 * np.clip(h, 0, None) + 0.15)
        splat(L, px, py, b * 0.55)
        crest = np.clip((h - 0.07) * 20, 0, 1); splat(P, px, py, crest * (1 - gz) * 0.7)
# --- hex: a tilted honeycomb network (security), pulses travelling along its edges
else:
    R = 0.055; cols, rows = 40, 22; pts = []
    for r in range(rows):
        for c in range(cols): pts.append(((c + 0.5 * (r % 2)) * R * math.sqrt(3) - cols * R * 0.87, r * R * 1.5))
    P0 = np.array(pts, np.float32)
    nb = [(i, j) for i in range(len(P0)) for j in range(i + 1, len(P0)) if abs(np.linalg.norm(P0[i] - P0[j]) - R * math.sqrt(3)) < 1e-3]
    nb = np.array(nb); seg = np.linspace(0, 1, 26, dtype=np.float32)
    E0, E1 = P0[nb[:, 0]], P0[nb[:, 1]]
    ex = (E0[:, None, 0] + (E1 - E0)[:, None, 0] * seg); ez = (E0[:, None, 1] + (E1 - E0)[:, None, 1] * seg)
    # Pulses live on lattice edges. The floor glides two rows per loop, so a pulse still alive when the loop wraps is
    # drawn on the edge two rows nearer: on screen that is the same place, and the loop has no jump.
    idx = {(int(i), int(j)): k for k, (i, j) in enumerate(nb)}
    def nearer(k):
        i, j = int(nb[k, 0]), int(nb[k, 1]); return idx.get((i - 2 * cols, j - 2 * cols), k)
    ok = [k for k in range(len(nb)) if nb[k, 0] >= 2 * cols and nearer(k) != k]
    pick = rng.choice(ok, 90, replace=False); pst = rng.uniform(0, 1, 90); LIFE = 0.42; rev = rng.integers(0, 2, 90)
    def proj(x, z, t):
        z = z - (R * 1.5 * 2) * t                 # glide toward the viewer by two rows per loop: seamless
        zz = 0.5 + z * 2.2; return W * 0.5 + x / zz * W * 0.62, H * 0.47 + 0.42 / zz * H * 0.95, zz
    def frame(t, L, P):
        px, py, zz = proj(ex.ravel(), ez.ravel(), t)
        fade = np.clip((zz - 0.25) * 3, 0, 1) * np.clip(1.6 - zz * 0.45, 0, 1)
        splat(L, px, py, 0.22 * fade / np.maximum(zz, 0.3))
        for k, p0, rv in zip(pick, pst, rev):
            age = (t - p0) % 1.0
            if age >= LIFE: continue
            e = int(k) if t >= p0 else nearer(int(k))
            u = age / LIFE; tr = np.clip(u * 1.3 - np.linspace(0, 0.3, 10), 0, 1)
            if rv: tr = 1 - tr
            x = E0[e, 0] + (E1[e, 0] - E0[e, 0]) * tr; z = E0[e, 1] + (E1[e, 1] - E0[e, 1]) * tr
            qx, qy, qz = proj(x, z, t)
            env = math.sin(math.pi * u) ** 0.6
            splat(P, qx, qy, np.linspace(1, 0.1, 10) * 0.95 * env * np.clip(1.6 - qz * 0.45, 0, 1))

out = sys.stdout.buffer
for f in ([only] if only is not None else range(N)):
    t = f / N; L = np.zeros((H, W), np.float32); P = np.zeros((H, W), np.float32)
    frame(t, L, P)
    img = BG + blur(L, 0.6 * s + 0.3)[..., None] * DOT * 1.3 + blur(L, 12 * s)[..., None] * GLOW * 5 \
             + blur(P, 1.0 * s + 0.2)[..., None] * PULSE * 2.4 + blur(P, 16 * s)[..., None] * GLOW * 12
    out.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
