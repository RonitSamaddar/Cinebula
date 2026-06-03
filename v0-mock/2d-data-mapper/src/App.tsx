import { useState, useRef, useCallback, useEffect, useMemo, type WheelEvent, type MouseEvent } from 'react'
import './App.css'

interface Point {
  name: string
  x: number
  y: number
}

interface Cluster {
  cx: number
  cy: number
  points: Point[]
  representative: Point
}

const SAMPLE_POINTS: Point[] = [
  { name: 'Home', x: 100, y: 200 },
  { name: 'Office', x: 400, y: 150 },
  { name: 'Cafe', x: 250, y: 350 },
  { name: 'Park', x: 600, y: 400 },
  { name: 'Library', x: 350, y: 500 },
  { name: 'Gym', x: 150, y: 450 },
  { name: 'School', x: 500, y: 250 },
  { name: 'Hospital', x: 700, y: 100 },
  { name: 'Mall', x: 550, y: 550 },
  { name: 'Station', x: 300, y: 100 },
]

const DOT_RADIUS = 5

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function getNearby(points: Point[], target: Point, count = 5) {
  return [...points]
    .filter((p) => p !== target)
    .sort((a, b) => dist(a, target) - dist(b, target))
    .slice(0, count)
}

/** Grid-based spatial clustering in world space */
function clusterPoints(points: Point[], cellSize: number): Cluster[] {
  const grid = new Map<string, Point[]>()
  for (const p of points) {
    const gx = Math.floor(p.x / cellSize)
    const gy = Math.floor(p.y / cellSize)
    const key = `${gx},${gy}`
    const arr = grid.get(key)
    if (arr) arr.push(p)
    else grid.set(key, [p])
  }
  const clusters: Cluster[] = []
  for (const pts of grid.values()) {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
    clusters.push({ cx, cy, points: pts, representative: pts[0] })
  }
  return clusters
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [points, setPoints] = useState<Point[]>(SAMPLE_POINTS)
  const [selected, setSelected] = useState<Point | null>(null)
  const [hovered, setHovered] = useState<Point | null>(null)
  const [inputText, setInputText] = useState('')
  const [showInput, setShowInput] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [offset, setOffset] = useState({ x: 50, y: 50 })
  const [scale, setScale] = useState(1)
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const offsetStart = useRef({ x: 0, y: 0 })

  const toScreen = useCallback(
    (p: { x: number; y: number }) => ({
      x: p.x * scale + offset.x,
      y: p.y * scale + offset.y,
    }),
    [scale, offset],
  )

  const toWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - offset.x) / scale,
      y: (sy - offset.y) / scale,
    }),
    [scale, offset],
  )

  // Decide cluster cell size based on zoom — bigger cell when zoomed out
  const clusterCellSize = useMemo(() => {
    // At scale=1, use 40px world-units per cell; shrink as we zoom in
    return Math.max(5, 40 / scale)
  }, [scale])

  const shouldCluster = points.length > 200
  const clusters = useMemo(
    () => (shouldCluster ? clusterPoints(points, clusterCellSize) : null),
    [points, clusterCellSize, shouldCluster],
  )

  // ── draw ─────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr
      canvas.height = cssH * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const w = cssW
    const h = cssH

    // background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, '#0d1117')
    bg.addColorStop(1, '#161b22')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // grid — subtle dots instead of lines
    const gridStep = 50 * scale
    if (gridStep > 8) {
      const startX = ((offset.x % gridStep) + gridStep) % gridStep
      const startY = ((offset.y % gridStep) + gridStep) % gridStep
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      for (let x = startX; x < w; x += gridStep) {
        for (let y = startY; y < h; y += gridStep) {
          ctx.beginPath()
          ctx.arc(x, y, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // axes
    const origin = toScreen({ x: 0, y: 0 })
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(origin.x, 0); ctx.lineTo(origin.x, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, origin.y); ctx.lineTo(w, origin.y); ctx.stroke()

    // connection lines from selected to nearby
    if (selected) {
      const nearby = getNearby(points, selected)
      const sp = toScreen(selected)
      nearby.forEach((n, i) => {
        const np = toScreen(n)
        ctx.strokeStyle = `rgba(56,189,248,${0.3 - i * 0.04})`
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(np.x, np.y); ctx.stroke()
      })
      ctx.setLineDash([])
    }

    // ── render clusters or individual points ───
    if (clusters) {
      for (const cl of clusters) {
        const sp = toScreen({ x: cl.cx, y: cl.cy })
        if (sp.x < -30 || sp.x > w + 30 || sp.y < -30 || sp.y > h + 30) continue
        const n = cl.points.length
        if (n === 1) {
          drawPoint(ctx, cl.points[0], sp)
        } else {
          // cluster bubble
          const r = Math.min(30, 8 + Math.log2(n) * 4)
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(56,189,248,0.15)'
          ctx.fill()
          ctx.strokeStyle = 'rgba(56,189,248,0.4)'
          ctx.lineWidth = 1
          ctx.stroke()
          // count
          ctx.fillStyle = '#7dd3fc'
          ctx.font = `bold ${Math.max(10, r * 0.7)}px Inter, system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(n > 999 ? `${(n / 1000).toFixed(1)}k` : String(n), sp.x, sp.y)
          ctx.textAlign = 'start'
          ctx.textBaseline = 'alphabetic'
        }
      }
    } else {
      for (const p of points) {
        const sp = toScreen(p)
        if (sp.x < -50 || sp.x > w + 50 || sp.y < -30 || sp.y > h + 30) continue
        drawPoint(ctx, p, sp)
      }
    }

    function drawPoint(ctx: CanvasRenderingContext2D, p: Point, sp: { x: number; y: number }) {
      const isSel = p === selected
      const isHov = p === hovered

      // glow
      if (isSel || isHov) {
        const glow = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 18)
        glow.addColorStop(0, isSel ? 'rgba(56,189,248,0.35)' : 'rgba(251,191,36,0.25)')
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.fillRect(sp.x - 18, sp.y - 18, 36, 36)
      }

      ctx.beginPath()
      ctx.arc(sp.x, sp.y, isSel ? DOT_RADIUS + 2 : isHov ? DOT_RADIUS + 1 : DOT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = isSel ? '#38bdf8' : isHov ? '#fbbf24' : 'rgba(148,163,184,0.7)'
      ctx.fill()

      if (isSel) {
        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // label — only show when zoomed enough or selected/hovered
      const showLabel = scale > 0.4 || isSel || isHov || points.length < 50
      if (showLabel) {
        ctx.fillStyle = isSel ? '#38bdf8' : isHov ? '#fbbf24' : 'rgba(148,163,184,0.55)'
        const fontSize = Math.max(10, Math.min(13, 12 * scale))
        ctx.font = `${isSel ? '600 ' : ''}${fontSize}px Inter, system-ui, sans-serif`
        ctx.fillText(p.name, sp.x + 9, sp.y - 8)
      }
    }
  }, [points, clusters, selected, hovered, scale, offset, toScreen])

  // ── resize & redraw ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => { draw() }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement!)
    draw()
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => { draw() }, [draw])

  // ── hit test ─────────────────────────────────────────
  const hitTest = useCallback(
    (sx: number, sy: number): Point | null => {
      const world = toWorld(sx, sy)
      const threshold = (DOT_RADIUS + 6) / scale
      let closest: Point | null = null
      let bestDist = Infinity

      // If clustered, search cluster representatives + their children
      const searchSet = clusters
        ? clusters.flatMap((c) => c.points)
        : points

      for (const p of searchSet) {
        const d = Math.hypot(p.x - world.x, p.y - world.y)
        if (d < threshold && d < bestDist) { bestDist = d; closest = p }
      }
      return closest
    },
    [points, clusters, scale, toWorld],
  )

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 0.89
    const newScale = Math.max(0.01, Math.min(50, scale * factor))
    setOffset({
      x: mx - (mx - offset.x) * (newScale / scale),
      y: my - (my - offset.y) * (newScale / scale),
    })
    setScale(newScale)
  }

  const onMouseDown = (e: MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
    if (hit) { setSelected(hit); return }
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    offsetStart.current = { ...offset }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (dragging.current) {
      setOffset({
        x: offsetStart.current.x + (e.clientX - dragStart.current.x),
        y: offsetStart.current.y + (e.clientY - dragStart.current.y),
      })
      return
    }
    const rect = canvasRef.current!.getBoundingClientRect()
    setHovered(hitTest(e.clientX - rect.left, e.clientY - rect.top))
  }

  const onMouseUp = () => { dragging.current = false }

  // ── data import ──────────────────────────────────────
  const importPoints = () => {
    const lines = inputText.trim().split('\n').filter(Boolean)
    const parsed: Point[] = []
    for (const line of lines) {
      const parts = line.split(',').map((s) => s.trim())
      if (parts.length >= 3) {
        const name = parts[0]
        const x = parseFloat(parts[1])
        const y = parseFloat(parts[2])
        if (!isNaN(x) && !isNaN(y)) parsed.push({ name, x, y })
      }
    }
    if (parsed.length) {
      setPoints(parsed)
      setSelected(null)
      setShowInput(false)
      fitToPoints(parsed)
    }
  }

  const fitToPoints = (pts: Point[]) => {
    const canvas = canvasRef.current!
    const minX = Math.min(...pts.map((p) => p.x))
    const maxX = Math.max(...pts.map((p) => p.x))
    const minY = Math.min(...pts.map((p) => p.y))
    const maxY = Math.max(...pts.map((p) => p.y))
    const pad = 80
    const sx = (canvas.clientWidth - pad * 2) / (maxX - minX || 1)
    const sy = (canvas.clientHeight - pad * 2) / (maxY - minY || 1)
    const s = Math.min(sx, sy, 10)
    setScale(s)
    setOffset({ x: pad - minX * s, y: pad - minY * s })
  }

  const resetView = () => fitToPoints(points)

  const focusPoint = (p: Point) => {
    setSelected(p)
    const canvas = canvasRef.current!
    const newScale = Math.max(scale, 1.5)
    setScale(newScale)
    setOffset({
      x: canvas.clientWidth / 2 - p.x * newScale,
      y: canvas.clientHeight / 2 - p.y * newScale,
    })
  }

  // search
  const filteredSearch = searchQuery.trim()
    ? points.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20)
    : []

  const nearby = selected ? getNearby(points, selected) : []

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="title">⬡ Point Mapper</h1>
          <span className="badge">{points.length.toLocaleString()} pts</span>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="Search points…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {filteredSearch.length > 0 && (
          <ul className="search-results">
            {filteredSearch.map((p) => (
              <li key={`${p.name}-${p.x}-${p.y}`} onClick={() => focusPoint(p)}>
                <span>{p.name}</span>
                <span className="search-coords">({p.x}, {p.y})</span>
              </li>
            ))}
          </ul>
        )}

        <div className="controls">
          <button onClick={() => setShowInput(!showInput)}>
            {showInput ? '✕ Cancel' : '＋ Import'}
          </button>
          <button onClick={resetView}>⟲ Fit All</button>
        </div>

        {showInput && (
          <div className="import-section">
            <p className="hint">Paste as <code>name, x, y</code> per line:</p>
            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Home, 100, 200\nOffice, 400, 150\nCafe, 250, 350`}
            />
            <button className="primary" onClick={importPoints}>Load Points</button>
          </div>
        )}

        <div className="stats">
          <div className="stat"><span className="stat-label">Zoom</span><span className="stat-value">{scale.toFixed(2)}×</span></div>
          <div className="stat"><span className="stat-label">Points</span><span className="stat-value">{points.length.toLocaleString()}</span></div>
          {clusters && <div className="stat"><span className="stat-label">Clusters</span><span className="stat-value">{clusters.length.toLocaleString()}</span></div>}
        </div>

        {selected && (
          <div className="detail">
            <div className="detail-header">
              <h2>{selected.name}</h2>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <p className="coords">x: {selected.x}  ·  y: {selected.y}</p>
            <h3>Nearest neighbours</h3>
            <ul>
              {nearby.map((n) => (
                <li key={`${n.name}-${n.x}-${n.y}`} onClick={() => focusPoint(n)} className="nearby-item">
                  <span className="nearby-name">{n.name}</span>
                  <span className="nearby-dist">{dist(n, selected).toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!selected && !showInput && <p className="hint center">Click a point to inspect it</p>}

        <div className="legend">
          <p>Scroll to zoom · Drag to pan · Click to select</p>
        </div>
      </aside>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
    </div>
  )
}

export default App
