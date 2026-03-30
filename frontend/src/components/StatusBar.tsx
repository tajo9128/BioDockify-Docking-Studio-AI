import { useState, useEffect } from 'react'

export function StatusBar() {
  const [gpuStatus, setGpuStatus] = useState<string>('Checking...')
  const [jobs] = useState(0)
  
  useEffect(() => {
    fetch('/api/gpu/status')
      .then(r => r.json())
      .then(d => setGpuStatus(d.available ? 'Available' : 'CPU Only'))
      .catch(() => setGpuStatus('Unknown'))
  }, [])
  
  return (
    <footer className="bg-slate-700 text-gray-300 px-4 py-1.5 text-xs flex items-center justify-between border-t border-slate-600">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Ready
        </span>
        <span>GPU: {gpuStatus}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>Jobs: {jobs}</span>
        <span>v2.3.0</span>
      </div>
    </footer>
  )
}
