"use client";
import type {MetricTrend} from '@/lib/kpi-trend';
import {useLocale} from '@/lib/client/locale';
import {localeTags} from '@/lib/locales/config';
import {LocalizedText,LocalizedElement} from "@/lib/client/locale";
import {usePageAccess} from "@/lib/client/page-access";
import {fieldInputHint} from "@/lib/form-input-hints";
import {Children,cloneElement,isValidElement,useId,useState,useSyncExternalStore} from "react";
import {createPortal} from "react-dom";
import Link from "next/link";
import {House,Users,BriefcaseBusiness,Clock3,HelpCircle,FileText,Search,Bell,Plus,ChevronRight,ChevronLeft,ChevronDown,X,Check,Receipt,Wallet,Settings,ChartNoAxesColumn,Menu,Building2,CalendarDays,Package,CreditCard,LockKeyhole,LogOut,Filter,ArrowDownUp,Mail,Upload,Download,Pause,Square,Pencil,Eye,EyeOff,Trash2,Phone,User,Copy,Moon,Sun,MessageCircle} from 'lucide-react';
import {SelectControl} from './select-control';

const lucideIcons = {
  house: House,
  "navigation-users": Users,
  "briefcase-business": BriefcaseBusiness,
  clock3: Clock3,
  help: HelpCircle,
  home: House,
  users: Users,
  file: FileText,
  clock: Clock3,
  search: Search,
  bell: Bell,
  plus: Plus,
  arrow: ChevronRight,
  back: ChevronLeft,
  down: ChevronDown,
  close: X,
  check: Check,
  receipt: Receipt,
  wallet: Wallet,
  support: HelpCircle,
  settings: Settings,
  chart: ChartNoAxesColumn,
  menu: Menu,
  building: Building2,
  calendar: CalendarDays,
  box: Package,
  card: CreditCard,
  lock: LockKeyhole,
  logout: LogOut,
  filter: Filter,
  sort: ArrowDownUp,
  mail: Mail,
  upload: Upload,
  download: Download,
  pause: Pause,
  stop: Square,
  edit: Pencil,
  eye: Eye,
  "eye-off": EyeOff,
  trash: Trash2,
  phone: Phone,
  user: User,
  copy: Copy,
  moon: Moon,
  sun: Sun,
  chat: MessageCircle,
  time: Clock3,
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const LucideIcon = Object.hasOwn(lucideIcons, name) ? lucideIcons[name as keyof typeof lucideIcons] : FileText;
  return <LucideIcon size={size} aria-hidden="true" strokeWidth={2}/>;
}

export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return <LocalizedElement as="img" className={compact ? "logo logo-compact" : "logo"} src={dark ? (compact ? "/brand/icon-white.svg" : "/brand/logo-white.svg") : (compact ? "/brand/icon-black.svg" : "/brand/logo-black.svg")} alt="Binso" />;
}

export function Status({ children, tone = "neutral", appearance="pill" }: { children: React.ReactNode; appearance?:"pill";tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`status status-${tone}`} data-appearance={appearance}><LocalizedText>{children}</LocalizedText></span>;
}

function actionSourceText(nodes:React.ReactNode):string{return Children.toArray(nodes).map(node=>typeof node==='string'?node:isValidElement<{children?:React.ReactNode}>(node)?actionSourceText(node.props.children):'').join('');}
const dismissActionLabels=new Set(['Abbrechen','Schliessen','Cancel','Close','Annuler','Fermer','Annulla','Chiudi']);

