import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {moduleUrl} from './data-test-modules.mjs';
const base='fc596c4e67e354d464fb8eac2221ebb1ad013096';
/** New named destinations are authorized; historical dock material/geometry is not. */
export async function verifyPhase1Navigation(){
 const read=file=>fs.readFileSync(file,'utf8');
 const {mainNavigation,moreNavigation,primaryNavigationSection}=await import(moduleUrl(read('config/workspace-navigation.ts')));
 assert.deepEqual(mainNavigation.map(({href,label,icon})=>[href,label,icon]),[
  ['/dashboard','Übersicht','house'],['/kunden','Kunden','navigation-users'],['/projekte','Aufträge','briefcase-business'],['/zeit','Zeit','clock3']]);
 assert.deepEqual(moreNavigation.map(group=>[group.title,group.items.map(item=>item.href)]),[
  ['Geschäft',['/angebote','/rechnungen','/zahlungen','/spesen','/finanzen','/produkte','/lieferanten','/vertraege']],['Auswertung',['/berichte']],['Verwaltung',['/einstellungen/firma','/einstellungen/team','/mitarbeiter','/abwesenheiten','/einstellungen']],['Hilfe',['/support','/hilfe']]]);
 for(const [route,expected]of [['/kunden/real-id','kunden'],['/projekte/real-id','projekte'],['/zeit','zeit'],['/finanzen/analyse','more'],['/einstellungen/konto','more'],['/produkte/real-id','more'],['/lieferanten/real-id','more'],['/vertraege/real-id','more'],['/mitarbeiter/real-id','more'],['/abwesenheiten','more']])assert.equal(primaryNavigationSection(route),expected);
 for(const [route,expected] of [["/angebote/1","sales"],["/rechnungen","sales"],["/zahlungen/1","sales"],["/zeit","projekte"]])assert.equal(primaryNavigationSection(route,true),expected);
 const old=execFileSync('git',['show',base+':app/design-system/navigation.css'],{encoding:'utf8'});
 const normalize=css=>css.replace(/font-size:[^;}]+;?/g,'').replace(/font-weight:[^;}]+;?/g,'').replace(/\r\n/g,'\n');
 const current=read('app/design-system/navigation.css');
 assert.equal(normalize(current),normalize(old),'Only authorized text typography may change in the complete dock/FAB owner');
 for(const [from,to]of [['min-width:44px','min-width:32px'],['border-radius:0','border-radius:30px'],['backdrop-filter:none','backdrop-filter:blur(18px)'],['opacity:1','opacity:0']]){
  assert.ok(current.includes(from));assert.notEqual(normalize(current.replace(from,to)),normalize(old),'Geometry/material/label mutation must fail: '+from);
 }
 const shell=read('components/app-shell.tsx');
 assert.match(shell,/mobileItems\.filter\([^)]*canOpen/,'Primary destinations retain access filtering');
 assert.match(shell,/group\.items\.filter\([^)]*canOpen/,'More destinations retain access filtering');
 assert.doesNotMatch(shell,/navCompact|setNavCompact/,'Labels never disappear on scroll');
 const icon=read('components/ui.tsx');for(const name of ['House','Users','BriefcaseBusiness','Clock3','Menu'])assert.match(icon,new RegExp('\\b'+name+'\\b'));
 assert.match(shell,/<Icon name="menu" size=\{20\}\/>/,'More uses a Lucide menu icon');
 const iconAst=ts.createSourceFile('ui.tsx',icon,99,true,4);
 const lucideImport=iconAst.statements.find(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='lucide-react');
 const imported=new Set(lucideImport.importClause.namedBindings.elements.map(element=>element.name.text));
 const bindings=iconAst.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]);
 const icons=bindings.find(node=>node.name.getText(iconAst)==='lucideIcons').initializer.properties;
 assert.ok(icons.every(property=>imported.has(property.initializer.getText(iconAst))),'Each shared icon resolves to an imported Lucide icon');
 const byName=new Map(icons.map(property=>[(property.name.text??property.name.getText(iconAst)),property.initializer.getText(iconAst)]));
 for(const item of [...mainNavigation,...moreNavigation.flatMap(group=>group.items)])assert.ok(byName.has(item.icon),'Navigation icon has a named Lucide origin: '+item.icon);
 assert.equal(byName.get('menu'),'Menu');
 assert.doesNotMatch(icon,/<svg|const paths =/,'The shared icon owner contains no handwritten glyphs');
 assert.deepEqual(moreNavigation[0].items.map(item=>item.label),['Angebote','Rechnungen','Zahlungen','Spesen','Finanzübersicht','Produkte','Lieferanten','Verträge'],'V7 destinations retain order; existing business modules have their approved primary location under More');
 console.log('Phase 1 navigation: exact V2 catalogue, owning routes, permission filtering and unchanged dock/FAB geometry/material with negative probes passed. Visual acceptance remains separate.');
}
