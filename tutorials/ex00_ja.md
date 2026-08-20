# Prepare

```sh
brew install emscriten
```

# YM2612 について

```text
http://www.chipdir.nl/pinusr/ym2612.txt


    +--()--+
GND | 1  24| 0M(CLK)
 D0 | 2  23| Vcc
 D1 | 3  22| A.Vcc
 D2 | 4  21| MOL
 D3 | 5  20| MOR
 D4 | 6  19| A.GND
 D5 | 7  18| A1
 D6 | 8  17| A0
 D7 | 9  16| /RD
  ? |10  15| /WR
/IC |11  14| /CS
GND |12  13| /IRQ
    +------+
```

## ピンの概要

- `GND`: デジタル側の ground
- `A.GND`: 音声出力まわりのアナログ側 ground
- `Vcc`: デジタル側の電源
- `A.Vcc`: 音声出力まわりのアナログ側電源
- `0M (CLK)`: マスタークロック入力

- `MOL`: 左音声出力ピン
- `MOR`: 右音声出力ピン

- `D0-D7`: 8-bit 双方向データバス
- `A0`: アドレス選択ピン
- `A1`: アドレス選択ピン

- `/RD`: 読み取り信号 active low
- `/WR`: 書き込み信号 active low
- `/CS`: チップ選択信号 active low
- `/IRQ`: 割り込み要求信号 active low
- `/IC`: リセット信号 active low

- `Pin 10`: 通常用途では未使用
  資料によっては `NC`、別資料では `TEST` ピンとされています。

## A0 と A1

`A0` と `A1` は、どの制御ポートにアクセスするかを選びます。
address/data の切り替えと、port 0 / port 1 の切り替えに使います。

- `A1=0, A0=0`: address port 0
- `A1=0, A0=1`: data port 0
- `A1=1, A0=0`: address port 1
- `A1=1, A0=1`: data port 1

## `chip.write()` と YM2612 のピンの対応

`void ym2612::write(uint32_t offset, uint8_t data)` は、YM2612 のアクセス方法を単純化したものです。

- `offset`: `A1` と `A0` で選ばれるアクセス先に対応
- `data`: `D0-D7` に乗る 8-bit の値に対応

対応表:

- `offset = 0`: `A1=0, A0=0` -> address port 0
- `offset = 1`: `A1=0, A0=1` -> data port 0
- `offset = 2`: `A1=1, A0=0` -> address port 1
- `offset = 3`: `A1=1, A0=1` -> data port 1

例:

```cpp
chip.write(0, 0x30);
chip.write(1, 0x01);
```

これは次の意味です。

1. address port 0 でレジスタ `0x30` を選ぶ
2. data port 0 から、そのレジスタに `0x01` を書く

## よくある疑問

Q: なぜ `GND` と `A.GND` の2種類があるの?

A: YM2612 にはデジタル回路とアナログ回路があります。
アナログ回路は音声出力に使われるので、`A.Vcc` と `A.GND` は `MOL` と `MOR` の後ろにある音声出力回路のために分けられています。

Q: なぜ `/CS` が必要なの?

A: `/CS` は「今のバスアクセスは YM2612 宛てです」と伝える信号です。
これがないと、同じバス上の複数のチップが同時に反応する可能性があります。

Q: `/IRQ` は何に使うの?

A: `/IRQ` は、主に YM2612 の内部タイマーイベントが起きたことを CPU に知らせるために使われます。

Q: `/RD` と `/WR` は何?

A: `/RD` と `/WR` はデータ線ではなく制御信号です。
実際のデータは `D0-D7` を通ります。

Q: `D0-D7` は何をするの?

A: `D0-D7` は 8-bit のデータピンです。
CPU と YM2612 の間でデジタルデータをやり取りします。

Q: `/IC` は何に使うの?

A: `/IC` はリセット信号です。
チップを初期化して、レジスタをクリアします。

## 参考資料

- http://www.chipdir.nl/pinusr/ym2612.txt
- https://www.vgmpf.com/Wiki/index.php?title=YM2612
- https://gendev.spritesmind.net/forum/viewtopic.php?start=585&t=386

# YM2612 で Beep を鳴らす

この章では `ex03_beep.cpp` で使っている最小構成を整理します。

目的は、まず「良い音色を作ること」ではなく、
「YM2612 に何をすると beep が鳴るのか」を理解することです。

## やっていること

手順は次の通りです。

1. `ym2612` のオブジェクトを作る
2. `reset()` する
3. channel 1 の operator を設定する
4. algorithm と左右出力を設定する
5. 周波数を設定する
6. `Key ON` する
7. サンプルを生成する

