
let chart, feelsChart;
let currentUnit = 'C';
let lastData = null;
let lastCity = null;
let bgAnimFrame;
let globeInitialized = false;
let globeRenderer, globeScene, globeCamera, globeGlobe, globeAnimId;

const bgCanvas = document.getElementById('weather-bg');
const bgCtx = bgCanvas.getContext('2d');
let particles = [];
let bgWeatherType = 'clear';

function resizeBg() {
  bgCanvas.width  = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
resizeBg();
window.addEventListener('resize', resizeBg);

class Particle {
  constructor(type) {
    this.type = type;
    this.reset(true);
  }
  reset(init) {
    this.x = Math.random() * bgCanvas.width;
    this.y = init ? Math.random() * bgCanvas.height : -10;
    this.size = Math.random() * 2 + 0.5;
    this.speed = Math.random() * 2 + 1;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.windX = (Math.random() - 0.5) * 0.5;
    if (this.type === 'rain') {
      this.size = Math.random() * 1 + 0.4;
      this.speed = Math.random() * 6 + 4;
      this.windX = Math.random() * 1.5 + 0.5;
      this.length = Math.random() * 14 + 6;
    }
    if (this.type === 'snow') {
      this.size = Math.random() * 3 + 1;
      this.speed = Math.random() * 1 + 0.3;
      this.drift = Math.random() * Math.PI * 2;
      this.driftSpeed = Math.random() * 0.02 + 0.005;
    }
    if (this.type === 'cloud') {
      this.y = init ? Math.random() * bgCanvas.height * 0.5 : -80;
      this.w = Math.random() * 120 + 60;
      this.h = Math.random() * 40 + 20;
      this.speed = Math.random() * 0.3 + 0.1;
      this.opacity = Math.random() * 0.06 + 0.02;
    }
    if (this.type === 'lightning') {
      this.x = Math.random() * bgCanvas.width;
      this.y = 0;
      this.ttl = Math.random() * 6 + 2;
      this.opacity = 0;
      this.delay = Math.random() * 300;
    }
  }
  update() {
    if (this.type === 'rain') {
      this.x += this.windX;
      this.y += this.speed;
    } else if (this.type === 'snow') {
      this.drift += this.driftSpeed;
      this.x += Math.sin(this.drift) * 0.7;
      this.y += this.speed;
    } else if (this.type === 'cloud') {
      this.x += this.speed;
      if (this.x > bgCanvas.width + this.w) this.x = -this.w;
    } else if (this.type === 'lightning') {
      if (this.delay > 0) { this.delay--; return; }
      this.ttl--;
      this.opacity = this.ttl > 4 ? this.ttl / 6 : this.ttl / 6;
    } else {
      this.x += this.windX;
      this.y += this.speed;
    }
    if (this.type !== 'cloud' && this.type !== 'lightning' && this.y > bgCanvas.height + 20) this.reset(false);
    if (this.type === 'lightning' && this.ttl <= 0) { this.reset(false); this.delay = Math.random() * 400 + 100; }
  }
  draw() {
    bgCtx.save();
    if (this.type === 'rain') {
      bgCtx.strokeStyle = `rgba(147,210,255,${this.opacity})`;
      bgCtx.lineWidth = this.size;
      bgCtx.beginPath();
      bgCtx.moveTo(this.x, this.y);
      bgCtx.lineTo(this.x + this.windX * 3, this.y + this.length);
      bgCtx.stroke();
    } else if (this.type === 'snow') {
      bgCtx.fillStyle = `rgba(220,240,255,${this.opacity})`;
      bgCtx.beginPath();
      bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      bgCtx.fill();
    } else if (this.type === 'cloud') {
      bgCtx.fillStyle = `rgba(200,220,255,${this.opacity})`;
      bgCtx.beginPath();
      bgCtx.ellipse(this.x, this.y, this.w, this.h, 0, 0, Math.PI * 2);
      bgCtx.fill();
    } else if (this.type === 'lightning') {
      bgCtx.strokeStyle = `rgba(200,200,255,${this.opacity * 0.6})`;
      bgCtx.lineWidth = 1;
      bgCtx.beginPath();
      let lx = this.x, ly = 0;
      for (let i = 0; i < 6; i++) {
        const nx = lx + (Math.random() - 0.5) * 60;
        const ny = ly + bgCanvas.height / 6;
        bgCtx.moveTo(lx, ly);
        bgCtx.lineTo(nx, ny);
        lx = nx; ly = ny;
      }
      bgCtx.stroke();
    } else {
      bgCtx.fillStyle = `rgba(180,210,255,${this.opacity})`;
      bgCtx.beginPath();
      bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      bgCtx.fill();
    }
    bgCtx.restore();
  }
}

function setParticles(type) {
  bgWeatherType = type;
  cancelAnimationFrame(bgAnimFrame);
  particles = [];
  if (type === 'clear') {
    for (let i = 0; i < 40; i++) particles.push(new Particle('star'));
  } else if (type === 'cloudy') {
    for (let i = 0; i < 8; i++) particles.push(new Particle('cloud'));
    for (let i = 0; i < 20; i++) particles.push(new Particle('star'));
  } else if (type === 'rainy') {
    for (let i = 0; i < 120; i++) particles.push(new Particle('rain'));
    for (let i = 0; i < 5;  i++) particles.push(new Particle('cloud'));
  } else if (type === 'snowy') {
    for (let i = 0; i < 80; i++) particles.push(new Particle('snow'));
    for (let i = 0; i < 5; i++) particles.push(new Particle('cloud'));
  } else if (type === 'storm') {
    for (let i = 0; i < 80; i++) particles.push(new Particle('rain'));
    for (let i = 0; i < 5; i++) particles.push(new Particle('cloud'));
    for (let i = 0; i < 4; i++) particles.push(new Particle('lightning'));
  }
  animateBg();
}

function animateBg() {
  bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  bgAnimFrame = requestAnimationFrame(animateBg);
}

setParticles('clear');

function setUnit(u) {
  currentUnit = u;
  document.getElementById('btn-c').classList.toggle('active', u === 'C');
  document.getElementById('btn-f').classList.toggle('active', u === 'F');
  if (lastData) render(lastData, lastCity.name, lastCity.country);
}

function toDisp(c) {
  if (currentUnit === 'F') return Math.round(c * 9/5 + 32);
  return Math.round(c);
}

function unitSym() { return currentUnit === 'F' ? '°F' : '°C'; }

function setCity(name) {
  document.getElementById('ci').value = name;
  gw();
}

document.getElementById('ci').addEventListener('keypress', e => {
  if (e.key === 'Enter') gw();
});

async function gw() {
  const city = document.getElementById('ci').value.trim();
  if (!city) return;

  const out = document.getElementById('out');
  out.innerHTML = `
    <div class="empty">
      <div class="empty-globe">🌤️</div>
      <p style="color:rgba(255,255,255,0.5)">Fetching forecast…</p>
      <div class="loading-dots"><span></span><span></span><span></span></div>
    </div>`;

  try {
    const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();

    if (!geoData.results) {
      out.innerHTML = '<div class="empty"><p style="color:#f87171">City not found. Try another name.</p></div>';
      return;
    }

    const { latitude: lat, longitude: lon, name, country } = geoData.results[0];
    lastCity = { name, country, lat, lon };

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,winddirection_10m,relativehumidity_2m,pressure_msl,uv_index` +
      `&hourly=temperature_2m,apparent_temperature,weathercode,precipitation_probability` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,uv_index_max,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`
    );
    const data = await res.json();
    lastData = data;

    let aqiData = null;
    try {
      const aqiRes = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone` +
        `&timezone=auto`
      );
      aqiData = await aqiRes.json();
    } catch(_) {}

    render(data, name, country, aqiData);

  } catch (err) {
    console.error(err);
    out.innerHTML = '<div class="empty"><p style="color:#f87171">Something went wrong. Please try again.</p></div>';
  }
}

function render(d, name, country, aqiData) {
  const c  = d.current;
  const dl = d.daily;
  const hr = d.hourly;

  const today   = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const sunrise = dl.sunrise[0] ? dl.sunrise[0].split('T')[1] : '--';
  const sunset  = dl.sunset[0]  ? dl.sunset[0].split('T')[1]  : '--';

  const uvMax = Math.round(dl.uv_index_max[0] || 0);
  const rain  = Math.round(dl.precipitation_probability_max[0] || 0);
  const wind  = Math.round(c.windspeed_10m);
  const hum   = Math.round(c.relativehumidity_2m);
  const pres  = Math.round(c.pressure_msl);

  const dispTemp = toDisp(c.temperature_2m);
  const dispFeel = toDisp(c.apparent_temperature);
  const sym      = unitSym();

  const wcode = c.weathercode;
  if (wcode === 0) setParticles('clear');
  else if (wcode <= 3) setParticles('cloudy');
  else if (wcode <= 67) setParticles('rainy');
  else if (wcode <= 77) setParticles('snowy');
  else setParticles('storm');

  let fcHTML = '';
  dl.time.slice(0, 7).forEach((day, i) => {
    const lbl = i === 0 ? 'Today' : new Date(day).toLocaleDateString('en-US', { weekday: 'short' });
    fcHTML += `
      <div class="fc glass${i === 0 ? ' tod' : ''}" style="animation-delay:${i * 0.06}s">
        <div class="fc-day">${lbl}</div>
        <img src="${getIcon(dl.weathercode[i])}" alt="${getCondition(dl.weathercode[i])}">
        <div class="fc-max">${toDisp(dl.temperature_2m_max[i])}°</div>
        <div class="fc-min">${toDisp(dl.temperature_2m_min[i])}°</div>
      </div>`;
  });

  const nowHour = new Date().getHours();
  let hrHTML = '';
  for (let i = 0; i < 24; i++) {
    const idx  = nowHour + i;
    const hour = idx % 24;
    const temp = hr.temperature_2m[idx] != null ? toDisp(hr.temperature_2m[idx]) : '--';
    const wc   = hr.weathercode[idx] || 0;
    const lbl  = i === 0 ? 'Now' : `${String(hour).padStart(2,'0')}:00`;
    hrHTML += `
      <div class="hc glass" style="animation-delay:${i * 0.03}s">
        <div class="hc-time">${lbl}</div>
        <img src="${getIcon(wc)}" alt="">
        <div class="hc-t">${temp}°</div>
      </div>`;
  }

  const uvColor = uvMax <= 2 ? '#4ade80' : uvMax <= 5 ? '#facc15' : uvMax <= 7 ? '#fb923c' : '#f87171';
  const uvLabel = uvMax <= 2 ? 'Low' : uvMax <= 5 ? 'Moderate' : uvMax <= 7 ? 'High' : 'Very High';
  const uvPct   = Math.min(100, Math.round((uvMax / 12) * 100));

  const humLabel = hum < 30 ? 'Dry' : hum < 60 ? 'Comfortable' : 'Humid';

  let aqiHTML = '';
  if (aqiData && aqiData.current) {
    const aqi      = Math.round(aqiData.current.us_aqi || 0);
    const aqiPct   = Math.min(100, (aqi / 500) * 100);
    const aqiColor = aqi <= 50 ? '#4ade80' : aqi <= 100 ? '#facc15' : aqi <= 150 ? '#fb923c' : aqi <= 200 ? '#f87171' : '#c084fc';
    const aqiLabel = aqi <= 50 ? 'Good' : aqi <= 100 ? 'Moderate' : aqi <= 150 ? 'Unhealthy for Sensitive' : aqi <= 200 ? 'Unhealthy' : 'Very Unhealthy';
    const pm25  = (aqiData.current.pm2_5  || 0).toFixed(1);
    const pm10  = (aqiData.current.pm10   || 0).toFixed(1);
    const co    = (aqiData.current.carbon_monoxide || 0).toFixed(0);
    const no2   = (aqiData.current.nitrogen_dioxide || 0).toFixed(1);
    const o3    = (aqiData.current.ozone  || 0).toFixed(1);

    aqiHTML = `
      <div class="aqi-card glass anim-up delay-5">
        <div class="aqi-header">
          <div class="section-label" style="margin-bottom:0">Air Quality Index</div>
          <div class="aqi-badge" style="background:${aqiColor}22;color:${aqiColor};border:1px solid ${aqiColor}44">${aqiLabel}</div>
        </div>
        <div class="aqi-value" style="color:${aqiColor}">${aqi}</div>
        <div class="aqi-label">US AQI</div>
        <div class="aqi-bar">
          <div class="aqi-needle" id="aqi-needle" style="left:0%"></div>
        </div>
        <div class="aqi-pollutants">
          <div class="aqi-pol"><div class="aqi-pol-name">PM2.5</div><div class="aqi-pol-val">${pm25}</div></div>
          <div class="aqi-pol"><div class="aqi-pol-name">PM10</div><div class="aqi-pol-val">${pm10}</div></div>
          <div class="aqi-pol"><div class="aqi-pol-name">CO</div><div class="aqi-pol-val">${co}</div></div>
          <div class="aqi-pol"><div class="aqi-pol-name">NO₂</div><div class="aqi-pol-val">${no2}</div></div>
          <div class="aqi-pol"><div class="aqi-pol-name">O₃</div><div class="aqi-pol-val">${o3}</div></div>
        </div>
      </div>`;

    setTimeout(() => {
      const needle = document.getElementById('aqi-needle');
      if (needle) needle.style.left = aqiPct + '%';
    }, 300);
  }

  const alerts = generateAlerts(c, dl, uvMax);
  let alertHTML = '';
  if (alerts.length > 0) {
    alertHTML = `
      <div class="alerts-card anim-up delay-3">
        <div class="section-label" style="margin-bottom:14px">⚠️ Weather Advisories</div>
        ${alerts.map(a => `
          <div class="alert-item">
            <div class="alert-dot" style="background:${a.color}"></div>
            <div>
              <div class="alert-text">${a.title}</div>
              <div class="alert-meta">${a.desc}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  const blips = generateRadarBlips(rain, wcode);
  const radarHTML = `
    <div class="radar-card glass anim-up delay-6">
      <div class="section-label">🌧 Precipitation Radar</div>
      <div class="radar-display">
        <div class="radar-rings">
          <div class="radar-ring" style="width:180px;height:180px"></div>
          <div class="radar-ring" style="width:120px;height:120px"></div>
          <div class="radar-ring" style="width:60px;height:60px"></div>
          <div class="radar-sweep"></div>
          <div class="radar-center"></div>
          ${blips}
        </div>
        <div class="radar-label">LIVE RADAR</div>
      </div>
      <div class="radar-info-grid">
        <div class="radar-info-item">
          <div class="radar-info-val">${rain}%</div>
          <div class="radar-info-lbl">Precip. Chance</div>
        </div>
        <div class="radar-info-item">
          <div class="radar-info-val">${wind} km/h</div>
          <div class="radar-info-lbl">Wind Speed</div>
        </div>
        <div class="radar-info-item">
          <div class="radar-info-val">${getWindDir(c.winddirection_10m)}</div>
          <div class="radar-info-lbl">Wind Direction</div>
        </div>
      </div>
    </div>`;

  const sunPct = computeSunPosition(sunrise, sunset);

  document.getElementById('out').innerHTML = `
    <div class="dash">

      <div class="left-stack">

        <div class="hero-card anim-left delay-1">
          <div class="hero-loc">${country}</div>
          <div class="hero-city">${name}</div>
          <div class="hero-date">${today}</div>
          <div class="weather-icon-wrap">
            <img src="${getIcon(c.weathercode)}" alt="${getCondition(c.weathercode)}">
          </div>
          <div class="hero-temp" id="hero-temp-val">${dispTemp}<sup>${sym}</sup></div>
          <div class="hero-cond">${getCondition(c.weathercode)}</div>
          <div class="hero-fl">Feels like ${dispFeel}${sym}</div>
          <div class="weather-badge">💧 ${hum}% &nbsp;·&nbsp; 💨 ${wind} km/h &nbsp;·&nbsp; 🔵 ${pres} hPa</div>
          <button class="globe-btn" onclick="openGlobe(${lastCity.lat}, ${lastCity.lon}, '${name}')">
            🌍 View on 3D Globe
          </button>
        </div>

        <div class="mini-stats">
          <div class="mstat glass anim-up delay-2">
            <div class="mstat-icon">💨</div>
            <div class="mstat-val" data-count="${wind}">${wind}<span> km/h</span></div>
            <div class="mstat-lbl">Wind</div>
          </div>
          <div class="mstat glass anim-up delay-3">
            <div class="mstat-icon">💧</div>
            <div class="mstat-val" data-count="${hum}">${hum}<span>%</span></div>
            <div class="mstat-lbl">Humidity</div>
          </div>
          <div class="mstat glass anim-up delay-4">
            <div class="mstat-icon">🌧</div>
            <div class="mstat-val" data-count="${rain}">${rain}<span>%</span></div>
            <div class="mstat-lbl">Rain</div>
          </div>
          <div class="mstat glass anim-up delay-5">
            <div class="mstat-icon">🔵</div>
            <div class="mstat-val" data-count="${pres}">${pres}<span>hPa</span></div>
            <div class="mstat-lbl">Pressure</div>
          </div>
        </div>

        <div class="sun-card glass anim-up delay-6">
          <div class="sun-title">Sunrise &amp; Sunset</div>
          <div class="sun-row">
            <div class="sun-item">
              <div class="sun-time">🌅 ${sunrise}</div>
              <div class="sun-lbl">Sunrise</div>
            </div>
            <div class="sun-arc">
              <svg viewBox="0 0 80 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#f97316" stop-opacity="0.15"/>
                  </linearGradient>
                </defs>
                <path d="M4 40 Q40 4 76 40" stroke="url(#arcGrad)" stroke-width="2" fill="none" stroke-dasharray="4 3"/>
                <circle cx="${4 + 72 * sunPct}" cy="${40 - Math.sin(sunPct * Math.PI) * 36}" r="5.5" fill="#fbbf24" opacity="0.95">
                  <animate attributeName="r" values="5.5;6.5;5.5" dur="2s" repeatCount="indefinite"/>
                </circle>
                <line x1="4" y1="40" x2="76" y2="40" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
              </svg>
            </div>
            <div class="sun-item">
              <div class="sun-time">🌇 ${sunset}</div>
              <div class="sun-lbl">Sunset</div>
            </div>
          </div>
        </div>

        ${aqiHTML}

      </div>

      <div class="right-stack">

        ${alertHTML}

        <div class="glass anim-right delay-1" style="padding:20px">
          <div class="section-label">7-day forecast</div>
          <div class="forecast-row">${fcHTML}</div>
        </div>

        <div class="glass anim-right delay-2" style="padding:20px">
          <div class="section-label">Hourly temperature — next 24 hours</div>
          <div class="hourly-row">${hrHTML}</div>
        </div>

        <div class="chart-wrap glass anim-right delay-3">
          <div class="section-label">Temperature trend this week</div>
          <canvas id="wc" height="130"></canvas>
        </div>

        <div class="feels-chart-wrap glass anim-right delay-4">
          <div class="section-label">Feels-like vs Actual (next 24h)</div>
          <canvas id="fc-chart" height="110"></canvas>
        </div>

        <div class="anim-right delay-5">
          <div class="section-label" style="margin-bottom:14px">Today's details</div>
          <div class="extras">

            <div class="extra-card glass">
              <div class="extra-top">
                <div class="extra-icon" style="background:rgba(250,204,21,0.15)">☀️</div>
                <div class="extra-lbl">UV Index</div>
              </div>
              <div class="extra-val">${uvMax}<span> / 12</span></div>
              <div class="extra-sub">${uvLabel}</div>
              <div class="bar-wrap">
                <div class="bar-fill" id="uv-bar" style="width:0%;background:${uvColor}"></div>
              </div>
            </div>

            <div class="extra-card glass">
              <div class="extra-top">
                <div class="extra-icon" style="background:rgba(96,165,250,0.15)">🌬️</div>
                <div class="extra-lbl">Wind direction</div>
              </div>
              <div class="extra-val">${getWindDir(c.winddirection_10m)}</div>
              <div class="extra-sub">${Math.round(c.winddirection_10m)}°</div>
            </div>

            <div class="extra-card glass">
              <div class="extra-top">
                <div class="extra-icon" style="background:rgba(52,211,153,0.15)">🌡️</div>
                <div class="extra-lbl">High / Low</div>
              </div>
              <div class="extra-val" style="font-size:19px">
                ${toDisp(dl.temperature_2m_max[0])}°
                <span style="opacity:.35"> / </span>
                ${toDisp(dl.temperature_2m_min[0])}°
              </div>
              <div class="extra-sub">Today's range</div>
            </div>

            <div class="extra-card glass">
              <div class="extra-top">
                <div class="extra-icon" style="background:rgba(167,139,250,0.15)">💦</div>
                <div class="extra-lbl">Humidity</div>
              </div>
              <div class="extra-val">${hum}<span>%</span></div>
              <div class="extra-sub">${humLabel}</div>
              <div class="bar-wrap">
                <div class="bar-fill" id="hum-bar" style="width:0%;background:#a78bfa"></div>
              </div>
            </div>

          </div>
        </div>

        ${radarHTML}

      </div>
    </div>`;

  setTimeout(() => {
    const uvBar  = document.getElementById('uv-bar');
    const humBar = document.getElementById('hum-bar');
    if (uvBar)  uvBar.style.width  = uvPct + '%';
    if (humBar) humBar.style.width = hum + '%';
  }, 400);

  animateCounters();

  renderChart(dl);
  renderFeelsChart(hr, nowHour);
}

function animateCounters() {
  const els = document.querySelectorAll('.mstat-val[data-count]');
  els.forEach(el => {
    const target = parseInt(el.getAttribute('data-count'));
    const suffix = el.querySelector('span') ? el.querySelector('span').outerHTML : '';
    let start = 0;
    const dur = 800;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const prog = Math.min((timestamp - start) / dur, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      const curr = Math.round(ease * target);
      el.innerHTML = curr + suffix;
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

function computeSunPosition(sunriseStr, sunsetStr) {
  try {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const [srH, srM] = sunriseStr.split(':').map(Number);
    const [ssH, ssM] = sunsetStr.split(':').map(Number);
    const srMins = srH * 60 + srM;
    const ssMins = ssH * 60 + ssM;
    const pct = Math.max(0, Math.min(1, (nowMins - srMins) / (ssMins - srMins)));
    return pct;
  } catch { return 0.5; }
}

function generateAlerts(c, dl, uvMax) {
  const alerts = [];
  const wind = c.windspeed_10m;
  const rain = dl.precipitation_probability_max[0] || 0;
  const temp = c.temperature_2m;

  if (wind > 50) alerts.push({ title: '🌪 High Wind Warning', desc: `Wind speeds reaching ${Math.round(wind)} km/h. Secure outdoor items.`, color: '#fb923c' });
  if (rain > 70) alerts.push({ title: '🌧 Heavy Rain Advisory', desc: `${Math.round(rain)}% chance of precipitation. Carry an umbrella.`, color: '#60a5fa' });
  if (uvMax >= 8) alerts.push({ title: '☀️ High UV Alert', desc: `UV index of ${uvMax}. Apply SPF 30+ and seek shade midday.`, color: '#facc15' });
  if (temp >= 35) alerts.push({ title: '🥵 Heat Warning', desc: `Extreme heat of ${Math.round(temp)}°C. Stay hydrated and avoid direct sun.`, color: '#f87171' });
  if (temp <= 0) alerts.push({ title: '🧊 Freezing Conditions', desc: `Temperature at or below 0°C. Ice possible on roads.`, color: '#93c5fd' });
  if (c.weathercode >= 95) alerts.push({ title: '⛈ Thunderstorm Warning', desc: 'Thunderstorms likely. Avoid open areas and tall trees.', color: '#c084fc' });

  return alerts;
}

function generateRadarBlips(rainChance, wcode) {
  if (rainChance < 20 && wcode < 50) return '';
  const count = Math.floor((rainChance / 100) * 12) + 2;
  let html = '';
  const colors = ['rgba(96,165,250,', 'rgba(56,189,248,', 'rgba(99,102,241,'];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist  = Math.random() * 40 + 10;
    const x = 50 + Math.cos(angle) * dist;
    const y = 50 + Math.sin(angle) * dist;
    const size = Math.random() * 8 + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const delay = Math.random() * 4;
    html += `<div class="radar-blip" style="
      left:${x}%;top:${y}%;
      width:${size}px;height:${size}px;
      background:${color}0.7);
      animation-delay:${delay}s;
      transform:translate(-50%,-50%)
    "></div>`;
  }
  return html;
}

function renderChart(dl) {
  if (chart) chart.destroy();
  const ctx = document.getElementById('wc').getContext('2d');
  const labels   = dl.time.slice(0, 7).map((day, i) => i === 0 ? 'Today' : new Date(day).toLocaleDateString('en-US', { weekday: 'short' }));
  const hiTemps  = dl.temperature_2m_max.slice(0, 7).map(v => toDisp(v));
  const loTemps  = dl.temperature_2m_min.slice(0, 7).map(v => toDisp(v));

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'High',
          data: hiTemps,
          borderColor: '#60a5fa',
          borderWidth: 2.5,
          tension: 0.4,
          pointBackgroundColor: '#60a5fa',
          pointRadius: 5,
          fill: {
            target: 'origin',
            above: 'rgba(96,165,250,0.07)'
          }
        },
        {
          label: 'Low',
          data: loTemps,
          borderColor: 'rgba(167,139,250,0.75)',
          borderWidth: 2,
          tension: 0.4,
          pointBackgroundColor: 'rgba(167,139,250,0.75)',
          pointRadius: 4,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: {
        legend: { labels: { color: 'rgba(255,255,255,0.45)', font: { size: 12 }, boxWidth: 14, padding: 14 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}${unitSym()}` } }
      },
      scales: {
        x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false } },
        y: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 11 }, callback: v => v + '°' }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false } }
      }
    }
  });
}

function renderFeelsChart(hr, nowHour) {
  if (feelsChart) feelsChart.destroy();
  const ctx = document.getElementById('fc-chart').getContext('2d');
  const labels = [];
  const actual = [];
  const feels  = [];

  for (let i = 0; i < 24; i++) {
    const idx  = nowHour + i;
    const hour = idx % 24;
    labels.push(i === 0 ? 'Now' : `${String(hour).padStart(2,'0')}:00`);
    actual.push(hr.temperature_2m[idx] != null ? toDisp(hr.temperature_2m[idx]) : null);
    feels.push(hr.apparent_temperature[idx] != null ? toDisp(hr.apparent_temperature[idx]) : null);
  }

  feelsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Actual',
          data: actual,
          borderColor: '#34d399',
          borderWidth: 2,
          tension: 0.45,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Feels Like',
          data: feels,
          borderColor: 'rgba(251,191,36,0.8)',
          borderWidth: 2,
          tension: 0.45,
          pointRadius: 0,
          borderDash: [5, 4],
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 1000, easing: 'easeOutQuart' },
      plugins: {
        legend: { labels: { color: 'rgba(255,255,255,0.45)', font: { size: 11 }, boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}${unitSym()}` } }
      },
      scales: {
        x: {
          ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 }, maxTicksLimit: 8 },
          grid:  { display: false },
          border: { display: false }
        },
        y: {
          ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 10 }, callback: v => v + '°' },
          grid:  { color: 'rgba(255,255,255,0.04)' },
          border: { display: false }
        }
      }
    }
  });
}

