'use client';

import { useState, useEffect } from 'react';

interface ScheduleConfig {
  enabled: boolean;
  type: 'daily' | 'weekly' | 'monthly' | 'custom' | 'workdays';
  time: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  specificDates?: string[];
  excludeDates?: string[];
  timezone?: string;
  lastDayOfMonth?: boolean;
  firstDayOfMonth?: boolean;
  workdaysOnly?: boolean;
  colombiaHolidays?: boolean;
}

interface ScheduleModalProps {
  isOpen: boolean;
  config: ScheduleConfig;
  onSave: (config: ScheduleConfig) => void;
  onClose: () => void;
}

// Festivos fijos de Colombia 2024-2026
const COLOMBIA_HOLIDAYS = [
  '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
  '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
  '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
  '2024-11-11', '2024-12-08', '2024-12-25',
  '2025-01-01', '2025-01-06', '2025-03-24', '2025-04-17', '2025-04-18',
  '2025-05-01', '2025-06-02', '2025-06-23', '2025-06-30', '2025-07-20',
  '2025-08-07', '2025-08-18', '2025-10-13', '2025-11-03', '2025-11-17',
  '2025-12-08', '2025-12-25',
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
  '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
  '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
  '2026-11-16', '2026-12-08', '2026-12-25',
];

