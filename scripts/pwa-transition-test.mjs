import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function load(file,deps={}){
 const result={};
 Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText)(name=>{
  if(Object.hasOwn(deps,name))return deps[name];
  if(name==='react/jsx-runtime')return require(name);
  return {};
 },result);
 return result;
}
function hooks(){
 let position=0,ready=false;const cells=[],effects=[];
 const react={useState(initial){const index=position++;if(!(index in cells))cells[index]=typeof initial==='function'?initial():initial;return [cells[index],next=>{cells[index]=typeof next==='function'?next(cells[index]):next}];},useRef(value){return cells[position++]??=( {current:value});},useMemo(fn){return fn();},useCallback(fn){return fn;},useEffect(fn){effects.push(fn);},useSyncExternalStore(_subscribe,client,server){return ready?client():server();}};
 return {react,effects,hydrate(){ready=true;},render(fn){position=0;return fn();}};
}

const originalWindow=globalThis.window,originalDocument=globalThis.document,originalFetch=globalThis.fetch;
try{
 // Execute the actual list hook before running any effect. No storage or API
 // access is permitted during SSR; navigation restores validated state at once.
 const h=hooks(),store=new Map();let routePath='/kunden',routeSearch='';
 const navigation={usePathname:()=>routePath,useSearchParams:()=>new URLSearchParams(routeSearch)};
 const statusOverride=(search,chips)=>{const value=new URLSearchParams(search).get('status');return chips.includes(value)?value:undefined;};
 const {useRecordsController}=load('components/records.tsx',{react:h.react,'next/navigation':navigation,'@/lib/client/list-state':{listStateStore:store},'@/lib/list-filter':{listStatusOverride:statusOverride}});
 const options={placeholder:'Kunden suchen...',chips:['Alle','Aktiv'],columns:[{index:0},{index:2}]};
 globalThis.window=undefined;
 assert.equal(h.render(()=>useRecordsController(options)).restored,false,'SSR does not read window or display a default query');
 globalThis.window={location:{pathname:'/kunden',search:''}};
 store.set('binso.list:/kunden:Kunden suchen...',JSON.stringify({query:'Acme',activeChip:'Aktiv',sort:'desc',sortIndex:2,page:3}));
 h.hydrate();let list=h.render(()=>useRecordsController(options));
 assert.deepEqual([list.restored,list.query,list.activeChip,list.sort,list.sortIndex,list.page],[true,'Acme','Aktiv','desc',2,3],'The first client render needs no restoration effect/microtask');
 list.setQuery('New');list.setSort('asc');list=h.render(()=>useRecordsController(options));
 assert.deepEqual([list.query,list.sort,list.page],['New','asc',0],'Batched control changes preserve each other and reset pagination');
 list=h.render(()=>useRecordsController({...options,chips:['Alle']}));assert.equal(list.activeChip,'Alle','Removed permission-driven filters cannot survive');
 routePath='/produkte';window.location.pathname='/produkte';list=h.render(()=>useRecordsController(options));assert.equal(list.query,'','A different destination never displays the previous search');
 const broken=hooks(),brokenHook=load('components/records.tsx',{react:broken.react,'next/navigation':navigation,'@/lib/client/list-state':{listStateStore:store},'@/lib/list-filter':{listStatusOverride:()=>undefined}}).useRecordsController;
 store.set('binso.list:/produkte:Kunden suchen...',JSON.stringify({query:42,activeChip:'Forbidden',sort:'random',sortIndex:999,page:-1}));broken.hydrate();list=broken.render(()=>brokenHook(options));
 assert.deepEqual([list.query,list.activeChip,list.sort,list.sortIndex,list.page],['','Alle','default',0,0]);
 // Next may render the new page before committing the browser address. The old
 // window URL must neither choose the wrong saved filter nor receive its writes.
 const lagging=hooks(),laggingHook=load('components/records.tsx',{react:lagging.react,'next/navigation':navigation,'@/lib/client/list-state':{listStateStore:store},'@/lib/list-filter':{listStatusOverride:statusOverride}}).useRecordsController;
 const previousPage=store.get('binso.list:/produkte:Kunden suchen...');routePath='/kunden';lagging.hydrate();
 list=lagging.render(()=>laggingHook(options));assert.equal(list.query,'Acme','Router destination restores its own state while window.location still names the source page');
 lagging.effects.at(-1)();assert.equal(store.get('binso.list:/produkte:Kunden suchen...'),previousPage,'A destination effect cannot overwrite the previous page state');
 assert.equal(JSON.parse(store.get('binso.list:/kunden:Kunden suchen...')).activeChip,'Aktiv');
 routeSearch='status=Aktiv';const drilldown=hooks(),drilldownHook=load('components/records.tsx',{react:drilldown.react,'next/navigation':navigation,'@/lib/client/list-state':{listStateStore:store},'@/lib/list-filter':{listStatusOverride:statusOverride}}).useRecordsController;drilldown.hydrate();
 assert.equal(drilldown.render(()=>drilldownHook(options)).activeChip,'Aktiv','A destination drilldown uses router search parameters rather than the old browser query');

 // The write guard covers fetch, JSON parsing, validation, failures and uploads.
 let releaseBody;
 globalThis.fetch=async()=>({ok:true,status:200,json:()=>new Promise(resolve=>releaseBody=resolve)});
 const backend=load('lib/client/backend.ts',{'./data-events':{dataRevision:()=> 'session-a',publishMutation(){}},'./session-cache':{}});
 for(const [method,args] of [['apiPost',['/api/settings/company',{}]],['apiPatch',['/api/settings/company',{}]],['apiDelete',['/api/settings/company']],['apiUpload',['/api/files',new FormData()]]]){
  const pending=backend[method](...args);await new Promise(resolve=>setImmediate(resolve));assert.equal(backend.hasPendingClientMutation(),true,'Response bodies remain protected for '+method);releaseBody({ok:true,item:{id:'fixture'}});await pending;assert.equal(backend.hasPendingClientMutation(),false);
 }
 globalThis.fetch=async()=>{throw new Error('Offline');};await assert.rejects(()=>backend.apiPost('/api/settings/company',{}));assert.equal(backend.hasPendingClientMutation(),false,'A failed write always releases its guard');
 console.log('Actual PWA transition owners: pre-paint list restoration, malformed/forbidden state, and complete mutation lifecycle passed.');
}finally{globalThis.window=originalWindow;globalThis.document=originalDocument;globalThis.fetch=originalFetch;}

