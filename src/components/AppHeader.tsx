import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Shield, Sun } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { useI18n, managerLabel } from '@/lib/i18n';
import { useSession, useSettings } from '@/hooks/useData';
import { logoutAdmin } from '@/lib/api';
import { endSession } from '@/lib/session';
import { applyTheme, getMode, type Mode } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { SyncBadge } from '@/components/SyncBadge';
import { TennecoLogo } from '@/components/Brand';

export function AppHeader() {
  const { t, lang, setLang } = useI18n();
  const { session, admin } = useSession();
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  const [mode, setModeState] = useState<Mode>(() => getMode());

  const toggleMode = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    setModeState(next);
    applyTheme(next);
  };

  const signOut = async () => {
    endSession();
    // ลบเซสชันแอดมินที่ฝั่งเซิร์ฟเวอร์ด้วย ไม่ปล่อยให้โทเคนใช้ได้ต่อจนหมดอายุเอง
    await logoutAdmin();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-md pt-safe">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-5">
        <Link to={session ? '/plan' : '/'} className="focusable flex min-w-0 items-center gap-2.5 rounded-md">
          <TennecoLogo height={16} className="border" />
          <span className="hidden min-w-0 border-l pl-2.5 leading-none min-[400px]:block">
            <span className="block font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Gemba Walk</span>
            <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
              {settings?.plant_name ?? t('app.subtitle')}
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          <SyncBadge />

          {/* สวิตช์ภาษา */}
          <div className="flex h-8 items-center rounded-md border bg-card p-0.5">
            {(['th', 'en'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  'press focusable h-7 rounded-[4px] px-2 font-mono text-[11px] font-semibold uppercase tracking-wider',
                  lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={lang === l}
              >
                {l}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="iconSm"
            className="h-9 w-9"
            onClick={toggleMode}
            aria-label={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {session ? (
            <Popover>
              <PopoverTrigger asChild>
                <button className="focusable press flex items-center gap-2 rounded-md border bg-card py-0.5 pl-0.5 pr-2">
                  <Avatar name={managerLabel(session, lang)} src={session.avatar_url} seed={session.manager_id} size={28} />
                  <span className="hidden max-w-[120px] truncate text-[13px] font-medium sm:block">
                    {managerLabel(session, lang)}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-60 p-2">
                <div className="border-b px-2 pb-2">
                  <div className="truncate text-sm font-semibold">{managerLabel(session, lang)}</div>
                  <div className="num text-[11px] text-muted-foreground">
                    {session.manager_code} · {session.department}
                  </div>
                </div>
                <div className="pt-2">
                  {admin ? (
                    <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <Link to="/admin/settings">
                        <Shield className="h-4 w-4" />
                        {t('nav.settings')}
                      </Link>
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" className="w-full justify-start text-bad" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                    {t('auth.signOut')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          ) : admin ? (
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.exitAdmin')}</span>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="brand-bar h-[3px] w-full" />
    </header>
  );
}
