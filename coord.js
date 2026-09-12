// From * to Equatorial of Date & From Equatorial of Date to *
const fromNirayana = p => mdot(matrix.fromNirayana, p)
const toNirayana = p => mdot(matrix.toNirayana, p)
const fromHorizontal = p => mdot(matrix.fromHorizontal, p)
const toHorizontal = p => mdot(matrix.toHorizontal, p)
// From * to Nitayana
const fromEquatorialJ2000 = p => mdot(matrix.fromEquatorialJ2000, p)
const fromGalactic = p => mdot(matrix.fromGalactic, p)

function apparentAltitude(alt, temp = 26.5, pres = 1013.25) {
	return alt + (pres / 1010) * (283 / (temp + 273)) *
		((((((((((
		+ 3.58488944710088e-9 * alt
		+ 3.54390052445494e-5) * alt
		+ 1.27998250881386e-3) * alt
		- 2.06613004585861e+0) * alt
		- 5.17900258176740e+1) * alt
		+ 1.40000848608753e+4) * alt
		+ 3.31589479667060e+5) * alt
		+ 3.18807561066599e+6) * alt
		+ 1.60254988667429e+7) * alt
		+ 4.26511737209119e+7) * alt
		+ 4.83049428529694e+7) /
		((((((((((
		+ 6.60514676743955e-6 * alt
		+ 2.39478091081164e-4) * alt
		- 6.25130435189532e-1) * alt
		- 1.85989226390845e+1) * alt
		+ 1.47322041634870e+4) * alt
		+ 3.42577546206784e+5) * alt
		+ 3.43484620426114e+6) * alt
		+ 1.92241649445868e+7) * alt
		+ 6.35667762830273e+7) * alt
		+ 1.18359542336086e+8) * alt
		+ 1.00000000000000e+8)}

function refractHorizontal(point) {
	let [x, y, z] = point
	let horizontal = Math.hypot(x, y)
	let radius = Math.hypot(horizontal, z)
	if(radius === 0 || horizontal < 1e-12) return point
	let altitude = Math.atan2(z, horizontal) / DEGREE
	let apparent = apparentAltitude(altitude) * DEGREE
	let scaleHorizontal = radius * Math.cos(apparent) / horizontal
	let refraction = [x * scaleHorizontal - x, y * scaleHorizontal - y,
		radius * Math.sin(apparent) - z]
	return translate(point, refraction)}

function refractionEnabled() {
	return mode.orientation === "horizontal" && show.atmosphericRefraction}

function getJulianDay(year = param.year, month = param.month, day = param.day,
	time = param.time, timeZone = param.timeZone) {
	let [h, m, s] = toDMS(time / 15, 24)
	let a = Math.floor((14 - month) / 12)
	let Y = year + 4800 - a
	let M = month + 12 * a - 3
	return Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) +
		365 * Y + Math.floor((153 * M + 2) / 5) + day - 32045.5 + 
		(h - timeZone) / 24 + m / 1440 + s / 86400}

function getGregorian(julianDay = param.julianDay, longitude = param.longitude) {
	let ljd = julianDay + Math.round(longitude / 15) / 24 + 0.5
	let z = Math.floor(ljd)
	let A = Math.floor((z - 1867216.25) / 36524.25)
	let a = z + 1 + A - Math.floor(A / 4)
	let b = a + 1524
	let c = Math.floor((b - 122.1) / 365.25)
	let d = Math.floor(365.25 * c)
	let e = Math.floor((b - d) / 30.6001)
	let dayDecimal = ljd - z + b - d - Math.floor(30.6001 * e)
	let day = Math.floor(dayDecimal)
	let month = e < 14 ? e - 1 : e - 13
	let year = month > 2 ? c - 4716 : c - 4715
	let time = (dayDecimal - day) * 360
	return [year, month, day, time]}

function getAyanamsa(jc = param.julianCentury) {
	return - jc * (5028.796195 + jc * (1.1054348 + jc * (0.00007964 - jc *
		(0.000023857 + jc * 0.0000000383)))) / 3600 - 20.8841929311}

function getObliquity(jc = param.julianCentury) {
	return 23.4392794444 - jc * (46.836769 + jc * (0.0001831 - jc *
		(0.0020034 - jc * (0.000000576 + jc * 0.0000000434)))) / 3600}

function updateNirayana() {
	matrix.fromNirayana = mul(rotateX(param.obliquity), rotateZ(-param.ayanamsa))
	matrix.toNirayana = transpose(matrix.fromNirayana)}

param.ayanamsaJ2000 = getAyanamsa(0)
param.obliquityJ2000 = getObliquity(0)
matrix.fromEquatorialJ2000 = mul(rotateZ(param.ayanamsaJ2000), rotateX(-param.obliquityJ2000))
matrix.fromGalactic = mul(matrix.fromEquatorialJ2000,
	mul(rotateZ(282.85948), mul(rotateX(62.87175), rotateZ(-32.93314))))

