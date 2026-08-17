# YM2612Synth Memo

Last updated: 2026-08-17

## Goal

- Provide a browser-friendly YM2612 synth interface on top of `web/ym2612.js`.
- Make the code readable enough that "what this does to the chip" can be understood quickly just by reading the API usage.
- Support both:
  - learning / experimentation
  - simple game or browser integration

## Planned file

- `web/ym2612synth.js`

Recommended export:

```js
export class YM2612Synth
```

## Transport-first direction

The synth should not depend too strongly on a direct YM2612 instance.

The intended long-term structure is:

```txt
UI / Game
   ↓
YM2612Synth
   ↓
register write command
   ↓
Transport
   ├─ Direct
   └─ AudioWorklet
          ↓
       YM2612
```

This means:

- the public synth API should stay stable
- the transport layer can later be swapped
- `AudioWorklet` support should not require redesigning the synth API

## Constructor direction

Current recommendation:

- prefer a transport-oriented constructor over passing a raw chip directly

For example:

```js
new YM2612Synth({ transport })
```

instead of making the synth strongly tied to a single direct YM2612 object.

This keeps future `Direct` and `AudioWorklet` transports aligned.

## Register write exit must stay centralized

YM2612 register writes should not be scattered across many public methods.

There should be one internal exit, such as:

```js
_write(port, register, value)
```

or an equivalent transport wrapper.

The main reason:

- future AudioWorklet transport
- future recorder insertion
- future command scheduling

## Preferred command shape

Even if current writes are immediate, it is useful to think in command objects.

For example:

```js
{
  port,
  register,
  value,
}
```

Later, this can naturally grow into:

```js
{
  port,
  register,
  value,
  targetSample,
}
```

Current decision:

- no scheduling API is required yet
- but the structure should not block sample-timed commands later

## Why this layer is useful

Without a synth layer, code tends to look like raw register writes:

```js
chip.writeRegister(0x4c, 0x12);
chip.writeRegister(0x5c, 0x1f);
chip.writeRegister(0x8c, 0x24);
```

That is hard to read for beginners.

With a synth layer, the same intent can look like:

```js
synth.setOperator(0, 4, {
  tl: 0x12,
  ar: 0x1f,
  sl: 0x2,
  rr: 0x4,
});
```

This makes the code act as:

- a playing API
- a learning API
- a register-intent translation layer

## Planned instrument levels

Three main instrument modes are planned:

1. 1-operator-only instrument across 6 channels
2. 2-operator-only instrument across 6 channels
3. full operator access instrument across 6 channels

Each mode should have presets.

Idea:

- provide a few presets
- provide direct edit access
- then let the user explore freely

## Current API direction

Rough idea:

```js
class YM2612Synth {
  reset()

  startRecord()
  stopRecord()

  setPreset(channel, preset)
  setOperator(channel, operator, params)
  setAlgo(channel, algorithm, feedback = 0)
  setPan(channel, left, right)

  noteOn(channel, block, fnum)
  noteOff(channel)
}
```

Notes:

- `noteOff(channel)` is preferred over `release(channel, block, pitch)`
- YM2612 key-off is fundamentally channel-oriented
- `setAlgo()` is important, especially for:
  - 2-operator mode
  - full 4-operator mode

## Meaning of `reset()`

This should be documented clearly in the implementation.

Current recommendation:

- `reset()` should reset synth-side state
- and also reset the underlying playback target through the transport if supported

In other words, `reset()` is likely to mean:

- clear local channel/operator state
- reset note/key state assumptions
- send or delegate an actual YM2612 reset when available

This helps keep synth state and chip state aligned.

## Recording direction

Current recommendation:

- `startRecord()` and `stopRecord()` should exist on `YM2612Synth`
- but the actual recording work should be handled by an internal recorder object

Why this split is good:

- from the outside, the API stays simple
- inside, recording logic stays separate from synth logic
- later, a VGM writer can be connected cleanly

Suggested usage:

```js
synth.startRecord();
synth.setPreset(0, PRESETS.bell);
synth.noteOn(0, 4, 553);
const record = synth.stopRecord();
```

## What should be recorded

The important thing is not only:

- what was written

but also:

- when it was written

Current recommendation:

- do not record in milliseconds if possible
- prefer:
  - `deltaSamples`
  - or later `ticks` at the looper layer

Why:

- VGM timing is sample-based
- sample-based timing is more stable than `ms`
- looper timing can later be converted to step/tick timing

Possible recorded event shape:

