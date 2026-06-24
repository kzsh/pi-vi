# pi-vi

Vim modal editing for the [pi](https://github.com/earendil-works/pi-mono) coding agent input editor.

## Modes

| Mode | Indicator | How to enter |
|------|-----------|-------------|
| Insert | `INSERT` | `i`, `a`, `I`, `A`, or start of session |
| Normal | `NORMAL` | `Esc` from Insert |

The current mode is shown in the editor's bottom border. In Normal mode, a count or pending operator appears as `[3d]` next to the label.

## Motions

### Navigation

| Key | Motion |
|-----|--------|
| `h` / `l` | left / right |
| `j` / `k` | down / up |
| `w` / `W` | word forward |
| `b` / `B` | word backward |
| `e` / `E` | end of word |
| `0` / `^` | line start |
| `$` | line end |
| `gg` | buffer start |
| `G` | buffer end |

All navigation keys accept a count prefix: `5j`, `3w`, etc.

### Insert mode entry

| Key | Action |
|-----|--------|
| `i` | insert before cursor |
| `a` | append after cursor |
| `I` | insert at line start |
| `A` | append at line end |

### Operators

Combine with a motion: `d{motion}`, `c{motion}`, `y{motion}`.

| Operator | Effect |
|----------|--------|
| `d` | delete |
| `c` | change (delete + Insert mode) |
| `y` | yank |

Examples: `dd`, `dw`, `d$`, `dG`, `3dw`, `cc`, `cw`, `yy`, `yw`, `y$`.

### Single-key commands

| Key | Action |
|-----|--------|
| `x` / `X` | delete char forward / backward |
| `D` | delete to line end |
| `C` | change to line end |
| `s` / `S` | substitute char / line |
| `r{char}` | replace n chars |
| `p` / `P` | paste from kill ring |
| `u` | undo |
| `Ctrl+D` / `Ctrl+U` | scroll down / up |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
