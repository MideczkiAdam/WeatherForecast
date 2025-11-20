export interface CurrentWeatherData {
  temp: number | null
  feelsLike: number | null
  avgTemp: number | null           // (temp_min + temp_max) / 2
  icon: string
  status: string
  sunrise: string
  sunset: string
  humidity: number | null
  pressure: number | null
  uvIndex: number | null           // becsült UV
}

export interface ForecastDayData {
  name: string
  min: number | null
  max: number | null
  icon: string
  status: string
}

export interface WeatherData {
  location: string
  date: string
  current: CurrentWeatherData
  week: ForecastDayData[]
}

const API_KEY = import.meta.env
  .VITE_OPENWEATHER_API_KEY as string | undefined

const BASE_URL = 'https://api.openweathermap.org/data/2.5'

function getEmojiForWeather(main: string): string {
  switch (main) {
    case 'Thunderstorm':
      return '⛈️'
    case 'Drizzle':
    case 'Rain':
      return '🌧️'
    case 'Snow':
      return '🌨️'
    case 'Clear':
      return '☀️'
    case 'Clouds':
      return '🌤️'
    case 'Mist':
    case 'Fog':
    case 'Haze':
      return '🌫️'
    default:
      return '🌤️'
  }
}

function formatDate(dt: number, timezoneOffset: number): string {
  const date = new Date((dt + timezoneOffset) * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  const text = await res.text()
  let data: any

  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'message' in data
        ? (data as any).message
        : `HTTP error ${res.status}`
    throw new Error(msg)
  }

  if (data && typeof data === 'object' && 'cod' in data) {
    const cod = (data as any).cod
    if (cod !== 200 && cod !== '200') {
      throw new Error((data as any).message || `Error ${cod}`)
    }
  }

  return data
}

