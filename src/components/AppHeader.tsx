import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Palette, Shield, Sun } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui/misc';
import { Button } from '@/components/ui/button';
import { useI18n, managerLabel } from '@/lib/i18n';
import { useSession, useSettings } from '@/hooks/useData';
import { endSession, setAdmin } from '@/lib/session';
import { ACCENTS, applyTheme, getAccent, getMode, type Accent, type Mode } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { SyncBadge } from '@/components/SyncBadge';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn('grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-[5px] border bg-primary', className)}>
      <span className="hazard h-full w-full opacity-90" />
    </span>
  );
}

export function AppHeader() {
  const { t, lang, setLang } = useI18n();
  const { session, admin } = useSession();
  const { data: settings } = useSettings();
  const navigate = useNavigate();
  const [accent, setAccentState] = useState<Accent>(() => getAccent());
  const [mode, setModeState] = useState<Mode>(() => getMode());

  const setAccent = (a: Accent) => {
    setAccentState(a);
    applyTheme(a, mode);
  };
  const toggleMode = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    setModeState(next);
    applyTheme(accent, next);
  };

  const signOut = () => {
    endSession();
    setAdmin(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md pt-safe">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-5">
        <Link to={session ? '/plan' : '/'} className="focusable flex min-w-0 items-center gap-2.5 rounded-md">
          <BrandMark />
          <span className="min-w-0 leading-none">
            <span className="block font-mono text-[13px] font-semibold uppercase tracking-[0.16em]">Gemba</span>
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="iconSm" aria-label="Appearance">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3">
              <div className="label-micro mb-2">Accent</div>
              <div className="mb-3 flex gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id)}
                    title={a.label}
                    className={cn(
                      'press focusable h-8 flex-1 rounded-md border-2',
                      accent === a.id ? 'border-foreground' : 'border-transparent',
                    )}
                    style={{ background: a.swatch }}
                  />
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={toggleMode}>
                {mode === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {mode === 'dark' ? 'Light mode' : 'Dark mode'}
              </Button>
            </PopoverContent>
          </Popover>

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
      <div className="hazard h-[2px] w-full opacity-80" />
    </header>
  );
}
