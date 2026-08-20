# VGM

## What is VGM?

`VGM` stands for `Video Game Music`.

In practice, a VGM file is usually not a recording like `mp3` or `wav`.
Instead, it is closer to a log of chip operations.

For example, a VGM file can contain information such as:

- write this value to this YM2612 register
- wait this many samples
- write the next value

So a VGM file is often closer to:

- chip commands
- timing information
- playback metadata

than to:

- rendered audio

## Mental model

A simple mental model is:

1. A composer or tool creates chip music data.
2. The VGM file stores chip writes and wait commands.
3. A player reads the VGM commands in order.
4. The player sends register writes to the YM2612 emulator.
5. The emulator generates audio samples.

## VGM is not the same as WAV

It is useful to separate these ideas:

- `wav`
  already-rendered audio samples
- `vgm`
  instructions for sound chips plus timing

A `wav` file says:

- here is the final sound

A `vgm` file says:

- here is how to drive the chip to create the sound

## Why this matters for YM2612

The YM2612 is controlled by register writes.

This matches VGM very well, because VGM also describes playback as a sequence of chip commands.

That means:

- `ex03_beep.cpp` writes registers directly
- a YM2612 VGM player would also write registers directly
- the big difference is that VGM automates the sequence and timing

## FM and PCM are different

It is useful to separate these two ideas early:

- `FM`
  create a sound by configuring YM2612 registers
- `PCM / DAC`
  create a sound by sending waveform sample bytes to the chip

For FM, we usually think in terms of:

- algorithm
- operator settings
- frequency
- key on / key off

For PCM / DAC, the mental model is different.

We do not select "instrument 3" or "sample 5" inside the YM2612.
Instead, we send 8-bit sample values to the chip over time.

That is why PCM playback is closer to:

- prepare sample data
- enable DAC mode
- send bytes at the correct timing

than to:

- configure operators and key-on a note

## YM2612 registers for PCM / DAC

Two YM2612 registers are especially important here:

- `0x2A`
  DAC data
- `0x2B`
  DAC enable

The rough idea is:

1. Enable DAC playback with `0x2B`.
2. Write 8-bit sample values to `0x2A`.
3. Keep writing data at the correct timing.

So for PCM, the "sound source" is not a built-in preset.
The sound source is the byte stream that we feed into `0x2A`.

## What we will need later

To support VGM playback, we will eventually need to understand:

- the VGM file header
- how chip clock information is stored
- YM2612 write commands inside VGM
- wait commands
- loop information

## Short summary

VGM is a music data format that stores sound chip commands and timing.

For this repository, VGM matters because it could let us:

- reuse YM2612 music data
- replay it through `ymfm`
- bring that playback to JavaScript and the web

## VGM Header / Command

This note is intentionally `YM2612-first`.

The full VGM specification is large, but for an initial YM2612 player,
we do not need all of it.

At first, we only need to understand:

- a few header fields
- YM2612 write commands
- wait commands
- end command
- loop information

## First fields to care about

If the goal is "play YM2612 VGM through `ymfm`", start with these fields:

- `0x08`: version
- `0x18`: total number of samples
- `0x1C`: loop offset
- `0x20`: loop number of samples
- `0x2C`: YM2612 clock
- `0x34`: VGM data offset

Everything else can wait until later.

## VGM Header

A VGM file begins with a header.

The header stores metadata such as:

- file identification
- format version
- chip clock information
- total sample count
- loop information
- where the VGM command stream begins

For modern VGM files, the header is usually treated as a `0x100` byte area.

Some important fields are:

- `0x00`: `"Vgm "` file identifier
- `0x04`: EOF offset
- `0x08`: version
- `0x18`: total number of samples
- `0x1C`: loop offset
- `0x20`: loop number of samples
- `0x2C`: YM2612 clock
- `0x34`: VGM data offset

### Important ideas

- VGM uses little-endian integers
- many offsets are relative offsets, not absolute file positions
- for VGM versions before `1.50`, the command stream starts at `0x40`
- for VGM `1.50` and later, the command stream start is determined from the data offset field

### YM2612-related header values

To replay YM2612 correctly, we will especially care about:

- VGM version
- YM2612 clock
- total sample count
- loop offset and loop sample count
- VGM data offset

The YM2612 clock is important because it tells us what chip clock the music expects.

For a first implementation, this is already enough.

## VGM Commands

After the header comes a stream of commands.

The player reads the commands one by one.
Each command usually means one of these things:

- write to a sound chip register
- wait for some amount of time
- end the stream

For YM2612 playback, the most important commands are:

- `0x52 aa dd`
  write value `dd` to YM2612 port 0 register `aa`
- `0x53 aa dd`
  write value `dd` to YM2612 port 1 register `aa`
- `0x61 nn nn`
  wait `n` samples
- `0x62`
  wait 735 samples
