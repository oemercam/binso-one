import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export async function inspectMonitoring(resources,get){
 const [app,insights,alert,group]=await Promise.all([get(resources.app,'2024-11-01'),get(resources.insights,'2020-02-02'),get(resources.alert,'2018-03-01'),get(resources.actionGroup,'2023-01-01')]);
 const same=(a,b)=>typeof a==='string'&&a.toLowerCase()===b.toLowerCase();
 if(!same(app.id,resources.app))throw Error('Wrong monitored application');
 if(!insights.properties?.WorkspaceResourceId)throw Error('Application Insights workspace missing');
 if(!alert.properties?.enabled||!alert.properties.scopes?.some(id=>same(id,resources.app)))throw Error('Enabled alert must target the actual app across subscriptions');
 if(!alert.properties.actions?.some(a=>same(a.actionGroupId,resources.actionGroup)))throw Error('Alert must reference the verified action group');
 if(!group.properties?.enabled)throw Error('Action group disabled');
 const receivers=['emailReceivers','armRoleReceivers','webhookReceivers','smsReceivers','azureFunctionReceivers','logicAppReceivers'].reduce((n,key)=>n+(group.properties[key]?.length??0),0);
 if(!receivers)throw Error('Action group has no receivers');
 return {application:app.id,insights:true,scopedAlert:true,activeReceivers:receivers,deliveryProven:false};
}
const appName='app-binso-one-prod';
const groupName='binso-one-de-betriebsalarme';
const mailWorkflow='logic-binso-one-betriebswarnmail-prod';
const oneRules=[
 ['http5xx',appName,'Http5xx',groupName],
 ['health',appName,'HealthCheckStatus',groupName],
 ['retention-watch','logic-binso-one-retention-watch-prod','RunsFailed',groupName],
 ['retention','logic-binso-one-retention-prod','RunsFailed',groupName],
 ['warnmail-versandfehler',mailWorkflow,'RunsFailed','binso-website-operations'],
];
export async function inspectBinsoOneMonitoring(root,get){
 const actionGroupId=root+'/Microsoft.Insights/actionGroups/'+groupName;
 const mailId=root+'/Microsoft.Logic/workflows/'+mailWorkflow;
 const [group,mailer,...rules]=await Promise.all([
  get(actionGroupId,'2023-01-01'),get(mailId,'2019-05-01'),
  ...oneRules.map(([name])=>get(root+'/Microsoft.Insights/metricAlerts/alrt-binso-one-prod-'+name,'2018-03-01')),
 ]);
 const same=(a,b)=>typeof a==='string'&&a.toLowerCase()===b.toLowerCase();
 if(!group.properties?.enabled||!group.properties.logicAppReceivers?.some(receiver=>same(receiver.resourceId,mailId))||mailer.properties?.state!=='Enabled')
  throw Error('Deutsche BINSO-One-Warnmail-Strecke fehlt oder ist deaktiviert.');
 for(const [index,[name,scope,metric,group]] of oneRules.entries()){
  const properties=rules[index].properties;
  const scopeId=root+(scope===appName?'/Microsoft.Web/sites/':'/Microsoft.Logic/workflows/')+scope;
  if(properties?.enabled!==true||properties.scopes?.length!==1||!same(properties.scopes[0],scopeId)||
   !properties.criteria?.allOf?.some(criterion=>criterion.metricName===metric)||
   !properties.actions?.some(action=>group===groupName?same(action.actionGroupId,actionGroupId):action.actionGroupId?.toLowerCase().endsWith('/providers/microsoft.insights/actiongroups/'+group)))
   throw Error('Falscher Geltungsbereich, Messwert oder Empfänger für alrt-binso-one-prod-'+name);
 }
 return {application:appName,enabledRules:oneRules.length,germanMailWorkflow:'enabled',deliveryProven:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const app=execFileSync('az',['webapp','show','--resource-group','rg-binso-one-prod','--name',appName,'--query','id','--output','tsv'],{encoding:'utf8'}).trim();
 const root=app.match(/^(\/subscriptions\/[a-f0-9-]+\/resourceGroups\/rg-binso-one-prod\/providers)\/Microsoft\.Web\/sites\/app-binso-one-prod$/i)?.[1];
 if(!root)throw Error('Unerwarteter BINSO-One-App-Service.');
 const get=async(id,version)=>{
  if(!/^\/subscriptions\/[a-f0-9-]+\/resourceGroups\//i.test(id))throw Error('Invalid ARM resource identity');
  return JSON.parse(execFileSync('az',['rest','--method','get','--url','https://management.azure.com'+id+'?api-version='+version,'--output','json'],{encoding:'utf8'}));
 };
 console.log(JSON.stringify(await inspectBinsoOneMonitoring(root,get)));
}
