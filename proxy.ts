import {maintenanceState} from "./lib/server/maintenance";
import {asLocale,localeCookie,locales} from "./lib/locales/config";
import { NextRequest, NextResponse } from "next/server";
import {validOperatorSection} from './lib/operator-pages';
import {isBudgetedApi,requireApiBudget} from './lib/server/api-budget';
import {ApiError,apiError} from './lib/server/http';
import {companyContext,companyContextHeader,matchesCompanyContext} from './lib/server/company-context';

const sharedAuthPaths=new Set(['/api/auth/login','/api/auth/session','/api/auth/register','/api/auth/invitation',
 '/api/auth/password','/api/auth/recover','/api/auth/verify-email','/api/auth/resend-verification']);

function enforceCompanyContext(request:NextRequest,token:string|undefined){
 const path=request.nextUrl.pathname;
 if(!path.startsWith('/api/')||sharedAuthPaths.has(path)||
    /^\/api\/(operator|public|health|jobs|integrations|telemetry|demo)(\/|$)/.test(path)||
    path==='/api/billing/webhook')return;
 const context=companyContext(token),requestContext=request.headers.get(companyContextHeader);
 if(!requestContext&&request.method==='GET'&&/^\/api\/files\/[a-f0-9-]{36}\/download$/i.test(path))return;
 if(context&&!matchesCompanyContext(context,requestContext)||!context&&requestContext)
  throw new ApiError(409,'company_context_changed','Die Sitzung wurde geändert. Bitte erneut versuchen.');
}

const protectedPrefixes=[
  "/dashboard","/kunden","/angebote","/rechnungen","/zahlungen","/produkte",
  "/mitarbeiter","/abwesenheiten","/spesen","/zeit","/support","/einstellungen","/belege",
  "/benachrichtigungen","/willkommen","/finanzen","/projekte","/berichte","/lieferanten","/vertraege"
];

function routeProxy(request:NextRequest,headers:Headers){
  const pathname=request.nextUrl.pathname;
  if(pathname.startsWith('/operator/')&&!['/operator/login','/operator/wallboard'].includes(pathname)&&!validOperatorSection(pathname.slice('/operator/'.length)))return NextResponse.rewrite(new URL('/404',request.url),{status:404,headers:{'Cache-Control':'no-store'},request:{headers}});
  if(process.env.NODE_ENV!=="development"&&(pathname==="/dev"||pathname.startsWith("/dev/")))return NextResponse.rewrite(new URL("/404",request.url),{status:404,headers:{"Cache-Control":"no-store"},request:{headers}});
  const isProtected=protectedPrefixes.some(prefix=>pathname===prefix||pathname.startsWith(prefix+"/"));
  if(!isProtected) return NextResponse.next();

  const session=request.cookies.get(process.env.SESSION_COOKIE_NAME||"binso_session")?.value;
  if(session) return NextResponse.next();

  const login=new URL("/login",request.url);
  login.searchParams.set("next",pathname+request.nextUrl.search);
  return NextResponse.redirect(login);
}

export async function proxy(request:NextRequest){
 const token=request.cookies.get(process.env.SESSION_COOKIE_NAME||'binso_session')?.value;
 try{enforceCompanyContext(request,token);}catch(error){return apiError(error);}
 if(isBudgetedApi(request.nextUrl.pathname)){
  try{await requireApiBudget(token);return NextResponse.next();}catch(error){return apiError(error);}
 }
 const requested=request.nextUrl.searchParams.get('lang');
 const explicit=locales.includes(requested as typeof locales[number]);
 const headers=new Headers(request.headers);
 if(explicit){const locale=asLocale(requested);const parts=(headers.get('cookie')??'').split(';').filter(part=>part.trim()&&!part.trim().startsWith(localeCookie+'='));parts.push(localeCookie+'='+locale);headers.set('cookie',parts.join('; '));}
 const maintained=protectedPrefixes.some(prefix=>request.nextUrl.pathname===prefix||request.nextUrl.pathname.startsWith(prefix+"/"))&&(await maintenanceState()).enabled;
 const result=maintained?NextResponse.rewrite(new URL("/wartung",request.url),{status:503,headers:{"Cache-Control":"private, no-store","Retry-After":"60"},request:{headers}}):routeProxy(request,headers);
 const response=result.headers.get('x-middleware-next')==='1'?NextResponse.next({request:{headers}}):result;
 if(explicit)response.cookies.set(localeCookie,asLocale(requested),{path:'/',maxAge:31536000,sameSite:'lax',secure:request.nextUrl.protocol==='https:'});
 return response;
}

export const config={
  matcher:[
    "/api/:path*",
    "/","/angebot","/bericht","/opengraph-image","/produkt","/preise","/login","/registrieren","/portal/:path*","/demo","/agb","/datenschutz","/impressum","/auftragsbearbeitung","/unterauftragsbearbeiter","/email-bestaetigen","/einladung","/passwort-vergessen","/passwort-zuruecksetzen",
    "/operator/:path*","/dev/:path*","/dashboard/:path*","/kunden/:path*","/angebote/:path*","/rechnungen/:path*",
    "/zahlungen/:path*","/produkte/:path*","/mitarbeiter/:path*","/abwesenheiten/:path*","/spesen/:path*",
    "/zeit/:path*","/support/:path*","/einstellungen/:path*","/belege/:path*",
    "/berichte/:path*","/projekte/:path*","/benachrichtigungen/:path*","/willkommen/:path*","/finanzen/:path*","/lieferanten/:path*","/vertraege/:path*"
  ]
};