```js
{
  deltaSamples: 0,
  port: 0,
  register: 0x28,
  value: 0xf0,
}
```

Note:

- API can stay on `YM2612Synth`
- recording implementation can still live in a separate internal recorder object

That gives:

- easy usage
- clean internal separation
- better future VGM export options

## Relationship to future VGM export

The current idea is:

- `YM2612Synth` performs readable synth operations
- internal register writes are recorded
- the recorded write stream can later be converted into VGM-like output

This means the synth layer can become a good bridge between:

- human-readable code
- raw YM2612 register behavior
- future recording / export

## Why this is a good implementation target

The following design constraints are now considered important:

- readable enough for learning
- thin enough not to hide the YM2612 too much
- structured enough for later transport replacement
- recordable enough for future VGM-like export

This is a strong fit for the repository's goals.

## Important behavior decision

`setOperator(channel, operator, params)` should be a partial update.

That means:

```js
synth.setOperator(0, 4, { tl: 12 })
synth.setOperator(0, 4, { ar: 31, rr: 4 })
```

should be valid.

Why:

- changing one parameter at a time is common
- it is easier for live tweaking
- it is easier for learning
- it avoids forcing the caller to resend a full operator definition every time

Possible future addition:

```js
replaceOperator(channel, operator, params)
```

but not required at first.

## Suggested operator params

```js
{
  dt?: number,
  multi?: number,
  tl?: number,
  ar?: number,
  d1r?: number,
  d2r?: number,
  sl?: number,
  rr?: number,
}
```

## Suggested channel-level params

At minimum:

- algorithm
- feedback
- pan left/right

Possibly later:

- AMS / FMS related settings if exposed

## Preset design decision

Open question:

- Should `setPreset(channel, preset)` live inside `YM2612Synth`?
- Or should presets be handled fully by the app layer?

Current recommendation:

- Keep `setPreset(channel, preset)` inside `YM2612Synth`
- But keep preset data itself separate from the synth core

Recommended pattern:

```js
synth.setPreset(0, PRESETS.bell);
```

Meaning:

- `YM2612Synth` knows how to apply a preset
- preset definitions can live in a separate file
- the app decides which preset to use

This gives a good balance between:

- convenience
- keeping responsibilities separate

## Important YM2612 note

YM2612 settings can be changed while a note is playing.

This should be considered a feature, not an error.

Important interpretation:

- changing parameters during playback does not always produce smooth transitions
- sound can change abruptly
- unstable or rough transitions are also part of the character of the chip

This should be documented in the synth layer or related docs.

Suggested wording:

- YM2612 parameters can be changed while a note is playing.
- The result is not always smooth.
- Sudden or rough changes are also part of the chip's character.

## Polyphony / channel usage reminder

YM2612 has 6 FM channels.

Important limitation:

- the same channel cannot hold overlapping notes independently
- if a note is retriggered on the same channel, it replaces the previous note on that channel

So for keyboard-like usage:

- same-channel retrigger should restart that channel
- true overlap requires using a different channel

This matters for future keyboard UI and synth voice allocation.

## Why the 3 planned modes are valuable

1-operator mode:

- easiest learning path
- good for understanding:
  - `MULTI`
  - `TL`
  - envelope behavior
  - `Pitch` / `Block`

2-operator mode:

- good for understanding:
  - serial vs parallel
  - feedback
  - how `DT` becomes more meaningful
  - how FM relationships change the sound

Full mode:

- closest to practical YM2612 instrument building
- needed for broader preset support
- closer to what a real composing tool would want

## Relationship to repository goals

This synth layer strongly supports the repository goals:

- understand the YM2612 chip
- help others understand the YM2612 chip
- help others embed YM2612 audio in browser apps or games

Why:

- readable API usage can show chip intent directly
- it can become the "browser/game integration" layer
- it can also become a teaching layer

## Immediate next steps

1. Create `web/ym2612synth.js`
2. Implement minimal state storage for 6 channels
3. Implement:
   - `reset()`
   - `setOperator()`
   - `setAlgo()`
   - `setPan()`
   - `noteOn()`
   - `noteOff()`
4. Add a first preset format
5. Add:
   - 1-operator preset examples
   - 2-operator preset examples
6. Decide whether to expose:
   - mode switching inside one class
   - or separate preset groups per mode

## Nice future follow-ups

- a keyboard demo built on top of `YM2612Synth`
- guitar-fretboard-like keyboard mapping
- a simple browser synth playground
- a way to inspect generated register writes for learning
