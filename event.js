function parseNumber(value, fallback) {
	const input = value && typeof value === "object" && "value" in value ? value : null
	function parse(text) {
		text = String(text ?? "").trim().replace(/−/g, "-").replace(/,/g, "")
		return text === "" ? NaN : Number(text)}
	let number = parse(input ? input.value : value)
	if(!Number.isFinite(number)) {
		if(fallback === undefined && input) fallback = input.nudgeFallback
		number = parse(fallback)}
	return Number.isFinite(number) ? number : NaN}

function addNudgeListeners(input, nudge, commit = null) {
	function remember() {
		input.nudgeFallback = input.value
		if(typeof modal !== "undefined") modal.temp.fallback = input.value}
	if(commit) input.onchange = commit
	input.addEventListener("focus", remember)
	input.addEventListener("keydown", event => {
		if(event.key === "Enter" && commit) {event.preventDefault(); commit(); return}
		if(event.key !== "ArrowUp" && event.key !== "ArrowDown") return
		event.preventDefault()
		nudge(event.key === "ArrowUp" ? 1 : -1, !event.shiftKey)
		remember()})
	input.addEventListener("wheel", event => {
		if(event.ctrlKey || event.metaKey || event.deltaY === 0) return
		event.preventDefault()
		nudge(event.deltaY < 0 ? 1 : -1, !event.shiftKey)
		remember()}, {passive: false})}

function getCurrentLocation() {
	if(!navigator.geolocation)
		return Promise.reject(new Error("Location access is not supported by this browser."))
	return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
		position => {
			param.latitude = Math.round(mod(position.coords.latitude, 180, -90) * 100) / 100
			param.longitude = Math.round(mod(position.coords.longitude, 360, -180) * 100) / 100
			param.elevation = 0
			param.timeZone = Math.round(param.longitude / 15)
			resolve()},
		() => reject(new Error("Location access failed."))))}

function getCurrentDateTime() {
	const now = new Date()
	const local = new Date(now.getTime() + param.timeZone * 3600000)
	param.year = local.getUTCFullYear()
	param.month = local.getUTCMonth() + 1
	param.day = local.getUTCDate()
	param.time = 15 * (local.getUTCHours() + local.getUTCMinutes() / 60)
	param.julianDay = getJulianDay()}

