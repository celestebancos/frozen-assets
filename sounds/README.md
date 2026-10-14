# Sounds

Recordings the game plays for the cash register and street sounds. `sounds.json` lists them by sound name:

```json
{
  "cash": ["cash-register.mp3"],
  "bird": ["bird-robin.mp3", { "file": "bird-sparrow.mp3", "gain": 0.6 }],
  "traffic": ["traffic-loop.mp3"]
}
```

`gain` makes one file quieter or louder. A sound with no files listed is made with Web Audio instead (see `js/ambience.js`).

Names: `cash`; one-shots `car`, `horn`, `laugh`, `squeal`, `voices`, `dog`, `bird`, `quack`, `splash`, `whistle`, `bat`, `cheer`, `animal`; loops `traffic`, `murmur`, `rain`.

Keep files short (one-shots under ~4 s, loops 20–60 s), mono, MP3 at about 96 kbps.

## Credits

Every file here, where it came from, and its license.

| File | Source | License |
| --- | --- | --- |
