# Sounds

Recordings the game plays for the cash register and street sounds. `sounds.json` lists them by sound name:

```json
{
  "cash": ["cash-register.mp3"],
  "bird": ["bird-robin.mp3", { "file": "bird-sparrow.mp3", "gain": 0.6 }],
  "traffic": ["traffic-loop.mp3"]
}
```

`gain` makes one file quieter or louder. Every sound is a recording; a sound with no files listed is just silent.

Names: `cash` (the cash register), `bell` (the park cart's bell); street one-shots `car`, `horn`, `laugh`, `squeal`, `voices`, `dog`, `bird`, `quack`, `splash`, `whistle`, `bat`, `cheer`, `animal`; loops `traffic`, `murmur`, `park`, `rain`.

Keep files short (one-shots under ~4 s, loops 20–60 s), mono, MP3 at about 96 kbps.

How the files here were made (ffmpeg):

- One-shots: cut from the original, silence trimmed, short fades, and evened out so the louder half of each file sits at about −20 dBFS (peaks under −1 dBFS).
- Loops (`traffic`, `murmur`, `park`, `rain`): 30–36 s, with the last 3 s blended over the start so they loop without a seam, at about −24 dBFS. The rain is a quiet, steady stretch between thunderclaps (19:09–19:45 of the original), with no close-up drops, so it's a soft hiss with no pops.
- Far-away sounds (`voices`, `murmur`, `traffic`) are low-passed so you hear people and cars, not words.
- `bell.mp3` is one bicycle-bell ring played twice: ding ding.
- `bat-2` is the same hit as `bat-1`, made to sound farther away (muffled, with a little echo off the stands).
- The `gain` numbers in `sounds.json` balance the sounds against the music. They were set by playing everything through the game's own volume chain in an OfflineAudioContext and comparing it with The Entertainer on the truck speaker (the default music voice) at the same volume: street sounds sit about 7–12 dB under the music on average, with their peaks no louder than the music's; the ka-ching peaks a little over it, and the cart's bell is about level with it. When no music is playing (the park cart, or music turned off) the street sounds come up about 4 dB.

## Credits

Every file here, where it came from, who made it, and its license. Everything is CC0 or public domain, so no credit is required, but it's given anyway. Thanks, Joseph Sardin (BigSoundBank) and the Freesound and Wikimedia Commons recordists!

| File | Source | Author | License |
| --- | --- | --- | --- |
| cash.mp3 | [Cash Register Purchase](https://freesound.org/s/209578/) | Zott820 (Freesound) | CC0 |
| bell.mp3 | [Bicycle Bell #3](https://bigsoundbank.com/sound-s0974.html) | Joseph Sardin (BigSoundBank) | CC0 |
| car-1.mp3 | [Car passing 50km/h #3](https://bigsoundbank.com/sound-s2987.html) | Joseph Sardin (BigSoundBank) | CC0 |
| car-2.mp3 | [Car passing 50km/h #4](https://bigsoundbank.com/sound-s2988.html) | Joseph Sardin (BigSoundBank) | CC0 |
| car-3.mp3 | [Car Passing 50km/h #12](https://bigsoundbank.com/sound-s2996.html) | Joseph Sardin (BigSoundBank) | CC0 |
| horn-1.mp3 | [Recent Car Horn #7](https://bigsoundbank.com/sound-s0969.html) | Joseph Sardin (BigSoundBank) | CC0 |
| horn-2.mp3 | [Recent Car Horn #7](https://bigsoundbank.com/sound-s0969.html) | Joseph Sardin (BigSoundBank) | CC0 |
| horn-3.mp3 | [Recent Car Horn #2](https://bigsoundbank.com/sound-s0258.html) | Joseph Sardin (BigSoundBank) | CC0 |
| laugh-1.mp3 | [Laughter of Children](https://bigsoundbank.com/sound-s1660.html) | Joseph Sardin (BigSoundBank) | CC0 |
| laugh-2.mp3 | [Kids laughing](https://freesound.org/s/642516/) | kikorurelas (Freesound) | CC0 |
| laugh-3.mp3 | [Short clip of girl laughing.wav](https://commons.wikimedia.org/wiki/File:Short_clip_of_girl_laughing.wav) | lmbubec | CC0 |
| laugh-4.mp3 | [Kids laughing](https://freesound.org/s/642516/) | kikorurelas (Freesound) | CC0 |
| squeal-1.mp3 | [Kids Screaming #1](https://bigsoundbank.com/sound-s1148.html) | Joseph Sardin (BigSoundBank) | CC0 |
| squeal-2.mp3 | [Kids screaming #3](https://bigsoundbank.com/sound-s1150.html) | Joseph Sardin (BigSoundBank) | CC0 |
| squeal-3.mp3 | [Boy 2-3 years old, tickling #4](https://bigsoundbank.com/sound-s1421.html) | Joseph Sardin (BigSoundBank) | CC0 |
| squeal-4.mp3 | [Kids Screaming #1](https://bigsoundbank.com/sound-s1148.html) | Joseph Sardin (BigSoundBank) | CC0 |
| voices-1.mp3 | [Walla Group: Averages Discussions](https://bigsoundbank.com/sound-s0684.html) | Joseph Sardin (BigSoundBank) | CC0 |
| voices-2.mp3 | [Walla Group: Averages Discussions](https://bigsoundbank.com/sound-s0684.html) | Joseph Sardin (BigSoundBank) | CC0 |
| voices-3.mp3 | [Outside Talks #2](https://bigsoundbank.com/sound-s2969.html) | Joseph Sardin (BigSoundBank) | CC0 |
| dog-1.mp3 | [Old dog barking #1](https://bigsoundbank.com/sound-s2352.html) | Joseph Sardin (BigSoundBank) | CC0 |
| dog-2.mp3 | [Barking of a Spitz](https://bigsoundbank.com/sound-s0682.html) | Joseph Sardin (BigSoundBank) | CC0 |
| dog-3.mp3 | [Barking Dogs](https://bigsoundbank.com/sound-s0288.html) | Joseph Sardin (BigSoundBank) | CC0 |
| dog-4.mp3 | [Barking dog #3](https://bigsoundbank.com/sound-s2955.html) | Joseph Sardin (BigSoundBank) | CC0 |
| bird-1.mp3 | [Common Blackbird #30](https://bigsoundbank.com/sound-s3503.html) | Joseph Sardin (BigSoundBank) | CC0 |
| bird-2.mp3 | [Common Blackbird #23](https://bigsoundbank.com/sound-s3496.html) | Joseph Sardin (BigSoundBank) | CC0 |
| bird-3.mp3 | [Eurasian blackcap #1](https://bigsoundbank.com/sound-s3466.html) | Joseph Sardin (BigSoundBank) | CC0 |
| bird-4.mp3 | [Common Nightingale #2](https://bigsoundbank.com/sound-s3087.html) | Joseph Sardin (BigSoundBank) | CC0 |
| quack-1.mp3 | [Ducks](https://bigsoundbank.com/sound-s0276.html) | Joseph Sardin (BigSoundBank) | CC0 |
| quack-2.mp3 | [Ducks](https://bigsoundbank.com/sound-s0276.html) | Joseph Sardin (BigSoundBank) | CC0 |
| splash-1.mp3 | [Splash, Big #1](https://bigsoundbank.com/sound-s1519.html) | Joseph Sardin (BigSoundBank) | CC0 |
| splash-2.mp3 | [Splash, Small #1](https://bigsoundbank.com/sound-s1529.html) | Joseph Sardin (BigSoundBank) | CC0 |
| splash-3.mp3 | [Splash, Big #3](https://bigsoundbank.com/sound-s1521.html) | Joseph Sardin (BigSoundBank) | CC0 |
| whistle-1.mp3 | [Plastic Whistle #1](https://bigsoundbank.com/sound-s1017.html) | Joseph Sardin (BigSoundBank) | CC0 |
| whistle-2.mp3 | [Plastic Whistle #1](https://bigsoundbank.com/sound-s1017.html) | Joseph Sardin (BigSoundBank) | CC0 |
| bat-1.mp3 | [Bat_hit2](https://freesound.org/s/851452/) | hashtagsmcgee (Freesound) | CC0 |
| bat-2.mp3 | [Bat_hit2](https://freesound.org/s/851452/) | hashtagsmcgee (Freesound) | CC0 |
| cheer-1.mp3 | [Shouts and Applauses of Teens #1](https://bigsoundbank.com/sound-s0236.html) | Joseph Sardin (BigSoundBank) | CC0 |
| cheer-2.mp3 | [Shouts and Applauses of Teens #2](https://bigsoundbank.com/sound-s0237.html) | Joseph Sardin (BigSoundBank) | CC0 |
| cheer-3.mp3 | [Clapping hurray.ogg](https://commons.wikimedia.org/wiki/File:Clapping_hurray.ogg) | starlite | Public domain |
| animal-1.mp3 | [Elephant voice - trumpeting.ogg](https://commons.wikimedia.org/wiki/File:Elephant_voice_-_trumpeting.ogg) | தகவலுழவன் (Commons user) | CC0 |
| animal-2.mp3 | [Donkey, braying #2](https://bigsoundbank.com/sound-s1550.html) | Joseph Sardin (BigSoundBank) | CC0 |
| animal-3.mp3 | [Bleating Goat #1](https://bigsoundbank.com/sound-s0279.html) | Joseph Sardin (BigSoundBank) | CC0 |
| animal-4.mp3 | [Screaming Piha](https://bigsoundbank.com/sound-s1762.html) | Joseph Sardin (BigSoundBank) | CC0 |
| animal-5.mp3 | [siamang monkeys](https://freesound.org/s/819670/) | ikbenraar (Freesound) | CC0 |
| animal-6.mp3 | [siamang monkeys](https://freesound.org/s/819670/) | ikbenraar (Freesound) | CC0 |
| animal-7.mp3 | [Lion roaring](https://freesound.org/s/69572/) | Bidone (Freesound) | CC0 |
| traffic.mp3 | [Street and Roads](https://bigsoundbank.com/sound-s0608.html) | Joseph Sardin (BigSoundBank) | CC0 |
| murmur.mp3 | [Outside Talks #2](https://bigsoundbank.com/sound-s2969.html) | Joseph Sardin (BigSoundBank) | CC0 |
| park.mp3 | [Parisian park, children's games](https://bigsoundbank.com/sound-s1082.html) | Joseph Sardin (BigSoundBank) | CC0 |
| rain.mp3 | [Rain and Thunder #4](https://bigsoundbank.com/sound-s2719.html) | Joseph Sardin (BigSoundBank) | CC0 |
