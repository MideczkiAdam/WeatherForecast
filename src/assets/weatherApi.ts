// -------------------------
// TYPES
// -------------------------

export interface CurrentWeatherData {
  temp: number | null
  feelsLike: number | null
  avgTemp: number | null
  icon: string
  status: string
  sunrise: string
  sunset: string
  humidity: number | null
  pressure: number | null
  uvIndex: number | null  // csak becsült, NEM az API-ból jön
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

// csak FREE endpointok: /weather és /forecast
const API_KEY = import.meta.env
  .VITE_OPENWEATHER_API_KEY as string | undefined

const BASE_URL = "https://api.openweathermap.org/data/2.5"

// -------------------------
// HELPERS
// -------------------------

function getEmojiForWeather(main: string): string {
  switch (main) {
    case "Thunderstorm":
      return "⛈️"
    case "Drizzle":
    case "Rain":
      return "🌧️"
    case "Snow":
      return "🌨️"
    case "Clear":
      return "☀️"
    case "Clouds":
      return "🌤️"
    case "Mist":
    case "Fog":
    case "Haze":
      return "🌫️"
    default:
      return "🌤️"
  }
}

function formatDate(dt: number, offset: number): string {
  const date = new Date((dt + offset) * 1000)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    weekday: "long",
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
      typeof data === "object" &&
      data &&
      "message" in data
        ? (data as any).message
        : `HTTP error ${res.status}`
    throw new Error(msg)
  }

  return data
}

// -------------------------
// MAIN FREE API FUNCTION
// -------------------------

export async function getWeather(city: string): Promise<WeatherData> {
  // ha ide eljut a kód és itt elhasal, biztos, hogy nincs .env kulcs
  if (!API_KEY) {
    console.error("VITE_OPENWEATHER_API_KEY nincs beállítva (.env fájlban).")
    throw new Error("MISSING_KEY")
  }

  //
  // 1) CURRENT WEATHER  (FREE: /weather)
  //
  const currentUrl = `${BASE_URL}/weather?q=${encodeURIComponent(
    city,
  )}&units=metric&appid=${API_KEY}`

  const current = await fetchJson(currentUrl)

  const timezoneOffset: number = current.timezone ?? 0

  const temp: number | null =
    typeof current.main?.temp === "number"
      ? Math.round(current.main.temp)
      : null

  const feels: number | null =
    typeof current.main?.feels_like === "number"
      ? Math.round(current.main.feels_like)
      : null

  const tMin: number | null =
    typeof current.main?.temp_min === "number"
      ? current.main.temp_min
      : null

  const tMax: number | null =
    typeof current.main?.temp_max === "number"
      ? current.main.temp_max
      : null

  const avgTemp: number | null =
    tMin != null && tMax != null
      ? Math.round(((tMin + tMax) / 2) * 10) / 10
      : null

  const main: string = current.weather?.[0]?.main ?? "Clear"
  const desc: string = current.weather?.[0]?.description ?? "N/A"
  const icon: string = getEmojiForWeather(main)

  const sunriseUnix: number | undefined = current.sys?.sunrise
  const sunsetUnix: number | undefined = current.sys?.sunset

  const sunrise: string =
    typeof sunriseUnix === "number"
      ? new Date(
          (sunriseUnix + timezoneOffset) * 1000,
        ).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "N/A"

  const sunset: string =
    typeof sunsetUnix === "number"
      ? new Date(
          (sunsetUnix + timezoneOffset) * 1000,
        ).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "N/A"

  const humidity: number | null =
    typeof current.main?.humidity === "number"
      ? current.main.humidity
      : null

  const pressure: number | null =
    typeof current.main?.pressure === "number"
      ? current.main.pressure
      : null

  //
  // UV INDEX – FREE API-ban NINCS → saját becslés
  //
  let uvIndex: number | null = null
  const clouds: number | null =
    typeof current.clouds?.all === "number"
      ? current.clouds.all
      : null
  const tempForUv: number | null = tMax ?? temp

  if (clouds != null && tempForUv != null) {
    if (tempForUv >= 25 && clouds <= 20) uvIndex = 8
    else if (tempForUv >= 15 && clouds <= 50) uvIndex = 6
    else if (tempForUv >= 10) uvIndex = 4
    else uvIndex = 2
  }

  //
  // 2) 5-DAY / 3-HOUR FORECAST (FREE: /forecast)
  //
  const fcUrl = `${BASE_URL}/forecast?q=${encodeURIComponent(
    city,
  )}&units=metric&appid=${API_KEY}`

  const forecast = await fetchJson(fcUrl)

  const tz: number = forecast.city?.timezone ?? timezoneOffset
  const list: any[] = Array.isArray(forecast.list)
    ? forecast.list
    : []

  type DayAgg = {
    min: number
    max: number
    mainCounts: Record<string, number>
    descCounts: Record<string, number>
    dt: number
  }

  const groups: Record<string, DayAgg> = {}

  for (const item of list) {
    const dt: number = item.dt
    const local = new Date((dt + tz) * 1000)
    const key = local.toISOString().slice(0, 10) // YYYY-MM-DD

    const tempMin: number | null =
      typeof item.main?.temp_min === "number"
        ? item.main.temp_min
        : typeof item.main?.temp === "number"
        ? item.main.temp
        : null

    const tempMax: number | null =
      typeof item.main?.temp_max === "number"
        ? item.main.temp_max
        : typeof item.main?.temp === "number"
        ? item.main.temp
        : null

    const wMain: string = item.weather?.[0]?.main ?? "N/A"
    const wDesc: string =
      item.weather?.[0]?.description ?? "N/A"

    if (!groups[key]) {
      groups[key] = {
        min: 999,
        max: -999,
        mainCounts: {},
        descCounts: {},
        dt,
      }
    }

    const g = groups[key]

    if (tempMin != null && tempMin < g.min) g.min = tempMin
    if (tempMax != null && tempMax > g.max) g.max = tempMax

    g.mainCounts[wMain] = (g.mainCounts[wMain] || 0) + 1
    g.descCounts[wDesc] = (g.descCounts[wDesc] || 0) + 1
  }

  const sortedDays = Object.entries(groups).sort(
    (a, b) => a[1].dt - b[1].dt,
  )

  const pickTop = (
    counts: Record<string, number>,
  ): string => {
    let top = "N/A"
    let maxCount = -1
    for (const [k, v] of Object.entries(counts)) {
      if (v > maxCount) {
        maxCount = v
        top = k
      }
    }
    return top
  }

  const week: ForecastDayData[] = []

  for (let i = 0; i < 5; i++) {
    const entry = sortedDays[i]
    if (!entry) break

    const agg = entry[1]
    const d = new Date((agg.dt + tz) * 1000)

    week.push({
      name: d.toLocaleDateString("en-US", {
        weekday: "long",
      }),
      min: agg.min !== 999 ? Math.round(agg.min) : null,
      max: agg.max !== -999 ? Math.round(agg.max) : null,
      icon: getEmojiForWeather(pickTop(agg.mainCounts)),
      status: pickTop(agg.descCounts),
    })
  }

  const nowDt: number =
    typeof current.dt === "number"
      ? current.dt
      : Math.floor(Date.now() / 1000)

  return {
    location: current.name ?? "N/A",
    date: formatDate(nowDt, timezoneOffset),
    current: {
      temp,
      feelsLike: feels,
      avgTemp,
      icon,
      status: desc,
      sunrise,
      sunset,
      humidity,
      pressure,
      uvIndex,
    },
    week,
  }
}