## channel と operator

YM2612 には 6 個の FM channel があります。
各 channel には 4 個の operator があります。

operator は小さな音の発生器です。
operator 同士を変調に使うこともできるし、そのまま最終出力に混ぜることもできます。

`ex03_beep.cpp` では channel 1 を使っています。

FM 音源では、基本的に 1 つの channel を 4 つの operator で構成します。
そのため、`0x30-0x3c` のようにアドレス範囲に幅があるのは、
4 個の operator 分の設定が並んでいるためです。

## なぜ Algorithm 7 なのか

Algorithm 7 では、4 個の operator がすべて carrier として動きます。
すべてが直接出力に行くので、最初の理解用として分かりやすいです。

唯一の方法ではありませんが、最初の beep には向いています。

## `chip.reset()` は何に対応するのか

`chip.reset()` は、実チップの `/IC` をアサートして初期化するのに近い動きです。
ただし `ymfm` では `/IC` ピンをそのままエミュレートしているわけではなく、
内部の YM2612 状態を直接リセットしています。

## `ex03_beep.cpp` で使うレジスタ

各レジスタ書き込みは、次の 2 段階です。

1. address port にレジスタ番号を書く
2. data port に値を書く

例:

```cpp
chip.write(0, 0x30);
chip.write(1, 0x01);
```

これは、

1. レジスタ `0x30` を選ぶ
2. レジスタ `0x30` に `0x01` を書く

という意味です。

### 全体の見取り図

- `0x30-0x3c`: operator の detune と multiple
- `0x40-0x4c`: operator の total level
- `0x50-0x5c`: operator の attack rate
- `0x80-0x8c`: operator の sustain level と release rate
- `0xb0`: channel の algorithm と feedback
- `0xb4`: 左右出力の有効化
- `0xa4` と `0xa0`: 周波数
- `0x28`: key on / key off

### 1. DT / MULTI

これらのレジスタは、各 operator の detune と frequency multiple を設定します。

- `0x30`, `0x34`, `0x38`, `0x3c`

`ex03_beep.cpp` では、すべて `0x01` を設定しています。

何が起きるか:

- detune はほぼ小さいまま
- multiple は `1`
- 4 個の operator を単純な周波数関係で始めている

補足:

- `Detune (DT)` は音程をわずかにずらすための設定です
- `Multiple (MUL)` は周波数を 1 倍、2 倍、3 倍... のように大きく変える設定です
- `MUL=2` なら基本音の約 1 オクターブ上、`MUL=4` なら約 2 オクターブ上に相当します
- FM では、この倍音関係が音色の性格に強く効きます

### 2. Total Level

これらのレジスタは、各 operator の出力レベルを設定します。

- `0x40`, `0x44`, `0x48`, `0x4c`

`ex03_beep.cpp` では、operator 4 だけを大きくしています。

- `0x40 = 0x7f`
- `0x44 = 0x7f`
- `0x48 = 0x7f`
- `0x4c = 0x00`

何が起きるか:

- operator 1-3 はほぼ無音
- operator 4 は大きい
- 単純な beep として理解しやすくなる

補足:

- `Total Level (TL)` は operator の最終的な出力音量です
- carrier の TL を下げると、直接聞こえる音量が小さくなります
- modulator の TL を下げると、音のギラつきや派手さが減って丸い音になります

### 3. Attack Rate

これらのレジスタは、音がどれだけ速く立ち上がるかを設定します。

- `0x50`, `0x54`, `0x58`, `0x5c`

`ex03_beep.cpp` では、すべて `0x1f` です。

何が起きるか:

- 音が素早く立ち上がる
- 短くてはっきりした beep に聞こえやすい

補足:

- `Attack Rate (AR)` は Key On 後に最大音量へ達するまでの速さです
- 値を大きくすると「ピシッ」と速く立ち上がります
- 値を小さくすると、ゆっくり立ち上がる柔らかい音になります

### 4. Sustain / Release 周辺

これらのレジスタは、エンベロープ設定の一部です。

- `0x80`, `0x84`, `0x88`, `0x8c`

`ex03_beep.cpp` では、すべて `0x0f` です。

何が起きるか:

- エンベロープを単純なままにしている
- まだ複雑な楽器音は目指していない

補足:

- `Sustain Level (SL)` は decay の後に保たれる音量レベルです
- `Release Rate (RR)` は Key Off 後に音が消えるまでの速さです
- `RR` を大きくすると、鍵盤を離した後すぐに音が消えます
- `RR` を小さくすると、余韻が長く残ります

### 5. Algorithm

- `0xb0 = 0x07`

これは channel 1 に Algorithm 7 を設定しています。

