const fromNirayana = p => dot(matrix.fromNirayana, p)
const toNirayana = p => dot(matrix.toNirayana, p)
const fromEquatorialJ2000 = p => dot(matrix.fromEquatorialJ2000, p)
const fromHorizontal = p => dot(matrix.fromHorizontal, p)
const toHorizontal = p => dot(matrix.toHorizontal, p)

function toJulianDay(year, month, day, time, timeZone) {
	let [h, m, s] = toDMS(time / 15, 24)
	let a = Math.floor((14 - month) / 12)
	let Y = year + 4800 - a
	let M = month + 12 * a - 3
	return Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) +
		365 * Y + Math.floor((153 * M + 2) / 5) + day - 32045.5 + 
		(h - timeZone) / 24 + m / 1440 + s / 86400}

function toGregorian(julianDay, longitude) {
	let jd = julianDay + Math.round(longitude / 15) / 24 + 0.5
	let z = Math.floor(jd)
	let A = Math.floor((z - 1867216.25) / 36524.25)
	let a = z + 1 + A - Math.floor(A / 4)
	let b = a + 1524
	let c = Math.floor((b - 122.1) / 365.25)
	let d = Math.floor(365.25 * c)
	let e = Math.floor((b - d) / 30.6001)
	let dayDecimal = jd - z + b - d - Math.floor(30.6001 * e)
	let day = Math.floor(dayDecimal)
	let month = e < 14 ? e - 1 : e - 13
	let year = month > 2 ? c - 4716 : c - 4715
	let time = (dayDecimal - day) * 360
	return [year, month, day, time]}

function getAyanamsa(julianCentury) {
	let jc = julianCentury
	return - jc * (5028.796195 + jc * (1.1054348 + jc * (0.00007964 - jc *
		(0.000023857 + jc * 0.0000000383)))) / 3600 - 20.8841929311}

function getObliquity(julianCentury) {
	let jc = julianCentury
	return 23.4392794444 - jc * (46.836769 + jc * (0.0001831 - jc *
		(0.0020034 - jc * (0.000000576 + jc * 0.0000000434)))) / 3600}

function updateNirayana() {
	matrix.fromNirayana = mul(rotateX(param.obliquity), rotateZ(-param.ayanamsa))
	matrix.toNirayana = mul(rotateZ(param.ayanamsa), rotateX(-param.obliquity))}

param.ayanamsaJ2000 = getAyanamsa(0)
param.obliquityJ2000 = getObliquity(0)
matrix.fromEquatorialJ2000 = mul(rotateZ(param.ayanamsaJ2000), rotateX(-param.obliquityJ2000))

function getSidereal(julianCentury, longitude) {
	let jc = julianCentury
	return mod(mod(280.46061837504 + 13184999.4888224000575 * jc, 360) +
		longitude + (0.014506 + jc * (4612.156534 + jc * (1.3915817 - jc *
		(0.00000044 + jc * (0.000029956 + jc * 0.0000000368))))) / 3600, 360)}

function updateHorizontal() {
	matrix.fromHorizontal = mul(rotateZ(90 + param.sidereal), rotateX(90 - param.latitude))
	matrix.toHorizontal = mul(rotateX(-(90 - param.latitude)), rotateZ(-(90 + param.sidereal)))}

function updateTime() {
	let t = param.time
	let [h, m, s] = toDMS(t / 15, 24)
	UI.timeValue.textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0")
	UI.timeSlider.value = t
	let jd = toJulianDay(param.year, param.month, param.day, t, param.timeZone)
	param.julianDay = jd
	UI.julianDayValue.textContent = jd > 0 ? jd.toFixed(5) : "−" + Math.abs(jd).toFixed(5)
	UI.dayOfWeekValue.textContent = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
		mod(Math.floor(jd + param.timeZone / 24 + 1.5), 7)]
	let jc = (jd - 2451545) / 36525
	param.julianCentury = jc
	param.ayanamsa = getAyanamsa(jc)
	UI.ayanamsaValue.textContent = formatSignedAngleDecimal(param.ayanamsa, 5)
	param.obliquity = getObliquity(jc)
	UI.obliquityValue.textContent = formatSignedAngleDecimal(param.obliquity, 5)
	updateNirayana()
	param.sidereal = getSidereal(jc, param.longitude)
	UI.siderealValue.textContent = formatHourAngle(param.sidereal, 2)
	updateHorizontal()
	geoObserver = getGeoObserver(param.sidereal)
	update.sky = true}

function getDayOfYear() {
	let doy = param.day
	let days = [31, param.totalDays === 366 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
	for(let i = 0; i < param.month - 1; i++) doy += days[i]
	return doy}

function updateMonthDay() {
	UI.monthDayValue.textContent = ["January", "February", "March", "April", "May", "June", "July",
		"August", "September", "October", "November", "December"][param.month - 1] + " " + param.day
	param.dayOfYear = getDayOfYear()
	UI.dayOfYearSlider.value = param.dayOfYear
	updateTime()}

function getTotalDays() {
	return (param.year % 4 === 0 && param.year % 100 !== 0) || (param.year % 400 === 0) ? 366 : 365}

function updateYear() {
	let y = param.year
	UI.yearValue.textContent = y > 0 ? "AD " + y : Math.abs(y - 1) + " BC"
	UI.yearSlider.value = y
	param.totalDays = getTotalDays()
	UI.dayOfYearSlider.max = param.totalDays
	updateMonthDay()}

function setDateTime() {
	let dt = new Date()
	param.year = dt.getFullYear()
	param.month = dt.getMonth() + 1
	param.day = dt.getDate()
	param.time = Math.floor(15 * (dt.getHours() + dt.getMinutes() / 60) * 4) / 4
	updateYear()}

function updateLatitude() {
	let l = Math.abs(param.latitude)
	UI.latitudeValue.textContent = l < 0.005 ? "0.00°" : l.toFixed(2) + "° " + (param.latitude > 0 ? "N" : "S")}

function updateLongitude() {
	let l = mod(param.longitude, 360, -180)
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
	return dot(matrix.toScreen, changeSystem(point, fromMode, toMode))}

function fromScreen(point, fromMode, toMode) {
	return changeSystem(dot(matrix.fromScreen, point), fromMode, toMode)}
