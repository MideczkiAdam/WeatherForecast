import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import './index.css'
import { getWeather, type WeatherData } from './assets/weatherApi'
import CurrentWeather from './components/CurrentWeather'
import WeeklyForecast from './components/WeeklyForecast'

// ---------- Context típus ----------

interface WeatherContextValue {
  weather: WeatherData | null
  loading: boolean
  error: string | null
}

// ---------- Context + hook ----------

const WeatherContext = createContext<WeatherContextValue | undefined>(undefined)

export function useWeather(): WeatherContextValue {
  const ctx = useContext(WeatherContext)
  if (!ctx) {
    throw new Error('useWeather must be used within WeatherProvider')
  }
  return ctx
}

// ---------- Debounce hook ----------

function useDebounce<T>(value: T, delay = 800): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])

  return debounced
}

// ---------- Város suggestion lista ----------

const CITY_SUGGESTIONS: string[] = [
  'Paris',
  'London',
  'Budapest',
  'Berlin',
  'Madrid',
  'Rome',
  'Vienna',
  'Prague',
  'Warsaw',
  'New York',
  'Los Angeles',
  'Tokyo',
  'Sydney',
  'Copenhagen',
  'Amsterdam',
]

// ---------- WeatherProvider ----------

const WeatherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [city, setCity] = useState<string>('Paris')
  const [cityInput, setCityInput] = useState<string>('Paris')
  const debouncedCityInput = useDebounce<string>(cityInput, 900)

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const [showSuggestions, setShowSuggestions] = useState<boolean>(false)

  // Debounce-olt input → város frissítés
  useEffect(() => {
    const trimmed = debouncedCityInput.trim()
    if (trimmed.length >= 2 && trimmed.toLowerCase() !== city.toLowerCase()) {
      setCity(trimmed)
    }
  }, [debouncedCityInput, city])

  // Város változásakor API hívás
  useEffect(() => {
    async function fetchWeather() {
      try {
        const trimmed = city.trim()
        if (!trimmed) return

        setLoading(true)
        setError(null)

        const data = await getWeather(trimmed)
        setWeather(data)
      } catch (err: unknown) {
        console.error('API error:', err)
        let msg = 'Ismeretlen hiba történt.'

        if (err instanceof Error) {
          if (err.message === 'city not found') {
            msg = 'Nem található ilyen város.'
          } else if (
            err.message.includes('Invalid API key') ||
            err.message.includes('401')
          ) {
            msg = 'Érvénytelen API kulcs.'
          } else if (err.message.includes('Failed to fetch')) {
            msg =
              'Nem sikerült kapcsolódni a szerverhez. Ellenőrizd az internetkapcsolatot.'
          } else if (err.message === 'MISSING_KEY') {
            msg = 'Hiányzik az OpenWeather API kulcs.'
          }
        }

        setError(msg)
        setWeather(null)
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [city])

  // autocomplete lista
  const filteredSuggestions =
    cityInput.trim().length >= 2
      ? CITY_SUGGESTIONS.filter((c) =>
          c.toLowerCase().startsWith(cityInput.trim().toLowerCase()),
        )
      : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = cityInput.trim()
    if (!trimmed) return
    setCity(trimmed)
    setShowSuggestions(false)
  }

  return (
    <WeatherContext.Provider value={{ weather, loading, error }}>
      {/* Város kereső + autocomplete */}
      <form className="city-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="city-input-wrapper">
          <input
            className="city-input"
            type="text"
            value={cityInput}
            onChange={(e) => {
              setCityInput(e.target.value)
              setShowSuggestions(true)
            }}
            placeholder="Írd be a várost (pl. London)"
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 150)
            }}
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="city-suggestions">
              {filteredSuggestions.map((name) => (
                <li
                  key={name}
                  onMouseDown={() => {
                    setCityInput(name)
                    setCity(name)
                    setShowSuggestions(false)
                  }}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="city-button" type="submit">
          Keresés
        </button>
      </form>

      {children}
    </WeatherContext.Provider>
  )
}

// ---------- A tartalom, ami a contextet használja ----------

const AppContent: React.FC = () => {
  const { weather, loading, error } = useWeather()

  return (
    <>
      {loading && (
        <div className="loader-wrapper">
          <div className="loader" />
          <p className="info-text">Betöltés...</p>
        </div>
      )}

      {error && !loading && (
        <p className="info-text error-text">{error}</p>
      )}

      {weather && !loading && !error && (
        <>
          <CurrentWeather
            location={weather.location}
            date={weather.date}
            data={weather.current}
          />
          <WeeklyForecast days={weather.week} />
        </>
      )}
    </>
  )
}

// ---------- Fő App (téma + layout) ----------

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return (
    <div className={`app-root ${theme}`}>
      <div className="weather-container">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <h1 className="title">Weather Forecast Blank Template</h1>

        <WeatherProvider>
          <AppContent />
        </WeatherProvider>
      </div>
    </div>
  )
}

export default App
