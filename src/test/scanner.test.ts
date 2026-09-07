import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../scanner';

test('scan flags time.After inside a select case', () => {
  const text = ['for {', '  select {', '  case <-time.After(time.Second):', '    doWork()', '  }', '}'].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 3);
});

test('scan does not flag time.After outside a select block', () => {
  const text = ['<-time.After(time.Second)'].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 0);
});

test('scan does not flag a select block using time.NewTimer instead', () => {
  const text = [
    'timer := time.NewTimer(time.Second)',
    'defer timer.Stop()',
    'select {',
    'case <-timer.C:',
    '  doWork()',
    '}',
  ].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 0);
});

test('scan stops tracking once the select block closes', () => {
  const text = [
    'select {',
    'case <-ch:',
    '}',
    'func other() {',
    '  x := 1',
    '}',
    '<-time.After(time.Second)', // outside any select -- not flagged
  ].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 0);
});

test('scan handles multiple select blocks independently', () => {
  const text = [
    'select {',
    'case <-time.After(time.Second):',
    '}',
    'select {',
    'case <-ch:',
    '}',
    'select {',
    'case <-time.After(time.Minute):',
    '}',
  ].join('\n');
  const hits = scan(text);
  assert.equal(hits.length, 2);
});