export async function getWeather(city: string): Promise<WeatherData> {
  if (!API_KEY) {
    throw new Error('MISSING_KEY')
  }

  // 1) Aktuális időjárás – NÉV, KOORDINÁTA, TIMEZONE, MIN/MAX, stb.
  const weatherUrl = `${BASE_URL}/weather?q=${encodeURIComponent(
    city,
  )}&units=metric&appid=${API_KEY}`

  const currentData = await fetchJson(weatherUrl)

  const timezoneOffset: number = currentData.timezone ?? 0

  // mai min/max az aktuális response-ból
  const todayMin: number | null =
    typeof currentData.main?.temp_min === 'number'
      ? currentData.main.temp_min
      : null
  const todayMax: number | null =
    typeof currentData.main?.temp_max === 'number'
      ? currentData.main.temp_max
      : null

  const avgTemp: number | null =
    todayMin != null && todayMax != null
      ? Math.round(((todayMin + todayMax) / 2) * 10) / 10
      : null

  // UV becslés – nagyon egyszerű, de a feladatot kiszolgálja
  const clouds: number | null =
    typeof currentData.clouds?.all === 'number'
      ? currentData.clouds.all
      : null
  const tempMaxForUv: number | null =
    todayMax != null
      ? todayMax
      : typeof currentData.main?.temp === 'number'
      ? currentData.main.temp
      : null

  let uvIndex: number | null = null
  if (tempMaxForUv != null && clouds != null) {
    if (tempMaxForUv >= 25 && clouds <= 20) {
      uvIndex = 8 // magas
    } else if (tempMaxForUv >= 15 && clouds <= 50) {
      uvIndex = 6 // közepes
    } else if (tempMaxForUv >= 10) {
      uvIndex = 4 // alacsony-közepes
    } else {
      uvIndex = 2 // alacsony
    }
  }

  // 2) 5 nap / 3 órás bontás – ebből csinálunk 7 napot, utolsó 2 nap N/A
  const forecastUrl = `${BASE_URL}/forecast?q=${encodeURIComponent(
    city,
  )}&units=metric&appid=${API_KEY}`

  const forecastData = await fetchJson(forecastUrl)

  const tz = forecastData.city?.timezone ?? timezoneOffset

  type DayAgg = {
    min: number
    max: number
    mainCounts: Record<string, number>
    descCounts: Record<string, number>
    anyDt: number
  }

  const groups: Record<string, DayAgg> = {}

  if (Array.isArray(forecastData.list)) {
    for (const item of forecastData.list) {
      const dt: number = item.dt
      const local = new Date((dt + tz) * 1000)
      const key = local.toISOString().slice(0, 10) // YYYY-MM-DD

      const tempMin =
        typeof item.main?.temp_min === 'number'
          ? item.main.temp_min
          : typeof item.main?.temp === 'number'
          ? item.main.temp
          : null
      const tempMax =
        typeof item.main?.temp_max === 'number'
          ? item.main.temp_max
          : typeof item.main?.temp === 'number'
          ? item.main.temp
          : null

      const main = item.weather?.[0]?.main ?? 'N/A'
      const desc = item.weather?.[0]?.description ?? 'N/A'

      if (!groups[key]) {
        groups[key] = {
          min: tempMin ?? 999,
          max: tempMax ?? -999,
          mainCounts: {},
          descCounts: {},
          anyDt: dt,
        }
      }

      const g = groups[key]

      if (tempMin != null && tempMin < g.min) g.min = tempMin
      if (tempMax != null && tempMax > g.max) g.max = tempMax

      g.mainCounts[main] = (g.mainCounts[main] || 0) + 1
      g.descCounts[desc] = (g.descCounts[desc] || 0) + 1
    }
  }

  const groupEntries = Object.entries(groups).sort(
    (a, b) => a[1].anyDt - b[1].anyDt,
  )

  const pickTop = (counts: Record<string, number>): string => {
    let top = 'N/A'
    let max = -1
    for (const [k, v] of Object.entries(counts)) {
      if (v > max) {
        max = v
        top = k
      }
    }
    return top
  }

  const week: ForecastDayData[] = []

  for (let i = 0; i < 5; i++) {
    const entry = groupEntries[i]
    if (entry) {
      const agg = entry[1]
      const dt = agg.anyDt
      const date = new Date((dt + tz) * 1000)
      const dayName = date.toLocaleDateString('en-US', {
        weekday: 'long',
      })

      const main = pickTop(agg.mainCounts)
      const desc = pickTop(agg.descCounts)
      const min =
        agg.min !== 999 ? Math.round(agg.min) : null
      const max =
        agg.max !== -999 ? Math.round(agg.max) : null

      week.push({
        name: dayName,
        min,
        max,
        icon: getEmojiForWeather(main),
        status: desc,
      })
    } else {
      // ha a forecast csak 5 napot ad, a 6–7. nap legyen N/A
      const baseDt =
        groupEntries.length > 0
          ? groupEntries[groupEntries.length - 1][1].anyDt +
            (i - (groupEntries.length - 1)) * 86400
          : Math.floor(Date.now() / 1000) + i * 86400

      const date = new Date((baseDt + tz) * 1000)
      const dayName = date.toLocaleDateString('en-US', {
        weekday: 'long',
      })

      week.push({
        name: dayName,
        min: null,
        max: null,
        icon: '❔',
        status: 'N/A',
      })
    }
  }

  // aktuális ikon, leírás
  const currentMain = currentData.weather?.[0]
  const currentEmoji = getEmojiForWeather(
    currentMain?.main ?? 'Clear',
  )

  const sunriseUnix: number | null =
    typeof currentData.sys?.sunrise === 'number'
      ? currentData.sys.sunrise
      : null
  const sunsetUnix: number | null =
    typeof currentData.sys?.sunset === 'number'
      ? currentData.sys.sunset
      : null

  const sunrise =
    sunriseUnix != null
      ? new Date(
          (sunriseUnix + timezoneOffset) * 1000,
        ).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'N/A'

  const sunset =
    sunsetUnix != null
      ? new Date(
          (sunsetUnix + timezoneOffset) * 1000,
        ).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
      : 'N/A'

  const tempNow: number | null =
    typeof currentData.main?.temp === 'number'
      ? Math.round(currentData.main.temp)
      : null
  const feelsLikeNow: number | null =
    typeof currentData.main?.feels_like === 'number'
      ? Math.round(currentData.main.feels_like)
      : null

  const humidity: number | null =
    typeof currentData.main?.humidity === 'number'
      ? currentData.main.humidity
      : null
  const pressure: number | null =
    typeof currentData.main?.pressure === 'number'
      ? currentData.main.pressure
      : null

  const currentDt: number =
    typeof currentData.dt === 'number'
      ? currentData.dt
      : Math.floor(Date.now() / 1000)

  const date = formatDate(currentDt, timezoneOffset)

  return {
    location: currentData.name ?? 'N/A',
    date,
    current: {
      temp: tempNow,
      feelsLike: feelsLikeNow,
      avgTemp,
      icon: currentEmoji,
      status: currentMain?.description ?? 'N/A',
      sunrise,
      sunset,
      humidity,
      pressure,
      uvIndex,
    },
    week,
  }
}
