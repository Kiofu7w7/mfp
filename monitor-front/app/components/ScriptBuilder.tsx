'use client';

import { useState, useEffect } from 'react';

type BlockType = 'command' | 'cd' | 'activate-venv' | 'python' | 'npm' | 'custom';

interface Block {
  id: string;
  type: BlockType;
  label: string;
  value: string;
  args?: string[];
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

interface ScriptBuilderProps {
  onSave: (scriptConfig: any) => void;
  onClose: () => void;
  initialScript?: ScriptConfig | null;
}

export default function ScriptBuilder({ onSave, onClose, initialScript }: ScriptBuilderProps) {
  const [scriptId, setScriptId] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  // Cargar datos del script si se está editando
  useEffect(() => {
    if (initialScript) {
      setScriptId(initialScript.id);
      setScriptName(initialScript.name);
      setScriptDescription(initialScript.description);
      
      // Si tiene script (tipo shell), parsearlo en bloques
      if (initialScript.script) {
        const parsedBlocks = parseScriptToBlocks(initialScript.script);
        setBlocks(parsedBlocks);
      }
    }
  }, [initialScript]);

  // Función para parsear un script en bloques
  const parseScriptToBlocks = (script: string): Block[] => {
    const commands = script.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
    const blocks: Block[] = [];

    commands.forEach((cmd, index) => {
      let block: Block;

      // Detectar tipo de comando
      if (cmd.startsWith('cd ')) {
        const dir = cmd.substring(3).trim();
        block = {
          id: `block_${Date.now()}_${index}`,
          type: 'cd',
          label: 'Cambiar Directorio',
          value: dir,
        };
      } else if (cmd.includes('\\Scripts\\Activate.ps1')) {
        const match = cmd.match(/\.\\(\w+)\\Scripts\\Activate\.ps1/);
        const venvName = match ? match[1] : 'venv';
        block = {
          id: `block_${Date.now()}_${index}`,
          type: 'activate-venv',
          label: 'Activar Venv',
          value: venvName,
        };
      } else if (cmd.startsWith('python ') || cmd.startsWith('python.exe ')) {
        const parts = cmd.split(' ');
        const scriptFile = parts[1] || 'script.py';
        const args = parts.slice(2);
        block = {
          id: `block_${Date.now()}_${index}`,
          type: 'python',
          label: 'Ejecutar Python',
          value: scriptFile,
          args: args,
        };
      } else if (cmd.startsWith('npm ')) {
        const npmCmd = cmd.substring(4).trim();
        block = {
          id: `block_${Date.now()}_${index}`,
          type: 'npm',
          label: 'NPM Command',
          value: npmCmd,
        };
      } else {
        block = {
          id: `block_${Date.now()}_${index}`,
          type: 'custom',
          label: 'Comando Personalizado',
          value: cmd,
        };
      }

      blocks.push(block);
    });

    return blocks;
  };

  const blockTemplates: { type: BlockType; label: string; icon: string; defaultValue: string }[] = [
    { type: 'cd', label: 'Cambiar Directorio', icon: '📁', defaultValue: 'mi_carpeta' },
    { type: 'activate-venv', label: 'Activar Venv', icon: '🐍', defaultValue: 'venv' },
    { type: 'python', label: 'Ejecutar Python', icon: '▶️', defaultValue: 'script.py' },
    { type: 'npm', label: 'NPM Command', icon: '📦', defaultValue: 'install' },
    { type: 'custom', label: 'Comando Personalizado', icon: '⚙️', defaultValue: '' },
  ];

  const addBlock = (template: typeof blockTemplates[0]) => {
    const newBlock: Block = {
      id: `block_${Date.now()}`,
      type: template.type,
      label: template.label,
      value: template.defaultValue,
      args: [],
    };
    setBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (selectedBlock === id) setSelectedBlock(null);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const generateScript = () => {
    const commands: string[] = [];
    
    blocks.forEach(block => {
      switch (block.type) {
        case 'cd':
          commands.push(`cd ${block.value}`);
          break;
        case 'activate-venv':
          commands.push(`.\\${block.value}\\Scripts\\Activate.ps1`);
          break;
        case 'python':
          const args = block.args && block.args.length > 0 
            ? ' ' + block.args.join(' ')
            : '';
          commands.push(`python -u ${block.value}${args}`);
          break;
        case 'npm':
          commands.push(`npm ${block.value}`);
          break;
        case 'custom':
          commands.push(block.value);
          break;
      }
    });

    return commands.join('; ');
  };

  const handleSave = async () => {
    // Validación: si es nuevo, verificar que no tenga espacios
    if (!initialScript && scriptId.includes(' ')) {
      alert('El ID no puede contener espacios');
      return;
    }
    
    if (!scriptId || !scriptName) {
      alert('Por favor completa el ID y nombre del script');
      return;
    }

    const scriptCommand = generateScript();
    
    const config = {
      id: scriptId,
      name: scriptName,
      description: scriptDescription,
      type: 'shell',
      shell: 'powershell',
      script: scriptCommand,
      cwd: '.'
    };

    try {
      const response = await fetch('http://localhost:4000/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        onSave(config);
        alert('Script guardado exitosamente!');
        onClose();
      } else {
        alert('Error al guardar el script');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al guardar el script');
    }
  };

  const selectedBlockData = blocks.find(b => b.id === selectedBlock);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl border border-white/20 w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 border-b border-white/10 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">🔧 Constructor de Scripts</h2>
              <p className="text-purple-100 text-sm mt-1">Crea scripts visuales con bloques</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Bloques Disponibles */}
          <div className="w-64 bg-gray-800/50 border-r border-white/10 p-4 overflow-y-auto">
            <h3 className="text-white font-bold mb-3 text-sm">📦 BLOQUES DISPONIBLES</h3>
            <div className="space-y-2">
              {blockTemplates.map((template) => (
                <button
                  key={template.type}
                  onClick={() => addBlock(template)}
                  className="w-full text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{template.label}</div>
                      <div className="text-gray-400 text-xs">Click para agregar</div>
                    </div>
                    <span className="text-gray-500 group-hover:text-white transition-colors">+</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-xs">
                💡 <strong>Tip:</strong> Arrastra los bloques al canvas y configúralos
              </p>
            </div>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 flex flex-col">
            {/* Script Info */}
            <div className="bg-gray-800/30 p-4 border-b border-white/10">
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
                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Nombre *</label>
                  <input
                    type="text"
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                    placeholder="Mi Script"
                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Descripción</label>
                  <input
                    type="text"
                    value={scriptDescription}
                    onChange={(e) => setScriptDescription(e.target.value)}
                    placeholder="Descripción opcional"
                    className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm focus:border-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Canvas - Bloques */}
            <div className="flex-1 overflow-y-auto p-6">
              {blocks.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-gray-400 text-lg">Agrega bloques para comenzar</p>
                    <p className="text-gray-500 text-sm mt-2">Los bloques se ejecutarán en orden de arriba a abajo</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-gray-400 text-sm">Flujo de Ejecución:</div>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-500 to-transparent"></div>
                  </div>
                  
                  {blocks.map((block, index) => (
                    <div key={block.id} className="relative">
                      {index > 0 && (
                        <div className="flex justify-center">
                          <div className="w-0.5 h-4 bg-purple-500/50"></div>
                        </div>
                      )}
                      
                      <div
                        onClick={() => setSelectedBlock(block.id)}
                        className={`bg-white/5 border-2 rounded-xl p-4 transition-all cursor-pointer ${
                          selectedBlock === block.id
                            ? 'border-purple-500 shadow-lg shadow-purple-500/20'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                              disabled={index === 0}
                              className="p-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-white text-xs"
                            >
                              ▲
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                              disabled={index === blocks.length - 1}
                              className="p-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded text-white text-xs"
                            >
                              ▼
                            </button>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">
                                {blockTemplates.find(t => t.type === block.type)?.icon}
                              </span>
                              <span className="text-white font-medium">{block.label}</span>
                              <span className="text-gray-500 text-xs">#{index + 1}</span>
                            </div>
                            
                            <div className="bg-black/30 px-3 py-2 rounded border border-white/5">
                              <code className="text-green-400 text-sm font-mono">
                                {block.type === 'cd' && `cd ${block.value}`}
                                {block.type === 'activate-venv' && `.\\${block.value}\\Scripts\\Activate.ps1`}
                                {block.type === 'python' && `python -u ${block.value}${block.args?.length ? ' ' + block.args.join(' ') : ''}`}
                                {block.type === 'npm' && `npm ${block.value}`}
                                {block.type === 'custom' && block.value}
                              </code>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview del Script Generado */}
            {blocks.length > 0 && (
              <div className="bg-gray-800/50 border-t border-white/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 text-sm">💻 Comando Generado:</span>
                </div>
                <div className="bg-black/50 px-4 py-3 rounded border border-white/10 overflow-x-auto">
                  <code className="text-green-400 text-xs font-mono whitespace-pre">
                    {generateScript()}
                  </code>
                </div>
              </div>
            )}
          </div>

          {/* Properties Panel */}
          {selectedBlockData && (
            <div className="w-80 bg-gray-800/50 border-l border-white/10 p-4 overflow-y-auto">
              <h3 className="text-white font-bold mb-4">⚙️ Propiedades del Bloque</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Tipo de Bloque</label>
                  <div className="bg-black/30 px-3 py-2 rounded border border-white/10 text-white text-sm">
                    {selectedBlockData.label}
                  </div>
                </div>

                {selectedBlockData.type === 'cd' && (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Directorio</label>
                    <input
                      type="text"
                      value={selectedBlockData.value}
                      onChange={(e) => updateBlock(selectedBlockData.id, { value: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
                      placeholder="./mi_carpeta"
                    />
                    <p className="text-gray-500 text-xs mt-1">Ruta relativa al proyecto</p>
                  </div>
                )}

                {selectedBlockData.type === 'activate-venv' && (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Nombre del Venv</label>
                    <input
                      type="text"
                      value={selectedBlockData.value}
                      onChange={(e) => updateBlock(selectedBlockData.id, { value: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
                      placeholder="venv"
                    />
                  </div>
                )}

                {selectedBlockData.type === 'python' && (
                  <>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Archivo Python</label>
                      <input
                        type="text"
                        value={selectedBlockData.value}
                        onChange={(e) => updateBlock(selectedBlockData.id, { value: e.target.value })}
                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
                        placeholder="script.py"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Argumentos (uno por línea)</label>
                      <textarea
                        value={selectedBlockData.args?.join('\n') || ''}
                        onChange={(e) => updateBlock(selectedBlockData.id, { 
                          args: e.target.value.split('\n').filter(a => a.trim()) 
                        })}
                        className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
                        rows={4}
                        placeholder="--param1 valor1&#10;--param2 valor2"
                      />
                    </div>
                  </>
                )}

                {selectedBlockData.type === 'npm' && (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Comando NPM</label>
                    <input
                      type="text"
                      value={selectedBlockData.value}
                      onChange={(e) => updateBlock(selectedBlockData.id, { value: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
                      placeholder="install"
                    />
                  </div>
                )}

                {selectedBlockData.type === 'custom' && (
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">Comando Personalizado</label>
                    <textarea
                      value={selectedBlockData.value}
                      onChange={(e) => updateBlock(selectedBlockData.id, { value: e.target.value })}
                      className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm"
                      rows={3}
                      placeholder="tu-comando aquí"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        <div className="bg-gray-800 px-6 py-4 border-t border-white/10 flex items-center justify-between rounded-b-2xl">
          <div className="text-sm text-gray-400">
            {blocks.length} bloque{blocks.length !== 1 ? 's' : ''} configurado{blocks.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!scriptId || !scriptName || blocks.length === 0}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
            >
              💾 Guardar Script
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
