for(let panel of [UI.leftPanel, UI.rightPanel]) {
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
	let a = UI.analemmaCheckbox.parentElement
	if(newMode === "horizontal") {
		UI.analemmaCheckbox.disabled = false
		a.style.color = mode.darkTheme ? "white" : "black"}
	else {
		UI.analemmaCheckbox.disabled = true
		UI.analemmaCheckbox.checked = false
		show.analemma = false
		a.style.color = "gray"}
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
		render()
		if(a0 < 1) {requestAnimationFrame(animate); return}
		let [t, p] = toTP(fromScreen([1, 0, 0], oldMode, newMode))
		view.yaw = mod(-t, 360)
		view.pitch = p
		view.roll = 0
		view.orienting = false
		mode.orientation = newMode
		update.view = true
		update.sky = true
		render()}

	animate()}

UI.darkThemeCheckbox.onchange = () => {
	mode.darkTheme = UI.darkThemeCheckbox.checked
	let i = mode.darkTheme ? 0 : 1
	document.body.style.colorScheme = ["dark", "light"][i]
	document.querySelectorAll("#leftPanel, #rightPanel, .modal").forEach(e => e.style.color = ["white", "black"][i])
	document.querySelectorAll(".box, .modal").forEach(e => e.style.background = ["black", "white"][i])
	document.querySelectorAll(".colorLegend").forEach(e => e.style.borderColor = ["white","black"][i])
	document.querySelectorAll('input[type="radio"]').forEach(e => {e.style.accentColor = ["white","black"][i]})
	document.querySelectorAll("#orientationDropdown, .shortButton, .setButton, .longButton").forEach(e => {
		e.style.background = ["#3b3b3b", "#efefef"][i]
		e.style.color = ["white", "black"][i]})
	UI.modalBackground.style.background = ["rgba(255, 255, 255, 0.5)", "rgba(0, 0, 0, 0.5)"][i]
	update.sky = true
	render()}

UI.drawCheckbox.onchange = () => {
	mode.draw = UI.drawCheckbox.checked
	UI.sky.style.cursor = mode.draw ? "crosshair" : "grab"
	if(!mode.draw) {
		input.drawing = false
		input.drawPath = []
		update.sky = true
		render()}}

for (let s in show) {
	let e = UI[s + "Checkbox"]
	e.checked = show[s]
	e.onchange = () => {
		show[s] = e.checked
		update.sky = true
		render()}}

UI.eclipticLegend.style.background = color.ecliptic
UI.equatorialLegend.style.background = color.equatorial
UI.horizontalLegend.style.background = color.horizontal

document.querySelectorAll('input[type="range"]').forEach(s =>
	s.addEventListener("wheel", e => {
		e.preventDefault()
		let min = parseFloat(s.min)
		let max = parseFloat(s.max)
		let current = parseFloat(s.value)
		let range = max - min
		let baseStep = parseFloat(s.step)
		let n = Math.round(Math.sqrt(range / baseStep))
		let step = e.shiftKey ? range / n : baseStep
		let dir = Math.sign(e.deltaY)
		if((dir > 0 && current <= min) || (dir < 0 && current >= max)) return
		let value = min + Math.round((current - dir * step - min) / baseStep) * baseStep
		if(value < min) value = min
		if(value > max) value = max
		value = parseFloat(value.toFixed(10))
		if(value === current) return
		s.value = value
		s.dispatchEvent(new Event("input"))},
		{passive: false}))

UI.latitudeSlider.oninput = () => {
	param.latitude = parseFloat(UI.latitudeSlider.value)
	updateLatitude()
	updateHorizontal()
	update.sky = true
	render()}

UI.longitudeSlider.oninput = () => {
	param.longitude = parseFloat(UI.longitudeSlider.value)
	updateLongitude()
	render()}

UI.hereButton.onclick = () => navigator.geolocation.getCurrentPosition(p => {
	param.latitude = Math.round(mod(p.coords.latitude, 180, -90) * 100) / 100
	updateLatitude()
	param.longitude = Math.round(mod(p.coords.longitude, 360, -180) * 100) / 100
	updateLongitude()
	render()}, error => alert("Location access failed."))