export default function ScheduleModal({ isOpen, config, onSave, onClose }: ScheduleModalProps) {
  const [localConfig, setLocalConfig] = useState<ScheduleConfig>(config);
  const [previewDates, setPreviewDates] = useState<string[]>([]);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    if (isOpen) {
      generatePreviewDates();
    }
  }, [localConfig, isOpen]);

  const generatePreviewDates = () => {
    const dates: string[] = [];
    const today = new Date();
    const daysToShow = 30;

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (shouldExecuteOnDate(date)) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }

    setPreviewDates(dates.slice(0, 10)); // Mostrar solo primeros 10
  };

  const shouldExecuteOnDate = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    // Excluir festivos de Colombia si está activado
    if (localConfig.colombiaHolidays && COLOMBIA_HOLIDAYS.includes(dateStr)) {
      return false;
    }

    // Excluir fechas específicas
    if (localConfig.excludeDates?.includes(dateStr)) {
      return false;
    }

    // Solo días hábiles (Lunes a Viernes, excluyendo festivos)
    if (localConfig.workdaysOnly && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }

    // Fechas específicas
    if (localConfig.specificDates && localConfig.specificDates.length > 0) {
      return localConfig.specificDates.includes(dateStr);
    }

    switch (localConfig.type) {
      case 'daily':
        return true;
      
      case 'weekly':
        return localConfig.daysOfWeek ? localConfig.daysOfWeek.includes(dayOfWeek) : false;
      
      case 'monthly':
        if (localConfig.firstDayOfMonth && dayOfMonth === 1) return true;
        if (localConfig.lastDayOfMonth && dayOfMonth === lastDay) return true;
        return localConfig.daysOfMonth ? localConfig.daysOfMonth.includes(dayOfMonth) : false;
      
      case 'workdays':
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      
      case 'custom':
        return true;
      
      default:
        return false;
    }
  };

  const toggleDayOfWeek = (day: number) => {
    const current = localConfig.daysOfWeek || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    setLocalConfig({ ...localConfig, daysOfWeek: updated });
  };

  const toggleDayOfMonth = (day: number) => {
    const current = localConfig.daysOfMonth || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setLocalConfig({ ...localConfig, daysOfMonth: updated });
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  if (!isOpen) return null;

  const daysOfWeekNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-pink-600 border-b border-pink-700 p-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📅</span> Configurar Calendarización
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna izquierda: Configuración */}
            <div className="space-y-4">
              {/* Tipo de calendarización */}
              <div>
                <label className="block text-white font-semibold mb-2">Tipo de ejecución</label>
                <select
                  value={localConfig.type}
                  onChange={(e) => setLocalConfig({ ...localConfig, type: e.target.value as any })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensual</option>
                  <option value="workdays">Días hábiles</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              {/* Hora de ejecución */}
              <div>
                <label className="block text-white font-semibold mb-2">Hora de ejecución</label>
                <input
                  type="time"
                  value={localConfig.time}
                  onChange={(e) => setLocalConfig({ ...localConfig, time: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                />
              </div>

              {/* Días de la semana (solo si type === 'weekly' o 'custom') */}
              {(localConfig.type === 'weekly' || localConfig.type === 'custom') && (
                <div>
                  <label className="block text-white font-semibold mb-2">Días de la semana</label>
                  <div className="grid grid-cols-7 gap-2">
                    {daysOfWeekNames.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => toggleDayOfWeek(index)}
                        className={`px-2 py-2 rounded text-sm font-semibold transition-colors ${
                          localConfig.daysOfWeek?.includes(index)
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Días del mes (solo si type === 'monthly' o 'custom') */}
              {(localConfig.type === 'monthly' || localConfig.type === 'custom') && (
                <div>
                  <label className="block text-white font-semibold mb-2">Días del mes</label>
                  
                  {/* Opciones especiales */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setLocalConfig({ ...localConfig, firstDayOfMonth: !localConfig.firstDayOfMonth })}
                      className={`px-3 py-2 rounded text-sm font-semibold ${
                        localConfig.firstDayOfMonth
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      Primer día
                    </button>
                    <button
                      onClick={() => setLocalConfig({ ...localConfig, lastDayOfMonth: !localConfig.lastDayOfMonth })}
                      className={`px-3 py-2 rounded text-sm font-semibold ${
                        localConfig.lastDayOfMonth
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      Último día
                    </button>
                  </div>

                  {/* Grid de días 1-31 */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDayOfMonth(day)}
                        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                          localConfig.daysOfMonth?.includes(day)
                            ? 'bg-pink-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Opciones adicionales */}
              <div className="space-y-2 border-t border-gray-700 pt-4">
                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.workdaysOnly || false}
                    onChange={(e) => setLocalConfig({ ...localConfig, workdaysOnly: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>💼 Solo días hábiles (Lun-Vie)</span>
                </label>

                <label className="flex items-center gap-2 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.colombiaHolidays || false}
                    onChange={(e) => setLocalConfig({ ...localConfig, colombiaHolidays: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>🇨🇴 Excluir festivos de Colombia</span>
                </label>
              </div>

              {/* Zona horaria */}
              <div>
                <label className="block text-white font-semibold mb-2">Zona horaria</label>
                <select
                  value={localConfig.timezone}
                  onChange={(e) => setLocalConfig({ ...localConfig, timezone: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="America/Bogota">🇨🇴 Colombia (Bogotá)</option>
                  <option value="America/New_York">🇺🇸 Eastern Time</option>
                  <option value="America/Los_Angeles">🇺🇸 Pacific Time</option>
                  <option value="Europe/Madrid">🇪🇸 España (Madrid)</option>
                  <option value="America/Mexico_City">🇲🇽 México</option>
                  <option value="America/Argentina/Buenos_Aires">🇦🇷 Argentina</option>
                </select>
              </div>
            </div>

            {/* Columna derecha: Vista previa */}
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <span>📆</span> Próximas ejecuciones
              </h3>
              
              {previewDates.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay ejecuciones programadas con la configuración actual</p>
              ) : (
                <div className="space-y-2">
                  {previewDates.map((dateStr, index) => {
                    const date = new Date(dateStr + 'T00:00:00');
                    const dayName = daysOfWeekNames[date.getDay()];
                    const isHoliday = COLOMBIA_HOLIDAYS.includes(dateStr);
                    
                    return (
                      <div key={index} className="bg-gray-900 rounded p-2 border border-gray-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-semibold">
                              {dayName}, {date.getDate()}/{date.getMonth() + 1}/{date.getFullYear()}
                            </div>
                            <div className="text-pink-400 text-sm">
                              ⏰ {localConfig.time}
                            </div>
                          </div>
                          {isHoliday && (
                            <div className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">
                              Festivo
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {previewDates.length >= 10 && (
                    <p className="text-gray-400 text-xs text-center mt-2">
                      Mostrando las primeras 10 ejecuciones...
                    </p>
                  )}
                </div>
              )}

              {/* Resumen */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-white font-semibold mb-2">Resumen</h4>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>📍 Tipo: <span className="text-pink-400 font-semibold">
                    {localConfig.type === 'daily' ? 'Diario' :
                     localConfig.type === 'weekly' ? 'Semanal' :
                     localConfig.type === 'monthly' ? 'Mensual' :
                     localConfig.type === 'workdays' ? 'Días hábiles' : 'Personalizado'}
                  </span></div>
                  <div>⏰ Hora: <span className="text-pink-400 font-semibold">{localConfig.time}</span></div>
                  {localConfig.workdaysOnly && (
                    <div>💼 Solo días laborales</div>
                  )}
                  {localConfig.colombiaHolidays && (
                    <div>🇨🇴 Excluye festivos de Colombia</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 border-t border-gray-700 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-pink-600 hover:bg-pink-700 px-6 py-2 rounded text-white font-semibold"
          >
            💾 Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
}
