const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const DEFAULT_ROW_DEFS = [
  { keys: "1234567890", baseMidi: 67 },
  { keys: "qwertyuiop", baseMidi: 62 },
  { keys: "asdfghjkl", baseMidi: 57 },
  { keys: "zxcvbnm", baseMidi: 52 },
];

export function midiToNoteName(midi) {
  const note =
    NOTE_NAMES[
      ((midi % 12) + 12) % 12
    ];
  const octave =
    Math.floor(midi / 12) - 1;

  return `${note}${octave}`;
}

export function createPitchFromMidi(
  midi,
  {
    referenceMidi,
    referenceBlock,
    referenceFnum,
  }
) {
  let block = referenceBlock;
  let fnum =
    referenceFnum *
    Math.pow(
      2,
      (midi - referenceMidi) / 12
    );

  while (
    fnum >= 1024 &&
    block < 7
  ) {
    fnum /= 2;
    block += 1;
  }

  while (
    fnum < 512 &&
    block > 0
  ) {
    fnum *= 2;
    block -= 1;
  }

  return {
    block,
    fnum: Math.max(
      0,
      Math.min(
        0x7ff,
        Math.round(fnum)
      )
    ),
  };
}

export function createKeyLayout({
  rowDefs = DEFAULT_ROW_DEFS,
  referenceMidi,
  referenceBlock,
  referenceFnum,
}) {
  return rowDefs.flatMap((row) => {
    return Array.from(row.keys).map(
      (key, index) => {
        const midi =
          row.baseMidi + index;

        return {
          key,
          label: key.toUpperCase(),
          midi,
          noteName:
            midiToNoteName(midi),
          pitch: createPitchFromMidi(
            midi,
            {
              referenceMidi,
              referenceBlock,
              referenceFnum,
            }
          ),
          rowLength: row.keys.length,
        };
      }
    );
  });
}

export function findLayoutEntry(
  layout,
  key
) {
  return layout.find(
    (entry) => entry.key === key
  );
}

export function hasLayoutKey(
  layout,
  key
) {
  return layout.some(
    (entry) => entry.key === key
  );
}

export function buildKeyboard({
  root,
  rowDefs = DEFAULT_ROW_DEFS,
  layout,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
}) {
  root.innerHTML = "";

  for (const row of rowDefs) {
    const rowElement =
      document.createElement("div");

    rowElement.className =
      "key-row";
    rowElement.dataset.count =
      String(row.keys.length);

    for (const keyChar of row.keys) {
      const entry =
        findLayoutEntry(
          layout,
          keyChar
        );

      if (!entry) {
        continue;
      }

      const button =
        document.createElement(
          "button"
        );

      button.type = "button";
      button.className = "key";
      button.dataset.key =
        entry.key;
      button.innerHTML = `
        <strong>${entry.label}</strong>
        <span>${entry.noteName}</span>
        <small>b${entry.pitch.block} / f${entry.pitch.fnum}</small>
      `;

      button.addEventListener(
        "pointerdown",
        async (event) => {
          event.preventDefault();
          await onPointerDown?.(
            event,
            entry,
            button
          );
        }
      );

      button.addEventListener(
        "pointerup",
        (event) => {
          onPointerUp?.(
            event,
            entry,
            button
          );
        }
      );

      button.addEventListener(
        "pointercancel",
        (event) => {
          onPointerCancel?.(
            event,
            entry,
            button
          );
        }
      );

      rowElement.appendChild(
        button
      );
    }

    root.appendChild(
      rowElement
    );
  }
}
