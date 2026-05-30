const CTX = UI.sky.getContext("2d", {alpha: false})

function resize() {
	let dpr = 2 //window.devicePixelRatio || 1
	view.w = window.innerWidth
	view.h = window.innerHeight
	view.x0 = 0.5 * view.w
	view.y0 = 0.5 * view.h
	view.r0 = 0.45 * Math.min(view.w, view.h)
	UI.sky.width = view.w * dpr
	UI.sky.height = view.h * dpr
	UI.sky.style.width = view.w + "px"
	UI.sky.style.height = view.h + "px"
	CTX.setTransform(dpr, 0, 0, dpr, 0, 0)}

function project(point) {
	let camera3D = toScreen(point, "equatorial", mode.orientation)
	let s = view.r0 * view.f / (view.f - camera3D[0])
	let screen2D = [view.x0 + camera3D[1] * s, view.y0 - camera3D[2] * s]
	return [camera3D, screen2D]}

function pushLines(lines) {
	let {points, color, width, dash = []} = lines
	let pts = []
	let side = null

	function flush() {
		if(pts.length < 2) {pts = []; return}
		let line = {points: [pts], color, width, dash}
		if(side) buffer.frontLines.push(line)
		else if(!show.sphere) buffer.backLines.push(line)
		pts = []}

	for(let p of points) {
		let [c3D, s2D] = project(p)
		let currentSide = c3D[0] >= view.z0
		if(side === null) side = currentSide
		if(currentSide !== side) {
			let prev = pts[pts.length - 1]
			if(prev) {
				let mean = scale(translate(prev, s2D), 0.5)
				pts.push(mean)
				flush()
				pts = [mean]}
			side = currentSide}
		pts.push(s2D)}
	flush()}

function drawLines(ctx, lines) {
	for(let l of lines) {
		ctx.strokeStyle = l.color
		ctx.lineWidth = l.width
		ctx.setLineDash(l.dash || [])
		ctx.beginPath()
		for(let p of l.points) {
			ctx.moveTo(p[0][0], p[0][1])
			for(let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1])}
		ctx.stroke()}
	ctx.setLineDash([])}

function pushStars() {
	let k = param.julianDay.toFixed(10)
	if(!cache.stars || cache.stars.key !== k)
		cache.stars = {key: k, vectors: STARS.map(p => {
			return p[0] === 0 && p[1] === 0 && p[2] === 0 ? [0, 0, 0] : fromNirayana(p)})}
	let m = 0
	for(let s of cache.stars.vectors) {
		if(s[0] === 0 && s[1] === 0 && s[2] === 0) {m++; continue}
		let [c3D, s2D] = project(s)
		let point = {position: s2D, magnitude: m}
		if(c3D[0] >= view.z0) buffer.frontStars.push(point)
		else if(!show.sphere) buffer.backStars.push(point)}}

function drawStars(stars) {
	let r = view.r0 * view.f / Math.sqrt(view.f * view.f - 1)
	CTX.fillStyle = mode.darkTheme ? "white" : "black"
	for(let s of stars) {
		let [x, y] = s.position
		let dx = x - view.x0
		let dy = y - view.y0
		if(dx * dx + dy * dy > r * r) continue
		let size = 5 - s.magnitude
		if(size < 3) {
			CTX.fillRect(Math.round(x - size * 0.5), Math.round(y - size * 0.5), size, size)}
		else {
			CTX.beginPath()
			CTX.arc(x, y, size * 0.5, 0, TWO_PI)
			CTX.fill()}}}

