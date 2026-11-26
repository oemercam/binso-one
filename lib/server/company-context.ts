import {createHash,timingSafeEqual} from 'node:crypto';

export const companyTokenPrefix='company.';
export const companyContextHeader='X-Binso-Company-Context';

/** Separate from the stored token hash and never accepted as authentication. */
export function companyContext(token:string|undefined){
 return token?.startsWith(companyTokenPrefix)
  ? createHash('sha256').update('binso-company-context:'+token).digest('hex')
  : undefined;
}

export function matchesCompanyContext(context:string,value:string|null){
 return !!value&&/^[0-9a-f]{64}$/.test(value)&&timingSafeEqual(Buffer.from(context,'hex'),Buffer.from(value,'hex'));
}
