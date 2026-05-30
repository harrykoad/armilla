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
	let mag = 0
	for(let p of STARS) {
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
		let c = CONSTELLATIONS[z]
		for(let i = 0; i < c.length; i += 2) {
			let a = modal.horary.stars[c[i]]
			let b = modal.horary.stars[c[i + 1]]
			if(a && b && a.position && b.position)
				modal.horary.constellations.push([a.position, b.position])}}
	for(let z of ZODIAC) {
		let c = CONSTELLATIONS[z]
		for(let i = 0; i < c.length; i += 2) {
			let a = modal.horary.stars[c[i]]
			let b = modal.horary.stars[c[i + 1]]
			if(a && b && a.position && b.position)
				modal.horary.zodiac.push([a.position, b.position])}}
	modal.horary.stars = modal.horary.stars.filter(s => s && s.position)

	// World Map
	w = 360, h = 180
	modal.world.map.src = "data:image/png;base64,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"
	for(let lon = -150; lon <= 150; lon += 30) {
		let x = lon + 180
		modal.world.graticule.push([[x, 0], [x, h]])}
	for(let lat = -60; lat <= 60; lat += 30) {
		let y = 90 - lat
		modal.world.graticule.push([[0, y], [w, y]])}
		modal.world.equator = [[[0, h / 2], [w, h / 2]]]}

function lunarState(julianDay, latitude, longitude) {
	let jc = (julianDay - 2451545) / 36525
	let gm = geoMoon(jc)[0]
	let gs = translate(scale(gm, 1 / MASS_FACTOR), negate(helioEMB(jc)))
	let go = getGeoObserver(getSidereal(jc, longitude), latitude,
		getAyanamsa(jc), getObliquity(jc))
	let tm = normalize(translate(gm, negate(go)))
	let ts = normalize(translate(gs, negate(go)))
	let l = toTP(tm)[0]
	let p = Math.acos(clip(vdot(tm, ts), -1, 1)) / DEGREE
	if(mod(l - toTP(ts)[0], 360) > 180) p = 360 - p
	return [gm, gs, go, l * 27 / 360, p]}

function lunarSearch(t0, latitude, longitude) {
	let tmin = t0 - 16, tmax = t0 + 31, dt = 1 / 24
	let data = []
	for(let jd = tmin; jd <= tmax + dt / 2; jd += dt) {
		let [gm, gs, go, nks, phs] = lunarState(jd, latitude, longitude)
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
		let era = Y > 0 ? "AD " + Y : Math.abs(Y - 1) + " BC"
		let abbr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][M - 1]
		return era + " " + abbr + " " + D + ", " +
			String(h).padStart(2, "0") + ":" + String(min).padStart(2, "0")}
	let stateAt = jd => {
		let i = Math.floor((jd - tmin) / dt)
		let a = data[i], b = data[i + 1]
		let k = (jd - a[0]) / (b[0] - a[0])
		return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]}
	let refine = (lo, hi, key, target) => {
		for(let i = 0; i < 12; i++) {
			let mid = (lo + hi) / 2
			if(stateAt(mid)[key] < target) lo = mid
			else hi = mid}
		return (lo + hi) / 2}
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
	let nakshatras = ["Aśvinī (1)", "Bharaṇī (2)", "Kṛttikā (3)", "Rohiṇī (4)",
		"Mṛgaśīrṣa (5)", "Ārdrā (6)", "Punarvasu (7)", "Puṣya (8)", "Āśleṣā (9)",
		"Maghā (10)", "P.Phalgunī (11)", "U.Phalgunī (12)", "Hasta (13)", "Citrā (14)",
		"Svātī (15)", "Viśākha (16)", "Anurādhā (17)", "Jyeṣṭha (18)", "Mūla (19)",
		"P.Aṣāḍhā (20)", "U.Aṣāḍhā (21)", "Śravaṇa (22)", "Dhaniṣṭha (23)",
		"Śatabhiṣak (24)", "P.Bhādrapadā (25)", "U.Bhādrapadā (26)", "Revatī (27)"]
	let months = ["Vaiśākha (1/๖)", "Jyaiṣṭha (2/๗)", "Āṣāḍha (3/๘)", "Śrāvaṇa (4/๙)",
		"Bhādrapada (5/๑๐)", "Āśvina (6/๑๑)", "Kārttika (7/๑๒)", "Mārgaśīrṣa (8/๑)",
		"Pauṣa (9/๒)", "Māgha (10/๓)", "Phālguna (11/๔)", "Caitra (12/๕)"]
	let now = stateAt(t0)
	let phsIndex = mod(now[1] / 12, 30)
	let phsNumber = clip(Math.round(mod(phsIndex, 15) + 1), 1, 15)
	phsNumber = phsNumber + (phsNumber % 10 === 1 && phsNumber !== 11 ? "ˢᵗ" :
		phsNumber % 10 === 2 && phsNumber !== 12 ? "ⁿᵈ" :
		phsNumber % 10 === 3 && phsNumber !== 13 ? "ʳᵈ" : "ᵗʰ")
	let phsUntil = crossing(1, Math.floor(now[1] / 12) * 12 + 12)
	let [gm, gs, go] = lunarState(crossing(1, phsIndex < 15 ?
		Math.floor(now[1] / 360) * 360 + 180 : Math.floor((now[1] - 180) / 360) * 360 + 180,
		phsIndex < 15 ? t0 : tmin), latitude, longitude)
	let synMonth = Math.floor(mod(toTP(normalize(translate(gs, negate(go))))[0], 360) / 30)
	let nksIndex = mod(Math.floor(now[0]), 27)
	let nksUntil = nextCrossing(0, 1, phsUntil)
	let nextNewMoon = nextCrossing(1, 360, phsUntil)
	let moonEvents = []
	for(let target = Math.floor(stateAt(phsUntil)[1] / 180) * 180 + 180;
			target <= data[data.length - 1][2]; target += 180) {
		let jd = crossing(1, target, phsUntil)
		if(!jd) continue
		moonEvents.push({jd,
			label: mod(target, 360) === 0 ? "Next New Moon:" : "Next Full Moon:",
			value: nakshatras[mod(Math.floor(stateAt(jd)[0]), 27)],
			time: formatEvent("at", jd)})}
	moonEvents.sort((a, b) => a.jd - b.jd)
	return {
		phase: {value: (phsIndex < 15 ? "Bright" : "Dark") + " " + phsNumber,
			until: formatEvent("until", phsUntil)},
		month: {value: months[synMonth],
			until: formatEvent("until", nextNewMoon)},
		nakshatra: {value: nakshatras[nksIndex],
			until: formatEvent("until", nksUntil)},
		moonEvents: moonEvents.slice(0, 2)}}

