"""把白底 Logo 转成透明底，并切出图标部分。

用法（在 web/ 目录下）：
    python -I scripts/transparent_logo.py <原图路径>

输出：
    src/assets/brand/logo.png       完整横版（图标 + 会映 + MeetReel），透明底，裁掉四周空白
    src/assets/brand/logo-mark.png  只有图标，侧栏收起时用、也是网页图标

做法：
- 文字部分用“白色转 alpha”：按离白色有多远算不透明度，再把白色从颜色里减掉，
  抗锯齿边缘和字里的空洞（“会”“e”“R”的内部）都会变透明。
- 图标部分只去掉和外面背景连通的白色，再在轮廓外沿留一圈过渡；
  图标内部的白色高光不动，换到深色底上玻璃质感也不会被“挖空”。
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "brand"
NEAR_WHITE = 0.10   # 离白色不到 10% 的算“背景色”
SOLID = 0.35        # 离白色超过 35% 的算实色
EDGE_PX = 9         # 图标外沿的过渡带宽度（像素，MaxFilter 的窗口）


def outside_mask(dist: np.ndarray) -> np.ndarray:
    """从图片四边出发，和外面连通的近白色区域"""
    h, w = dist.shape
    # copy()：fromarray 出来的图和数组共享只读内存，floodfill 的结果读不回来
    m = Image.fromarray(np.where(dist < NEAR_WHITE, 255, 0).astype(np.uint8), "L").copy()
    border = [(x, 0) for x in range(0, w, 8)] + [(x, h - 1) for x in range(0, w, 8)] + \
             [(0, y) for y in range(0, h, 8)] + [(w - 1, y) for y in range(0, h, 8)]
    for xy in border:
        if m.getpixel(xy) == 255:
            ImageDraw.floodfill(m, xy, 128)
    return np.asarray(m) == 128


def mark_split(dist: np.ndarray) -> int:
    """图标和文字之间那段全空的竖列；返回它的起点 x"""
    w = dist.shape[1]
    empty = (dist > NEAR_WHITE).sum(axis=0) == 0
    run = 0
    for x in range(int(w * 0.15), int(w * 0.7)):
        run = run + 1 if empty[x] else 0
        if run >= max(6, w // 80):
            return x - run + 1
    return int(w * 0.4)


def to_transparent(img: Image.Image) -> tuple[Image.Image, int]:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32) / 255.0
    dist = 1.0 - rgb.min(axis=2)
    alpha = np.clip(dist / SOLID, 0.0, 1.0)
    alpha = np.where(dist < 0.035, 0.0, alpha)

    split = mark_split(dist)
    outside = outside_mask(dist)
    band = np.asarray(Image.fromarray(outside.astype(np.uint8) * 255, "L").filter(ImageFilter.MaxFilter(EDGE_PX))) > 0
    in_mark = np.zeros_like(outside)
    in_mark[:, :split] = True
    # 图标内部（不挨着外面背景）一律不透明，保留白色高光
    alpha = np.where(in_mark & ~band, 1.0, alpha)

    safe = np.maximum(alpha, 1e-6)[..., None]
    color = np.clip((rgb - (1.0 - alpha[..., None])) / safe, 0.0, 1.0)
    out = np.dstack([color, alpha])
    return Image.fromarray((out * 255).round().astype(np.uint8), "RGBA"), split


def trim(img: Image.Image, pad: int = 6) -> tuple[Image.Image, int]:
    a = np.asarray(img)[..., 3]
    ys, xs = np.nonzero(a > 8)
    x0 = max(0, xs.min() - pad)
    box = (x0, max(0, ys.min() - pad), min(img.width, xs.max() + pad + 1), min(img.height, ys.max() + pad + 1))
    return img.crop(box), x0


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("用法：python -I scripts/transparent_logo.py <原图路径>")
    full, split = to_transparent(Image.open(sys.argv[1]))
    OUT.mkdir(parents=True, exist_ok=True)
    mark, _ = trim(full.crop((0, 0, split, full.height)))
    full, _ = trim(full)
    full.save(OUT / "logo.png", optimize=True)
    mark.save(OUT / "logo-mark.png", optimize=True)
    print(f"logo.png {full.size}  logo-mark.png {mark.size}  split x={split} -> {OUT}")


if __name__ == "__main__":
    main()
