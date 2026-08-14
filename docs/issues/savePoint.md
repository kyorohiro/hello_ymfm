# Save Point

Last updated: 2026-08-14

## Current status

- `docs/beep.html`
  YM2612 beep demo works in the browser.
- `docs/psg.html`
  Sega PSG demo works in the browser.
- `docs/vgm.html`
  VGM file can be parsed and played with YM2612 + PSG.
  Streaming playback now works in the browser.
- `docs/ym2612vgm.js`
  Minimal VGM support was expanded to reduce `SKIP`.

## VGM support added today

- YM2612 register write
  - `0x52`
  - `0x53`
- PSG write
  - `0x50`
- Wait / end
  - `0x61`
  - `0x62`
  - `0x63`
  - `0x66`
  - `0x70-0x7f`
- YM2612 DAC / stream related
  - `0x67` data block: store block data
  - `0x80-0x8f`: DAC write + wait
  - `0x90-0x95`: minimal DAC stream handling
  - `0xe0`: data bank seek

## What changed

- `docs/ym2612vgm.js`
  Added data block loading, YM2612 DAC handling, and minimal DAC stream playback.
- `web/ym2612vgm.js`
  Synced with `docs/ym2612vgm.js`.
- `docs/vgm.html`
  Wait rendering was split so DAC stream writes can happen during playback timing.
  Playback was moved from full offline rendering to chunked streaming playback.

## What we observed

- The second VGM plays without `SKIP`.
- The first VGM also has no `SKIP` now, but sound starts after a long delay.
- That likely means:
  - the song has a long silent intro, or
  - the interesting part starts later, or
  - the track structure depends on data that is not ideal for this minimal player yet.

## Important interpretation

- "No sound at first" is not automatically a parser bug now.
- If there is no `SKIP`, the next thing to inspect is the VGM content itself:
  - long wait before first key-on
  - long wait before audible FM/PSG part
  - DAC-heavy intro
- The old "wait until 100% render" behavior was also a playback-model issue.
- After switching to streaming playback, audio starts before full rendering finishes.

## Still not fully supported

- `0x68` PCM RAM write is still skipped.
- Special / uncommon `0x67` block types are still skipped.
- DAC stream handling is minimal.
- Real hardware accuracy is not the goal yet.

## Scope risk

- Building a serious "full VGM player" could easily consume 2-4 months.
- The expensive part is not only implementation.
- It also includes:
  - command coverage
  - DAC / PCM correctness
  - testing assets
  - result verification
  - compatibility differences between VGM files

## Practical scope for this repository

- This repository does not need to become a complete VGM player first.
- A more realistic target is:
  - a YM2612 + PSG learning-oriented VGM player
  - browser / WASM playback
  - support for a practical subset of Genesis / DefleMask-oriented VGM data
  - clear documentation about what is supported and what is not

## DefleMask-oriented finding

- At least one target Genesis VGM uses YM2612 DAC stream commands in a practical way.
- Observed pattern:
  - `0x67` data blocks
  - `0x90` stream target setup for YM2612 register `0x2a`
  - `0x91` data bank setup
  - repeated `0x92` with frequency `16000`
  - repeated `0x95` with block switching between `0x0000` and `0x0001`
  - final `0x94` stop
- This means `0x90-0x95` cannot always be ignored for DefleMask-oriented Genesis support.
- The good news is that this pattern still looks practical to support.

## Important reminder

- "Achieve this repository's goals" is not the same as "support all VGM files".
- Avoid accidentally turning this repository into a full compatibility project too early.

## Genesis-oriented work list

- Phase 1: keep the current base stable
  - keep `docs/beep.html` working
  - keep `docs/psg.html` working
  - keep `docs/vgm.html` working for the current sample VGMs
- Phase 2: clarify the Genesis audio model in docs
  - explain that Mega Drive / Genesis audio is mainly `YM2612 + PSG`
  - explain which part is FM and which part is PSG
  - explain where DAC / PCM belongs in YM2612
- Phase 3: strengthen VGM parsing for Genesis use
  - confirm handling for `0x50`
  - confirm handling for `0x52` / `0x53`
  - confirm handling for waits and loop-related behavior
  - document which DAC / PCM commands are supported now
  - inspect whether `0x68` matters for target Genesis VGM files
- Phase 4: prepare small test assets
  - one short FM-only Genesis VGM
  - one short PSG-including Genesis VGM
  - one short DAC / PCM-including Genesis VGM
  - keep them short enough for easy debugging
- Phase 5: improve debug visibility
  - show accumulated VGM time while parsing
  - show first YM2612 key-on timing
  - show first PSG write timing
  - show first DAC activity timing
  - show unsupported commands clearly
- Phase 6: define the practical compatibility target
  - write "supported Genesis VGM subset"
  - write "known unsupported patterns"
  - avoid claiming full VGM compatibility
- Phase 7: browser embedding path
  - keep the WASM build instructions simple
  - keep the JavaScript API simple
  - show the minimum code needed to connect to Web Audio
  - keep the demo pages as small reference implementations
- Phase 8: learning examples
  - add an example for YM2612 FM note playback
  - add an example for PSG tone playback
  - add an example for YM2612 DAC playback
  - add an example for mixed YM2612 + PSG playback
- Phase 9: optional later work
  - add better loop handling
  - add stricter DAC stream behavior
  - add more Genesis-focused VGM compatibility
  - consider DefleMask-oriented workflow notes

## Priority view

### Must

