# /models — drop-in GLB slots

The world is built so that **every model is optional**. On first load `js/models.js`
asks for the thirteen files below. If a file is missing (or the network/CDN is
down) the loader silently swaps in the hand-built procedural version, logs a
`console.warn`, and keeps the loading bar moving. That is why the site runs
perfectly with this folder empty.

To upgrade the art, download a **CC0** pack, export/save one file per slot with
the exact filename in this table.

| File | What it is in the scene | Target height | Recommended CC0 source |
|---|---|---|---|
| `player.glb` | The player: hoodie + glasses, needs idle/walk/run/jump clips | 2.6 units | [Kenney — Claude Characters](https://kenney.nl/assets/blocky-characters) (has an animated rig) or [Quaternius — Ultimate Modular Characters](https://quaternius.com/packs/ultimatemodularcharacters.html) |
| `robot.glb` | The hint-giving NPC beside the spawn | 1.5 units | [Kenney — Toon Characters](https://kenney.nl/assets/toon-characters-1) / [Quaternius — Animated Robots](https://quaternius.com) |
| `house.glb` | **About** zone building | 6.2 units | [Kenney — City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban) or [Quaternius — Ultimate Buildings](https://quaternius.com/packs/ultimatebuildings.html) |
| `arcade.glb` | **Skills** zone building (an arcade cabinet) | 4.6 units | [Kenney — Mini Arcade](https://kenney.nl/assets/mini-arcade) |
| `library.glb` | **Projects** zone building | 5.0 units | [Kenney — Furniture Kit](https://kenney.nl/assets/furniture-kit) (bookshelf, scaled up) |
| `questboard.glb` | **Quest log** zone building | 4.4 units | [Quaternius — Medieval Village](https://quaternius.com) sign board |
| `mailbox.glb` | **Contact** zone building | 3.4 units | [Kenney — City Kit (Commercial)](https://kenney.nl/assets/city-kit-commercial) or [Poly Pizza](https://poly.pizza) search "mailbox" |
| `tree.glb` | Round street tree | 5.2 units | [Kenney — Nature Kit](https://kenney.nl/assets/nature-kit) |
| `pine.glb` | Conifer | 6.0 units | [Kenney — Nature Kit](https://kenney.nl/assets/nature-kit) |
| `lamp.glb` | Street lamp (lights up at night) | 3.2 units | [Kenney — City Kit (Commercial)](https://kenney.nl/assets/city-kit-commercial) |
| `bench.glb` | Park bench | 1.3 units | [Kenney — Furniture Kit](https://kenney.nl/assets/furniture-kit) |
| `crate.glb` | Crate prop | 1.0 units | [Kenney — Furniture Kit](https://kenney.nl/assets/furniture-kit) |
| `signpost.glb` | Generic signpost | 2.4 units | [Kenney — City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban) |

Everything above is CC0 (public domain) at the time of writing — always re-check
the licence on the download page, keep the pack's `License.txt` next to the
models, and never ship ripped game assets.

## Rules the loader applies to your file

1. **Normalisation** — the model is measured with a `Box3` and scaled so its
   height matches the `height` value in `js/models.js` → `MODELS`.
2. **Grounding** — the pivot is moved to the bottom-centre so the model stands on
   the terrain, not half-buried.
3. **Toon pass** — every material becomes a 4-step `MeshToonMaterial` with the
   shared ramp, keeping the original colour.
4. **Ink outline** — an inverted-hull outline is added (except for `lamp`).
5. **Shadows** — `castShadow` / `receiveShadow` are switched on.
6. **Animation** — if the file has clips, an `AnimationMixer` is created and the
   first clip plays; `createCharacter()` cross-fades idle/walk/run/jump by name.
7. **Cloning** — props are cloned with `SkeletonUtils.clone`, so a single file
   gives you dozens of copies at no extra load cost.

## Adding a 14th model

```js
// js/models.js → MODELS
stall: {
  id: 'stall', path: 'models/stall.glb', height: 2.2,
  position: null, rotation: 0, castShadow: true, receiveShadow: true,
  outline: true, animations: [], fallback: () => buildFallbackCrate(2),
},
```

Then anywhere in the world: `models.cloneModel('stall')`.

## Debug

Add `?debug=1` to any URL for the model list (GLB vs fallback), FPS, draw calls
and a wireframe-box toggle.
