'use client';

import {useSyncExternalStore} from 'react';
import type {ThemeMode} from '../theme';

function subscribeTheme(listener:()=>void){
 window.addEventListener('binso-theme',listener);
 return ()=>window.removeEventListener('binso-theme',listener);
}
function selectedTheme():ThemeMode{
 const mode=document.documentElement.dataset.themeMode;
 return mode==='light'||mode==='dark'?mode:'system';
}
export function useThemePreference(){
 return useSyncExternalStore(subscribeTheme,selectedTheme,()=>'system' as ThemeMode);
}
