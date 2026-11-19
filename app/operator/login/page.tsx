import {Suspense} from "react";
import {env} from "@/lib/server/env";
import OperatorLogin from "./operator-login";

export const dynamic="force-dynamic";

export default function Page(){
 return <Suspense><OperatorLogin emailLoginEnabled={env.operatorEmailLoginEnabled}/></Suspense>;
}
