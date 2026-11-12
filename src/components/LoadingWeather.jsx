

export function LoadingWeather() {
  return <div id="loaderContainer" role="status" className="loader-container">
    <div className="weather-loader" aria-hidden="true"><div className="sun"><div className="sun-rays"/></div><div className="cloud cloud1"/><div className="cloud cloud2"/><div className="rain-drops"><div className="drop"/><div className="drop"/><div className="drop"/></div></div>
    <p className="loading-text">Fetching weather data...</p>
  </div>;
}