// Dashboard plan entitlement must execute on the existing authorized snapshot
// before any business repositories; no cross-request authorization cache.
let plan='pro',finance=true,reads=0,planCalls=0;
const client={query:async()=>({rows:[{customer_count:null,project_count:null,employee_count:null}]})};
const dashboard=load('app/api/dashboard/route.ts',{
 '@/lib/server/business-readiness':{canConfigureSetup:()=>false},
 '@/lib/server/repositories/finance':{cashStatisticsData:async()=>{reads++;return {}; }},
 '@/lib/permissions':{tenantCan:(_role,permission)=>finance||!permission.startsWith('accounting:')&&permission!=='payments:read'},
 '@/lib/server/repositories/dashboard':{dashboardAttention:async()=>{reads++;return [];},dashboardWork:async()=>({})},
 '@/lib/server/repositories/business-api':{listApiBusiness:async()=>[]},
 '@/lib/server/plan-access':{organizationPlanInTransaction:async(c,org)=>{assert.equal(c,client);assert.equal(org,'tenant');planCalls++;return plan;},assertModuleEntitlement:value=>{if(value==='denied')throw Error('Plan denied');}},
 '@/config/plan-access':{planAllowsModule:()=>false},'@/lib/server/rbac':{authorize(){}},
 '@/lib/server/session':{requireSession:async()=>({organizationId:'tenant',userId:'person',role:'owner'})},
 '@/lib/server/db':{withTenant:async(org,user,fn,options)=>{assert.deepEqual([org,user,options.snapshot],['tenant','person',true]);return fn(client);}},
 '@/lib/server/http':{json:value=>value,apiError:error=>{throw error;}}
});
assert.ok(await dashboard.GET());assert.equal(planCalls,1);assert.equal(reads,2);
plan='denied';reads=0;await assert.rejects(()=>dashboard.GET(),/Plan denied/);assert.equal(reads,0,'Entitlement denial precedes financial and domain reads');
plan='pro';finance=false;const restricted=await dashboard.GET();assert.equal(restricted.cash,null);assert.equal(restricted.canPayments,false);
console.log('Actual dashboard handler: one snapshot connection, unchanged plan denial before domain reads and restricted financial projection passed.');