UI.yearSlider.oninput = () => {
	param.year = parseInt(UI.yearSlider.value)
	updateYear()
	if(param.dayOfYear > 59) {
		let d = param.totalDays - param.totalDays
		if(d !== 0) param.dayOfYear += d > 0 ? 1 : -1}
	render()}

UI.dayOfYearSlider.oninput = () => {
	param.dayOfYear = parseInt(UI.dayOfYearSlider.value)
	let days = [31, param.totalDays === 366 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	param.day = param.dayOfYear
	param.month = 1
	while(param.day > days[param.month - 1]) {param.day -= days[param.month - 1]; param.month++}
	updateMonthDay()
	render()}

UI.timeSlider.oninput = () => {
	param.time = parseFloat(UI.timeSlider.value)
	updateTime()
	render()}

UI.nowButton.onclick = () => {
	setDateTime()
	render()}

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
		render()
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
	view.yaw = mod(view.yaw + dx * sensitivity, 360)
	view.pitch = clip(view.pitch + dy * sensitivity, -90, 90)
	update.view = true
	update.sky = true
	render()}

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
	update.sky = true
	render()}

document.querySelectorAll(".setButton").forEach(e => {e.onclick = () => {
	UI.latitudeInput.value = formatSignedAngleDecimal(param.latitude, 2).replace("°", "")
	UI.longitudeInput.value = formatSignedAngleDecimal(param.longitude, 2).replace("°", "")
	UI[param.year < 1 ? "eraBC" : "eraAD"].checked = true
	UI.yearInput.value = param.year > 0 ? param.year : Math.abs(param.year - 1)
	UI.monthInput.value = param.month
	UI.dayInput.value = param.day
	let [h, m, s] = toDMS(param.time / 15, 24)
	UI.hourInput.value = String(h).padStart(2, "0")
	UI.minuteInput.value = String(m).padStart(2, "0")
	UI.julianDayInput.value = param.julianDay.toFixed(5)
	drawWorldMap()
	UI.modalBackground.style.display = "flex"}})
UI.modalSetButton.onclick = () => {
	param.latitude = Number(UI.latitudeInput.value.replace("−", "-"))
	updateLatitude()
	param.longitude = Number(UI.longitudeInput.value.replace("−", "-"))
	updateLongitude()
	let y = Number(UI.yearInput.value)
	param.year = UI.eraBC.checked ? 1 - y : y
	param.month = Number(UI.monthInput.value)
	param.day = Number(UI.dayInput.value)
	param.time = 15 * (Number(UI.hourInput.value) + Number(UI.minuteInput.value) / 60)
	updateYear()
	render()
	UI.modalBackground.style.display = "none"}
UI.modalCancelButton.onclick = () => {
	UI.modalBackground.style.display = "none"}

let prevValue

UI.latitudeInput.onfocus = () => {prevValue = UI.latitudeInput.value}
UI.latitudeInput.onchange = () => {
	let v = UI.latitudeInput.value.trim().replace("−", "-")
	let l = Number(v)
	if(v === "" || !Number.isFinite(l) || l < -90 || l > 90) {
		alert("Please enter a valid latitude from −90° to +90°.")
		UI.latitudeInput.value = prevValue
		UI.latitudeInput.select()}
	else {
		UI.latitudeInput.value = formatSignedAngleDecimal(Math.round(l * 100) / 100, 2).replace("°", "")
		drawWorldMap()}}

UI.longitudeInput.onfocus = () => {prevValue = UI.longitudeInput.value}
UI.longitudeInput.onchange = () => {
	let v = UI.longitudeInput.value.trim().replace("−", "-")
	let l = Number(v)
	if(v === "" || !Number.isFinite(l) || l < -180 || l > 180) {
		alert("Please enter a valid longitude from −180° to +180°.")
		UI.longitudeInput.value = prevValue
		UI.longitudeInput.select()}
	else {
		l = Math.round(l * 100) / 100
		l = l === -180 ? 180 : l
		let al = Math.abs(l)
		UI.longitudeInput.value = al < 0.005 ? "0.00" : Math.abs(al - 180) < 0.005 ?
			"180.00" : (l > 0 ? "+" : "−") + al.toFixed(2)
		updateJulianDayInput()}}

