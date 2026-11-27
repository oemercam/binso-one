import 'server-only';

export function operatorPasskeyLoginEnabled(){
 return process.env.BINSO_OPERATOR_PASSKEY_LOGIN === 'true';
}

export function operatorPasskeySetupEnabled(){
 return process.env.BINSO_OPERATOR_PASSKEY_SETUP === 'true';
}

export function operatorEmailLoginEnabled(){
 return process.env.BINSO_OPERATOR_EMAIL_LOGIN === 'true';
}

export function operatorEmailSetupEnabled(){
 return process.env.BINSO_OPERATOR_EMAIL_SETUP === 'true';
}
