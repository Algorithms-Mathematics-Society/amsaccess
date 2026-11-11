import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as rules from '../../src/lib/teamSetup.ts';
const uid='3fbf9cee-8b6e-4872-947f-c52b46bb572e';
function compile(path, modules) {
 const source=readFileSync(new URL('../../src/'+path,import.meta.url),'utf8');
 const context={exports:{},Request,Response,File,FormData,AbortController,Number,Error,JSON,require(name){if(name==='next/server')return {NextResponse:{json:(data,options)=>({data,...options})}}; if(name in modules)return modules[name]; throw Error(name);}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return context.exports;
}
test('server access rejects unauthenticated, intern and unknown roles before operations',async()=>{
 for(const [subject,role,expected] of [[null,'owner',401],['staff','intern',403],['staff','unexpected',403],['staff','admin',null]]){
  let calls=0;
  const route=compile('lib/server/teamAccess.ts',{'./session':{requireSubject:async()=>subject},'./amsApi':{callAmsApi:async()=>{calls++;return {ok:true,data:{role}}}},'../teamSetup':rules});
  const value=await route.teamAccess();
  if(expected)assert.equal(value.status,expected);else assert.equal(value,'staff');
  if(!subject)assert.equal(calls,0);
 }
});
test('team proxy enforces target/action validation and preserves backend conflicts',async()=>{
 const calls=[];
 const route=compile('app/api/org/contests/[uid]/team-round/[[...action]]/route.ts',{'@/lib/server/teamAccess':{teamAccess:async()=>'staff'},'@/lib/teamSetup':rules,'@/lib/server/amsApi':{callAmsApi:async(...args)=>{calls.push(args);return {ok:false,status:409,data:{detail:'already published'}}},errorMessage:d=>d.detail}});
 const ctx=action=>({params:Promise.resolve({uid,action})});
 assert.equal((await route.POST(new Request('https://test',{method:'POST'}),ctx(['unpublish']))).status,404);
 assert.equal(calls.length,0);
 const request=new Request('https://test',{method:'POST',body:JSON.stringify({source_contest_uid:uid,take:136,method:'snake',reset:false})});
 const result=await route.POST(request,ctx(['seed']));
 assert.equal(result.status,409);assert.equal(result.data.error,'already published');assert.equal(result.headers['Cache-Control'],'no-store');
 assert.equal(calls[0][1],`/contests/${uid}/team-round/seed`);
 assert.equal(calls[0][2].take,136);
});
test('project upload cannot forward extra form fields or unsupported paths',async()=>{
 let forwarded;
 const route=compile('app/api/org/projects/[[...action]]/route.ts',{'@/lib/server/teamAccess':{teamAccess:async()=>'staff'},'@/lib/teamSetup':rules,'@/lib/server/boundedUpload':{boundedForm:r=>r.formData()},'@/lib/server/amsApi':{uploadToAmsApi:async(path,form)=>{forwarded={path,form};return {ok:true,status:200,data:{name:'test'}}},errorMessage:String}});
 const form=new FormData();form.set('package',new File(['fixture'],'sample.cxxpkg'));form.set('subject','another-user');
 const result=await route.POST(new Request('https://test',{method:'POST',body:form}),{params:Promise.resolve({action:['inspect']})});
 assert.equal(result.status,200);assert.equal(forwarded.path,'/projects/inspect');assert.deepEqual([...forwarded.form.keys()],['package']);
});
