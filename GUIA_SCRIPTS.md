# Guía para Agregar Nuevos Scripts

## Formato del archivo `scripts-config.json`

### Script Simple (Python directo)
```json
{
  "id": "mi_script",
  "name": "Mi Script Python",
  "description": "Descripción de lo que hace",
  "type": "simple",
  "command": "python",
  "args": ["-u", "mi_script.py"],
  "cwd": "."
}
```

### Script con Entorno Virtual
```json
{
  "id": "script_venv",
  "name": "Script con Virtualenv",
  "description": "Script que necesita un entorno virtual",
  "type": "shell",
  "shell": "powershell",
  "script": "cd mi_proyecto; .\\venv\\Scripts\\Activate.ps1; python -u script.py",
  "cwd": "."
}
```

### Script con Parámetros
```json
{
  "id": "script_parametros",
  "name": "Script con Parámetros",
  "description": "Script que recibe argumentos",
  "type": "simple",
  "command": "python",
  "args": ["-u", "script.py", "--param1", "valor1", "--param2", "valor2"],
  "cwd": "./carpeta"
}
```

### Script Multi-Paso Complejo
```json
{
  "id": "script_complejo",
  "name": "Script Complejo",
  "description": "Script con múltiples pasos de preparación",
  "type": "shell",
  "shell": "powershell",
  "script": "cd proyecto; npm install; cd backend; .\\venv\\Scripts\\Activate.ps1; cd src; python -u main.py --config prod",
  "cwd": "."
}
```

### Script en Subcarpeta
```json
{
  "id": "script_subcarpeta",
  "name": "Script en Subcarpeta",
  "description": "Script ubicado en otra carpeta",
  "type": "simple",
  "command": "python",
  "args": ["-u", "main.py"],
  "cwd": "./mi_proyecto/src"
}
```

### Script con CMD (Windows)
```json
{
  "id": "script_cmd",
  "name": "Script CMD",
  "description": "Script que usa comandos CMD",
  "type": "shell",
  "shell": "cmd",
  "script": "cd carpeta && venv\\Scripts\\activate.bat && python -u script.py",
  "cwd": "."
}
```

## Propiedades Disponibles

- **id**: Identificador único del script (sin espacios)
- **name**: Nombre amigable que se muestra en la UI
- **description**: Descripción opcional del script
- **type**: Tipo de configuración
  - `simple`: Comando directo
  - `shell`: Script de shell (PowerShell o CMD)
  - `complex`: Múltiples pasos (avanzado)
- **command**: Comando a ejecutar (para tipo `simple`)
- **args**: Array de argumentos (para tipo `simple`)
- **cwd**: Directorio de trabajo relativo a la raíz del proyecto
- **shell**: Shell a usar (`powershell` o `cmd`)
- **script**: Script completo a ejecutar (para tipo `shell`)

## Ejemplo Completo

```json
{
  "scripts": [
    {
      "id": "web_scraper",
      "name": "Web Scraper",
      "description": "Scraper de datos web con BeautifulSoup",
      "type": "shell",
      "shell": "powershell",
      "script": "cd scrapers; .\\venv\\Scripts\\Activate.ps1; python -u main.py --mode full",
      "cwd": "."
    },
    {
      "id": "data_processor",
      "name": "Procesador de Datos",
      "description": "Procesa archivos CSV y genera reportes",
      "type": "simple",
      "command": "python",
      "args": ["-u", "processor.py", "--input", "data.csv", "--output", "report.pdf"],
      "cwd": "./data_tools"
    }
  ]
}
```

## Notas Importantes

1. **Flag `-u`**: Siempre incluir `-u` en Python para salida sin buffer
2. **Rutas**: Las rutas en `cwd` son relativas a la carpeta raíz del monitor
3. **Shell**: Para comandos complejos con `&&`, `;`, pipes, etc., usar tipo `shell`
4. **Activación venv**: 
   - PowerShell: `.\\venv\\Scripts\\Activate.ps1`
   - CMD: `venv\\Scripts\\activate.bat`
5. **Después de editar**: Reiniciar el backend para que cargue los nuevos scripts
