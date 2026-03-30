import { useState } from 'react'
import { Viewer } from '@/components/Viewer'

interface Config {
  center_x: number
  center_y: number
  center_z: number
  size_x: number
  size_y: number
  size_z: number
  exhaustiveness: number
  num_modes: number
}

export function Docking() {
  const [receptor, setReceptor] = useState<File | null>(null)
  const [ligand, setLigand] = useState<File | null>(null)
  const [config, setConfig] = useState<Config>({
    center_x: 0, center_y: 0, center_z: 0,
    size_x: 20, size_y: 20, size_z: 20,
    exhaustiveness: 8,
    num_modes: 10
  })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [results] = useState<any[]>([])

  const handleConfigChange = (key: keyof Config, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleDocking = async () => {
    if (!receptor || !ligand) {
      setError('Please upload both receptor and ligand files')
      return
    }
    setError('')
    setStatus('Starting docking...')
  }

  return (
    <div className="h-full flex">
      <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Docking Parameters</h2>
        </div>
        
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receptor (PDB)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-cyan-400 transition-colors">
                <input type="file" accept=".pdb" className="hidden" id="receptor" onChange={e => setReceptor(e.target.files?.[0] || null)} />
                <label htmlFor="receptor" className="cursor-pointer">
                  {receptor ? receptor.name : 'Click to upload receptor'}
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ligand (SDF/MOL2)</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-cyan-400 transition-colors">
                <input type="file" accept=".sdf,.mol2" className="hidden" id="ligand" onChange={e => setLigand(e.target.files?.[0] || null)} />
                <label htmlFor="ligand" className="cursor-pointer">
                  {ligand ? ligand.name : 'Click to upload ligand'}
                </label>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Grid Box Center</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map(axis => (
                <div key={axis}>
                  <label className="text-xs text-gray-500 uppercase">{axis}</label>
                  <input
                    type="number"
                    value={config[`center_${axis}`]}
                    onChange={e => handleConfigChange(`center_${axis}`, parseFloat(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Grid Box Size</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['x', 'y', 'z'] as const).map(axis => (
                <div key={axis}>
                  <label className="text-xs text-gray-500 uppercase">{axis}</label>
                  <input
                    type="number"
                    value={config[`size_${axis}`]}
                    onChange={e => handleConfigChange(`size_${axis}`, parseFloat(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exhaustiveness: {config.exhaustiveness}</label>
            <input
              type="range" min="1" max="64" value={config.exhaustiveness}
              onChange={e => handleConfigChange('exhaustiveness', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Modes: {config.num_modes}</label>
            <input
              type="range" min="1" max="50" value={config.num_modes}
              onChange={e => handleConfigChange('num_modes', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <button
            onClick={handleDocking}
            className="w-full bg-cyan-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-cyan-700 transition-colors"
          >
            Start Docking
          </button>

          {status && <p className="text-sm text-cyan-600">{status}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      <div className="flex-1 bg-gray-100">
        <Viewer />
      </div>

      <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Docking Results</h2>
        </div>
        
        <div className="p-4">
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No results yet. Run a docking simulation to see results here.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((result, i) => (
                <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Pose {i + 1}</span>
                    <span className="text-cyan-600 font-bold">{result.vina_score?.toFixed(2)} kcal/mol</span>
                  </div>
                  {result.gnina_score && (
                    <p className="text-xs text-gray-500 mt-1">CNN: {result.gnina_score.toFixed(2)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
