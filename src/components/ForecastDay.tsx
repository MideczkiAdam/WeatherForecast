import React from 'react'
import type { ForecastDayData } from '../assets/weatherApi'

interface ForecastDayProps {
  day: ForecastDayData
  barHeight: string          // a WeeklyForecast számolja ki, itt csak megjelenítjük
}

const ForecastDay: React.FC<ForecastDayProps> = ({ day, barHeight }) => {
  const minLabel = day.min != null ? `${day.min}°` : 'N/A'
  const maxLabel = day.max != null ? `${day.max}°` : 'N/A'
  const statusLabel = day.status || 'N/A'

  return (
    <div className="day">
      <div className="icon">{day.icon}</div>

      <p className="temp-range">
        <span className="temp-min">{minLabel}</span> /{' '}
        <span className="temp-max">{maxLabel}</span>
      </p>

      <p className="day-name">{day.name}</p>
      <p className="day-status">{statusLabel}</p>

      {/* egyszerű grafikon oszlop a trendhez */}
      <div className="trend-bar-wrapper">
        <div
          className="trend-bar"
          style={{ height: barHeight }}
          title={`Trend max: ${maxLabel}`}
        />
      </div>
    </div>
  )
}

export default ForecastDay
