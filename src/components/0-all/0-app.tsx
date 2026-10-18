import { Toaster } from "@/ui/shadcn/sonner";
import { AllDialogs } from "./1-globals";
import { Workspace } from "../1-workspace/0-all/0-all-workspace";
import { AppPages } from "../5-welcome";

export function App() {
    return (<>
        <Toaster />
        <AllDialogs />

        <AppPages>
            <Workspace />
        </AppPages>
    </>);
}
