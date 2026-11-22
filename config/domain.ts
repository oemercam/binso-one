export const domainConfig = {
  currency: "CHF",
  defaultLocaleTag: "de-CH",
  defaultPaymentDays: 30,
  defaultOfferValidityDays: 30,
  defaultReminderDays: 10,
  reminderStages: ["Zahlungserinnerung","1. Mahnung","2. Mahnung"] as const,
  trialDays: 14,
  emailVerificationMinutes: 24 * 60,
  emailCodeMinutes: 10,
  emailCodeMaxAttempts: 5,
  passwordResetMinutes: 30,
  invitationMinutes: 7 * 24 * 60,
  vatRates: [8.1, 2.6, 3.8, 0] as const,
  defaultVatRate: 8.1,
  fiscalYearStartMonth: 1,
  pilotFeedbackCooldownDays: 14,
  pilotFeedbackMinViews: 4,
  pilotFeedbackPromptDelayMs: 45_000,
  standardWorkdayStart: "08:00",
  standardWorkdayEnd: "17:00",
  standardBreakMinutes: 60,
  standardWorkdayHours: 8,
  standardWeeklyHours: 42,
  standardVacationDays: 25,
} as const;

export const milliseconds = {minute:60_000,hour:60*60_000,day:24*60*60_000} as const;
export const planIds=["start","business","pro"] as const;
export const billingCycles=["monthly","yearly"] as const;
export type PlanId=(typeof planIds)[number];
export type BillingCycle=(typeof billingCycles)[number];
export function addDays(date:Date,days:number){return new Date(date.getTime()+days*milliseconds.day)}
export function addHours(date:Date,hours:number){return new Date(date.getTime()+hours*milliseconds.hour)}
const swissDateFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'});
const swissMonthFormatter=new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',month:'long',year:'numeric'});

export function isoDate(date:Date=new Date()){return swissDateFormatter.format(date)}

export function currentFiscalPeriod(date:Date=new Date()){
 const [year,month]=isoDate(date).split('-').map(Number);
 const quarter=Math.ceil(month/3);
 return {year,quarter,label:`Q${quarter} ${year}`,monthLabel:swissMonthFormatter.format(date)};
}

// UTC is only a coordinate for arithmetic on an already resolved Swiss calendar date.
function swissCalendarDate(date:Date){return new Date(isoDate(date)+'T00:00:00Z')}

export function startOfCurrentWeekIso(date:Date=new Date()){
 const day=swissCalendarDate(date);
 return addDays(day,-((day.getUTCDay()+6)%7)).toISOString().slice(0,10);
}

export function dueDateFrom(date:Date=new Date(),days:number=domainConfig.defaultPaymentDays){
 return addDays(swissCalendarDate(date),days).toISOString().slice(0,10);
}
