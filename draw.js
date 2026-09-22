const CTX = UI.sky.getContext("2d", {alpha: false})
const PLANETARIUM_MAX_FOV = 195
const PLANETARIUM_INITIAL_FOV = 90

function getPlanetariumScale() {
	return view.r0 / (2 * Math.tan(0.25 * PLANETARIUM_INITIAL_FOV * DEGREE))}

function clampViewZoom() {
	let base = Math.min(view.w, view.h)
	let rMin = mode.viewMode === "planetarium" ?
		0.5 * base * Math.tan(0.25 * PLANETARIUM_INITIAL_FOV * DEGREE) /
			Math.tan(0.25 * PLANETARIUM_MAX_FOV * DEGREE) : 0.45 * base
	let rMax = 20 * base
	view.r0 = Math.max(rMin, Math.min(rMax, view.r0))
	updatePlanetariumCullLimit()}

function updatePlanetariumCullLimit() {
	let angle = Math.min(Math.PI, 2 * Math.atan(
		Math.hypot(view.w, view.h) / (4 * getPlanetariumScale())))
	view.diagCos = Math.cos(angle)}

function resize() {
	let dpr = 2 //window.devicePixelRatio || 1
	view.w = window.innerWidth
	view.h = window.innerHeight
	view.x0 = 0.5 * view.w
	view.y0 = 0.5 * view.h
	view.r0 = 0.45 * Math.min(view.w, view.h)
	updatePlanetariumCullLimit()
	UI.sky.width = view.w * dpr
	UI.sky.height = view.h * dpr
	UI.sky.style.width = view.w + "px"
	UI.sky.style.height = view.h + "px"
	CTX.setTransform(dpr, 0, 0, dpr, 0, 0)}

function project(point, fromMode = "equatorial") {
	let oriented = fromMode === mode.orientation ? point : changeSystem(point, fromMode, mode.orientation)
	let camera3D = mdot(matrix.toScreen, oriented)
	return [camera3D, projectCamera(camera3D)]}

let projectCamera

function isVisibleSide(camera3D) {
	if(mode.viewMode === "armillarium") return camera3D[0] >= view.z0
	return isVisiblePoint(camera3D)}

function isVisiblePoint(camera3D) {
	if(mode.viewMode === "armillarium") return camera3D[0] >= view.z0
	return camera3D[0] / Math.hypot(...camera3D) >= view.diagCos
}

function canDrawBackSide() {
	return mode.viewMode === "armillarium" && !show.surface}

function celestialRenderPosition(point) {
	return refractionEnabled() ?
		{position: refractHorizontal(toHorizontal(point)), fromMode: "horizontal"} :
		{position: point, fromMode: "equatorial"}}

function isAtOrAboveHorizon(point, fromMode = "equatorial") {
	let cached = cache.horizonVisibility.get(point)
	if(cached && cached.fromMode === fromMode) return cached.value
	let horizontal = fromMode === "horizontal" ? point : changeSystem(point, fromMode, "horizontal")
	let [azimuth, altitude] = toTP(horizontal)
	let value = altitude >= -getHorizonDip(param.latitude, param.elevation, azimuth) - 1e-10
	cache.horizonVisibility.set(point, {fromMode, value})
	return value}

