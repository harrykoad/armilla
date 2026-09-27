function getQueryValue(query, names) {
	for(let name of names) {
		let value = query.get(name)
		if(value !== null && value.trim() !== "") return value.trim()}
	return null}

function getURLQuery() {
	let parts = []
	if(window.location.search) parts.push(window.location.search.replace(/^\?/, ""))
	if(window.location.hash.match(/^#[?&]/)) parts.push(window.location.hash.slice(2))
	if(!window.location.search) {
		let pathQuery = window.location.pathname.match(/&([^/?#]*)$/)
		if(pathQuery) parts.push(pathQuery[1])}
	return new URLSearchParams(parts.join("&"))}

function parseURLDate(value) {
	let match = value.match(/^([+-]?\d{1,4})-(\d{1,2})-(\d{1,2})$/)
	if(!match) return null
	let year = Number(match[1])
	let month = Number(match[2])
	let day = Number(match[3])
	if(!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
	if(year < Number(UI.yearSlider.min) || year > Number(UI.yearSlider.max)) return null
	if(month < 1 || month > 12) return null
	let yearDays = getYearDays(year)
	if(day < 1 || day > getMonthDays(yearDays)[month - 1]) return null
	return {year, month, day}}

function parseURLTime(value) {
	let match = value.match(/^(\d{1,2}):(\d{1,2})$/)
	if(match) {
		let hour = Number(match[1])
		let minute = Number(match[2])
		if(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return 15 * (hour + minute / 60)}
	return null}

function applyURLParams() {
	let query = getURLQuery()
	let latitudeValue = getQueryValue(query, ["lat"])
	if(latitudeValue !== null) {
		let latitude = Number(latitudeValue)
		if(Number.isFinite(latitude)) {
			param.latitude = clip(latitude, -90, 90)
			UI.latitudeSlider.value = param.latitude
			updateLatitude()
			updateHorizontal()}}
	let longitudeValue = getQueryValue(query, ["lon"])
	if(longitudeValue !== null) {
		let longitude = Number(longitudeValue)
		if(Number.isFinite(longitude)) {
			param.longitude = clip(longitude, -180, 180)
			UI.longitudeSlider.value = param.longitude
			updateLongitude()
			UI.longitudeSlider.value = param.longitude}}
	let elevationValue = getQueryValue(query, ["elev", "elevation"])
	if(elevationValue !== null) {
		let elevation = Number(elevationValue)
		if(Number.isFinite(elevation)) {
			param.elevation = clip(Math.round(elevation), Number(UI.elevationSlider.min),
				Number(UI.elevationSlider.max))
			UI.elevationSlider.value = param.elevation
			updateElevation()}}
	let date = getQueryValue(query, ["date"])
	if(date !== null) {
		let parsed = parseURLDate(date)
		if(parsed !== null) {
			param.year = parsed.year
			param.month = parsed.month
			param.day = parsed.day
			updateYear()}}
	let time = getQueryValue(query, ["time"])
	if(time !== null) {
		let parsed = parseURLTime(time)
		if(parsed !== null) {
			param.time = parsed
			updateTime()}}
	let refraction = getQueryValue(query, ["refraction"])
	if(refraction !== null) {
		refraction = refraction.toLowerCase()
		if(refraction === "true" || refraction === "false") {
			show.refraction = refraction === "true"
			UI.refractionCheckbox.checked = show.refraction}}
	let modalValue = getQueryValue(query, ["modal"])
	if(modalValue !== null) {
		modalValue = modalValue.toLowerCase()
		if(modalValue === "true") setModalVisible(true)
		else if(modalValue === "false") setModalVisible(false)}}
