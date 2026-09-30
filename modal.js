function initializeModalGraphics() {
	// Horary Chart
	let w = 400, h = w, ppd = 1.4 // px/deg
	let x0 = w / 2, y0 = h / 2, r0 = h / 4
	let r1 = r0 + 30 * ppd, r2 = r0 + 60 * ppd
	let k1 = 0.9659258262890682 // Math.cos(15 * DEGREE)
	let k2 = 0.2588190451025207 // Math.sin(15 * DEGREE)
	let k3 = 0.7071067811865475 // Math.cos(45 * DEGREE)
	modal.horary.frame.push(...[
		[[-k2, -k1], [-k2,  k1]], [[ k2, -k1], [ k2,  k1]],
		[[-k1, -k2], [ k1, -k2]], [[-k1,  k2], [ k1,  k2]],
		[[ k2, -k2], [ k3, -k3]], [[ k2,  k2], [ k3,  k3]],
		[[-k2,  k2], [-k3,  k3]], [[-k2, -k2], [-k3, -k3]]].map(line =>
			line.map(p => [x0 + p[0] * r0, y0 - p[1] * r0])))
	modal.horary.frame.push(...Array.from({length: 12}, (_, i) => {
		let t = (0.5 - i) * PI / 6
		let ct = Math.cos(t), st = Math.sin(t)
		return [[x0 + st * r0, y0 - ct * r0], [x0 + st * r2, y0 - ct * r2]]}))
	let p3 = [
		[20,  90, 143, -33], [40,  70, 132, -22], [60,  50, 121, -11],
		[20,  90, 112,  -2], [80,  30, 110,   0], [40,  70, 101,   9],
		[60,  50,  90,  20], [20,  90,  81,  29], [40,  70,  70,  40],
		[20,  90,  50,  60]].map(p =>
			scale([p[0] * k3 + p[1] * k2, p[2] * k3 + p[3] * k2], 1 / 110))
	p3 = [[5], [1, 8], [1, 5, 8], [2, 3, 6, 7],
		[2, 3, 5, 6, 7], [1, 2, 3, 5, 6, 7], [1, 2, 3, 5, 6, 7, 8],
		[1, 2, 3, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8],
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]].map(a => a.map(i => p3[i]))
	let p4 = [
		[0, -4, 13, -21], [0,  4, 13, -21], [0,  0,  6,   2],
		[0, -4,  8,  -8], [0,  4,  8,  -8], [0,  0,  4,   4],
		[0, -4,  3,   5], [0,  4,  3,   5], [0,  0,  2,   6],
		[0, -4, -2,  18], [0,  4, -2,  18]].map(p =>
			scale([p[0] * k1 + p[1] * k2, p[2] * k1 + p[3] * k2], 1 / 8))
	p4 = [[5], [2, 8], [2, 5, 8], [3, 4, 6, 7],
		[3, 4, 5, 6, 7], [3, 4, 5, 6, 7, 8], [2, 3, 4, 5, 6, 7, 8],
		[0, 1, 3, 4, 6, 7, 9, 10], [0, 1, 3, 4, 5, 6, 7, 9, 10],
		[0, 1, 2, 3, 4, 6, 7, 8, 9, 10],
		[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]].map(a => a.map(i => p4[i]))
	let p34 = [p4,
		p3.map(a => a.map(p => [-p[0],  p[1]])),
		p3.map(a => a.map(p => [-p[1],  p[0]])),
		p4.map(a => a.map(p => [-p[1], -p[0]])),
		p3.map(a => a.map(p => [-p[1], -p[0]])),
		p3.map(a => a.map(p => [-p[0], -p[1]])),
		p4.map(a => a.map(p => [-p[0], -p[1]])),
		p3.map(a => a.map(p => [ p[0], -p[1]])),
		p3.map(a => a.map(p => [ p[1], -p[0]])),
		p4.map(a => a.map(p => [ p[1],  p[0]])),
		p3.map(a => a.map(p => [ p[1],  p[0]])),
		p3]
	for(let z = 0; z < p34.length; z++)
		for(let n = 0; n < p34[z].length; n++)
			p34[z][n].sort((a, b) => b[1] - a[1] || a[0] - b[0])
	modal.horary.slots = p34

	// World Map
	w = 360, h = 180
	modal.world.map.src = WORLD_MAP_DATA_URL
	for(let lon = -150; lon <= 150; lon += 30) {
		let x = lon + 180
		modal.world.graticule.push([[x, 0], [x, h]])}
	for(let lat = -60; lat <= 60; lat += 30) {
		let y = 90 - lat
		modal.world.graticule.push([[0, y], [w, y]])}
		modal.world.equator = [[[0, h / 2], [w, h / 2]]]
	modal.world.map.onload = () => {
		if(UI.modalBackground.style.display === "flex") updateModal()
		if(typeof requestGraphRender === "function") requestGraphRender()}}


function updateHoraryStars(jd) {
	if(modal.horary.julianDay === jd) return
	modal.horary.julianDay = jd
	modal.horary.stars = []
	modal.horary.constellations = []
	modal.horary.zodiac = []
	let x0 = 200, y0 = 200, ppd = 1.4, r1 = 142
	let mag = 0
	for(let i = 0; i < STARS.length; i++) {
		let p = getStarPosition(i, jd)
		if(p[0] === 0 && p[1] === 0 && p[2] === 0) {
			mag++
			modal.horary.stars.push(null)
			continue}
		let [lon, lat] = toTP(p)
		let pos = null
		if(lat >= -30 && lat <= 30) {
			let rt = r1 + lat * ppd
			let t = (15 - lon) * DEGREE
			pos = [x0 + Math.sin(t) * rt, y0 - Math.cos(t) * rt]}
		modal.horary.stars.push({position: pos, magnitude: mag})}
	for(let z = 0; z < CONSTELLATIONS.length; z++) {
		if(ZODIAC.includes(z)) continue
		let c = CONSTELLATIONS[z][2]
		for(let i = 0; i < c.length; i += 2) {
			let a = modal.horary.stars[c[i]]
			let b = modal.horary.stars[c[i + 1]]
			if(a && b && a.position && b.position)
				modal.horary.constellations.push([a.position, b.position])}}
	for(let z of ZODIAC) {
		let c = CONSTELLATIONS[z][2]
		for(let i = 0; i < c.length; i += 2) {
			let a = modal.horary.stars[c[i]]
			let b = modal.horary.stars[c[i + 1]]
			if(a && b && a.position && b.position)
				modal.horary.zodiac.push([a.position, b.position])}}
	modal.horary.stars = modal.horary.stars.filter(s => s && s.position)}