function getSidereal(jc = param.julianCentury, lon = param.longitude) {
	return mod(mod(280.46061837504 + 13184999.4888224000575 * jc, 360) +
		lon + (0.014506 + jc * (4612.156534 + jc * (1.3915817 - jc *
		(0.00000044 + jc * (0.000029956 + jc * 0.0000000368))))) / 3600, 360)}

function updateHorizontal() {
	matrix.fromHorizontal = mul(rotateZ(90 + param.sidereal), rotateX(90 - param.latitude))
	matrix.toHorizontal = transpose(matrix.fromHorizontal)}

function updateTime() {
	let t = param.time
	let [h, m, s] = toDMS(t / 15, 24)
	UI.timeValue.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0")
	UI.timeSlider.value = t
	let jd = getJulianDay()
	param.julianDay = jd
	UI.julianDayValue.textContent = jd > 0 ? jd.toFixed(5) : "−" + Math.abs(jd).toFixed(5)
	UI.dayOfWeekValue.textContent = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
		mod(Math.floor(jd + param.timeZone / 24 + 1.5), 7)]
	let jc = (jd - 2451545) / 36525
	param.julianCentury = jc
	param.ayanamsa = getAyanamsa()
	UI.ayanamsaValue.textContent = formatSignedAngleDecimal(param.ayanamsa, 5)
	param.obliquity = getObliquity()
	UI.obliquityValue.textContent = formatSignedAngleDecimal(param.obliquity, 5)
	updateNirayana()
	param.sidereal = getSidereal()
	UI.siderealValue.textContent = formatHourAngle(param.sidereal, 2)
	updateHorizontal()
	geoObserver = getGeoObserver()
	update.sky = true}

function getDayOfYear(yearDays = param.yearDays, month = param.month, day = param.day) {
	let doy = day
	let days = getMonthDays(yearDays)
	for(let i = 0; i < month - 1; i++) doy += days[i]
	return doy}

function updateMonthDay(yearDays = param.yearDays, month = param.month, day = param.day) {
	param.month = month
	param.day = day
	UI.monthDayValue.textContent = ["January", "February", "March", "April", "May", "June", "July",
		"August", "September", "October", "November", "December"][month - 1] + " " + day
	param.dayOfYear = getDayOfYear()
	UI.dayOfYearSlider.value = param.dayOfYear
	updateTime()}

function getYearDays(year = param.year) {
	return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0) ? 366 : 365}

function getMonthDays(yearDays = param.yearDays) {
	return [31, yearDays === 366 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]}

function updateYear(year = param.year) {
	let y = year
	param.year = y
	UI.yearValue.textContent = y > 0 ? "AD " + y : Math.abs(y - 1) + " BC"
	UI.yearSlider.value = y
	param.yearDays = getYearDays()
	UI.dayOfYearSlider.max = param.yearDays
	updateMonthDay()}

function setDateTime() {
	let dt = new Date()
	param.year = dt.getFullYear()
	param.month = dt.getMonth() + 1
	param.day = dt.getDate()
	param.time = Math.floor(15 * (dt.getHours() + dt.getMinutes() / 60) * 4) / 4
	updateYear()}

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
			show.atmosphericRefraction = refraction === "true"
			UI.atmosphericRefractionCheckbox.checked = show.atmosphericRefraction}}
	let modalValue = getQueryValue(query, ["modal"])
	if(modalValue !== null) {
		modalValue = modalValue.toLowerCase()
		if(modalValue === "true") setModalVisible(true)
		else if(modalValue === "false") setModalVisible(false)}}

function updateLatitude(latitude = param.latitude) {
	let l = Math.abs(latitude)
	UI.latitudeValue.textContent = l < 0.005 ? "0.00°" : l.toFixed(2) + "° " + (latitude > 0 ? "N" : "S")}

function updateLongitude(longitude = param.longitude) {
	let l = mod(longitude, 360, -180)
	param.longitude = l === -180 ? 180 : l
	let al = Math.abs(param.longitude)
	UI.longitudeValue.textContent = al < 0.005 ? "0.00°" :
		Math.abs(al - 180) < 0.005 ? "180.00°" : al.toFixed(2) + "° " + (param.longitude > 0 ? "E" : "W")
	param.timeZone = Math.round(param.longitude / 15)
	let tz = param.timeZone
	UI.timeZoneValue.textContent = tz === 0 ? "UTC" : "UTC" + (tz >= 0 ? "+" : "−") + Math.abs(tz)
	updateTime()}

function changeSystem(point, fromMode, toMode) {
	if(fromMode === "horizontal") point = fromHorizontal(point)
	else if(fromMode === "ecliptic") point = fromNirayana(point)
	if(toMode === "horizontal") return toHorizontal(point)
	else if(toMode === "ecliptic") return toNirayana(point)
	else return point}

function toScreen(point, fromMode, toMode) {
	return mdot(matrix.toScreen, changeSystem(point, fromMode, toMode))}

function fromScreen(point, fromMode, toMode) {
	return changeSystem(mdot(matrix.fromScreen, point), fromMode, toMode)}

