import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export type ProcessStatus = 'idle' | 'running' | 'completed' | 'crashed' | 'stopped';

export interface ScriptConfig {
  id: string;
  name: string;
  description: string;
  type: 'simple' | 'complex' | 'shell';
  command?: string;
  args?: string[];
  cwd?: string;
  shell?: string;
  script?: string;
  steps?: {
    description: string;
    command: string;
    args: string[];
    cwd: string;
  }[];
}

export interface ProcessInfo {
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

export interface LogEntry {
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

export class PythonProcessManager {
  private processes: Map<string, ProcessInfo> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();
  private scriptsPath: string;
  private logsPath: string;
  private logs: Map<string, LogEntry[]> = new Map(); // processId -> logs array
  private manualStops: Set<string> = new Set(); // Track manually stopped processes
  private scriptConfigs: Map<string, ScriptConfig> = new Map();

  constructor(scriptsPath: string) {
    this.scriptsPath = scriptsPath;
    this.logsPath = path.join(scriptsPath, 'logs');
    this.ensureLogsDirectory();
    this.loadLogs();
    this.loadScriptConfigs();
  }

  private loadScriptConfigs() {
    try {
      const configPath = path.join(this.scriptsPath, 'scripts-config.json');
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        
        // Limpiar configuraciones anteriores
        this.scriptConfigs.clear();
        
        config.scripts.forEach((script: ScriptConfig) => {
          this.scriptConfigs.set(script.id, script);
        });
        console.log(`Loaded ${this.scriptConfigs.size} script configurations`);
      } else {
        console.log('No scripts-config.json found, using default configuration');
      }
    } catch (error) {
      console.error('Error loading script configs:', error);
    }
  }

  // Método público para recargar configuraciones
  reloadScriptConfigs() {
    this.loadScriptConfigs();
    this.initializeProcesses();
  }

  // Método público para eliminar un proceso
  deleteProcess(id: string): boolean {
    const process = this.processes.get(id);
    if (!process) return false;
    
    // No permitir eliminar procesos en ejecución
    if (process.status === 'running') {
      return false;
    }
    
    this.processes.delete(id);
    console.log(`Deleted process ${id}`);
    return true;
  }

  getScriptConfig(id: string): ScriptConfig | undefined {
    return this.scriptConfigs.get(id);
  }

  getAllScriptConfigs(): ScriptConfig[] {
    return Array.from(this.scriptConfigs.values());
  }

  private ensureLogsDirectory() {
    if (!fs.existsSync(this.logsPath)) {
      fs.mkdirSync(this.logsPath, { recursive: true });
    }
  }