if(UI.worldMap) {
	UI.worldMap.onpointerdown = e => {
		e.preventDefault()
		UI.worldMap.setPointerCapture(e.pointerId)
		UI.worldMap.dataset.dragging = "true"
		setLocationFromMap(e)}
	UI.worldMap.onpointermove = e => {
		if(UI.worldMap.dataset.dragging !== "true") return
		e.preventDefault()
		setLocationFromMap(e)}
	UI.worldMap.onpointerup = e => {
		UI.worldMap.dataset.dragging = "false"
		if(UI.worldMap.hasPointerCapture(e.pointerId)) UI.worldMap.releasePointerCapture(e.pointerId)}
	UI.worldMap.onpointercancel = UI.worldMap.onpointerup}

["eraAD", "eraBC"].forEach(id => {UI[id].onchange = () => updateJulianDayInput()})

UI.yearInput.onfocus = () => {prevValue = UI.yearInput.value}
UI.yearInput.onchange = () => {
	let v = UI.yearInput.value.trim()
	if(!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 5000) {
		alert("Please enter a valid year number from 1 to 5000.")
		UI.yearInput.value = prevValue
		UI.yearInput.select()}
	else {
		UI.yearInput.value = Math.round(Number(v))
		updateJulianDayInput()}}

UI.monthInput.onfocus = () => {prevValue = UI.monthInput.value}
UI.monthInput.onchange = () => {
	let v = UI.monthInput.value.trim()
	if(!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 12) {
		alert("Please enter a valid month number from 1 to 12.")
		UI.monthInput.value = prevValue
		UI.monthInput.select()}
	else {
		UI.monthInput.value = Math.round(Number(v))
		updateJulianDayInput()}}

UI.dayInput.onfocus = () => {prevValue = UI.dayInput.value}
UI.dayInput.onchange = () => {
	let v = UI.dayInput.value.trim()
	let x = [31, param.totalDays === 366 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][UI.monthInput.value - 1]
	if(!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > x) {
		alert("Please enter a valid day number from 1 to " + x + ".")
		UI.dayInput.value = prevValue
		UI.dayInput.select()}
	else {
		UI.dayInput.value = Math.round(Number(v))
		updateJulianDayInput()}}

UI.hourInput.onfocus = () => {prevValue = UI.hourInput.value}
UI.hourInput.onchange = () => {
	let v = UI.hourInput.value.trim()
	if(!/^\d+$/.test(v) || Number(v) < 0 || Number(v) > 23) {
		alert("Please enter a valid hour number from 0 to 23.")
		UI.hourInput.value = prevValue
		UI.hourInput.select()}
	else {
		updateJulianDayInput()
		UI.hourInput.value = String(Math.round(Number(v))).padStart(2, "0")}}

UI.minuteInput.onfocus = () => {prevValue = UI.minuteInput.value}
UI.minuteInput.onchange = () => {
	let v = UI.minuteInput.value.trim()
	if(!/^\d+$/.test(v) || Number(v) < 0 || Number(v) > 59) {
		alert("Please enter a valid minute number from 0 to 59.")
		UI.minuteInput.value = prevValue
		UI.minuteInput.select()}
	else {
		updateJulianDayInput()
		UI.minuteInput.value = String(Math.round(Number(v))).padStart(2, "0")}}

UI.julianDayInput.onfocus = () => {prevValue = UI.julianDayInput.value}
UI.julianDayInput.onchange = () => {
	let v = UI.julianDayInput.value.trim().replace("−", "-")
	let jd = Number(v)
	if(v === "" || !Number.isFinite(jd) || jd < -104788 || jd > 3547638) {
		alert("Please enter a valid Julian day between -104,788 and 3,547,638.")
		UI.julianDayInput.value = prevValue
		UI.julianDayInput.select()}
	else {
		UI.julianDayInput.value = jd < 0 ? "−" + Math.abs(jd).toFixed(5) : jd.toFixed(5)
		let year, month, day, time
		[year, month, day, time] = toGregorian(jd, UI.longitudeInput.value.replace("−", "-"))
		UI[year < 1 ? "eraBC" : "eraAD"].checked = true
		UI.yearInput.value = year > 0 ? year : Math.abs(year - 1)
		UI.monthInput.value = month
		UI.dayInput.value = day
		let [h, m, s] = toDMS(time / 15, 24)
		UI.hourInput.value = String(h).padStart(2, "0")
		UI.minuteInput.value = String(m).padStart(2, "0")
		drawWorldMap()}}