- keep `docs/beep.html`, `docs/psg.html`, and `docs/vgm.html` working
- document the Genesis audio model as `YM2612 + PSG`
- keep YM2612 / PSG / basic VGM playback understandable
- clarify the current supported VGM subset
- prepare short Genesis-focused VGM test assets
- keep the WASM + JavaScript browser path simple and reproducible
- add learning examples for:
  - YM2612 FM
  - PSG tone
  - YM2612 DAC
  - mixed YM2612 + PSG

### Nice to have

- improve debug visibility in `docs/vgm.html`
- show first key-on / first PSG / first DAC timing
- add better loop handling
- add clearer DefleMask-oriented workflow notes
- support more Genesis VGM command patterns as needed by real samples
- treat VGM DAC stream control `0x90-0x95` as a future compatibility target unless target Genesis / DefleMask files require it

### Not now

- full VGM compatibility
- real hardware accuracy tuning
- broad support for many non-Genesis chip targets
- turning this repository into a general-purpose VGM player project

## Current decision about `0x90-0x95`

- `0x90-0x95` DAC stream control is postponed for now.
- Reason:
  - it is part of broader VGM compatibility work
  - it can easily expand the scope too much
  - it should only be prioritized if target Genesis / DefleMask VGM files actually require it
- Important distinction:
  - YM2612 register writes such as `register=0x94` are normal FM register writes
  - that is different from VGM command `0x94`

## Game integration path

- Current playback style in `docs/vgm.html`
  - stream audio in chunks during playback
- This is good for:
  - debugging
  - command analysis
  - confirming that realtime audio can be generated
- This is closer to game use, but not finished yet because:
  - main-thread work still matters
  - loop handling is still basic
  - `AudioWorklet` is not used yet

## What is needed for game-oriented playback

- audio generation that can feed Web Audio continuously
- start / stop / reset controls
- loop handling
- stable timing for long playback
- low enough main-thread cost for browser game use
- move from `ScriptProcessorNode` demo style toward `AudioWorklet` when needed

## Practical next steps toward game use

1. Keep the current streaming demo stable.
2. Add stop / replay / loop controls.
3. Confirm YM2612 + PSG + target DAC stream subset work during streaming.
4. Move audio generation toward an `AudioWorklet` model when needed.
5. Add a small game-like sample after streaming becomes stable.

## Proposed interface split

- Prefer a 3-layer structure for easier embedding:
  - chip layer
  - player layer
  - audio output layer

### 1. Chip layer

- Purpose:
  - keep YM2612 / PSG handling low level
  - expose register writes and sample generation only
- Examples:
  - `Ym2612`
  - `SegaPSG`
  - optional combined `GenesisAudioEngine`

### 2. Player layer

- Purpose:
  - parse and drive VGM playback
  - hide chip-specific details from app / game code
- Candidate class:
  - `VgmPlayer`
- Candidate responsibilities:
  - `load(buffer)`
  - `reset()`
  - `play()`
  - `stop()`
  - `setLoopEnabled(enabled)`
  - `isPlaying()`
  - `sampleRate()`
  - `process(left, right, frames)`

### 3. Audio output layer

- Purpose:
  - connect the player to browser audio output
  - keep Web Audio details separate from VGM / chip logic
- Candidate implementations:
  - current demo-oriented streaming path
  - future `AudioWorklet` path

## Why `process(left, right, frames)` is important

- It fits browser audio callback style well.
- It is reusable for:
  - streaming playback
  - offline rendering
  - future game-engine integration
- It gives a cleaner boundary than exposing raw register writes to app code.

## Interface direction for game use

- Do not force a single interface style.
- A practical split is:
  - high-level API for BGM
  - low-level API for SFX / realtime control

### High-level API

- Good for:
  - VGM playback
  - BGM handling
  - simple browser/game integration
- Prefer methods such as:
  - `load`
  - `play`
  - `stop`
  - `loop`
  - `process`

### Low-level API

- Good for:
  - sound effects
  - realtime note control
  - direct YM2612 / PSG experimentation
- Prefer methods such as:
  - `writeYm2612(port, register, value)`
  - `writePsg(value)`
  - possible future helpers like `noteOn` / `noteOff`

## Likely class direction

- `GenesisAudioEngine`
  - low-level YM2612 + PSG control
  - sample generation via `process(left, right, frames)`
- `VgmPlayer`
  - high-level VGM playback built on top of `GenesisAudioEngine`

## Why this split makes sense

- BGM and SFX do not always want the same API.
- VGM playback wants a higher-level player abstraction.
- Game SFX may still want direct register access.
- This keeps the repository useful for both:
  - embedding music playback
  - experimenting with chip-level sound design

## Good next steps

1. In `docs/vgm.html`, show more timing information:
   - total wait before first audible section
   - first key-on timing
   - first YM2612 DAC activity timing
2. Add a simple debug view:
   - command index
   - accumulated VGM samples
   - accumulated seconds
3. If the first VGM still feels suspicious, inspect which command appears just before the first audible sound.
4. Only after that, decide whether `0x68` or stricter DAC stream behavior is worth implementing.

## Files to reopen next time

- `docs/vgm.html`
- `docs/ym2612vgm.js`
- `web/ym2612vgm.js`

## Short reminder for future me

- The project is already past the "can browser/WASM make sound?" phase.
- The next work is mostly about VGM behavior, timing visibility, and incremental compatibility.
- Do not overreact to silence if `SKIP` is already gone.
