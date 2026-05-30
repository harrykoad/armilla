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
	if(param.month === 2 && param.day === 29 && getYearDays() !== 366) {
		param.month = 2
		param.day = 28}
	updateYear()
	render()}

UI.dayOfYearSlider.oninput = () => {
	param.dayOfYear = parseInt(UI.dayOfYearSlider.value)
	let days = getMonthDays()
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
	centerViewOnSun()
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
	let [h, m, s] = toDMS(param.time / 15, 24)
	modal.temp.fallback = null
	modal.temp.year = param.year
	modal.temp.month = param.month
	modal.temp.day = param.day
	modal.temp.hour = h
	modal.temp.minute = m
	modal.temp.longitude = param.longitude
	modal.temp.julianDay = param.julianDay
	UI.latitudeInput.value = formatSignedAngleDecimal(param.latitude, 2).replace("°", "")
	UI.longitudeInput.value = formatSignedAngleDecimal(modal.temp.longitude, 2).replace("°", "")
	UI.timeZoneInput.textContent = UI.timeZoneValue.textContent
	UI[param.year < 1 ? "eraBC" : "eraAD"].checked = true
	UI.yearInput.value = param.year > 0 ? param.year : Math.abs(param.year - 1)
	UI.monthInput.value = param.month
	UI.dayInput.value = param.day
	UI.hourInput.value = String(h).padStart(2, "0")
	UI.minuteInput.value = String(m).padStart(2, "0")
	UI.julianDayInput.value = modal.temp.julianDay < 0 ? "−" + Math.abs(modal.temp.julianDay).toFixed(5) : modal.temp.julianDay.toFixed(5)
	updateModal()
	UI.modalBackground.style.display = "flex"}})
UI.modalSetButton.onclick = () => {
	param.latitude = Number(UI.latitudeInput.value.replace("−", "-"))
	updateLatitude()
	param.longitude = modal.temp.longitude
	updateLongitude()
	param.year = modal.temp.year
	param.month = modal.temp.month
	param.day = modal.temp.day
	param.time = 15 * (modal.temp.hour + modal.temp.minute / 60)
	updateYear()
	render()
	UI.modalBackground.style.display = "none"}
UI.modalCancelButton.onclick = () => {
	UI.modalBackground.style.display = "none"}

resize()
render()

function setJulianDayModal() {
	modal.temp.julianDay = getJulianDay(modal.temp.year, modal.temp.month, modal.temp.day,
		15 * (modal.temp.hour + modal.temp.minute / 60), Math.round(modal.temp.longitude / 15))
	UI.julianDayInput.value = modal.temp.julianDay < 0 ?
		"−" + Math.abs(modal.temp.julianDay).toFixed(5) : modal.temp.julianDay.toFixed(5)
	updateModal()}

function setLocationFromMap(event) {
	let map = UI.worldMap.getBoundingClientRect()
	let lat = Math.round((90 - clip(event.clientY - map.top, 0, map.height) / map.height * 180) * 100) / 100
	UI.latitudeInput.value = formatSignedAngleDecimal(lat, 2).replace("°", "")
	let lon = Math.round((clip(event.clientX - map.left, 0, map.width) / map.width * 360 - 180) * 100) / 100
	modal.temp.longitude = lon === -180 ? 180 : lon
	let al = Math.abs(modal.temp.longitude)
	UI.longitudeInput.value = al < 0.005 ? "0.00" : Math.abs(al - 180) < 0.005 ?
		"180.00" : (modal.temp.longitude > 0 ? "+" : "−") + al.toFixed(2)
	let tz = Math.round(modal.temp.longitude / 15)
	UI.timeZoneInput.textContent = tz === 0 ? "UTC" : "UTC" + (tz >= 0 ? "+" : "−") + Math.abs(tz)
	setJulianDayModal()}

UI.worldMap.onpointerdown = e => {
	if(e.button !== 0) return
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
	if(UI.worldMap.hasPointerCapture(e.pointerId))
		UI.worldMap.releasePointerCapture(e.pointerId)}
UI.worldMap.onpointercancel = UI.worldMap.onpointerup

function parseNumber(e, fallback = modal.temp.fallback) {
	let n = Number(e.value.trim().replace("−", "-"))
	if(!Number.isFinite(n)) n = Number(String(fallback).replace("−", "-"))
	return Number.isFinite(n) ? n : null}