function lunarState(julianDay, latitude, longitude, elevation = 0) {
	let jc = (julianDay - 2451545) / 36525
	let gm = geoMoon(jc)[0]
	let gs = getGeocentricSunPosition(jc, gm)
	let go = getGeoObserver(getSidereal(jc, longitude), latitude, getAyanamsa(jc), getObliquity(jc), elevation)
	let tm = normalize(translate(gm, negate(go)))
	let ts = normalize(translate(gs, negate(go)))
	let l = toTP(tm)[0]
	let p = Math.acos(clip(vdot(tm, ts), -1, 1)) / DEGREE
	if(mod(l - toTP(ts)[0], 360) > 180) p = 360 - p
	return [gm, gs, go, l * 27 / 360, p]}

function lunarSearch(t0, latitude, longitude, elevation = 0) {
	let k = [latitude.toFixed(10), longitude.toFixed(10), elevation.toFixed(0)].join("|")
	if(!cache.lunar || cache.lunar.key !== k)
		cache.lunar = {key: k, states: new Map()}
	let lunarCache = cache.lunar
	let cachedLunarState = jd => {
		let key = Math.round(jd * 86400000)
		if(lunarCache.states.has(key)) {
			let state = lunarCache.states.get(key)
			lunarCache.states.delete(key)
			lunarCache.states.set(key, state)
			return state}
		let state = lunarState(jd, latitude, longitude, elevation)
		lunarCache.states.set(key, state)
		if(lunarCache.states.size > 5000)
			lunarCache.states.delete(lunarCache.states.keys().next().value)
		return state}
	let tmin = t0 - 16, tmax = t0 + 31, dt = 1 / 24
	let data = []
	let firstHour = Math.floor(tmin * 24), lastHour = Math.ceil(tmax * 24)
	for(let hour = firstHour; hour <= lastHour; hour++) {
		let jd = hour / 24
		let [gm, gs, go, nks, phs] = cachedLunarState(jd)
		if(data.length) {
			let p = data[data.length - 1]
			nks = p[1] + mod(nks - p[1], 27, -13.5)
			phs = p[2] + mod(phs - p[2], 360, -180)}
		data.push([jd, nks, phs])}
	let eventTime = jd => {
		jd = Math.floor(jd * 1440) / 1440
		let tz = Math.round(longitude / 15)
		let [Y, M, D, t] = getGregorian(jd, tz * 15)
		let [h, min] = toDMS(t / 15, 24, 0, 0)
		let abbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][M - 1]
		return abbr + " " + D + ", " + String(h).padStart(2, "0") + ":" +
			String(min).padStart(2, "0")}
	let stateAt = jd => {
		let i = clip(Math.round((jd - data[0][0]) / dt), 0, data.length - 1)
		let reference = data[i]
		let state = cachedLunarState(jd)
		return [reference[1] + mod(state[3] - reference[1], 27, -13.5),
			reference[2] + mod(state[4] - reference[2], 360, -180)]}
	let refine = (lo, hi, key, target) => {
		let period = key === 0 ? 27 : 360
		let valueAt = jd => {
			let state = cachedLunarState(jd)
			return mod(state[key + 3] - target, period, -period / 2)}
		return findRoot(valueAt, lo, hi, 1 / 864000)}
	let crossing = (key, target, after = t0) => {
		for(let i = 0; i < data.length - 1; i++)
			if(data[i][key + 1] <= target && data[i + 1][key + 1] >= target)
				if(data[i + 1][0] > after)
					return refine(data[i][0], data[i + 1][0], key, target)}
	let nextCrossing = (key, step, after) => {
		let target = Math.floor(stateAt(after)[key] / step) * step + step
		while(target <= data[data.length - 1][key + 1]) {
			let jd = crossing(key, target, after)
			if(jd) return jd
			target += step}
		return null}
	let formatEvent = (prefix, jd) => jd ? prefix + " " + eventTime(jd) : ""
	let naksatras = NAKSATRAS.map(([name], i) => name + " (" + (i + 1) + ")")
	let thaiMonths = ["๖", "๗", "๘", "๙", "๑๐", "๑๑", "๑๒", "๑", "๒", "๓", "๔", "๕"]
	let months = LUNAR_MONTH_NAMES.map((name, i) => name + " (" + (i + 1) + "/" + thaiMonths[i] + ")")
	let now = stateAt(t0)
	let phsIndex = mod(now[1] / 12, 30)
	let phsNumber = Math.floor(mod(phsIndex, 15)) + 1
	phsNumber = phsNumber + (phsNumber % 10 === 1 && phsNumber !== 11 ? "ˢᵗ" :
		phsNumber % 10 === 2 && phsNumber !== 12 ? "ⁿᵈ" :
		phsNumber % 10 === 3 && phsNumber !== 13 ? "ʳᵈ" : "ᵗʰ")
	let phsUntil = nextCrossing(1, 12, t0)
	let [gm, gs, go] = cachedLunarState(crossing(1, phsIndex < 15 ?
		Math.floor(now[1] / 360) * 360 + 180 : Math.floor((now[1] - 180) / 360) * 360 + 180,
		phsIndex < 15 ? t0 : tmin))
	let synMonth = Math.floor(mod(toTP(normalize(translate(gs, negate(go))))[0], 360) / 30)
	let nksIndex = mod(Math.floor(now[0]), 27)
	let nksUntil = nextCrossing(0, 1, t0)
	let nextNewMoon = nextCrossing(1, 360, t0)
	let moonEvents = []
	for(let target = Math.floor(now[1] / 180) * 180 + 180;
			target <= data[data.length - 1][2]; target += 180) {
		let jd = crossing(1, target, t0)
		if(!jd) continue
		moonEvents.push({jd,
			label: mod(target, 360) === 0 ? "Next New Moon:" : "Next Full Moon:",
			value: naksatras[mod(Math.floor(stateAt(jd)[0]), 27)],
			time: formatEvent("at", jd)})}
	moonEvents.sort((a, b) => a.jd - b.jd)
	return {
		phase: {value: phsNumber + " " + (phsIndex < 15 ? "Bright" : "Dark"),
			until: formatEvent("until", phsUntil)},
		month: {value: months[synMonth],
			until: formatEvent("until", nextNewMoon)},
		naksatra: {value: naksatras[nksIndex],
			until: formatEvent("until", nksUntil)},
		moonEvents: moonEvents.slice(0, 2)}}

