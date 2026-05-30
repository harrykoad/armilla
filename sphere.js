const HALO_PRIMARY = 21.89
const HALO_SECONDARY = 45.87
const RAINBOW_PRIMARY = 41.91
const RAINBOW_SECONDARY = 51.19

function meridian(theta, phi0 = 90) {
	let pts = []
	for(let p = -phi0; p <= phi0; p += 2) pts.push(toXYZ(theta, p))
	return pts}
function parallel(phi) {
	let pts = []
	for(let t = 0; t <= 360; t += 2) pts.push(toXYZ(t, phi))
	return pts}
const GRATICULE = []
for(let t = 0; t < 360; t += 30) GRATICULE.push(meridian(t, mod(t, 30) === 0 ? 90 : 75))
for(let p = -60; p <= 60; p += 30) GRATICULE.push(parallel(p))

function pushGraticule(name, rotation, color) {
	let k = name === "ecliptic" ? param.julianDay.toFixed(10) :
		name === "horizontal" ? param.sidereal.toFixed(10) + "|" + param.latitude.toFixed(10) : "equatorial"
	if(!cache.graticule[name] || cache.graticule[name].key !== k)
		cache.graticule[name] = {key: k, lines: GRATICULE.map(pts => pts.map(rotation))}
	for(let pts of cache.graticule[name].lines) pushLines({points: pts, color, width: 0.75})}

function pushAnalemma() {
	let k = [param.latitude.toFixed(10), param.longitude.toFixed(10),
		param.year, param.dayOfYear, param.time.toFixed(10)].join("|")
	if(!cache.analemma || cache.analemma.key !== k) {
		let v = []
		let jd0 = getJulianDay(param.year, 1, 1, param.time, param.timeZone)
		for(let d = 0; d <= 366; d += 2) {
			let jc = (jd0 + d - 2451545) / 36525
			let sidereal = getSidereal(jc, param.longitude)
			let ts = translate(scale(geoMoon(jc)[0], 1 / MASS_FACTOR),
				negate(translate(helioEMB(jc), getGeoObserver(sidereal, param.latitude))))
			v.push(normalize(mdot(mul(rotateX(-(90 - param.latitude)),
				rotateZ(-(90 + sidereal))), fromNirayana(ts))))}
		cache.analemma = {key: k, vectors: v.map(fromHorizontal)}}
	pushLines({points: cache.analemma.vectors, color: color.sun, width: 2, dash: [5, 5]})}

