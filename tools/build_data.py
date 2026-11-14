"""How Many Dudes Codex data build.

Reads ../_hmd_extract (local only, never shipped): data/entities.json (tools/build_entities.py there) and the sprite
PNGs. Writes data.js (window.HMD), assets/icons/<sprite>.webp (96 px, Lanczos downscale of the game art; only sprites
the app uses), precache-list.json; then stamps the cache-bust tokens (../tools/app/stamp_cache.py, rule A-cache-bust).

Every icon carries its provenance from entities.json (game sprite_names.json key, or "convention" for the family and
promoter icons named here). A missing sprite is an error; --strict turns warnings into a failed build too.

  python tools/build_data.py [--strict]
"""
import hashlib
import json
import os
import subprocess
import sys

from PIL import Image

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
X = os.path.join(os.path.dirname(APP), "_hmd_extract")
SPR = os.path.join(X, "assets", "sprites")
OUT_ICONS = os.path.join(APP, "assets", "icons")
STRICT = "--strict" in sys.argv
SIZE = 96

errors, warnings, used = [], [], {}


def icon(sprite, owner, provenance):
    """Sprite frame 0 -> assets/icons/<sprite>.webp?v=<hash>. Missing art is an error (no silent fallback)."""
    if not sprite:
        errors.append("%s: no sprite (%s)" % (owner, provenance))
        return None
    src = os.path.join(SPR, sprite + "_0.png")
    if not os.path.exists(src):
        errors.append("%s: sprite file missing %s" % (owner, src))
        return None
    if sprite not in used:
        dst = os.path.join(OUT_ICONS, sprite + ".webp")
        im = Image.open(src).convert("RGBA")
        bbox = im.getbbox()
        if bbox:
            im = im.crop(bbox)
        im.thumbnail((SIZE, SIZE), Image.LANCZOS)
        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
        canvas.save(dst, "WEBP", quality=88, method=6)
        h = hashlib.md5(open(dst, "rb").read()).hexdigest()[:8]
        used[sprite] = "assets/icons/%s.webp?v=%s" % (sprite, h)
    return used[sprite]


def main():
    os.makedirs(OUT_ICONS, exist_ok=True)
    E = json.load(open(os.path.join(X, "data", "entities.json"), encoding="utf-8"))

    fams = []
    for f in E["families"]:
        fams.append({"id": f["id"], "name": f["name"], "full": f["full_name"], "desc": f["desc"],
                     "icon": icon("sp_famicon_" + f["id"], "family " + f["id"], "convention")})
    pools = {"universal": {"name": "Universal", "icon": None},
             "promoter": {"name": "Promoter", "icon": icon("sp_ui_promoter_portrait", "pool promoter", "convention")}}

    kwclass = {}
    for x in E["dudes"] + E["relics"]:
        kwclass.update(x.get("keyword_class", {}))

    dudes = []
    for d in E["dudes"]:
        if not d["name"]:
            warnings.append("dude %s has no name" % d["type"])
        a = d["art"]
        dudes.append({"t": d["type"], "name": d["name"], "fam": d["families"],
                      "ab": d["ability"]["name"], "seg": d["segments"], "kw": d["keywords"],
                      "tok": d["tokens"], "role": d.get("role"),
                      "icon": icon(a["sprite"], "dude " + d["type"], a["provenance"])})

    relics = []
    for r in E["relics"]:
        a = r["art"]
        if not r["desc"]:
            warnings.append("relic %s has no description" % r["id"])
        relics.append({"id": r["id"], "name": r["name"], "seg": r["segments"], "kw": r["keywords"],
                       "tok": r["tokens"], "pool": r["pool"], "fam": r["family"], "dude": r["dude"],
                       "icon": icon(a["sprite"], "relic " + r["id"], a["provenance"])})

    refs = [{"a": e["a"], "b": e["b"], "basis": e["basis"]} for e in E["edges"] if e["kind"] == "reference"]
    kws = [{"id": k["id"], "cls": kwclass.get(k["id"], "term"), "n": k["count"]} for k in E["keywords"]]

    if errors or (STRICT and warnings):
        for m in errors + warnings:
            print(("ERROR " if m in errors else "WARN ") + m)
        print("build failed: %d errors, %d warnings (strict=%s); data.js left as it was" % (len(errors), len(warnings), STRICT))
        sys.exit(1)
    for w in warnings:
        print("WARN " + w)

    data = {"families": fams, "pools": pools, "dudes": dudes, "relics": relics, "refs": refs, "keywords": kws}
    with open(os.path.join(APP, "data.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write("window.HMD = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")

    # drop icons no longer used
    keep = {s + ".webp" for s in used}
    for fn in os.listdir(OUT_ICONS):
        if fn not in keep:
            os.remove(os.path.join(OUT_ICONS, fn))
    urls = sorted(used.values())
    with open(os.path.join(APP, "precache-list.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"v": hashlib.md5("".join(urls).encode()).hexdigest()[:8], "urls": urls}, f, indent=0)
    subprocess.run([sys.executable, os.path.join(os.path.dirname(APP), "tools", "app", "stamp_cache.py"), APP], check=True)
    print("built: %d dudes, %d relics, %d families, %d icons (%d KB)" % (
        len(dudes), len(relics), len(fams), len(used),
        sum(os.path.getsize(os.path.join(OUT_ICONS, s + ".webp")) for s in used) // 1024))


if __name__ == "__main__":
    main()
