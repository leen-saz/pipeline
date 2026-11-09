# The hero loop behind every page (public/assets/video/light-*.mp4), after Leen's references: a ribbon of blue light
# that waves and breathes on navy, with a fixed grain. Seamless over 8 s: every motion is a whole period.
# The site uses "plain"; "fluted" is the same light seen through ribbed glass (the other option offered). Render:
#   python3 scripts/render-hero.py plain 1280 720 | ffmpeg -f rawvideo -pix_fmt rgb24 -s 1280x720 -r 30 -i - \
#     -c:v libx264 -preset slow -crf 24 -g 15 -keyint_min 15 -pix_fmt yuv420p -an -movflags +faststart light-720.mp4
# (-g 15: a keyframe every half second, so scrubbing by scroll seeks smoothly, Safari included; the light is soft,
#  so 720p is plenty and keeps the file under 2 MB)
import sys, math, numpy as np
mode, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
only = int(sys.argv[4]) if len(sys.argv) > 4 else None
N = 240; TAU = 2 * math.pi
x = np.linspace(0, 1, W, dtype=np.float32)[None, :]; y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
ar = W / H
NAVY = np.array([4, 12, 32], np.float32); ROYAL = np.array([26, 74, 214], np.float32)
BABY = np.array([150, 212, 252], np.float32); CORE = np.array([228, 246, 255], np.float32)
rng = np.random.default_rng(3)
GRAIN = rng.normal(0, 1, (4, H, W)).astype(np.float32)   # 4 grain plates cycled: cheap, still lively

def ribbon(t, xs):
    # an arc rising from the lower left to the right edge, breathing slowly
    c = 1.04 - 0.46 / (1 + np.exp(-(xs - 0.58 - 0.03 * math.sin(TAU * t)) / 0.11))
    c = c + 0.035 * np.sin(TAU * (1.2 * xs + t)) + 0.015 * np.sin(TAU * (2.7 * xs - 2 * t))
    slope = np.gradient(c, axis=1) * W
    w = 0.05 + 0.03 * np.sin(TAU * (xs * 0.8 - t)) ** 2
    return c, w, np.sqrt(1 + (slope / ar) ** 2)

def light(t, xs):
    c, w, k = ribbon(t, xs)
    d = (y - c) / k
    core = np.exp(-(d / (w * 0.35)) ** 2)
    mid = np.exp(-(d / w) ** 2)
    halo = np.exp(-(d / (w * 4.5)) ** 2)
    # a second, fainter echo behind the first, like the depth in the references
    c2 = c + 0.12 + 0.02 * np.sin(TAU * (xs - t)); d2 = (y - c2) / k
    echo = np.exp(-(d2 / (w * 2.2)) ** 2) * 0.35
    glow_floor = np.exp(-((y - 1.05) / 0.25) ** 2) * (0.35 + 0.15 * np.sin(TAU * (xs * 0.7 + t)))
    img = NAVY + ROYAL * np.clip(halo * 0.75 + echo + glow_floor, 0, 1)[..., None] \
        + (BABY - ROYAL) * np.clip(mid * 0.9, 0, 1)[..., None] + (CORE - BABY) * np.clip(core, 0, 1)[..., None]
    # keep the top third calm and dark for the headline
    img = NAVY + (img - NAVY) * np.clip((y - 0.12) / 0.45, 0, 1)[..., None] ** 1.2
    return img

def fluted(t):
    ribs = 26; rw = 1 / ribs
    u = (x % rw) / rw - 0.5                     # -0.5..0.5 across each rib
    centre = (np.floor(x / rw) + 0.5) * rw
    xs = np.clip(centre - u * rw * 2.4, 0, 1)   # each rib shows a mirrored, magnified slice
    img = light(t, np.broadcast_to(xs, (1, W)))
    # vertical smear inside the glass
    k = max(1, H // 60); pad = np.pad(img, ((k, k), (0, 0), (0, 0)), mode='edge')
    c = np.cumsum(pad, axis=0); img = (c[2 * k:] - c[:-2 * k]) / (2 * k)
    img = np.concatenate([img, img[-1:].repeat(H - img.shape[0], 0)], 0) if img.shape[0] < H else img[:H]
    edge = np.abs(u) * 2
    img = img * (0.86 + 0.14 * (1 - edge ** 6))[..., None] + 18 * ((1 - edge) ** 30)[..., None] * (img.mean(-1, keepdims=True) / 80)
    return img

out = sys.stdout.buffer
for f in ([only] if only is not None else range(N)):
    t = f / N
    img = fluted(t) if mode == 'fluted' else light(t, x)
    img = img + GRAIN[0][..., None] * 2.6   # one fixed grain plate: the texture of the glass, and it compresses well
    out.write(np.clip(img, 0, 255).astype(np.uint8).tobytes())