function drawSharedWorldMap(ctx, options) {
	const w = options.width ?? 360, h = options.height ?? 180
	const latitude = options.latitude, longitude = options.longitude
	const elevation = options.elevation ?? 0, jd = options.julianDay
	const darkTheme = options.darkTheme ?? mode.darkTheme
	const edgeColor = options.edgeColor ?? (darkTheme ? "white" : "black")
	const showRahu = options.showRahu ?? true, showLagna = options.showLagna ?? true
	const jc = (jd - 2451545) / 36525
	const ayanamsa = getAyanamsa(jc), obliquity = getObliquity(jc)
	const sidereal = getSidereal(jc, longitude)
	const ss = solarSystem(jc).map(normalize)
	const lagna = getTopoLagna(sidereal, latitude, ayanamsa, obliquity, elevation)
	const objects = [
		{position: ss[8], label: "N", color: color.neptune},
		{position: ss[7], label: "U", color: color.uranus},
		{position: ss[6], label: "7", color: color.saturn},
		{position: ss[5], label: "5", color: color.jupiter},
		{position: ss[4], label: "3", color: color.mars},
		{position: ss[3], label: "6", color: color.venus},
		{position: ss[2], label: "4", color: color.mercury},
		...(showRahu ? [{position: ss[9], label: "8", color: color.rahu}] : []),
		{position: ss[1], label: "1", color: color.sun},
		{position: ss[0], label: "2", color: color.moon},
		...(showLagna ? [{position: lagna, label: "L", color: color.horizontal}] : [])]
	const equatorialToNirayana = mul(rotateZ(ayanamsa), rotateX(-obliquity))
	const nirayanaToWorld = mul(rotateZ(-getSidereal(jc, 0)), transpose(equatorialToNirayana))
	ctx.clearRect(0, 0, w, h)
	ctx.save()
	ctx.filter = darkTheme ? "brightness(35%)" : "brightness(35%) invert(1)"
	if(modal.world.map.complete && modal.world.map.naturalWidth > 0)
		ctx.drawImage(modal.world.map, 0, 0, w, h)
	else {ctx.filter = "none"; ctx.fillStyle = darkTheme ? "black" : "white"; ctx.fillRect(0, 0, w, h)}
	ctx.restore()
	drawLines(ctx, [{points: modal.world.graticule, color: "gray", width: 0.5}])
	const sunNormal = mdot(nirayanaToWorld, ss[1])
	const eclipticNormal = mdot(nirayanaToWorld, [0, 0, 1]), ecliptic = []
	ctx.fillStyle = "rgba(128, 128, 128, 0.75)"; ctx.beginPath()
	for(let x = 0; x <= w; x++) {
		const lon = (x - w / 2) * 360 / w * DEGREE
		const cosine = Math.cos(lon), sine = Math.sin(lon)
		const sunLatitude = Math.atan(-(sunNormal[0] * cosine + sunNormal[1] * sine) /
			sunNormal[2]) / DEGREE
		const eclipticLatitude = Math.atan(-(eclipticNormal[0] * cosine +
			eclipticNormal[1] * sine) / eclipticNormal[2]) / DEGREE
		const y = h / 2 - sunLatitude * h / 180
		x ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
		ecliptic.push([x, h / 2 - eclipticLatitude * h / 180])}
	const pole = sunNormal[2] > 0 ? h : 0
	ctx.lineTo(w, pole); ctx.lineTo(0, pole); ctx.closePath(); ctx.fill()
	drawLines(ctx, [{points: modal.world.equator, color: color.equatorial, width: 1.5},
		{points: [ecliptic], color: color.ecliptic, width: 1.5}])
	const observerX = (longitude + 180) / 360 * w
	const observerY = (90 - latitude) / 180 * h
	drawLines(ctx, [{points: [[[0, observerY], [w, observerY]], [[observerX, 0], [observerX, h]]],
		color: edgeColor, width: 1.5, dash: [5, 3]}])
	const points = objects.map(object => {
		const [lon, lat] = toTP(mdot(nirayanaToWorld, object.position))
		return {position: [mod(lon + 180, 360) / 360 * w, (90 - lat) / 180 * h],
			size: 4, color: object.color, border: 1, edge: edgeColor}})
	drawPoints(ctx, points)
	return {nirayanaToWorld, solarSystemPositions: ss, sunNormal}}