function addNudgeListeners(elem, step) {
	elem.onfocus = () => {modal.temp.fallback = elem.value}
	elem.onkeydown = e => {
		if(e.key !== "ArrowUp" && e.key !== "ArrowDown") return
		e.preventDefault()
		step(e.key === "ArrowUp" ? 1 : -1)
		modal.temp.fallback = elem.value}
	elem.addEventListener("wheel", e => {
		e.preventDefault()
		step(e.deltaY < 0 ? 1 : -1)
		modal.temp.fallback = elem.value}, {passive: false})}

UI.latitudeInput.onchange = () => {
	let l = parseNumber(UI.latitudeInput, "")
	if(l === null || l < -90 || l > 90) {
		alert("Please enter a valid latitude from −90° to +90°.")
		UI.latitudeInput.value = modal.temp.fallback
		UI.latitudeInput.select()}
	else {
		UI.latitudeInput.value = formatSignedAngleDecimal(
			Math.round(l * 100) / 100, 2).replace("°", "")
		updateModal()}}
addNudgeListeners(UI.latitudeInput, step => {
	let l = parseNumber(UI.latitudeInput)
	if(l === null) return
	UI.latitudeInput.value = formatSignedAngleDecimal(
			Math.round(clip(l + step, -90, 90) * 100) / 100, 2).replace("°", "")
	updateModal()})

function updateLongitudeModal(longitude) {
	let l = Math.round(longitude * 100) / 100
	modal.temp.longitude = l === -180 ? 180 : l
	let a = Math.abs(modal.temp.longitude)
	UI.longitudeInput.value = a < 0.005 ? "0.00" : Math.abs(a - 180) < 0.005 ?
		"180.00" : (modal.temp.longitude > 0 ? "+" : "−") + a.toFixed(2)
	let tz = Math.round(modal.temp.longitude / 15)
	UI.timeZoneInput.textContent = tz === 0 ? "UTC" : "UTC" + (tz >= 0 ? "+" : "−") + Math.abs(tz)
	setJulianDayModal()}

UI.longitudeInput.onchange = () => {
	let l = parseNumber(UI.longitudeInput, "")
	if(l === null || l < -180 || l > 180) {
		alert("Please enter a valid longitude from −180° to +180°.")
		UI.longitudeInput.value = modal.temp.fallback
		UI.longitudeInput.select()}
	else updateLongitudeModal(l)}
addNudgeListeners(UI.longitudeInput, step => {
	let l = parseNumber(UI.longitudeInput)
	if(l === null) return
	updateLongitudeModal(mod(l + step, 360, -180))})

function setDayModal() {
	modal.temp.day = clip(modal.temp.day, 1, getMonthDays(getYearDays(modal.temp.year))[modal.temp.month - 1])
	UI.dayInput.value = modal.temp.day
	setJulianDayModal()}

["eraAD", "eraBC"].forEach(id => {UI[id].onchange = () => {
	let y = Math.round(parseNumber(UI.yearInput))
	if(!Number.isFinite(y) || y < 1 || y > 5000) {
		UI.yearInput.value = modal.temp.fallback
		UI.yearInput.select()
		return}
	modal.temp.year = UI.eraBC.checked ? 1 - y : y
	setDayModal()}})

function updateYearModal(year, refresh = true) {
	let y = Math.round(year)
	modal.temp.year = y
	UI[y < 1 ? "eraBC" : "eraAD"].checked = true
	UI.yearInput.value = y > 0 ? y : Math.abs(y - 1)
	if(refresh) setDayModal()}

UI.yearInput.onchange = () => {
	let y = parseNumber(UI.yearInput, "")
	if(y === null || y < 1 || y > 5000) {
		alert("Please enter a valid year number from 1 to 5000.")
		UI.yearInput.value = modal.temp.fallback
		UI.yearInput.select()}
	else updateYearModal(UI.eraBC.checked ? 1 - y : y)}
addNudgeListeners(UI.yearInput, step => {
	let y = parseNumber(UI.yearInput)
	if(y === null) return
	updateYearModal(clip(modal.temp.year + step,
		Number(UI.yearSlider.min), Number(UI.yearSlider.max)))})

function updateMonthModal(month, refresh = true) {
	let m = Math.round(month)
	let y = modal.temp.year
	while(m > 12) {m -= 12; y++}
	while(m < 1) {m += 12; y--}
	if(y < Number(UI.yearSlider.min)) {y = Number(UI.yearSlider.min); m = 1}
	if(y > Number(UI.yearSlider.max)) {y = Number(UI.yearSlider.max); m = 12}
	modal.temp.month = m
	UI.monthInput.value = m
	updateYearModal(y, refresh)}

