# Plan: Pomodoro en Inicio

> Sistema de gestión de tiempo Pomodoro integrado en la app.

---

## ✅ Implementado (v1)

- Timer 25/5 con ciclos (1-4)
- Selector de tarea opcional
- Sonido con voz ("Enfocate", "Descanso")
- Guardar sesiones en DB (type: "pomodoro")
- Botón flotante + Modal
- Agregar automáticamente tag "logro" al completar tarea

---

## 🎯 Objetivo

- Implementar Pomodoro de forma **simple y funcional**
- Guardar datos en **historial** para revisar después
- **No complicar** la interfaz

---

## ⏱️ Cómo funciona (Básico)

```
25 min trabajo → 5 min descanso → Repeat
```

Ciclos: 4 pomodoros → descanso largo (15-30 min)

---

## 📱 UI/UX Propuesta

### 1. Botón flotante (ya existe)
- Posición: Esquina inferior derecha
- Icono: ⏱️
- Al click → abre modal de Pomodoro

### 2. Modal Pomodoro

```
┌─────────────────────────┐
│    🍅 POMODORO          │
├─────────────────────────┤
│                         │
│       25:00             │  ← Timer grande
│                         │
│   [▶ Iniciar]          │  ← Botón principal
│   [⏭ Saltar] [⏹ Fin]   │  ← Opciones secundarias
│                         │
│   Ciclo: 1/4            │  ← Progreso
│   ───────────           │
│   Hoy: 3 🍅            │  ← Stats del día
│                         │
└─────────────────────────┘
```

### 3. Notificación al completar
- "¡25 min completados! Descansa 5 min ☕"
- Opciones: "Descanso" / "Seguir" / "Fin"

---

## 💾 Datos a guardar (Historial)

### Por cada Pomodoro completado:
```json
{
  "type": "pomodoro",
  "duracion": 25,           // minutos
  "ciclo": 1,               // ciclo 1-4
  "fecha_inicio": "2026-05-16T10:00:00Z",
  "fecha_fin": "2026-05-16T10:25:00Z",
  "tarea_asociada": "id-tarea"  // opcional
}
```

### Por descanso:
```json
{
  "type": "pomodoro_descanso",
  "duracion": 5,
  "tipo": "corto" | "largo"
}
```

### Stats diarios (para mostrar en Inicio):
- Total pomodoros del día
- Total minutos trabajados
- Descansos tomados

---

## 📊 Ver historial

Nueva sección "Pomodoro" en historial/dashboard:

```
📊 Pomodoro - Hoy
────────────────
🍅 4 completados
⏱️ 100 min trabajados
📈 Meta: 8 pomodoros (50%)
```

```
📊 Pomodoro - Esta Semana
───────────────────────
🍅 20 pomodoros
⏱️ 500 min (8.3 hrs)
📅 Mejor día: Jueves (6 🍅)
```

---

## 🔧 Implementación (Steps)

### Step 1: Timer básico
- Modal con countdown
- Start/Pause/Reset
- Audio al completar (opcional)

### Step 2: Cycles
- Contador de ciclos (1/4)
- Descanso automático
- Descanso largo después de 4

### Step 3: Guardar datos
- Crear tabla `pomodoro_sessions` o usar `items` con type="pomodoro"
- Guardar cada sesión completada
- Calcular stats diarios

### Step 4: Mostrar en Inicio
- Mini widget con pomodoros del día
- "3 🍅 hoy" en el header o cerca del points

### Step 5: Historial
- Nueva sección/dashboard de Pomodoro
- Gráficos simples por día/semana

---

## ❓ Preguntas para ti

1. **Duración**: ¿25/5 estándar o querés自定义?
2. **Tarea asociada**: ¿Vincular a una tarea específica? (opcional)
3. **Audio**: ¿Sonido al completar? 🔔
4. **Notificaciones**: ¿Notificación push al completar?
5. **Estadísticas**: ¿Qué métricas son importantes?

---

## 💡 Ideas opcionales

- **Gamificación**: "¡4 pomodoros = 1 descanso largo!"
- **Meta diaria**: "8 pomodoros por día"
- **Tareas Focus**: Pomodoro solo con tarea específica activa
- **Historial por tarea**: "Tarea X: 3 pomodoros"

---

## Archivo propuesto

Crear: `src/js/pomodoro.js` (nuevo módulo)

```javascript
// Estructura sugerida
const pomodoro = {
    tiempo: 25,        // minutos
    tiempoDescanso: 5,
    ciclos: 1,
    maxCiclos: 4,
    iniciar(),
    pausar(),
    reset(),
    saltar(),
    completar()
}
```

---

¿Empiezo con el Step 1 (timer básico) o preferís resolver las preguntas primero?