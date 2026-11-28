import type { ReactNode } from 'react';
import { Sprout, Activity, Droplets, BellRing, Sparkles, Sun, Moon, Languages } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { AppBackgroundScene } from '../components/layout/AppBackgroundScene';
import { AuthPlantScene } from '../components/auth/AuthPlantScene';
import type { PlantMood } from '../components/auth/auth-plant-mood';
import type { SylvaLivingWorldVariant } from '../components/threeui/sylva-living-world/SylvaLivingWorldScene';

export interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  storyTitle?: string;
  storySubtitle?: string;
  plantSlot?: ReactNode;
  plantMood?: PlantMood;
  plantProgress?: number;
  bgVariant?: SylvaLivingWorldVariant;
  isTransitioning?: boolean;
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  eyebrow = 'SMART FARM MINI IOT',
  storyTitle = 'Chăm một mầm xanh.\nNuôi cả bình yên.',
  storySubtitle = 'Nền tảng hỗ trợ theo dõi độ ẩm đất, mực nước và điều khiển chu kỳ tưới cho nhiều chậu cây từ một tài khoản duy nhất.',
  plantSlot,
  plantMood = 'idle',
  plantProgress = 0,
  bgVariant = 'sequoia-mist',
  isTransitioning = false,
}: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <main className="min-h-[100dvh] flex flex-col lg:grid lg:grid-cols-2 bg-transparent text-ink transition-colors duration-200 overflow-x-hidden relative auth-scrollable">
      {/* ── Background Scene Wrapper with Scale/Brightness Gateway Transition ── */}
      <div
        className={`fixed inset-0 z-0 pointer-events-none ${
          isTransitioning ? 'auth-gateway-transition' : 'transition-transform duration-500'
        }`}
        aria-hidden="true"
      >
        <AppBackgroundScene variant={bgVariant} />
        {/* Soft morning dawn god rays slanting across background */}
        <div className="auth-dawn-rays" />
      </div>

      {/* ── Edge Vignette for Foreground Separation ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.3)_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.6)_100%)]"
        aria-hidden="true"
      />

      {/* ── Foreground Organic Leaves & Golden Pollen (Corners & Gentle Airflow) ── */}
      <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden" aria-hidden="true">
        {/* Top-left blurred canopy branch (Emerald green) */}
        <svg
          className="foreground-leaf top-[-40px] left-[-30px] w-48 h-48 sm:w-64 sm:h-64 text-emerald-900/60 dark:text-emerald-950/80"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <path d="M10,0 C60,40 120,60 180,30 C150,90 90,140 20,160 C50,110 50,60 10,0 Z" />
          <path d="M5,40 C50,80 110,95 155,75 C125,120 75,160 15,175 C38,135 40,90 5,40 Z" opacity="0.65" />
        </svg>

        {/* Bottom-right soft garden leaf (Forest teal green) */}
        <svg
          className="foreground-leaf bottom-[-30px] right-[-20px] w-40 h-40 sm:w-56 sm:h-56 text-teal-900/50 dark:text-teal-950/70"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <path d="M190,200 C140,160 80,140 20,170 C50,110 110,60 180,40 C150,90 150,140 190,200 Z" />
        </svg>

        {/* Ambient Warm Golden Fireflies & Pollen Particles */}
        <span
          className="firefly w-2 h-2 top-[22%] left-[18%]"
          style={{ animationDelay: '0s', animationDuration: '7s' }}
        />
        <span
          className="firefly w-1.5 h-1.5 top-[38%] left-[42%]"
          style={{ animationDelay: '2.5s', animationDuration: '6s' }}
        />
        <span
          className="firefly w-2.5 h-2.5 top-[65%] left-[28%]"
          style={{ animationDelay: '1.2s', animationDuration: '8s' }}
        />
        <span
          className="firefly w-1.5 h-1.5 top-[15%] right-[24%]"
          style={{ animationDelay: '3.7s', animationDuration: '5.5s' }}
        />
        <span
          className="firefly w-2 h-2 top-[75%] right-[15%]"
          style={{ animationDelay: '4.5s', animationDuration: '6.5s' }}
        />
      </div>

      {/* ── Cột trái: Brand Story & 3D Interactive Plant Visual Panel (Laptop, Desktop) ── */}
      <aside
        className="hidden flex-col justify-between overflow-y-auto auth-scrollable p-5 lg:p-8 xl:p-12 text-white lg:flex relative z-10 max-h-[100dvh]"
        aria-label="Smart Farm Mini"
      >
        {/* Top brand header */}
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 border border-white/20 text-white shadow-inner backdrop-blur-md shrink-0">
            <Sprout className="size-4 sm:size-5 text-emerald-300" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight drop-shadow-md">
              Smart Farm Mini
            </span>
            <span className="text-[10px] font-medium tracking-wider text-emerald-200/90 uppercase mt-0.5 drop-shadow-sm">
              Smart IoT Agriculture
            </span>
          </div>
        </div>

        {/* 3D Interactive Plant Display & Story Block */}
        <div className="relative z-10 my-auto py-1 max-w-lg xl:max-w-xl 2xl:max-w-2xl flex flex-col items-center w-full">
          {/* Plant Canvas Container: Scaled cleanly without overlapping pill or footer */}
          <div className="w-full max-w-xs h-40 sm:h-48 short:h-32 mb-1 flex items-center justify-center auth-hero-plant shrink-0">
            {plantSlot || (
              <AuthPlantScene mood={plantMood} progress={plantProgress} className="w-full h-full" />
            )}
          </div>

          {/* Text block with soft feathered radial backdrop */}
          <div className="relative mt-1 sm:mt-2 flex flex-col items-center text-center max-w-md xl:max-w-lg">
            <div className="auth-text-backdrop" aria-hidden="true" />

            {/* Eyebrow badge: positioned cleanly right above title, never overlapping plant pedestal */}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/60 dark:bg-black/50 border border-emerald-400/30 px-3 py-1 text-[11px] font-semibold text-emerald-300 backdrop-blur-md shadow-xs mb-2">
              <Sparkles className="size-3 text-emerald-300" />
              <span>{language === 'en' ? 'PRECISION DIGITAL FARMING' : 'NÔNG NGHIỆP SỐ CHUẨN XÁC'}</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white text-center whitespace-pre-line text-contrast-heavy drop-shadow-md">
              {language === 'en' ? 'Nurturing green shoots.\nGrowing everyday peace.' : storyTitle}
            </h2>

            <p className="mt-2 text-xs sm:text-sm lg:text-base leading-relaxed text-slate-100 font-medium text-center text-shadow-contrast auth-story-subtitle">
              {language === 'en'
                ? 'An IoT platform for plant irrigation, soil moisture sensing, and water reservoir tracking across multiple nodes.'
                : storySubtitle}
            </p>
          </div>

          {/* Feature Highlights Glass Cards: Adaptable to viewport height */}
          <div className="mt-4 grid grid-cols-1 gap-2 w-full pt-0.5 auth-feature-cards">
            <div className="flex items-center gap-3 rounded-xl bg-slate-900/50 dark:bg-black/45 border border-white/15 p-2.5 backdrop-blur-md transition-all hover:bg-slate-900/65 shadow-sm auth-feature-card">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/25 text-emerald-300">
                <Activity className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {language === 'en' ? 'Multi-Device Plant Monitoring' : 'Quản lý nhiều thiết bị trồng cây'}
                </p>
                <p className="text-[11px] text-emerald-200/90 truncate auth-feature-card-desc">
                  {language === 'en'
                    ? 'Track soil moisture and ambient temperature across all nodes'
                    : 'Một tài khoản theo dõi độ ẩm đất, nhiệt độ của nhiều chậu cây'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-900/50 dark:bg-black/45 border border-white/15 p-2.5 backdrop-blur-md transition-all hover:bg-slate-900/65 shadow-sm auth-feature-card">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/25 text-cyan-300">
                <Droplets className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {language === 'en' ? 'Soil & Reservoir Tracking' : 'Đo độ ẩm đất & Mực nước bồn'}
                </p>
                <p className="text-[11px] text-emerald-200/90 truncate auth-feature-card-desc">
                  {language === 'en'
                    ? 'Ensure optimal soil wetness and monitor reservoir water levels'
                    : 'Giữ ẩm tối ưu cho rễ cây và giám sát lượng nước còn lại'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-900/50 dark:bg-black/45 border border-white/15 p-2.5 backdrop-blur-md transition-all hover:bg-slate-900/65 shadow-sm auth-feature-card">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/25 text-amber-300">
                <BellRing className="size-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {language === 'en' ? 'Smart Irrigation Control' : 'Điều khiển tưới tiêu thông minh'}
                </p>
                <p className="text-[11px] text-emerald-200/90 truncate auth-feature-card-desc">
                  {language === 'en'
                    ? 'Automate pump cycles by soil threshold or execute watering'
                    : 'Thiết lập tự động bơm tưới theo ngưỡng ẩm hoặc điều khiển tưới'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-2.5 text-xs text-emerald-200/80 shrink-0">
          <span>{language === 'en' ? 'A small garden. A greener tomorrow.' : 'Một khu vườn nhỏ. Một khởi đầu xanh.'}</span>
          <span className="font-mono text-[11px] bg-white/15 px-2 py-0.5 rounded-md">SmartFarm v2.1</span>
        </div>
      </aside>

      {/* ── Cột phải: Form Content Side (Mobile, Tablet, Desktop, Touch) ── */}
      <section
        className="flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:py-8 md:px-8 lg:px-12 2xl:px-16 bg-transparent relative z-10 overflow-y-auto auth-scrollable"
        aria-labelledby="auth-title"
      >
        {/* Top-Right Theme & Language Toolbar (Touch friendly, >=44px touch target) */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl glass-button-secondary text-muted hover:text-ink focus-ring transition-colors shadow-xs touch-manipulation active:scale-95"
            title={theme === 'dark' ? t('theme_light', 'Chế độ sáng') : t('theme_dark', 'Chế độ tối')}
            aria-label={t('theme_toggle', 'Chuyển đổi giao diện sáng/tối')}
          >
            {theme === 'dark' ? (
              <Sun className="size-4 sm:size-5 text-amber-400" />
            ) : (
              <Moon className="size-4 sm:size-5 text-slate-700 dark:text-slate-200" />
            )}
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-xl glass-button-secondary text-ink focus-ring text-xs font-bold transition-colors shadow-xs touch-manipulation active:scale-95"
            title={t('language_select', 'Chọn ngôn ngữ')}
            aria-label={t('language_select', 'Chọn ngôn ngữ')}
          >
            <Languages className="size-3.5 sm:size-4 text-primary" />
            <span>{language === 'vi' ? '🇻🇳 VI' : '🇬🇧 EN'}</span>
          </button>
        </div>

        {/* Floating Auth Card with Balanced Glassmorphism (blur 8px, alpha 0.32-0.38) */}
        <div className="w-full max-w-[390px] sm:max-w-md auth-card-glass p-5 xs:p-6 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl relative z-10 transition-all my-auto">
          {/* Mobile Brand Header */}
          <div className="mb-4 sm:mb-5 flex items-center gap-3 font-bold text-primary lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm shrink-0">
              <Sprout className="size-4 sm:size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-ink leading-tight">Smart Farm Mini</span>
              <span className="text-[10px] text-muted font-semibold uppercase tracking-wider mt-0.5">
                Smart IoT Agriculture
              </span>
            </div>
          </div>

          {eyebrow && (
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          )}
          <h1 id="auth-title" className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted">
              {subtitle}
            </p>
          )}

          <div className="mt-4 sm:mt-5">{children}</div>
        </div>
      </section>
    </main>
  );
}
