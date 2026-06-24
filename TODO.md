# TODO

## `.` — repeat last change

Doable without any new API. Record the last `(op, motion, count)` tuple (and for
insert-mode changes, the inserted text) in memory and replay it.

---

## `f{char}` / `F{char}` — find char on line

Blocked by: no buffer read access in the pi extension API. Once pi exposes the
ability to read the current buffer content, `f/F/t/T` and `;/,` follow naturally.

---

## Visual selection (`v` / `V`)

Blocked by: no selection primitive in the pi extension API. Once available, this
unlocks visual operators (`d`, `c`, `y`) and text objects (`ciw`, `ca"`, `da{`, etc.).
