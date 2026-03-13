---
description: Lee la documentación y resultados de auditoría para generar y ejecutar pruebas de regresión.
---

Este workflow asegura que los nuevos cambios no rompan la funcionalidad existente, basándose en la arquitectura y reglas de negocio documentadas.

1.  **Lectura de Documentación**: Leer los archivos en `./docs/` para entender las reglas de negocio, el esquema de datos y los flujos críticos.
    - [audit_report.md](file:///h:/MARY%20PROGRAMA/version%20tdah/Panel-Maria/docs/audit_report.md)
    - [architecture.md](file:///h:/MARY%20PROGRAMA/version%20tdah/Panel-Maria/docs/architecture.md)
    - [api_specs.md](file:///h:/MARY%20PROGRAMA/version%20tdah/Panel-Maria/docs/api_specs.md)

2.  **Análisis de Cambios**: Identificar qué archivos han sido modificados recientemente.

3.  **Generación/Actualización de Tests**:
    - Crear o actualizar archivos en `./tests/` utilizando Playwright.
    - Asegurar que se cubran los flujos críticos (Auth, CRUD de items, IA Kai, Alarmas).

4.  **Ejecución de Pruebas**:
    // turbo
    - Ejecutar las pruebas usando `npx playwright test`.

5.  **Reporte de Resultados**: Informar al usuario sobre el éxito o fallo de las pruebas y sugerir correcciones si es necesario.
