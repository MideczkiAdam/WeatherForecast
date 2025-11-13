import './App.css'

function App() {

  return (
    <div className="weather-container">
      <h1 className="title">Weather Forecast Blank Template</h1>

      <div className="main-card">
        {/* Left section */}
        <div className="left">
          <div className="location">
            <h2>📍 Paris</h2>
            <p>September 21, Monday</p>
          </div>
          <div className="temperature">
            <span className="thermo">🌡️</span>
            <h1>22°</h1>
          </div>
          <p className="feels-like">Feels like 21°</p>
        </div>

        {/* Center section */}
        <div className="center">
          <div className="weather-icon">
            <div className="icon">🌤️</div>
          </div>
          <p className="status">Partly cloudy</p>
        </div>

        {/* Right section */}
        <div className="right">
          <p>🌅 Sunrise 6:30 am</p>
          <p>🌇 Sunset 19:30 pm</p>
          <p>💧 60%</p>
          <p>📈 1024.0 mbar</p>
        </div>
      </div>

      {/* Weekly forecast */}
      <div className="week">
        <div className="day">
          <div className="icon">🌧️</div>
          <p className="temp">25°</p>
          <p>Tuesday</p>
        </div>
        <div className="day">
          <div className="icon">🌨️</div>
          <p className="temp">23°</p>
          <p>Wednesday</p>
        </div>
        <div className="day">
          <div className="icon">🌤️</div>
          <p className="temp">22°</p>
          <p>Thursday</p>
        </div>
        <div className="day">
          <div className="icon">🌩️</div>
          <p className="temp">19°</p>
          <p>Friday</p>
        </div>
        <div className="day">
          <div className="icon">🌦️</div>
          <p className="temp">22°</p>
          <p>Saturday</p>
        </div>
        <div className="day">
          <div className="icon">🌫️</div>
          <p className="temp">20°</p>
          <p>Sunday</p>
        </div>
      </div>
    </div>
  )
}

export default App
