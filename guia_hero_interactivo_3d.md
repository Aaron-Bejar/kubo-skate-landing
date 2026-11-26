# Documentación Técnica: Hero Interactivo con Secuencia de Fotogramas en Canvas

Este documento detalla la arquitectura, las técnicas de optimización gráfica y los principios de interacción implementados en la sección **Hero** de **KUBO Skate Co.**, donde un personaje 3D pre-renderizado sigue el movimiento del cursor en tiempo real.

---

## 1. Arquitectura General

En lugar de cargar un motor WebGL completo (como Three.js) o depender de un reproductor de video HTML5 estándar (`<video>`), la solución utiliza **Image Sequence Scrubbing sobre `<canvas>`**. 

Esta técnica consiste en descomponer una animación pre-renderizada en fotogramas individuales de alta eficiencia y dibujarlos dinámicamente en un lienzo 2D según la posición horizontal del puntero.

### Stack Tecnológico
* **React + TypeScript:** Gestión del ciclo de vida, referencias directas al DOM (`useRef`) para evitar re-renderizados innecesarios en cada frame, y estado React (`useState`) únicamente para actualizaciones discretas de interfaz (resaltado de etiquetas y selector de modos).
* **Vite (`import.meta.glob`):** Empaquetado estático y resolución automática de la secuencia de imágenes en tiempo de compilación.
* **HTML5 Canvas API (`2D Context`):** Renderizado directo en memoria gráfica de fotogramas precargados.
* **FFmpeg + WebP:** Pipeline de procesamiento de medios para extracción y compresión sin pérdida perceptible de nitidez.

---

## 2. ¿Por qué `<canvas>` + WebP en lugar de `<video>` MP4?

Durante el desarrollo se identificaron dos limitaciones críticas al manipular `video.currentTime` directamente con el mouse:

1. **Decodificación Temporal (GOP / Keyframes):** Los videos `.mp4` (H.264) almacenan fotogramas completos (*I-frames*) cada ciertos segundos y fotogramas diferenciales (*P/B-frames*) entre ellos. Al mover el mouse lentamente hacia atrás y adelante, el navegador entra en estado `seeking` constantemente, provocando micro-tirones y caídas de resolución momentáneas.
2. **Submuestreo de Croma (`yuv420p`):** El video web estándar reduce la resolución de color a la mitad respecto a la luminancia, suavizando bordes en ilustraciones 3D escaladas a pantalla completa.

### Solución Implementada
* **Extracción con FFmpeg (`fps=30` + filtro `lanczos`):** Se extrajeron los fotogramas a una resolución de `1600px` de ancho utilizando interpolación *Lanczos* para preservar los detalles del modelado 3D.
* **Formato WebP (`-quality 90`):** Cada fotograma es un archivo independiente que se decodifica una sola vez al cargar la página (`new Image()`) y permanece listo en memoria RAM. El acceso a cualquier fotograma tiene latencia cercana a $0\text{ ms}$.

---

## 3. Física de Movimiento e Interpolación (Lerp)

Para que el giro de cabeza del personaje tenga peso visual y se sienta orgánico (evitando movimientos bruscos cuando el usuario mueve el mouse rápidamente), se implementó un bucle de animación continuo mediante `requestAnimationFrame` combinado con **Interpolación Lineal (Lerp)**.

### Fórmula Aplicada
En cada ciclo de refresco de pantalla ($60\text{ Hz}$ o $120\text{ Hz}$), la posición actual (`currentProgress`) se acerca un porcentaje fijo ($10\%$) hacia la posición objetivo del cursor (`targetProgress`):

$$\text{current} = \text{current} + (\text{target} - \text{current}) \times \alpha$$

Donde:
* $\text{target} \in [0, 1]$ es la coordenada $X$ normalizada del cursor dentro del contenedor Hero.
* $\alpha = 0.1$ es el factor de amortiguamiento (*damping* o inercia).

### Optimización de CPU/GPU
* **Umbral de reposo (`Math.abs(diff) > 0.0005`):** Cuando el personaje alcanza la posición del cursor, el cálculo matemático se detiene hasta que vuelva a haber movimiento.
* **Caché de fotograma (`lastDrawnFrame`):** El lienzo solo ejecuta `ctx.drawImage()` si el índice redondeado del fotograma cambió respecto al ciclo anterior, evitando redibujos idénticos.

---

## 4. Extensión Dinámica del Escenario (*9-Slice Canvas Scaling*)

Un reto habitual al integrar renders 3D pre-renderizados en diseño web responsivo es adaptar una relación de aspecto fija (16:9) a cualquier viewport (`100vw × 100vh`) sin recortar al sujeto ni mostrar bordes vacíos.

En lugar de usar `object-cover` (que acercaba demasiado al personaje a los bordes superior e inferior), se programó una extensión procedural en `drawFrameFullBleed`:

1. **Escalado proporcional del sujeto:** El personaje se escala tomando como referencia el $78\%$ del alto de la ventana (`ESCALA_ALTO = 0.78`), garantizando aire visual sobre el gorro y debajo de las zapatillas.
2. **Extensión de bordes y esquinas:** Se toman franjas de $16\text{px}$ a $24\text{px}$ de los perímetros limpios del propio fotograma (pared de estudio superior, piso inferior y laterales) y se proyectan hasta los límites del `<canvas>`.
3. **Soporte Retina / HiDPI:** El tamaño interno del `<canvas>` se multiplica por `window.devicePixelRatio` (limitado a `2` para proteger el rendimiento en pantallas 4K), manteniendo bordes nítidos en todo momento.

---

## 5. Diseño Visual y UX

La interfaz sigue una dirección de arte **editorial-urbana** inspirada en presentaciones de producto de alto contraste:

* **Jerarquía Tipográfica:** Uso de la familia geométrica **Inter** con tracking negativo (`-0.045em`) y contraste dual de opacidad (`#141414/50` frente a `#141414` sólido) para guiar la lectura sin competir con el modelo central.
* **Micro-interacciones Contextuales:** Las tarjetas informativas (*callouts*) conectadas mediante líneas punteadas reaccionan al cuadrante hacia donde mira el personaje (`mirada === "izq"` o `"der"`), reforzando la conexión visual entre el cursor, el modelo 3D y el contenido.
* **Capa de Eventos (`pointer-events-none`):** Tanto el contenedor del `<canvas>` como las capas decorativas ignoran los eventos del puntero para que los botones de navegación y el selector inferior sean siempre clicables sin interrumpir el seguimiento del mouse en el `<section>` principal.