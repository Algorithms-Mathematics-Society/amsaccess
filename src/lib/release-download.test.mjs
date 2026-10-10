import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRelease, fetchLatestRelease } from "./releases.ts";
import { downloadHref, parseDownloadIdentity, resolveDownload } from "./release-download.ts";
import { downloadOptions } from "../app/(marketing)/download/download-options.ts";
import { requirementsFor } from "./release-requirements.ts";

const repository = "Algorithms-Mathematics-Society/ams-access";
const asset = (name="Access_2.3.1_x64-setup.exe", id=10) => ({
  id, name, state:"uploaded", size:123456,
  digest:"sha256:"+"ab".repeat(32),
  browser_download_url:`https://github.com/${repository}/releases/download/v2.3.1/${name}`,
});
const raw = () => ({
  id:1,tag_name:"v2.3.1",name:"Internal release description must not be public",
  published_at:"2026-10-08T09:43:58Z",draft:false,prerelease:false,
  html_url:`https://github.com/${repository}/releases/tag/v2.3.1`,
  assets:[asset()],
});
const release = () => normalizeRelease(raw());
const identity = () => parseDownloadIdentity(new URL(downloadHref(release(),release().windows.exe,"windows","exe"),"https://app.example").searchParams);

test("round-trip binds displayed release, exact asset, filename, bytes and checksum", () => {
  const r=release(), expected=identity();
  assert.equal(resolveDownload(r,expected),r.windows.exe);
  assert.equal(expected.sha256,"ab".repeat(32));
  assert.equal(expected.filename,r.windows.exe.label);
});
test("new latest release cannot replace an installer from an open page", () => {
  assert.equal(resolveDownload({...release(),version:"v2.3.2",id:2},identity()),null);
});
test("recreated release with same tag is rejected", () => {
  assert.equal(resolveDownload({...release(),id:2},identity()),null);
});
test("same-tag asset replacement or changed metadata fails closed", () => {
  for (const field of ["id","size","label","sha256","architecture"]) {
    const r=release();r.windows.exe[field]=typeof r.windows.exe[field]==="number"?99:"changed";
    assert.equal(resolveDownload(r,identity()),null,field);
  }
});
test("missing file never resolves to another package", () => {
  assert.equal(resolveDownload({...release(),windows:{}},identity()),null);
});
test("architecture changes cannot receive a different binary", () => {
  assert.equal(resolveDownload(release(),{...identity(),architecture:"arm64"}),null);
});
test("malformed, duplicate, partial and unknown identity selectors are rejected", () => {
  const url=downloadHref(release(),release().windows.exe,"windows","exe");
  const original=new URL(url,"https://app.example").searchParams;
  for(const key of ["version","release","asset","filename","bytes","sha256","platform","type"]){
    const p=new URLSearchParams(original);p.delete(key);assert.equal(parseDownloadIdentity(p),null,key);
  }
  for(const [key,value] of [["release","0"],["bytes","-1"],["asset","1e2"],["asset","9007199254740992"],["filename","../evil.exe"],["filename","evil'$().exe"],["sha256","bad"],["architecture","mips"],["platform","__proto__"],["type","deb"]]){
    const p=new URLSearchParams(original);p.set(key,value);assert.equal(parseDownloadIdentity(p),null,key+"="+value);
  }
  const repeated=new URLSearchParams(original);repeated.append("asset","10");assert.equal(parseDownloadIdentity(repeated),null);
  const unknown=new URLSearchParams(original);unknown.set("url","https://evil.invalid");assert.equal(parseDownloadIdentity(unknown),null);
});
test("legacy unbound links require fresh selection", () => {
  assert.equal(parseDownloadIdentity(new URLSearchParams("platform=windows&type=exe")),null);
});
test("draft, prerelease, malformed release ID/date/tag are not public releases", () => {
  for(const change of [{draft:true},{prerelease:true},{id:0},{published_at:"bad"},{tag_name:"../../x"}])
    assert.equal(normalizeRelease({...raw(),...change}),null);
});
test("release URLs must refer to the exact repository and tag", () => {
  for(const url of ["https://evil.invalid/releases/tag/v2.3.1",`https://github.com/${repository}/releases/tag/v2.3.2`])
    assert.equal(normalizeRelease({...raw(),html_url:url}),null);
});
test("asset URLs require exact trusted tag and filename with no credentials/query/hash", () => {
  for(const change of [
    {browser_download_url:asset().browser_download_url.replace("v2.3.1","v2.3.2")},
    {browser_download_url:asset().browser_download_url+"?x=1"},
    {browser_download_url:asset().browser_download_url+"#x"},
    {browser_download_url:asset().browser_download_url.replace("github.com","github.com.evil.invalid")},
    {browser_download_url:asset().browser_download_url.replace("https://","https://user@")},
    {name:"different.exe"},{id:0},{state:"new"},{size:0},
  ]) assert.equal(normalizeRelease({...raw(),assets:[{...asset(),...change}]}).windows.exe,undefined);
});
test("duplicate asset identities are omitted, rather than picking arbitrarily", () => {
  assert.equal(normalizeRelease({...raw(),assets:[asset(),asset()]}).windows.exe,undefined);
});
test("a missing or malformed checksum is explicitly unavailable, not substituted", () => {
  for(const digest of [undefined,null,"sha256:bad","md5:"+"a".repeat(32)]){
    const r=normalizeRelease({...raw(),assets:[{...asset(),digest}]});
    assert.equal(r.windows.exe.sha256,undefined);
    const expected=parseDownloadIdentity(new URL(downloadHref(r,r.windows.exe,"windows","exe"),"https://app.example").searchParams);
    assert.equal(expected.sha256,"unavailable");
    assert.equal(resolveDownload(r,expected),r.windows.exe);
    assert.equal(resolveDownload(release(),expected),null);
  }
});
test("digests normalize to lowercase and release names never leak internal prose", () => {
  const r=normalizeRelease({...raw(),assets:[{...asset(),digest:"SHA256:"+"AB".repeat(32)}]});
  assert.equal(r.windows.exe.sha256,"ab".repeat(32));
  assert.equal(r.name,"v2.3.1");
});
test("all seven displayed installer options preserve complete integrity identity", () => {
  const names=["Access_2.3.1_x64-setup.exe","Access_2.3.1_x64_en-US.msi","Access_2.3.1_aarch64.dmg","Access_2.3.1_x64.dmg","Access_2.3.1_amd64.AppImage","Access_2.3.1_amd64.deb","Access-2.3.1.x86_64.rpm"];
  const r=normalizeRelease({...raw(),assets:names.map((n,i)=>asset(n,i+10))});
  const files=downloadOptions(r).flatMap(o=>[...o.files,...o.alternatives]);
  assert.equal(files.length,7);
  for(const f of files){
    const expected=parseDownloadIdentity(new URL(f.href,"https://app.example").searchParams);
    assert.equal(f.filename,expected.filename);assert.equal(f.bytes,expected.bytes);assert.equal(f.sha256,expected.sha256);
    assert(resolveDownload(r,expected));
  }
});
test("requirements never carry old minimums into an unreviewed version", () => {
  assert.equal(requirementsFor(release()),undefined);
  assert.equal(requirementsFor({...release(),version:"v9.0.0"}),undefined);
  const opts=downloadOptions({...release(),version:"v9.0.0"});
  assert(!opts.find(o=>o.id==="macos").requirement.includes("12"));
});
test("download-time metadata fetch is fresh and rejects failed/malformed responses", async () => {
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async(_url,init)=>{
      assert.equal(init.cache,"no-store");assert.equal(init.next,undefined);
      return new Response(JSON.stringify(raw()),{status:200});
    };
    assert.equal((await fetchLatestRelease({fresh:true})).version,"v2.3.1");
    globalThis.fetch=async()=>new Response("",{status:503});
    assert.equal(await fetchLatestRelease({fresh:true}),null);
    globalThis.fetch=async()=>new Response("not json");
    assert.equal(await fetchLatestRelease({fresh:true}),null);
  }finally{globalThis.fetch=original;}
});
