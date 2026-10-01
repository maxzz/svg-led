import { Toaster } from '@/ui/shadcn/sonner';
import { AllDialogs } from './1-globals';
import { AppPages } from '../5-welcome';
import { Workspace } from '../1-workspace';

export function App() {
    return (<>
        <Toaster />
        <AllDialogs />

        <AppPages>
            <Workspace />
        </AppPages>
    </>);
}