// Exercise the actual persistent-layout registration, not a copied cache model.
const ast=ts.createSourceFile('shell.tsx',fs.readFileSync('components/app-shell.tsx','utf8'),99,true,ts.ScriptKind.TSX);
const layoutSource=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='AppShellLayout').getText(ast);
const sectionSource=ast.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(ast)==='appSections')).getText(ast);
const sectionExports={};Function('exports',ts.transpileModule(sectionSource+';exports.sections=appSections;',{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(sectionExports);
for(const section of Object.keys(sectionExports.sections)){assert.match(fs.readFileSync('app/'+section+'/layout.tsx','utf8'),/export\s*\{default,metadata\}\s*from\s*['"]@\/components\/customer-app-layout['"]/,'Every customer module shares the same identity boundary: '+section);}
const shellHooks=hooks(),React=require('react'),result={};let route='/kunden',identity='one';
const RecordsControls=()=>null,AppShellFrame=()=>null;
Function('require','exports','usePathname','useDataRevision','useState','useCallback','isValidElement','RecordsControls','appSections','settingsGroups','ShellRegistration','AppShellFrame',ts.transpileModule(layoutSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(require,result,()=>route,()=>identity,shellHooks.react.useState,shellHooks.react.useCallback,React.isValidElement,RecordsControls,sectionExports.sections,[],{Provider:()=>null},AppShellFrame);
const renderShell=()=>shellHooks.render(()=>result.AppShellLayout({children:'current route'}));
let tree=renderShell();const customerTools=React.createElement(RecordsControls,{owner:'customers'});
tree.props.value({pathname:'/kunden',title:'Kunden',active:'kunden',actions:customerTools});tree=renderShell();assert.equal(tree.props.children.props.loading,undefined);
route='/produkte';tree=renderShell();assert.equal(tree.props.children.props.actions,undefined,'A new destination cannot borrow the previous toolbar');
tree.props.value({pathname:'/produkte',title:'Produkte',active:'produkte',actions:React.createElement(RecordsControls,{owner:'products'})});renderShell();
route='/kunden';tree=renderShell();assert.equal(tree.props.children.props.actions,customerTools);assert.equal(tree.props.children.props.loading,true,'The returning toolbar is only a pending placeholder, made inert by the actual frame');
route='/lieferanten';tree=renderShell();assert.equal(tree.props.children.type,AppShellFrame,'Suppliers must retain the same persistent frame');assert.equal(tree.props.children.props.title,'Lieferanten');assert.equal(tree.props.children.props.actions,undefined,'Supplier navigation cannot inherit another list toolbar');
identity='two';tree=renderShell();assert.equal(tree.props.children.props.actions,undefined,'No toolbar or private search can survive the session fence');
console.log('Actual persistent shell: destination-specific toolbar retention, pending interaction lock and session eviction passed.');

// Exercise the real fixture owner, including absolute HTTP request targets.
{
 const source=fs.readFileSync('scripts/loading-browser-test.mjs','utf8');
 const ast=ts.createSourceFile('loading-browser-test.mjs',source,99,true);
 const declaration=ast.statements.find(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(item=>item.name.getText(ast)==='fixtureServer'));
 assert.ok(declaration,'Exercise the actual fixture server owner');
 let upstreamHits=0,foreignHits=0;const forwardedPaths=[];
 const upstreamServer=http.createServer((request,response)=>{upstreamHits++;forwardedPaths.push(request.url);response.end('loopback upstream')});
 const foreignServer=http.createServer((_request,response)=>{foreignHits++;response.end('foreign')});
 const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const close=server=>new Promise(resolve=>server.close(resolve));
 let fixture;
 try{
  await listen(upstreamServer);await listen(foreignServer);
  const upstream='http://127.0.0.1:'+upstreamServer.address().port;
  fixture=Function('http','upstream','handleApi',declaration.getText(ast)+';return fixtureServer;')(http,upstream,null);
  await listen(fixture);
  for(const target of ['/kunden?lang=de','http://127.0.0.1:'+foreignServer.address().port+'/kunden?lang=de','//127.0.0.1:'+foreignServer.address().port+'/kunden?lang=de']){
   const body=await new Promise((resolve,reject)=>{const request=http.request({hostname:'127.0.0.1',port:fixture.address().port,path:target},response=>{let body='';response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve(body));});request.on('error',reject);request.end();});
   assert.equal(body,'loopback upstream','Only the configured upstream responds');
  }
  assert.equal(upstreamHits,3);assert.deepEqual(forwardedPaths,Array(3).fill('/kunden?lang=de'),'Only path/query are forwarded to the validated upstream');assert.equal(foreignHits,0,'Untrusted authorities never receive fixture requests');
 }finally{if(fixture)await close(fixture);await close(upstreamServer);await close(foreignServer);}
 console.log('Actual loading HTTP fixture: relative, absolute and protocol-relative requests retain the fixed local upstream; foreign target receives zero requests.');
}
