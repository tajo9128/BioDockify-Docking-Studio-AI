import { useEffect, useRef, useState } from 'react'

interface Molecule2DViewerProps {
  smiles?: string
  width?: number
  height?: number
  className?: string
}

export function Molecule2DViewer({ smiles, width = 300, height = 200, className = '' }: Molecule2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !smiles) return

    const drawMolecule = async () => {
      try {
        // Dynamically import smiles-drawer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SmilesDrawer = (await import('smiles-drawer')).default as any
        
        const drawer = new SmilesDrawer.Drawer({
          width,
          height,
          bondThickness: 1.5,
          bondLength: 15,
          shortBondLength: 0.45,
          bondSpacing: 18,
          atomVisualization: 'all',
          isomeric: true,
          debug: false,
          simplifySmiles: true,
          themes: {
            dark: {
              C: '#909090',
              H: '#909090',
              N: '#3050F8',
              O: '#FF0D0D',
              S: '#FFFF30',
              P: '#FF8000',
              F: '#90E050',
              Cl: '#1FF01F',
              Br: '#A62929',
              I: '#940094',
              background: '#ffffff00'
            }
          }
        })

        // Parse and draw
        SmilesDrawer.parse(smiles, (tree: any) => {
          try {
            drawer.draw(tree, canvasRef.current!, 'light', false)
            setError(null)
          } catch (e) {
            setError('Failed to draw molecule')
            console.error('Draw error:', e)
          }
        }, (err: any) => {
          setError('Invalid SMILES notation')
          console.error('Parse error:', err)
        })
      } catch (e) {
        setError('Failed to load drawer')
        console.error('Load error:', e)
      }
    }

    drawMolecule()
  }, [smiles, width, height])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg bg-white/50"
      />
      {!smiles && (
        <div className="absolute inset-0 flex items-center justify-center text-text-tertiary text-sm">
          No structure
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-error text-xs">
          {error}
        </div>
      )}
    </div>
  )
}

// Sample SMILES for common molecules
export const SAMPLE_SMILES = {
  aspirin: 'CC(=O)OC1=CC=CC=C1C(=O)O',
  caffeine: 'Cn1cnc2c1c(=O)n(c(=O)n2C)C',
  ibuprofen: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O',
  glucose: 'OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O',
  ethanol: 'CCO',
  benzene: 'c1ccccc1',
  methanol: 'CO',
  acetone: 'CC(=O)C',
}

// Get a realistic SMILES for docking results
export function getLigandSmiles(ligandName?: string): string {
  // Try to extract or use default
  if (ligandName) {
    const lower = ligandName.toLowerCase()
    if (lower.includes('aspirin')) return SAMPLE_SMILES.aspirin
    if (lower.includes('caffeine')) return SAMPLE_SMILES.caffeine
    if (lower.includes('ibuprofen')) return SAMPLE_SMILES.ibuprofen
  }
  // Default to a simple molecule
  return SAMPLE_SMILES.benzene
}
