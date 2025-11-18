# 🖥️ Monitor de Procesos Python

Sistema completo de monitoreo de scripts Python con backend TypeScript y frontend Next.js que permite:
- ✅ Ejecutar scripts Python
- ⏹️ Detenerlos en cualquier momento
- 📊 Ver su estado en tiempo real (ejecutando, terminado, crasheado)
- 📝 Ver toda la salida en tiempo real mediante WebSockets
- 🔄 Controlar múltiples scripts simultáneamente

## 📁 Estructura del Proyecto

```
monitor/
├── backend/               # Backend TypeScript con Express y Socket.IO
│   ├── src/
│   │   ├── server.ts     # Servidor principal con API REST y WebSockets
│   │   └── processManager.ts  # Gestor de procesos Python
│   ├── package.json
│   └── tsconfig.json
├── monitor-front/         # Frontend Next.js con React
│   └── app/
│       └── page.tsx      # Interfaz de usuario
├── codigo1.py            # Script Python de ejemplo
├── codigo2.py            # Script Python de ejemplo
├── codigo3.py            # Script Python de ejemplo
└── start-all.ps1         # Script para iniciar todo
```

## 🚀 Instalación

### Requisitos Previos
- Node.js (v18 o superior)
- Python 3.x
- PowerShell (Windows)

### Paso 1: Instalar dependencias del backend
```powershell
cd backend
npm install
```

### Paso 2: Instalar dependencias del frontend
```powershell
cd monitor-front
npm install
```

## ▶️ Uso

### Opción 1: Iniciar todo con un comando (Recomendado)
```powershell
.\start-all.ps1
```

### Opción 2: Iniciar manualmente

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd monitor-front
npm run dev
```

## 🌐 Acceso

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **WebSocket:** ws://localhost:4000

## 🔧 API REST

### Obtener todos los procesos
```
GET /api/processes
```

### Obtener un proceso específico
```
GET /api/processes/:id
```

### Iniciar un proceso
```
POST /api/processes/:id/start
```

### Detener un proceso
```
POST /api/processes/:id/stop
```

### Limpiar salida de un proceso
```
POST /api/processes/:id/clear
```

## 📡 Eventos WebSocket

### Cliente → Servidor
- `connection` - Conexión establecida
- `disconnect` - Desconexión

### Servidor → Cliente
- `initial-state` - Estado inicial de todos los procesos
- `process-output` - Nueva salida de un proceso `{id, data}`
- `process-status` - Cambio de estado `{id, status}`

## 📋 Estados de Procesos

- **idle** - Proceso no iniciado
- **running** - Proceso en ejecución
- **completed** - Proceso terminado exitosamente (exit code 0)
- **crashed** - Proceso terminado con error (exit code != 0)

## 🎨 Características del Frontend

- **Monitoreo en tiempo real** mediante WebSockets
- **Interfaz visual** con estados coloreados
- **Consola de salida** para cada proceso (últimas 20 líneas)
- **Botones de control** (Iniciar/Detener/Limpiar)
- **Información detallada**: PID, tiempo de inicio, duración, exit code
- **Diseño responsive** con Tailwind CSS

## 🔧 Tecnologías Utilizadas

### Backend
- **TypeScript** - Tipado estático
- **Express** - Framework web
- **Socket.IO** - WebSockets en tiempo real
- **Node.js child_process** - Ejecución de procesos Python

### Frontend
- **Next.js 16** - Framework React
- **React 19** - Biblioteca UI
- **Socket.IO Client** - Cliente WebSocket
- **Tailwind CSS** - Estilos

## 🐛 Solución de Problemas

### El backend no inicia
```powershell
cd backend
npm install
npm run dev
```

### El frontend no se conecta al backend
- Verificar que el backend esté corriendo en puerto 4000
- Verificar la URL en `page.tsx`: `http://localhost:4000`

### Los scripts Python no se ejecutan
- Verificar que Python esté en el PATH
- Verificar que los archivos .py existan en la raíz del proyecto

### Error de CORS
- Verificar que el frontend esté en `http://localhost:3000`
- Verificar configuración CORS en `server.ts`

## 📝 Notas

- Los procesos Python se ejecutan desde el directorio raíz del proyecto
- La salida se mantiene en memoria (últimas 20 líneas visibles en UI)
- Al detener un proceso, se envía SIGTERM y si no responde en 5s, SIGKILL
- Los procesos son manejados como procesos hijos del backend

## 🎯 Personalización

### Agregar más scripts Python
1. Crear el archivo `.py` en la raíz del proyecto
2. Agregar el nombre (sin extensión) al array en `server.ts`:
```typescript
const availableScripts = ['codigo1', 'codigo2', 'codigo3', 'nuevo_script'];
```

### Cambiar puertos
- **Backend:** Modificar `PORT` en `backend/src/server.ts`
- **Frontend:** El puerto se configura con `npm run dev` (default: 3000)

## 📄 Licencia

MIT