function updateModal() {
	let dpr = 2 //window.devicePixelRatio || 1
	let col = mode.darkTheme ? "white" : "black"
	let latitude = Number(UI.latitudeInput.value.replace("−", "-"))
	let longitude = modal.temp.longitude
	let elevation = modal.temp.elevation
	let jd = modal.temp.julianDay
	let horizonDip = getHorizonDip(latitude, elevation)
	UI.modalHorizonValue.textContent = (horizonDip > 0.00001 ? "−" : "") + horizonDip.toFixed(2) + "°"
	let timeZone = Math.round(longitude / 15)
	UI.modalDayOfWeekValue.textContent = getDayOfWeek(jd, timeZone)
	updateHoraryStars(jd)
	let jc = (jd - 2451545) / 36525
	let ayanamsa = getAyanamsa(jc)
	let obliquity = getObliquity(jc)
	let sidereal = getSidereal(jc, longitude)
	let ss = solarSystem(jc).map(normalize)
	let lagna = getTopoLagna(sidereal, latitude, ayanamsa, obliquity, elevation)
	let obj = [
		{position: ss[8], label: "N", name: "Neptune", color: color.neptune},
		{position: ss[7], label: "U", name: "Uranus", color: color.uranus},
		{position: ss[9], label: "8", name: "Rāhu", color: color.rahu},
		{position: ss[6], label: "7", name: "Saturn", color: color.saturn},
		{position: ss[3], label: "6", name: "Venus", color: color.venus},
		{position: ss[5], label: "5", name: "Jupiter", color: color.jupiter},
		{position: ss[2], label: "4", name: "Mercury", color: color.mercury},
		{position: ss[4], label: "3", name: "Mars", color: color.mars},
		{position: ss[0], label: "2", name: "Moon", color: color.moon},
		{position: ss[1], label: "1", name: "Sun", color: color.sun},
		{position: lagna, label: "L", name: "Lagna", color: color.horizontal}]
	let gc = parallel(0)
	let galacticN = gc.map(p => toTP(mdot(matrix.fromGalactic, p)))
	let mEN = mul(rotateZ(ayanamsa), rotateX(-obliquity))
	let equatorN = gc.map(p => toTP(mdot(mEN, p)))
	let mHN = mul(mEN, mul(rotateZ(90 + sidereal), rotateX(90 - latitude)))
	let horizonN = localHorizon(latitude, elevation).map(p => toTP(mdot(mHN, p)))
	let mNW = mul(rotateZ(-getSidereal(jc, 0)), transpose(mEN))

	{// Horary Chart
		let hor = UI.horaryChart
		let w = 400, h = w, ppd = 1.4 // px/deg
		let x0 = w / 2, y0 = h / 2, r0 = h / 4
		let r1 = r0 + 30 * ppd, r2 = r0 + 60 * ppd
		if(hor.width !== w * dpr) hor.width = w * dpr
		if(hor.height !== h * dpr) hor.height = h * dpr
		hor.style.width = w + "px"
		hor.style.height = h + "px"
		let ctx = hor.getContext("2d", {alpha: false})
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.fillStyle = mode.darkTheme ? "black" : "white"
		ctx.fillRect(0, 0, w, h)
		drawTexts(ctx, [
			{text: "TOPO", position: [x0, y0 - 14], size: 10, weight: "bold", color: "gray"},
			{text: "CEN", position: [x0, y0], size: 10, weight: "bold", color: "gray"},
			{text: "TRIC", position: [x0, y0 + 14], size: 10, weight: "bold", color: "gray"}])
		drawLines(ctx, [{points: modal.horary.frame, color: "gray", width: 0.5}])
		ctx.strokeStyle = col
		ctx.lineWidth = 0.5
		for(let r of [r0, r2]) {
			ctx.beginPath()
			ctx.arc(x0, y0, r, 0, TWO_PI)
			ctx.stroke()}
		ctx.strokeStyle = color.ecliptic
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.arc(x0, y0, r1, 0, TWO_PI)
		ctx.stroke()
		let rasis = [
			"1  Meṣa", "2  Vṛṣabha", "3  Mithuna", "4  Karkaṭa", "5  Siṃha", "6  Kanya",
			"7  Tula", "8  Vṛścika", "9  Dhanus", "10  Makara", "11  Kumbha", "12  Mīna"]
		let texts = []
		for(let i = 0; i < 12; i++) {
			let l = (-i * 30) * DEGREE
			let rt = r2 + 8
			let t = l
			if(Math.cos(l) < 0) t += PI
			if(i === 9) t += PI
			texts.push({text: rasis[i], size: 11, color: col, rotation: t,
				position: [x0 + Math.sin(l) * rt, y0 - Math.cos(l) * rt]})}
		drawTexts(ctx, texts)
		let circles = [
			{points: equatorN, color: color.equatorial, width: 1.5},
			{points: horizonN, color: color.horizontal, width: 1.5},
			{points: galacticN, color: color.galactic, width: 1.5, dash: [3, 3]}]
		for(let c of circles) {
			let points = [], pts = []
			for(let p of c.points) {
				if(p[1] >= -30 && p[1] <= 30) {
					let rt = r1 + p[1] * ppd
					let t = (15 - p[0]) * DEGREE
					pts.push([x0 + Math.sin(t) * rt, y0 - Math.cos(t) * rt])}
				else {
					if(pts.length > 1) points.push(pts)
					pts = []}}
			if(pts.length > 1) points.push(pts)
			drawLines(ctx, [{points: points, color: c.color, width: c.width, dash: c.dash}])}
		drawLines(ctx, [{points: modal.horary.zodiac, color: color.zodiac, width: 1},
			{points: modal.horary.constellations, color: color.constellations, width: 0.5}])
		ctx.fillStyle = col
		for(let s of modal.horary.stars) {
			let p = s.position
			let rt = 4.5 - s.magnitude
			if(rt < 3) ctx.fillRect(p[0] - rt * 0.5, p[1] - rt * 0.5, rt, rt)
			else {
				ctx.beginPath()
				ctx.arc(p[0], p[1], rt * 0.5, 0, TWO_PI)
				ctx.fill()}}
		let points = []
		for(let o of obj) {
			let [lon, lat] = toTP(normalize(o.position))
			if(lat >= -30 && lat <= 30) {
				let rt = r1 + lat * ppd
				let t = (15 - lon) * DEGREE
				points.push({position: [x0 + Math.sin(t) * rt, y0 - Math.cos(t) * rt],
					size: 4, color: o.color, border: 1, edge: col})}}
		drawPoints(ctx, points)
		let signs = Array.from({length: 12}, () => [])
		for(let o of [...obj].reverse()) {
			let s = Math.floor(((toTP(o.position)[0] % 360) + 360) % 360 / 30)
			signs[s].push(o)}
		texts = []
		for(let s = 0; s < 12; s++) {
			let g = signs[s]
			if(g.length === 0) continue
			let p = modal.horary.slots[s]
			p = p[Math.min(g.length, p.length) - 1]
			for(let i = 0; i < g.length; i++)
				texts.push({position: [x0 + r0 * p[i][0], y0 - r0 * p[i][1]],
					text: g[i].label, size: 10, color: col})}
		drawTexts(ctx, texts)
		let wl = 77, hl = 48
		let groups = [
			{labels: ["L", "1", "2"], x: 0, y: 0},
			{labels: ["3", "4", "5"], x: w - wl, y: 0},
			{labels: ["6", "7", "8"], x: 0, y: h - hl},
			{labels: ["", "U", "N"], x: w - wl, y: h - hl}]
		points = [], texts = []
		for(let g of groups) {
			for(let i = 0; i < g.labels.length; i++) {
				let l = g.labels[i]
				if(!l) continue
				let item = obj.find(o => o.label === l)
				let y = g.y + 8 + i * 16
				points.push({position: [g.x + 6, y],
					size: 4, color: item.color, border: 1, edge: col})
				texts.push({text: item.label + "  " + item.name, position: [g.x + 16, y + 1],
					size: 12, align: "left", color: col})}}
		drawPoints(ctx, points)
		drawTexts(ctx, texts)}

	{// Lunar Chart
		let lun = UI.lunarChart
		let w = 360, h = 80
		if(lun.width !== w * dpr) lun.width = w * dpr
		if(lun.height !== h * dpr) lun.height = h * dpr
		lun.style.width = w + "px"
		lun.style.height = h + "px"
		let ctx = lun.getContext("2d", {alpha: false})
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.fillStyle = mode.darkTheme ? "black" : "white"
		ctx.fillRect(0, 0, w, h)
		let cx = 30, cy = 30, rmax = 30, rmin = 25.42
		let lunar = lunarSearch(jd, latitude, longitude, elevation)
		let [gm, gs, go] = lunarState(jd, latitude, longitude, elevation)
		let lunarLight = normalize(translate(gs, negate(gm)))
		let lunarView = normalize(translate(go, negate(gm)))
		let lunarUp = normalize(translate(normalize(go),
			scale(lunarView, -vdot(normalize(go), lunarView))))
		if(Math.hypot(...lunarUp) === 0) lunarUp = normalize(cross([0, 0, 1], lunarView))
		if(Math.hypot(...lunarUp) === 0) lunarUp = normalize(cross([1, 0, 0], lunarView))
		let [sx, sy, sz] = mdot([...normalize(cross(lunarUp, lunarView)),
			...lunarUp, ...lunarView], lunarLight)
		let sr = Math.hypot(sx, sy)
		let rdisk = rmax * clip(
			Math.asin(MOON_R / (Math.hypot(...translate(gm, negate(go))) * KM_PER_AU)) /
			Math.asin(MOON_R / (356400 - EARTH_A)), rmin / rmax, 1)
		ctx.save()
		ctx.beginPath()
		ctx.arc(cx, cy, rdisk, 0, TWO_PI)
		ctx.clip()
		ctx.fillStyle = "gray"
		ctx.beginPath()
		ctx.arc(cx, cy, rdisk, 0, TWO_PI)
		ctx.fill()
		ctx.fillStyle = "yellow"
		if(sr < 0.000001) {
			if(sz > 0) {
				ctx.beginPath()
				ctx.arc(cx, cy, rdisk, 0, TWO_PI)
				ctx.fill()}}
		else {
			let ux = sx / sr, uy = sy / sr, vx = -uy, vy = ux, n = 72
			ctx.beginPath()
			for(let i = 0; i <= 2 * n + 1; i++) {
				let u, v
				if(i <= n) {
					let a = -PI / 2 + i * PI / n
					u = Math.cos(a)
					v = Math.sin(a)}
				else {
					v = -1 + 2 * (2 * n + 1 - i) / n
					u = -sz * Math.sqrt(Math.max(0, 1 - v * v))}
				let x = rdisk * (ux * u + vx * v)
				let y = rdisk * (uy * u + vy * v)
				if(i === 0) ctx.moveTo(cx + x, cy - y)
				else ctx.lineTo(cx + x, cy - y)}
			ctx.closePath()
			ctx.fill()}
		ctx.restore()
		ctx.strokeStyle = mode.darkTheme ? "white" : "black"
		ctx.lineWidth = 0.5
		ctx.beginPath()
		ctx.arc(cx, cy, rdisk, 0, TWO_PI)
		ctx.stroke()
		ctx.setLineDash([3, 2])
		for(let [r, c] of [[rmax, col], [rmin, "black"]]) {
			ctx.strokeStyle = c
			ctx.beginPath()
			ctx.arc(cx, cy, r, 0, TWO_PI)
			ctx.stroke()}
		ctx.setLineDash([])
		drawTexts(ctx, [
			{text: "MOON", position: [cx, cy], size: 12,
				weight: "bold", baseline: "middle", color: "black"},
			{text: ((1 + vdot(lunarView, lunarLight)) * 50).toFixed(2) + "%",
				position: [cx, 64], size: 12, align: "center", baseline: "top", color: col},
			{text: "Phase Number:",
				position: [150, 0], size: 11.5, align: "right", baseline: "top", color: col},
			{text: lunar.phase.value,
				position: [155, 0], size: 11.5, align: "left", baseline: "top", color: col},
			{text: lunar.phase.until,
				position: [w, 0], size: 11.5, align: "right", baseline: "top", color: col},
			{text: "Synodic Month:",
				position: [150, 16], size: 11.5, align: "right", baseline: "top", color: col},
			{text: lunar.month.value,
				position: [155, 16], size: 11.5, align: "left", baseline: "top", color: col},
			{text: lunar.month.until,
				position: [w, 16], size: 11.5, align: "right", baseline: "top", color: col},
			{text: "Nakṣatra:",
				position: [150, 32], size: 11.5, align: "right", baseline: "top", color: col},
			{text: lunar.naksatra.value,
				position: [155, 32], size: 11.5, align: "left", baseline: "top", color: col},
			{text: lunar.naksatra.until,
				position: [w, 32], size: 11.5, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[0] ? lunar.moonEvents[0].label : "",
				position: [150, 48], size: 11.5, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[0] ? lunar.moonEvents[0].value : "",
				position: [155, 48], size: 11.5, align: "left", baseline: "top", color: col},
			{text: lunar.moonEvents[0] ? lunar.moonEvents[0].time : "",
				position: [w, 48], size: 11.5, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[1] ? lunar.moonEvents[1].label : "",
				position: [150, 64], size: 11.5, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[1] ? lunar.moonEvents[1].value : "",
				position: [155, 64], size: 11.5, align: "left", baseline: "top", color: col},
			{text: lunar.moonEvents[1] ? lunar.moonEvents[1].time : "",
				position: [w, 64], size: 11.5, align: "right", baseline: "top", color: col}])}

	{// World Map
		let map = UI.worldMap
		let w = 360, h = 180
		if(map.width !== w * dpr) map.width = w * dpr
		if(map.height !== h * dpr) map.height = h * dpr
		map.style.width = w + "px"
		map.style.height = h + "px"
		let ctx = map.getContext("2d", {alpha: false})
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		drawSharedWorldMap(ctx, {julianDay: jd, latitude, longitude, elevation,
			darkTheme: mode.darkTheme, edgeColor: col})}}

