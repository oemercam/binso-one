"use client";
import {pilotEnabled} from '@/config/plan-access';
import {usePageAccess} from '@/lib/client/page-access';
import {formatTimeDuration} from '@/lib/display-format';
import {useDashboardGreeting} from '@/lib/client/user-profile';
import {SetupGuideView} from '../setup-guide';
import type {SetupGuide} from '@/lib/action-readiness';
import {LocalizedText,useTranslation} from '@/lib/client/locale';
import Link from 'next/link';
import {AppShell} from '../app-shell';
import {QuickCreateAction,ListRow,ActionRow} from '../binso-ux';
import {CashOverview} from '../cash-statistics';
import type {CashStatisticsData} from '@/lib/cash-statistics';
import {useApiQuery} from '@/lib/client/use-api-query';
import {financialStatus} from '@/lib/financial-status';
import {DocumentSummaryRow,type DocumentListItem} from '../document-list';
import {SectionTitle,LoadingState,ErrorState} from '../ui';
export type DashboardData={setup?:SetupGuide|null;work?:{hours:number|null;pending:number|null;expenses:number|null;timeReviews?:number|null;expenseReviews?:number|null}|null;cash?:CashStatisticsData|null;canFinance?:boolean;canInvoices?:boolean;canPayments?:boolean;stats?:{customer_count:number|null;project_count?:number|null;employee_count?:number|null};invoices?:DocumentListItem[];attention?:DocumentListItem[];recent?:DocumentListItem[]};
export function DashboardPage(){
 const query=useApiQuery<DashboardData>('/api/dashboard');
 const greeting=useDashboardGreeting(),translate=useTranslation();
 const pending=query.loading||!greeting;
 return <AppShell loading={pending} headingPlacement="content" title={pending?'':greeting} titleIsUserContent subtitle={!pending?translate('Dein Unternehmen auf einen Blick'):undefined} active="dashboard" actions={<QuickCreateAction/>}>{pending?<LoadingState/>:query.error?<ErrorState onRetry={query.refresh}><LocalizedText>{query.error}</LocalizedText></ErrorState>:<DashboardOverview data={query.data}/>}</AppShell>;
}
export function DashboardOverview({data}:{data:DashboardData|undefined}){
 const translate=useTranslation(),access=usePageAccess();
 const canOpenInvoices=data?.canInvoices!==false&&access.canOpen('/rechnungen');
 const canOpenTime=access.canOpen('/zeit');
 const work=data?.work,stats=data?.stats;
 const attention=canOpenInvoices?(data?.attention??[]).filter(item=>financialStatus(item)==='overdue'):[];
 const attentionIds=new Set(attention.map(item=>item.id));
 const recent=canOpenInvoices?(data?.recent??data?.invoices??[]).filter(item=>!attentionIds.has(item.id)&&financialStatus(item)!=='overdue').slice(0,3):[];
 const companyRows=[
  {href:'/kunden',title:'Kunden',value:stats?.customer_count},
  {href:'/mitarbeiter',title:'Mitarbeiter',value:stats?.employee_count},
  {href:'/projekte?status=Aktiv',title:'Laufende Aufträge',value:stats?.project_count},
 ].filter(row=>row.value!=null&&access.canOpen(row.href));
 const taskRows=[
  {href:'/zeit?tab=entries&review=1',title:'Zeitfreigaben',value:work?.timeReviews},
  {href:'/spesen?status=Eingereicht&review=1',title:'Spesenfreigaben',value:work?.expenseReviews},
 ].filter(row=>Number(row.value)>0&&access.canOpen(row.href));
 const shortcuts=[
  ...(companyRows.some(row=>row.href==='/kunden')?[]:[{href:'/kunden',title:'Kunden',icon:'users'}]),
  ...(canOpenInvoices&&!recent.length?[{href:'/rechnungen',title:'Rechnungen',icon:'receipt'}]:[]),
  {href:'/zeit',title:'Zeiterfassung',icon:'clock'},
  {href:'/support',title:'Support',icon:'help'},
 ].filter(row=>access.canOpen(row.href));
 const canShowWork=canOpenTime&&(work?.hours!=null||Number(work?.pending)>0);
 const tasks=(taskRows.length>0||attention.length>0)&&<section className="bo-workspace-section">
  <SectionTitle title="Handlungsbedarf" action={attention.length===5?<Link href="/rechnungen?status=%C3%9Cberf%C3%A4llig"><LocalizedText>{'Überfällig'}</LocalizedText></Link>:undefined}/>
  {taskRows.map(row=><ListRow information key={row.href} href={row.href} title={row.title} meta="" value={String(row.value)}/>)}
  {attention.length>0&&<div className="recent-invoices">{attention.map(item=><DocumentSummaryRow key={item.id} item={item} customerHeading compact/>)}</div>}
 </section>;
 const quickAccess=shortcuts.length>0&&<section className="bo-workspace-section">
  <SectionTitle title="Schnellzugriff"/>
  <div className="action-list">{shortcuts.map(row=><ActionRow key={row.href} {...row}/>)}</div>
 </section>;
 const dashboardActions=<div className="bo-overview-task-grid">{tasks}{quickAccess}</div>;
 return <div className="bo-dashboard-overview">
  {data?.setup&&<SetupGuideView item={data.setup}/>}
  {!pilotEnabled&&data?.canFinance&&data.cash?<CashOverview data={data.cash} dashboard afterMetrics={dashboardActions}/>:dashboardActions}
  <div className="bo-overview-secondary">
   {companyRows.length>0&&<section className="bo-workspace-section">
    <SectionTitle title="Unternehmen"/>
    {companyRows.map(row=><ListRow information key={row.href} href={row.href} title={row.title} meta="" value={String(row.value)}/>)}
   </section>}
   {canShowWork&&<section className="bo-workspace-section">
    <SectionTitle title="Meine Arbeit"/>
    {work?.hours!=null&&<ListRow information title="Stunden" meta="" valueLabel="Dieser Monat" value={formatTimeDuration(work.hours*60,translate)}/>}
    {Number(work?.pending)>0&&<ListRow information href="/zeit?tab=entries&amp;own=1&amp;status=unapproved" title="Offene Zeiten" meta="Eigene Einträge" value={String(work?.pending)}/>}
   </section>}
  </div>
  {recent.length>0&&<section className="bo-workspace-section">
   <SectionTitle title="Zuletzt bearbeitete Rechnungen" action={<Link href="/rechnungen"><LocalizedText>{'Alle anzeigen'}</LocalizedText></Link>}/>
   <div className="recent-invoices">{recent.map(item=><DocumentSummaryRow key={item.id} item={item} customerHeading compact/>)}</div>
  </section>}
 </div>;
}
