# FM2612 Looper Memo

Last updated: 2026-08-22

## Goal

- Add a simple looper inspired by BOSS-style loopers to Tetorica FM2612.
- Play YM2612 from PC keyboard or similar input.
- Record the performed result as loop audio for stable playback.
- Keep performed events as optional metadata for export and later analysis.
- Prefer a practical looper first, then keep the event log for VGM/MML-related future work.

## Planned files

- `web/megasynth.js`
- `web/megasynth_looper.js`

Current direction:

- keep `MegaSynth` as the browser/runtime wrapper
- add looper behavior in a separate file instead of growing `megasynth.js` too much
- keep loop playback separate from live YM2612 voice allocation

Recommended export:

```js
export class MegaSynthLooper
```

## Why split `megasynth_looper.js`

`megasynth.js` should stay focused on:

- `AudioContext`
- `AudioWorklet`
- YM2612 WASM loading
- worklet initialization
- transport/runtime setup

The looper adds a different kind of responsibility:

- timeline state
- unit recording
- loop playback
- overdub behavior
- undo / mute / delete candidates

So the direction should be:

```txt
UI / Game
   ↓
MegaSynthLooper
   ↓
MegaSynth
   ↓
YM2612Synth
   ↓
transport / worklet
   ↓
YM2612
```

In short:

- `MegaSynth` = runtime / playback environment
- `MegaSynthLooper` = loop recording / metadata / export-oriented layer

## New playback concept

The original event-replay looper was attractive for editability, but it still had a hard practical problem:

- YM2612 has only 6 FM channels.
- Even with separate live/playback synth instances, event-replay units can still fight over channel usage.
- That means overdub playback can cut notes unexpectedly.

Observed in practice on `docs/synth`:

- unit 1 is mostly stable
- unit 2 and later can still sound corrupted
- notes can cut out partway through playback
- improving scheduling helps a little, but does not remove the core instability

So the new direction is:

```txt
During recording:
  play live YM2612
  record audio result for the new unit
  also record note/preset metadata as optional side data

During playback:
  replay recorded audio units
  do not regenerate every old unit through YM2612 each time
```

This is much closer to a BOSS-style looper and should be much more stable.

## Why audio-first loop playback

Advantages:

- avoids FM channel conflicts between units
- easier overdub playback
- lighter CPU/runtime behavior during loop playback
- simpler mental model for users

Trade-offs:

- changing preset later does not rewrite already-recorded sound
- loop playback is no longer "fully live YM2612 regeneration"
- export needs the side metadata, not the recorded audio alone

That trade-off is acceptable here.

The looper should behave as a musical tool first.
Export/edit metadata can stay as an optional parallel record.

## Basic operation

The operation should stay as simple as possible.

```txt
Looper Start
Space
  ↓
Record Unit 1
Space
  ↓
Stop Recording Unit 1
Loop Length fixed
Loop Playback starts
Space
  ↓
Record Unit 2
Unit 1 audio keeps playing
Space
  ↓
Stop Recording Unit 2
Space
  ↓
Record Unit 3
...
Looper Stop
```

## Unit

One recording pass is called a `Unit`.

Each time recording starts and stops, a new unit is created.

```txt
Looper
├─ Unit 1
├─ Unit 2
├─ Unit 3
└─ Unit 4
```

Units should be `insert-only`.

Do not overwrite an existing unit directly.

This keeps future features simpler:

- undo
- delete
- mute
- export
- import

## First unit

The first unit is special.

```txt
Space
  ↓
Record Unit 1
  ↓
Space
  ↓
Unit 1 recording end
  ↓
Loop Length fixed
```

If the first recording lasts:

```txt
7.82 sec
```

then:

```txt
Loop Length = 7.82 sec
```

All later units are recorded onto this same loop length.

## Loop timeline

Example:

```txt
Loop Length = 8 sec
0                                   8
|-----------------------------------|
Unit 1
| ♪──────♪────♪──────────────────── |
Unit 2
|          ♪──────♪────             |
Unit 3
|                       ♪──♪        |
```

Unit 2 and later should be allowed to start recording in the middle of the loop.

The looper should remember the current loop position at record start and store events relative to loop start.

## Space key behavior

While the looper is running, `Space` should stay very simple.

```txt
Not Recording
    ↓ Space
Recording New Unit

Recording
    ↓ Space
Finish Current Unit
```

In other words:

- `Space = Record ON / OFF`

Do not use `Space` to stop the whole looper.

## Looper start / stop

Conceptual API:

```js
looper.start();
looper.stop();
```

When stopping:

- stop playback
- stop recording
- clear pending scheduling state if needed
- optionally send YM2612 all-notes-off

Loop data may stay in memory until `clear()`.

## Basic state

Candidate shape:

```js
{
  running: false,
  recording: false,
  loopLength: null,
  startedAt: null,
  loopStartedAt: null,
  currentUnit: null,
  units: [],
}
```

Before the first unit is completed:

```js
loopLength === null
```

## Unit data structure

The structure should now separate:

- audio used for practical playback
- event metadata kept for export or analysis

Candidate shape:

```js
{
  id: "unit-1",
  muted: false,
  audioBuffer: AudioBuffer | null,
  audioDuration: 0,
  patch: { ... } | null,
  events: [
    { time: 0.00, type: "noteOn", channel: 0, block: 4, fnum: 553 },
    { time: 0.22, type: "noteOff", channel: 0 },
  ],
}
```

`audioBuffer` is the main playback source.

`events` and `patch` are side information for:

- export
- analysis
- future transform tools

## Runtime split

The synth demo already uses separate runtime paths for:

- live synth
- loop synth

The next practical audio-looper step is slightly different:

- live synth output
- loop audio playback

So the output graph should move toward:

```txt
Live YM2612 -> liveOutputBus -> destination
                        └----> liveCaptureNode

Loop AudioBufferSource -> destination
```

Important detail:

- record only the live bus for the new unit
- do not re-record already-playing loop audio into the next unit unless an intentional "bounce" mode is added later

## Near-term implementation plan

1. Keep event recording for now.
2. Add audio capture from the live output bus.
3. When a unit recording ends:
   - finalize captured audio
   - store it as the unit's playback source
4. Change loop playback to prefer unit audio instead of event replay.
5. Keep event replay only as a debug / fallback path if needed.

## Important current conclusion

At this point, the event-replay looper should no longer be treated as the main practical path for overdub looping.

It is still useful for:

- metadata capture
- export-related experiments
- understanding timing / patch changes

But for a user-facing looper experience, the main playback path should become:

- record live output audio
- replay recorded audio units

That is the direction to prioritize next.

## Notes on export

The recorded audio should not become the export source for YM2612/VGM-like formats.

Instead:

- `events`
- `patch`
- later maybe register-write history

should remain the source for export.

So the looper becomes:

- practical playback tool by audio
- export helper by metadata

Concept:

```js
{
  id: "unit-1",
  events: [
    {
      time: 0.0,
      type: "noteOn",
      channel: 0,
      note: "C3",
    },
    {
      time: 0.42,
      type: "noteOff",
      channel: 0,
      note: "C3",
    },
  ],
}
```

`time` should be stored as:

- relative time from loop start

If a later unit starts recording in the middle of the loop, the record-start loop position should be converted into this same timeline.

## Event recording

The looper does not need to record every low-level YM2612 register write in the first version.

The first version should record the performance-level events generated by Tetorica FM2612 / MegaSynth-side play actions.

Candidate event types:

- `noteOn`
- `noteOff`
- `velocity` or level-like information if needed later
- `channel`
- `preset change` if desired later

## Suggested integration with `MegaSynth`

Current recommendation:

- `MegaSynth` should expose stable play/control APIs
- `MegaSynthLooper` should subscribe to or wrap those APIs
- avoid pushing timeline logic directly into `megasynth.js`

Two reasonable directions:

### A. Wrapper style

```js
const synth = new MegaSynth(...);
const looper = new MegaSynthLooper({ synth });
```

Then:

- UI talks to `looper`
- `looper` forwards note events to `synth`
- `looper` records the same events

### B. Hook style

`MegaSynth` exposes event hooks such as:

```js
synth.onPerformanceEvent(...)
```

and `MegaSynthLooper` listens.

Current preference:

- wrapper style is simpler for the first version

## Minimum first version

A small first version is enough.

Recommended scope:

- `start()`
- `stop()`
- `toggleRecord()`
- first-unit loop length capture
- playback of recorded units
- overdub as new units
- `clear()`

Good to postpone:

- quantize
- metronome
- waveform recording
- full VGM export
- detailed editing UI

## Why this is valuable

If this works, the project becomes more than a learning demo.

It becomes:

- a YM2612 learning tool
- a small browser instrument
- a lightweight looper
- a drum-machine-like toy

Especially with short presets per key, it can already act like:

- simple FM percussion pad
- retro SFX looper
- sketchpad for game sound ideas
