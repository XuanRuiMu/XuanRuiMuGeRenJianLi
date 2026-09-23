import { useEffect, useRef } from 'react'

interface CSSSilkProps {
  className?: string
  variant: 'waves' | 'flow' | 'fabric' | 'gradient' | 'moire' | 'interference' | 'liquid' | 'satin'
}

export function CSSSilkBackground({ className, variant }: CSSSilkProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const styleSheet = document.createElement('style')
    styleSheet.textContent = getSilkCSS(variant)
    document.head.appendChild(styleSheet)

    return () => {
      document.head.removeChild(styleSheet)
    }
  }, [variant])

  return (
    <div
      ref={containerRef}
      className={`${className} silk-bg silk-bg-${variant}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
      aria-hidden="true"
    />
  )
}

function getSilkCSS(variant: string): string {
  const base = `
    .silk-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background-color: #f8f9fb;
    }
  `

  const variants: Record<string, string> = {
    waves: `
      .silk-bg-waves {
        background:
          linear-gradient(135deg, #f8f9fb 0%, #e8ecf1 25%, #f8f9fb 50%, #e8ecf1 75%, #f8f9fb 100%),
          radial-gradient(ellipse at 20% 30%, rgba(200,200,220,0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, rgba(180,190,210,0.12) 0%, transparent 50%);
        background-size: 200% 200%, 100% 100%, 100% 100%;
        animation: silk-wave-shift 20s ease-in-out infinite alternate;
      }
      @keyframes silk-wave-shift {
        0% { background-position: 0% 0%, center, center; }
        25% { background-position: 100% 50%, center, center; }
        50% { background-position: 50% 100%, center, center; }
        75% { background-position: 0% 50%, center, center; }
        100% { background-position: 0% 0%, center, center; }
      }
    `,
    flow: `
      .silk-bg-flow {
        background:
          repeating-linear-gradient(
            45deg,
            #f8f9fb 0,
            #f8f9fb 20px,
            #eef1f5 20px,
            #eef1f5 40px
          ),
          linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.1) 50%);
        background-size: 100px 100px, 200% 100%;
        animation: silk-flow 15s linear infinite;
      }
      @keyframes silk-flow {
        0% { background-position: 0 0, 0 0; }
        100% { background-position: 100px 100px, 200% 0; }
      }
    `,
    fabric: `
      .silk-bg-fabric {
        background-image:
          url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E"),
          linear-gradient(45deg, #f8f9fb 25%, transparent 25%) -50px 0,
          linear-gradient(-45deg, #f8f9fb 25%, transparent 25%) -50px 0,
          linear-gradient(45deg, transparent 75%, #eef1f5 75%) -50px 0,
          linear-gradient(-45deg, transparent 75%, #eef1f5 75%) -50px 0;
        background-size:
          256px 256px,
          100px 100px,
          100px 100px,
          100px 100px,
          100px 100px;
        background-color: #f8f9fb;
        animation: silk-fabric-drift 30s linear infinite;
      }
      @keyframes silk-fabric-drift {
        0% { background-position: 0 0, 0 0, 0 0, 0 0, 0 0; }
        100% { background-position: 256px 256px, 100px 100px, -100px 100px, 100px -100px, -100px -100px; }
      }
    `,
    gradient: `
      .silk-bg-gradient {
        background:
          linear-gradient(115deg, #fdfdfe 0%, #f0f2f6 20%, #f8f9fb 40%, #eef2f8 60%, #f5f7fc 80%, #fafbfd 100%),
          radial-gradient(circle at 15% 25%, rgba(255,255,255,0.4) 0%, transparent 40%),
          radial-gradient(circle at 85% 75%, rgba(240,242,246,0.3) 0%, transparent 40%),
          radial-gradient(circle at 50% 50%, rgba(248,249,251,0.2) 0%, transparent 60%);
        background-size: 300% 300%, 100% 100%, 100% 100%, 100% 100%;
        animation: silk-gradient-breathe 25s ease-in-out infinite alternate;
      }
      @keyframes silk-gradient-breathe {
        0% { background-position: 0% 50%, center, center, center; filter: brightness(1) saturate(1); }
        50% { background-position: 100% 50%, center, center, center; filter: brightness(1.02) saturate(1.1); }
        100% { background-position: 0% 50%, center, center, center; filter: brightness(1) saturate(1); }
      }
    `,
    moire: `
      .silk-bg-moire {
        background:
          repeating-conic-gradient(from 0deg, #f8f9fb 0deg, #f8f9fb 0.5deg, transparent 0.5deg, transparent 1deg),
          repeating-radial-gradient(circle at center, #eef1f5 0px, #eef1f5 2px, transparent 2px, transparent 4px);
        background-size: 100% 100%, 300px 300%;
        opacity: 0.6;
        animation: silk-moire-rotate 40s linear infinite, silk-moire-scale 20s ease-in-out infinite alternate;
      }
      @keyframes silk-moire-rotate {
        0% { transform: rotate(0deg) scale(1); }
        100% { transform: rotate(360deg) scale(1); }
      }
      @keyframes silk-moire-scale {
        0% { background-size: 100% 100%, 300px 300%; }
        100% { background-size: 100% 100%, 400px 400px; }
      }
    `,
    interference: `
      .silk-bg-interference {
        background:
          linear-gradient(90deg, rgba(248,249,251,0) 0%, rgba(248,249,251,0.05) 50%, rgba(248,249,251,0) 100%),
          linear-gradient(0deg, rgba(238,241,245,0) 0%, rgba(238,241,245,0.04) 50%, rgba(238,241,245,0) 100%);
        background-size: 200% 100%, 100% 200%;
        animation: silk-interference-x 12s ease-in-out infinite alternate, silk-interference-y 18s ease-in-out infinite alternate-reverse;
      }
      @keyframes silk-interference-x {
        0% { background-position: 0% 50%, 50% 0%; }
        100% { background-position: 100% 50%, 50% 0%; }
      }
      @keyframes silk-interference-y {
        0% { background-position: 0% 50%, 50% 0%; }
        100% { background-position: 0% 50%, 50% 100%; }
      }
    `,
    liquid: `
      .silk-bg-liquid {
        background:
          radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.3) 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 20% 80%, rgba(240,242,246,0.2) 0%, transparent 60%),
          radial-gradient(ellipse 70% 45% at 80% 20%, rgba(245,247,252,0.25) 0%, transparent 65%),
          radial-gradient(ellipse 50% 35% at 40% 60%, rgba(238,241,245,0.15) 0%, transparent 55%);
        background-size: 150% 150%;
        background-color: #f8f9fb;
        animation: silk-liquid-flow 35s ease-in-out infinite alternate;
      }
      @keyframes silk-liquid-flow {
        0% { background-position: 0% 0%, 20% 80%, 80% 20%, 40% 60%; border-radius: 0; }
        25% { background-position: 50% 25%, 50% 70%, 40% 30%, 60% 40%; border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
        50% { background-position: 100% 50%, 80% 60%, 20% 40%, 50% 30%; border-radius: 60% 40% 30% 70% / 60% 60% 40% 40%; }
        75% { background-position: 50% 75%, 30% 50%, 70% 10%, 40% 80%; border-radius: 30% 70% 70% 30% / 70% 70% 30% 30%; }
        100% { background-position: 0% 0%, 20% 80%, 80% 20%, 40% 60%; border-radius: 0; }
      }
    `,
    satin: `
      .silk-bg-satin {
        background:
          linear-gradient(90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.08) 10%,
            rgba(255,255,255,0) 20%,
            rgba(248,249,251,0.04) 30%,
            rgba(255,255,255,0) 40%,
            rgba(245,247,252,0.06) 50%,
            rgba(255,255,255,0) 60%,
            rgba(240,242,246,0.05) 70%,
            rgba(255,255,255,0) 80%,
            rgba(238,241,245,0.07) 90%,
            rgba(255,255,255,0) 100%
          ),
          linear-gradient(180deg,
            rgba(248,249,251,0) 0%,
            rgba(255,255,255,0.03) 25%,
            rgba(248,249,251,0) 50%,
            rgba(240,242,246,0.04) 75%,
            rgba(255,255,255,0) 100%
          );
        background-size: 200% 100%, 100% 300%;
        background-color: #f8f9fb;
        animation: silk-satin-shimmer 8s ease-in-out infinite, silk-satin-drift 25s linear infinite;
      }
      @keyframes silk-satin-shimmer {
        0%, 100% { opacity: 0.6; filter: brightness(1) contrast(1); }
        50% { opacity: 0.9; filter: brightness(1.15) contrast(1.1); }
      }
      @keyframes silk-satin-drift {
        0% { background-position: 0% 50%, 50% 0%; }
        100% { background-position: 200% 50%, 50% 300%; }
      }
    `,
  }

  return base + (variants[variant] || '')
}