  private loadLogs() {
    try {
      const files = fs.readdirSync(this.logsPath);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const processId = file.replace('.json', '');
          const content = fs.readFileSync(path.join(this.logsPath, file), 'utf-8');
          const logs = JSON.parse(content) as LogEntry[];
          this.logs.set(processId, logs);
        }
      });
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }

  private saveLogs(processId: string) {
    try {
      const logs = this.logs.get(processId) || [];
      const filePath = path.join(this.logsPath, `${processId}.json`);
      fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  }

  private createLogEntry(processInfo: ProcessInfo): LogEntry {
    const logId = `${processInfo.id}_${Date.now()}`;
    return {
      logId,
      processId: processInfo.id,
      processName: processInfo.name,
      startTime: processInfo.startTime || Date.now(),
      endTime: processInfo.endTime,
      duration: processInfo.endTime && processInfo.startTime 
        ? processInfo.endTime - processInfo.startTime 
        : undefined,
      status: processInfo.status,
      exitCode: processInfo.exitCode,
      output: [...processInfo.output],
      pid: processInfo.pid,
    };
  }

  private saveLogEntry(processInfo: ProcessInfo) {
    const logEntry = this.createLogEntry(processInfo);
    const processLogs = this.logs.get(processInfo.id) || [];
    processLogs.push(logEntry);
    this.logs.set(processInfo.id, processLogs);
    this.saveLogs(processInfo.id);
  }

  // Obtener todos los logs de un proceso
  getProcessLogs(processId: string): LogEntry[] {
    return this.logs.get(processId) || [];
  }

  // Obtener un log específico
  getLogEntry(processId: string, logId: string): LogEntry | undefined {
    const logs = this.logs.get(processId) || [];
    return logs.find(log => log.logId === logId);
  }

  // Obtener el último log de un proceso
  getLatestLog(processId: string): LogEntry | undefined {
    const logs = this.logs.get(processId) || [];
    return logs[logs.length - 1];
  }

  // Inicializar procesos disponibles
  initializeProcesses(scriptNames?: string[]) {
    // Si no se pasan nombres, usar las configuraciones cargadas
    const names = scriptNames || Array.from(this.scriptConfigs.keys());
    
    // Eliminar procesos que ya no están en la configuración
    const currentProcessIds = Array.from(this.processes.keys());
    currentProcessIds.forEach(id => {
      if (!names.includes(id)) {
        // Solo eliminar si no está corriendo
        const process = this.processes.get(id);
        if (process && process.status !== 'running') {
          this.processes.delete(id);
          console.log(`Removed process ${id} (no longer in config)`);
        }
      }
    });
    
    // Agregar o actualizar procesos
    names.forEach((id) => {
      const config = this.scriptConfigs.get(id);
      if (!this.processes.has(id)) {
        this.processes.set(id, {
          id,
          name: config?.name || id,
          description: config?.description || '',
          status: 'idle',
          output: [],
        });
      } else {
        // Actualizar nombre y descripción si cambió
        const process = this.processes.get(id);
        if (process && config) {
          process.name = config.name;
          process.description = config.description;
        }
      }
    });
  }

  // Validar configuración del script
  validateScriptConfig(id: string): { valid: boolean; errors: string[] } {
    const config = this.scriptConfigs.get(id);
    const errors: string[] = [];

    if (!config) {
      return { valid: false, errors: ['Script configuration not found'] };
    }

    // Validar directorio de trabajo
    if (config.cwd) {
      const workDir = path.join(this.scriptsPath, config.cwd);
      if (!fs.existsSync(workDir)) {
        errors.push(`Working directory does not exist: ${config.cwd}`);
      }
    }

    // Validar venv si es tipo shell con activación
    if (config.type === 'shell' && config.script) {
      // Buscar activación de venv en el script
      const venvMatch = config.script.match(/\.\\(\w+)\\Scripts\\Activate\.ps1/);
      if (venvMatch) {
        const venvPath = path.join(this.scriptsPath, config.cwd || '.', venvMatch[1]);
        if (!fs.existsSync(venvPath)) {
          errors.push(`Virtual environment not found: ${venvMatch[1]}`);
        } else {
          const pythonExe = path.join(venvPath, 'Scripts', 'python.exe');
          if (!fs.existsSync(pythonExe)) {
            errors.push(`Python executable not found in venv: ${venvMatch[1]}/Scripts/python.exe`);
          }
        }
      }
    }

    // Validar archivo Python si es tipo simple
    if (config.type === 'simple' && config.args) {
      const pyFile = config.args.find(arg => arg.endsWith('.py'));
      if (pyFile) {
        const pyPath = path.join(this.scriptsPath, config.cwd || '.', pyFile);
        if (!fs.existsSync(pyPath)) {
          errors.push(`Python file not found: ${pyFile}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Obtener información de todos los procesos con validación
  getAllProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values());
  }

  // Obtener información de un proceso específico
  getProcess(id: string): ProcessInfo | undefined {
    return this.processes.get(id);
  }

  // Iniciar un script
  startProcess(
    id: string,
    onOutput: (id: string, data: string) => void,
    onStatusChange: (id: string, status: ProcessStatus) => void
  ): boolean {
    const processInfo = this.processes.get(id);
    if (!processInfo) {
      return false;
    }

    if (processInfo.status === 'running') {
      return false; // Ya está ejecutándose
    }

    const config = this.scriptConfigs.get(id);
    if (!config) {
      console.error(`No configuration found for script: ${id}`);
      return false;
    }

    let command: string;
    let args: string[];
    let cwd: string;
    let shellOption: boolean | string = false;

    // Determinar el comando según el tipo de configuración
    if (config.type === 'simple') {
      command = config.command || 'python';
      args = config.args || ['-u', `${id}.py`];
      cwd = path.join(this.scriptsPath, config.cwd || '.');
    } else if (config.type === 'shell') {
      // Para comandos shell complejos
      if (config.shell === 'powershell') {
        command = 'powershell';
        args = ['-NoProfile', '-Command', config.script || ''];
      } else {
        command = 'cmd';
        args = ['/c', config.script || ''];
      }
      cwd = path.join(this.scriptsPath, config.cwd || '.');
      shellOption = true;
    } else if (config.type === 'complex' && config.steps && config.steps.length > 0) {
      // Para configuraciones complejas, usar el primer paso
      const step = config.steps[0];
      command = step.command;
      args = step.args;
      cwd = path.join(this.scriptsPath, step.cwd);
      shellOption = true;
    } else {
      console.error(`Invalid configuration for script: ${id}`);
      return false;
    }

    console.log(`[ProcessManager] Starting process: ${id}`);
    console.log(`[ProcessManager] Command: ${command} ${args.join(' ')}`);
    console.log(`[ProcessManager] Working directory: ${cwd}`);
    
    // Crear proceso
    const pythonProcess = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: shellOption,
    });

    // Actualizar información del proceso
    processInfo.status = 'running';
    processInfo.pid = pythonProcess.pid;
    processInfo.status = 'running';
    processInfo.startTime = Date.now();
    processInfo.endTime = undefined;
    processInfo.exitCode = undefined;
    processInfo.output = [];

    console.log(`[ProcessManager] Process started with PID: ${pythonProcess.pid}`);

    this.childProcesses.set(id, pythonProcess);
    onStatusChange(id, 'running');

    // Capturar salida estándar
    pythonProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(`[${id}] STDOUT:`, output);
      processInfo.output.push(output);
      onOutput(id, output);
    });

    // Capturar salida de error
    pythonProcess.stderr.on('data', (data: Buffer) => {
      const output = `ERROR: ${data.toString()}`;
      console.log(`[${id}] STDERR:`, output);
      processInfo.output.push(output);
      onOutput(id, output);
    });

    // Manejar cierre del proceso
    pythonProcess.on('close', (code: number | null) => {
      processInfo.endTime = Date.now();
      processInfo.exitCode = code ?? undefined;
      
      // Check if it was manually stopped
      if (this.manualStops.has(id)) {
        processInfo.status = 'stopped';
        this.manualStops.delete(id);
        onStatusChange(id, 'stopped');
      } else if (code === 0) {
        processInfo.status = 'completed';
        onStatusChange(id, 'completed');
      } else {
        processInfo.status = 'crashed';
        onStatusChange(id, 'crashed');
      }

      // Guardar log de la ejecución
      this.saveLogEntry(processInfo);

      this.childProcesses.delete(id);
    });

    // Manejar errores del proceso
    pythonProcess.on('error', (error: Error) => {
      const errorMsg = `PROCESS ERROR: ${error.message}`;
      processInfo.output.push(errorMsg);
      onOutput(id, errorMsg);
      processInfo.status = 'crashed';
      onStatusChange(id, 'crashed');
      this.childProcesses.delete(id);
    });

    return true;
  }

  // Detener un proceso
  stopProcess(id: string): boolean {
    const childProcess = this.childProcesses.get(id);
    const processInfo = this.processes.get(id);

    if (!childProcess || !processInfo) {
      console.log(`[stopProcess] Process not found: ${id}`);
      return false;
    }

    console.log(`[stopProcess] Stopping process ${id} with PID ${childProcess.pid}`);

    // Mark as manual stop
    this.manualStops.add(id);

    // En Windows, usar kill directamente con el PID
    try {
      if (process.platform === 'win32') {
        // Usar taskkill en Windows para matar el proceso y todos sus hijos
        exec(`taskkill /pid ${childProcess.pid} /T /F`, (error: any) => {
          if (error) {
            console.log(`[stopProcess] Error killing process: ${error.message}`);
          } else {
            console.log(`[stopProcess] Process ${id} killed successfully`);
          }
        });
      } else {
        // En Unix/Linux usar SIGTERM
        childProcess.kill('SIGTERM');
        
        // Si no responde en 5 segundos, forzar cierre
        setTimeout(() => {
          if (this.childProcesses.has(id)) {
            childProcess.kill('SIGKILL');
          }
        }, 5000);
      }
    } catch (error) {
      console.error(`[stopProcess] Error stopping process ${id}:`, error);
      return false;
    }

    return true;
  }

  // Limpiar salida de un proceso
  clearOutput(id: string): boolean {
    const processInfo = this.processes.get(id);
    if (!processInfo) {
      return false;
    }

    processInfo.output = [];
    return true;
  }

  // Detener todos los procesos
  stopAll() {
    this.childProcesses.forEach((childProcess) => {
      childProcess.kill('SIGTERM');
    });
    this.childProcesses.clear();
  }
}
