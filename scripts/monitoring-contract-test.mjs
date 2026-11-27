import assert from 'node:assert/strict';
import {inspectBinsoOneMonitoring,inspectMonitoring} from './production-monitoring-check.mjs';
export async function verifyMonitoringContract(){
 const resources={app:'/subscriptions/app/resourceGroups/rg/app',insights:'/subscriptions/monitor/resourceGroups/rg/insights',alert:'/subscriptions/monitor/resourceGroups/rg/alert',actionGroup:'/subscriptions/monitor/resourceGroups/rg/group'};
 const fixture={
  [resources.app]:{id:resources.app},
  [resources.insights]:{properties:{WorkspaceResourceId:'workspace'}},
  [resources.alert]:{properties:{enabled:true,scopes:[resources.app],actions:[{actionGroupId:resources.actionGroup}]}},
  [resources.actionGroup]:{properties:{enabled:true,armRoleReceivers:[{name:'fixture'}]}}
 };
 const run=state=>inspectMonitoring(resources,async id=>state[id]);
 assert.equal((await run(fixture)).deliveryProven,false);
 for(const mutate of [s=>s[resources.alert].properties.scopes=['foreign-app'],s=>s[resources.alert].properties.enabled=false,s=>s[resources.alert].properties.actions=[],s=>s[resources.actionGroup].properties.enabled=false,s=>s[resources.actionGroup].properties.armRoleReceivers=[],s=>delete s[resources.insights].properties.WorkspaceResourceId]){
  const state=structuredClone(fixture);mutate(state);await assert.rejects(run(state));
 }
 await assert.rejects(inspectMonitoring(resources,async()=>{throw Error('denied')}));
 const root='/subscriptions/synthetic/resourceGroups/rg-binso-one-prod/providers';
 const {one,groupId,mailId,alerts}=binsoOneMonitoringFixture(root);
 assert.equal((await inspectBinsoOneMonitoring(root,async id=>one[id])).enabledRules,5);
 for(const [id,change] of [[groupId,p=>{p.logicAppReceivers=[];}],[mailId,p=>{p.state='Disabled';}],[root+alerts+'http5xx',p=>{p.scopes=[resources.app];}],[root+alerts+'warnmail-versandfehler',p=>{p.actions=[];}]]){
  const state=structuredClone(one);change(state[id].properties);
  await assert.rejects(inspectBinsoOneMonitoring(root,async key=>state[key]));
 }
 console.log('Monitoring validates exact cross-subscription target, enabled rules, action binding, receivers and denied reads; never claims delivery.');
}

export function binsoOneMonitoringFixture(root){
 const alerts='/Microsoft.Insights/metricAlerts/alrt-binso-one-prod-';
 const groups='/Microsoft.Insights/actionGroups/';
 const logic='/Microsoft.Logic/workflows/';
 const groupId=root+groups+'binso-one-de-betriebsalarme';
 const mailId=root+logic+'logic-binso-one-betriebswarnmail-prod';
 const metric=(scope,metricName,actionGroupId=groupId)=>({properties:{enabled:true,scopes:[scope],criteria:{allOf:[{metricName}]},actions:[{actionGroupId}]}});
 const one={
  [groupId]:{properties:{enabled:true,logicAppReceivers:[{resourceId:mailId}]}},
  [mailId]:{properties:{state:'Enabled'}},
  [root+alerts+'http5xx']:metric(root+'/Microsoft.Web/sites/app-binso-one-prod','Http5xx'),
  [root+alerts+'health']:metric(root+'/Microsoft.Web/sites/app-binso-one-prod','HealthCheckStatus'),
  [root+alerts+'retention']:metric(root+logic+'logic-binso-one-retention-prod','RunsFailed'),
  [root+alerts+'retention-watch']:metric(root+logic+'logic-binso-one-retention-watch-prod','RunsFailed'),
  [root+alerts+'warnmail-versandfehler']:metric(mailId,'RunsFailed',root+groups+'binso-website-operations'),
 };
 return {one,groupId,mailId,alerts};
}
