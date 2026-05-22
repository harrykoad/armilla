function meridian(theta, phi0 = 90) {
	let pts = []
	for(let p = -phi0; p <= phi0; p += 2) pts.push(toXYZ(theta, p))
	return pts}

function parallel(phi) {
	let pts = []
	for(let t = 0; t <= 360; t += 2) pts.push(toXYZ(t, phi))
	return pts}

const GRATICULE = []
for(let t = 0; t < 360; t += 30) {
	let p0 = (mod(t, 30) === 0) ? 90 : 75
	GRATICULE.push(meridian(t, p0))}
for(let p = -90; p <= 90; p += 30) {
	if(p === -90 || p === 90) continue
	GRATICULE.push(parallel(p))}

function updateGraticuleCache(name, rotation) {
	let k = name === "ecliptic" ? param.julianDay.toFixed(10) :
		name === "horizontal" ? param.sidereal.toFixed(10) + "|" + param.latitude.toFixed(10) : "equatorial"
	if(cache.graticule[name] && cache.graticule[name].key === k) return
	cache.graticule[name] = {key: k, lines: GRATICULE.map(pts => pts.map(rotation))}}

function pushGraticule(name, rotation, color) {
	updateGraticuleCache(name, rotation)
	for(let pts of cache.graticule[name].lines) pushLines({points: pts, color, width: 0.75})}

function updateStarsCache() {
	let k = param.julianDay.toFixed(10)
	if(cache.stars && cache.stars.key === k) return
	cache.stars = {key: k, vectors: STARS.map(p => {
		if(p[0] === 0 && p[1] === 0 && p[2] === 0) return [0, 0, 0]
		return fromNirayana(p)})}}

