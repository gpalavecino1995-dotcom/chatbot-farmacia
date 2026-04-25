# Chatbot de Farmacia Comunitaria

Aplicación web educativa en español para guiar a estudiantes de Legislación Farmacéutica en una actividad sobre abastecimiento de medicamentos.

El caso activo corresponde a **Farmacia San Gabriel** y se centra en la compra de **paracetamol 500 mg en cajas de 100 comprimidos**. El chatbot responde solo con datos locales del caso y guía el razonamiento paso a paso.

## Qué hace

- Entrega precios mayoristas de cuatro marcas.
- Entrega ventas mensuales del producto.
- Responde con lenguaje simple y breve.
- Da pistas cuando el estudiante pide “la respuesta”.
- Valida respuestas básicas como marca más económica, meses de mayor demanda o costo por comprimido.
- Funciona sin APIs externas.
- Puede exportarse como sitio estático para GitHub Pages.

## Tecnologías

- Next.js 14
- React 18
- TypeScript

## Estructura del proyecto

```text
.
|-- app/
|   |-- globals.css
|   |-- layout.tsx
|   `-- page.tsx
|-- components/
|   `-- AuditChat.tsx
|-- data/
|   `-- caso-auditoria-farmaceutica.json
|-- lib/
|   |-- chatbot.ts
|   `-- types.ts
|-- public/
|   `-- industria-farmaceutica.svg
|-- .env.example
|-- .eslintrc.json
|-- .gitignore
|-- next.config.mjs
|-- package.json
|-- README.md
`-- tsconfig.json
```

## Archivos clave

- [components/AuditChat.tsx](C:\Users\Giovanni\OneDrive\Documentos\New project\components\AuditChat.tsx): interfaz del chat.
- [lib/chatbot.ts](C:\Users\Giovanni\OneDrive\Documentos\New project\lib\chatbot.ts): reglas de conversación y respuestas guiadas.
- [data/caso-auditoria-farmaceutica.json](C:\Users\Giovanni\OneDrive\Documentos\New project\data\caso-auditoria-farmaceutica.json): datos del caso.
- [app/globals.css](C:\Users\Giovanni\OneDrive\Documentos\New project\app\globals.css): estilos de la interfaz.
- [next.config.mjs](C:\Users\Giovanni\OneDrive\Documentos\New project\next.config.mjs): exportación estática para GitHub Pages.

## Requisitos

- Node.js 18.17 o superior
- npm

## Ejecutar la app localmente

1. Instala dependencias:

```bash
npm install
```

2. Inicia el servidor de desarrollo:

```bash
npm run dev
```

3. Abre esta URL en el navegador:

```text
http://localhost:3000
```

### Nota para PowerShell en Windows

Si PowerShell bloquea `npm.ps1`, usa:

```powershell
npm.cmd install
npm.cmd run dev
```

## Generar una versión lista para publicar

Este proyecto ya está configurado con:

- `output: "export"`
- `trailingSlash: true`

Eso hace que `next build` genere una versión estática en la carpeta `out/`.

Ejecuta:

```bash
npm run build
```

Al terminar, encontrarás el sitio listo en:

```text
out/
```

## Publicar en GitHub Pages

### Opción recomendada: GitHub Pages con GitHub Actions

1. Crea un repositorio en GitHub y sube este proyecto.
2. En GitHub, entra a `Settings > Pages`.
3. En `Source`, selecciona **GitHub Actions**.
4. Crea el archivo `.github/workflows/deploy-pages.yml`.
5. Usa este contenido:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build static site
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

6. Haz commit y push a `main`.
7. GitHub ejecutará el workflow y publicará el contenido de `out/`.
8. La URL final será algo como:

```text
https://TU-USUARIO.github.io/TU-REPOSITORIO/
```

### Si el sitio se publica en un repositorio de proyecto

Si la URL tendrá el formato `https://usuario.github.io/repositorio/`, puede que necesites agregar `basePath` y `assetPrefix` en `next.config.mjs`.

Ejemplo:

```js
const repo = "nombre-del-repositorio";

const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: `/${repo}`,
  assetPrefix: `/${repo}`
};
```

Si publicas en un repositorio de usuario, como `usuario.github.io`, no hace falta ese ajuste.

## Editar el caso

Los datos del caso están en:

```text
data/caso-auditoria-farmaceutica.json
```

Ahí puedes cambiar:

- nombre de la farmacia
- producto
- presentación
- precios mayoristas
- ventas mensuales
- objetivos de aprendizaje

Después de editar ese archivo, reinicia el servidor local o vuelve a ejecutar el build.

## Lógica del chatbot

La lógica está en:

```text
lib/chatbot.ts
```

El comportamiento principal es:

- entrega solo el dato que el estudiante pide
- no resuelve todo el ejercicio de una vez
- guía con preguntas breves
- reconoce consultas informales o incompletas
- redirige si la pregunta no pertenece al caso

## Comandos útiles

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Verificación recomendada antes de publicar

- Probar preguntas sobre marcas y precios.
- Probar preguntas sobre un mes específico.
- Probar el historial completo de ventas.
- Probar preguntas como “ayuda” o “no entiendo”.
- Ejecutar `npm run build` y confirmar que se genere `out/`.

## Limitaciones intencionales

- No usa IA generativa.
- No inventa datos fuera del caso.
- No reemplaza el razonamiento del estudiante.
- No toma decisiones finales automáticamente.
