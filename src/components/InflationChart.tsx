import * as d3 from 'd3'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { InflationPoint } from '../fred'

type Props = {
  data: InflationPoint[]
  ariaLabel: string
}

const FOCUS_HEIGHT = 360
const CONTEXT_HEIGHT = 76
const GAP = 14
const M = { top: 12, right: 20, bottom: 32, left: 54 }

export function InflationChart({ data, ariaLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const gradId = `areaGrad-${useId().replace(/:/g, '')}`
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(() => setWidth(wrap.clientWidth))
    ro.observe(wrap)
    setWidth(wrap.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    const svgEl = svgRef.current
    if (!wrap || !svgEl || data.length < 2 || width < 40) return

    const innerW = Math.max(280, width - M.left - M.right)
    const innerHFocus = FOCUS_HEIGHT - M.top - M.bottom
    const innerHCtx = CONTEXT_HEIGHT - 10
    const totalH = FOCUS_HEIGHT + GAP + CONTEXT_HEIGHT

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('width', width).attr('height', totalH).attr('role', 'img').attr('aria-label', ariaLabel)

    const root = svg.append('g').attr('transform', `translate(${M.left},${M.top})`)

    const x = d3.scaleTime().range([0, innerW])
    const x2 = d3.scaleTime().range([0, innerW])
    const y = d3.scaleLinear().range([innerHFocus, 0])
    const y2 = d3.scaleLinear().range([innerHCtx, 0])

    const extent = d3.extent(data, (d) => d.date) as [Date, Date]
    const yExtent = d3.extent(data, (d) => d.value) as [number, number]
    const yPad = Math.max(0.25, (yExtent[1] - yExtent[0]) * 0.06)
    y.domain([yExtent[0] - yPad, yExtent[1] + yPad])
    y2.domain(y.domain())

    x.domain(extent)
    x2.domain(extent)

    const line = d3
      .line<InflationPoint>()
      .x((d) => x(d.date))
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    const area = d3
      .area<InflationPoint>()
      .x((d) => x(d.date))
      .y0(innerHFocus)
      .y1((d) => y(d.value))
      .curve(d3.curveMonotoneX)

    const line2 = d3
      .line<InflationPoint>()
      .x((d) => x2(d.date))
      .y((d) => y2(d.value))
      .curve(d3.curveMonotoneX)

    const defs = svg.append('defs')
    const grad = defs
      .append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'var(--chart-line)').attr('stop-opacity', 0.35)
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'var(--chart-line)').attr('stop-opacity', 0.02)

    const gx = root.append('g').attr('transform', `translate(0,${innerHFocus})`)
    const gy = root.append('g')

    const gxFmt = d3.utcFormat('%Y')
    const xAxis = d3.axisBottom(x).ticks(Math.min(12, innerW / 90)).tickFormat(gxFmt as never)
    const yAxis = d3
      .axisLeft(y)
      .ticks(6)
      .tickFormat((d) => `${Number(d).toFixed(1)}%`)

    gx.call(xAxis)
    gy.call(yAxis)
    gx.selectAll('text').attr('fill', 'var(--muted)')
    gy.selectAll('text').attr('fill', 'var(--muted)')
    gx.selectAll('path,line').attr('stroke', 'var(--grid)')
    gy.selectAll('path,line').attr('stroke', 'var(--grid)')

    const focus = root.append('g')
    focus
      .append('path')
      .attr('class', 'area-path')
      .datum(data)
      .attr('fill', `url(#${gradId})`)
      .attr('d', area(data) ?? '')

    const pathLine = focus
      .append('path')
      .attr('class', 'line-path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'var(--chart-line)')
      .attr('stroke-width', 2)
      .attr('d', line(data) ?? '')

    const ctxG = root.append('g').attr('transform', `translate(0,${innerHFocus + GAP})`)
    ctxG
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'var(--muted)')
      .attr('stroke-opacity', 0.85)
      .attr('stroke-width', 1)
      .attr('d', line2(data) ?? '')

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [innerW, innerHCtx],
      ])
      .on('end', (event: d3.D3BrushEvent<unknown>) => {
        const sel = event.selection as [number, number] | null
        if (!event.sourceEvent || !sel) return
        const [px0, px1] = sel
        const d0 = x2.invert(px0)
        const d1 = x2.invert(px1)
        if (d1.getTime() - d0.getTime() < 86400000 * 30) return
        x.domain([d0, d1])
        pathLine.attr('d', line(data) ?? '')
        focus.select('.area-path').attr('d', area(data) ?? '')
        gx.call(xAxis)
      })

    const brushG = ctxG.append('g').attr('class', 'brush').call(brush)
    brush.move(brushG, [0, innerW])

    const overlay = focus
      .append('rect')
      .attr('width', innerW)
      .attr('height', innerHFocus)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')

    const focusLine = focus
      .append('line')
      .attr('stroke', 'var(--grid-strong)')
      .attr('stroke-dasharray', '4 4')
      .style('opacity', 0)
    const focusDot = focus
      .append('circle')
      .attr('r', 5)
      .attr('fill', 'var(--chart-line)')
      .attr('stroke', 'var(--surface)')
      .attr('stroke-width', 2)
      .style('opacity', 0)

    const tip = focus.append('g').style('pointer-events', 'none').style('opacity', 0)
    const tipRect = tip.append('rect').attr('rx', 6).attr('fill', 'var(--tooltip-bg)').attr('stroke', 'var(--border)')
    const tipDate = tip.append('text').attr('fill', 'var(--text)').attr('font-size', 12).attr('font-weight', 600)
    const tipVal = tip.append('text').attr('fill', 'var(--muted)').attr('font-size', 12).attr('dy', 18)

    const bisect = d3.bisector((d: InflationPoint) => d.date).left

    function showTip(mx: number) {
      const xd = x.invert(mx)
      const i = bisect(data, xd, 1)
      const d0 = data[i - 1]
      const d1 = data[i]
      if (!d0) return
      const d = d1 && xd.getTime() - d0.date.getTime() > d1.date.getTime() - xd.getTime() ? d1 : d0
      const cx = x(d.date)
      const cy = y(d.value)
      focusLine.attr('x1', cx).attr('x2', cx).attr('y1', 0).attr('y2', innerHFocus).style('opacity', 1)
      focusDot.attr('cx', cx).attr('cy', cy).style('opacity', 1)
      const fmt = d3.utcFormat('%b %Y')
      tipDate.text(fmt(d.date))
      tipVal.text(`${d.value.toFixed(2)}%`)
      tip.style('opacity', 1)
      tipDate.attr('x', 8).attr('y', 4)
      tipVal.attr('x', 8).attr('y', 22)
      const tw = Math.max(tipDate.node()!.getBBox().width, tipVal.node()!.getBBox().width) + 16
      const th = 40
      let tx = cx + 12
      if (tx + tw > innerW) tx = cx - tw - 12
      tip.attr('transform', `translate(${tx},${Math.max(8, cy - 56)})`)
      tipRect.attr('width', tw).attr('height', th).attr('x', 0).attr('y', -12)
    }

    overlay
      .on('mousemove', (ev: MouseEvent) => {
        const [mx] = d3.pointer(ev)
        showTip(mx)
      })
      .on('mouseleave', () => {
        focusLine.style('opacity', 0)
        focusDot.style('opacity', 0)
        tip.style('opacity', 0)
      })
  }, [data, width, ariaLabel, gradId])

  return (
    <div ref={wrapRef} className="inflation-chart">
      <svg ref={svgRef} />
    </div>
  )
}
