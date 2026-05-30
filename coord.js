// From * to Equatorial of Date & From Equatorial of Date to *
const fromNirayana = p => mdot(matrix.fromNirayana, p)
const toNirayana = p => mdot(matrix.toNirayana, p)
const fromHorizontal = p => mdot(matrix.fromHorizontal, p)
const toHorizontal = p => mdot(matrix.toHorizontal, p)
// From * to Nitayana
const fromEquatorialJ2000 = p => mdot(matrix.fromEquatorialJ2000, p)
const fromGalactic = p => mdot(matrix.fromGalactic, p)

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

setDateTime()
