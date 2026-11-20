import 'server-only';

export function operatorPasskeyLoginEnabled(){
 return process.env.BINSO_OPERATOR_PASSKEY_LOGIN === 'true';
}
