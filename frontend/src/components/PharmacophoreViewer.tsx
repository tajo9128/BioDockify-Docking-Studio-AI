import { useEffect, useRef, useState } from 'react'

interface Feature {
  type: string
  family: string
  position: { x: number; y: number; z: number }
  atoms: number[]
  color: string
  radius: number
}

interface PharmacophoreViewerProps {
  features: Feature[]
  smiles?: string
  width?: number
  height?: number
  showMolecule?: boolean
  className?: string
}

// Feature colors matching backend
const FEATURE_COLORS: Record<string, string> = {
  'Donor': '#4169E1',
  'Acceptor': '#DC143C',
  'Hydrophobic': '#FFD700',
  'Aromatic': '#9932CC',
  'PosIonizable': '#32CD32',
  'NegIonizable': '#FF8C00',
  'LumpedHydrophobic': '#DAA520',
}

export function PharmacophoreViewer3D({ 
  features = [], 
  smiles,
  width = 400, 
  height = 400,
  showMolecule = true,
  className = '' 
}: PharmacophoreViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const [loaded, setLoaded] = useState(false)
  const [error] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !window.$3Dmol) return

    // Create viewer
    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: '#1a1a2e',
      id: 'pharmacophore-viewer'
    })

    viewerRef.current = viewer

    // Build PDB string with atoms and pharmacophore spheres
    let pdbContent = generatePharmacophorePDB(features)
    
    if (showMolecule && smiles) {
      // Add molecule structure
      const molPDB = generateMoleculePDB(smiles)
      pdbContent += molPDB
    }

    // Add model
    viewer.addModel(pdbContent, 'pdb')

    // Style pharmacophore features as spheres
    viewer.setStyle({}, { sphere: { radius: 0.5 } })

    // Color each feature by type
    features.forEach((feat, idx) => {
      const color = feat.color || FEATURE_COLORS[feat.family] || '#888888'
      viewer.addStyle(
        { atom: [`${idx}`] },
        { 
          sphere: { 
            color: color, 
            radius: feat.radius || 1.5 
          } 
        }
      )
    })

    // If we have a molecule, style it as cartoon
    if (showMolecule && features.length > 0) {
      viewer.addStyle(
        { atom: { resn: 'LIG' } },
        { stick: {}, cartoon: { color: 'spectrum' } }
      )
    }

    viewer.zoomTo()
    viewer.render()
    setLoaded(true)

    return () => {
      viewer.clear()
    }
  }, [features, smiles, showMolecule])

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ 
          height: height, 
          background: '#1a1a2e',
          minWidth: width 
        }}
      />
      
      {/* Feature Legend Overlay */}
      {loaded && features.length > 0 && (
        <div className="absolute top-2 left-2 bg-black/70 rounded-lg p-2 text-xs">
          <p className="font-semibold text-white mb-1">Pharmacophore Features</p>
          {Object.entries(getFeatureSummary(features)).map(([type, count]) => (
            <div key={type} className="flex items-center gap-1 text-white/80">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: FEATURE_COLORS[type] || '#888' }}
              />
              <span>{type}: {count as number}</span>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      {loaded && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button 
            onClick={() => viewerRef.current?.zoom(1.5)}
            className="w-8 h-8 bg-black/50 rounded text-white text-sm hover:bg-black/70"
          >
            +
          </button>
          <button 
            onClick={() => viewerRef.current?.zoom(0.67)}
            className="w-8 h-8 bg-black/50 rounded text-white text-sm hover:bg-black/70"
          >
            -
          </button>
          <button 
            onClick={() => viewerRef.current?.rotate(5, { x: 0, y: 1, z: 0 })}
            className="w-8 h-8 bg-black/50 rounded text-white text-sm hover:bg-black/70"
          >
            ⟳
          </button>
        </div>
      )}

      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
          <span className="text-text-secondary">Loading 3D view...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-error/10">
          <span className="text-error text-sm">{error}</span>
        </div>
      )}
    </div>
  )
}

// Generate PDB-like content for pharmacophore features
function generatePharmacophorePDB(features: Feature[]): string {
  let pdb = 'HETATM    1  S   PHA A   1      0.000   0.000   0.000  1.00  0.00           S\n'
  
  features.forEach((feat, idx) => {
    const x = feat.position?.x || 0
    const y = feat.position?.y || 0
    const z = feat.position?.z || 0
    const atomName = feat.family.substring(0, 2).toUpperCase()
    
    pdb += `HETATM  ${idx + 2}  ${atomName.padEnd(2)}  PHA A   1    ${x.toFixed(3).padStart(8)} ${y.toFixed(3).padStart(8)} ${z.toFixed(3).padStart(8)}  1.00  0.00           S\n`
  })
  
  pdb += 'END\n'
  return pdb
}

// Generate simple PDB for molecule (placeholder)
function generateMoleculePDB(_smiles: string): string {
  // This would normally use RDKit to generate proper 3D coords
  // For now, return a simple placeholder
  return `
HETATM    1  N   LIG A   1     -2.000   1.000   0.000  1.00  0.00           N
HETATM    2  C   LIG A   1     -1.000   0.000   0.000  1.00  0.00           C
HETATM    3  C   LIG A   1      0.000   1.000   0.000  1.00  0.00           C
HETATM    4  O   LIG A   1      1.000   0.000   0.000  1.00  0.00           O
HETATM    5  C   LIG A   1     -1.000   2.000   0.000  1.00  0.00           C
HETATM    6  C   LIG A   1      0.000  -1.000   0.000  1.00  0.00           C
CONECT    1    2    5
CONECT    2    1    3    6
CONECT    3    2    4
CONECT    4    3
CONECT    5    1
CONECT    6    2
END
`
}

// Get feature summary counts
function getFeatureSummary(features: Feature[]): Record<string, number> {
  const summary: Record<string, number> = {}
  features.forEach(feat => {
    const family = feat.family || feat.type
    summary[family] = (summary[family] || 0) + 1
  })
  return summary
}

// Feature info for display
export const FEATURE_INFO = [
  { 
    name: 'Donor', 
    color: '#4169E1', 
    icon: '💧',
    description: 'Hydrogen bond donor - contains N-H or O-H groups'
  },
  { 
    name: 'Acceptor', 
    color: '#DC143C', 
    icon: '🧲',
    description: 'Hydrogen bond acceptor - contains N or O with lone pairs'
  },
  { 
    name: 'Hydrophobic', 
    color: '#FFD700', 
    icon: '💧',
    description: 'Hydrophobic region - alkyl or aryl groups'
  },
  { 
    name: 'Aromatic', 
    color: '#9932CC', 
    icon: '⬡',
    description: 'Aromatic ring center - benzene or heterocyclic aromatic'
  },
  { 
    name: 'PosIonizable', 
    color: '#32CD32', 
    icon: '➕',
    description: 'Positive ionizable - amine groups that can be protonated'
  },
  { 
    name: 'NegIonizable', 
    color: '#FF8C00', 
    icon: '➖',
    description: 'Negative ionizable - carboxylic acid groups that can deprotonate'
  },
]
