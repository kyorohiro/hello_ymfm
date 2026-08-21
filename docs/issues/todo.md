YM2612Synth - Missing Features Memo
===================================

現在の YM2612Synth は、通常のFM音色を鳴らすための
最小限のレジスタ操作だけを実装している。

現在実装済み
------------

Operator:
- DT    : Detune
- MULTI : Frequency Multiple
- TL    : Total Level
- AR    : Attack Rate
- D1R   : First Decay Rate
- D2R   : Second Decay Rate
- SL    : Sustain Level
- RR    : Release Rate

Channel:
- ALG   : Algorithm
- FB    : Feedback
- PAN   : Left / Right
- BLOCK
- FNUM
- Key On / Key Off

Transport:
- DirectTransport
- AudioWorkletTransport


不足している主な機能
====================


1. KS (Key Scale / Key Scaling)
-------------------------------

OperatorごとのEnvelope速度を鍵盤位置に応じて変化させる。

Register:
0x50 - 0x5F

現在は AR のみ書いている。

bit 7-6 : KS
bit 4-0 : AR

現在:

    value = AR

必要:

    value = (KS << 6) | AR

範囲:

    KS = 0..3

DEFAULT_OPERATOR_STATE に ks を追加する。


2. AM Enable
------------

OperatorごとにLFOのAmplitude Modulationを有効/無効にする。

Register:
0x60 - 0x6F

現在は D1R のみ書いている。

bit 7   : AM Enable
bit 4-0 : D1R

現在:

    value = D1R

必要:

    value = (AM << 7) | D1R

setOperator() に am を追加する。


3. SSG-EG
---------

OperatorごとのSSG Envelope Generator。

Register:
0x90 - 0x9F

主な設定:

- Enable
- Attack
- Alternate
- Hold

YM2612/OPN系特有のEnvelope表現に使用する。

現在は0x90系レジスタを一切操作していない。


4. LFO
------

チップ全体のLow Frequency Oscillator設定。

Register:
0x22

設定:

- LFO Enable
- LFO Frequency

LFO Frequency:
0..7

現在はLFO自体を有効化するAPIがない。


5. AMS
------

Amplitude Modulation Sensitivity。

ChannelごとにLFOによる音量変調の深さを設定する。

Register:
0xB4 - 0xB6

現在は同レジスタの

- Left
- Right

だけを使用している。

0xB4:

bit 7 : Left
bit 6 : Right
bit 5-4 : AMS
bit 2-0 : FMS

現在はAMS/FMSを常に0として書いている。


6. FMS
------

Frequency Modulation Sensitivity。

ChannelごとにLFOによる周波数変調の深さを設定する。

Register:
0xB4 - 0xB6

範囲:

FMS = 0..7

AMSと同じレジスタなので、
setPan()だけで管理するよりChannel Stateとして

- left
- right
- ams
- fms

をまとめて保持した方がよい。


7. DAC
------

YM2612 Channel 6 のDAC機能。

Register:

0x2A : DAC Data
0x2B : DAC Enable

必要になりそうなAPI:

setDACEnabled(enabled)
writeDAC(value)

PCM再生/VGM再生では重要。

通常のFM Synthだけなら後回しでもよい。


8. Channel 3 Special Mode
-------------------------

Channel 3の各Operatorを別々の周波数で動かす特殊モード。

通常はChannel単位で1つのBLOCK/FNUMを持つが、
Special ModeではOperatorごとに異なる周波数を設定できる。

関連Register:

0x27
0xA8 - 0xAE

かなりYM2612らしい特殊機能だが、
通常のSynth用途では後回しでよい。


9. Timer A / Timer B
--------------------

YM2612内蔵Timer。


10. docs/synth: TFI向けUIの整理
------------------------------

現在の `docs/synth` は TFI の import/export 自体はできるが、
TFI を編集するUIとしてはまだ不完全。

残っている主な作業:

- `RS` (Rate Scaling) をUIから直接編集できるようにする
- `SSG-EG` をUIから直接編集できるようにする
- 現在の `D2R` 表示を `SR` もしくは `SR/D2R` に見直す

補足:

- TFIの `SR` は YM2612 の `0x70` register に対応する
- 今の synth UI では学習向けに `D2R` と呼んでいる
- register 的には同じ場所なので、名称の整理が必要

関連Register:

0x24
0x25
0x26
0x27

ゲーム側から単純にSynthとして利用する場合は
ほぼ不要。

VGM互換やチップ機能の完全性を目指す場合に検討。


10. CSM Mode
------------

Channel 3 / Timer A と関連する特殊モード。

Register:
0x27

通常のWeb Synth用途では優先度はかなり低い。


実装優先順位
============

Priority A - 普通のFM Synthとして欲しい

1. KS
2. AM Enable
3. LFO
4. AMS
5. FMS
6. SSG-EG


Priority B - YM2612固有機能

7. DAC
8. Channel 3 Special Mode


Priority C - チップ完全性 / VGM用途

9. Timer A / Timer B
10. CSM


現在の位置付け
==============

YM2612Synth は現在、

「YM2612の全機能を抽象化するライブラリ」

ではなく、

「YM2612のレジスタ構造が読める状態を維持しながら、
ブラウザ/ゲームからFM Synthとして扱うための薄いLayer」

として設計している。

そのため、すべての機能を一度に抽象化する必要はない。

Karakuriシリーズなどで段階的に追加してもよい。

Karakuri -001:
Basic Operator / Envelope / Algorithm

Karakuri -002:
KS / LFO / AM / AMS / FMS

Karakuri -003:
SSG-EG

Karakuri -004:
Channel 3 Special Mode

Karakuri -005:
DAC / PCM