function initSharedParameterModal(target) {
	const style = document.createElement("style")
	style.textContent = `
		.modalBackground {align-items:center; background:rgba(255,255,255,.5); color:white;
			display:none; height:100%; justify-content:center; left:0; position:fixed; top:0;
			width:100%; z-index:10000}
		.modal {background:black; border:1px solid gray; border-radius:10px; color:white; font-size:12px;
			padding:10px; text-align:center; user-select:none}
		.modal {box-sizing:content-box}
		.modal .columns {column-gap:10px; display:grid; grid-template-columns:auto auto; margin-top:2px}
		.modal canvas {box-sizing:content-box; display:block; touch-action:none}
		.modalRight {border-left:1px solid gray; box-sizing:content-box; padding-left:10px; width:360px}
		.modal .row {align-items:center; display:flex; justify-content:flex-start; margin-top:2px}
		.modal .row > div {align-items:center !important; align-self:center}
		.modal .row input, .modal .row span {vertical-align:middle}
		.modalCell {align-items:center; display:flex; white-space:nowrap}
		.modal input.textInput {background:var(--field-background, #3b3b3b); border:1px solid gray;
			border-radius:5px; color:var(--field-color, white);
			box-sizing:content-box; font-family:Arial; font-size:12px; font-weight:400; height:auto; line-height:normal;
			margin:0; padding:2px 4px; text-align:center}
		.modal input[type="radio"] {accent-color:white; height:auto; margin:0 3px 0 5px; padding:0; width:auto}
		.modalSecondaryLabel {color:gray}
		.horizontalLine {border-top:1px solid gray; display:block; height:0; margin:7px 0; width:100%}
		.modal .horizontalLine {margin-bottom:10px; margin-top:10px}
		.longButton {background:#efefef; border:1px solid gray; border-radius:6px; color:black;
			box-sizing:border-box; cursor:pointer; font-size:10pt; font-weight:bold; height:24px;
			padding:0; text-align:center; width:70px}
		`
	document.head.appendChild(style)

	const background = document.createElement("div")
	background.id = "modalBackground"
	background.className = "modalBackground"
	background.innerHTML = `
		<div class="modal">
			<div class="columns" style="column-gap: 10px; grid-template-columns: auto auto">
				<canvas id="horaryChart" width="320" height="320" style="cursor: crosshair"></canvas>
				<div class="modalRight">
					<canvas id="lunarChart" width="360" height="80" style="cursor: default; margin-bottom: 5px"></canvas>
					<canvas id="worldMap" width="360" height="180" style="border: 1px solid gray; cursor: crosshair; margin-bottom: 10px; margin-top: 5px"></canvas>
					<div class="row modalLocationRow" style="align-items: center; display: flex; justify-content: space-between; margin-bottom: 5px; width: 100%">
						<div style="align-items: center; display: flex; justify-self: start; white-space: nowrap">Lat.:&nbsp;<input type="text" id="latitudeInput" class="textInput" value="N/A" style="width: 40px">&nbsp;°</div>
						<div style="align-items: center; display: flex; justify-self: center; white-space: nowrap">Lon.:&nbsp;<input type="text" id="longitudeInput" class="textInput" value="N/A" style="width: 45px">&nbsp;°</div>
						<div style="align-items: center; column-gap: 4px; display: flex; white-space: nowrap">
							<div style="align-items: center; display: flex; white-space: nowrap">Elv.:&nbsp;<input type="text" id="elevationInput" class="textInput" value="N/A" style="width: 40px">&nbsp;m</div>
							<div id="modalHorizonGroup" class="modalSecondaryLabel" style="white-space: nowrap">(Hor.:<span id="modalHorizonValue" style="display: inline-block; text-align: right; width: 38px">0.00°</span>)</div>
						</div>
					</div>
					<span class="horizontalLine"></span>
					<div class="row" style="display: grid; grid-template-columns: auto 1fr auto; margin-bottom: 5px; margin-top: 5px; width: 100%">
						<div style="align-items: center; display: flex; justify-self: start; white-space: nowrap">Year:&nbsp;
							<input type="radio" id="eraAD" name="era" value="AD" checked>AD&nbsp;
							<input type="text" id="yearInput" class="textInput" value="N/A" style="width: 40px">
							<input type="radio" id="eraBC" name="era" value="BC">BC
						</div>
						<div style="align-items: center; display: flex; justify-self: center; white-space: nowrap">Month:&nbsp;<input type="text" id="monthInput" class="textInput" value="N/A" style="width: 20px"></div>
						<div style="align-items: center; display: flex; justify-self: end; white-space: nowrap">Day:&nbsp;<input type="text" id="dayInput" class="textInput" value="N/A" style="width: 20px">&nbsp;<span class="modalSecondaryLabel">(<span id="modalDayOfWeekValue" style="display: inline-block; text-align: center; width: 25px">N/A</span>)</span></div>
					</div>
					<div class="row" style="display: grid; grid-template-columns: auto 1fr auto; margin-bottom: 15px; width: 100%">
						<div style="align-items: center; display: flex; justify-self: start; white-space: nowrap">Local Time:&nbsp;<input type="text" id="hourInput" class="textInput" value="N/A" style="width: 20px">&nbsp;:&nbsp;<input type="text" id="minuteInput" class="textInput" value="N/A" style="width: 20px">&nbsp;<span class="modalSecondaryLabel">(<span id="timeZoneInput"></span>)</span></div>
						<div style="align-items: center; display: flex; grid-column: 3; justify-self: end; white-space: nowrap">Julian Day:&nbsp;<input type="text" id="julianDayInput" class="textInput" value="N/A" style="width: 90px"></div>
					</div>
					<div style="display: flex; justify-content: center"><button id="modalSetButton" class="longButton">OK</button>&nbsp;&nbsp;&nbsp;<button id="modalCancelButton" class="longButton">Cancel</button></div>
				</div>
			</div>
		</div>`
	target.appendChild(background)
	if(typeof window.drawLines !== "function") window.drawLines = (ctx, lines) => {
		for(const line of lines) {
			ctx.strokeStyle = line.color; ctx.lineWidth = line.width; ctx.setLineDash(line.dash || [])
			ctx.beginPath()
			for(const points of line.points) {
				ctx.moveTo(points[0][0], points[0][1])
				for(let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])}
			ctx.stroke()}
		ctx.setLineDash([])}
	if(typeof window.drawPoints !== "function") window.drawPoints = (ctx, points) => {
		for(const point of points) {
			ctx.beginPath(); ctx.arc(point.position[0], point.position[1], point.size || 3, 0, TWO_PI)
			ctx.fillStyle = point.color || "white"; ctx.fill()
			if(point.edge) {ctx.lineWidth = point.border || 1; ctx.strokeStyle = point.edge; ctx.stroke()}}}
	if(typeof window.drawTexts !== "function") window.drawTexts = (ctx, texts) => {
		for(const text of texts) {
			ctx.font = (text.weight ? text.weight + " " : "") + (text.size || 12) + "px sans-serif"
			ctx.textAlign = text.align || "center"; ctx.textBaseline = text.baseline || "middle"
			ctx.fillStyle = text.color || "white"; ctx.save()
			ctx.translate(text.position[0], text.position[1]); ctx.rotate(text.rotation || 0)
			const lines = String(text.text).split("\n"), height = text.lineHeight || (text.size || 12) * 1.1
			for(let i = 0; i < lines.length; i++) {
				const y = (i - (lines.length - 1) / 2) * height
				if(text.edge) {ctx.lineWidth = text.border || 1; ctx.strokeStyle = text.edge; ctx.strokeText(lines[i], 0, y)}
				ctx.fillText(lines[i], 0, y)}
			ctx.restore()}}
	initializeModalGraphics()

}

