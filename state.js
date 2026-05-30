const UI = new Proxy({}, {get(obj, id) {if(!obj[id]) obj[id] = document.getElementById(id); return obj[id]}})

const buffer = {backLines: [], backStars: [], backPoints: [], backTexts: [],
	frontLines: [], frontStars: [], frontPoints: [], frontTexts: []}
const cache = {stars: null, graticule: {}, solarSystem: null, analemma: null}
const color = {ecliptic: "red", equatorial: "blue", horizontal: "#00c000", galactic: "#c000c0",
	constellations: "gray", zodiac: "orange", moon: "#c0c000", sun: "red", mercury: "green", venus: "cyan",
	mars: "magenta", jupiter: "orange", saturn: "purple", uranus: "#00ff80", neptune: "#0080ff", rahu: "gray"}
const input = {dragging: false, lastX: 0, lastY: 0, drawing: false, drawPath: [],
	activePointers: new Map(), pinchStartDist: null}
const matrix = {fromNirayana: null, toNirayana: null, fromHorizontal: null, toHorizontal: null,
	fromEquatorialJ2000: null, fromGalactic: null, fromScreen: null, toScreen: null}
const mode = {orientation: "horizontal", darkTheme: true, draw: false}
const param = {latitude: 8.64, longitude: 99.90, timeZone: 7, year: 2000, month: 1, day: 1,
	time: 180, dayOfYear: 1, yearDays: 366, julianDay: 0, julianCentury: 0,
	ayanamsa: 0, ayanamsaJ2000: 0, obliquity: 0, obliquityJ2000: 0, sidereal: 0}
const modal = {temp: {fallback: null, year: null, month: null, day: null,
		hour: null, minute: null, longitude: null, julianDay: null},
	horary: {frame: [], slots: [], stars: [], constellations: [], zodiac: []},
	lunar: {},
	world: {map: new Image(), graticule: [], equator: []}}
const show = {sphere: true, stars: true, milkyWay: true, constellations: true, zodiac: true,
	ecliptic: true, eclipticAxes: true, eclipticMeridian: false, eclipticGraticule: false, precessionCircles: false,
	equator: true, equatorialAxes: true, equatorialMeridian: false, equatorialGraticule: false, circumpolarCircles: false,
	horizon: true, horizontalAxes: true, horizontalMeridian: false, horizontalGraticule: true, observerMeridian: false,
	sun: true, moon: true, planets: false, analemma: false, moonsOrbit: false, eclipses: false, halo: false, rainbow: false}
const update = {view: true, sky: true}
const view = {w: 200, h: 100, f: 10, /* w / 2 */x0: 100, /* h / 2 */y0: 50, /* 1 / f */z0: 0.1,
	/* 0.45 * min(w, h) */r0: 45, yaw: 0, pitch: 0, roll: 0, orienting: false}
