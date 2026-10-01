import { useCallback, useEffect, useState } from "react";
import { Icon } from "./icons";
import { Card } from "./ui";
import { useApp } from "../store/AppContext";
import { cozyLine, describeWeatherCode } from "../engine/connectionEngine";

async function geocode(city: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.results?.[0];
  if (!hit) return null;
  return { lat: hit.latitude, lon: hit.longitude };
}

export function WeatherCard() {
  const { state, pet, setPrefs, setWeather, toast } = useApp();
  const [city, setCity] = useState(state.prefs.weatherCity);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const fetchWeather = useCallback(
    async (cityName: string) => {
      setStatus("loading");
      try {
        const geo = await geocode(cityName);
        if (!geo) {
          setStatus("error");
          toast("Couldn't find that city. Check the spelling and try again.", "care");
          return;
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,weather_code&hourly=temperature_2m,precipitation_probability&forecast_days=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("bad response");
        const data = await res.json();
        const current = data.current ?? {};
        const desc = describeWeatherCode(Number(current.weather_code ?? 0));
        const times: string[] = data.hourly?.time ?? [];
        const temps: number[] = data.hourly?.temperature_2m ?? [];
        const precip: number[] = data.hourly?.precipitation_probability ?? [];
        const hours = times
          .map((t, i) => ({ time: t, tempC: Math.round(temps[i] ?? 0), precip: precip[i] ?? 0 }))
          .filter((h) => {
            const hour = new Date(h.time).getHours();
            return hour >= 15 && hour <= 20;
          });
        setWeather({
          city: cityName,
          tempC: Math.round(Number(current.temperature_2m ?? 0)),
          code: Number(current.weather_code ?? 0),
          isRain: desc.rain,
          fetchedAt: new Date().toISOString(),
          hours,
        });
        setPrefs({ weatherCity: cityName });
        setStatus("idle");
      } catch {
        setStatus("error");
        toast("Weather isn't available right now. Everything else works offline.", "care");
      }
    },
    [setPrefs, setWeather, toast],
  );

  useEffect(() => {
    if (!state.prefs.weatherCity) return;
    const fresh =
      state.weather &&
      Date.now() - new Date(state.weather.fetchedAt).getTime() < 1000 * 60 * 45;
    if (!fresh) fetchWeather(state.prefs.weatherCity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weather = state.weather;

  if (!state.prefs.weatherCity) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2 text-clay-deep">
          <Icon name="cloud" size={18} />
          <h2 className="text-lg">Weather-aware walks</h2>
        </div>
        <p className="text-sm text-mocha mb-3">
          Add a city to see a gentle walk window. Tandem never tracks your location.
        </p>
        <div className="flex gap-2">
          <input
            className="field"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Bristol"
            onKeyDown={(e) => e.key === "Enter" && city.trim() && fetchWeather(city.trim())}
          />
          <button className="btn btn-quiet px-4" onClick={() => city.trim() && fetchWeather(city.trim())} disabled={status === "loading"}>
            {status === "loading" ? "…" : "Save"}
          </button>
        </div>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="p-5">
        <p className="text-sm text-mocha">
          {status === "loading" ? "Checking the sky…" : "Weather unavailable right now. Suggestions still work offline."}
        </p>
      </Card>
    );
  }

  const desc = describeWeatherCode(weather.code);
  const dryWindow = weather.hours?.find((h) => h.precip < 40 && h.tempC >= 4 && h.tempC <= 28);
  const windowLabel = dryWindow
    ? `Dry and mild around ${new Date(dryWindow.time).getHours()}:00`
    : undefined;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-clay-deep">
          <Icon name="cloud" size={18} />
          <h2 className="text-lg">Today out there</h2>
        </div>
        <span className="num text-lg">{weather.tempC}°</span>
      </div>
      <p className="text-sm text-mocha">
        {desc.label} in {weather.city}.
      </p>
      <p className="text-sm mt-2">{windowLabel ? `${windowLabel} — a good walk window.` : cozyLine(weather, pet?.name ?? "they")}</p>
      <button className="mt-3 text-xs text-faint hover:text-espresso" onClick={() => fetchWeather(weather.city)}>
        Refresh
      </button>
    </Card>
  );
}