function pushSolarSystem() {
	let k = param.julianDay.toFixed(10)
	if(!cache.solarSystem || cache.solarSystem.key !== k)
		cache.solarSystem = {key: k, vectors: solarSystem()}
	let v = cache.solarSystem.vectors.map(p => [p[0], p[1], p[2]])
	if(mode.orientation === "horizontal")
		v = v.map((p, i, arr) => i === arr.length - 1 ? p : translate(p, negate(geoObserver)))
	let dM = Math.hypot(...v[0]) * KM_PER_AU
	let dS = Math.hypot(...v[1]) * KM_PER_AU
	let OMG = toTP(v[9])[0]
	v = v.map(p => normalize(fromNirayana(p)))

	let c = mode.darkTheme ? "white" : "black"
	if(show.moonsOrbit) {
		let m = mdot(mul(rotateZ(-OMG), rotateX(-param.obliquity)), v[9])
		let i = Math.abs(Math.atan2(m[2], m[1])) / DEGREE
		i = Math.abs(i - 5.15) > 0.01 ? 5.15 : i
		let r = p => fromNirayana(mdot(mul(rotateZ(OMG), rotateX(i)), p))
		pushLines({points: parallel(0).map(r), color: color.moon, width: 2})
		pushPoints([
			{position: v[9], name: "Rāhu"},
			{position: negate(v[9]), name: "Ketu"}].map(p => ({
				position: p.position,
				point: {size: 6, color: color.rahu, border: 2, edge: c},
				text: {text: p.name, color: c}})))}
	pushPoints([
		{position: v[8], name: "Neptune", color: color.neptune, show: show.planets},
		{position: v[7], name: "Uranus", color: color.uranus, show: show.planets},
		{position: v[6], name: "Saturn", color: color.saturn, show: show.planets},
		{position: v[5], name: "Jupiter", color: color.jupiter, show: show.planets},
		{position: v[4], name: "Mars", color: color.mars, show: show.planets},
		{position: v[3], name: "Venus", color: color.venus, show: show.planets},
		{position: v[2], name: "Mercury", color: color.mercury, show: show.planets},
		{position: v[1], name: "Sun", color: color.sun, show: show.sun},
		{position: v[0], name: "Moon", color: color.moon, show: show.moon}].filter(p => p.show).map(p => ({
			position: p.position,
			point: {size: 6, color: p.color, border: 2, edge: c},
			text: {text: p.name, color: c}})))

	let [altM, altS] = v.slice(0, 2).map(q => toTP(toHorizontal(q))[1])
	let [aM, aS] = v.slice(0, 2).map(negate)
	let [[tM, pM], [tS, pS], [taM, paM], [taS, paS]] = [v[0], v[1], aM, aS].map(toTP)
	let [fM, fS, faM, faS] = [[tM, pM], [tS, pS], [taM, paM], [taS, paS]].map(([t, p]) =>
		q => mdot(mul(rotateZ(t), rotateY(90 - p)), q))
	let fullMoon = Math.acos(clip(vdot(aS, v[0]), -1, 1)) / DEGREE <= 12
	if(show.eclipses) {
		let dU = dS * EARTH_A / (SUN_R - EARTH_A)
		pushPoints([v[0], v[1], aS].map(p => ({position: p,
			point: {size: 5, color: (p === v[0]) ? color.moon : color.sun, border: 0}})))
		pushLines({points: parallel(90 - Math.atan(MOON_R / dM) / DEGREE).map(fM),
			color: color.moon, width: 2})
		pushLines({points: parallel(90 - Math.atan(SUN_R / dS) / DEGREE).map(fS),
			color: color.sun, width: 2})
		let rA = p => mdot(mul(rotateZ(taS), rotateY(90 - paS)), p)
		pushLines({points: parallel(90 - Math.atan(EARTH_A * (dU - dM) / dU / dM) / DEGREE).map(rA),
			color: color.sun, width: 2})
		pushLines({points: parallel(90 - Math.atan(EARTH_A * (dS + dM) / dS / dM) / DEGREE).map(rA),
			color: color.sun, width: 2, dash: [5, 5]})}
	if(show.halo) {
		if(altS >= 0) {
			let ph = parallel(90 - HALO_PRIMARY).map(fS)
			let p = []
			for(let i = 0; i < ph.length; i++) {
				if(toTP(toHorizontal(ph[i]))[1] > 0) p.push(ph[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
			let sh = parallel(90 - HALO_SECONDARY).map(fS)
			p = []
			for(let i = 0; i < sh.length; i++) {
				if(toTP(toHorizontal(sh[i]))[1] > 0) p.push(sh[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})}
		else if(altM >= 0 && fullMoon) {
			let ph = parallel(90 - HALO_PRIMARY).map(fM)
			let p = []
			for(let i = 0; i < ph.length; i++) {
				if(toTP(toHorizontal(ph[i]))[1] > 0) p.push(ph[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
			let sh = parallel(90 - HALO_SECONDARY).map(fM)
			p = []
			for(let i = 0; i < sh.length; i++) {
				if(toTP(toHorizontal(sh[i]))[1] > 0) p.push(sh[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})}}
	if(show.rainbow) {
		if(altS >= 0 && altS <= RAINBOW_SECONDARY) {
			pushPoints([{position: aS, point: {size: 5, color: color.sun, border: 0}}])
			let pr = parallel(90 - RAINBOW_PRIMARY).map(faS)
			let p = []
			for(let i = 0; i < pr.length; i++) {
				if(toTP(toHorizontal(pr[i]))[1] > 0) p.push(pr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
			let sr = parallel(90 - RAINBOW_SECONDARY).map(faS)
			p = []
			for(let i = 0; i < sr.length; i++) {
				if(toTP(toHorizontal(sr[i]))[1] > 0) p.push(sr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})}
		else if(altM >= 0 && altM <= RAINBOW_SECONDARY && fullMoon) {
			pushPoints([{position: aM, point: {size: 5, color: color.moon, border: 0}}])
			let pr = parallel(90 - RAINBOW_PRIMARY).map(faM)
			let p = []
			for(let i = 0; i < pr.length; i++) {
				if(toTP(toHorizontal(pr[i]))[1] > 0) p.push(pr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
			let sr = parallel(90 - RAINBOW_SECONDARY).map(faM)
			p = []
			for(let i = 0; i < sr.length; i++) {
				if(toTP(toHorizontal(sr[i]))[1] > 0) p.push(sr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})}}}
