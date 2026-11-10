import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Provider } from 'jotai';
import { jotaiStore } from './store/8-jotai-store.ts';
import { installControllers } from './store/5-controllers';
import { App } from './components/0-all/0-app.tsx';

import './assets/styles/index.css';

installControllers();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Provider store={jotaiStore}>
            <App />
        </Provider>
    </StrictMode>,
);
