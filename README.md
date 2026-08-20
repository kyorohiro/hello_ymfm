# About hello_ymfm_wasm

This repository has three goals:

- To understand the YM2612 chip.
- To create documentation that helps anyone understand the YM2612 chip.
- To create documentation that helps anyone embed YM2612 audio in a browser app or game.

This repository also provides YM2612 WebAssembly modules and JavaScript interfaces for browser-side use.

Current repository status:

- Provides a WebAssembly build and JavaScript interface for YM2612.
- Provides a Sega Genesis / Mega Drive oriented VGM player for the browser.
- Provides demos for browser playback and direct YM2612 control from JavaScript.
- Includes some checks with DefleMask-generated sound data.

Demo:

- https://kyorohiro.github.io/hello_ymfm_wasm/
- `docs/embed.html`: small browser integration sample that shows both the VGM playback path and the direct chip control path.

This project uses [ymfm](https://github.com/aaronsgiles/ymfm) by Aaron Giles under the BSD 3-Clause License.
See `LICENSE` for the license text included with this repository.

## tutorials
- [tutorials/ex00.md](./tutorials/ex00.md): English notes about YM2612 pins, register groups, and how `ex03_beep.cpp` works.
- [tutorials/ex00_ja.md](./tutorials/ex00_ja.md): Japanese notes about YM2612 pins, register groups, and how `ex03_beep.cpp` works.
- [tutorials/ex00_vgm.md](./tutorials/ex00_vgm.md): English notes about VGM Format.
- `tutorials/ex01_hello_world.cpp`: minimal example that checks that `ymfm` can be compiled and loaded.
- `tutorials/ex02_ym2612.cpp`: creates a `ym2612` chip and prints the sample rate for a YM2612 clock.
- `tutorials/ex03_beep.cpp`: writes YM2612 registers directly and generates a simple beep sound.
- `docs/embed.html`: a small browser-side integration sample that shows two separate browser-side paths:
  VGM playback and direct chip control.

## References
- `ymfm` repository:
  - https://github.com/aaronsgiles/ymfm
- `MAME`:
  - https://www.mamedev.org/
- `retropc.net`:
  - http://retropc.net/cisc/m88/
- `ymfm` examples:
  - https://github.com/aaronsgiles/ymfm/tree/main/examples
- `ymfm` source for YM2612 registers and behavior:
  - `src/ymfm_opn.h`
  - `src/ymfm_opn.cpp`
- YM2612 pin reference:
  - http://www.chipdir.nl/pinusr/ym2612.txt
- YM2612 overview:
  - https://www.vgmpf.com/Wiki/index.php?title=YM2612
- Genesis development discussion and practical notes:
  - https://gendev.spritesmind.net/forum/viewtopic.php?start=585&t=386
- VGM specification:
  - https://vgmrips.net/wiki/VGM_Specification
- SMS Power:
  - https://www.smspower.org/

## build/test ym2612 wasm
Build:

```sh
sh scripts/build_ym2612_wasm.sh
```

This generates:

- `docs/generated/ym2612_wasm.js`
- `docs/generated/ym2612_wasm.wasm`

Test:

- Import `docs/generated/ym2612_wasm.js` in browser-side JavaScript.
- Use `web/ym2612.js` as the thin JavaScript interface.
- The `web/` directory is a small browser-side source folder for JavaScript interfaces and helpers in this repository.
  It is not an external package registry dependency.
- Create a `Ym2612` instance, call `reset()`, send register writes, and call `generateStereo(frames)`.

See `web/README.md` for a minimal usage example.


# ymfm

<div style='text-align:center;margin:auto'>
<img src='https://aarongiles.com/img/icon-ymfm.png' width='128px'>
</div>

[ymfm](https://github.com/aaronsgiles/ymfm) is a collection of BSD-licensed Yamaha FM sound cores (OPM, OPN, OPL, and others), written by [Aaron Giles](https://aarongiles.com)

## Supported environments

This code should compile cleanly in any environment that has C++14 support.
It has been tested on gcc, clang, and Microsoft Visual C++ 2019.

## Supported chip families

Currently, support is present for the following chips (organized by header file):

* ymfm_misc.h:
	* YM2149 (SSG) [1983: MSX; Atari ST]
* ymfm_opm.h:
	* YM2151 (OPM) [1983: Sharp X1, X68000; MSX; synths: DX21, DX27, DX100]
	* YM2164 (OPP) [1985: FB-01 MIDI Expander; IBM Music Feature Card; MSX; synths: Korg DS-8, 707]
* ymfm_opn.h:
	* YM2203 (OPN) [1984: NEC PC-88, PC-98, NEC PC-6001mkII SR, PC-6601 SR]
	* YM2608 (OPNA) [1985: NEC PC-88, PC-98]
	* YM2610 (OPNB) [1987: Neo Geo]
	* YM2610B (OPNB2)
	* YM2612 (OPN2) [1988: Sega Mega Drive/Genesis; FM Towns]
	* YM3438 (OPN2C)
	* YMF276 (OPN2L)
	* YMF288 (OPN3L) [1995: NEC PC-98]
* ymfm_opl.h:
	* YM3526 (OPL) [1984: C64 SFX Sound Expander]
	* Y8950 (MSX-Audio) [1984: MSX]
	* YM3812 (OPL2) [1985: AdLib, Sound Blaster; synths: some Portasound keyboards]
	* YMF262 (OPL3) [1988: Sound Blaster Pro 2.0, SB16]
	* YMF289B (OPL3L)
	* YMF278B (OPL4) [1993: MSX Moonsound cartridge]
	* YM2413 (OPLL) [1986: Sega Master System, Mark III; MSX; synths: Portasound PSS-140, PSS-170, PSS-270]
	* YM2423 (OPLL-X)
	* YMF281 (OPLLP)
	* DS1001 (Konami 053982/VRC7) [1991: Famicom cartridge Lagrange Point]
* ymfm_opq.h:
	* YM3806 (OPQ) [synths: PSR-60/70]
* ymfm_opz.h:
	* YM2414 (OPZ) [1987: synths: TX81Z, DX11, YS200; Korg Z3 guitar synth]

There are some obviously-related chips that also are on my horizon but have no implementation as yet:

* YMW-258-F 'GEW8' (aka Sega 315-5560 aka Sega Multi-PCM)
* YMF271 (OPX)
* YM21280 (OPS) / YM21290 (EGS) [synths: DX7, DX1, DX5, DX9, TX7, TX216, TX416, TX816]
* OPK?

## History

These cores were originally written during the summer and fall of 2020 as part of the [MAME](https://mamedev.org/) project.
As such, their design started off heavily based on how MAME works.

The OPM/OPN cores first appeared in MAME 0.230.
The OPL cores were added in MAME 0.231.
A further rewrite to abstract MAME dependencies is planned for MAME 0.232.

The goal was threefold:
1. provide BSD-licensed emulation cores that are more compatible with MAME's core licensing
1. modernize and unify the code around a common implementation of shared features
1. improve accuracy where possible based on discoveries made by others

## Accuracy

The goal of these cores is not 100% digital accuracy.
To achieve that would require full emulation of the pipelines, which would make the code extremely difficult to comprehend.
It would also make it much harder to share common implementations of features, or to add support for less well-known chip types.
If you want that level of accuracy, there are [several](https://github.com/nukeykt/Nuked-OPN2) [decap-based](https://github.com/nukeykt/Nuked-OPM) [emulation cores](https://github.com/nukeykt/Nuked-OPLL) out there.

Instead, the main goals are:
1. Extremely high (audibly indistinguishable) accuracy
1. Reasonable performance
1. Clean design with readable code
1. Clear documentation of the various chips

## General approach

Check out the [examples directory](https://github.com/aaronsgiles/ymfm/tree/main/examples) for some example usage patterns.
I'm not a big fan of makefiles for simple things, so instructions on how to compile each example are provided at the top.

# IMPORTANT

As of May 2021, the interface to these is still a bit in flux.
Be prepared when syncing with upstream to make some adjustments.

### Clocking

The general philosophy of the emulators provided here is that they are clock-independent.
Much like the actual chips, you (the consumer) control the clock; the chips themselves have no idea what time it is.
They just tick forward each time you ask them to.

The way you move things along is via the `generate()` function, which ticks the internal system forward one or more samples, and writes out an array out chip-specific `output_data`.
But what, exactly, is a "sample", and how long is it?

This is where the external clock comes in.
Most of the Yamaha chips are externally clocked in the MHz range.
They then divide that clock by a factor (sometimes dynamically controllable), and then the internal operators are pipelined to further divide the clock.

For example, the YM2151 internally divides the clock by 2, and has 32 operators to iterate through.
Thus, for a nominal input lock of 3.58MHz, you end up at around a 55.9kHz sample rate.
Fortunately, all the chip implementations can compute this for you; just pass the raw external clock value to the `sample_rate()` method and it will hand you back the output sample rate you want.

Then call `generate()` that many times per second to output the results.

But what if I want to output at a "normal" rate, like 44.1kHz?
Sorry, you'll have to rate convert as needed.

### Reading and Writing

To read or write to the chips, you can call the `read()` and `write()` methods.
The offset provided corresponds to the addressing input lines in a (hopefully) logical way.

For reads, almost all chips have a status register, which you can read via `read_status()`.
Some chips have a data port that can be read via `read_data()`.
And chips with extended addressing may also have `read_status_hi()` and `read_data_hi()`.

For writes, almost all chips have an address register and a data register, and so you can reliably count on there being a `write_address()` and `write_data()` method as well.
If the chip supports extended addressing, it may also have `write_address_hi()` and `write_data_hi()`.