何が起きるか:

- 4 個の operator がすべて carrier として動く
- 深い変調チェーンではなく、そのまま出力に行く

補足:

- `Algorithm (ALG)` は 4 個の operator をどうつなぐかを決めます
- 接続のしかたによって、ベース向き、ベル向き、オルガン向きのような性格が変わります
- `0xb0` には `Feedback (FB)` も入ります
- `Feedback` は operator の出力を自分自身に戻す量で、強くするとノイズっぽさや鋭さが増します

### 6. 左右出力

- `0xb4 = 0xc0`

これは left と right の両方の出力を有効にしています。

何が起きるか:

- 音が `MOL` と `MOR` の両方に送られる
- 左右両方から beep が聞こえる

補足:

- このレジスタは `PAN` の役割も持っています
- 左だけ、右だけ、両方のどこに出すかを選べます
- 左右両方を有効にすると、中央に定位したように聞こえます

### 7. Frequency

- `0xa4 = 0x22`
- `0xa0 = 0x69`

この 2 つのレジスタで音程を設定します。

何が起きるか:

- channel に 1 つの音程が設定される
- ここを変えると beep の高さが変わる

補足:

- ここは YM2612 の音高を決めるメインレジスタです
- `0xa4` 側に `BLOCK` などの上位情報
- `0xa0` 側に `F-Number` の下位情報が入り
- 2 つを組み合わせて最終的な音程を決めます

### 8. Key ON

- `0x28 = 0xf0`

これは channel 1 の operator 1-4 を ON にしています。

何が起きるか:

- 音が鳴り始める
- これを書かないと、設定しただけでは音は始まらない

補足:

- `0x28` は実際の発音トリガーです
- ここに channel 番号と、どの operator を有効にするかのビットを書きます
- Key On で発音開始、Key Off で消音フェーズに入ります

## レジスタごとの見方

- `0x30`, `0x34`, `0x38`, `0x3c`
  channel 1 の各 operator の detune / multiple 設定
- `0x40`, `0x44`, `0x48`, `0x4c`
  各 operator の音量設定
- `0x50`, `0x54`, `0x58`, `0x5c`
  各 operator の attack 設定
- `0x80`, `0x84`, `0x88`, `0x8c`
  sustain level と release rate 設定
- `0xb0`
  channel の algorithm 設定
- `0xb4`
  左右出力の有効化
- `0xa4`, `0xa0`
  音程の設定
- `0x28`
  key on / key off のトリガ

## コードをレジスタ辞書として読む

YM2612 をもう一段深く理解して、自分で設定を書けるようになりたい場合は、
`ymfm` のソースコードをそのまま読むのがかなり有効です。

このリポジトリでは、`src/ymfm_opn.h:209` がレジスタ辞書としてとても役に立ちます。

特に次の行が分かりやすいです。

- `src/ymfm_opn.h:221`
  `0x30` 系 -> `op_detune`, `op_multiple`
- `src/ymfm_opn.h:223`
  `0x40` 系 -> `op_total_level`
- `src/ymfm_opn.h:224`
  `0x50` 系 -> `op_ksr`, `op_attack_rate`
- `src/ymfm_opn.h:229`
  `0x80` 系 -> `op_sustain_level`, `op_release_rate`
- `src/ymfm_opn.h:210`
  `0xb0` -> `ch_feedback`, `ch_algorithm`
- `src/ymfm_opn.h:212`
  `0xb4` -> 左右出力 / pan 関連
- `src/ymfm_opn.h:209`
  `0xa4` + `0xa0` -> `ch_block_freq`

`0x28` の key on / key off の扱いは、`src/ymfm_opn.cpp:176` を読むと追えます。

`ex03_beep.cpp` の `write()` と、ここでの定義が頭の中でつながるようになると、
かなり自力で YM2612 の beep 設定を書ける段階に近づいています。

## 大事な考え方

beep は特別な 1 命令で出るわけではありません。

次の積み重ねで音になります。

- operator を設定する
- channel を設定する
- 周波数を設定する
- `Key ON` で発音を始める

## 自分で beep を書くときの考え方

1. どの channel を使う?
2. 4 個の operator をどう設定する?
3. どの algorithm を使う?
4. どの音程にする?
5. いつ `Key ON` / `Key OFF` を送る?

## 次の疑問

この beep 例を理解した後に自然に出てくる疑問は、たとえば次です。

- 各 operator は本当は何をしているのか?
- `0xa4` と `0xa0` は音名にどう対応するのか?
- `Key ON` と `Key OFF` の違いは何か?
- beep をどうやって楽器音にしていくのか?
