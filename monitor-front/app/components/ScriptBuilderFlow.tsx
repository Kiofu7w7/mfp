'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Connection,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ScheduleModal from './ScheduleModal';

interface ScriptConfig {
  id: string;
  name: string;
  description: string;
  type: 'simple' | 'shell' | 'complex';
  command?: string;
  script?: string;
  args?: string[];
  cwd?: string;
  schedule?: ScheduleConfig;
}

interface ScheduleConfig {
  enabled: boolean;
  type: 'daily' | 'weekly' | 'monthly' | 'custom' | 'workdays';
  time: string; // HH:MM formato 24h
  daysOfWeek?: number[]; // 0-6 (Domingo-Sábado)
  daysOfMonth?: number[]; // 1-31
  specificDates?: string[]; // YYYY-MM-DD
  excludeDates?: string[]; // YYYY-MM-DD (festivos)
  timezone?: string;
  lastDayOfMonth?: boolean;
  firstDayOfMonth?: boolean;
  workdaysOnly?: boolean; // Solo días hábiles
  colombiaHolidays?: boolean; // Considerar festivos de Colombia
}

interface ScriptBuilderFlowProps {
  onSave: (scriptConfig: any) => void;
  onClose: () => void;
  initialScript?: ScriptConfig | null;
}

// Nodo personalizado para comando CD
const CdNode = ({ data }: any) => {
  return (
    <div className="bg-blue-600 rounded-lg p-4 border-2 border-blue-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📁</span>
        <div className="font-bold text-white">Cambiar Directorio</div>
      </div>
      <input
        type="text"
        value={data.value}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="directorio"
        className="w-full bg-blue-800 border border-blue-500 rounded px-2 py-1 text-white text-sm"
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo para activar venv
const VenvNode = ({ data }: any) => {
  return (
    <div className="bg-green-600 rounded-lg p-4 border-2 border-green-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🐍</span>
        <div className="font-bold text-white">Activar Venv</div>
      </div>
      <input
        type="text"
        value={data.value}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="venv"
        className="w-full bg-green-800 border border-green-500 rounded px-2 py-1 text-white text-sm"
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo para ejecutar Python
const PythonNode = ({ data }: any) => {
  return (
    <div className="bg-purple-600 rounded-lg p-4 border-2 border-purple-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">▶️</span>
        <div className="font-bold text-white">Ejecutar Python</div>
      </div>
      <input
        type="text"
        value={data.value}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="script.py"
        className="w-full bg-purple-800 border border-purple-500 rounded px-2 py-1 text-white text-sm mb-2"
      />
      <input
        type="text"
        value={data.args || ''}
        onChange={(e) => data.onArgsChange(data.id, e.target.value)}
        placeholder="argumentos (opcional)"
        className="w-full bg-purple-800 border border-purple-500 rounded px-2 py-1 text-white text-sm"
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo para NPM
const NpmNode = ({ data }: any) => {
  return (
    <div className="bg-red-600 rounded-lg p-4 border-2 border-red-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold border-2 border-white"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📦</span>
        <div className="font-bold text-white">NPM Command</div>
      </div>
      <input
        type="text"
        value={data.value}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="install / run dev"
        className="w-full bg-red-800 border border-red-500 rounded px-2 py-1 text-white text-sm"
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo personalizado
const CustomNode = ({ data }: any) => {
  return (
    <div className="bg-gray-600 rounded-lg p-4 border-2 border-gray-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">⚙️</span>
        <div className="font-bold text-white">Comando Personalizado</div>
      </div>
      <input
        type="text"
        value={data.value}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="comando personalizado"
        className="w-full bg-gray-800 border border-gray-500 rounded px-2 py-1 text-white text-sm"
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo IF - Condición
const IfNode = ({ data }: any) => {
  return (
    <div className="bg-yellow-600 rounded-lg p-4 border-2 border-yellow-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">❓</span>
        <div className="font-bold text-white">IF - Condición</div>
      </div>
      <select
        value={data.condition || 'exitcode'}
        onChange={(e) => data.onConditionChange(data.id, e.target.value)}
        className="w-full bg-yellow-800 border border-yellow-500 rounded px-2 py-1 text-white text-sm mb-2"
      >
        <option value="exitcode">Exit Code == 0</option>
        <option value="exitcode_not">Exit Code != 0</option>
        <option value="exists">Archivo existe</option>
        <option value="not_exists">Archivo NO existe</option>
      </select>
      {(data.condition === 'exists' || data.condition === 'not_exists') && (
        <input
          type="text"
          value={data.value}
          onChange={(e) => data.onChange(data.id, e.target.value)}
          placeholder="ruta/archivo.txt"
          className="w-full bg-yellow-800 border border-yellow-500 rounded px-2 py-1 text-white text-sm"
        />
      )}
      <div className="flex justify-between mt-2">
        <div className="text-xs text-white">
          <Handle type="source" position={Position.Left} id="true" className="w-3 h-3 -left-1" />
          ✓ True
        </div>
        <div className="text-xs text-white">
          <Handle type="source" position={Position.Right} id="false" className="w-3 h-3 -right-1" />
          ✗ False
        </div>
      </div>
    </div>
  );
};

// Nodo TRY-CATCH
const TryCatchNode = ({ data }: any) => {
  return (
    <div className="bg-orange-600 rounded-lg p-4 border-2 border-orange-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🛡️</span>
        <div className="font-bold text-white">Try-Catch</div>
      </div>
      <input
        type="text"
        value={data.value || ''}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="Comando a ejecutar con try-catch"
        className="w-full bg-orange-800 border border-orange-500 rounded px-2 py-1 text-white text-sm mb-2"
      />
      <div className="text-xs text-white mb-2">Captura errores y continúa</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo RETRY
const RetryNode = ({ data }: any) => {
  return (
    <div className="bg-pink-600 rounded-lg p-4 border-2 border-pink-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔄</span>
        <div className="font-bold text-white">Retry</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-white block mb-1">Intentos</label>
          <input
            type="number"
            value={data.retries || 3}
            onChange={(e) => data.onRetriesChange(data.id, parseInt(e.target.value))}
            min="1"
            max="10"
            className="w-full bg-pink-800 border border-pink-500 rounded px-2 py-1 text-white text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-white block mb-1">Delay (s)</label>
          <input
            type="number"
            value={data.delay || 5}
            onChange={(e) => data.onDelayChange(data.id, parseInt(e.target.value))}
            min="1"
            max="60"
            className="w-full bg-pink-800 border border-pink-500 rounded px-2 py-1 text-white text-sm"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo WAIT
const WaitNode = ({ data }: any) => {
  return (
    <div className="bg-indigo-600 rounded-lg p-4 border-2 border-indigo-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">⏰</span>
        <div className="font-bold text-white">Wait / Sleep</div>
      </div>
      <input
        type="number"
        value={data.value || 5}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="segundos"
        min="1"
        className="w-full bg-indigo-800 border border-indigo-500 rounded px-2 py-1 text-white text-sm"
      />
      <div className="text-xs text-white mt-1">Pausa en segundos</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo LOG
const LogNode = ({ data }: any) => {
  return (
    <div className="bg-cyan-600 rounded-lg p-4 border-2 border-cyan-700 min-w-[200px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📝</span>
        <div className="font-bold text-white">Log Message</div>
      </div>
      <input
        type="text"
        value={data.value}
        onChange={(e) => data.onChange(data.id, e.target.value)}
        placeholder="Mensaje a mostrar..."
        className="w-full bg-cyan-800 border border-cyan-500 rounded px-2 py-1 text-white text-sm"
      />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

// Nodo SCHEDULE (Calendarización)
const ScheduleNode = ({ data }: any) => {
  return (
    <div className="bg-pink-600 rounded-lg p-4 border-2 border-pink-700 min-w-[220px] relative">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <button
        onClick={() => data.onDelete(data.id)}
        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
        title="Eliminar nodo"
      >
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">📅</span>
        <div className="font-bold text-white">Calendarización</div>
      </div>
      <button
        onClick={() => data.onConfigureSchedule && data.onConfigureSchedule(data.id)}
        className="w-full bg-pink-700 hover:bg-pink-800 border border-pink-500 rounded px-3 py-2 text-white text-sm font-semibold mb-2"
      >
        ⚙️ Configurar horario
      </button>
      {data.schedule && (
        <div className="text-xs text-white bg-pink-800 rounded p-2">
          <div>📍 Tipo: {data.schedule.type === 'daily' ? 'Diario' : 
                          data.schedule.type === 'weekly' ? 'Semanal' : 
                          data.schedule.type === 'monthly' ? 'Mensual' :
                          data.schedule.type === 'workdays' ? 'Días hábiles' : 'Personalizado'}</div>
          <div>⏰ Hora: {data.schedule.time}</div>
          {data.schedule.workdaysOnly && <div>💼 Solo días hábiles</div>}
          {data.schedule.colombiaHolidays && <div>🇨🇴 Excluye festivos CO</div>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  cd: CdNode,
  venv: VenvNode,
  python: PythonNode,
  npm: NpmNode,
  custom: CustomNode,
  if: IfNode,
  trycatch: TryCatchNode,
  retry: RetryNode,
  wait: WaitNode,
  log: LogNode,
  schedule: ScheduleNode,
};

export default function ScriptBuilderFlow({ onSave, onClose, initialScript }: ScriptBuilderFlowProps) {
  const [scriptId, setScriptId] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [currentScheduleNodeId, setCurrentScheduleNodeId] = useState<string | null>(null);
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
    enabled: true,
    type: 'daily',
    time: '09:00',
    daysOfWeek: [],
    daysOfMonth: [],
    specificDates: [],
    excludeDates: [],
    timezone: 'America/Bogota',
    workdaysOnly: false,
    colombiaHolidays: false,
  });

  // Definir deleteNode primero antes de usarlo en useEffect
  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  }, [setNodes, setEdges]);

  // Memoizar el callback de selección para evitar re-renders infinitos
  const handleSelectionChange = useCallback((params: any) => {
    setSelectedNodes(params.nodes.map((n: any) => n.id));
  }, []);

  // Manejar teclas Delete/Backspace para eliminar nodos
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodes.length > 0) {
        // No eliminar si estamos escribiendo en un input
        if ((event.target as HTMLElement).tagName === 'INPUT') return;
        
        selectedNodes.forEach(nodeId => deleteNode(nodeId));
        setSelectedNodes([]);
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, deleteNode]);

  useEffect(() => {
    if (initialScript) {
      setScriptId(initialScript.id);
      setScriptName(initialScript.name);
      setScriptDescription(initialScript.description);
      
      if (initialScript.script) {
        parseScriptToNodes(initialScript.script);
      }
    }
  }, [initialScript]);

  const parseScriptToNodes = (script: string) => {
    const commands = script.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yPos = 100;

    commands.forEach((cmd, index) => {
      let nodeType = 'custom';
      let nodeValue = cmd;
      let nodeArgs = '';

      if (cmd.startsWith('cd ')) {
        nodeType = 'cd';
        nodeValue = cmd.substring(3).trim();
      } else if (cmd.includes('\\Scripts\\Activate.ps1')) {
        nodeType = 'venv';
        const match = cmd.match(/\.\\(\w+)\\Scripts\\Activate\.ps1/);
        nodeValue = match ? match[1] : 'venv';
      } else if (cmd.startsWith('python ') || cmd.startsWith('python.exe ')) {
        nodeType = 'python';
        const parts = cmd.split(' ');
        nodeValue = parts[1] || 'script.py';
        nodeArgs = parts.slice(2).join(' ');
      } else if (cmd.startsWith('npm ')) {
        nodeType = 'npm';
        nodeValue = cmd.substring(4).trim();
      } else if (cmd.match(/^try\s*\{/)) {
        nodeType = 'trycatch';
        // Extraer el comando dentro del try
        const match = cmd.match(/try\s*\{\s*(.+?)\s*\}\s*catch/);
        nodeValue = match ? match[1] : '';
      } else if (cmd.match(/^if\s*\(/)) {
        nodeType = 'if';
        const match = cmd.match(/Test-Path\s+"([^"]+)"/);
        nodeValue = match ? match[1] : '';
      } else if (cmd.match(/^\$retryCount/)) {
        nodeType = 'retry';
        const retriesMatch = cmd.match(/while\s*\(\$retryCount\s*-lt\s*(\d+)\)/);
        const delayMatch = cmd.match(/Start-Sleep\s*-Seconds\s*(\d+)/);
        nodeValue = retriesMatch ? retriesMatch[1] : '3';
        nodeArgs = delayMatch ? delayMatch[1] : '5';
      } else if (cmd.startsWith('Start-Sleep')) {
        nodeType = 'wait';
        const match = cmd.match(/Start-Sleep\s*-Seconds\s*(\d+)/);
        nodeValue = match ? match[1] : '5';
      } else if (cmd.startsWith('Write-Host') && !cmd.includes('Error:')) {
        nodeType = 'log';
        const match = cmd.match(/Write-Host\s+"([^"]+)"/);
        nodeValue = match ? match[1] : '';
      }

      const nodeId = `node-${index + 1}`;
      newNodes.push({
        id: nodeId,
        type: nodeType,
        position: { x: 250, y: yPos },
        data: {
          id: nodeId,
          value: nodeValue,
          args: nodeArgs,
          onChange: handleNodeValueChange,
          onArgsChange: handleNodeArgsChange,
          onDelete: deleteNode,
          onConditionChange: handleConditionChange,
          onRetriesChange: handleRetriesChange,
          onDelayChange: handleDelayChange,
          onConfigureSchedule: handleConfigureSchedule,
        },
      });

      if (index > 0) {
        newEdges.push({
          id: `edge-${index}`,
          source: `node-${index}`,
          target: nodeId,
          animated: true,
        });
      }

      yPos += 150;
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setNodeIdCounter(commands.length + 1);
  };

  const handleNodeValueChange = useCallback((nodeId: string, value: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, value },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleNodeArgsChange = useCallback((nodeId: string, args: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, args },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleConditionChange = useCallback((nodeId: string, condition: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, condition },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleRetriesChange = useCallback((nodeId: string, retries: number) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, retries },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleDelayChange = useCallback((nodeId: string, delay: number) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, delay },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleConfigureSchedule = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.data.schedule) {
      setScheduleConfig(node.data.schedule);
    }
    setCurrentScheduleNodeId(nodeId);
    setShowScheduleModal(true);
  }, [nodes]);

  const handleSaveSchedule = useCallback(() => {
    if (!currentScheduleNodeId) return;
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === currentScheduleNodeId) {
          return {
            ...node,
            data: { ...node.data, schedule: scheduleConfig },
          };
        }
        return node;
      })
    );
    
    setShowScheduleModal(false);
    setCurrentScheduleNodeId(null);
  }, [currentScheduleNodeId, scheduleConfig, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const addNode = (type: string) => {
    const newNodeId = `node-${nodeIdCounter}`;
    const newNode: Node = {
      id: newNodeId,
      type: type,
      position: { x: 250, y: nodeIdCounter * 150 },
      data: {
        id: newNodeId,
        value: '',
        args: '',
        onChange: handleNodeValueChange,
        onArgsChange: handleNodeArgsChange,
        onDelete: deleteNode,
        onConditionChange: handleConditionChange,
        onRetriesChange: handleRetriesChange,
        onDelayChange: handleDelayChange,
        onConfigureSchedule: handleConfigureSchedule,
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeIdCounter(nodeIdCounter + 1);
  };

  const generateScript = (): string => {
    if (nodes.length === 0) return '';

    // Ordenar nodos según sus conexiones
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    
    const commands = sortedNodes.map((node) => {
      const { type, data } = node;
      
      switch (type) {
        case 'cd':
          return `cd ${data.value}`;
        case 'venv':
          return `.\\${data.value}\\Scripts\\Activate.ps1`;
        case 'python':
          return `python ${data.value}${data.args ? ' ' + data.args : ''}`;
        case 'npm':
          return `npm ${data.value}`;
        case 'wait':
          return `Start-Sleep -Seconds ${data.value || 5}`;
        case 'log':
          return `Write-Host "${data.value || 'Log message'}"`;
        case 'if':
          // Generar condición PowerShell
          if (data.condition === 'exitcode') {
            return `if ($LASTEXITCODE -eq 0) { Write-Host "Success" } else { Write-Host "Failed" }`;
          } else if (data.condition === 'exitcode_not') {
            return `if ($LASTEXITCODE -ne 0) { Write-Host "Error detected" }`;
          } else if (data.condition === 'exists') {
            return `if (Test-Path "${data.value}") { Write-Host "File exists" }`;
          } else if (data.condition === 'not_exists') {
            return `if (-not (Test-Path "${data.value}")) { Write-Host "File not found" }`;
          }
          return '';
        case 'trycatch':
          if (data.value) {
            return `try { ${data.value} } catch { Write-Host "Error: $_"; }`;
          }
          return '';
        case 'retry':
          const retries = data.retries || 3;
          const delay = data.delay || 5;
          return `$retryCount = 0; while ($retryCount -lt ${retries}) { $retryCount++; Write-Host "Attempt $retryCount"; Start-Sleep -Seconds ${delay} }`;
        case 'custom':
          return data.value;
        default:
          return data.value;
      }
    });

    return commands.filter(cmd => cmd).join('; ');
  };

  const handleSave = async () => {
    if (!initialScript && scriptId.includes(' ')) {
      alert('El ID no puede contener espacios');
      return;
    }
    
    if (!scriptId || !scriptName) {
      alert('Por favor completa el ID y nombre del script');
      return;
    }

    if (nodes.length === 0) {
      alert('Agrega al menos un comando al flujo');
      return;
    }

    const scriptCommand = generateScript();
    
    // Buscar si hay un nodo de Schedule configurado
    const scheduleNode = nodes.find(n => n.type === 'schedule' && n.data.schedule);
    
    const config = {
      id: scriptId,
      name: scriptName,
      description: scriptDescription,
      type: 'shell',
      shell: 'powershell',
      script: scriptCommand,
      cwd: '.',
      schedule: scheduleNode?.data.schedule
    };

    try {
      const response = await fetch('http://localhost:4000/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save script');
      }

      alert('Script guardado exitosamente!');
      onSave(config);
      onClose();
    } catch (error) {
      alert('Error al guardar el script: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Script Builder - Visual Flow</h2>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white"
            >
              ✕ Cerrar
            </button>
          </div>

          {/* Script Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">
                ID del Script * {initialScript && <span className="text-yellow-500">(no editable)</span>}
              </label>
              <input
                type="text"
                value={scriptId}
                onChange={(e) => setScriptId(e.target.value.replace(/[^a-z0-9_]/g, ''))}
                placeholder="mi_script"
                disabled={!!initialScript}
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Nombre *</label>
              <input
                type="text"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                placeholder="Mi Script"
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Descripción</label>
              <input
                type="text"
                value={scriptDescription}
                onChange={(e) => setScriptDescription(e.target.value)}
                placeholder="Descripción del script"
                className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
              />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-gray-400 text-sm mr-2">Comandos básicos:</span>
            <button
              onClick={() => addNode('cd')}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>📁</span> CD
            </button>
            <button
              onClick={() => addNode('venv')}
              className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>🐍</span> Venv
            </button>
            <button
              onClick={() => addNode('python')}
              className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>▶️</span> Python
            </button>
            <button
              onClick={() => addNode('npm')}
              className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>📦</span> NPM
            </button>
            <button
              onClick={() => addNode('custom')}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>⚙️</span> Custom
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 text-sm mr-2">Control de flujo:</span>
            <button
              onClick={() => addNode('if')}
              className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>❓</span> IF
            </button>
            <button
              onClick={() => addNode('trycatch')}
              className="bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>🛡️</span> Try-Catch
            </button>
            <button
              onClick={() => addNode('retry')}
              className="bg-pink-600 hover:bg-pink-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>🔄</span> Retry
            </button>
            <button
              onClick={() => addNode('wait')}
              className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>⏰</span> Wait
            </button>
            <button
              onClick={() => addNode('log')}
              className="bg-cyan-600 hover:bg-cyan-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>📝</span> Log
            </button>
          </div>
          
          {/* Sección: Automatización */}
          <div className="flex flex-col gap-2">
            <div className="text-xs text-gray-400 font-semibold mb-1">AUTOMATIZACIÓN</div>
            <button
              onClick={() => addNode('schedule')}
              className="bg-pink-600 hover:bg-pink-700 px-3 py-1.5 rounded text-white text-sm flex items-center gap-2"
            >
              <span>📅</span> Calendarizar
            </button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 bg-gray-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#374151" gap={16} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'cd': return '#2563eb';
                  case 'venv': return '#16a34a';
                  case 'python': return '#9333ea';
                  case 'npm': return '#dc2626';
                  case 'if': return '#ca8a04';
                  case 'trycatch': return '#ea580c';
                  case 'retry': return '#db2777';
                  case 'wait': return '#4f46e5';
                  case 'log': return '#0891b2';
                  case 'schedule': return '#db2777';
                  default: return '#4b5563';
                }
              }}
            />
          </ReactFlow>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            {nodes.length} nodos • Arrastra para mover • Conecta arrastrando desde los puntos
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-white font-semibold"
            >
              💾 Guardar Script
            </button>
          </div>
        </div>
      </div>

      {/* Modal de configuración de horarios */}
      <ScheduleModal
        isOpen={showScheduleModal}
        config={scheduleConfig}
        onSave={handleSaveSchedule}
        onClose={() => setShowScheduleModal(false)}
      />
    </div>
  );
}