export function Button({
  href,
  children,
  variant = "primary",
  icon,
  onClick,
  type = "button",
  className = "",
  disabled = false,
  ariaLabel,
  requiresWrite=false,
  form,
  ...ariaProps
}: {
  href?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "upload";
  icon?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  requiresWrite?:boolean;
  form?:string;
}&React.AriaAttributes) {
  const access=usePageAccess();
  disabled=disabled||requiresWrite&&!access.write;
  if(href&&!access.canOpen(href))return null;
  const cls = `button button-${variant} ${className}`.trim();
  const body = <>{icon && <Icon name={icon} size={17} />}{children != null && children !== "" && <span><LocalizedText>{children}</LocalizedText></span>}</>;
  return href && !disabled ? <Link {...ariaProps} className={cls} href={href} aria-label={ariaLabel??ariaProps['aria-label']}>{body}</Link> : <LocalizedElement as="button" data-sheet-dismiss={dismissActionLabels.has(actionSourceText(children).trim())||undefined} {...ariaProps} className={cls} onClick={onClick} type={type} form={form} disabled={disabled} aria-label={ariaLabel??ariaProps['aria-label']}>{body}</LocalizedElement>;
}

/** Related-record navigation must consume access inside the AppShell provider. */
export function AccessLink({href,children,fallback=null,className}:{href:string;children:React.ReactNode;fallback?:React.ReactNode;className?:string}){
  const access=usePageAccess();
  return access.canOpen(href)?<Link href={href} className={className}>{children}</Link>:<>{fallback}</>;
}

export function IconButton({ label, icon, onClick, className="", ...ariaProps }: { label: string; icon: string; onClick?: () => void; className?:string }&React.AriaAttributes) {
  return <LocalizedElement as="button" {...ariaProps} className={["icon-button",className].filter(Boolean).join(" ")} type="button" aria-label={label} onClick={onClick}><Icon name={icon}/></LocalizedElement>;
}

export function Metric({ label, value, hint, icon, trend }: { label: React.ReactNode; value: React.ReactNode; hint?: string; icon?: string; trend?:MetricTrend }) {
  const {locale}=useLocale();
  return <div className="metric"><div className="metric-top"><FormLabel><LocalizedText>{label}</LocalizedText></FormLabel>{trend?<span className="metric-trend" data-tone={trend.tone} title={trend.label} aria-label={trend.percent===null?trend.label:(trend.percent>=0?"+":"−")+Math.abs(trend.percent).toLocaleString(localeTags[locale],{maximumFractionDigits:1})+"% · "+trend.label}>{trend.percent===null?"–":<><span aria-hidden="true">{trend.percent>0?"↗":trend.percent<0?"↘":"→"}</span>{Math.abs(trend.percent).toLocaleString(localeTags[locale],{maximumFractionDigits:1})}%</>}</span>:icon && <Icon name={icon} size={18}/>}</div><strong>{value}</strong>{hint && <small><LocalizedText>{hint}</LocalizedText></small>}</div>;
}

export function SectionTitle({ title, action, desktopOnly=false }: { title: string; action?: React.ReactNode;desktopOnly?:boolean }) {
  return <div className="section-title" data-desktop-only={desktopOnly||undefined}><h2><LocalizedText>{title}</LocalizedText></h2>{action&&<div className="section-title-actions">{action}</div>}</div>;
}

/** Native controls keep browser autofill and validation, with one shared field contract. */
export function Input(props:React.ComponentProps<"input">){
 const sized=!props.hidden&&!['checkbox','radio','file','hidden','range','color','button','submit','reset','image'].includes(props.type??'text');
 return <LocalizedElement as="input" {...props} className={[props.className,sized?'form-control':undefined].filter(Boolean).join(' ')||undefined}/>;
}
export function Select(props:React.ComponentProps<"select">&{search?:import('./select-control').SelectSearch}){return <SelectControl {...props} SearchInput={Input}/>}
export function Textarea(props:React.ComponentProps<"textarea">){return <LocalizedElement as="textarea" {...props} className={[props.className,'form-textarea'].filter(Boolean).join(' ')}/>}
export function Checkbox(props:Omit<React.ComponentProps<"input">,"type">){return <Input {...props} type="checkbox"/>}
export function DateInput(props:Omit<React.ComponentProps<"input">,"type">){return <Input {...props} type="date"/>}
export function TimeInput(props:React.ComponentProps<"input">){return <Input inputMode="text" placeholder="HH:MM" {...props}/>}
export function CurrencyInput(props:React.ComponentProps<"input">){return <Input inputMode="decimal" {...props}/>}
export function FormLabel({children,id}:{children:React.ReactNode;id?:string}){return <span id={id}><LocalizedText>{children}</LocalizedText></span>}
export function FormError({children,id}:{children?:React.ReactNode;id?:string}){return children?<span className="form-error" id={id} role="alert"><LocalizedText>{children}</LocalizedText></span>:null}
/** Logical field groups share spacing and headings across editors and wizard steps. */
export function FormSection({title,children,hidden=false}:{title?:string;children:React.ReactNode;hidden?:boolean}){
 return <section className="form-section" hidden={hidden}>{title&&<SectionTitle title={title}/>} {children}</section>;
}

