# Emoji pictures

A few emojis are too new for older computers (Windows 10 and others show a blank box), so the game shows
these pictures instead. They are from [Twemoji](https://github.com/jdecked/twemoji) v15.1.0, © Twitter, Inc.
and other contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).

| File | Emoji | Used for |
|---|---|---|
| `1fae0.svg` | 🫠 melting face | treats melted on the counter |
| `1f979.svg` | 🥹 face holding back tears | a customer gets a new cone after dropping theirs |
| `1f6dd.svg` | 🛝 playground slide | playgrounds on the truck's map |

`js/emoji.js` lists them. `test/emoji.test.mjs` fails if an emoji newer than 2019 shows up anywhere else.
