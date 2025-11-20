import React from 'react'
import type { CurrentWeatherData } from '../assets/weatherApi'

interface CurrentWeatherProps {
  location: string
  date: string
  data: CurrentWeatherData
}

const CurrentWeather: React.FC<CurrentWeatherProps> = ({
  location,
  date,
  data,
}) => {
  const {
    temp,
    feelsLike,
    avgTemp,
    icon,
    status,
    sunrise,
    sunset,
    humidity,
    pressure,
    uvIndex,
  } = data

  const showWinterWarning = avgTemp != null && avgTemp < 7
  const showUvWarning = uvIndex != null && uvIndex >= 7 // saját küszöb: 7+

  const displayTemp = temp != null ? `${temp}°` : 'N/A'
  const displayFeelsLike = feelsLike != null ? `${feelsLike}°` : 'N/A'
  const displayAvgTemp = avgTemp != null ? `${avgTemp}°` : 'N/A'
  const displayHumidity =
    humidity != null ? `${humidity}%` : 'N/A'
  const displayPressure =
    pressure != null ? `${pressure} mbar` : 'N/A'
  const displayUv =
    uvIndex != null ? uvIndex.toFixed(1) : 'N/A'

  return (
    <>
      <div className="main-card">
        <div className="left">
          <div className="location">
            <h2>📍 {location || 'N/A'}</h2>
            <p>{date || 'N/A'}</p>
          </div>
          <div className="temperature">
            <span className="thermo">🌡️</span>
            <h1>{displayTemp}</h1>
          </div>
          <p className="feels-like">
            Feels like {displayFeelsLike} (avg: {displayAvgTemp})
          </p>
        </div>

        <div className="center">
          <div className="weather-icon">
            <div className="icon">{icon}</div>
          </div>
          <p className="status">{status || 'N/A'}</p>
        </div>

        <div className="right">
          <p>🌅 Sunrise {sunrise || 'N/A'}</p>
          <p>🌇 Sunset {sunset || 'N/A'}</p>
          <p>💧 {displayHumidity}</p>
          <p>📈 {displayPressure}</p>
          <p>🔆 UV index: {displayUv}</p>
        </div>
      </div>

      <div className="warnings">
        {showWinterWarning && (
          <p className="warning winter-warning">
            ❄️ Az aktuális nap átlaghőmérséklete 7°C alatt van. Ajánlott téli
            gumit használni az autón!
          </p>
        )}
        {showUvWarning && (
          <p className="warning uv-warning">
            🔆 Figyelem! Ma magas UV-sugárzás várható (UV index: {displayUv}) – védekezz
            naptejjel, fejfedővel!
          </p>
        )}
        {!showWinterWarning && !showUvWarning && (
          <p className="warning neutral-warning">
            ℹ️ Nincs különleges figyelmeztetés mára.
          </p>
        )}
      </div>
    </>
  )
}

export default CurrentWeather
