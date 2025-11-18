import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PythonProcessManager } from './processManager';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: 'http://localhost:3000', // Frontend URL
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;

// Configurar CORS
app.use(cors());
app.use(express.json());

// Path a los scripts Python (directorio padre del backend)
const scriptsPath = path.join(__dirname, '..', '..');

// Inicializar el gestor de procesos
const processManager = new PythonProcessManager(scriptsPath);

// Inicializar procesos desde la configuración
processManager.initializeProcesses();

// Callbacks para eventos de procesos
const onOutput = (id: string, data: string) => {
  console.log(`[WebSocket] Emitting process-output for ${id}`);
  io.emit('process-output', { processId: id, line: data });
};

const onStatusChange = (id: string, status: string) => {
  const process = processManager.getProcess(id);
  if (process) {
    console.log(`[WebSocket] Emitting process-status for ${id}: ${status}`);
    io.emit('process-status', { 
      processId: id, 
      status: status,
      pid: process.pid,
      exitCode: process.exitCode,
      startTime: process.startTime,
      endTime: process.endTime
    });
  }
};

// Rutas REST API
app.get('/api/scripts', (req: Request, res: Response) => {
  const configs = processManager.getAllScriptConfigs();
  res.json(configs);
});

app.get('/api/scripts/:id', (req: Request, res: Response) => {
  const config = processManager.getScriptConfig(req.params.id);
  if (!config) {
    return res.status(404).json({ error: 'Script not found' });
  }
  res.json(config);
});

app.post('/api/scripts', (req: Request, res: Response) => {
  try {
    const newScript = req.body;
    
    // Validar que tenga los campos requeridos
    if (!newScript.id || !newScript.name) {
      return res.status(400).json({ error: 'ID and name are required' });
    }

    // Leer configuración actual
    const configPath = path.join(scriptsPath, 'scripts-config.json');
    let config: any = { scripts: [] };
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
    }

    // Verificar si ya existe
    const existingIndex = config.scripts.findIndex((s: any) => s.id === newScript.id);
    if (existingIndex >= 0) {
      // Actualizar existente
      config.scripts[existingIndex] = newScript;
    } else {
      // Agregar nuevo
      config.scripts.push(newScript);
    }

    // Guardar archivo
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Recargar configuraciones en el proceso manager
    processManager.reloadScriptConfigs();

    res.json({ success: true, message: 'Script saved successfully' });
  } catch (error) {
    console.error('Error saving script:', error);
    res.status(500).json({ error: 'Failed to save script' });
  }
});

app.delete('/api/scripts/:id', (req: Request, res: Response) => {
  try {
    const scriptId = req.params.id;
    
    // Verificar que el proceso no esté corriendo
    const process = processManager.getProcess(scriptId);
    if (process && process.status === 'running') {
      return res.status(400).json({ 
        error: 'Cannot delete a running process. Stop it first.' 
      });
    }
    
    // Leer configuración actual
    const configPath = path.join(scriptsPath, 'scripts-config.json');
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Configuration file not found' });
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    // Filtrar el script a eliminar
    const filteredScripts = config.scripts.filter((s: any) => s.id !== scriptId);
    
    if (filteredScripts.length === config.scripts.length) {
      return res.status(404).json({ error: 'Script not found' });
    }

    config.scripts = filteredScripts;

    // Guardar archivo
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Eliminar el proceso del manager
    processManager.deleteProcess(scriptId);
    
    // Recargar configuraciones para sincronizar
    processManager.reloadScriptConfigs();

    console.log(`Script ${scriptId} deleted successfully`);
    
    // Notificar a todos los clientes que se eliminó el script
    io.emit('script-deleted', { scriptId });
    
    // Enviar estado actualizado a todos los clientes
    const updatedProcesses = processManager.getAllProcesses();
    io.emit('processes-updated', updatedProcesses);
    
    res.json({ success: true, message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Error deleting script:', error);
    res.status(500).json({ 
      error: 'Failed to delete script: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

app.get('/api/scripts/:id/validate', (req: Request, res: Response) => {
  const validation = processManager.validateScriptConfig(req.params.id);
  res.json(validation);
});

app.get('/api/processes', (req: Request, res: Response) => {
  const processes = processManager.getAllProcesses();
  res.json(processes);
});

app.get('/api/processes/:id', (req: Request, res: Response) => {
  const process = processManager.getProcess(req.params.id);
  if (!process) {
    return res.status(404).json({ error: 'Process not found' });
  }
  res.json(process);
});

app.post('/api/processes/:id/start', (req: Request, res: Response) => {
  const success = processManager.startProcess(
    req.params.id,
    onOutput,
    onStatusChange
  );
  
  if (!success) {
    return res.status(400).json({ error: 'Cannot start process' });
  }
  
  res.json({ message: 'Process started', id: req.params.id });
});

app.post('/api/processes/:id/stop', (req: Request, res: Response) => {
  const success = processManager.stopProcess(req.params.id);
  
  if (!success) {
    return res.status(400).json({ error: 'Cannot stop process' });
  }
  
  res.json({ message: 'Process stopped', id: req.params.id });
});

app.post('/api/processes/:id/clear', (req: Request, res: Response) => {
  const success = processManager.clearOutput(req.params.id);
  
  if (!success) {
    return res.status(404).json({ error: 'Process not found' });
  }
  
  res.json({ message: 'Output cleared', id: req.params.id });
});

// Rutas de Logs
app.get('/api/logs/:processId', (req: Request, res: Response) => {
  const logs = processManager.getProcessLogs(req.params.processId);
  res.json(logs);
});

app.get('/api/logs/:processId/latest', (req: Request, res: Response) => {
  const log = processManager.getLatestLog(req.params.processId);
  if (!log) {
    return res.status(404).json({ error: 'No logs found' });
  }
  res.json(log);
});

app.get('/api/logs/:processId/:logId', (req: Request, res: Response) => {
  const log = processManager.getLogEntry(req.params.processId, req.params.logId);
  if (!log) {
    return res.status(404).json({ error: 'Log not found' });
  }
  res.json(log);
});

// WebSocket
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Enviar estado actual al conectarse
  socket.emit('initial-state', processManager.getAllProcesses());

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Limpiar al cerrar
process.on('SIGINT', () => {
  console.log('Stopping all processes...');
  processManager.stopAll();
  process.exit(0);
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket ready for connections`);
});