export function FormActions({children,sheet=false,onClickCapture}:{children:React.ReactNode;sheet?:boolean;onClickCapture?:React.MouseEventHandler<HTMLDivElement>}){return <div className={sheet?"filter-sheet-actions":"mobile-sticky-save"} onClickCapture={onClickCapture}>{children}</div>}

export function Field({ label, children, className = "",allowReadOnlyInput=false,error,hint }: { label: React.ReactNode; children: React.ReactNode; className?: string;allowReadOnlyInput?:boolean;error?:string;hint?:string }) {
  const access=usePageAccess();
  const id=useId();
  const [validationError,setValidationError]=useState<string>();
  const message=error??validationError;
  const decorate=(nodes:React.ReactNode):React.ReactNode=>Children.map(nodes,child=>{
    const control=isValidElement<Record<string,unknown>>(child)&&((typeof child.type==='string'&&['input','select','textarea'].includes(child.type))||[Input,Select,Textarea,Checkbox,DateInput,TimeInput,CurrencyInput].includes(child.type as typeof Input));
    if(!control)return isValidElement<{children?:React.ReactNode}>(child)&&typeof child.type==='string'&&child.props.children?cloneElement(child,{children:decorate(child.props.children)}):child;
    const descriptions=[child.props['aria-describedby'],hint?`${id}-hint`:undefined,message?`${id}-error`:undefined].filter(Boolean).join(' ');
    return cloneElement(child,{
      ...(!access.write&&!allowReadOnlyInput?{disabled:true}:{}),
      ...(!child.props['aria-label']&&!child.props['aria-labelledby']?{'aria-labelledby':`${id}-label`}:{}),
      ...(message?{'aria-invalid':true}:{}),
      ...(!child.props.placeholder&&[Input,Textarea].includes(child.type as typeof Input)?{placeholder:fieldInputHint(label,String(child.props.type??'text'))}:{}),
      // SelectControl owns its accessible required-selection error. Rendering the
      // hidden native select's browser message here would announce it twice.
      onInvalid:(event:React.InvalidEvent<HTMLInputElement>)=>{if(child.type!==Select)setValidationError(event.currentTarget.validationMessage);(child.props.onInvalid as React.FormEventHandler<HTMLInputElement>|undefined)?.(event);},
      onChange:(event:React.ChangeEvent<HTMLInputElement>)=>{setValidationError(undefined);(child.props.onChange as React.ChangeEventHandler<HTMLInputElement>|undefined)?.(event);},
      onInput:(event:React.FormEvent<HTMLInputElement>)=>{setValidationError(undefined);(child.props.onInput as React.FormEventHandler<HTMLInputElement>|undefined)?.(event);},
      ...(descriptions?{'aria-describedby':descriptions}:{}),
    });
  });
  const fields=decorate(children);
  const inline=Children.toArray(children).some(child=>isValidElement<Record<string,unknown>>(child)&&((child.type==='input'||child.type===Input)&&['checkbox','radio'].includes(String(child.props.type))||child.type===Checkbox));
  return <label className={`form-field ${inline?'form-check ':''}${className}`.trim()}>{inline?fields:<FormLabel id={`${id}-label`}><LocalizedText>{label}</LocalizedText></FormLabel>}{inline?<FormLabel id={`${id}-label`}><LocalizedText>{label}</LocalizedText></FormLabel>:fields}{hint&&<small id={`${id}-hint`}><LocalizedText>{hint}</LocalizedText></small>}<FormError id={`${id}-error`}>{message}</FormError></label>;
}

