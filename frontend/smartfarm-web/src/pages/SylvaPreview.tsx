import { useEffect, useState, lazy, Suspense } from 'react';
import type { SylvaLivingWorldVariant } from '../components/threeui/sylva-living-world/SylvaLivingWorldScene';

const SylvaLivingWorldSceneLazy = lazy(() =>
  import('../components/threeui/sylva-living-world/SylvaLivingWorldScene').then((m) => ({
    default: m.SylvaLivingWorldScene,
  }))
);

export default function SylvaPreviewPage() {
  const [variant, setVariant] = useState<SylvaLivingWorldVariant>('living-green');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bgParam = params.get('bg') as SylvaLivingWorldVariant;
    if (bgParam && ['living-green', 'sakura-sunset', 'maple-autumn', 'sequoia-mist'].includes(bgParam)) {
      setVariant(bgParam);
    }
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, background: '#000', overflow: 'hidden' }}>
      <Suspense fallback={null}>
        <SylvaLivingWorldSceneLazy
          key={variant}
          variant={variant}
          style={{ width: '100%', height: '100%' }}
        />
      </Suspense>
      {/* Floating Variant Switcher Toolbar */}
      <div style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        gap: 8,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(16px)',
        padding: '8px 16px',
        borderRadius: 999,
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}>
        {(['living-green', 'sakura-sunset', 'maple-autumn', 'sequoia-mist'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 0,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              background: variant === v ? '#10b981' : 'transparent',
              color: variant === v ? '#fff' : 'rgba(255, 255, 255, 0.7)',
              transition: 'all 0.2s ease',
            }}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
