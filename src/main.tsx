import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { I18nProvider } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/toast';
import { applyTheme } from '@/lib/theme';
import './index.css';

applyTheme();

/**
 * เปิดไฟล์ตรง ๆ (file://) ใช้ HashRouter เพื่อให้เส้นทางทำงานได้โดยไม่ต้องมีเซิร์ฟเวอร์
 * กรณีอื่นใช้ BrowserRouter โดยผูก basename กับ base ของ Vite เพื่อให้ deploy ได้ทั้ง
 *   Cloudflare Pages  -> BASE_URL = '/'            (เสิร์ฟที่ root)
 *   GitHub Pages      -> BASE_URL = '/Gemba_Audit/' (เสิร์ฟใต้ชื่อ repo)
 * โดยไม่ต้องแก้โค้ดสลับไปมา
 */
const isFile = window.location.protocol === 'file:';
const Router = isFile ? HashRouter : BrowserRouter;
const routerProps = isFile ? {} : { basename: import.meta.env.BASE_URL };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ToastProvider>
            <Router {...routerProps}>
              <App />
            </Router>
          </ToastProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
