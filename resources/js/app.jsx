import '../css/app.css';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        const emp_data =
    props.initialPage?.props?.emp_data ||
    props.initialPage?.props?.auth?.emp_data;

// Always clear old token first
localStorage.removeItem("authify-token");

// Then set new token if valid credentials exist
if (emp_data?.token && emp_data?.emp_id) {
    // Small delay to ensure old token is cleared
    setTimeout(() => {
        localStorage.setItem('authify-token', emp_data.token);
    }, 0);
}
        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
