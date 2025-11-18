# Script para iniciar el sistema de monitoreo completo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Monitor de Procesos Python - Inicio  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Python está disponible
Write-Host "[1/4] Verificando Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "  ✓ Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error: Python no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar si Node está disponible
Write-Host "[2/4] Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    Write-Host "  ✓ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Error: Node.js no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar dependencias del backend
Write-Host "[3/4] Verificando dependencias del backend..." -ForegroundColor Yellow
if (Test-Path ".venv") {
    Write-Host "  ✓ Entorno virtual encontrado" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Entorno virtual no encontrado, usando Python global" -ForegroundColor Yellow
}

# Verificar dependencias del frontend
Write-Host "[4/4] Verificando dependencias del frontend..." -ForegroundColor Yellow
if (Test-Path "monitor-front/node_modules") {
    Write-Host "  ✓ Dependencias de Node.js instaladas" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Instalando dependencias del frontend..." -ForegroundColor Yellow
    Push-Location monitor-front
    npm install
    Pop-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando servicios...                " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar backend en una nueva ventana
Write-Host "▶ Iniciando Backend (Flask) en nueva terminal..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Backend - Monitor de Procesos' -ForegroundColor Green; python monitor.py"

# Esperar 3 segundos para que el backend inicie
Start-Sleep -Seconds 3

# Iniciar frontend en una nueva ventana
Write-Host "▶ Iniciando Frontend (Next.js) en nueva terminal..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Frontend - Monitor de Procesos' -ForegroundColor Blue; Set-Location monitor-front; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✓ Sistema iniciado correctamente     " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Backend API:  " -NoNewline
Write-Host "http://localhost:5000" -ForegroundColor Yellow
Write-Host "🌐 Frontend:     " -NoNewline
Write-Host "http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Abre tu navegador en http://localhost:3000 para usar el monitor" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