function pushSolarSystem() {
	updateSolarSystemCache()
	let v = cache.solarSystem.vectors.map(p => [p[0], p[1], p[2]])
	if(mode.orientation === "horizontal") {
		let go = geoObserver
		v = v.map((p, i, arr) => i === arr.length - 1 ? p : [p[0] - go[0], p[1] - go[1], p[2] - go[2]])}
	let dM = Math.hypot(...v[0]) * KM_PER_AU
	let dS = Math.hypot(...v[1]) * KM_PER_AU
	let OMG = toTP(v[9])[0]
	v = v.map(p => normalize(fromNirayana(p)))

	let [tM, pM] = toTP(v[0])
	let fM = p => dot(mul(rotateZ(tM), rotateY(90 - pM)), p)
	let aM = [-v[0][0], -v[0][1], -v[0][2]]
	let [taM, paM] = toTP(aM)
	let faM = p => dot(mul(rotateZ(taM), rotateY(90 - paM)), p)
	let altM = toTP(toHorizontal(v[0]))[1]
	let [tS, pS] = toTP(v[1])
	let fS = p => dot(mul(rotateZ(tS), rotateY(90 - pS)), p)
	let aS = [-v[1][0], -v[1][1], -v[1][2]]
	let [taS, paS] = toTP(aS)
	let faS = p => dot(mul(rotateZ(taS), rotateY(90 - paS)), p)
	let altS = toTP(toHorizontal(v[1]))[1]
	let fullMoon = Math.acos(clip(aS[0] * v[0][0] + aS[1] * v[0][1] + aS[2] * v[0][2], -1, 1)) / DEGREE <= 12
	if(show.eclipses) {
		let rM = 1737.4
		let rS = 695700
		let mAR = Math.atan(rM / dM) / DEGREE
		let sAR = Math.atan(rS / dS) / DEGREE
		let l = dS * EARTH_A / (rS - EARTH_A)
		let uR = EARTH_A * (l - dM) / l
		if(uR < 0) uR = 0
		let uAR = Math.atan(uR / dM) / DEGREE
		let pR = EARTH_A * (dS + dM) / dS
		let pAR = Math.atan(pR / dM) / DEGREE
		pushPoints([v[0], v[1], aS].map(p => ({
			position: p,
			point: {
				size: 5,
				color: (p === v[0]) ? color.moon : color.sun,
				border: 0}})))
		pushLines({points: parallel(90 - mAR).map(fM), color: color.moon, width: 2})
		pushLines({points: parallel(90 - sAR).map(fS), color: color.sun, width: 2})
		let rA = p => dot(mul(rotateZ(taS), rotateY(90 - paS)), p)
		pushLines({points: parallel(90 - uAR).map(rA), color: color.sun, width: 2})
		pushLines({points: parallel(90 - pAR).map(rA), color: color.sun, width: 2, dash: [5, 5]})}
	if(show.halo) {
		if(altS >= 0) {
			let ph = parallel(90 - 21.89).map(fS)
			let p = []
			for(let i = 0; i < ph.length; i++) {
				if(toTP(toHorizontal(ph[i]))[1] > 0) p.push(ph[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
			let sh = parallel(90 - 45.87).map(fS)
			p = []
			for(let i = 0; i < sh.length; i++) {
				if(toTP(toHorizontal(sh[i]))[1] > 0) p.push(sh[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})}
		else if(altM >= 0 && fullMoon) {
			let ph = parallel(90 - 21.89).map(fM)
			let p = []
			for(let i = 0; i < ph.length; i++) {
				if(toTP(toHorizontal(ph[i]))[1] > 0) p.push(ph[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
			let sh = parallel(90 - 45.87).map(fM)
			p = []
			for(let i = 0; i < sh.length; i++) {
				if(toTP(toHorizontal(sh[i]))[1] > 0) p.push(sh[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})}}
	if(show.rainbow) {
		if(altS >= 0 && altS <= 51.19) {
			pushPoints([{position: aS, point: {size: 5, color: color.sun, border: 0}}])
			let pr = parallel(90 - 41.91).map(faS)
			let p = []
			for(let i = 0; i < pr.length; i++) {
				if(toTP(toHorizontal(pr[i]))[1] > 0) p.push(pr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2})
			let sr = parallel(90 - 51.19).map(faS)
			p = []
			for(let i = 0; i < sr.length; i++) {
				if(toTP(toHorizontal(sr[i]))[1] > 0) p.push(sr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.sun, width: 2, dash: [5, 5]})}
		else if(altM >= 0 && altM <= 51.19 && fullMoon) {
			pushPoints([{position: aM, point: {size: 5, color: color.moon, border: 0}}])
			let pr = parallel(90 - 41.91).map(faM)
			let p = []
			for(let i = 0; i < pr.length; i++) {
				if(toTP(toHorizontal(pr[i]))[1] > 0) p.push(pr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2})
			let sr = parallel(90 - 51.19).map(faM)
			p = []
			for(let i = 0; i < sr.length; i++) {
				if(toTP(toHorizontal(sr[i]))[1] > 0) p.push(sr[i])
				else {
					if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})
					p = []}}
			if(p.length > 1) pushLines({points: p, color: color.moon, width: 2, dash: [5, 5]})}}

	let c = mode.darkTheme ? "white" : "black"
	if(show.moonsOrbit) {
		let m = dot(mul(rotateZ(-OMG), rotateX(-param.obliquity)), v[9])
		let i = Math.abs(Math.atan2(m[2], m[1])) / DEGREE
		i = Math.abs(i - 5.15) > 0.01 ? 5.15 : i
		let r = p => fromNirayana(dot(mul(rotateZ(OMG), rotateX(i)), p))
		pushLines({points: parallel(0).map(r), color: color.moon, width: 2})
		let pts = [{position: v[9], name: "Rāhu"},
			{position: [-v[9][0], -v[9][1], -v[9][2]], name: "Ketu"}]
		pushPoints(pts.map(p => ({
			position: p.position,
			point: {size: 6, color: color.rahu, border: 2, edge: c},
			text: {text: p.name, color: c}})))}

	let obj = [
		{position: v[8], name: "Neptune", color: color.neptune, show: show.planets},
		{position: v[7], name: "Uranus", color: color.uranus, show: show.planets},
		{position: v[6], name: "Saturn", color: color.saturn, show: show.planets},
		{position: v[5], name: "Jupiter", color: color.jupiter, show: show.planets},
		{position: v[4], name: "Mars", color: color.mars, show: show.planets},
		{position: v[3], name: "Venus", color: color.venus, show: show.planets},
		{position: v[2], name: "Mercury", color: color.mercury, show: show.planets},
		{position: v[1], name: "Sun", color: color.sun, show: show.sun},
		{position: v[0], name: "Moon", color: color.moon, show: show.moon}]
	let visibleObj = obj.filter(o => o.show)
	pushPoints(visibleObj.map(o => ({
		position: o.position,
		point: {size: 6, color: o.color, border: 2, edge: c},
		text: {text: o.name, color: c}})))}