UI.monthInput.onchange = () => {
	let m = parseNumber(UI.monthInput, "")
	if(m === null || m < 1 || m > 12) {
		alert("Please enter a valid month number from 1 to 12.")
		UI.monthInput.value = modal.temp.fallback
		UI.monthInput.select()}
	else updateMonthModal(m)}
addNudgeListeners(UI.monthInput, step => {
	updateMonthModal(modal.temp.month + step)})

function updateDayModal(day) {
	let d = Math.round(day)
	let m = modal.temp.month
	let days = getMonthDays(getYearDays(modal.temp.year))
	while(d < 1 || d > days[m - 1]) {
		let forward = d > days[m - 1]
		if(forward) d -= days[m - 1]
		let y0 = modal.temp.year, m0 = m
		updateMonthModal(m + (forward ? 1 : -1), false)
		m = modal.temp.month
		if(modal.temp.year !== y0) days = getMonthDays(getYearDays(modal.temp.year))
		if(modal.temp.year === y0 && m === m0) {d = forward ? days[m - 1] : 1; break}
		if(!forward) d += days[m - 1]}
	modal.temp.day = d
	UI.dayInput.value = modal.temp.day
	setJulianDayModal()}

UI.dayInput.onchange = () => {
	let d = parseNumber(UI.dayInput, "")
	if(d === null) {
		alert("Please enter a valid day number.")
		UI.dayInput.value = modal.temp.fallback
		UI.dayInput.select()}
	else updateDayModal(d)}
addNudgeListeners(UI.dayInput, step => {
	updateDayModal(modal.temp.day + step)})

function updateJulianDayModal(jd) {
	jd = clip(jd, -104788, 3547638)
	modal.temp.julianDay = jd
	UI.julianDayInput.value = jd < 0 ? "−" + Math.abs(jd).toFixed(5) : jd.toFixed(5)
	let [Y, M, D, t] = getGregorian(jd, modal.temp.longitude)
	let [h, m, s] = toDMS(t / 15, 24)
	updateYearModal(Y, false)
	modal.temp.month = M
	UI.monthInput.value = M
	modal.temp.day = D
	UI.dayInput.value = D
	modal.temp.hour = h
	UI.hourInput.value = String(h).padStart(2, "0")
	modal.temp.minute = m
	UI.minuteInput.value = String(m).padStart(2, "0")
	updateModal()}

UI.hourInput.onchange = () => {
	let h = parseNumber(UI.hourInput, "")
	if(h === null || h < 0 || h > 23) {
		alert("Please enter a valid hour number from 0 to 23.")
		UI.hourInput.value = modal.temp.fallback
		UI.hourInput.select()}
	else {
		modal.temp.hour = Math.round(h)
		UI.hourInput.value = String(modal.temp.hour).padStart(2, "0")
		setJulianDayModal()}}
addNudgeListeners(UI.hourInput, step => {
	updateJulianDayModal(Math.round((modal.temp.julianDay + step / 24) * 1440) / 1440)})

UI.minuteInput.onchange = () => {
	let m = parseNumber(UI.minuteInput, "")
	if(m === null || m < 0 || m > 59) {
		alert("Please enter a valid minute number from 0 to 59.")
		UI.minuteInput.value = modal.temp.fallback
		UI.minuteInput.select()}
	else {
		modal.temp.minute = Math.round(m)
		UI.minuteInput.value = String(modal.temp.minute).padStart(2, "0")
		setJulianDayModal()}}
addNudgeListeners(UI.minuteInput, step => {
	updateJulianDayModal(Math.round((modal.temp.julianDay + step / 1440) * 1440) / 1440)})

UI.julianDayInput.onchange = () => {
	let jd = parseNumber(UI.julianDayInput, "")
	if(jd === null || jd < -104788 || jd > 3547638) {
		alert("Please enter a valid Julian day between -104,788 and 3,547,638.")
		UI.julianDayInput.value = modal.temp.fallback
		UI.julianDayInput.select()}
	else {
		updateJulianDayModal(jd)}}
addNudgeListeners(UI.julianDayInput, step => {
	updateJulianDayModal(modal.temp.julianDay + step)})
