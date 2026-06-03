import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import './App.css'

// ── Types ──────────────────────────────────────────────────────────────
interface DataPoint {
    id: string
    label: string
    values: Record<string, number>
}

type ViewMode = 'scatter' | 'parallel' | 'radar'

// ── Sample dataset ─────────────────────────────────────────────────────
const SAMPLE_DATA: DataPoint[] = [
    { id: '1', label: 'Inception', values: { rating: 8.8, popularity: 92, budget: 160, revenue: 836, runtime: 148, awards: 4 } },
    { id: '2', label: 'Interstellar', values: { rating: 8.6, popularity: 89, budget: 165, revenue: 701, runtime: 169, awards: 5 } },
    { id: '3', label: 'The Dark Knight', values: { rating: 9.0, popularity: 95, budget: 185, revenue: 1005, runtime: 152, awards: 2 } },
    { id: '4', label: 'Pulp Fiction', values: { rating: 8.9, popularity: 88, budget: 8, revenue: 214, runtime: 154, awards: 7 } },
    { id: '5', label: 'The Matrix', values: { rating: 8.7, popularity: 90, budget: 63, revenue: 466, runtime: 136, awards: 4 } },
    { id: '6', label: 'Fight Club', values: { rating: 8.8, popularity: 86, budget: 63, revenue: 101, runtime: 139, awards: 0 } },
    { id: '7', label: 'Forrest Gump', values: { rating: 8.8, popularity: 91, budget: 55, revenue: 678, runtime: 142, awards: 6 } },
    { id: '8', label: 'The Shawshank Redemption', values: { rating: 9.3, popularity: 97, budget: 25, revenue: 58, runtime: 142, awards: 0 } },
    { id: '9', label: 'Gladiator', values: { rating: 8.5, popularity: 84, budget: 103, revenue: 460, runtime: 155, awards: 5 } },
    { id: '10', label: 'Titanic', values: { rating: 7.9, popularity: 93, budget: 200, revenue: 2187, runtime: 194, awards: 11 } },
    { id: '11', label: 'Avatar', values: { rating: 7.8, popularity: 94, budget: 237, revenue: 2923, runtime: 162, awards: 3 } },
    { id: '12', label: 'The Godfather', values: { rating: 9.2, popularity: 96, budget: 6, revenue: 287, runtime: 175, awards: 3 } },
    { id: '13', label: 'Parasite', values: { rating: 8.5, popularity: 85, budget: 11, revenue: 266, runtime: 132, awards: 6 } },
    { id: '14', label: 'Joker', values: { rating: 8.4, popularity: 87, budget: 55, revenue: 1074, runtime: 122, awards: 2 } },
    { id: '15', label: 'Whiplash', values: { rating: 8.5, popularity: 80, budget: 3, revenue: 49, runtime: 107, awards: 3 } },
]

// ── Helpers ─────────────────────────────────────────────────────────────
function parseCSV(text: string): DataPoint[] {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim())

    // Detect: if data rows have more columns than headers, treat extra columns as vector dimensions
    const firstDataCols = lines[1].split(',').length
    const headerCount = headers.length

    if (firstDataCols > headerCount && headerCount >= 2) {
        // Case: "Title,Vector Embedding (32D)" but data has 33 comma-separated values
        // First col = label, remaining cols = vector dimensions
        const vecName = headers[1] || 'dim'
        return lines.slice(1).map((line, i) => {
            const cells = line.split(',').map(c => c.trim())
            const label = cells[0] || `Item ${i}`
            const values: Record<string, number> = {}
            for (let j = 1; j < cells.length; j++) {
                const v = parseFloat(cells[j])
                if (!isNaN(v)) values[`${vecName}_${j - 1}`] = v
            }
            return { id: String(i), label, values }
        }).filter(d => Object.keys(d.values).length > 0)
    }

    // Standard CSV: each header maps to a column
    const numCols = headers.slice(1)
    return lines.slice(1).map((line, i) => {
        const cells = line.split(',').map(c => c.trim())
        const values: Record<string, number> = {}
        numCols.forEach((col, ci) => {
            const v = parseFloat(cells[ci + 1])
            if (!isNaN(v)) values[col] = v
        })
        return { id: String(i), label: cells[0] || `Item ${i}`, values }
    }).filter(d => Object.keys(d.values).length > 0)
}

