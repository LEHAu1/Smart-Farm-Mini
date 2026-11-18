import type { ReactNode } from 'react';
import { Sprout, Activity, Droplets, BellRing, Sparkles, Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  storyTitle?: string;
  storySubtitle?: string;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  eyebrow = 'SMART FARM MINI IOT',
  storyTitle = 'Chăm một mầm xanh.\nNuôi cả bình yên.',
  storySubtitle = 'Nền tảng hỗ trợ theo dõi độ ẩm đất, mực nước và điều khiển chu kỳ tưới cho nhiều chậu cây từ một tài khoản duy nhất.',
}: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2 bg-canvas transition-colors duration-200">
      {/* Cột trái: Brand Story / Visual Panel */}
      <aside
        className="hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#134935] via-[#1a5a41] to-[#0c3123] p-10 text-white lg:flex xl:p-16 relative shadow-2xl"
        aria-label="Smart Farm Mini"
      >
        {/* Glow effects */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-teal-300/10 blur-3xl" />

        {/* Top brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 border border-white/20 text-white shadow-inner backdrop-blur-md">
            <Sprout className="size-6 text-emerald-300" />
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white leading-tight">Smart Farm Mini</span>
            <span className="text-[11px] font-medium tracking-wider text-emerald-200/80 uppercase mt-0.5">
              Smart IoT Agriculture
            </span>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-emerald-300" />
            <span>{language === 'en' ? 'PRECISION DIGITAL FARMING' : 'NÔNG NGHIỆP SỐ CHUẨN XÁC'}</span>
          </div>

          <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white lg:text-5xl whitespace-pre-line">
            {language === 'en' ? 'Nurturing green shoots.\nGrowing everyday peace.' : storyTitle}
          </h2>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-emerald-100/85">
            {language === 'en'
              ? 'An IoT platform for plant irrigation, soil moisture sensing, and water reservoir tracking across multiple nodes.'
              : storySubtitle}
          </p>

          {/* Feature Highlights Cards */}
          <div className="mt-8 grid grid-cols-1 gap-3.5 pt-4">
            <div className="flex items-center gap-3.5 rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/15">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  {language === 'en' ? 'Multi-Device Plant Monitoring' : 'Quản lý nhiều thiết bị trồng cây'}
                </p>
                <p className="text-[11px] text-emerald-200/70">
                  {language === 'en'
                    ? 'Track soil moisture and ambient temperature across all your garden nodes'
                    : 'Một tài khoản theo dõi độ ẩm đất, nhiệt độ của nhiều chậu cây cùng lúc'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/15">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                <Droplets className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  {language === 'en' ? 'Soil & Reservoir Tracking' : 'Đo độ ẩm đất & Mực nước bồn'}
                </p>
                <p className="text-[11px] text-emerald-200/70">
                  {language === 'en'
                    ? 'Ensure optimal soil wetness and monitor reservoir water levels for irrigation'
                    : 'Giữ ẩm tối ưu cho rễ cây và giám sát lượng nước còn lại trong bình chứa'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 rounded-xl bg-white/10 border border-white/10 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/15">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <BellRing className="size-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  {language === 'en' ? 'Smart Irrigation Control' : 'Điều khiển tưới tiêu thông minh'}
                </p>
                <p className="text-[11px] text-emerald-200/70">
                  {language === 'en'
                    ? 'Automate pump cycles by soil threshold or execute manual watering on demand'
                    : 'Thiết lập tự động bơm tưới theo ngưỡng ẩm hoặc điều khiển tưới thủ công'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-emerald-200/70">
          <span>{language === 'en' ? 'A small garden. A greener tomorrow.' : 'Một khu vườn nhỏ. Một khởi đầu xanh.'}</span>
          <span className="font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-md">SmartFarm v2.1</span>
        </div>
      </aside>

      {/* Cột phải: Form Content Side */}
      <section
        className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8 lg:px-12 bg-canvas relative"
        aria-labelledby="auth-title"
      >
        {/* Top-Right Theme & Language Toolbar */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-line bg-surface text-muted hover:text-ink hover:bg-surface-hover focus-ring transition-colors shadow-xs"
            title={theme === 'dark' ? t('theme_light', 'Chế độ sáng') : t('theme_dark', 'Chế độ tối')}
            aria-label={t('theme_toggle', 'Chuyển đổi giao diện sáng/tối')}
          >
            {theme === 'dark' ? (
              <Sun className="size-4 text-amber-400" />
            ) : (
              <Moon className="size-4 text-slate-600" />
            )}
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-surface text-ink hover:bg-surface-hover focus-ring text-xs font-bold transition-colors shadow-xs"
            title={t('language_select', 'Chọn ngôn ngữ')}
            aria-label={t('language_select', 'Chọn ngôn ngữ')}
          >
            <Languages className="size-3.5 text-primary" />
            <span>{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-surface p-7 sm:p-9 rounded-3xl border border-line shadow-xl">
          {/* Mobile Brand Header */}
          <div className="mb-6 flex items-center gap-3 font-bold text-primary lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <Sprout className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-ink leading-tight">Smart Farm Mini</span>
              <span className="text-[10px] text-muted font-semibold uppercase tracking-wider mt-0.5">Smart IoT Agriculture</span>
            </div>
          </div>

          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          )}
          <h1 id="auth-title" className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {subtitle}
            </p>
          )}

          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}