- `0x63`
  wait 882 samples
- `0x66`
  end of sound data

For YM2612 DAC / PCM playback, these are also important:

- `0x67`
  data block
- `0x68`
  PCM RAM write
- `0x80-0x8F`
  YM2612 DAC write with short wait
- `0x90-0x95`
  DAC stream control
- `0xE0`
  data bank seek

## First commands to care about

For a first YM2612-only implementation, these commands are enough:

- `0x52 aa dd`
- `0x53 aa dd`
- `0x61 nn nn`
- `0x62`
- `0x63`
- `0x66`

That means the first player only needs to support:

- write to YM2612 port 0
- write to YM2612 port 1
- wait
- stop

## Why `0x52` and `0x53` matter

These commands map very naturally to the YM2612 interface we already have.

- `0x52 aa dd`
  means `chip.write(0, aa)` then `chip.write(1, dd)`
- `0x53 aa dd`
  means `chip.write(2, aa)` then `chip.write(3, dd)`

This is one of the main reasons VGM fits well with YM2612 emulation.

## How PCM is described in VGM

For PCM, VGM usually does not mean:

- "select PCM instrument number 7"

Instead, it usually means something closer to:

- here is a block of PCM bytes
- move to this position in that data
- send bytes to the YM2612 DAC
- wait between writes

That is why commands such as `0x67`, `0x80-0x8F`, `0x90-0x95`, and `0xE0` matter.

## `0x67` and `0x68` are different

These two commands are easy to mix up.

- `0x67`
  stores PCM-related data inside the VGM stream
- `0x68`
  writes PCM data into a chip-side PCM RAM area

So the rough distinction is:

- `0x67`
  "here is the source data"
- `0x68`
  "copy data into chip memory"

For YM2612 DAC playback, the most common mental model is still:

1. enable DAC with register `0x2B`
2. send bytes to register `0x2A`
3. wait between writes

That is why some YM2612 VGM files can still play even if `0x68` is not implemented.

## Mental model for YM2612 PCM in VGM

A simple mental model is:

1. A VGM data block stores PCM bytes.
2. The player remembers that byte array.
3. A DAC-related command selects where to read from.
4. The player writes bytes to YM2612 register `0x2A`.
5. Wait timing controls the playback speed.

So the PCM "instrument" is really:

- a byte sequence
- plus timing
- plus DAC enable state

## Practical mapping

This is the important connection:

- YM2612 register `0x2B`
  enable DAC mode
- YM2612 register `0x2A`
  receive one PCM sample byte
- VGM `0x67`
  provide PCM data bytes
- VGM `0xE0`
  move the current read position in a data bank
- VGM `0x80-0x8F`
  write one DAC byte and wait a small amount
- VGM `0x90-0x95`
  describe DAC stream playback

In other words:

- YM2612 itself only sees register writes
- VGM helps organize where the PCM bytes come from and when to send them

## Small example

The playback idea is roughly:

1. Write `0x2B` to enable DAC.
2. Load or point to PCM sample data.
3. Send one byte to `0x2A`.
4. Wait a little.
5. Send the next byte to `0x2A`.
6. Repeat until the sample ends.

That is the basic PCM / DAC model for YM2612.

## Wait commands

VGM does not only store register writes.
It also stores timing.

That timing is critical.

For example:

- write some YM2612 registers
- wait a number of samples
- write more registers

Without the wait commands, the music would not have the correct rhythm or note lengths.

## Minimal player mental model

A minimal YM2612 VGM player would do this:

1. Read the header.
2. Find the command stream start.
3. Parse commands in order.
4. For `0x52` and `0x53`, write to YM2612.
5. For wait commands, generate that many audio samples.
6. Stop at `0x66`, or jump to the loop point if looping is enabled.

## Notes

- `.vgm` is the plain format
- `.vgz` is usually gzip-compressed VGM data
- a player may need to decompress `.vgz` before parsing the VGM stream

## Practical scope

If we keep the scope small, the first YM2612 VGM player can be:

1. Read the header.
2. Find the data start.
3. Handle `0x52` and `0x53`.
4. Handle `0x61`, `0x62`, and `0x63`.
5. Stop at `0x66`.
6. Optionally handle looping with the loop offset.

This is a good first target.

## What this repository supports now

At the current stage of this repository:

- YM2612 register writes are supported
- PSG writes are supported
- basic wait / end commands are supported
- YM2612 DAC data-block / stream playback is partially supported

More specifically:

- `0x67`
  basic data-block loading is supported
- `0x80-0x8F`
  basic DAC write + wait is supported
- `0x90-0x95`
  minimal DAC stream support exists
- `0xE0`
  basic data-bank seek is supported
- `0x68`
  not implemented yet

So PCM / DAC playback is not "fully done", but it is also no longer "all skipped".

## References

- VGM specification: https://vgmrips.net/wiki/VGM_Specification