function normalize(points: DataPoint[], dims: string[]): { norms: Map<string, Record<string, number>>, mins: Record<string, number>, maxs: Record<string, number> } {
    const mins: Record<string, number> = {}
    const maxs: Record<string, number> = {}
    for (const d of dims) {
        const vals = points.map(p => p.values[d] ?? 0)
        mins[d] = Math.min(...vals)
        maxs[d] = Math.max(...vals)
    }
    const norms = new Map<string, Record<string, number>>()
    for (const p of points) {
        const n: Record<string, number> = {}
        for (const d of dims) {
            const range = maxs[d] - mins[d]
            n[d] = range === 0 ? 0.5 : (p.values[d] - mins[d]) / range
        }
        norms.set(p.id, n)
    }
    return { norms, mins, maxs }
}

function euclideanDist(a: Record<string, number>, b: Record<string, number>, dims: string[]): number {
    let sum = 0
    for (const d of dims) sum += ((a[d] ?? 0) - (b[d] ?? 0)) ** 2
    return Math.sqrt(sum)
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>, dims: string[]): number {
    // Standard cosine similarity on the vectors
    let dot = 0, magA = 0, magB = 0
    for (const d of dims) {
        const va = a[d] ?? 0
        const vb = b[d] ?? 0
        dot += va * vb
        magA += va ** 2
        magB += vb ** 2
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB)
    return denom === 0 ? 0 : dot / denom
}

// ── Color palette ──────────────────────────────────────────────────────
const COLORS = [
    '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16',
]

