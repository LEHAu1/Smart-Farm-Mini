import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SylvaLivingWorldVariant } from '../threeui/sylva-living-world/SylvaLivingWorldScene';
import { Sparkles, Sliders, ChevronDown, ChevronUp, Eye, Layers } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const VARIANTS: { id: SylvaLivingWorldVariant; label: string; color: string }[] = [
  { id: 'living-green', label: 'Living Green', color: '#10b981' },
  { id: 'sakura-sunset', label: 'Sakura Sunset', color: '#ec4899' },
  { id: 'maple-autumn', label: 'Maple Autumn', color: '#f97316' },
  { id: 'sequoia-mist', label: 'Sequoia Mist', color: '#14b8a6' },
];

export type GlassPreset = 'crystal-0' | 'crystal-2' | 'soft-10' | 'frosted-24';

interface PresetConfig {
  id: GlassPreset;
  label: string;
  blur: number; // in px
  alphaFactor: number; // multiplier
}

const GLASS_PRESETS: PresetConfig[] = [
  { id: 'crystal-0', label: 'Trong vắt (0px)', blur: 0, alphaFactor: 0.2 },
  { id: 'crystal-2', label: 'Trong vắt (2px)', blur: 2, alphaFactor: 0.25 },
  { id: 'soft-10', label: 'Trong vừa (10px)', blur: 10, alphaFactor: 0.6 },
  { id: 'frosted-24', label: 'Kính mờ (24px)', blur: 24, alphaFactor: 1.0 },
];

/**
 * SylvaVariantToolbar: Real-time control toolbar for 3D background variants,
 * Crystal Clear glass transparency, and center scene softening.
 * Persists preferences in localStorage across all pages.
 */
export function SylvaVariantToolbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Debug flag: hidden by default in production; enabled via ?debug=1 or VITE_DEBUG_3D
  const isDebug =
    import.meta.env.VITE_DEBUG_3D === 'true' ||
    new URLSearchParams(location.search).get('debug') === '1' ||
    (typeof window !== 'undefined' && localStorage.getItem('smartfarm_debug_3d') === 'true');

  if (!isDebug) {
    return null;
  }

  return <SylvaVariantToolbarInner location={location} navigate={navigate} isDark={isDark} />;
}

