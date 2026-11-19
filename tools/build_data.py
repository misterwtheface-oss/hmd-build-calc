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
GLOBAL = "global"

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


def app_icons():
    """Installability (PWA tier 2): the game's Spell Book relic sprite (sp_relic_spell_book, not the game's own
    launcher icon, user choice) on the crimson header field -> assets/app/*.png + manifest.webmanifest. Plain icons
    fill ~78% of the tile; the maskable one keeps the art inside the 80% safe circle. Non-AI resize only (Lanczos).
    A missing sprite is an error."""
    src = os.path.join(SPR, "sp_relic_spell_book_0.png")
    if not os.path.exists(src):
        errors.append("app icon: sprite file missing %s" % src)
        return
    art = Image.open(src).convert("RGBA")
    art = art.crop(art.getbbox())
    out = os.path.join(APP, "assets", "app")
    os.makedirs(out, exist_ok=True)
    ver = {}
    for fn, fill, px in (("icon-192.png", 0.78, 192), ("icon-512.png", 0.78, 512),
                         ("icon-512-maskable.png", 0.56, 512), ("apple-touch-icon.png", 0.72, 180)):
        p = os.path.join(out, fn)
        tile = Image.new("RGBA", (px, px), (0x4f, 0x0e, 0x21, 255))
        s = fill * px / max(art.size)
        a = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS)
        tile.alpha_composite(a, ((px - a.width) // 2, (px - a.height) // 2))
        tile.convert("RGB").save(p, "PNG", optimize=True)
        ver[fn] = "assets/app/%s?v=%s" % (fn, hashlib.md5(open(p, "rb").read()).hexdigest()[:8])
    man = {
        "name": "How Many Dudes? Codex", "short_name": "HMD Codex",
        "description": "Every Dude, Relic and Family of How Many Dudes?, with their synergies.",
        "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any",
        "background_color": "#171516", "theme_color": "#4f0e21",
        "icons": [
            {"src": ver["icon-192.png"], "sizes": "192x192", "type": "image/png"},
            {"src": ver["icon-512.png"], "sizes": "512x512", "type": "image/png"},
            {"src": ver["icon-512-maskable.png"], "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    with open(os.path.join(APP, "manifest.webmanifest"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(man, f, indent=2)
        f.write("\n")


def main():
    os.makedirs(OUT_ICONS, exist_ok=True)
    app_icons()
    E = json.load(open(os.path.join(X, "data", "entities.json"), encoding="utf-8"))

    fams = []
    for f in E["families"]:
        fams.append({"id": f["id"], "name": f["name"], "full": f["full_name"], "desc": f["desc"],
                     "icon": icon("sp_famicon_" + f["id"], "family " + f["id"], "convention")})
    # Global: the app's own grouping (user, 2026-11-14) for everything outside a game Family:
    # Dudes with no Family and universal / Promoter relics. Icon = the game's planet icon.
    fams.append({"id": GLOBAL, "name": "Global", "full": "Global", "desc": "",
                 "icon": icon("sp_icon_planet", "family global", "convention")})
    pools = {"universal": {"name": "Universal", "icon": None},
             "promoter": {"name": "Promoter", "icon": icon("sp_ui_promoter_portrait", "pool promoter", "convention")},
             "trinket": {"name": "Trinket", "icon": icon("sp_ui_icon_trinket", "pool trinket", "convention")},
             "food": {"name": "Food", "icon": icon(E.get("food_icon"), "pool food", "food.json")}}

    # synergy v2 (extract tools/effect_tags.py): facets per effect, unit edges, effect-level links
    syn = E["synergy"]
    fx = lambda x: [[f["facet"], f["ch"], f["scope"]] for f in x.get("facets", []) if not f.get("implicit")]
    # Role = the game's own (DudeType.roles, extract tools/game_roles.py); Function / Focus = our per-effect
    # category, derived from code (extract tools/code_tags.py, rule A-tags-from-code). Surfaced separately.
    GR = json.load(open(os.path.join(X, "data", "game_roles.json"), encoding="utf-8"))
    roles = {t: [GR["role_names"][r] for r in v["roles"]] for t, v in GR["dudes"].items()}
    CT = json.load(open(os.path.join(X, "data", "code_tags.json"), encoding="utf-8"))["effects"]
    fn = lambda k: [CT[k]["function"], CT[k]["focus"]] if CT.get(k, {}).get("function") else None

    dudes = []
    for d in E["dudes"]:
        if not d["name"]:
            warnings.append("dude %s has no name" % d["type"])
        a = d["art"]
        dudes.append({"t": d["type"], "name": d["name"], "fam": d["families"] or [GLOBAL],
                      "ab": d["ability"]["name"], "seg": d["segments"], "fx": fx(d),
                      "roles": roles.get(d["type"], []), "fn": fn("dude:" + d["type"]),
                      "icon": icon(a["sprite"], "dude " + d["type"], a["provenance"])})

    relics = []
    for r in E["relics"]:
        a = r["art"]
        if not r["desc"]:
            warnings.append("relic %s has no description" % r["id"])
        relics.append({"id": r["id"], "name": r["name"], "seg": r["segments"], "fx": fx(r), "fn": fn("relic:" + r["id"]),
                       "pool": r["pool"],
                       "fam": r["family"] or (GLOBAL if r["pool"] in ("universal", "promoter") else None), "dude": r["dude"],
                       "icon": icon(a["sprite"], "relic " + r["id"], a["provenance"])})

    # trinkets (Trinket Stash; extract tools/trinkets_map.py): bound to one Dude Type (the Wielder) for the run
    trinkets = []
    for t in E.get("trinkets", []):
        a = t["art"]
        if not t["desc"]:
            warnings.append("trinket %s has no description" % t["id"])
        trinkets.append({"id": t["id"], "name": t["name"], "pool": "trinket", "seg": t["segments"], "fx": fx(t),
                         "icon": icon(a["sprite"], "trinket " + t["id"], a["provenance"])})

    # food (Food Dude; extract tools/food_map.py): a meal = its main stat for one Dude Type, plus one extra stat
    # (foodstats: any stat at its secondary value, rolled with the offer)
    food = [{"id": m["id"], "name": m["name"], "pool": "food", "stat": m["main_stat"], "seg": m["segments"], "fx": fx(m),
             "icon": icon(m["art"]["sprite"], "food " + m["id"], m["art"]["provenance"])} for m in E.get("food", [])]
    foodstats = [{"id": s_["id"], "name": s_["name"], "pool": "foodstat", "seg": s_["segments"], "fx": fx(s_)}
                 for s_ in E.get("foodstats", [])]

    refs = [{"a": e["a"], "b": e["b"], "basis": e["basis"]} for e in E["edges"] if e["kind"] == "reference"]
    # unit = a Dude with his own relics, or one Family / universal / Promoter relic
    unit = {"dude:" + d["type"]: "dude:" + d["type"] for d in E["dudes"]}
    unit.update({"relic:" + r["id"]: ("dude:" + r["dude"] if r["pool"] == "dude" and r["dude"] else "relic:" + r["id"])
                 for r in E["relics"]})
    for kind, pool in (("trinket", "trinkets"), ("food", "food"), ("foodstat", "foodstats")):
        unit.update({kind + ":" + t["id"]: kind + ":" + t["id"] for t in E.get(pool, [])})
    rar = syn["rarity"]
    edges = sorted(([e["a"], e["b"], e["score"], sorted(e["channels"], key=lambda c: -rar.get(c, 0))]
                    for e in E["edges"] if e["kind"] == "synergy"), key=lambda e: -e[2])
    # channel pages: who provides it, who uses it (exactly the effects the edge rules joined)
    chans = {}
    part = {}
    for l in syn["links"]:
        c = chans.setdefault(l["ch"], {"id": l["ch"], "r": rar.get(l["ch"], 0), "stat": False, "prov": set(), "use": set()})
        c["prov"].add(l["from"])
        c["use"].add(l["to"])
        c["stat"] = c["stat"] or l["kind"] == "stat"
        if unit[l["from"]] != unit[l["to"]]:
            for me, other in ((l["from"], unit[l["to"]]), (l["to"], unit[l["from"]])):
                part.setdefault(me, {}).setdefault(other, set()).add(l["ch"])
    # a channel only counts as a synergy when it joins two or more units (Pact = Warlock + his own relics: dropped)
    chans = sorted(({**c, "prov": sorted(c["prov"]), "use": sorted(c["use"])} for c in chans.values()
                    if len({unit[k] for k in c["prov"] | c["use"]}) > 1), key=lambda c: c["id"])
    links_of = {k: sorted(([u, round(sum(rar.get(c, 0) for c in cs), 2), sorted(cs, key=lambda c: -rar.get(c, 0))]
                           for u, cs in v.items()), key=lambda x: -x[1])[:12] for k, v in part.items()}
    # effect-to-effect pairs across units, so the draft can say which ability / relic holds what:
    # [provider, consumer, channel, provider's channel, provider facet, consumer facet, wield] as indexes into keys /
    # names; wield = 1: a trinket link that holds only when the trinket is bound to that Dude
    kept = {c["id"] for c in chans}
    keys, names, fac = [], [], ["gives", "scales", "emits", "reacts", "boosts"]
    ki, ni = {}, {}

    def idx(m, l, v):
        if v not in m:
            m[v] = len(l)
            l.append(v)
        return m[v]
    pairs = sorted({(idx(ki, keys, l["from"]), idx(ki, keys, l["to"]), idx(ni, names, l["ch"]), idx(ni, names, l["via"]),
                     fac.index(l["pf"]), fac.index(l["cf"]), int(bool(l.get("wield"))))
                    for l in syn["links"] if l["ch"] in kept and unit[l["from"]] != unit[l["to"]]})

    if errors or (STRICT and warnings):
        for m in errors + warnings:
            print(("ERROR " if m in errors else "WARN ") + m)
        print("build failed: %d errors, %d warnings (strict=%s); data.js left as it was" % (len(errors), len(warnings), STRICT))
        sys.exit(1)
    for w in warnings:
        print("WARN " + w)

    # game fonts (Maiden Orange: Apache 2.0; PT Sans Narrow: SIL OFL 1.1), shipped with their licenses;
    # fonts.css carries the ?v= hashes (rule A-cache-bust) and is itself stamped in index.html
    fsrc, fdst = os.path.join(X, "assets", "fonts"), os.path.join(APP, "assets", "fonts")
    os.makedirs(fdst, exist_ok=True)
    faces = []
    for fam_name, fn in (("HMD Title", "maidenorange-regular.ttf"), ("HMD Narrow", "ptsansnarrow-bold.ttf")):
        src = os.path.join(fsrc, fn)
        if not os.path.exists(src):
            errors.append("font missing " + src)
            continue
        buf = open(src, "rb").read()
        open(os.path.join(fdst, fn), "wb").write(buf)
        faces.append('@font-face { font-family: "%s"; src: url("assets/fonts/%s?v=%s") format("truetype"); '
                     'font-display: swap; }' % (fam_name, fn, hashlib.md5(buf).hexdigest()[:8]))
    for lic in ("maidenorange-license.txt", "ptsansnarrow-license.txt"):
        src = os.path.join(fsrc, lic)
        if os.path.exists(src):
            open(os.path.join(fdst, lic), "wb").write(open(src, "rb").read())
        else:
            errors.append("font license missing " + src)
    if errors:
        print("\n".join("ERROR " + m for m in errors))
        sys.exit(1)
    with open(os.path.join(APP, "fonts.css"), "w", encoding="utf-8", newline="\n") as f:
        f.write("/* generated by tools/build_data.py: game fonts, licenses in assets/fonts */\n" + "\n".join(faces) + "\n")

    data = {"families": fams, "pools": pools, "dudes": dudes, "relics": relics, "trinkets": trinkets, "food": food, "foodstats": foodstats, "refs": refs, "syn": edges,
            "chans": chans, "links": links_of, "pairs": {"keys": keys, "names": names, "fac": fac, "p": [list(p) for p in pairs]}}
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