function initModal(target = document.body) {
	if(typeof target === "string") target = document.querySelector(target)
	if(!(target instanceof Element))
		throw new TypeError("initModal target must be an element or a valid selector.")
	const existing = target.querySelector("#modalBackground")
	if(existing?.dataset.sharedModal === "true") return existing
	if(existing) existing.remove()
	initSharedParameterModal(target)
	const created = target.querySelector("#modalBackground")
	created.dataset.modalInitialized = "true"
	created.dataset.sharedModal = "true"
	return created}

function initializeModalEvents() {
	if(!UI.modalBackground || UI.modalBackground.dataset.eventsInitialized === "true") return
	UI.modalBackground.dataset.eventsInitialized = "true"
	const yearMin = -4999, yearMax = 5000, elevationMin = 0, elevationMax = 10000
	const signed = value => formatSignedAngleDecimal(value, 2).replace("°", "")
	function lockModalFieldPositions() {
		if(UI.modalBackground.dataset.positionsLocked === "true") return
		for(const row of UI.modalBackground.querySelectorAll(".modalRight > .row")) {
			if(row.classList.contains("modalLocationRow")) continue
			const tracks = getComputedStyle(row).gridTemplateColumns
			row.style.gridTemplateColumns = tracks}
		UI.modalBackground.dataset.positionsLocked = "true"}
	function setJulian() {
		modal.temp.julianDay = getJulianDay(modal.temp.year, modal.temp.month, modal.temp.day,
			15 * (modal.temp.hour + modal.temp.minute / 60), Math.round(modal.temp.longitude / 15))
		UI.julianDayInput.value = formatJulianDay(modal.temp.julianDay)
		UI.timeZoneInput.textContent = formatTimeZone(Math.round(modal.temp.longitude / 15))
		updateModal()}
	function setYear(value, refresh = true) {
		modal.temp.year = Math.round(clip(value, yearMin, yearMax))
		UI[modal.temp.year < 1 ? "eraBC" : "eraAD"].checked = true
		UI.yearInput.value = modal.temp.year > 0 ? modal.temp.year : 1 - modal.temp.year
		if(refresh) setDay(modal.temp.day)}
	function setMonth(value, refresh = true) {
		let month = Math.round(value), year = modal.temp.year
		while(month > 12) {month -= 12; year++}
		while(month < 1) {month += 12; year--}
		modal.temp.month = month; UI.monthInput.value = month
		setYear(year, refresh)}
	function setDay(value) {
		let day = Math.round(value), days = getMonthDays(getYearDays(modal.temp.year))
		while(day < 1 || day > days[modal.temp.month - 1]) {
			if(day > days[modal.temp.month - 1]) {day -= days[modal.temp.month - 1]; setMonth(modal.temp.month + 1, false)}
			else {setMonth(modal.temp.month - 1, false); days = getMonthDays(getYearDays(modal.temp.year)); day += days[modal.temp.month - 1]}
			days = getMonthDays(getYearDays(modal.temp.year))}
		modal.temp.day = day; UI.dayInput.value = day; setJulian()}
	function setJulianValue(value) {
		modal.temp.julianDay = clip(value, -104788, 3547638)
		const [y, month, day, time] = getGregorian(modal.temp.julianDay, modal.temp.longitude)
		const [hour, minute] = toDMS(time / 15, 24)
		setYear(y, false); modal.temp.month = month; modal.temp.day = day
		modal.temp.hour = hour; modal.temp.minute = minute
		UI.monthInput.value = month; UI.dayInput.value = day
		UI.hourInput.value = String(hour).padStart(2, "0"); UI.minuteInput.value = String(minute).padStart(2, "0")
		UI.julianDayInput.value = formatJulianDay(modal.temp.julianDay); updateModal()}
	function open() {
		const [hour, minute] = toDMS(param.time / 15, 24)
		Object.assign(modal.temp, {fallback:null, latitude:param.latitude,
			year:param.year, month:param.month, day:param.day,
			hour, minute, longitude:param.longitude, elevation:param.elevation, julianDay:param.julianDay})
		UI.latitudeInput.value = signed(param.latitude); UI.longitudeInput.value = signed(param.longitude)
		UI.elevationInput.value = param.elevation.toLocaleString("en-US")
		UI.timeZoneInput.textContent = formatTimeZone(param.timeZone)
		setYear(param.year, false); UI.monthInput.value = param.month; UI.dayInput.value = param.day
		UI.hourInput.value = String(hour).padStart(2, "0"); UI.minuteInput.value = String(minute).padStart(2, "0")
		UI.julianDayInput.value = formatJulianDay(param.julianDay); updateModal()
		UI.modalBackground.style.display = "flex"
		lockModalFieldPositions()}
	window.setModalVisible = visible => visible ? open() : UI.modalBackground.style.display = "none"
	for(const button of document.querySelectorAll(".setButton")) button.onclick = open
	UI.modalCancelButton.onclick = () => UI.modalBackground.style.display = "none"
	UI.modalSetButton.onclick = () => {
		param.latitude = parseNumber(UI.latitudeInput); param.longitude = modal.temp.longitude
		param.elevation = modal.temp.elevation; param.timeZone = Math.round(param.longitude / 15)
		param.year = modal.temp.year; param.month = modal.temp.month; param.day = modal.temp.day
		param.time = 15 * (modal.temp.hour + modal.temp.minute / 60)
		param.julianDay = getJulianDay(param.year, param.month, param.day, param.time, param.timeZone)
		if(document.getElementById("latitudeSlider")) {
			UI.latitudeSlider.value=param.latitude; UI.longitudeSlider.value=param.longitude; UI.elevationSlider.value=param.elevation
			updateLatitude(); updateLongitude(); updateYear(); updateAllRangeFills(); requestSkyRender()}
		else {
			pageUI.latitudeInput.value=param.latitude; pageUI.longitudeInput.value=param.longitude; pageUI.elevationInput.value=0; param.elevation=0
			pageUI.latitudeInput.dispatchEvent(new Event("change")); pageUI.longitudeInput.dispatchEvent(new Event("change"))
			pageUI[param.year>0?"eraAD":"eraBC"].checked=true; pageUI.yearInput.value=param.year>0?param.year:1-param.year
			pageUI.monthInput.value=param.month; pageUI.dayInput.value=param.day
			pageUI.hourInput.value=String(modal.temp.hour).padStart(2,"0"); pageUI.minuteInput.value=String(modal.temp.minute).padStart(2,"0")
			pageUI.timeZoneInput.textContent=formatTimeZone(param.timeZone); requestGraphRender()}
		UI.modalBackground.style.display="none"}
	function mapPoint(event) {const r=UI.worldMap.getBoundingClientRect(); UI.latitudeInput.value=signed(Math.round((90-clip(event.clientY-r.top,0,r.height)/r.height*180)*100)/100); const lon=Math.round((clip(event.clientX-r.left,0,r.width)/r.width*360-180)*100)/100; modal.temp.longitude=lon===-180?180:lon; UI.longitudeInput.value=signed(modal.temp.longitude); setJulian()}
	UI.worldMap.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();UI.worldMap.setPointerCapture(e.pointerId);UI.worldMap.dataset.dragging="true";mapPoint(e)}
	UI.worldMap.onpointermove=e=>{if(UI.worldMap.dataset.dragging==="true")mapPoint(e)}
	UI.worldMap.onpointerup=e=>{UI.worldMap.dataset.dragging="false";if(UI.worldMap.hasPointerCapture(e.pointerId))UI.worldMap.releasePointerCapture(e.pointerId)}
	UI.worldMap.onpointercancel=UI.worldMap.onpointerup
	addNudgeListeners(UI.latitudeInput, (direction, coarse)=>{const step=coarse?1:0.01;UI.latitudeInput.value=signed(clip(Math.round(parseNumber(UI.latitudeInput)/step)*step+direction*step,-90,90));updateModal()})
	addNudgeListeners(UI.longitudeInput, (direction, coarse)=>{const step=coarse?1:0.01;modal.temp.longitude=mod(Math.round(parseNumber(UI.longitudeInput)/step)*step+direction*step,360,-180);UI.longitudeInput.value=signed(modal.temp.longitude);setJulian()})
	addNudgeListeners(UI.elevationInput, (direction, coarse)=>{const step=coarse?100:1;modal.temp.elevation=Math.round(clip(Math.round(parseNumber(UI.elevationInput)/step)*step+direction*step,elevationMin,elevationMax));UI.elevationInput.value=modal.temp.elevation.toLocaleString("en-US");updateModal()})
	addNudgeListeners(UI.yearInput, step=>setYear(modal.temp.year+step))
	addNudgeListeners(UI.monthInput, step=>setMonth(modal.temp.month+step))
	addNudgeListeners(UI.dayInput, step=>setDay(modal.temp.day+step))
	addNudgeListeners(UI.hourInput, step=>setJulianValue(modal.temp.julianDay+step/24))
	addNudgeListeners(UI.minuteInput, step=>setJulianValue(modal.temp.julianDay+step/1440))
	addNudgeListeners(UI.julianDayInput, step=>setJulianValue(modal.temp.julianDay+step))
	function reject(input, message, previous) {
		alert(message)
		input.value = previous
		input.select()}
	UI.latitudeInput.onchange=()=>{
		const value=parseNumber(UI.latitudeInput, "")
		if(!Number.isFinite(value)||value < -90||value > 90)
			return reject(UI.latitudeInput,
				"Please enter a valid latitude from −90° to +90°.", signed(modal.temp.latitude))
		modal.temp.latitude=value; UI.latitudeInput.value=signed(value); updateModal()}
	UI.longitudeInput.onchange=()=>{
		const value=parseNumber(UI.longitudeInput, "")
		if(!Number.isFinite(value)||value < -180||value > 180)
			return reject(UI.longitudeInput,
				"Please enter a valid longitude from −180° to +180°.", signed(modal.temp.longitude))
		modal.temp.longitude=value; UI.longitudeInput.value=signed(value); setJulian()}
	UI.elevationInput.onchange=()=>{
		const value=parseNumber(UI.elevationInput, "")
		if(!Number.isFinite(value)||value < elevationMin||value > elevationMax)
			return reject(UI.elevationInput,
				"Please enter a valid elevation from 0 m to 10,000 m.",
				modal.temp.elevation.toLocaleString("en-US"))
		modal.temp.elevation=Math.round(value)
		UI.elevationInput.value=modal.temp.elevation.toLocaleString("en-US"); updateModal()}
	UI.yearInput.onchange=()=>{
		const value=Math.round(parseNumber(UI.yearInput, ""))
		if(!Number.isFinite(value)||value < 1||value > 5000) {
			UI[modal.temp.year < 1 ? "eraBC" : "eraAD"].checked=true
			return reject(UI.yearInput, "Please enter a valid year number from 1 to 5000.",
				modal.temp.year > 0 ? modal.temp.year : 1 - modal.temp.year)}
		setYear(UI.eraBC.checked ? 1-value : value)}
	UI.monthInput.onchange=()=>{
		const value=Math.round(parseNumber(UI.monthInput, ""))
		if(!Number.isFinite(value)||value < 1||value > 12)
			return reject(UI.monthInput, "Please enter a valid month number from 1 to 12.",
				modal.temp.month)
		setMonth(value)}
	UI.dayInput.onchange=()=>{
		const value=Math.round(parseNumber(UI.dayInput, ""))
		const maximum=getMonthDays(getYearDays(modal.temp.year))[modal.temp.month-1]
		if(!Number.isFinite(value)||value < 1||value > maximum)
			return reject(UI.dayInput, "Please enter a valid day number from 1 to "+maximum+".",
				modal.temp.day)
		setDay(value)}
	UI.hourInput.onchange=()=>{
		const value=Math.round(parseNumber(UI.hourInput, ""))
		if(!Number.isFinite(value)||value < 0||value > 23)
			return reject(UI.hourInput, "Please enter a valid hour number from 0 to 23.",
				String(modal.temp.hour).padStart(2,"0"))
		modal.temp.hour=value; UI.hourInput.value=String(value).padStart(2,"0"); setJulian()}
	UI.minuteInput.onchange=()=>{
		const value=Math.round(parseNumber(UI.minuteInput, ""))
		if(!Number.isFinite(value)||value < 0||value > 59)
			return reject(UI.minuteInput, "Please enter a valid minute number from 0 to 59.",
				String(modal.temp.minute).padStart(2,"0"))
		modal.temp.minute=value; UI.minuteInput.value=String(value).padStart(2,"0"); setJulian()}
	UI.julianDayInput.onchange=()=>{
		const value=parseNumber(UI.julianDayInput, "")
		if(!Number.isFinite(value)||value < -104788||value > 3547638)
			return reject(UI.julianDayInput,
				"Please enter a valid Julian day between −104,788 and 3,547,638.",
				formatJulianDay(modal.temp.julianDay))
		setJulianValue(value)}
	for(const id of ["eraAD","eraBC"]) UI[id].onchange=()=>UI.yearInput.onchange()
}

initModal(document.body)
if(typeof addNudgeListeners === "function") initializeModalEvents()
