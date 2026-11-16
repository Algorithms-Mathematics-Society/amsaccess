import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function compile(path, modules) {
 const source=readFileSync(new URL('../../src/'+path,import.meta.url),'utf8');
 class NextResponse{constructor(body,init){Object.assign(this,{body,...init});} static json(data,options){return {data,...options};}}
 const context={exports:{},Array,require(name){if(name==='next/server')return {NextResponse}; if(name in modules)return modules[name]; throw Error(name);}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return context.exports;
}
const load=(subject,res)=>compile('app/api/org/students/import/template.csv/route.ts',{'@/lib/server/session':{requireSubject:async()=>subject},'@/lib/server/amsApi':{callAmsApi:async()=>res,errorMessage:d=>d.detail}});
test('import template is a header-only CSV built from the API column list',async()=>{
 const result=await load('staff',{ok:true,status:200,data:{columns:['display_name','email'],example:'display_name,email\nAsha Rao,asha@example.edu\n'}}).GET();
 assert.equal(result.body,'display_name,email\n');
 assert.equal(result.headers['Content-Type'],'text/csv; charset=utf-8');
 assert.match(result.headers['Content-Disposition'],/students-template\.csv/);
});
test('import template requires a subject and rejects an unrecognised shape',async()=>{
 assert.equal((await load(null,null).GET()).status,401);
 assert.equal((await load('staff',{ok:true,status:200,data:{columns:'display_name'}}).GET()).status,502);
 assert.equal((await load('staff',{ok:false,status:403,data:{detail:'insufficient role'}}).GET()).status,403);
});
