# Dirección de Diseño v3 — "Editorial Andino Premium"

> Fuente: auditoría de diseño de incunalab.com (modelo elegido por el usuario) traducida
> al sistema SimulaUNA. Regla: adoptamos los PATRONES premium del modelo, NO su paleta
> (morado/turquesa) ni su inconsistencia tipográfica (la propia auditoría la advierte).
> Nuestra identidad se mantiene: Editorial Andino (Fraunces + Plus Jakarta, azul #003D7A,
> dorado #D4AF37, naranja #E67E22) + acentos institucionales por universidad (--uni-*).

## Los 5 patrones a adoptar (del modelo, tokenizados a nuestro sistema)

1. **CTAs pill con glow del propio color** (no sombra gris):
   `.btn-glow`: border-radius 9999px, padding 16px 32px, sombra
   `0 8px 25px rgb(from var(--uni-primary,#003D7A) r g b / 0.30)` — en Tailwind:
   sombra tintada del color primario al 30%. Hover: translateY(-2px) + glow al 45%.
2. **Sombras tintadas en tarjetas** (doble capa, color de marca — nunca negro puro):
   `.shadow-tinted`: `0 16px 32px rgba(0,61,122,.18), 0 4px 12px rgba(0,61,122,.10)`
   (en secciones de universidad, usar el tono de --uni-primary).
3. **Protagonista 3D soft estilo Pixar en el hero**, flotando con aire negativo +
   asteroides/estrellas lineales alrededor. Nuestra mascota: **un lobito muy
   estudioso** (decisión del usuario — memorable y neutral; la mascota NO lleva
   identidad andina). Assets a generar con Codex image_gen (ver §Imágenes).
4. **Display tight**: titulares Fraunces 700-900 con `letter-spacing: -0.02em` y
   `line-height: 1.1-1.2`. Tamaños hero 64-96px desktop / 40-48px móvil.
5. **Ruptura del grid**: tarjetas de features/pasos escalonadas (offset vertical
   alterno, se pierde en <768px) + **divisores SVG curvos** entre secciones de
   distinto fondo (arco orgánico, componente `SectionCurve` reutilizable).

## Estructura objetivo del Landing (inspirada en el modelo, adaptada)

1. **Navbar sticky** (NUEVA): blanca, 72-80px, sombra sutil `0 2px 10px rgba(0,0,0,.08)`,
   logo SimulaUNA izquierda + enlaces (Universidades, Cómo funciona, Banqueo, Aula
   virtual [badge Próximamente]) + CTA pill "Empezar gratis". <992px: hamburguesa.
2. **Hero**: 2 columnas — izquierda titular display tight + subtítulo + fila de stats
   reales (12 universidades · 13,000+ preguntas meta · gratis) + 2 CTAs (glow primario
   "Elige tu universidad" + ghost "Ver cómo funciona"); derecha la **mascota vicuña
   astronauta 3D** flotando (float loop sutil, `d-none` en <lg como el modelo).
   Fondo: gradiente hero actual + estrellas lineales.
3. **Universidades disponibles** (existente, se conserva) con sombras tintadas nuevas.
4. **Cómo funciona**: 4 tarjetas escalonadas con íconos 3D generados (elige→regístrate→
   practica→puntaje real), conectores dorados.
5. **Stats "en números"**: fondo brand-deep, contadores animados (ya existe el
   IntersectionObserver) + **cohete 3D** despegando al lado.
6. **Features** (6 cards) + cinta de logos (existente).
7. **Testimonios** (existentes).
8. **CTA final** + footer (existentes, retocar con glow buttons).

## Aulas virtuales (previsión, NO construir el LMS ahora)

- Landing y UniversityPage muestran **"Aula virtual — Próximamente"** como tarjeta de
  proceso (ícono 3D propio, deshabilitada con badge).
- Ruta placeholder `/:universidad/aula` → página ComingSoon con el tema institucional
  y CTA a WhatsApp para lista de espera.
- Backend: SIN cambios hoy. El contrato ya lo soporta: `CORE.permisos.modalidad` es
  texto libre (se agregará `modalidad='aula'`) y `universidades.procesos` es CSV
  extensible. Documentado como TODO en el contrato.

## Imágenes a generar (Codex image_gen) → public/illustrations/

Bloque de estilo COMÚN a repetir en cada prompt (consistencia del set):
"Render 3D suave estilo Pixar, materiales glossy, iluminación de estudio suave,
sombra larga difusa, fondo transparente. Paleta: azul profundo #003D7A, dorado
#D4AF37, naranja cálido #E67E22, blanco."

| Archivo | Contenido | Proporción |
|---|---|---|
| `mascota-lobito.png` | Lobito gris caricatura 3D amigable y muy estudioso: ojos grandes, sonrisa, lentes redondos, bufanda azul lisa; casco de astronauta esférico transparente; sostiene un lápiz dorado; montado sobre un cohete blanco con aletas doradas y llamas naranjas | retrato 3:5 |
| `cohete-despegue.png` | Cohete 3D blanco y azul #003D7A con punta dorada despegando vertical, estela mínima de nubes blancas | retrato 2:3 |
| `icono-elige.png` | Ícono 3D: brújula dorada sobre mapa estilizado del Perú azul, dentro de hexágono blanco con marco azul translúcido | cuadrada |
| `icono-registro.png` | Ícono 3D: credencial/carnet estudiantil con foto genérica y check dorado, hexágono igual | cuadrada |
| `icono-practica.png` | Ícono 3D: cuaderno abierto con lápiz naranja y hoja de respuestas con burbujas marcadas, hexágono igual | cuadrada |
| `icono-puntaje.png` | Ícono 3D: podio con trofeo dorado y anillo de progreso azul alrededor, hexágono igual | cuadrada |
| `aula-virtual.png` | Laptop 3D abierta mostrando una clase con profesor caricatura y pizarra, ambiente cálido, estudiantes como avatares pequeños | 4:3 |

### Tanda 2 — Reemplazo de TODO lo genérico (decisión del usuario: cero Unsplash/pravatar)

Hoy hay 10 fotos de Unsplash (fondos al 8-22% de opacidad en Landing/StudentForm/Results)
y 3 avatares pravatar (testimonios). Se reemplazan por ilustraciones propias, mismo
bloque de estilo común + este añadido para fondos: "ilustración digital plana con
profundidad suave, paleta limitada a azul #003D7A, crema #FBF7F0, dorado #D4AF37 y
toques naranja #E67E22, sin texto".

| Archivo | Contenido | Proporción | Reemplaza |
|---|---|---|---|
| `bg-estudio.png` | Escritorio de estudio visto cenital: cuaderno abierto, laptop, taza, lámpara cálida | 16:9 | photo-1456513..., photo-1434030... |
| `bg-biblioteca.png` | Interior de biblioteca ilustrada con estantes altos y luz dorada | 16:9 | photo-1509062..., photo-1532012... |
| `bg-graduacion.png` | Birretes lanzados al aire sobre cielo azul degradado, confeti dorado | 16:9 | photo-1513258... |
| `bg-colaboracion.png` | Tres estudiantes caricatura estudiando juntos en una mesa, vista 3/4 | 16:9 | photo-1523240..., photo-1522202... |
| `bg-campus.png` | Explanada de campus universitario ilustrado con edificio y árboles | 16:9 | photo-1427504..., photo-1503676..., photo-1571260... |
| `avatar-estudiante-1.png` | Retrato busto 3D estilo Pixar: estudiante mujer joven peruana sonriente, polo azul, fondo círculo crema | cuadrada | pravatar img=47 |
| `avatar-estudiante-2.png` | Retrato busto 3D: estudiante hombre joven con lentes, casaca naranja, fondo círculo azul suave | cuadrada | pravatar img=13 |
| `avatar-estudiante-3.png` | Retrato busto 3D: estudiante mujer con cabello recogido y audífonos al cuello, fondo círculo dorado suave | cuadrada | pravatar img=32 |

Los avatares son personajes ilustrados genéricos (NO caras de personas reales) — se
presentan como testimonios ilustrativos, coherente con la decisión previa de no
inventar identidades reales.

Post-proceso: comprimir a WebP si >400KB; conservar PNG con transparencia para la mascota.

## Reglas duras

- AA y prefers-reduced-motion NUNCA regresionan (float loops y contadores se apagan
  con reduced-motion; el patrón global ya existe).
- Cero librerías nuevas (AOS NO: replicar fade-up con IntersectionObserver + clases
  existentes animate-fade-up, que ya tenemos).
- Fraunces/Plus Jakarta se quedan; ninguna fuente nueva.
- Los temas institucionales (--uni-*) mandan dentro de /:universidad/*; el Landing
  nacional usa la paleta brand.
- Móvil primero: la mascota se oculta <lg, stats a 2 columnas, cards apiladas.
