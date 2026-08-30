import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'

echarts.use([LineChart, PieChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

export function EChart({ option, label }: { option: EChartsCoreOption; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const instance = echarts.init(ref.current)
    instance.setOption(option)
    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(ref.current)
    return () => { observer.disconnect(); instance.dispose() }
  }, [option])
  return <div ref={ref} className="chart" role="img" aria-label={label} />
}
