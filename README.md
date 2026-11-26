# KUBO Skate Co. — Hero interactivo

Prototipo de landing page inspirado en la cultura skate, con un personaje 3D prerenderizado que sigue el movimiento del mouse. La animación utiliza una secuencia de imágenes WebP dibujadas en un canvas 2D, sin un motor 3D en tiempo real.

## Ejecución local

Requisito: Node.js 20.19 o superior, o 22.12 o superior, compatible con Vite 8.

```bash
npm ci
npm run dev
```

La aplicación estará disponible en la dirección local indicada en la terminal. El personaje responde al movimiento horizontal del mouse y el selector permite cambiar la descripción del estilo de skate.

```bash
npm run lint     # Analizar el código
npm run build    # Comprobar tipos y generar la versión de producción en dist/
npm run preview  # Previsualizar la versión de producción localmente
```

## Cómo funciona

- Vite resuelve los fotogramas WebP de `src/assets/frames/` durante la compilación.
- `src/App.tsx` precarga las imágenes y dibuja el fotograma seleccionado en un canvas. La posición del mouse determina el fotograma de destino y una interpolación suaviza el movimiento.
- El canvas extiende los bordes de la escena para cubrir la ventana y limita la densidad de píxeles para reducir el costo de renderizado.
- El selector de estilos cambia el texto mostrado, pero no modifica el personaje ni el producto.

Las notas técnicas originales están disponibles en [guia_hero_interactivo_3d.md](guia_hero_interactivo_3d.md).

## Estructura del proyecto

```text
src/
  App.tsx          Hero, animación y controles
  global.css       Punto de entrada de Tailwind CSS
  assets/frames/   Secuencia de imágenes WebP prerenderizadas
```

Desarrollado con React, TypeScript, Vite, Tailwind CSS y la API de Canvas.

## Limitaciones actuales y posibles mejoras

- Cargar los fotogramas progresivamente y priorizar el inicial para reducir el consumo inicial de red y memoria.
- Ofrecer una alternativa estática, respetar la preferencia de movimiento reducido y agregar una interacción adecuada para dispositivos táctiles y teclado.
- Conectar el menú y el botón «Explorar tablas» con destinos reales; agregar información de productos y contacto cuando esté disponible.
- Mejorar la gestión de carga y errores de imágenes, y verificar el diseño y el contraste en dispositivos móviles.
- Agregar pruebas automatizadas de interacción y accesibilidad, y medir el rendimiento en condiciones reales.
- Reemplazar las especificaciones de demostración por información verificada del negocio y confirmar los derechos de los recursos visuales antes de su uso comercial.
