# Simulador POS Farmacia

Aplicacion web educativa en React + TypeScript + Vite para simular una caja POS de farmacia comunitaria en actividades docentes y role play con estudiantes.

La app no se conecta a pagos reales, boleta electronica real, receta electronica real ni sistemas sanitarios reales. Todos los datos viven en el navegador mediante `localStorage`.

## Secciones

- **Venta:** modo estudiante con escaneo, carrito visible, alertas, total destacado y finalizacion de venta simulada.
- **Inventario:** edicion simple de precios y stock para preparar escenarios.
- **Carga de productos:** importacion de Excel con SKU/codigos de barra para usar productos reales del centro de simulaciones.
- **Historial:** registro local de ventas simuladas.
- **Configuracion:** datos de farmacia, cajero, moneda y umbral de stock bajo.

## Tecnologias

- React 18
- TypeScript
- Vite
- LocalStorage
- Importacion de `.xlsx`

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abre la URL que indique Vite, normalmente:

```text
http://localhost:5173
```

## Build para GitHub Pages

```bash
npm run build
```

El sitio estatico queda en:

```text
dist/
```

El workflow `.github/workflows/deploy-pages.yml` esta configurado para publicar esa carpeta en GitHub Pages.

## Estructura preparada para crecer

```text
src/
|-- App.tsx
|-- main.tsx
|-- styles.css
|-- types.ts
|-- storage.ts
|-- data/
|   `-- seedData.ts
|-- features/
|   |-- venta/
|   |   `-- VentaView.tsx
|   |-- inventario/
|   |   `-- InventarioView.tsx
|   |-- historial/
|   |   `-- HistorialView.tsx
|   `-- configuracion/
|       `-- ConfiguracionView.tsx
`-- utils/
    `-- format.ts
```

## Nota docente

El texto principal de la pantalla de venta indica:

> Escanea los productos indicados por el paciente simulado y realiza la venta siguiendo el protocolo del role play
