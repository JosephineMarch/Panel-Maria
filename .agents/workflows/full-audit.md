---
description: Proceso completo de auditoría, documentación y verificación del Panel-Maria
---

# Workflow: Auditoría Exhaustiva y Documentación Viva

Este workflow garantiza que la aplicación mantenga estándares profesionales de producción, seguridad comprobada y documentación técnica siempre al día.

## 1. Descubrimiento y Mapeo (Cada 2 semanas o hitos importantes)
- [ ] Ejecutar `@production-code-audit` para detectar deudas técnicas y cuellos de botella.
- [ ] Revisar el esquema de base de datos en Supabase con `@supabase-automation`.
- [ ] Mapear flujos de datos entre Frontend (logic.js), IA (cerebras.js) y DB.

## 2. Actualización de Documentación (Después de cada cambio mayor)
- [ ] Actualizar `technical_specs.md` con los nuevos endpoints o cambios en el esquema.
- [ ] Documentar nuevas reglas de negocio de Kai en el manual de IA.
- [ ] Usar `@doc-generate` para mantener el README y la guía de arquitectura.

## 3. Auditoría de Seguridad y Calidad
- [ ] Ejecutar `@web-security-testing` para validar el login y las políticas RLS de Supabase.
- [ ] Verificar conformidad con `@architect-review` para asegurar que el código sigue siendo mantenible (SOLID).

## 4. Verificación y Testing (Antes de cada release)
- [ ] Ejecutar la suite de pruebas Playwright con `@webapp-testing`.
- [ ] Corregir cualquier regresión detectada.
- [ ] Asegurar que el Service Worker y el modo PWA siguen funcionando correctamente.

---
// turbo-all
Propuesta: Para automatizar esto, podemos integrar una tarea de "Cierre de Sprint" donde se ejecutan estos pasos de forma secuencial.
