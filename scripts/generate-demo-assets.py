from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1120, 630
BACKGROUND = "#07111f"
PANEL = "#0d1b2a"
TEXT = "#dbeafe"
MUTED = "#93a4b8"
GREEN = "#4ade80"
BLUE = "#60a5fa"
RED = "#fb7185"


def font(size: int, bold: bool = False):
    candidates = [
        Path("C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


TITLE = font(34, True)
BODY = font(24)
BODY_BOLD = font(24, True)
SMALL = font(19)


def frame(lines, footer="LOCAL • SYNTHETIC • ZERO MODEL CALLS"):
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((40, 38, WIDTH - 40, HEIGHT - 38), 22, fill=PANEL, outline="#23364d", width=2)
    draw.ellipse((72, 68, 88, 84), fill="#fb7185")
    draw.ellipse((98, 68, 114, 84), fill="#fbbf24")
    draw.ellipse((124, 68, 140, 84), fill="#4ade80")
    draw.text((72, 116), "HERMES AGENT SECURITY LAB", font=TITLE, fill=TEXT)
    draw.text((72, 162), "deny-by-default agent evaluation", font=SMALL, fill=MUTED)
    y = 225
    for value, color, bold in lines:
        draw.text((78, y), value, font=BODY_BOLD if bold else BODY, fill=color)
        y += 52
    draw.line((72, HEIGHT - 105, WIDTH - 72, HEIGHT - 105), fill="#23364d", width=2)
    draw.text((72, HEIGHT - 82), footer, font=SMALL, fill=MUTED)
    return image


frames = [
    frame([("$ npm run demo", BLUE, True), ("Starting isolated temporary workspace...", MUTED, False)]),
    frame([("[1/4] Initialize workspace", TEXT, False), ("defaultDeny: true", GREEN, True), ("network: disabled", MUTED, False)]),
    frame([("[2/4] Validate scenario schema", TEXT, False), ("tool-misuse.yaml  PASS", GREEN, True), ("fixture SHA-256 verified", MUTED, False)]),
    frame([("[3/4] Evaluate requested action", TEXT, False), ("shell.execute  →  DENY", RED, True), ("decision code: explicit-deny", MUTED, False)]),
    frame([("[4/4] Verify evidence", TEXT, False), ("2 passed / 0 failed", GREEN, True), ("model calls: 0  •  cost: US$0", MUTED, False)]),
    frame([("RESULT  PASS", GREEN, True), ("JSON + Markdown reports generated", TEXT, False), ("npm run demo", BLUE, True)]),
]

gif_path = ASSETS / "hermes-lab-demo.gif"
frames[0].save(gif_path, save_all=True, append_images=frames[1:], duration=[1400, 1600, 1800, 2200, 2200, 2600], loop=0, optimize=True)

social = frame([
    ("Test tool-using AI agents", TEXT, True),
    ("Declarative scenarios • deterministic evidence", BLUE, False),
    ("3 scenarios  •  42 tests  •  zero-API CI", GREEN, True),
], footer="v0.1.0 • TYPESCRIPT • OWASP AGENTIC SECURITY")
social.save(ASSETS / "hermes-lab-social-card.png", optimize=True)

print(f"GIF={gif_path} BYTES={gif_path.stat().st_size}")
print(f"SOCIAL={ASSETS / 'hermes-lab-social-card.png'} BYTES={(ASSETS / 'hermes-lab-social-card.png').stat().st_size}")