function pushLines(lines) {
	let {points, color, width, dash = [], fromMode = "equatorial", layer = "lines"} = lines
	let pts = []
	let side = null
	let previousCamera = null

	function flush() {
		if(pts.length < 2) {pts = []; return}
		let line = {points: [pts], color, width, dash}
		if(side) buffer[layer === "figures" ? "frontFigures" : "frontLines"].push(line)
		else if(canDrawBackSide()) buffer[layer === "figures" ? "backFigures" : "backLines"].push(line)
		pts = []}

	for(let p of points) {
		let [c3D, s2D] = project(p, fromMode)
		let wrapsAntipode = mode.viewMode === "planetarium" && previousCamera &&
			previousCamera[0] < 0 && c3D[0] < 0 &&
			previousCamera[1] * c3D[1] + previousCamera[2] * c3D[2] < 0
		let jumpsAcrossMap = mode.viewMode === "planetarium" && pts.length > 0 &&
			Math.hypot(s2D[0] - pts[pts.length - 1][0], s2D[1] - pts[pts.length - 1][1]) >
			Math.hypot(view.w, view.h)
		if(wrapsAntipode || jumpsAcrossMap) {
			flush()
			side = null}
		let currentSide = isVisibleSide(c3D)
		if(side === null) side = currentSide
		if(currentSide !== side) {
			let prev = pts[pts.length - 1]
			if(prev) {
				let mean = scale(translate(prev, s2D), 0.5)
				pts.push(mean)
				flush()
				pts = [mean]}
				side = currentSide}
		pts.push(s2D)
		previousCamera = c3D}
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

function getStarRenderVectors() {
	let k = [param.julianDay.toFixed(10), show.properMotion].join("|")
	if(!cache.stars || cache.stars.key !== k)
		cache.stars = {key: k, vectors: STARS.map((p, i) => fromNirayana(getStarPosition(i)))}
	if(!refractionEnabled()) return {vectors: cache.stars.vectors, fromMode: "equatorial"}
	let rk = [k, param.sidereal.toFixed(10), param.latitude.toFixed(10)].join("|")
	if(!cache.refractedStars || cache.refractedStars.key !== rk)
		cache.refractedStars = {key: rk, vectors: cache.stars.vectors.map(p =>
			p[0] === 0 && p[1] === 0 && p[2] === 0 ? [0, 0, 0] : refractHorizontal(toHorizontal(p)))}
	return {vectors: cache.refractedStars.vectors, fromMode: "horizontal"}}

function pushStars(showPoints = true) {
	let stars = getStarRenderVectors()
	if(!showPoints) return stars
	let m = 0
	for(let s of stars.vectors) {
		if(s[0] === 0 && s[1] === 0 && s[2] === 0) {m++; continue}
		let [c3D, s2D] = project(s, stars.fromMode)
		let point = {position: s2D, magnitude: m}
		if(isVisiblePoint(c3D)) buffer.frontStars.push(point)
		else if(canDrawBackSide()) buffer.backStars.push(point)}
	return stars}

function drawStars(stars) {
	let r = view.r0 * view.f / Math.sqrt(view.f * view.f - 1)
	CTX.fillStyle = mode.darkTheme ? "white" : "black"
	for(let s of stars) {
		let [x, y] = s.position
		let dx = x - view.x0
		let dy = y - view.y0
		if(mode.viewMode === "armillarium" && dx * dx + dy * dy > r * r) continue
		let size = 5 - s.magnitude
		if(size < 3) {
			CTX.fillRect(Math.round(x - size * 0.5), Math.round(y - size * 0.5), size, size)}
		else {
			CTX.beginPath()
			CTX.arc(x, y, size * 0.5, 0, TWO_PI)
			CTX.fill()}}}

function pushNakshatras() {
	for(let n = 0; n < NAKSHATRAS.length; n++) {
		let nakshatra = NAKSHATRAS[n]
		let positions = nakshatra.stars.map(star => getNakshatraStarPosition(star))
		if(show.nakshatras) {
			let rendered = positions.map(p => celestialRenderPosition(fromNirayana(p)))
			let figure = NAKSHATRA_FIGURES[n]
			for(let i = 0; i < figure.length; i += 2)
				pushLines({points: [rendered[figure[i]].position, rendered[figure[i + 1]].position],
					color: "rgba(192, 192, 0, 0.6)", width: 4,
					fromMode: rendered[0].fromMode, layer: "figures"})
			for(let i = 0; i < rendered.length; i++) {
				let [c3D, s2D] = project(rendered[i].position, rendered[i].fromMode)
				let marker = {position: s2D, yogatara: nakshatra.stars[i][4] === true}
				if(isVisiblePoint(c3D)) buffer.frontNakshatras.push(marker)
				else if(canDrawBackSide()) buffer.backNakshatras.push(marker)}}
		if(show.nakshatraNames) {
			pushLabels([{
				name: NAKSHATRA_NAMES[n],
				position: fromNirayana(toXYZ((n + 0.5) * 360 / 27, 0)),
				fromMode: "equatorial",
				color: color.galactic,
				edge: mode.darkTheme ? "black" : "white",
				border: 2, size: 11}])}}
}

function drawNakshatras(markers) {
	CTX.strokeStyle = color.galactic
	CTX.lineWidth = 2.5
	CTX.lineJoin = "round"
	for(let marker of markers) {
		let [x, y] = marker.position
		CTX.beginPath()
		if(marker.yogatara) {
			for(let i = 0; i < 10; i++) {
				let angle = -Math.PI / 2 + i * Math.PI / 5
				let radius = i % 2 ? 2.25 : 4.5
				let px = x + radius * Math.cos(angle), py = y + radius * Math.sin(angle)
				if(i === 0) CTX.moveTo(px, py); else CTX.lineTo(px, py)}
			CTX.closePath()}
		else CTX.arc(x, y, 2.5, 0, TWO_PI)
		CTX.stroke()}}

function pushNakshatraBoundaryTicks() {
	for(let i = 0; i < 27; i++) {
		let longitude = i * 360 / 27
		pushLines({
			points: [-1, 1].map(latitude => fromNirayana(toXYZ(longitude, latitude))),
			color: color.galactic, width: 2})}}

function pushPoints(points) {
	for(let p of points) {
		let {position, point = {}, text = {}, fromMode = "equatorial"} = p
		let [c3D, s2D] = project(position, fromMode)
		if(mode.viewMode === "planetarium" && !isVisiblePoint(c3D)) continue
		let aboveHorizon = isAtOrAboveHorizon(position, fromMode)
		let marker = {...point, position: s2D, aboveHorizon}
		let label = {text: "", color: point.color || "white", size: 16, ...text,
			position: s2D, aboveHorizon}
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
		if(isVisiblePoint(c3D)) {
			buffer.frontPoints.push(marker)
			if(label.text !== "") buffer.frontTexts.push(label)}
		else if(canDrawBackSide()) {
			buffer.backPoints.push(marker)
			if(label.text !== "") buffer.backTexts.push(label)}}}

function pushLabels(labels) {
	for(let label of labels) {
		let fromMode = label.fromMode || "equatorial"
		let [c3D, s2D] = project(label.position, fromMode)
		if(mode.viewMode === "planetarium" && !isVisiblePoint(c3D)) continue
		let text = {...label, position: s2D,
			aboveHorizon: isAtOrAboveHorizon(label.position, fromMode)}
		delete text.name
		delete text.fromMode
		if(text.text === undefined) text.text = label.name
		if(text.float) {
			let [x, y] = s2D
			let dx = x - view.x0
			let dy = y - view.y0
			let len = Math.hypot(dx, dy)
			if(len < 1e-6) {dx = 0; dy = -1; len = 1}
			dx /= len
			dy /= len
			CTX.font = (text.weight ? text.weight + " " : "") + (text.size || 12) + "px sans-serif"
			let m = CTX.measureText(text.text)
			let height = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || text.size || 12
			text.position = [
				x + dx * (10 + m.width / 2),
				y + dy * (10 + height / 2)]}
		delete text.float
		if(isVisiblePoint(c3D)) buffer.frontTexts.push(text)
		else if(canDrawBackSide()) buffer.backTexts.push(text)}}

function drawPoints(ctx, points, aboveHorizonOnly = false) {
	for(let p of points) {
		if(aboveHorizonOnly && !p.aboveHorizon) continue
		ctx.beginPath()
		ctx.arc(p.position[0], p.position[1], p.size || 3, 0, TWO_PI)
		ctx.fillStyle = p.color || "white"
		ctx.fill()
		if(p.edge) {
			ctx.lineWidth = p.border || 1
			ctx.strokeStyle = p.edge
			ctx.stroke()}}}

function drawTexts(ctx, texts, aboveHorizonOnly = false) {
	for(let t of texts) {
		if(aboveHorizonOnly && !t.aboveHorizon) continue
		ctx.font = (t.weight ? t.weight + " " : "") + (t.size || 12) + "px sans-serif"
		ctx.textAlign = t.align || "center"
		ctx.textBaseline = t.baseline || "middle"
		ctx.fillStyle = t.color || "white"
		ctx.save()
		ctx.translate(t.position[0], t.position[1])
		ctx.rotate(t.rotation || 0)
		let lines = String(t.text).split("\n")
		let lineHeight = t.lineHeight || (t.size || 12) * 1.1
		for(let i = 0; i < lines.length; i++) {
			let y = (i - (lines.length - 1) / 2) * lineHeight
			if(t.edge) {
				ctx.lineWidth = t.border || 1
				ctx.strokeStyle = t.edge
				ctx.strokeText(lines[i], 0, y)}
			ctx.fillText(lines[i], 0, y)}
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

function getPlanetariumHorizon() {
	let points = localHorizon().map(point => project(point, "horizontal"))
	return {points}}

function planetariumEdgeIsDiscontinuous(a, b) {
	let [camera0, screen0] = a, [camera1, screen1] = b
	return camera0[0] < 0 && camera1[0] < 0 &&
		camera0[1] * camera1[1] + camera0[2] * camera1[2] < 0 ||
		Math.hypot(screen1[0] - screen0[0], screen1[1] - screen0[1]) >
		Math.hypot(view.w, view.h)}

function drawPlanetariumGround(horizon = getPlanetariumHorizon()) {
	CTX.fillStyle = mode.darkTheme ? "rgb(0, 20, 0)" : "rgb(235, 255, 235)"
	CTX.beginPath()
	let center = fromScreen([1, 0, 0], mode.orientation, "horizontal")
	if(isAtOrAboveHorizon(center, "horizontal"))
		CTX.rect(0, 0, view.w, view.h)
	let points = horizon.points
	if(points.length > 0) {
		CTX.moveTo(points[0][1][0], points[0][1][1])
		for(let i = 1; i < points.length; i++)
			CTX.lineTo(points[i][1][0], points[i][1][1])
		CTX.closePath()}
	CTX.fill("evenodd")}

function drawPlanetariumHorizon(horizon = getPlanetariumHorizon()) {
	if(!show.horizon) return
	CTX.strokeStyle = color.horizontal
	CTX.lineWidth = 3
	CTX.setLineDash([])
	CTX.beginPath()
	let points = horizon.points
	if(points.length < 2) return
	CTX.moveTo(points[0][1][0], points[0][1][1])
	for(let i = 1; i < points.length; i++) {
		let previous = points[i - 1], current = points[i]
		if(planetariumEdgeIsDiscontinuous(previous, current))
			CTX.moveTo(current[1][0], current[1][1])
		else CTX.lineTo(current[1][0], current[1][1])}
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
	UI.altitudeValue.textContent = formatSignedAngleDMS(alt, 2)
	CTX.strokeStyle = "gray"
	CTX.lineWidth = 1.5
	CTX.beginPath()
	let r = 5
	CTX.moveTo(view.x0 - r, view.y0 - r)
	CTX.lineTo(view.x0 + r, view.y0 + r)
	CTX.moveTo(view.x0 - r, view.y0 + r)
	CTX.lineTo(view.x0 + r, view.y0 - r)
	CTX.stroke()}

const AXES = [[+1,  0,  0], [-1,  0,  0], [ 0, +1,  0], [ 0, -1,  0], [ 0,  0, +1], [ 0,  0, -1]]

function requestSkyRender() {
	if(update.frame) return
	update.frame = true
	requestAnimationFrame(renderSky)}

function renderSky() {
	update.frame = false
	if(update.view) {
		let mTS = mul(rotateY(view.pitch), rotateZ(view.yaw))
		if (view.orienting) mTS = mul(rotateX(view.roll), mTS)
		matrix.toScreen = mTS
		matrix.fromScreen = transpose(matrix.toScreen)
		update.view = false}
	if(!update.sky) return
	update.sky = false
	let planetarium = mode.viewMode === "planetarium"
	if(planetarium) {
		let scale = getPlanetariumScale()
		projectCamera = camera3D => {
			let length = Math.hypot(...camera3D)
			let s = 2 * scale / Math.max(length + camera3D[0], 0.001)
			return [view.x0 - camera3D[1] * s, view.y0 - camera3D[2] * s]}}
	else {
		let scale = view.r0 * view.f
		projectCamera = camera3D => {
			let s = scale / (view.f - camera3D[0])
			return [view.x0 + camera3D[1] * s, view.y0 - camera3D[2] * s]}}
	cache.horizonVisibility.clear()

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
	if(show.nakshatraNames) pushNakshatraBoundaryTicks()
	if(show.eclipticMeridian) pushLines({points: meridian(0).map(fromNirayana), color: color.ecliptic, width: 3})
	if(show.equator) pushLines({points: parallel(0), color: color.equatorial, width: 3})
	if(show.equatorialMeridian) pushLines({points: meridian(0), color: color.equatorial, width: 3})
	let horizonDip = getHorizonDip()
	if(show.horizon) {
		pushLines({points: localHorizon().map(fromHorizontal), color: color.horizontal, width: 3})
		if(horizonDip > 0 && !show.horizontalGraticule)
			pushLines({points: parallel(0).map(fromHorizontal), color: "rgba(0, 192, 0, 0.65)", width: 1})}
	if(show.horizontalMeridian) pushLines({points: meridian(90).map(fromHorizontal), color: color.horizontal, width: 3})
	if(show.observerMeridian) pushLines({points: meridian(param.sidereal), color: color.horizontal, width: 3})
	if(show.seasonalTriangles) pushSeasonalTriangles()
	if(show.analemma) pushAnalemma()
	if(show.nakshatras || show.nakshatraNames) pushNakshatras()

	if(show.constellationNames)
		pushLabels(CONSTELLATION_NAMES.map(label => ({
			name: label.name,
			...celestialRenderPosition(fromNirayana(label.position)),
			color: show.zodiac && ZODIAC_NAMES.has(label.name) ? color.zodiac : color.constellations,
			edge: mode.darkTheme ? "black" : "white",
			border: 2, size: 11})))
	if(show.starNames)
		pushLabels(STAR_LABELS.map(label => ({
			name: label.name,
			...celestialRenderPosition(fromNirayana(getStarPosition(label.index))),
			color: c,
			edge: mode.darkTheme ? "black" : "white",
			border: 2, size: 11, float: show.stars})))

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
		let cardinalAzimuths = [0, 180, 90, 270]
		let horizontalAxes = cardinalAzimuths.map(azimuth =>
			toXYZ(azimuth, -getHorizonDip(param.latitude, param.elevation, azimuth)))
		horizontalAxes.push(AXES[4], AXES[5])
		pushPoints(horizontalAxes.map((axis, i) => ({
			position: fromHorizontal(axis),
			point: {size: 5, color: color.horizontal},
			text: {text: ["East", "West", "North", "South", "Zenith", "Nadir"][i], color: c}})))
		pushPoints([{
			position: fromNirayana(getTopoLagna(param.sidereal, param.latitude,
				param.ayanamsa, param.obliquity, param.elevation)),
			point: {size: 6, color: color.horizontal, border: 2, edge: c},
			text: {text: "Lagna", color: c}}])}

	if(show.constellations || show.zodiac || show.stars) {
		let stars = pushStars(show.stars)
		let s = stars.vectors
		if(show.constellations) {
			for(let c of CONSTELLATIONS) {
				for(let i = 0; i < c.length; i += 2)
					pushLines({points: [s[c[i]], s[c[i + 1]]], color: color.constellations,
						width: 0.75, fromMode: stars.fromMode, layer: "figures"})}}
		if(show.zodiac) {
			for(let z of ZODIAC) {
				let c = CONSTELLATIONS[z]
				for(let i = 0; i < c.length; i += 2)
					pushLines({points: [s[c[i]], s[c[i + 1]]], color: color.zodiac,
						width: 1.5, fromMode: stars.fromMode, layer: "figures"})}}}

	if(show.sun || show.moon || show.planets || show.moonsOrbit ||
		show.eclipses || show.halo || show.rainbow) pushSolarSystem()

	CTX.fillStyle = mode.darkTheme ? "black" : "white"
	CTX.fillRect(0, 0, view.w, view.h)
	if(mode.viewMode === "armillarium" && !show.surface) {
		drawLines(CTX, buffer.backLines)
		drawNakshatras(buffer.backNakshatras)
		drawLines(CTX, buffer.backFigures)
		drawStars(buffer.backStars)
		drawPoints(CTX, buffer.backPoints)
		drawTexts(CTX, buffer.backTexts)}
	if(mode.viewMode === "armillarium" && show.surface) drawSphere()
	drawLines(CTX, buffer.frontLines)
	drawNakshatras(buffer.frontNakshatras)
	drawLines(CTX, buffer.frontFigures)
	drawStars(buffer.frontStars)
	drawPoints(CTX, buffer.frontPoints)
	drawTexts(CTX, buffer.frontTexts)
	if(mode.viewMode === "planetarium" && show.surface) {
		let horizon = getPlanetariumHorizon()
		drawPlanetariumGround(horizon)
		drawPlanetariumHorizon(horizon)
		drawPoints(CTX, buffer.frontPoints, true)
		drawTexts(CTX, buffer.frontTexts, true)}

	drawPath()
	drawCrosshair()}

function zoomInOut(scale) {
	view.r0 *= scale
	clampViewZoom()
	update.sky = true
	requestSkyRender()}
