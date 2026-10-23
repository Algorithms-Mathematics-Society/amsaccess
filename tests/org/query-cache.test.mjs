import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrgQueryCache } from '../../src/lib/client/orgQueryCache.ts';
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };

test('concurrent readers share one request and retain data during a failed refresh', async () => {
  const cache=createOrgQueryCache(); let calls=0; const read=deferred();
  const a=cache.load('list',()=>{calls++;return read.promise;});
  const b=cache.load('list',()=>{calls++;return Promise.resolve('wrong');});
  assert.equal(a,b); await Promise.resolve(); assert.equal(calls,1);
  read.resolve(['first']); await a;
  cache.invalidate('list'); const next=deferred(); const refresh=cache.load('list',()=>next.promise);
  assert.deepEqual(cache.snapshot('list').data,['first']);
  next.reject(new Error('offline')); await refresh;
  assert.deepEqual(cache.snapshot('list').data,['first']);
  assert.equal(cache.snapshot('list').error,'offline'); assert.equal(cache.snapshot('list').refreshing,false);
});

test('invalidation prevents an old response overwriting a newer post-edit read', async () => {
  const cache=createOrgQueryCache(), old=deferred(), fresh=deferred();
  const a=cache.load('/contests',()=>old.promise);
  cache.invalidate('/contests'); const b=cache.load('/contests',()=>fresh.promise);
  fresh.resolve('new'); await b; old.resolve('old'); await a;
  assert.equal(cache.snapshot('/contests').data,'new');
});

test('completion of invalidated request cannot delete the newer in-flight request', async () => {
  const cache=createOrgQueryCache(), old=deferred(), fresh=deferred();
  const a=cache.load('key',()=>old.promise); cache.invalidate('key');
  const b=cache.load('key',()=>fresh.promise); old.resolve('old'); await a;
  assert.equal(cache.load('key',()=>Promise.resolve('wrong')),b);
  fresh.resolve('fresh'); await b; assert.equal(cache.snapshot('key').data,'fresh');
});

test('account reset clears data and prevents late requests from restoring prior account data', async () => {
  const cache=createOrgQueryCache(), old=deferred();
  await cache.load('other',()=>Promise.resolve('private'));
  const a=cache.load('profile',()=>old.promise); cache.clear();
  assert.equal(cache.snapshot('other').data,null);
  await cache.load('profile',()=>Promise.resolve('new account'));
  old.resolve('previous account'); await a;
  assert.equal(cache.snapshot('profile').data,'new account');
});

test('different keys remain isolated and prefix invalidation reaches archived catalogue', async () => {
  const cache=createOrgQueryCache();
  await cache.load('/contests',()=>Promise.resolve('current'));
  await cache.load('/contests?archived=1',()=>Promise.resolve('archived'));
  await cache.load('/problems',()=>Promise.resolve('problems'));
  const prior=cache.snapshot('/problems');
  cache.invalidate('/contests');
  assert.equal(cache.snapshot('/contests').at,0);
  assert.equal(cache.snapshot('/contests?archived=1').at,0);
  assert.equal(cache.snapshot('/problems'),prior);
});
