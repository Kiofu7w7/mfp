'use client';

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ScriptBuilderFlow from './components/ScriptBuilderFlow';

type ProcessStatus = 'idle' | 'running' | 'completed' | 'crashed' | 'stopped';

interface ProcessInfo {
  id: string;
  name: string;
  description: string;
  status: ProcessStatus;
  pid?: number;
  startTime?: number;
  endTime?: number;
  exitCode?: number;
  output: string[];
}

interface LogEntry {
  logId: string;
  processId: string;
  processName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: ProcessStatus;
  exitCode?: number;
  output: string[];
  pid?: number;
}

interface ScriptConfig {
  id: string;
  name: string;
  description: string;
  type: 'simple' | 'shell' | 'complex';
  command?: string;
  script?: string;
  args?: string[];
  cwd?: string;
}

const API_URL = 'http://localhost:4000/api';
const WS_URL = 'http://localhost:4000';

export default function Home() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const terminalRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [currentView, setCurrentView] = useState<'monitor' | 'logs'>('monitor');
  const [selectedLogProcess, setSelectedLogProcess] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showScriptBuilder, setShowScriptBuilder] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptConfig | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalProcess, setTerminalProcess] = useState<string | null>(null);

  // Update current time every second for duration display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll terminal on new output
  useEffect(() => {
    if (showTerminal && terminalProcess) {
      const terminalRef = terminalRefs.current[terminalProcess];
      if (terminalRef) {
        terminalRef.scrollTop = terminalRef.scrollHeight;
      }
    } else if (currentView === 'logs' && selectedLogProcess) {
      const logTerminalRef = terminalRefs.current['log-terminal'];
      if (logTerminalRef) {
        logTerminalRef.scrollTop = logTerminalRef.scrollHeight;
      }
    }
  }, [selectedProcess, showTerminal, terminalProcess, currentView, selectedLogProcess, processes]);

  // Fetch processes
  const fetchProcesses = async () => {
    try {
      const response = await fetch(`${API_URL}/processes`);
      if (!response.ok) throw new Error('Failed to fetch processes');
      const data = await response.json();
      setProcesses(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs for a process
  const fetchLogs = async (processId: string) => {
    try {
      const response = await fetch(`${API_URL}/logs/${processId}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data);
      if (data.length > 0) {
        setSelectedLog(data[0]); // Select most recent log
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // WebSocket connection
  useEffect(() => {
    const newSocket = io(WS_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    newSocket.on('initial-state', (data: ProcessInfo[]) => {
      console.log('[WebSocket] Received initial-state:', data);
      setProcesses(data);
      setLoading(false);
    });

    newSocket.on('process-output', (data: { processId: string; line: string }) => {
      console.log('[WebSocket] Received process-output:', data);
      setProcesses(prev => 
        prev.map(p => p.id === data.processId 
          ? { ...p, output: [...p.output, data.line] }
          : p
        )
      );
    });

    newSocket.on('process-status', (data: { processId: string; status: ProcessStatus; pid?: number; exitCode?: number; startTime?: number; endTime?: number }) => {
      console.log('[WebSocket] Received process-status:', data);
      setProcesses(prev => 
        prev.map(p => p.id === data.processId 
          ? { ...p, status: data.status, pid: data.pid, exitCode: data.exitCode, startTime: data.startTime, endTime: data.endTime }
          : p
        )
      );
    });

    newSocket.on('script-deleted', (data: { scriptId: string }) => {
      console.log('Script deleted:', data.scriptId);
      setProcesses(prev => prev.filter(p => p.id !== data.scriptId));
      // Limpiar selección si era el script eliminado
      if (selectedProcess === data.scriptId) {
        setSelectedProcess(null);
      }
    });

    newSocket.on('processes-updated', (data: ProcessInfo[]) => {
      console.log('Processes updated:', data);
      setProcesses(data);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [selectedProcess]);

  // Initial fetch
  useEffect(() => {
    if (!socket) {
      fetchProcesses();
    }
  }, [socket]);

  // Actions
  const handleStart = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`${API_URL}/processes/${id}/start`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to start process');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`${API_URL}/processes/${id}/stop`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to stop process');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const process = processes.find(p => p.id === id);
    if (!process) {
      alert('Proceso no encontrado');
      return;
    }

    // Verificar si está corriendo
    if (process.status === 'running') {
      if (!confirm('El proceso está corriendo. ¿Deseas detenerlo y eliminarlo?')) return;
      
      try {
        // Detener primero
        await fetch(`${API_URL}/processes/${id}/stop`, { method: 'POST' });
        // Esperar un poco para que se detenga
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        alert('Error al detener el proceso: ' + (err instanceof Error ? err.message : 'Unknown error'));
        return;
      }
    } else {
      if (!confirm(`¿Estás seguro de eliminar "${process.name}"?`)) return;
    }
    
    try {
      const response = await fetch(`${API_URL}/scripts/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete script');
      }
      
      // Si el proceso seleccionado es el que se eliminó, limpiar selección
      if (selectedProcess === id) {
        setSelectedProcess(null);
      }
      
      // Reload processes
      await fetchProcesses();
      
      alert('Script eliminado exitosamente');
    } catch (err) {
      alert('Error al eliminar: ' + (err instanceof Error ? err.message : 'An error occurred'));
    }
  };

  const handleConfigure = async (id: string) => {
    try {
      // Obtener la configuración completa del script
      const response = await fetch(`${API_URL}/scripts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch script configuration');
      }
      const scriptConfig = await response.json();
      
      setEditingScript(scriptConfig);
      setShowScriptBuilder(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleViewLogs = (processId: string) => {
    setCurrentView('logs');
    setSelectedLogProcess(processId);
    fetchLogs(processId);
  };

  const handleCloseLogs = () => {
    setCurrentView('monitor');
    setSelectedLogProcess(null);
    setLogs([]);
    setSelectedLog(null);
  };

  const handleScriptSaved = () => {
    setShowScriptBuilder(false);
    setEditingScript(null);
    fetchProcesses();
  };

  const handleViewTerminal = (processId: string) => {
    setTerminalProcess(processId);
    setShowTerminal(true);
  };

  // Utility functions
  const getStatusColor = (status: ProcessStatus) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'crashed': return 'bg-red-500';
      case 'stopped': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBorder = (status: ProcessStatus) => {
    switch (status) {
      case 'running': return 'border-green-500';
      case 'completed': return 'border-blue-500';
      case 'crashed': return 'border-red-500';
      case 'stopped': return 'border-yellow-500';
      default: return 'border-gray-400';
    }
  };

  const getStatusText = (status: ProcessStatus) => {
    switch (status) {
      case 'running': return 'En ejecución';
      case 'completed': return 'Completado';
      case 'crashed': return 'Error';
      case 'stopped': return 'Detenido';
      default: return 'Inactivo';
    }
  };

  const formatDuration = (startTime?: number, endTime?: number) => {
    if (!startTime) return '-';
    const end = endTime || currentTime;
    const duration = end - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Python Process Monitor</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('monitor')}
              className={`px-4 py-1.5 rounded ${currentView === 'monitor' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Monitor
            </button>
            <button
              onClick={() => setCurrentView('logs')}
              className={`px-4 py-1.5 rounded ${currentView === 'logs' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              Logs Históricos
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingScript(null);
            setShowScriptBuilder(true);
          }}
          className="bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Nuevo Script
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Script List */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700 font-semibold">
            Scripts ({processes.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {processes.map((process) => (
              <div
                key={process.id}
                onClick={() => setSelectedProcess(process.id)}
                className={`px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors ${
                  selectedProcess === process.id ? 'bg-gray-750 border-l-4 border-blue-500' : ''
                } ${
                  process.status === 'crashed' ? 'border-l-4 border-red-500 animate-pulse' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{process.name}</span>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(process.status)} ${
                    process.status === 'running' ? 'animate-pulse' : ''
                  }`} />
                </div>
                <div className="text-sm text-gray-400 truncate">{process.description}</div>
                <div className="mt-1 text-xs">
                  <span className={`${getStatusColor(process.status)} px-2 py-0.5 rounded`}>
                    {getStatusText(process.status)}
                  </span>
                  {process.status === 'running' && process.startTime && (
                    <span className="ml-2 text-gray-400">
                      {formatDuration(process.startTime)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentView === 'monitor' && selectedProcess && (() => {
            const process = processes.find(p => p.id === selectedProcess);
            if (!process) return <div className="flex items-center justify-center flex-1">Proceso no encontrado</div>;

            return (
              <>
                {/* Process Header */}
                <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-2xl font-bold">{process.name}</h2>
                      <p className="text-gray-400 mt-1">{process.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {process.status === 'running' ? (
                        <button
                          onClick={() => handleStop(process.id)}
                          disabled={actionLoading === process.id}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center gap-2"
                        >
                          <span className="text-lg">⬛</span>
                          Detener
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStart(process.id)}
                          disabled={actionLoading === process.id}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded flex items-center gap-2"
                        >
                          <span className="text-lg">▶</span>
                          Iniciar
                        </button>
                      )}
                      <button
                        onClick={() => handleViewTerminal(process.id)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded flex items-center gap-2"
                      >
                        <span className="text-lg">🖥️</span>
                        Terminal
                      </button>
                      <button
                        onClick={() => handleViewLogs(process.id)}
                        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded flex items-center gap-2"
                      >
                        <span className="text-lg">📋</span>
                        Logs
                      </button>
                      <button
                        onClick={() => handleConfigure(process.id)}
                        className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded flex items-center gap-2"
                      >
                        <span className="text-lg">⚙️</span>
                        Configurar
                      </button>
                      <button
                        onClick={() => handleDelete(process.id)}
                        className="bg-gray-600 hover:bg-red-600 px-4 py-2 rounded flex items-center gap-2"
                      >
                        <span className="text-lg">🗑️</span>
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Process Stats */}
                  <div className="grid grid-cols-5 gap-4">
                    <div className="bg-gray-900 p-3 rounded">
                      <div className="text-gray-400 text-sm">Estado</div>
                      <div className={`mt-1 px-2 py-1 rounded inline-block ${getStatusColor(process.status)}`}>
                        {getStatusText(process.status)}
                      </div>
                    </div>
                    {process.pid && (
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-gray-400 text-sm">PID</div>
                        <div className="text-lg font-mono">{process.pid}</div>
                      </div>
                    )}
                    {process.startTime && (
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-gray-400 text-sm">Duración</div>
                        <div className="text-lg font-mono">{formatDuration(process.startTime, process.endTime)}</div>
                      </div>
                    )}
                    {process.exitCode !== undefined && (
                      <div className="bg-gray-900 p-3 rounded">
                        <div className="text-gray-400 text-sm">Exit Code</div>
                        <div className={`text-lg font-mono ${process.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {process.exitCode}
                        </div>
                      </div>
                    )}
                    <div className="bg-gray-900 p-3 rounded">
                      <div className="text-gray-400 text-sm">Líneas de salida</div>
                      <div className="text-lg font-mono">{process.output.length}</div>
                    </div>
                  </div>
                </div>

                {/* Latest Output Preview */}
                <div className="flex-1 bg-gray-900 p-6 overflow-hidden flex flex-col">
                  <h3 className="text-lg font-semibold mb-3">Últimas líneas de salida</h3>
                  <div className="bg-black rounded p-4 font-mono text-sm flex-1 overflow-y-auto">
                    {process.output.length === 0 ? (
                      <div className="text-gray-500">Sin salida</div>
                    ) : (
                      process.output.slice(-30).map((line, i) => (
                        <div key={i} className="hover:bg-gray-800">
                          <span className="text-gray-500 select-none mr-4">{process.output.length - 30 + i + 1}</span>
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          {currentView === 'monitor' && !selectedProcess && (
            <div className="flex items-center justify-center flex-1 text-gray-500">
              Selecciona un script de la lista para ver detalles
            </div>
          )}

          {currentView === 'logs' && (
            <div className="flex flex-1 overflow-hidden">
              {/* Logs List */}
              <div className="w-80 border-r border-gray-700 flex flex-col">
                <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 font-semibold">
                  Ejecuciones Anteriores
                  {selectedLogProcess && (
                    <button
                      onClick={handleCloseLogs}
                      className="ml-2 text-sm bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                    >
                      ← Volver
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {logs.map((log) => (
                    <div
                      key={log.logId}
                      onClick={() => setSelectedLog(log)}
                      className={`px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800 ${
                        selectedLog?.logId === log.logId ? 'bg-gray-800 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{formatTimestamp(log.startTime)}</span>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(log.status)}`} />
                      </div>
                      <div className="text-xs">
                        <span className={`${getStatusColor(log.status)} px-2 py-0.5 rounded`}>
                          {getStatusText(log.status)}
                        </span>
                        {log.duration && (
                          <span className="ml-2 text-gray-400">
                            {formatDuration(0, log.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Log Detail */}
              {selectedLog && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                    <h3 className="text-xl font-bold">{selectedLog.processName}</h3>
                    <div className="mt-2 grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm">Inicio</div>
                        <div className="text-sm">{formatTimestamp(selectedLog.startTime)}</div>
                      </div>
                      {selectedLog.endTime && (
                        <div>
                          <div className="text-gray-400 text-sm">Fin</div>
                          <div className="text-sm">{formatTimestamp(selectedLog.endTime)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-gray-400 text-sm">Duración</div>
                        <div className="text-sm">{selectedLog.duration ? formatDuration(0, selectedLog.duration) : '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Exit Code</div>
                        <div className={`text-sm ${selectedLog.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedLog.exitCode ?? '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 bg-gray-900 p-6 overflow-hidden flex flex-col">
                    <h4 className="text-lg font-semibold mb-3">Salida completa</h4>
                    <div
                      ref={(el) => { terminalRefs.current['log-terminal'] = el; }}
                      className="bg-black rounded p-4 font-mono text-sm flex-1 overflow-y-auto"
                    >
                      {selectedLog.output.map((line, i) => (
                        <div key={i} className="hover:bg-gray-800">
                          <span className="text-gray-500 select-none mr-4">{i + 1}</span>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Terminal Modal */}
      {showTerminal && terminalProcess && (() => {
        const process = processes.find(p => p.id === terminalProcess);
        if (!process) return null;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-8">
            <div className="bg-gray-800 rounded-lg w-full h-full flex flex-col">
              <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-bold">Terminal - {process.name}</h3>
                <button
                  onClick={() => setShowTerminal(false)}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                >
                  Cerrar
                </button>
              </div>
              <div
                ref={(el) => { terminalRefs.current[terminalProcess] = el; }}
                className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto"
              >
                {process.output.length === 0 ? (
                  <div className="text-gray-500">Sin salida</div>
                ) : (
                  process.output.map((line, i) => (
                    <div key={i} className="hover:bg-gray-900">
                      <span className="text-gray-500 select-none mr-4">{i + 1}</span>
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Script Builder Modal */}
      {showScriptBuilder && (
        <ScriptBuilderFlow
          onSave={handleScriptSaved}
          onClose={() => {
            setShowScriptBuilder(false);
            setEditingScript(null);
          }}
          initialScript={editingScript}
        />
      )}
    </div>
  );
}
