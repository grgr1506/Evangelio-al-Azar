# Evangelio al azar ✠

© 2026 Gonzalo Galindo Ramos. Todos los derechos reservados sobre el diseño y el código de la app (los textos bíblicos y las pinturas conservan sus propias licencias).

El Evangelio de la misa de **un día al azar** (o de hoy, o de la fecha que elijas) para hacer Lectio Divina: lees, subrayas, escribes con libertad y descargas tu página.

## Cómo abrirlo

Doble clic en **`Abrir Evangelio.bat`**: abre la app en <http://localhost:5510>. Cierra la ventana negra para apagarla.

> Si abres `index.html` directamente, todo funciona menos la descarga de imágenes (el navegador la bloquea fuera de un servidor).

## Cómo se usa

- **Otro día al azar** (o tecla `R`), **Hoy**, o cualquier fecha del calendario (1970–2100). Sale el Evangelio que se lee en la misa de ese día, con el título del pasaje y su cita (p. ej. "Te seguiré adondequiera que vayas · Lucas 9, 57-62").
- **Página izquierda: el Evangelio.** Selecciona palabras para marcarlas en un color, escribirles una **nota al margen** o llevarlas **a mis notas**.
- **Página derecha: mis notas.** Un documento libre, como en Word: negrita, cursiva, subrayado, títulos, listas, citas, resaltador, deshacer y rehacer.
- **Guía de Lectio**: los pasos (Prepárate, Lee, Medita, Ora, Contempla, Actúa) como información. Tiene un temporizador de silencio y un botón para escribir sobre cada paso en tus notas.
- **Descargar**: *Página de estudio* (texto con colores, notas con flechas y lo que escribiste), *Estampa* (una frase sobre una pintura o una foto tuya) o *Texto (.md)*.
- **Mi diario**: cada lectio en la que escribes o subrayas se guarda en este navegador.
- **Traducción** (al pie del Evangelio): *Biblia libre Latinoamericana* para cualquier fecha, o *Libro del Pueblo de Dios* (el texto de misa en Latinoamérica) para días hasta 30 días antes o después de hoy.
- **¿Prefieres tu Biblia de Jerusalén?** Tiene derechos de autor y no puede venir incluida, pero puedes pegar su texto en cada lectio (enlace al pie del Evangelio).

## Cómo funciona por dentro

| Archivo | Contenido |
|---|---|
| `data/liturgy.js` | Calcula el calendario litúrgico de cualquier fecha: Pascua, tiempos, ciclos A/B/C, solemnidades, fiestas y traslados. Epifanía y Ascensión en domingo, como en Perú. |
| `data/lectionary.js` | Leccionario romano, solo Evangelios (~500 entradas), generado desde las tablas de catholic-resources.org. |
| `data/gospels.js` | Mt, Mc, Lc y Jn — Santa Biblia libre Latinoamericano (dominio público, eBible.org). |
| `data/saints.js` | 42 frases de santos con su fuente. |
| `data/art.js` + `assets/art/` | 32 pinturas de dominio público que salen al azar. |
| `index.html`, `styles.css`, `app.js` | La app (sin dependencias). |

Para fechas cercanas (±30 días) también aparece el **comentario del día** de un santo desde [evangeliodeldia.org](https://evangeliodeldia.org).