function pushPoints(points) {
	for(let p of points) {
		let {position, point = {}, text = {}} = p
		let [c3D, s2D] = project(position)
		let marker = {...point, position: s2D}
		let label = {text: "", color: point.color || "white", size: 16, ...text, position: s2D}
		if(label.text !== "") {
			let [x, y] = s2D
			let dx = x - view.x0
			let dy = y - view.y0
			let len = Math.hypot(dx, dy)
			if(len < 1e-6) {dx = 0; dy = -1; len = 1}
			dx /= len
			dy /= len
			CTX.font = (label.weight ? label.weight + " " : "") + label.size + "px sans-serif"
			let m = CTX.measureText(label.text)
			let r = 10
			label.position = [
				x + dx * (r + m.width / 2),
				y + dy * (r + (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 2)]
			label.edge = label.edge || (mode.darkTheme ? "black" : "white")
			label.border = label.border || 0.5}
		if(c3D[0] >= view.z0) {
			buffer.frontPoints.push(marker)
			if(label.text !== "") buffer.frontTexts.push(label)}
		else if(!show.sphere) {
			buffer.backPoints.push(marker)
			if(label.text !== "") buffer.backTexts.push(label)}}}

function drawPoints(ctx, points) {
	for(let p of points) {
		ctx.beginPath()
		ctx.arc(p.position[0], p.position[1], p.size || 3, 0, TWO_PI)
		ctx.fillStyle = p.color || "white"
		ctx.fill()
		if(p.edge) {
			ctx.lineWidth = p.border || 1
			ctx.strokeStyle = p.edge
			ctx.stroke()}}}

function drawTexts(ctx, texts) {
	for(let t of texts) {
		ctx.font = (t.weight ? t.weight + " " : "") + (t.size || 12) + "px sans-serif"
		ctx.textAlign = t.align || "center"
		ctx.textBaseline = t.baseline || "middle"
		ctx.fillStyle = t.color || "white"
		ctx.save()
		ctx.translate(t.position[0], t.position[1])
		ctx.rotate(t.rotation || 0)
		if(t.edge) {
			ctx.lineWidth = t.border || 1
			ctx.strokeStyle = t.edge
			ctx.strokeText(t.text, 0, 0)}
		ctx.fillText(t.text, 0, 0)
		ctx.restore()}}

function drawSphere() {
	let r = view.r0 * view.f / Math.sqrt(view.f * view.f - 1)
	CTX.fillStyle = mode.darkTheme ? "black" : "white"
	CTX.beginPath()
	CTX.arc(view.x0, view.y0, r, 0, TWO_PI)
	CTX.fill()
	CTX.strokeStyle = "gray"
	CTX.lineWidth = 1
	CTX.beginPath()
	CTX.arc(view.x0, view.y0, r, 0, TWO_PI)
	CTX.stroke()}

function drawPath() {
	CTX.strokeStyle = "magenta"
	CTX.lineWidth = 2.5
	for(let p of input.drawPath) {
		if(p.length < 2) continue
		CTX.beginPath()
		CTX.moveTo(p[0][0], p[0][1])
		for(let i = 1; i < p.length; i++) CTX.lineTo(p[i][0], p[i][1])
		CTX.stroke()}}

function drawCrosshair() {
	CTX.strokeStyle = "gray"
	CTX.lineWidth = 1.5
	CTX.beginPath()
	let r = 5
	CTX.moveTo(view.x0 - r, view.y0 - r)
	CTX.lineTo(view.x0 + r, view.y0 + r)
	CTX.moveTo(view.x0 - r, view.y0 + r)
	CTX.lineTo(view.x0 + r, view.y0 - r)
	CTX.stroke()
	let p = fromScreen([1, 0, 0], mode.orientation, "equatorial")
	let [l, b] = toTP(toNirayana(p))
	UI.eclipticLongitudeValue.textContent = formatAngleDMS(l, 2)
	UI.eclipticLatitudeValue.textContent = formatSignedAngleDMS(b, 2)
	let [ra, dec] = toTP(p)
	UI.rightAscensionValue.textContent = formatHourAngle(ra, 2)
	UI.declinationValue.textContent = formatSignedAngleDMS(dec, 2)
	let [azm, alt] = toTP(toHorizontal(p))
	azm = Math.abs(alt) === 90 ? 0 : 90 - azm
	UI.azimuthValue.textContent = formatAngleDMS(azm, 2)
	UI.altitudeValue.textContent = formatSignedAngleDMS(alt, 2)}

const AXES = [[+1,  0,  0], [-1,  0,  0], [ 0, +1,  0], [ 0, -1,  0], [ 0,  0, +1], [ 0,  0, -1]]

function render() {
	if(update.view) {
		let mTS = mul(rotateY(view.pitch), rotateZ(view.yaw))
		if (view.orienting) mTS = mul(rotateX(view.roll), mTS)
		matrix.toScreen = mTS
		matrix.fromScreen = transpose(matrix.toScreen)
		update.view = false}
	if(!update.sky) return
	update.sky = false

	for(let g in buffer) buffer[g].length = 0

	if(show.eclipticGraticule) pushGraticule("ecliptic", fromNirayana, color.ecliptic)
	if(show.equatorialGraticule) pushGraticule("equatorial", p => p, color.equatorial)
	if(show.horizontalGraticule) pushGraticule("horizontal", fromHorizontal, color.horizontal)

	let c = mode.darkTheme ? "white" : "black"
	if(show.milkyWay) {
		let r = p => fromNirayana(fromGalactic(p))
		pushLines({points: parallel(0).map(r), color: color.galactic, width: 3, dash: [3, 3]})
		pushPoints([{position: r(AXES[0]), point: {size: 5, color: color.galactic},
			text: {text: "Sgr A*", color: c}}])}
	if(show.precessionCircles) {
		pushLines({points: parallel(90 - param.obliquity).map(fromNirayana), color: color.ecliptic, width: 2, dash: [5, 5]})
		pushLines({points: parallel(param.obliquity - 90).map(fromNirayana), color: color.ecliptic, width: 2, dash: [5, 5]})}
	if(show.circumpolarCircles) {
		pushLines({points: parallel(90 - param.latitude), color: color.equatorial, width: 2, dash: [5, 5]})
		pushLines({points: parallel(param.latitude - 90), color: color.equatorial, width: 2, dash: [5, 5]})}

	if(show.ecliptic) pushLines({points: parallel(0).map(fromNirayana), color: color.ecliptic, width: 3})
	if(show.eclipticMeridian) pushLines({points: meridian(0).map(fromNirayana), color: color.ecliptic, width: 3})
	if(show.equator) pushLines({points: parallel(0), color: color.equatorial, width: 3})
	if(show.equatorialMeridian) pushLines({points: meridian(0), color: color.equatorial, width: 3})
	if(show.horizon) pushLines({points: parallel(0).map(fromHorizontal), color: color.horizontal, width: 3})
	if(show.horizontalMeridian) pushLines({points: meridian(90).map(fromHorizontal), color: color.horizontal, width: 3})
	if(show.observerMeridian) pushLines({points: meridian(param.sidereal), color: color.horizontal, width: 3})
	if(show.analemma) pushAnalemma()

	if(show.eclipticAxes) {
		pushPoints(AXES.map((axis, i) => ({
			position: mdot(rotateX(param.obliquity), axis),
			point: {size: 5, color: color.ecliptic},
			text: {text: ["VE", "AE", "SS", "WS", "NEP", "SEP"][i], color: c}})))
		pushPoints([{
			position: fromNirayana(AXES[0]),
			point: {size: 5, color: color.ecliptic},
			text: {text: "FPA", color: c}}])}
	if(show.equatorialAxes) {
		pushPoints(AXES.map((axis, i) => ({
			position: axis,
			point: {size: 5, color: color.equatorial},
			text: {text: ["VE", "AE", "6ʰ", "18ʰ", "NCP", "SCP"][i], color: c}})))}
	if(show.horizontalAxes) {
		pushPoints(AXES.map((axis, i) => ({
			position: fromHorizontal(axis),
			point: {size: 5, color: color.horizontal},
			text: {text: ["East", "West", "North", "South", "Zenith", "Nadir"][i], color: c}})))
		pushPoints([{
			position: fromNirayana(getTopoLagna()),
			point: {size: 6, color: color.horizontal, border: 2, edge: c},
			text: {text: "Lagna", color: c}}])}

	if(show.constellations || show.zodiac || show.stars) {
		if(show.stars) pushStars()
		let s = cache.stars.vectors
		if(show.constellations) {
			for(let c of CONSTELLATIONS) {
				for(let i = 0; i < c.length; i += 2)
					pushLines({points: [s[c[i]], s[c[i + 1]]], color: color.constellations, width: 0.75})}}
		if(show.zodiac) {
			for(let z of ZODIAC) {
				let c = CONSTELLATIONS[z]
				for(let i = 0; i < c.length; i += 2)
					pushLines({points: [s[c[i]], s[c[i + 1]]], color: color.zodiac, width: 1.5})}}}

	if(show.sun || show.moon || show.planets || show.moonsOrbit ||
		show.eclipses || show.halo || show.rainbow) pushSolarSystem()

	CTX.fillStyle = mode.darkTheme ? "black" : "white"
	CTX.fillRect(0, 0, view.w, view.h)
	if(!show.sphere) {
		drawLines(CTX, buffer.backLines)
		drawStars(buffer.backStars)
		drawPoints(CTX, buffer.backPoints)
		drawTexts(CTX, buffer.backTexts)}
	if(show.sphere) drawSphere()
	drawLines(CTX, buffer.frontLines)
	drawStars(buffer.frontStars)
	drawPoints(CTX, buffer.frontPoints)
	drawTexts(CTX, buffer.frontTexts)

	drawPath()
	drawCrosshair()}

function zoomInOut(scale) {
	view.r0 *= scale
	let base = Math.min(view.w, view.h)
	let rMin = 0.45 * base
	let rMax = 20 * base
	view.r0 = Math.max(rMin, Math.min(rMax, view.r0))
	update.sky = true
	render()}