/** Short content, never clipped: large system fonts may wrap beyond two visual lines. */
export function EmptyState({title,description}:{title:string;description?:string}) {
  return <div className="empty-state" data-empty-state="compact" role="status"><p><LocalizedText>{title}</LocalizedText></p>{description&&<p><LocalizedText>{description}</LocalizedText></p>}</div>;
}

export function ProgressBar({value,max,label}:{value:number;max:number;label:string}){return <LocalizedElement as="progress" className="bo-progress" aria-label={label} value={Math.max(0,Math.min(value,max))} max={Math.max(1,max)}/>;}

export function Toggle({ checked = false, label, labelledBy, onChange,disabled=false,busy=false }: { checked?: boolean; label: string;labelledBy?:string; onChange?: () => void;disabled?:boolean;busy?:boolean }) {
  return <LocalizedElement as="button" className={`toggle ${checked ? "is-on" : ""}`} disabled={disabled||busy} aria-busy={busy||undefined} type="button" role="switch" aria-checked={checked} aria-labelledby={labelledBy} aria-label={labelledBy?undefined:label} onClick={onChange}><span/></LocalizedElement>;
}

const subscribeToastHost=()=>()=>{};
const toastHost=()=>document.body;
const serverToastHost=()=>null;
export function Toast({ title, text, tone = "success",inline=false,actionLabel,onAction }: { title: string; text?: string; tone?: "success" | "danger" | "info";inline?:boolean;actionLabel?:string;onAction?:()=>void }) {
  const host=useSyncExternalStore(subscribeToastHost,toastHost,serverToastHost);
  const feedback=<div className={`${inline?"inline-feedback":"toast"} toast-${tone}`} role="status">
    <span className="toast-icon"><Icon name={tone === "danger" ? "close" : tone === "info" ? "bell" : "check"} size={16}/></span>
    <div><b><LocalizedText>{title}</LocalizedText></b>{text && <small><LocalizedText>{text}</LocalizedText></small>}</div>
    {onAction&&actionLabel&&<button type="button" className="text-action" onClick={onAction}><LocalizedText>{actionLabel}</LocalizedText></button>}
  </div>;
  // Floating feedback must survive hidden route backgrounds and nested layouts.
  // Inline feedback stays with its field; server/client hydration stays identical.
  return inline?feedback:host?createPortal(feedback,host):null;
}

/** Quiet navigation has no decorative progress bar. Status remains available to assistive technology. */
export function LoadingState({children="Daten werden geladen …",className,layout="inline"}:{children?:React.ReactNode;className?:string;layout?:"inline"|"records"|"page"}){
  return <span role="status" aria-live="polite" aria-busy="true" data-loading-layout={layout} className={`loading-state ${className??""}`.trim()}><span className="sr-only"><LocalizedText>{children}</LocalizedText></span></span>;
}

/** Retry remains local to the owning data source; callers retain their error text. */
export function ErrorState({children,onRetry,retryLabel="Erneut versuchen",className}:{children:React.ReactNode;onRetry?:()=>void;retryLabel?:string;className?:string}){
  return <div role="alert" className={`error-feedback ${className??""}`.trim()}><div><LocalizedText>{children}</LocalizedText></div>{onRetry&&<Button variant="secondary" onClick={onRetry}><LocalizedText>{retryLabel}</LocalizedText></Button>}</div>;
}

/** Customer and operator conversations share one bubble; direction is contextual. */
export function MessageBubble({children,author,time,outgoing=false,internal=false}:{children:React.ReactNode;author?:React.ReactNode;time:React.ReactNode;outgoing?:boolean;internal?:boolean}){
  return <article className={outgoing?"message message-user":"message message-support"}>{author&&<span>{author}</span>}<div>{children}</div><small>{time}{internal&&<> · <Status><LocalizedText>{"Intern"}</LocalizedText></Status></>}</small></article>;
}
