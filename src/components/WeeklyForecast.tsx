import React from 'react'
import type { ForecastDayData } from '../assets/weatherApi'
import ForecastDay from './ForecastDay'

interface WeeklyForecastProps {
  days: ForecastDayData[]
}

const WeeklyForecast: React.FC<WeeklyForecastProps> = ({ days }) => {
  const first5 = days.slice(0, 5)

  // globális min/max a trend normalizálásához
  const values: number[] = []
  first5.forEach((d) => {
    if (d.min != null) values.push(d.min)
    if (d.max != null) values.push(d.max)
  })

  const globalMin = values.length ? Math.min(...values) : null
  const globalMax = values.length ? Math.max(...values) : null
  const range =
    globalMin != null && globalMax != null && globalMax !== globalMin
      ? globalMax - globalMin
      : 1

  const getBarHeight = (day: ForecastDayData): string => {
    if (globalMin == null || globalMax == null) return '20%'
    const ref = day.max ?? day.min
    if (ref == null) return '20%'

    const normalized = (ref - globalMin) / range
    const height = 20 + normalized * 80 // 20–100% között
    return `${height}%`
  }

  return (
    <div className="week-section">
      <h2 className="week-title">Következő napok</h2>

      <div className="week">
        {first5.map((day) => (
          <ForecastDay
            key={day.name}
            day={day}
            barHeight={getBarHeight(day)}
          />
        ))}
      </div>
    </div>
  )
}

export default WeeklyForecast