function getColor(i: number, alpha = 1) {
    const c = COLORS[i % COLORS.length]
    if (alpha === 1) return c
    const r = parseInt(c.slice(1, 3), 16)
    const g = parseInt(c.slice(3, 5), 16)
    const b = parseInt(c.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
}

// ── App ────────────────────────────────────────────────────────────────
function App() {
    const [data, setData] = useState<DataPoint[]>([])
    const [dimensions, setDimensions] = useState<string[]>([])
    const [selectedDims, setSelectedDims] = useState<string[]>([])
    const [viewMode, setViewMode] = useState<ViewMode>('scatter')
    const [xAxis, setXAxis] = useState('')
    const [yAxis, setYAxis] = useState('')
    const [hovered, setHovered] = useState<DataPoint | null>(null)
    const [selected, setSelected] = useState<DataPoint[]>([])
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 })

    // Pan/zoom for scatter
    const [offset, setOffset] = useState({ x: 60, y: 60 })
    const [scale, setScale] = useState(1)
    const dragging = useRef(false)
    const dragStart = useRef({ x: 0, y: 0 })
    const offsetStart = useRef({ x: 0, y: 0 })

    // Load data
    const loadData = useCallback((points: DataPoint[]) => {
        setData(points)
        const dims = points.length > 0 ? Object.keys(points[0].values) : []
        setDimensions(dims)
        setSelectedDims(dims)
        if (dims.length >= 2) {
            setXAxis(dims[0])
            setYAxis(dims[1])
        }
        setSelected([])
        setHovered(null)
        console.log(`📊 Loaded ${points.length} points with ${dims.length} dimensions:`, dims)
        if (points.length > 0) console.log('Sample point:', points[0].label, points[0].values)
    }, [])

    const loadSample = useCallback(() => loadData(SAMPLE_DATA), [loadData])

    // Auto-load default CSV on mount
    useEffect(() => {
        fetch('/sample.csv')
            .then(r => r.text())
            .then(text => {
                const points = parseCSV(text)
                if (points.length > 0) loadData(points)
            })
            .catch(() => { /* fallback: user can load manually */ })
    }, [loadData])

    const handleFile = useCallback((file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            if (file.name.endsWith('.json')) {
                try {
                    const json = JSON.parse(text)
                    const arr = Array.isArray(json) ? json : [json]
                    const points: DataPoint[] = arr.map((item: Record<string, unknown>, i: number) => {
                        const label = (item.name || item.label || item.title || `Item ${i}`) as string
                        const values: Record<string, number> = {}
                        for (const [k, v] of Object.entries(item)) {
                            if (typeof v === 'number') {
                                values[k] = v
                            } else if (Array.isArray(v) && v.length > 0 && v.every((x: unknown) => typeof x === 'number')) {
                                // Flatten array fields like "embedding": [0.1, 0.2, ...] into dim_0, dim_1, ...
                                v.forEach((val: number, idx: number) => {
                                    values[`${k}_${idx}`] = val
                                })
                            }
                        }
                        return { id: String(i), label, values }
                    }).filter((d: DataPoint) => Object.keys(d.values).length > 0)
                    loadData(points)
                } catch { /* ignore parse errors */ }
            } else {
                loadData(parseCSV(text))
            }
        }
        reader.readAsText(file)
    }, [loadData])

    // Normalized data
    const { norms, mins, maxs } = useMemo(
        () => normalize(data, selectedDims),
        [data, selectedDims]
    )

    // Resize
    useEffect(() => {
        const obs = new ResizeObserver(entries => {
            for (const e of entries) {
                setCanvasSize({ w: e.contentRect.width, h: e.contentRect.height })
            }
        })
        if (containerRef.current) obs.observe(containerRef.current)
        return () => obs.disconnect()
    }, [])

    // Toggle dimension
    const toggleDim = (d: string) => {
        setSelectedDims(prev =>
            prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
        )
    }

    // Toggle selection
    const toggleSelect = (p: DataPoint) => {
        setSelected(prev => {
            if (prev.find(s => s.id === p.id)) return prev.filter(s => s.id !== p.id)
            if (prev.length >= 2) return [prev[1], p]
            return [...prev, p]
        })
    }

    // ── Scatter drawing ─────────────────────────────────────────────────
    const drawScatter = useCallback((ctx: CanvasRenderingContext2D) => {
        const { w, h } = canvasSize
        const pad = 60
        const plotW = (w - pad * 2) * scale
        const plotH = (h - pad * 2) * scale

        // Axes
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(offset.x, offset.y)
        ctx.lineTo(offset.x, offset.y + plotH)
        ctx.lineTo(offset.x + plotW, offset.y + plotH)
        ctx.stroke()

        // Labels
        ctx.fillStyle = '#666'
        ctx.font = '11px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(xAxis, offset.x + plotW / 2, offset.y + plotH + 35)
        ctx.save()
        ctx.translate(offset.x - 35, offset.y + plotH / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillText(yAxis, 0, 0)
        ctx.restore()

        // Ticks
        for (let i = 0; i <= 5; i++) {
            const frac = i / 5
            const x = offset.x + frac * plotW
            const y = offset.y + plotH - frac * plotH
            const xVal = mins[xAxis] + frac * (maxs[xAxis] - mins[xAxis])
            const yVal = mins[yAxis] + frac * (maxs[yAxis] - mins[yAxis])

            ctx.fillStyle = '#444'
            ctx.font = '10px -apple-system, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(xVal.toFixed(0), x, offset.y + plotH + 14)
            ctx.textAlign = 'right'
            ctx.fillText(yVal.toFixed(0), offset.x - 8, y + 4)

            ctx.strokeStyle = '#1a1a24'
            ctx.beginPath()
            ctx.moveTo(offset.x, y)
            ctx.lineTo(offset.x + plotW, y)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(x, offset.y)
            ctx.lineTo(x, offset.y + plotH)
            ctx.stroke()
        }

        // Points
        for (const p of data) {
            const n = norms.get(p.id)
            if (!n) continue
            const px = offset.x + (n[xAxis] ?? 0) * plotW
            const py = offset.y + plotH - (n[yAxis] ?? 0) * plotH

            const isSelected = selected.some(s => s.id === p.id)
            const isHovered = hovered?.id === p.id

            ctx.beginPath()
            ctx.arc(px, py, isSelected ? 7 : isHovered ? 6 : 4, 0, Math.PI * 2)
            ctx.fillStyle = isSelected ? '#8b5cf6' : isHovered ? '#c4b5fd' : 'rgba(139,92,246,0.5)'
            ctx.fill()

            if (isSelected || isHovered) {
                ctx.strokeStyle = '#8b5cf6'
                ctx.lineWidth = 2
                ctx.stroke()
                ctx.fillStyle = '#e0e0e0'
                ctx.font = '11px -apple-system, sans-serif'
                ctx.textAlign = 'left'
                ctx.fillText(p.label, px + 10, py - 6)
            }
        }

        // Connection line between selected
        if (selected.length === 2) {
            const n0 = norms.get(selected[0].id)
            const n1 = norms.get(selected[1].id)
            if (n0 && n1) {
                const x0 = offset.x + (n0[xAxis] ?? 0) * plotW
                const y0 = offset.y + plotH - (n0[yAxis] ?? 0) * plotH
                const x1 = offset.x + (n1[xAxis] ?? 0) * plotW
                const y1 = offset.y + plotH - (n1[yAxis] ?? 0) * plotH
                ctx.setLineDash([4, 4])
                ctx.strokeStyle = 'rgba(139,92,246,0.4)'
                ctx.lineWidth = 1.5
                ctx.beginPath()
                ctx.moveTo(x0, y0)
                ctx.lineTo(x1, y1)
                ctx.stroke()
                ctx.setLineDash([])
            }
        }
    }, [canvasSize, data, norms, mins, maxs, xAxis, yAxis, offset, scale, selected, hovered])

    // ── Parallel coordinates drawing ────────────────────────────────────
    const drawParallel = useCallback((ctx: CanvasRenderingContext2D) => {
        const { w, h } = canvasSize
        const pad = { top: 40, bottom: 40, left: 60, right: 40 }
        const plotH = h - pad.top - pad.bottom
        const dims = selectedDims
        if (dims.length < 2) return

        const spacing = (w - pad.left - pad.right) / (dims.length - 1)

        // Axis lines
        for (let i = 0; i < dims.length; i++) {
            const x = pad.left + i * spacing
            ctx.strokeStyle = '#333'
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(x, pad.top)
            ctx.lineTo(x, pad.top + plotH)
            ctx.stroke()

            // Label
            ctx.fillStyle = '#888'
            ctx.font = '11px -apple-system, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText(dims[i], x, pad.top - 12)

            // Min/Max
            ctx.fillStyle = '#555'
            ctx.font = '9px -apple-system, sans-serif'
            ctx.fillText(maxs[dims[i]]?.toFixed(1) ?? '', x, pad.top - 2)
            ctx.fillText(mins[dims[i]]?.toFixed(1) ?? '', x, pad.top + plotH + 14)
        }

        // Lines for each data point
        for (const p of data) {
            const n = norms.get(p.id)
            if (!n) continue
            const isSelected = selected.some(s => s.id === p.id)
            const isHovered = hovered?.id === p.id

            ctx.strokeStyle = isSelected ? '#8b5cf6' : isHovered ? '#c4b5fd' : 'rgba(139,92,246,0.12)'
            ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1
            ctx.beginPath()
            for (let i = 0; i < dims.length; i++) {
                const x = pad.left + i * spacing
                const y = pad.top + plotH - (n[dims[i]] ?? 0) * plotH
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            ctx.stroke()
        }
    }, [canvasSize, data, norms, mins, maxs, selectedDims, selected, hovered])

    // ── Radar drawing ───────────────────────────────────────────────────
    const drawRadar = useCallback((ctx: CanvasRenderingContext2D) => {
        const { w, h } = canvasSize
        const cx = w / 2
        const cy = h / 2
        const radius = Math.min(w, h) * 0.35
        const dims = selectedDims
        if (dims.length < 3) return

        const angleStep = (Math.PI * 2) / dims.length

        // Grid rings
        for (let r = 1; r <= 5; r++) {
            const rr = (r / 5) * radius
            ctx.strokeStyle = '#1e1e2e'
            ctx.lineWidth = 1
            ctx.beginPath()
            for (let i = 0; i <= dims.length; i++) {
                const a = i * angleStep - Math.PI / 2
                const x = cx + Math.cos(a) * rr
                const y = cy + Math.sin(a) * rr
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            ctx.stroke()
        }

        // Axis lines & labels
        for (let i = 0; i < dims.length; i++) {
            const a = i * angleStep - Math.PI / 2
            const x = cx + Math.cos(a) * radius
            const y = cy + Math.sin(a) * radius
            ctx.strokeStyle = '#2a2a3a'
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(x, y)
            ctx.stroke()

            const lx = cx + Math.cos(a) * (radius + 18)
            const ly = cy + Math.sin(a) * (radius + 18)
            ctx.fillStyle = '#888'
            ctx.font = '11px -apple-system, sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(dims[i], lx, ly)
        }

        // Data polygons (only selected or first 2 if none selected)
        const toPlot = selected.length > 0 ? selected : data.slice(0, 2)
        for (let si = 0; si < toPlot.length; si++) {
            const p = toPlot[si]
            const n = norms.get(p.id)
            if (!n) continue

            ctx.strokeStyle = getColor(si)
            ctx.fillStyle = getColor(si, 0.1)
            ctx.lineWidth = 2
            ctx.beginPath()
            for (let i = 0; i <= dims.length; i++) {
                const di = i % dims.length
                const a = di * angleStep - Math.PI / 2
                const v = n[dims[di]] ?? 0
                const x = cx + Math.cos(a) * v * radius
                const y = cy + Math.sin(a) * v * radius
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
            }
            ctx.fill()
            ctx.stroke()

            // Dots
            for (let i = 0; i < dims.length; i++) {
                const a = i * angleStep - Math.PI / 2
                const v = n[dims[i]] ?? 0
                const x = cx + Math.cos(a) * v * radius
                const y = cy + Math.sin(a) * v * radius
                ctx.beginPath()
                ctx.arc(x, y, 3, 0, Math.PI * 2)
                ctx.fillStyle = getColor(si)
                ctx.fill()
            }
        }

        // Legend
        for (let si = 0; si < toPlot.length; si++) {
            ctx.fillStyle = getColor(si)
            ctx.beginPath()
            ctx.arc(20, 20 + si * 22, 5, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#ccc'
            ctx.font = '12px -apple-system, sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'middle'
            ctx.fillText(toPlot[si].label, 32, 20 + si * 22)
        }
    }, [canvasSize, data, norms, selectedDims, selected])

    // ── Main draw ───────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || data.length === 0) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        canvas.width = canvasSize.w * dpr
        canvas.height = canvasSize.h * dpr
        canvas.style.width = `${canvasSize.w}px`
        canvas.style.height = `${canvasSize.h}px`
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

        ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)

        if (viewMode === 'scatter') drawScatter(ctx)
        else if (viewMode === 'parallel') drawParallel(ctx)
        else if (viewMode === 'radar') drawRadar(ctx)
    }, [canvasSize, data, viewMode, drawScatter, drawParallel, drawRadar])

    // ── Mouse interactions ──────────────────────────────────────────────
    const hitTest = useCallback((mx: number, my: number): DataPoint | null => {
        if (viewMode !== 'scatter' || !xAxis || !yAxis) return null
        const pad = 60
        const plotW = (canvasSize.w - pad * 2) * scale
        const plotH = (canvasSize.h - pad * 2) * scale

        for (const p of data) {
            const n = norms.get(p.id)
            if (!n) continue
            const px = offset.x + (n[xAxis] ?? 0) * plotW
            const py = offset.y + plotH - (n[yAxis] ?? 0) * plotH
            if (Math.hypot(mx - px, my - py) < 10) return p
        }
        return null
    }, [data, norms, xAxis, yAxis, canvasSize, offset, scale, viewMode])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        setMousePos({ x: e.clientX, y: e.clientY })

        if (dragging.current) {
            setOffset({
                x: offsetStart.current.x + (e.clientX - dragStart.current.x),
                y: offsetStart.current.y + (e.clientY - dragStart.current.y),
            })
            return
        }

        setHovered(hitTest(mx, my))
    }, [hitTest])

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (viewMode !== 'scatter') return
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const mx = e.clientX - rect.left
        const my = e.clientY - rect.top
        const hit = hitTest(mx, my)
        if (hit) {
            toggleSelect(hit)
            return
        }
        dragging.current = true
        dragStart.current = { x: e.clientX, y: e.clientY }
        offsetStart.current = { ...offset }
    }, [hitTest, offset, viewMode])

    const handleMouseUp = useCallback(() => { dragging.current = false }, [])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (viewMode !== 'scatter') return
        e.preventDefault()
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        setScale(s => Math.max(0.2, Math.min(5, s * delta)))
    }, [viewMode])

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (viewMode === 'parallel') {
            const rect = canvasRef.current?.getBoundingClientRect()
            if (!rect) return
            const my = e.clientY - rect.top
            const pad = { top: 40, bottom: 40 }
            const plotH = canvasSize.h - pad.top - pad.bottom

            // Find closest line
            let closest: DataPoint | null = null
            let closestDist = Infinity
            for (const p of data) {
                const n = norms.get(p.id)
                if (!n) continue
                // Check y on first axis
                const y = pad.top + plotH - (n[selectedDims[0]] ?? 0) * plotH
                const d = Math.abs(my - y)
                if (d < closestDist && d < 15) {
                    closestDist = d
                    closest = p
                }
            }
            if (closest) toggleSelect(closest)
        }
    }, [viewMode, canvasSize, data, norms, selectedDims])

    // ── Comparison info ─────────────────────────────────────────────────
    const comparison = useMemo(() => {
        if (selected.length !== 2) return null
        const [a, b] = selected
        const na = norms.get(a.id)
        const nb = norms.get(b.id)
        if (!na || !nb) return null

        // Build raw vectors for the selected dims
        const vecA = selectedDims.map(d => a.values[d] ?? 0)
        const vecB = selectedDims.map(d => b.values[d] ?? 0)

        // Compute cosine step by step
        let dot = 0, magA = 0, magB = 0
        for (let i = 0; i < selectedDims.length; i++) {
            dot += vecA[i] * vecB[i]
            magA += vecA[i] ** 2
            magB += vecB[i] ** 2
        }
        const denom = Math.sqrt(magA) * Math.sqrt(magB)
        const cosine = denom === 0 ? 0 : dot / denom

        console.group(`🔍 Cosine Similarity: ${a.label} vs ${b.label}`)
        console.log('Dimensions:', selectedDims)
        console.log(`Vector A (${a.label}):`, vecA)
        console.log(`Vector B (${b.label}):`, vecB)
        console.log('Dot product:', dot)
        console.log('|A|:', Math.sqrt(magA))
        console.log('|B|:', Math.sqrt(magB))
        console.log('|A| * |B|:', denom)
        console.log('Cosine similarity (dot / |A|*|B|):', cosine)
        console.log('Cosine similarity %:', (cosine * 100).toFixed(4) + '%')
        console.log('Cosine distance (1 - sim):', 1 - cosine)
        console.groupEnd()

        return {
            euclidean: euclideanDist(na, nb, selectedDims),
            cosine,
            rawEuclidean: euclideanDist(a.values, b.values, selectedDims),
        }
    }, [selected, norms, selectedDims])

    // ── Drop handler ────────────────────────────────────────────────────
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    // ── Render ──────────────────────────────────────────────────────────
    if (data.length === 0) {
        return (
            <div className="app">
                <div className="header">
                    <h1>nD Data Comparator</h1>
                </div>
                <div className="import-area"
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <div className="drop-zone" onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = '.csv,.json'
                        input.onchange = () => input.files?.[0] && handleFile(input.files[0])
                        input.click()
                    }}>
                        <div className="icon">📊</div>
                        <p>Drop CSV or JSON file here</p>
                        <p style={{ fontSize: 11, color: '#555' }}>or click to browse</p>
                    </div>
                    <button className="sample-btn" onClick={loadSample}>
                        Load Sample Dataset (Movies)
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="app">
            {/* Header */}
            <div className="header">
                <h1>nD Data Comparator</h1>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {viewMode === 'scatter' && (
                        <div className="axis-selector">
                            <label>X:</label>
                            <select value={xAxis} onChange={e => setXAxis(e.target.value)}>
                                {dimensions.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <label>Y:</label>
                            <select value={yAxis} onChange={e => setYAxis(e.target.value)}>
                                {dimensions.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="view-tabs">
                        <button className={viewMode === 'scatter' ? 'active' : ''} onClick={() => setViewMode('scatter')}>Scatter</button>
                        <button className={viewMode === 'parallel' ? 'active' : ''} onClick={() => setViewMode('parallel')}>Parallel</button>
                        <button className={viewMode === 'radar' ? 'active' : ''} onClick={() => setViewMode('radar')}>Radar</button>
                    </div>
                    <div className="header-actions">
                        <button onClick={() => { setData([]); setSelected([]) }}>New Data</button>
                    </div>
                </div>
            </div>

            <div className="main">
                {/* Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-section">
                        <h3>Dimensions ({selectedDims.length}/{dimensions.length})</h3>
                        {/* <div className="dimension-list">
                            {dimensions.map(d => (
                                <span
                                    key={d}
                                    className={`dim-chip ${selectedDims.includes(d) ? 'selected' : ''}`}
                                    onClick={() => toggleDim(d)}
                                >
                                    {d}
                                </span>
                            ))}
                        </div> */}
                    </div>
                    <div className="sidebar-section">
                        <h3>Data Points ({data.length})</h3>
                    </div>
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Label</th>
                                    {selectedDims.map(d => <th key={d}>{d}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(p => (
                                    <tr
                                        key={p.id}
                                        className={selected.some(s => s.id === p.id) ? 'highlighted' : ''}
                                        onClick={() => toggleSelect(p)}
                                        onMouseEnter={() => setHovered(p)}
                                        onMouseLeave={() => setHovered(null)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{p.label}</td>
                                        {selectedDims.map(d => <td key={d}>{p.values[d]?.toFixed(1)}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Canvas */}
                <div className="canvas-area" ref={containerRef}>
                    <canvas
                        ref={canvasRef}
                        onMouseMove={handleMouseMove}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => { setHovered(null); dragging.current = false }}
                        onWheel={handleWheel}
                        onClick={handleClick}
                        style={{ cursor: viewMode === 'scatter' ? (hovered ? 'pointer' : 'grab') : 'default' }}
                    />

                    {/* Zoom controls */}
                    {viewMode === 'scatter' && (
                        <div className="controls-bar">
                            <button onClick={() => setScale(s => Math.min(5, s * 1.2))}>+</button>
                            <button onClick={() => setScale(s => Math.max(0.2, s * 0.8))}>−</button>
                            <button onClick={() => { setScale(1); setOffset({ x: 60, y: 60 }) }}>⌂</button>
                        </div>
                    )}

                    {/* Tooltip */}
                    {hovered && (
                        <div className="tooltip" style={{ left: mousePos.x + 16, top: mousePos.y - 10 }}>
                            <div className="tooltip-title">{hovered.label}</div>
                            {selectedDims.map(d => (
                                <div className="tooltip-row" key={d}>
                                    <span>{d}</span>
                                    <span>{hovered.values[d]?.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Comparison panel */}
                    {comparison && selected.length === 2 && (
                        <div className="comparison-panel">
                            <div className="comparison-item">
                                <h4>{selected[0].label}</h4>
                            </div>
                            <div className="comparison-vs">
                                <div className="distance">{(comparison.cosine * 100).toFixed(1)}%</div>
                                <div className="label">cosine sim</div>
                                <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
                                    dist: {comparison.euclidean.toFixed(3)}
                                </div>
                            </div>
                            <div className="comparison-item">
                                <h4>{selected[1].label}</h4>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default App
