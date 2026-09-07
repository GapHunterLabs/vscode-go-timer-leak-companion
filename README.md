# Go Timer Leak Companion (VS Code)

Flags `case <-time.After(...)` inside a `select` block — the Timer
isn't garbage-collected until it fires, leaking on every loop
iteration. No data leaves your editor.

**v0.1, pilot.** Part of the Gap Hunter Labs VS Code workstream,
ported from the IntelliJ-family `go-timer-leak-companion`. No
dedicated turnkey VS Code equivalent found — general static analysis
tools exist, but nothing specific to this exact `select`/`time.After`
shape as a zero-config linter. Works whether or not you have a Go
language extension installed — pure text scanning, no Go parser
dependency.

## What it does

Go's own documented behavior: the Timer created by `time.After` is
not recovered by the GC until it fires. A `select` inside any
repeatedly-executed loop (the overwhelmingly common place a `select`
appears) creates a new one every iteration, leaking memory until each
one's duration elapses. `time.NewTimer(...)` plus a deferred/explicit
`.Stop()` is the documented, correct alternative — flagged live as you
edit any `.go` file.

**v0.1 scope, honestly noted:** plain-text brace/keyword scanning, not
real Go parsing — flags `time.After(` as a select case regardless of
whether the enclosing `select` is itself inside a loop (reliably
detecting "inside a loop" via text alone across nested braces would be
unreliably fragile). A `select` that only runs once is a rare,
low-cost false positive.

## Privacy

See [PRIVACY.md](PRIVACY.md) — zero network calls, everything runs
against files already open in your editor.

## Development

```bash
npm install
npm run compile   # or: npm run watch
npm test
```

To build an installable package without publishing:

```bash
npx @vscode/vsce package
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