if(document.getElementById("sky")) {
const panelScrollControls = [
	[UI.leftPanel, UI.leftPanelScrollUp, UI.leftPanelScrollDown],
	[UI.rightPanel, UI.rightPanelScrollUp, UI.rightPanelScrollDown]]

function updatePanelScrollButtons() {
	for(let [panel, up, down] of panelScrollControls) {
		let overflowing = panel.scrollHeight > panel.clientHeight + 1
		up.style.display = overflowing && panel.scrollTop > 1 ? "block" : "none"
		down.style.display = overflowing &&
			panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1 ? "block" : "none"}}

function updateRangeFill(input) {
	const minimum = Number(input.min), maximum = Number(input.max), value = Number(input.value)
	const progress = maximum > minimum ? 100 * (value - minimum) / (maximum - minimum) : 0
	input.style.setProperty("--range-progress", Math.max(0, Math.min(100, progress)) + "%")}

function updateAllRangeFills() {
	for(const input of document.querySelectorAll('input[type="range"]')) updateRangeFill(input)}

for(const input of document.querySelectorAll('input[type="range"]')) {
	updateRangeFill(input)
	input.addEventListener("input", () => updateRangeFill(input))
	input.addEventListener("change", () => updateRangeFill(input))}

for(let [panel, up, down] of panelScrollControls) {
	up.onclick = () => panel.scrollBy({top: -0.8 * panel.clientHeight, behavior: "smooth"})
	down.onclick = () => panel.scrollBy({top: 0.8 * panel.clientHeight, behavior: "smooth"})
	panel.addEventListener("scroll", updatePanelScrollButtons)
	let isDown = false
	let startY
	let scrollTop
	panel.onmousedown = e => {
		if(e.target.closest("input, button, select, textarea")) return
		isDown = true
		panel.style.cursor = "grabbing"
		startY = e.pageY - panel.offsetTop
		scrollTop = panel.scrollTop}
	panel.onmouseup = () => {
		isDown = false
		panel.style.cursor = "grab"}
	panel.onmouseleave = () => {
		isDown = false
		panel.style.cursor = "grab"}
	panel.onmousemove = e => {
		if(!isDown) return
		e.preventDefault()
		panel.scrollTop = scrollTop - e.pageY + panel.offsetTop + startY}}

UI.orientationDropdown.onchange = () => {
	view.orienting = true
	input.dragging = false
	input.activePointers.clear()
	input.pinchStartDist = null
	let oldMode = mode.orientation
	let newMode = UI.orientationDropdown.value
	if(oldMode === newMode) return
	let a0 = 0; a1 = 0
	let p = toScreen([0, 0, 1], newMode, oldMode)
	if(p[1] !== 0 || p[2] !== 0) a1 = Math.atan2(p[1], p[2]) / DEGREE

	function animate() {
		a0 += 0.05
		if(a0 > 1) a0 = 1
		let k = a0 * a0 * (3 - 2 * a0)
		view.roll = a1 * k
		update.view = true
		update.sky = true
		requestSkyRender()
		if(a0 < 1) {requestAnimationFrame(animate); return}
		let [t, p] = toTP(fromScreen([1, 0, 0], oldMode, newMode))
		view.yaw = mod(-t, 360)
		view.pitch = p
		view.roll = 0
		view.orienting = false
		mode.orientation = newMode
		update.view = true
		update.sky = true
		requestSkyRender()}

	animate()}

UI.viewModeDropdown.onchange = () => {
	mode.viewMode = UI.viewModeDropdown.value
	UI.surfaceLabel.textContent = mode.viewMode === "planetarium" ?
		"Earth's Ground" : "Celestial Sphere"
	input.dragging = false
	input.activePointers.clear()
	input.pinchStartDist = null
	clampViewZoom()
	update.sky = true
	requestSkyRender()}

UI.darkThemeCheckbox.onchange = () => {
	mode.darkTheme = UI.darkThemeCheckbox.checked
	let i = mode.darkTheme ? 0 : 1
	document.body.dataset.theme = mode.darkTheme ? "dark" : "light"
	document.body.style.colorScheme = ["dark", "light"][i]
	document.querySelectorAll("#leftPanel, #rightPanel, .modal, .panelScrollButton").forEach(
		e => e.style.color = ["white", "black"][i])
	document.querySelectorAll(".box, .modal").forEach(e => e.style.background = ["black", "white"][i])
	document.querySelectorAll(".colorLegend").forEach(e => e.style.borderColor = ["white","black"][i])
	document.querySelectorAll('input[type="radio"]').forEach(e => {e.style.accentColor = ["white","black"][i]})
	document.querySelectorAll("#orientationDropdown, #viewModeDropdown").forEach(e => {
		e.style.background = ["#3b3b3b", "#efefef"][i]
		e.style.color = ["white", "black"][i]})
	document.querySelectorAll(".shortButton, .setButton, .longButton").forEach(e => {
		e.style.background = ["#efefef", "#3b3b3b"][i]
		e.style.color = ["black", "white"][i]})
	for(let e of document.querySelectorAll(".panelScrollButton")) {
		e.style.background = ["#efefef", "#3b3b3b"][i]
		e.style.color = ["black", "white"][i]}
	UI.modalBackground.style.background = ["rgba(255, 255, 255, 0.5)", "rgba(0, 0, 0, 0.5)"][i]
	update.sky = true
	requestSkyRender()}

UI.drawCheckbox.onchange = () => {
	mode.draw = UI.drawCheckbox.checked
	UI.sky.style.cursor = mode.draw ? "crosshair" : "grab"
	if(!mode.draw) {
		input.drawing = false
		input.drawPath = []
		update.sky = true
		requestSkyRender()}}

for (let s in show) {
	let e = UI[s + "Checkbox"]
	e.checked = show[s]
	e.onchange = () => {
		show[s] = e.checked
		update.sky = true
		requestSkyRender()}}

UI.eclipticLegend.style.background = color.ecliptic
UI.equatorialLegend.style.background = color.equatorial
UI.horizontalLegend.style.background = color.horizontal

function getRangeCoarseStep(s) {
	let min = parseFloat(s.min)
	let max = parseFloat(s.max)
	let baseStep = parseFloat(s.step)
	let n = Math.round(Math.sqrt((max - min) / baseStep))
	return parseFloat(s.dataset.coarseStep) || Math.round((max - min) / n / baseStep) * baseStep}

function snapRangeValue(s, value, step = getRangeCoarseStep(s)) {
	let min = parseFloat(s.min)
	let max = parseFloat(s.max)
	value = Math.round(value / step) * step
	return parseFloat(Math.max(min, Math.min(max, value)).toFixed(10))}

function getMonthStops(s) {
	let stops = [1]
	for(let days of getMonthDays()) stops.push(stops[stops.length - 1] + days)
	stops[stops.length - 1] = parseFloat(s.max)
	return stops}

function snapRangeCoarse(s, value) {
	if(s.dataset.coarseUnit !== "month") return snapRangeValue(s, value)
	return getMonthStops(s).reduce((nearest, stop) =>
		Math.abs(stop - value) < Math.abs(nearest - value) ? stop : nearest)}

function moveRangeCoarse(s, value, dir) {
	if(s.dataset.coarseUnit !== "month") {
		let step = getRangeCoarseStep(s)
		return snapRangeValue(s, snapRangeValue(s, value, step) + dir * step, step)}
	let stops = getMonthStops(s)
	let snapped = snapRangeCoarse(s, value)
	let i = stops.indexOf(snapped)
	return stops[Math.max(0, Math.min(stops.length - 1, i + dir))]}

document.querySelectorAll('input[type="range"]').forEach(s => {
	let coarsePointer = false
	s.addEventListener("pointerdown", e => {coarsePointer = !e.shiftKey})
	s.addEventListener("pointerup", () => {coarsePointer = false})
	s.addEventListener("pointercancel", () => {coarsePointer = false})
	s.addEventListener("input", () => {
		if(coarsePointer) s.value = snapRangeCoarse(s, parseFloat(s.value))}, {capture: true})
	s.addEventListener("keydown", e => {
		if(e.shiftKey || !["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"].includes(e.key)) return
		e.preventDefault()
		let dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : -1
		s.value = moveRangeCoarse(s, parseFloat(s.value), dir)
		s.dispatchEvent(new Event("input"))})
	s.addEventListener("wheel", e => {
		e.preventDefault()
		let min = parseFloat(s.min)
		let max = parseFloat(s.max)
		let current = parseFloat(s.value)
		let baseStep = parseFloat(s.step)
		let coarseStep = getRangeCoarseStep(s)
		let step = e.shiftKey ? baseStep : coarseStep
		let dir = Math.sign(e.deltaY)
		if((dir > 0 && current <= min) || (dir < 0 && current >= max)) return
		let value = e.shiftKey ? current - dir * step : moveRangeCoarse(s, current, -dir)
		if(e.shiftKey) value = min + Math.round((value - min) / baseStep) * baseStep
		if(value < min) value = min
		if(value > max) value = max
		value = parseFloat(value.toFixed(10))
		if(value === current) return
		s.value = value
		s.dispatchEvent(new Event("input"))},
		{passive: false})})

UI.latitudeSlider.oninput = () => {
	param.latitude = parseFloat(UI.latitudeSlider.value)
	updateLatitude()
	updateHorizontal()
	update.sky = true
	requestSkyRender()}

UI.longitudeSlider.oninput = () => {
	param.longitude = parseFloat(UI.longitudeSlider.value)
	updateLongitude()
	requestSkyRender()}

UI.elevationSlider.oninput = () => {
	updateElevation(parseFloat(UI.elevationSlider.value))
	requestSkyRender()}

UI.hereButton.onclick = () => getCurrentLocation().then(() => {
	UI.latitudeSlider.value = param.latitude
	UI.longitudeSlider.value = param.longitude
	UI.elevationSlider.value = param.elevation
	updateLatitude()
	updateLongitude()
	UI.elevationSlider.dispatchEvent(new Event("input"))
	updateAllRangeFills()
	requestSkyRender()
}).catch(error => alert(error.message))

UI.yearSlider.oninput = () => {
	param.year = parseInt(UI.yearSlider.value)
	if(param.month === 2 && param.day === 29 && getYearDays() !== 366) {
		param.month = 2
		param.day = 28}
	updateYear()
	requestSkyRender()}

UI.dayOfYearSlider.oninput = () => {
	param.dayOfYear = parseInt(UI.dayOfYearSlider.value)
	let days = getMonthDays()
	param.day = param.dayOfYear
	param.month = 1
	while(param.day > days[param.month - 1]) {param.day -= days[param.month - 1]; param.month++}
	updateMonthDay()
	requestSkyRender()}

UI.timeSlider.oninput = () => {
	param.time = parseFloat(UI.timeSlider.value)
	updateTime()
	requestSkyRender()}

function centerViewOnSun(jc = param.julianCentury) {
	let sun = normalize(fromNirayana(translate(scale(geoMoon()[0], 1 / MASS_FACTOR),
		negate(translate(helioEMB(), geoObserver)))))
	let centered = refractionEnabled() ?
		refractHorizontal(toHorizontal(sun)) : changeSystem(sun, "equatorial", mode.orientation)
	let [t, p] = toTP(centered)
	view.yaw = mod(-t, 360)
	view.pitch = p
	update.view = true
	update.sky = true}

UI.nowButton.onclick = () => {
	getCurrentDateTime()
	updateYear()
	updateAllRangeFills()
	centerViewOnSun()
	requestSkyRender()}

UI.sky.onpointerdown = e => {
	if(mode.draw) {
		input.drawing = true
		input.drawPath.push([[e.clientX, e.clientY]])
		return}
	if(view.orienting) return
	if(e.pointerType === "touch") input.activePointers.set(e.pointerId, e)
	input.dragging = true
	input.lastX = e.clientX
	input.lastY = e.clientY
	UI.sky.setPointerCapture(e.pointerId)}

window.onpointermove = e => {
	if(view.orienting) return
	if(mode.draw && input.drawing) {
		let path = input.drawPath[input.drawPath.length - 1]
		path.push([e.clientX, e.clientY])
		update.sky = true
		requestSkyRender()
		return}
	if(input.activePointers.has(e.pointerId)) input.activePointers.set(e.pointerId, e)
	if(mode.draw && input.activePointers.size) {
		input.activePointers.clear()
		input.pinchStartDist = null
		return}
	if(input.activePointers.size === 2) {
		let [p1, p2] = [...input.activePointers.values()]
		let d = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY)
		if(input.pinchStartDist === null) {input.pinchStartDist = d; return}
		let s = d / input.pinchStartDist
		input.pinchStartDist = d
		zoomInOut(s)
		return}
	if(mode.draw || !input.dragging) return
	let x = e.clientX
	let y = e.clientY
	let dx = x - input.lastX
	let dy = y - input.lastY
	input.lastX = x
	input.lastY = y
	let sensitivity = 500 / (view.r0 * view.f)
	let horizontalDirection = mode.viewMode === "planetarium" ? -1 : 1
	view.yaw = mod(view.yaw + horizontalDirection * dx * sensitivity, 360)
	view.pitch = clip(view.pitch + dy * sensitivity, -90, 90)
	update.view = true
	update.sky = true
	requestSkyRender()}

window.onpointerup = e => {
	if(view.orienting) return
	if(mode.draw) input.drawing = false
	input.activePointers.delete(e.pointerId)
	if(input.activePointers.size < 2) input.pinchStartDist = null
	input.dragging = false
	if(UI.sky.hasPointerCapture(e.pointerId)) UI.sky.releasePointerCapture(e.pointerId)}
window.onpointercancel = window.onpointerup

UI.sky.addEventListener("wheel", e => {
	if(mode.draw || view.orienting) return
	e.preventDefault()
	zoomInOut(1 - e.deltaY * 0.001)},
	{passive: false})

window.onresize = () => {
	resize()
	updatePanelScrollButtons()
	update.sky = true
	requestSkyRender()}

if(typeof initializeModalEvents === "function") initializeModalEvents()

setDateTime()
updateLatitude()
UI.latitudeSlider.value = param.latitude
updateLongitude()
UI.longitudeSlider.value = param.longitude
applyURLParams()
updateAllRangeFills()
centerViewOnSun()
resize()
updatePanelScrollButtons()
window.addEventListener("load", updatePanelScrollButtons)
requestSkyRender()

}

if(typeof initializeModalEvents === "function") initializeModalEvents()