function openGlobe(lat, lon, cityName) {
  const modal = document.getElementById('globe-modal');
  modal.classList.remove('hidden');
  document.getElementById('globe-info').textContent = `📍 ${cityName} — ${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;

  if (globeAnimId) cancelAnimationFrame(globeAnimId);
  if (globeRenderer) { globeRenderer.dispose(); globeRenderer = null; }
  globeInitialized = false;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initGlobe(lat, lon);
      globeInitialized = true;
    });
  });
}

function closeGlobe() {
  document.getElementById('globe-modal').classList.add('hidden');
  if (globeAnimId) { cancelAnimationFrame(globeAnimId); globeAnimId = null; }
}

function initGlobe(lat, lon) {
  const canvas = document.getElementById('globe-canvas');

  const rect = canvas.getBoundingClientRect();
  const W = Math.round(rect.width)  || 460;
  const H = Math.round(rect.height) || 340;
  canvas.width  = W;
  canvas.height = H;

  try {
    globeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch(e) {
    document.getElementById('globe-info').textContent = '⚠️ WebGL not supported in your browser.';
    return;
  }

  globeRenderer.setSize(W, H, false);
  globeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  globeRenderer.setClearColor(0x000000, 0);

  globeScene  = new THREE.Scene();
  globeCamera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
  globeCamera.position.set(0, 0, 2.8);
  globeCamera.lookAt(0, 0, 0);

  globeScene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xaaccff, 1.4);
  sun.position.set(5, 3, 5);
  globeScene.add(sun);
  const backLight = new THREE.DirectionalLight(0x223366, 0.4);
  backLight.position.set(-4, -2, -3);
  globeScene.add(backLight);

  const geo = new THREE.SphereGeometry(1, 64, 64);
  const mat = new THREE.MeshPhongMaterial({
    color:     0x1a3a6e,
    emissive:  0x061428,
    specular:  0x5599ff,
    shininess: 40,
  });
  globeGlobe = new THREE.Mesh(geo, mat);
  globeScene.add(globeGlobe);

  const lineMat = new THREE.LineBasicMaterial({ color: 0x2255bb, transparent: true, opacity: 0.25 });
  for (let lat = -75; lat <= 75; lat += 15) {
    const points = [];
    const phi = (90 - lat) * Math.PI / 180;
    for (let i = 0; i <= 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      points.push(new THREE.Vector3(
        -Math.sin(phi) * Math.cos(theta),
         Math.cos(phi),
         Math.sin(phi) * Math.sin(theta)
      ));
    }
    globeScene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat));
  }
  for (let lon = 0; lon < 360; lon += 20) {
    const points = [];
    const theta = lon * Math.PI / 180;
    for (let i = 0; i <= 64; i++) {
      const phi = (i / 64) * Math.PI;
      points.push(new THREE.Vector3(
        -Math.sin(phi) * Math.cos(theta),
         Math.cos(phi),
         Math.sin(phi) * Math.sin(theta)
      ));
    }
    globeScene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat));
  }

  const atmoMat = new THREE.MeshBasicMaterial({
    color: 0x2266ff,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.15
  });
  globeScene.add(new THREE.Mesh(new THREE.SphereGeometry(1.08, 32, 32), atmoMat));

  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(1800);
  for (let i = 0; i < 1800; i++) {
    starPos[i] = (Math.random() - 0.5) * 80;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  globeScene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 })));

  addCityDot(lat, lon);

  function animGlobe() {
    globeAnimId = requestAnimationFrame(animGlobe);
    globeGlobe.rotation.y += 0.004;
    globeRenderer.render(globeScene, globeCamera);
  }
  animGlobe();
}

function addCityDot(lat, lon) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const r = 1.04;

  const x =  r * Math.sin(phi) * Math.cos(theta);
  const y =  r * Math.cos(phi);
  const z = -r * Math.sin(phi) * Math.sin(theta);

  const dotMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 16), dotMat);
  dot.position.set(x, y, z);
  globeScene.add(dot);

  const haloMat = new THREE.MeshBasicMaterial({ color: 0xff6666, transparent: true, opacity: 0.35 });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), haloMat);
  halo.position.set(x, y, z);
  globeScene.add(halo);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.065, 32), ringMat);
  ring.position.set(x, y, z);
  ring.lookAt(new THREE.Vector3(x * 2, y * 2, z * 2));
  globeScene.add(ring);
}

function getCondition(code) {
  if (code === 0)  return 'Clear Sky';
  if (code <= 3)   return 'Partly Cloudy';
  if (code <= 48)  return 'Foggy';
  if (code <= 67)  return 'Rainy';
  if (code <= 77)  return 'Snowy';
  if (code <= 82)  return 'Rain Showers';
  return 'Thunderstorm';
}

function getIcon(code) {
  if (code === 0)  return 'https://cdn-icons-png.flaticon.com/512/869/869869.png';
  if (code <= 3)   return 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png';
  if (code <= 67)  return 'https://cdn-icons-png.flaticon.com/512/414/414974.png';
  if (code <= 77)  return 'https://cdn-icons-png.flaticon.com/512/642/642102.png';
  return 'https://cdn-icons-png.flaticon.com/512/1146/1146869.png';
}

function getWindDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}