function updateModal() {
	let dpr = 2 //window.devicePixelRatio || 1
	let col = mode.darkTheme ? "white" : "black"

	let latitude = Number(UI.latitudeInput.value.replace("−", "-"))
	let longitude = modal.temp.longitude
	let jd = modal.temp.julianDay
	let jc = (jd - 2451545) / 36525
	let ayanamsa = getAyanamsa(jc)
	let obliquity = getObliquity(jc)
	let sidereal = getSidereal(jc, longitude)
	let ss = solarSystem(jc).map(normalize)
	let lagna = getTopoLagna(sidereal, latitude, ayanamsa, obliquity)
	let obj = [
		{position: ss[8], label: "N", name: "Neptune", color: color.neptune},
		{position: ss[7], label: "U", name: "Uranus", color: color.uranus},
		{position: ss[9], label: "8", name: "Rahu", color: color.rahu},
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
	let horizonN = gc.map(p => toTP(mdot(mHN, p)))
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
		let w = 360, h = 75
		if(lun.width !== w * dpr) lun.width = w * dpr
		if(lun.height !== h * dpr) lun.height = h * dpr
		lun.style.width = w + "px"
		lun.style.height = h + "px"
		let ctx = lun.getContext("2d", {alpha: false})
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.fillStyle = mode.darkTheme ? "black" : "white"
		ctx.fillRect(0, 0, w, h)
		let cx = 30, cy = 30, rmax = 30, rmin = 25.42
		let lunar = lunarSearch(jd, latitude, longitude)
		let [gm, gs, go] = lunarState(jd, latitude, longitude)
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
			{text: "MOON", position: [cx, cy], size: 10,
				weight: "bold", baseline: "middle", color: "black"},
			{text: ((1 + vdot(lunarView, lunarLight)) * 50).toFixed(2) + "%",
				position: [cx, 64], size: 10, align: "center", baseline: "top", color: col},
			{text: "Phase Number:",
				position: [140, 0], size: 10, align: "right", baseline: "top", color: col},
			{text: lunar.phase.value,
				position: [145, 0], size: 10, align: "left", baseline: "top", color: col},
			{text: lunar.phase.until,
				position: [w, 0], size: 10, align: "right", baseline: "top", color: col},
			{text: "Synodic Month:",
				position: [140, 16], size: 10, align: "right", baseline: "top", color: col},
			{text: lunar.month.value,
				position: [145, 16], size: 10, align: "left", baseline: "top", color: col},
			{text: lunar.month.until,
				position: [w, 16], size: 10, align: "right", baseline: "top", color: col},
			{text: "Nakṣatra:",
				position: [140, 32], size: 10, align: "right", baseline: "top", color: col},
			{text: lunar.nakshatra.value,
				position: [145, 32], size: 10, align: "left", baseline: "top", color: col},
			{text: lunar.nakshatra.until,
				position: [w, 32], size: 10, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[0] ? lunar.moonEvents[0].label : "",
				position: [140, 48], size: 10, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[0] ? lunar.moonEvents[0].value : "",
				position: [145, 48], size: 10, align: "left", baseline: "top", color: col},
			{text: lunar.moonEvents[0] ? lunar.moonEvents[0].time : "",
				position: [w, 48], size: 10, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[1] ? lunar.moonEvents[1].label : "",
				position: [140, 64], size: 10, align: "right", baseline: "top", color: col},
			{text: lunar.moonEvents[1] ? lunar.moonEvents[1].value : "",
				position: [145, 64], size: 10, align: "left", baseline: "top", color: col},
			{text: lunar.moonEvents[1] ? lunar.moonEvents[1].time : "",
				position: [w, 64], size: 10, align: "right", baseline: "top", color: col}])}

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
		ctx.drawImage(modal.world.map, 0, 0, w, h)
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
