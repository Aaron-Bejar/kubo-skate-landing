import { useCallback, useEffect, useRef, useState } from "react";

// Cambia a `false` si tu secuencia empieza mirando a la IZQUIERDA y termina a la DERECHA
const SECUENCIA_DE_DERECHA_A_IZQUIERDA = true;

// Controla qué porcentaje del alto de pantalla ocupa el personaje (0.75 - 0.82 recomendado)
const ESCALA_ALTO = 0.78;

const frameModules = import.meta.glob("./assets/frames/*.webp", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const FRAME_URLS = Object.keys(frameModules)
  .sort()
  .map((key) => frameModules[key]);

const MODOS_SKATE = [
  { id: "street", label: "Street", spec: '8.25" · Maple 7 capas' },
  { id: "park", label: "Park", spec: '8.50" · Concave profundo' },
  { id: "cruiser", label: "Cruiser", spec: "Ruedas 60mm · 78A" },
];

export default function App() {
  const heroRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lastDrawnFrame = useRef(-1);

  const targetProgress = useRef(0.5);
  const currentProgress = useRef(0.5);

  const [mirada, setMirada] = useState<"izq" | "centro" | "der">("centro");
  const [modoActivo, setModoActivo] = useState(0);

  // Dibuja el personaje centrado a escala cómoda y extiende el estudio a toda la pantalla
  const drawFrameFullBleed = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas || !img || !img.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(window.innerWidth * dpr);
    const ch = Math.round(window.innerHeight * dpr);

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // Recorte interior mínimo (8px) para evitar artefactos de compresión en el borde del video
    const pad = 8;
    const sW = img.naturalWidth - pad * 2;
    const sH = img.naturalHeight - pad * 2;

    // Calcula el tamaño del personaje dejando aire arriba y abajo
    const scale = Math.min((ch * ESCALA_ALTO) / sH, (cw * 0.92) / sW);
    const drawW = Math.round(sW * scale);
    const drawH = Math.round(sH * scale);
    const x = Math.round((cw - drawW) / 2);
    const y = Math.round((ch - drawH) / 2);

    const rightW = cw - (x + drawW);
    const bottomH = ch - (y + drawH);

    // 1. Esquinas del estudio
    if (x > 0 && y > 0) {
      ctx.drawImage(img, pad, pad, 16, 16, 0, 0, x + 1, y + 1);
    }
    if (rightW > 0 && y > 0) {
      ctx.drawImage(img, img.naturalWidth - pad - 16, pad, 16, 16, x + drawW - 1, 0, rightW + 1, y + 1);
    }
    if (x > 0 && bottomH > 0) {
      ctx.drawImage(img, pad, img.naturalHeight - pad - 16, 16, 16, 0, y + drawH - 1, x + 1, bottomH + 1);
    }
    if (rightW > 0 && bottomH > 0) {
      ctx.drawImage(
        img,
        img.naturalWidth - pad - 16,
        img.naturalHeight - pad - 16,
        16,
        16,
        x + drawW - 1,
        y + drawH - 1,
        rightW + 1,
        bottomH + 1
      );
    }

    // 2. Franjas superior e inferior (aire sobre el gorro y bajo las zapatillas)
    if (y > 0) {
      ctx.drawImage(img, pad, pad, sW, 16, x, 0, drawW, y + 1);
    }
    if (bottomH > 0) {
      ctx.drawImage(img, pad, img.naturalHeight - pad - 16, sW, 16, x, y + drawH - 1, drawW, bottomH + 1);
    }

    // 3. Franjas laterales (extienden la pared y la línea del piso a todo el ancho)
    if (x > 0) {
      ctx.drawImage(img, pad, pad, 24, sH, 0, y, x + 1, drawH);
    }
    if (rightW > 0) {
      ctx.drawImage(img, img.naturalWidth - pad - 24, pad, 24, sH, x + drawW - 1, y, rightW + 1, drawH);
    }

    // 4. Personaje central nítido
    ctx.drawImage(img, pad, pad, sW, sH, x, y, drawW, drawH);
  }, []);

  // Precarga de fotogramas y redibujado al cambiar el tamaño de ventana
  useEffect(() => {
    if (FRAME_URLS.length === 0) return;

    const loadedImages: HTMLImageElement[] = new Array(FRAME_URLS.length);
    const initialIndex = Math.floor(FRAME_URLS.length / 2);

    FRAME_URLS.forEach((url, index) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loadedImages[index] = img;
        if (index === initialIndex) {
          lastDrawnFrame.current = initialIndex;
          drawFrameFullBleed(img);
        }
      };
    });

    imagesRef.current = loadedImages;

    const handleResize = () => {
      const currentImg = imagesRef.current[lastDrawnFrame.current];
      if (currentImg) drawFrameFullBleed(currentImg);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawFrameFullBleed]);

  // Seguimiento fluido del cursor
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const mouseX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);

      targetProgress.current = SECUENCIA_DE_DERECHA_A_IZQUIERDA ? 1 - mouseX : mouseX;

      if (mouseX < 0.38) setMirada("izq");
      else if (mouseX > 0.62) setMirada("der");
      else setMirada("centro");
    };

    const handleMouseLeave = () => {
      targetProgress.current = 0.5;
      setMirada("centro");
    };

    const renderLoop = () => {
      const diff = targetProgress.current - currentProgress.current;

      if (Math.abs(diff) > 0.0005) {
        currentProgress.current += diff * 0.1;

        const total = imagesRef.current.length;
        if (total > 0) {
          const frameIndex = Math.min(
            Math.max(Math.round(currentProgress.current * (total - 1)), 0),
            total - 1
          );

          if (frameIndex !== lastDrawnFrame.current) {
            const img = imagesRef.current[frameIndex];
            if (img && img.complete && img.naturalWidth > 0) {
              drawFrameFullBleed(img);
              lastDrawnFrame.current = frameIndex;
            }
          }
        }
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    hero.addEventListener("mousemove", handleMouseMove);
    hero.addEventListener("mouseleave", handleMouseLeave);
    rafId = requestAnimationFrame(renderLoop);

    return () => {
      hero.removeEventListener("mousemove", handleMouseMove);
      hero.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, [drawFrameFullBleed]);

  return (
    <main
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="relative min-h-screen w-full overflow-hidden bg-[#b7b2aa] text-[#141414]"
    >
      {/* ================= ESCENA FULL-BLEED EN CANVAS ================= */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      {/* ================= CAPA DE INTERFAZ Y LEMAS ================= */}
      <section
        ref={heroRef}
        className="relative z-10 mx-auto flex h-screen max-w-[1440px] flex-col justify-between px-6 py-6 sm:px-10 sm:py-8"
      >
        {/* Barra Superior */}
        <header className="relative z-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141414] text-xs font-bold tracking-tighter text-[#e2f85a]">
              KB
            </span>
            <span className="text-lg font-bold tracking-tight text-[#141414]">
              KUBO

            </span>
          </a>

          <button className="hidden items-center gap-2.5 rounded-full bg-[#141414]/90 px-5 py-2.5 text-xs font-medium text-white shadow-sm backdrop-blur-md transition hover:bg-[#141414] sm:flex">
            <span className="flex flex-col gap-1">
              <span className="h-[1.5px] w-3.5 bg-white" />
              <span className="h-[1.5px] w-2.5 bg-white" />
            </span>
            Menú
          </button>

          <button className="group flex items-center gap-3 rounded-full bg-[#e2f85a] py-1.5 pl-5 pr-1.5 text-xs font-semibold text-[#141414] shadow-sm transition hover:brightness-95">
            <span>Explorar tablas</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#141414] text-white transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </header>

        {/* Titular y Lemas Urbanos */}
        <div className="pointer-events-none relative z-10 my-auto grid h-full grid-cols-1 items-center lg:grid-cols-12">
          {/* Columna Izquierda */}
          <div className="lg:col-span-5">
            <h1 className="text-5xl font-normal leading-[0.94] tracking-[-0.045em] sm:text-7xl xl:text-[5.25rem]">
              <span className="block text-[#141414]/50">Nacidos en</span>
              <span className="block font-medium text-[#141414]">el concreto.</span>
            </h1>

            <div
              className={`mt-8 hidden w-fit items-center gap-3 transition-all duration-300 lg:flex ${mirada === "izq" ? "scale-105 opacity-100" : "opacity-85"
                }`}
            >
              <div className="flex items-center gap-3 rounded-2xl bg-[#141414]/90 px-4 py-2.5 text-white shadow-lg backdrop-blur-md">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e2f85a] text-xs font-bold text-[#141414]">
                  01
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Cultura Street
                  </p>
                  <p className="text-xs font-semibold">Sin reglas. Puro estilo.</p>
                </div>
              </div>
              <div className="h-[1px] w-20 border-t border-dashed border-[#141414]/45" />
              <span className="h-2 w-2 rounded-full bg-[#141414]" />
            </div>
          </div>

          {/* Espacio Central para KUBO */}
          <div className="hidden lg:col-span-3 lg:block" />

          {/* Columna Derecha */}
          <div className="hidden flex-col items-end gap-16 lg:col-span-4 lg:flex">
            <div
              className={`flex items-center gap-3 transition-all duration-300 ${mirada === "der" ? "scale-105 opacity-100" : "opacity-85"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#141414]" />
              <div className="h-[1px] w-20 border-t border-dashed border-[#141414]/45" />
              <div className="flex items-center gap-3 rounded-2xl bg-[#141414]/90 px-4 py-2.5 text-white shadow-lg backdrop-blur-md">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e2f85a] text-xs font-bold text-[#141414]">
                  7X
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Maple Canadiense
                  </p>
                  <p className="text-xs font-semibold">Pop diseñado para durar</p>
                </div>
              </div>
            </div>

            <div
              className={`mr-6 flex items-center gap-3 transition-all duration-300 ${mirada === "der" ? "scale-105 opacity-100" : "opacity-85"
                }`}
            >
              <span className="h-2 w-2 rounded-full bg-[#141414]" />
              <div className="h-[1px] w-16 border-t border-dashed border-[#141414]/45" />
              <div className="flex items-center gap-3 rounded-2xl bg-[#141414]/90 px-4 py-2.5 text-white shadow-lg backdrop-blur-md">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-[#e2f85a]">
                  99A
                </span>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400">
                    Kubo Pro Deck
                  </p>
                  <p className="text-xs font-semibold">Ruedas Street · 54mm</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra Inferior */}
        <footer className="relative z-20 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-xs">
            <p className="text-xs font-medium leading-relaxed text-[#141414]/80">
              Tablas prensadas en frío, ejes de acero forjado y gráficos creados para dominar cada spot de la ciudad.
            </p>

            <div className="mt-4 flex items-center gap-2">
              {MODOS_SKATE.map((modo, idx) => {
                const activo = modoActivo === idx;
                return (
                  <button
                    key={modo.id}
                    onClick={() => setModoActivo(idx)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${activo
                        ? "bg-[#e2f85a] text-[#141414] shadow-sm"
                        : "bg-[#141414]/10 text-[#141414]/75 hover:bg-[#141414]/20"
                      }`}
                  >
                    {modo.label}
                  </button>
                );
              })}
              <div className="ml-2">
                <p className="text-xs font-semibold text-[#141414]">
                  {MODOS_SKATE[modoActivo].label}
                </p>
                <p className="font-mono text-[10px] text-[#141414]/65">
                  {MODOS_SKATE[modoActivo].spec}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end font-mono text-xs text-[#141414]/70">
            <span className="font-semibold text-[#141414]">01 / 04</span>
          </div>
        </footer>
      </section>
    </main>
  );
}