function SylvaVariantToolbarInner({
  location,
  navigate,
  isDark,
}: {
  location: ReturnType<typeof useLocation>;
  navigate: ReturnType<typeof useNavigate>;
  isDark: boolean;
}) {

  // Load persisted states from localStorage with safe defaults
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('smartfarm_toolbar_collapsed') === 'true';
  });

  const [activePreset, setActivePreset] = useState<GlassPreset>(() => {
    return (localStorage.getItem('smartfarm_glass_preset') as GlassPreset) || 'crystal-0';
  });

  const [blurPx, setBlurPx] = useState<number>(() => {
    const saved = localStorage.getItem('smartfarm_glass_blur');
    return saved !== null ? Number(saved) : 0;
  });

  const [alphaPercent, setAlphaPercent] = useState<number>(() => {
    const saved = localStorage.getItem('smartfarm_glass_alpha');
    return saved !== null ? Number(saved) : (isDark ? 6 : 8);
  });

  const [softnessPercent, setSoftnessPercent] = useState<number>(() => {
    const saved = localStorage.getItem('smartfarm_bg_softness');
    return saved !== null ? Number(saved) : (isDark ? 26 : 20);
  });

  const searchParams = new URLSearchParams(location.search);
  const currentVariant = (searchParams.get('bg') as SylvaLivingWorldVariant) || 'living-green';

  const handleSelectVariant = (v: SylvaLivingWorldVariant) => {
    searchParams.set('bg', v);
    navigate({ search: searchParams.toString() }, { replace: true });
  };

  const handleApplyPreset = (preset: PresetConfig) => {
    setActivePreset(preset.id);
    setBlurPx(preset.blur);
    const newAlpha = Math.round((isDark ? 28 : 38) * preset.alphaFactor);
    setAlphaPercent(newAlpha);
    localStorage.setItem('smartfarm_glass_preset', preset.id);
    localStorage.setItem('smartfarm_glass_blur', String(preset.blur));
    localStorage.setItem('smartfarm_glass_alpha', String(newAlpha));
  };

  // Sync CSS Variables to Document Root in real-time
  useEffect(() => {
    const root = document.documentElement;

    const cardAlpha = Math.max(0.02, Math.min(0.9, alphaPercent / 100));
    const barAlpha = Math.max(0.04, Math.min(0.9, (alphaPercent * 1.25) / 100));
    const heroAlpha = Math.max(0.08, Math.min(0.9, (alphaPercent * 2.2) / 100));
    const inputAlpha = Math.max(0.12, Math.min(0.9, (alphaPercent * 2.4) / 100));
    const softness = Math.max(0, Math.min(0.8, softnessPercent / 100));

    root.style.setProperty('--glass-blur', `${blurPx}px`);
    root.style.setProperty('--glass-alpha-card', cardAlpha.toFixed(3));
    root.style.setProperty('--glass-alpha-bar', barAlpha.toFixed(3));
    root.style.setProperty('--glass-alpha-hero', heroAlpha.toFixed(3));
    root.style.setProperty('--glass-alpha-input', inputAlpha.toFixed(3));
    root.style.setProperty('--sylva-softness', softness.toFixed(3));

    if (isDark) {
      root.style.setProperty('--glass-bg', `rgba(15, 23, 42, ${cardAlpha.toFixed(3)})`);
      root.style.setProperty('--glass-bar-bg', `rgba(15, 23, 42, ${barAlpha.toFixed(3)})`);
      root.style.setProperty('--glass-input-bg', `rgba(15, 23, 42, ${inputAlpha.toFixed(3)})`);
    } else {
      root.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${cardAlpha.toFixed(3)})`);
      root.style.setProperty('--glass-bar-bg', `rgba(255, 255, 255, ${barAlpha.toFixed(3)})`);
      root.style.setProperty('--glass-input-bg', `rgba(255, 255, 255, ${inputAlpha.toFixed(3)})`);
    }

    localStorage.setItem('smartfarm_glass_blur', String(blurPx));
    localStorage.setItem('smartfarm_glass_alpha', String(alphaPercent));
    localStorage.setItem('smartfarm_bg_softness', String(softnessPercent));
  }, [blurPx, alphaPercent, softnessPercent, isDark]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('smartfarm_toolbar_collapsed', String(next));
      return next;
    });
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={toggleCollapse}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-line/80 bg-surface/85 backdrop-blur-xl p-2 px-3 shadow-3d-floating text-xs font-semibold text-ink hover:bg-surface focus-ring"
        title="Mở thanh điều khiển Cảnh 3D & Kính trong vắt"
      >
        <Sparkles className="size-4 text-primary animate-pulse" />
        <span className="text-[11px] font-bold">Kính trong vắt ({blurPx}px)</span>
        <ChevronUp className="size-3.5 text-muted ml-0.5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col gap-2.5 rounded-2xl border border-line/80 bg-surface/90 backdrop-blur-2xl p-3.5 shadow-3d-floating text-xs max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Title Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-line/60 pb-1.5">
        <div className="flex items-center gap-1.5 font-bold text-ink">
          <Sparkles className="size-3.5 text-primary" />
          <span className="text-xs uppercase tracking-wider">Chế độ "Kính trong vắt"</span>
        </div>
        <button
          type="button"
          onClick={toggleCollapse}
          className="rounded-lg p-1 text-muted hover:text-ink hover:bg-canvas transition-colors"
          title="Thu gọn thanh điều khiển"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>

      {/* 1. Glass Presets */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
          <Layers className="size-3 text-primary" />
          <span>Mức kính:</span>
        </span>
        <div className="grid grid-cols-2 gap-1">
          {GLASS_PRESETS.map((p) => {
            const isMatch = activePreset === p.id && blurPx === p.blur;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`px-2 py-1.5 rounded-lg font-semibold text-[10px] transition-all border text-center ${
                  isMatch
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'text-ink-secondary hover:text-ink hover:bg-canvas/80 border-line/60'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 3D Background Variant Picker */}
      <div className="space-y-1 pt-1 border-t border-line/60">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
          <Eye className="size-3 text-primary" />
          <span>Cảnh 3D:</span>
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {VARIANTS.map((v) => {
            const isActive = currentVariant === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelectVariant(v.id)}
                className={`px-2 py-1 rounded-full font-semibold transition-all text-[10px] flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-ink-secondary hover:text-ink hover:bg-canvas/80'
                }`}
              >
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: v.color }}
                />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Real-time Sliders: Blur, Alpha, Scene Softness */}
      <div className="pt-1.5 space-y-2 border-t border-line/60">
        {/* Slider A: Blur */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-muted font-medium">
            <span className="flex items-center gap-1">
              <Sliders className="size-2.5 text-primary" />
              <span>Độ mờ khúc xạ (Blur):</span>
            </span>
            <span className="font-mono font-bold text-ink">{blurPx}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            step="1"
            value={blurPx}
            onChange={(e) => setBlurPx(Number(e.target.value))}
            className="w-full accent-primary h-1 bg-line/80 rounded-lg cursor-pointer"
          />
        </div>

        {/* Slider B: Card Alpha */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-muted font-medium">
            <span>Độ đục thẻ (Alpha):</span>
            <span className="font-mono font-bold text-ink">{alphaPercent}%</span>
          </div>
          <input
            type="range"
            min="2"
            max="40"
            step="1"
            value={alphaPercent}
            onChange={(e) => setAlphaPercent(Number(e.target.value))}
            className="w-full accent-primary h-1 bg-line/80 rounded-lg cursor-pointer"
          />
        </div>

        {/* Slider C: Scene Softness */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[10px] text-muted font-medium">
            <span>Độ dịu cảnh giữa (Softness):</span>
            <span className="font-mono font-bold text-ink">{softnessPercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            step="2"
            value={softnessPercent}
            onChange={(e) => setSoftnessPercent(Number(e.target.value))}
            className="w-full accent-primary h-1 bg-line/80 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
