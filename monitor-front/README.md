# 🖥️ Monitor de Procesos Python

Sistema completo de monitoreo en tiempo real para scripts de Python con backend REST API y frontend Next.js.

## 📁 Estructura del Proyecto

```
monitor/
├── monitor.py              # Backend REST API (Flask)
├── requirements.txt        # Dependencias Python
├── codigo1.py             # Script de ejemplo 1
├── codigo2.py             # Script de ejemplo 2
├── codigo3.py             # Script de ejemplo 3
└── monitor-front/         # Frontend Next.js
    ├── app/
    │   └── page.tsx       # Dashboard principal
    └── package.json
```

## 🚀 Instalación y Configuración

### Backend (Python + Flask)

1. **Activar el entorno virtual** (si es necesario):
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

2. **Las dependencias ya están instaladas**, pero si necesitas reinstalarlas:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Iniciar el backend**:
   ```powershell
   python monitor.py
   ```
   
   El servidor correrá en: `http://localhost:5000`

### Frontend (Next.js)

1. **Navegar a la carpeta del frontend**:
   ```powershell
   cd monitor-front
   ```

2. **Instalar dependencias** (si no están instaladas):
   ```powershell
   npm install
   ```

3. **Iniciar el servidor de desarrollo**:
   ```powershell
   npm run dev
   ```
   
   La aplicación correrá en: `http://localhost:3000`

## 🎯 Uso

### Opción 1: Usar la Interfaz Web

1. Abre el navegador en `http://localhost:3000`
2. Verás un dashboard con todos los scripts disponibles
3. Usa los botones para:
   - ▶️ **Iniciar** un script
   - ⏹️ **Detener** un script en ejecución
   - 🔄 **Reiniciar** un script

### Opción 2: Usar la API directamente

#### Endpoints disponibles:

**Estado:**
- `GET /api/health` - Verifica que el backend esté activo
- `GET /api/status` - Obtiene el estado de todos los scripts
- `GET /api/status/<script_name>` - Estado de un script específico

**Control:**
- `POST /api/start/<script_name>` - Inicia un script
- `POST /api/stop/<script_name>` - Detiene un script
- `POST /api/restart/<script_name>` - Reinicia un script

**Logs:**
- `GET /api/output/<script_name>` - Historial de salidas

#### Ejemplos con curl:

```powershell
# Ver estado de todos los scripts
curl http://localhost:5000/api/status

# Iniciar un script
curl -X POST http://localhost:5000/api/start/codigo1.py

# Detener un script
curl -X POST http://localhost:5000/api/stop/codigo1.py

# Reiniciar un script
curl -X POST http://localhost:5000/api/restart/codigo1.py
```

## 📊 Características

### Backend
✅ API REST completa con Flask
✅ Monitoreo en tiempo real de procesos
✅ Control total: start, stop, restart
✅ Captura de stdout/stderr
✅ Detección automática de crashes
✅ Thread-safe con locks
✅ CORS habilitado

### Frontend
✅ Interfaz moderna con Next.js 16 + TypeScript
✅ Actualización automática cada segundo
✅ Estados visuales intuitivos
✅ Información detallada de cada proceso
✅ Diseño responsive
✅ Tailwind CSS para estilos

## 📱 Estados de los Scripts

- 🟢 **EJECUTANDO** - El script está corriendo normalmente
- ✅ **TERMINADO_OK** - Finalizó sin errores
- ❌ **CRASHEADO** - Terminó con error
- ⏸️ **DETENIDO** - Detenido manualmente
- ⚪ **ERROR** - Error al iniciar

## 🔧 Personalización

### Agregar más scripts

1. Edita `monitor.py` y agrega el nombre del script a `AVAILABLE_SCRIPTS`:

```python
AVAILABLE_SCRIPTS = [
    'codigo1.py',
    'codigo2.py',
    'codigo3.py',
    'mi_nuevo_script.py'  # ← Agregar aquí
]
```

### Cambiar el puerto del backend

En `monitor.py`, modifica la última línea:

```python
app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
                                        # ↑ Cambiar puerto aquí
```

### Cambiar la URL del backend en el frontend

En `monitor-front/app/page.tsx`, modifica:

```typescript
const API_URL = 'http://localhost:5000/api';
```

## 🛠️ Comandos Útiles

### Ejecutar todo (2 terminales necesarias)

**Terminal 1 - Backend:**
```powershell
python monitor.py
```

**Terminal 2 - Frontend:**
```powershell
cd monitor-front
npm run dev
```

### Build para producción

**Frontend:**
```powershell
cd monitor-front
npm run build
npm start
```

## 📝 Notas

- El backend debe estar corriendo para que el frontend funcione
- Los scripts se ejecutan como subprocesos del backend
- Al detener el backend, todos los scripts monitoreados se detendrán
- El historial de salidas mantiene las últimas 100 líneas por script

## 🐛 Troubleshooting

**Error: "No se puede conectar al backend"**
- Verifica que el backend esté corriendo en el puerto 5000
- Revisa que no haya un firewall bloqueando la conexión

**Los scripts no inician:**
- Verifica que los archivos .py existan en el mismo directorio que monitor.py
- Revisa que Python esté correctamente instalado

**El frontend no muestra datos:**
- Abre las DevTools del navegador (F12) y revisa la consola
- Verifica que la URL del API sea correcta
