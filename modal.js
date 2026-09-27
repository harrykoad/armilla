function initModal() {
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
		if(UI.modalBackground.style.display === "flex") updateModal()}}


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
	let mNW = mul(rotateZ(longitude - sidereal), transpose(mEN))

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
		ctx.clearRect(0, 0, w, h)
		ctx.save()
		ctx.filter = mode.darkTheme ? "none" : "invert(1)"
		if(modal.world.map.complete && modal.world.map.naturalWidth > 0)
			ctx.drawImage(modal.world.map, 0, 0, w, h)
		else {
			ctx.fillStyle = mode.darkTheme ? "black" : "white"
			ctx.fillRect(0, 0, w, h)}
		ctx.restore()
		drawLines(ctx, [{points: modal.world.graticule, color: "gray", width: 0.5},
			{points: modal.world.equator, color: color.equatorial, width: 1.5}])
		let nS = mdot(mNW, ss[1])
		let nE = mdot(mNW, [0, 0, 1])
		let points = []
		ctx.fillStyle = "rgba(128, 128, 128, 0.75)"
		ctx.beginPath()
		for(let x = 0; x <= w; x++) {
			let lon = (x - 180) * DEGREE
			let cl = Math.cos(lon), sl = Math.sin(lon)
			let latS = Math.atan(-(nS[0] * cl + nS[1] * sl) / nS[2]) / DEGREE
			let latE = Math.atan(-(nE[0] * cl + nE[1] * sl) / nE[2]) / DEGREE
			let y = 90 - latS
			x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
			points.push([x, 90 - latE])}
		let pole = nS[2] > 0 ? h : 0
		ctx.lineTo(w, pole)
		ctx.lineTo(0, pole)
		ctx.closePath()
		ctx.fill()
		drawLines(ctx, [{points: [points], color: color.ecliptic, width: 1.5}])
		let x = longitude + 180, y = 90 - latitude
		drawLines(ctx, [{points: [[[0, y], [w, y]], [[x, 0], [x, h]]],
			color: color.horizontal, width: 2, dash: [5, 3]}])
		points = []
		for(let o of obj) {
			let [lon, lat] = toTP(mdot(mNW, o.position))
			let x = mod(lon + 180, 360)
			let y = 90 - lat
			points.push({position: [x, y], size: 4, color: o.color, border: 1, edge: col})}
		drawPoints(ctx, points)}}

initModal()
