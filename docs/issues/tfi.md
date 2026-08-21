# TFI Import Memo

Last updated: 2026-08-21

## Goal

- add a small shared TFI import helper under `web/`
- keep `YM2612Synth` as the readable YM2612-facing layer
- convert TFI operator order into logical operator `1..4`

## TFI and YM2612Synth correspondence

| TFI field | Bytes | YM2612 register | YM2612Synth field | Status |
| --- | --- | --- | --- | --- |
| algorithm | `0x00` | `0xb0` bits 2-0 | `algorithm` | supported |
| feedback | `0x01` | `0xb0` bits 5-3 | `feedback` | supported |
| multiplier | op + `0` | `0x30` bits 3-0 | `multi` | supported |
| detune | op + `1` | `0x30` bits 6-4 | `dt` | supported with conversion |
| total level | op + `2` | `0x40` | `tl` | supported |
| rate scaling | op + `3` | `0x50` bits 7-6 | `rs` | added |
| attack rate | op + `4` | `0x50` bits 4-0 | `ar` | supported |
| decay rate | op + `5` | `0x60` | `d1r` | supported |
| sustain rate | op + `6` | `0x70` | `d2r` / `sr` alias | supported |
| release rate | op + `7` | `0x80` bits 3-0 | `rr` | supported |
| sustain level | op + `8` | `0x80` bits 7-4 | `sl` | supported |
| SSG-EG | op + `9` | `0x90` | `ssg` | added |

## Operator order

TFI stores operator blocks in YM2612 physical slot order:

1. S1
2. S3
3. S2
4. S4

`YM2612Synth` public API uses logical operators:

1. O1
2. O2
3. O3
4. O4

So the import layer must remap:

```txt
TFI block 0 -> operator 1
TFI block 1 -> operator 3
TFI block 2 -> operator 2
TFI block 3 -> operator 4
```

## Detune conversion

TFI detune values are stored as:

```txt
0=-3, 1=-2, 2=-1, 3=0, 4=+1, 5=+2, 6=+3
```

YM2612 register detune uses another encoding:

```txt
0=+0, 1=+1, 2=+2, 3=+3, 4=-0, 5=-1, 6=-2, 7=-3
```

Current import conversion:

```txt
0 -> 7
1 -> 6
2 -> 5
3 -> 0
4 -> 1
5 -> 2
6 -> 3
```

## Current implementation

- shared parser: `web/tfi.js`
- docs-side re-export: `docs/js/tfi.js`
- verification: `scripts/verify_tfi_import.mjs`

## Notes

- this is import only for now
- export can be added later once the preset shape is stable enough
- `sr` is accepted as an alias, but current demos still use `d2r`
