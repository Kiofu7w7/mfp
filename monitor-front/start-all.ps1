# Script para iniciar el backend TypeScript y frontend Next.js

Write-Host "🚀 Iniciando sistema de monitoreo de Python..." -ForegroundColor Cyan
Write-Host ""

# Iniciar backend
Write-Host "📦 Iniciando backend en puerto 4000..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\plaga\OneDrive\viejo\Escritorio\monitor\backend"
    npm run dev
}

# Esperar un poco para que el backend se inicie
Start-Sleep -Seconds 3

# Iniciar frontend
Write-Host "🌐 Iniciando frontend en puerto 3000..." -ForegroundColor Blue
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\plaga\OneDrive\viejo\Escritorio\monitor\monitor-front"
    npm run dev
}

Write-Host ""
Write-Host "✅ Sistema iniciado!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Presiona Ctrl+C para detener ambos servidores" -ForegroundColor Yellow
Write-Host ""

# Mostrar logs en tiempo real
try {
    while ($true) {
        # Mostrar salida del backend
        $backendOutput = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        if ($backendOutput) {
            Write-Host "[BACKEND] $backendOutput" -ForegroundColor Magenta
        }
        
        # Mostrar salida del frontend
        $frontendOutput = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        if ($frontendOutput) {
            Write-Host "[FRONTEND] $frontendOutput" -ForegroundColor Cyan
        }
        
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host ""
    Write-Host "🛑 Deteniendo servidores..." -ForegroundColor Red
    Stop-Job -Job $backendJob, $frontendJob
    Remove-Job -Job $backendJob, $frontendJob
    Write-Host "✅ Servidores detenidos" -ForegroundColor Green
}
