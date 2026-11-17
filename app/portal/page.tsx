import {pilotEnabled} from '@/config/plan-access';
import {redirect} from "next/navigation";
export default function Page(){redirect(pilotEnabled?"/dashboard":"/login");}
