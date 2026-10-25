import test from 'node:test';
import assert from 'node:assert/strict';
import { readFleetJson } from '../../src/lib/client/fleetRead.ts';

for (const phase of ['headers', 'body']) {
  test(`deadline releases a stalled ${phase} read and allows recovery`, async () => {
    const original = globalThis.fetch;
    let aborted = false;
    globalThis.fetch = async (_url, {signal}) => {
      const stalled = () => new Promise((_, reject) => signal.addEventListener('abort', () => {
        aborted = true; reject(new DOMException('Aborted','AbortError'));
      }, {once:true}));
      return phase === 'headers' ? stalled() : {ok:true,json:stalled};
    };
    try {
      const signal = new AbortController().signal;
      await assert.rejects(readFleetJson('/api/org/fleet',signal,15), /timed out/);
      assert.equal(aborted,true);
      globalThis.fetch = async () => ({ok:true,json:async()=>({live:2})});
      assert.deepEqual(await readFleetJson('/api/org/fleet',signal,15),{live:2});
    } finally {globalThis.fetch=original;}
  });
}

test('unmount cancellation stays distinct from a deadline', async () => {
  const original=globalThis.fetch;
  const caller=new AbortController();
  globalThis.fetch=async (_url,{signal})=>({ok:true,json:()=>new Promise((_,reject)=>{
    signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
    queueMicrotask(()=>caller.abort());
  })});
  try {
    await assert.rejects(readFleetJson('/api/org/fleet',caller.signal,100),{name:'AbortError'});
  } finally {globalThis.fetch=original;}
});
