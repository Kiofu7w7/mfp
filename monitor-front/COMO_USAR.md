# 🎉 Sistema de Monitoreo de Python - LISTO PARA USAR

## ✅ Estado del Sistema

**Backend (TypeScript + Express + Socket.IO):**
- ✅ Instalado y funcionando en http://localhost:4000
- ✅ WebSocket listo para conexiones
- ✅ API REST operativa

**Frontend (Next.js + React):**
- ✅ Instalado y funcionando en http://localhost:3000
- ✅ Conectado al backend vía WebSocket
- ✅ Interfaz lista para usar

## 🚀 Cómo Usar el Sistema

### 1. Acceder a la Interfaz
Abre tu navegador en: **http://localhost:3000**

### 2. Controlar tus Scripts Python
En la interfaz verás 3 tarjetas para los scripts:
- `codigo1.py` - Imprime "Hello, World!" cada 5 segundos
- `codigo2.py` - Imprime "Hello, World! 2" cada 5 segundos
- `codigo3.py` - Imprime "Hello, World! 3" cada 5 segundos

### 3. Botones Disponibles
- **▶️ Iniciar** - Ejecuta el script Python
- **⏹️ Detener** - Detiene el script en ejecución
- **Limpiar** - Limpia la consola de salida

### 4. Información en Tiempo Real
Cada tarjeta muestra:
- **Estado actual**: INACTIVO, EJECUTANDO, TERMINADO, CRASHEADO
- **PID**: ID del proceso
- **Tiempo de inicio**: Hora en que comenzó
- **Duración**: Tiempo transcurrido
- **Exit Code**: Código de salida (0 = exitoso)
- **Consola de salida**: Últimas 20 líneas en tiempo real

## 📊 Características Principales

### ✨ Monitoreo en Tiempo Real
- Los cambios de estado se reflejan instantáneamente
- La salida del script aparece en tiempo real (sin recargar)
- Múltiples scripts pueden ejecutarse simultáneamente

### 🎨 Indicadores Visuales
- **Verde (▶️)**: Script ejecutándose
- **Azul (✅)**: Script terminado exitosamente
- **Rojo (❌)**: Script crasheado o con error
- **Gris (⚪)**: Script inactivo

### 🔧 Control Total
- Iniciar cualquier script con un clic
- Detener scripts en ejecución
- Ver toda la salida en la consola integrada
- Limpiar la salida cuando lo necesites

## 🛠️ Scripts de Utilidad

### Reiniciar el Sistema Completo
Si necesitas reiniciar ambos servidores:

```powershell
# Detener procesos Python existentes
Stop-Process -Name python -Force -ErrorAction SilentlyContinue

# Terminal 1 - Backend
cd C:\Users\plaga\OneDrive\viejo\Escritorio\monitor\backend
npm run dev

# Terminal 2 - Frontend (en otra terminal)
cd C:\Users\plaga\OneDrive\viejo\Escritorio\monitor\monitor-front
npm run dev
```

## 📝 Agregar Tus Propios Scripts

### Paso 1: Crear tu script Python
Crea un archivo `.py` en la carpeta raíz del monitor:
```
C:\Users\plaga\OneDrive\viejo\Escritorio\monitor\mi_script.py
```

### Paso 2: Registrar el script en el backend
Edita `backend/src/server.ts` y agrega tu script:
```typescript
const availableScripts = ['codigo1', 'codigo2', 'codigo3', 'mi_script'];
```

### Paso 3: Reiniciar el backend
El nuevo script aparecerá automáticamente en la interfaz.

## 🔍 Verificar que Todo Funciona

1. **Probar ejecución**: Haz clic en "▶️ Iniciar" en codigo1
2. **Verificar estado**: Debe cambiar a "EJECUTANDO" (verde)
3. **Ver salida**: La consola debe mostrar "Hello, World!" cada 5 segundos
4. **Detener**: Haz clic en "⏹️ Detener"
5. **Verificar finalización**: El estado cambiará y mostrará el exit code

## 🐛 Solucionar Problemas

### El frontend no se conecta
- Verifica que el backend esté corriendo en puerto 4000
- Revisa la consola del navegador (F12) para errores
- Asegúrate de que no haya firewall bloqueando

### Los scripts no se ejecutan
- Verifica que Python esté instalado: `python --version`
- Asegúrate de que los archivos .py existan en la raíz
- Revisa la consola del backend para errores

### Error "Cannot find module"
```powershell
cd backend
npm install
cd ..\monitor-front
npm install
```

## 📚 Arquitectura Técnica

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Frontend  │ <─────────────────────────> │   Backend   │
│  (Next.js)  │         HTTP REST           │  (Express)  │
│   :3000     │ <─────────────────────────> │    :4000    │
└─────────────┘                             └──────┬──────┘
                                                   │
                                                   │ spawn
                                                   ▼
                                            ┌──────────────┐
                                            │   Python     │
                                            │   Scripts    │
                                            └──────────────┘
```

### Flujo de Datos
1. **Usuario hace clic en "Iniciar"** → POST a `/api/processes/:id/start`
2. **Backend** → Ejecuta script Python con `child_process.spawn()`
3. **Script emite salida** → Backend captura stdout/stderr
4. **Backend** → Envía salida vía WebSocket a todos los clientes
5. **Frontend** → Actualiza UI en tiempo real

## 🎯 Próximos Pasos Sugeridos

- [ ] Agregar tus propios scripts Python
- [ ] Probar con scripts que crasheen (para ver el manejo de errores)
- [ ] Ejecutar múltiples scripts simultáneamente
- [ ] Personalizar la interfaz en `monitor-front/app/page.tsx`
- [ ] Agregar más endpoints en el backend según tus necesidades

## 📞 URLs Importantes

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000/api/processes
- **Código Backend**: `backend/src/server.ts`
- **Código Frontend**: `monitor-front/app/page.tsx`
- **Gestor de Procesos**: `backend/src/processManager.ts`

---

**¡Todo está listo para usar! 🎉**
