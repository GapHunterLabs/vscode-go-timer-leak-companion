/**
 * Pure text scanner -- no `vscode` dependency. Ported from the
 * IntelliJ-family go-timer-leak-companion's SelectTimeAfterScanner
 * (already regex/brace-depth-only, zero PSI or Go-plugin dependency
 * in the original -- works whether or not a Go language extension is
 * installed).
 *
 * Flags `case <-time.After(...)` inside a `select { ... }` block --
 * Go's documented behavior: the Timer created by `time.After` is not
 * recovered by the garbage collector until it fires, and a `select`
 * inside any repeatedly-executed loop (the overwhelmingly common
 * place a `select` appears) creates a new one on every iteration,
 * leaking memory until each one's duration elapses.
 * `time.NewTimer(...)` + a deferred/explicit `.Stop()` is the
 * documented, correct alternative.
 *
 * v0.1 scope, honestly noted: plain-text brace/keyword scanning, not
 * real Go parsing -- flags `time.After(` as a select case regardless
 * of whether the enclosing select is itself inside a loop, since
 * that's the overwhelmingly common shape and reliably detecting
 * "inside a loop" via text alone across nested braces would be
 * unreliably fragile. A select that only runs once is a rare,
 * low-cost false positive.
 */

export interface Hit {
  line: number; // 1-based
}

const SELECT_OPEN = /\bselect\s*\{/;
const CASE_TIME_AFTER = /^\s*case\s+.*<-\s*time\.After\(/;

function braceDelta(line: string): number {
  return (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);
}

export function scan(text: string): Hit[] {
  const hits: Hit[] = [];
  let selectDepth = 0;
  let braceDepthAtSelectEntry = 0;
  let currentDepth = 0;

  text.split('\n').forEach((line, index) => {
    if (selectDepth === 0 && SELECT_OPEN.test(line)) {
      selectDepth = 1;
      braceDepthAtSelectEntry = currentDepth + braceDelta(line);
      currentDepth = braceDepthAtSelectEntry;
      return;
    }

    if (selectDepth > 0) {
      if (CASE_TIME_AFTER.test(line)) {
        hits.push({ line: index + 1 });
      }
      currentDepth += braceDelta(line);
      if (currentDepth < braceDepthAtSelectEntry) {
        selectDepth = 0;
      }
    } else {
      currentDepth += braceDelta(line);
    }
  });

  return hits;
}
