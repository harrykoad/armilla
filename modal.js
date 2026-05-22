const WORLDMAP = initWorldMap()

function drawPlanetOnMap(ctx, lon, lat, color, w, h, r = 4) {
	let x = mod(lon + 180, 360) / 360 * w
	let y = (90 - lat) / 180 * h
	ctx.beginPath()
	ctx.arc(x, y, r, 0, TWO_PI)
	ctx.fillStyle = color
	ctx.fill()
	ctx.strokeStyle = "gray"
	ctx.lineWidth = r / 3
	ctx.stroke()}

function drawWorldMap() {
	let map = UI.worldMap
	let ctx = map.getContext("2d")
	let dpr = 2 //window.devicePixelRatio || 1
	let w = 1.5 * 360
	let h = 1.5 * 180
	if(map.width !== w * dpr) map.width = w * dpr
	if(map.height !== h * dpr) map.height = h * dpr
	map.style.width = w + "px"
	map.style.height = h + "px"
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	ctx.clearRect(0, 0, w, h)
	ctx.imageSmoothingEnabled = false
	ctx.save()
	ctx.filter = mode.darkTheme ? "none" : "invert(1)"
	ctx.drawImage(WORLDMAP, 0, 0, w, h)
	ctx.restore()
	ctx.strokeStyle = "gray"
	ctx.lineWidth = 0.5
	for(let lon = -150; lon <= 150; lon += 30) {
		let x = (lon + 180) / 360 * w
		ctx.beginPath()
		ctx.moveTo(x, 0)
		ctx.lineTo(x, h)
		ctx.stroke()}
	for(let lat = -60; lat <= 60; lat += 30) {
		let y = (90 - lat) / 180 * h
		ctx.beginPath()
		ctx.moveTo(0, y)
		ctx.lineTo(w, y)
		ctx.stroke()}
	let lat = Number(UI.latitudeInput.value.replace("−", "-"))
	let lon = Number(UI.longitudeInput.value.replace("−", "-"))
	let jd = Number(UI.julianDayInput.value.replace("−", "-"))
	let jc = (jd - 2451545) / 36525
	let vn = solarSystem(jc)
	let fn = mul(rotateZ(lon - getSidereal(jc, lon)),
		mul(rotateX(getObliquity(jc)), rotateZ(-getAyanamsa(jc))))
	let ve = vn.map(v => toTP(normalize(dot(fn, v))))
	let [ts, ps] = toTP(normalize(vn[1]))
	let dnt = parallel(0).map(p =>
		toTP(dot(fn, dot(mul(rotateZ(ts), rotateY(90 - ps)), p))))
	let pMin = dnt[0]
	let pMax = dnt[0]
	for(let p of dnt) {
		if(p[1] < pMin[1]) pMin = p
		if(p[1] > pMax[1]) pMax = p}
	let dMin = Math.abs(mod(pMin[0] - ve[1][0], 360, -180))
	let dMax = Math.abs(mod(pMax[0] - ve[1][0], 360, -180))
	let pole = dMin < dMax ? h : 0
	ctx.fillStyle = "rgba(128, 128, 128, 0.75)"
	ctx.beginPath()
	for(let x = 0; x <= w; x++) {
		let lat0 = 0
		let lon0 = x / w * 360 - 180
		let dlon = Infinity
		for(let i = 0; i < dnt.length; i++) {
			let d = Math.abs(mod(dnt[i][0] - lon0, 360, -180))
			if(d < dlon) {dlon = d; lat0 = dnt[i][1]}}
		let y = (90 - lat0) / 180 * h
		x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)}
	ctx.lineTo(w, pole)
	ctx.lineTo(0, pole)
	ctx.closePath()
	ctx.fill()
	ctx.strokeStyle = color.equatorial
	ctx.lineWidth = 1.5
	ctx.beginPath()
	ctx.moveTo(0, h / 2)
	ctx.lineTo(w, h / 2)
	ctx.stroke()
	ctx.strokeStyle = color.ecliptic
	ctx.lineWidth = 1.5
	let ecl = parallel(0).map(p => toTP(normalize(dot(fn, p))))
	ctx.beginPath()
	for(let x = 0; x <= w; x++) {
		let lat0 = 0
		let lon0 = x / w * 360 - 180
		let dlon = Infinity
		for(let i = 0; i < ecl.length; i++) {
			let d = Math.abs(mod(ecl[i][0] - lon0, 360, -180))
			if(d < dlon) {dlon = d; lat0 = ecl[i][1]}}
		let y = (90 - lat0) / 180 * h
		x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)}
	ctx.stroke()
	let x = (lon + 180) / 360 * w
	let y = (90 - lat) / 180 * h
	ctx.strokeStyle = color.horizontal
	ctx.lineWidth = 2
	ctx.setLineDash([5, 3])
	ctx.beginPath()
	ctx.moveTo(0, y)
	ctx.lineTo(w, y)
	ctx.moveTo(x, 0)
	ctx.lineTo(x, h)
	ctx.stroke()
	ctx.setLineDash([])
	let obj = [
		{position: ve[9], name: "Rahu", color: color.rahu, size: 3},
		{position: ve[8], name: "Neptune", color: color.neptune, size: 4},
		{position: ve[7], name: "Uranus", color: color.uranus, size: 4},
		{position: ve[6], name: "Saturn", color: color.saturn, size: 4},
		{position: ve[5], name: "Jupiter", color: color.jupiter, size: 4},
		{position: ve[4], name: "Mars", color: color.mars, size: 4},
		{position: ve[3], name: "Venus", color: color.venus, size: 4},
		{position: ve[2], name: "Mercury", color: color.mercury, size: 4},
		{position: ve[1], name: "Sun", color: color.sun, size: 6},
		{position: ve[0], name: "Moon", color: color.moon, size: 6}]
	for(let o of obj) drawPlanetOnMap(ctx, o.position[0], o.position[1], o.color, w, h, o.size)}

function updateJulianDayInput() {
	let y = Number(UI.yearInput.value)
	let year = UI.eraBC.checked ? 1 - y : y
	let time = 15 * (Number(UI.hourInput.value) + Number(UI.minuteInput.value) / 60)
	let jd = toJulianDay(year, Number(UI.monthInput.value), Number(UI.dayInput.value),
		time, Math.round(Number(UI.longitudeInput.value.replace("−", "-")) / 15))
	UI.julianDayInput.value = jd < 0 ? "−" + Math.abs(jd).toFixed(5) : jd.toFixed(5)
	drawWorldMap()}

function setLocationFromMap(event) {
	let map = UI.worldMap.getBoundingClientRect()
	let lat = Math.round((90 - clip(event.clientY - map.top, 0, map.height) / map.height * 180) * 100) / 100
	UI.latitudeInput.value = formatSignedAngleDecimal(lat, 2).replace("°", "")
	let lon = Math.round((clip(event.clientX - map.left, 0, map.width) / map.width * 360 - 180) * 100) / 100
	lon = lon === -180 ? 180 : lon
	let al = Math.abs(lon)
	UI.longitudeInput.value = al < 0.005 ? "0.00" : Math.abs(al - 180) < 0.005 ?
		"180.00" : (lon > 0 ? "+" : "−") + al.toFixed(2)
	updateJulianDayInput()}

function initWorldMap() {
	let map = new Image()
	map.src = "data:image/png;base64,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"
	return map}
