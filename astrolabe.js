document.getElementById("copyrightYear").textContent = new Date().getUTCFullYear()
const azimuthPanel = document.querySelector(".azimuthGroup")
function syncTopPanelHeights() {
	document.querySelector(".intersectionGroup").style.height =
		azimuthPanel.getBoundingClientRect().height + "px"}
new ResizeObserver(syncTopPanelHeights).observe(azimuthPanel)
syncTopPanelHeights()
UI.risingEventSelect.onchange = () => requestGraphRender()
UI.settingEventSelect.onchange = () => requestGraphRender()
const pageUI = new Proxy({}, {get(object, id) {
	return document.getElementById("page" + id[0].toUpperCase() + id.slice(1)) || UI[id]}})
function setupCoordinateInput(id, limit, wrap, minimum = -limit, onCommit = null) {
	const input = pageUI[id]
	const label = input.labels[0].textContent.replace(/:$/, "").toLowerCase()
	let fallback = input.value
	function format(value) {
		value = Math.round(value * 100) / 100
		if(wrap && Math.abs(Math.abs(value) - 180) < 0.005) return "180.00"
		if(value === 0) return "0.00"
		return (value > 0 ? "+" : "−") + Math.abs(value).toFixed(2)}
	function commit(value) {
		input.value = format(value)
		fallback = input.value
		if(onCommit) onCommit(value)
		requestGraphRender()}
	function nudge(direction, coarse) {
		let value = parseNumber(input.value)
		if(!Number.isFinite(value)) value = parseNumber(fallback)
		const step = coarse ? 1 : 0.01
		value = Math.round(value / step) * step + direction * step
		value = Math.max(minimum, Math.min(limit, value))
		commit(value)}
	input.onfocus = () => {fallback = input.value}
	function commitInput() {
		let value = parseNumber(input.value)
		if(!Number.isFinite(value) || value < minimum || value > limit) {
			alert("Please enter a valid " + label + " from " +
				(minimum < 0 ? "−" + Math.abs(minimum) : minimum) + "° to +" + limit + "°.")
			input.value = fallback
			input.select()}
		else commit(value)}
	addNudgeListeners(input, nudge, commitInput)}

function setupScalarInput(input, parse, valid, format, error, adjust, coarseStep = null) {
	let committed = input.value
	function commit() {
		const value = parse(input.value)
		if(!Number.isFinite(value) || !valid(value)) {
			alert(error)
			input.value = committed
			input.select()
			return}
		input.value = format(value)
		committed = input.value
		requestGraphRender()}
	function nudge(direction, coarse) {
		let value = parse(input.value)
		if(!Number.isFinite(value)) value = parse(committed)
		input.value = String(coarse && coarseStep ?
			adjust(Math.round(value / coarseStep) * coarseStep, direction * coarseStep) :
			adjust(value, direction))
		commit()}
	addNudgeListeners(input, nudge, commit)}

setupCoordinateInput("latitudeInput", 90, false)
function formatTwoDigitTimeZone(timeZone) {
	if(timeZone === 0) return "UTC"
	return "UTC" + (timeZone >= 0 ? "+" : "−") +
		String(Math.abs(timeZone)).padStart(2, "0")}
setupCoordinateInput("longitudeInput", 180, true, -180, longitude => {
	param.longitude = longitude
	param.timeZone = Math.round(longitude / 15)
	if(pageUI.timeZoneInput) pageUI.timeZoneInput.textContent = formatTwoDigitTimeZone(param.timeZone)})
setupScalarInput(pageUI.elevationInput, parseNumber, value => value >= 0 && value <= 10000,
	value => Math.round(value).toLocaleString("en-US"),
	"Please enter a valid elevation from 0 m to 10,000 m.",
	(value, step) => Math.max(0, Math.min(10000, Math.round(value) + step)), 100)
if(document.getElementById("hereButton")) UI.hereButton.onclick = () => getCurrentLocation()
	.then(() => {
		pageUI.latitudeInput.value = param.latitude
		pageUI.longitudeInput.value = param.longitude
		pageUI.latitudeInput.dispatchEvent(new Event("change"))
		pageUI.longitudeInput.dispatchEvent(new Event("change"))
		param.elevation = 0
		pageUI.elevationInput.value = 0
		pageUI.elevationInput.dispatchEvent(new Event("change"))})
	.catch(error => alert(error.message))
if(document.getElementById("nowButton")) {
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
		"Oct", "Nov", "Dec"]
	function updateCalendarFields() {
		const [hour, minute] = toDMS(param.time / 15, 24)
		pageUI[param.year > 0 ? "eraAD" : "eraBC"].checked = true
		pageUI.yearInput.value = param.year > 0 ? param.year : Math.abs(param.year - 1)
		pageUI.monthInput.value = param.month
		pageUI.dayInput.value = param.day
		if(pageUI.dayOfWeekValue)
			pageUI.dayOfWeekValue.textContent = getDayOfWeek(param.julianDay, param.timeZone)
		pageUI.hourInput.value = String(hour).padStart(2, "0")
		pageUI.minuteInput.value = String(minute).padStart(2, "0")
		pageUI.timeZoneInput.textContent = formatTwoDigitTimeZone(param.timeZone)}
	function commitCalendar() {
		param.julianDay = getJulianDay()
		updateCalendarFields()
		requestGraphRender()}
	function setCalendarJulianDay(julianDay) {
		param.julianDay = julianDay
		const [year, month, day, time] = getGregorian(julianDay, param.longitude)
		param.year = year
		param.month = month
		param.day = day
		param.time = time
		updateCalendarFields()
		requestGraphRender()}
	function changeYear(step) {
		param.year = Math.max(-4999, Math.min(5000, param.year + step))
		param.day = Math.min(param.day, getMonthDays(getYearDays(param.year))[param.month - 1])
		commitCalendar()}
	function changeMonth(step) {
		param.month += step
		while(param.month > 12) {param.month -= 12; param.year++}
		while(param.month < 1) {param.month += 12; param.year--}
		param.year = Math.max(-4999, Math.min(5000, param.year))
		param.day = Math.min(param.day, getMonthDays(getYearDays(param.year))[param.month - 1])
		commitCalendar()}
	UI.nowButton.onclick = () => {getCurrentDateTime(); updateCalendarFields(); requestGraphRender()}
	for(const input of [pageUI.eraAD, pageUI.eraBC]) input.onchange = () => {
		const year = Math.round(parseNumber(pageUI.yearInput))
		if(!input.checked || !Number.isFinite(year) || year < 1 || year > 5000) return
		param.year = pageUI.eraBC.checked ? 1 - year : year
		commitCalendar()}
	pageUI.yearInput.onchange = () => {
		const year = Math.round(parseNumber(pageUI.yearInput, ""))
		if(!Number.isFinite(year) || year < 1 || year > 5000) {
			alert("Please enter a valid year number from 1 to 5000.")
			updateCalendarFields(); pageUI.yearInput.select(); return}
		param.year = pageUI.eraBC.checked ? 1 - year : year
		commitCalendar()}
	addNudgeListeners(pageUI.yearInput, direction => changeYear(direction))
	pageUI.monthInput.onchange = () => {
		const month = Math.round(parseNumber(pageUI.monthInput, ""))
		if(!Number.isFinite(month) || month < 1 || month > 12) {
			alert("Please enter a valid month number from 1 to 12.")
			updateCalendarFields(); pageUI.monthInput.select(); return}
		param.month = month
		commitCalendar()}
	addNudgeListeners(pageUI.monthInput, direction => changeMonth(direction))
	pageUI.dayInput.onchange = () => {
		const day = Math.round(parseNumber(pageUI.dayInput, ""))
		const maximum = getMonthDays(getYearDays(param.year))[param.month - 1]
		if(!Number.isFinite(day) || day < 1 || day > maximum) {
			alert("Please enter a valid day number."); updateCalendarFields(); pageUI.dayInput.select(); return}
		param.day = day
		commitCalendar()}
	addNudgeListeners(pageUI.dayInput, direction =>
		setCalendarJulianDay(Math.round((getJulianDay() + direction) * 1440) / 1440))
	pageUI.hourInput.onchange = () => {
		const hour = Math.round(parseNumber(pageUI.hourInput, ""))
		if(!Number.isFinite(hour) || hour < 0 || hour > 23) {
			alert("Please enter a valid hour number from 0 to 23.")
			updateCalendarFields(); pageUI.hourInput.select(); return}
		param.time = 15 * (hour + parseNumber(pageUI.minuteInput) / 60)
		commitCalendar()}
	addNudgeListeners(pageUI.hourInput, direction =>
		setCalendarJulianDay(Math.round((getJulianDay() + direction / 24) * 1440) / 1440))
	pageUI.minuteInput.onchange = () => {
		const minute = Math.round(parseNumber(pageUI.minuteInput, ""))
		if(!Number.isFinite(minute) || minute < 0 || minute > 59) {
			alert("Please enter a valid minute number from 0 to 59.")
			updateCalendarFields(); pageUI.minuteInput.select(); return}
		param.time = 15 * (Math.floor(param.time / 15) + minute / 60)
		commitCalendar()}
	addNudgeListeners(pageUI.minuteInput, direction =>
		setCalendarJulianDay(Math.round((getJulianDay() + direction / 1440) * 1440) / 1440))}
if(document.getElementById("nowButton")) window.addEventListener("load", () => {
	UI.nowButton.click()
	requestAnimationFrame(() => {
		const elements = [document.querySelector(".timeGroup"),
			...document.querySelectorAll(".timeGroup *")]
			.filter(element => element && !element.closest("[hidden]") && element.offsetParent !== null)
		const widths = elements.map(element => element.getBoundingClientRect().width)
		for(let i = 0; i < elements.length; i++) {
			const width = widths[i] + "px"
			elements[i].style.width = width
			elements[i].style.minWidth = width
			elements[i].style.maxWidth = width}})}, {once: true})
setupCoordinateInput("sunAltitudeInput", 90, false, -30)
setupCoordinateInput("horizonAltitudeInput", 90, false, -30)
UI.refractionCheckbox.onchange = () => requestGraphRender()
setupScalarInput(UI.temperatureInput, value => Number(parseNumber(value).toFixed(1)),
	value => value > -273, value => value.toFixed(1).replace("-", "−"),
	"Please enter a valid temperature above −273°C.",
	(value, step) => Math.max(-272.9, value + step))
setupScalarInput(UI.pressureInput, parseNumber, value => value >= 0,
	value => Math.round(value).toLocaleString("en-US"), "Please enter a valid pressure of 0 hPa or greater.",
	(value, step) => Math.max(0, Math.round(value) + step))
{
	const rising = UI.risingAzimuthInput
	const setting = UI.settingAzimuthInput
	const uncertainties = [UI.risingUncertaintyInput, UI.settingUncertaintyInput]
	const inputs = [rising, setting, ...uncertainties]
	const committed = new Map(inputs.map(input => [input, input.value]))
	function maximumUncertainty() {
		const azimuth = parseNumber(rising.value)
		return Number.isFinite(azimuth) ? Math.max(0, Math.min(azimuth, 180 - azimuth)) : 0}
	function syncUncertainty(value) {
		const formatted = Math.min(Math.abs(value), maximumUncertainty()).toFixed(2)
		for(const uncertainty of uncertainties) {
			uncertainty.value = formatted
			committed.set(uncertainty, formatted)}}
	function updateHemisphereButton() {
		const azimuth = parseNumber(rising.value)
		UI.hemisphereButton.textContent = azimuth > 90 ?
			"Switch to NE/NW" : "Switch to SE/SW"}
	function commit(input) {
		const isUncertainty = uncertainties.includes(input)
		let text = input.value.trim()
		if(isUncertainty) text = text.replace(/^(?:±|\+\/-)\s*/, "")
		let value = parseNumber(text)
		if(!Number.isFinite(value) || (!isUncertainty && !(input === rising ?
			value >= 0 && value <= 180 : value === 0 || (value >= 180 && value <= 360)))) {
			const label = isUncertainty ? "uncertainty" :
				input.labels[0].textContent.replace(/:$/, "").toLowerCase()
			alert("Please enter a valid " + label + (isUncertainty ? "." : input === rising ?
				" from 0° to 180°." : " from 180° to 360° (or 0° for north)."))
			input.value = committed.get(input)
			input.select()
			return}
		if(isUncertainty) syncUncertainty(value)
		else {
			const azimuth = Number(value.toFixed(2)) % 360
			input.value = azimuth.toFixed(2)
			const counterpart = input === rising ? setting : rising
			counterpart.value = ((360 - azimuth) % 360).toFixed(2)
			committed.set(counterpart, counterpart.value)
			syncUncertainty(parseNumber(uncertainties[0].value))}
		committed.set(input, input.value)
		updateHemisphereButton()
		requestGraphRender()}
	function nudgeValueOf(input, text) {
		text = text.trim()
		if(uncertainties.includes(input))
			return Math.abs(parseNumber(text.replace(/^(?:±|\+\/-)\s*/, "")))
		return parseNumber(text)}
	function nudge(input, direction, coarse) {
		let value = nudgeValueOf(input, input.value)
		if(!Number.isFinite(value)) value = nudgeValueOf(input, committed.get(input))
		if(input === setting && value === 0) value = 360
		const step = coarse ? 1 : 0.01
		value = Math.round(value / step) * step + direction * step
		if(input === rising) value = Math.max(0, Math.min(180, value))
		else if(input === setting) value = Math.max(180, Math.min(360, value))
		else value = Math.max(0, value)
		input.value = String(value)
		commit(input)}
	for(const input of inputs)
		addNudgeListeners(input, (direction, coarse) => nudge(input, direction, coarse),
			() => commit(input))
	UI.hemisphereButton.onclick = () => {
		const azimuth = parseNumber(rising.value)
		if(!Number.isFinite(azimuth)) return
		rising.value = String(180 - azimuth)
		commit(rising)}
	updateHemisphereButton()}

const graph = {yearMin: -700, yearMax: 2200, oppositionDates: new Map()}
const GRAPH_STAR_COLORS = {
	Capella: "#6699da", Deneb: "#ffbe32", Vega: "#a4cf38", Castor: "#ff8967",
	Pollux: "#c7afe8", Arcturus: "#f6ad48", Aldebaran: "#ffe23e", Regulus: "#67badd",
	Altair: "#c6cf45", Betelgeuse: "#ff7159", Bellatrix: "#a6baf2", Procyon: "#d591cf",
	Rigel: "#ffc137", Spica: "#e889b2", Sirius: "#6dda91", Antares: "#f2bd57",
	Fomalhaut: "#ff8a65", Adhara: "#95b7ed", Shaula: "#b0d444", Canopus: "#ffb34f",
	Achernar: "#83d0ee", Gacrux: "#bfa9e0", "Rigil Kent.": "#79c8a9",
	Hadar: "#d5a6bd", Acrux: "#78b9e6", Mimosa: "#e6ca73", Alnair: "#7ccfc7",
	Alioth: "#d2b3ef", Dubhe: "#e49a73", Mirfak: "#9fc56e"}
const RISING_AXIS_COLOR = "#ff6f6f"
const SETTING_AXIS_COLOR = "#70b7ff"
const GRAPH_STARS = BRIGHT_STARS.map(star => ({
	...star, color: GRAPH_STAR_COLORS[star.name]}))

const NAKSATRA_COLORS = ["#8bd3f7", "#f6c66c", "#a9d77b", "#e89dc1", "#c0acf0", "#f29c72"]
const GRAPH_NAKSATRAS = [
	[0, "Sheratan"], [1, "35 Ari"], [2, "Alcyone"], [3, "Aldebaran"],
	[4, "Meissa"], [4, "Alnilam", 1], [5, "Betelgeuse"], [5, "Alhena", 1],
	[6, "Pollux"], [7, "Asellus Aus."], [8, "ε Hya"], [9, "Regulus"],
	[10, "Zosma"], [11, "Denebola"], [12, "Algorab"], [13, "Spica"],
	[14, "Arcturus"], [15, "Zubenelgenubi"], [16, "Dschubba"], [17, "Antares"],
	[18, "Shaula"], [19, "Kaus Media"], [20, "Nunki"], [21, "Altair"],
	[22, "Rotanev"], [23, "λ Aqr"], [23, "ζ¹ Aqr", 1], [24, "Markab"],
	[25, "Alpheratz"], [26, "ζ Psc"]
].map(([naksatra, name, version = 0], i) => ({
	naksatra: NAKSATRAS[naksatra][0] + (version ? "**" : ""), name,
	index: NAKSATRAS[naksatra][1][version],
	color: GRAPH_STAR_COLORS[name] || NAKSATRA_COLORS[i % NAKSATRA_COLORS.length]}))
const NAKSATRA_BY_INDEX = new Map(GRAPH_NAKSATRAS.map(star => [star.index, star]))

function graphNumber(input) {
	return parseNumber(input.value.replace(/^±/, ""))}

function graphConditions() {
	const conditions = {latitude: graphNumber(pageUI.latitudeInput), longitude: graphNumber(pageUI.longitudeInput),
		elevation: graphNumber(pageUI.elevationInput),
		sunAltitude: graphNumber(UI.sunAltitudeInput), horizon: graphNumber(UI.horizonAltitudeInput),
		rising: graphNumber(UI.risingAzimuthInput), uncertainty: graphNumber(UI.risingUncertaintyInput),
		refraction: UI.refractionCheckbox.checked,
		temperature: graphNumber(UI.temperatureInput), pressure: graphNumber(UI.pressureInput)}
	if(Object.values(conditions).some(value => typeof value === "number" && !Number.isFinite(value)) ||
		Math.abs(conditions.latitude) > 90 || Math.abs(conditions.longitude) > 180 ||
		conditions.elevation < 0 || conditions.elevation > 10000 ||
		conditions.sunAltitude < -30 || conditions.sunAltitude > 90 ||
		conditions.horizon < -30 || conditions.horizon > 90 ||
		conditions.rising < 0 || conditions.rising > 180 ||
		conditions.uncertainty < 0 || conditions.temperature <= -273 || conditions.pressure < 0)
		return graph.conditions
	const horizonDip = getHorizonDip(conditions.latitude, conditions.elevation)
	UI.geometricHorizonLabel.textContent = "(Horizon's Altitude: " +
		(horizonDip > 0.00001 ? "−" : "") + horizonDip.toFixed(2) + "°)"
	const maxAltitudeDifference = conditions.refraction ?
		getGeometricAltitude(0, conditions.temperature, conditions.pressure) : 0
	UI.maxAltitudeDifferenceLabel.textContent = "(Max. Altitude Diff.: " +
		(maxAltitudeDifference < -0.00001 ? "−" : "") +
		Math.abs(maxAltitudeDifference).toFixed(2) + "°)"
	const phi = conditions.latitude * DEGREE
	const starAltitude = geometricHorizon(conditions) * DEGREE
	const risingAzimuth = conditions.rising * DEGREE
	const declination = Math.asin(clip(Math.sin(phi) * Math.sin(starAltitude) +
		Math.cos(phi) * Math.cos(starAltitude) * Math.cos(risingAzimuth), -1, 1)) / DEGREE
	const geometricMaximum = 90 - Math.abs(conditions.latitude - declination)
	const starMaximum = conditions.refraction ? apparentAltitude(geometricMaximum,
		conditions.temperature, conditions.pressure) : geometricMaximum
	UI.starMaxAltitudeLabel.textContent = "(Star's Max. Altitude: " +
		(starMaximum < -0.00001 ? "−" : "+") + Math.abs(starMaximum).toFixed(2) + "°)"
	graph.conditions = conditions
	return conditions}

function geometricHorizon(conditions, apparentHorizon = conditions.horizon) {
	if(!conditions.refraction || conditions.pressure === 0 || Math.abs(apparentHorizon) === 90)
		return apparentHorizon
	if(!conditions.geometricHorizons) conditions.geometricHorizons = new Map()
	const key = [apparentHorizon, conditions.temperature, conditions.pressure].join("|")
	if(conditions.geometricHorizons.has(key)) return conditions.geometricHorizons.get(key)
	const result = getGeometricAltitude(apparentHorizon, conditions.temperature, conditions.pressure)
	conditions.geometricHorizons.set(key, result)
	return result}

function starAzimuthAtYear(star, year, conditions, altitude) {
	const wholeYear = Math.floor(year)
	const jd = getJulianDay(wholeYear, 1, 1, 0, 0) + (year - wholeYear) * getYearDays(wholeYear)
	const jc = (jd - 2451545) / 36525
	return getRisingAzimuth(toTP(mdot(getEquatorialRotation(jc), getStarPosition(star.index, jd)))[1],
		conditions.latitude, altitude)}

function getGraphTracks(conditions) {
	const key = [conditions.latitude, conditions.horizon, conditions.refraction,
		conditions.temperature, conditions.pressure, graph.yearMin, graph.yearMax].join("|")
	if(graph.cache && graph.cache.key === key) return graph.cache.tracks
	const altitude = geometricHorizon(conditions)
	const samples = 30
	const declinationKey = [graph.yearMin, graph.yearMax].join("|")
	if(!graph.declinationCache || graph.declinationCache.key !== declinationKey) {
		const declinationTracks = [
			...GRAPH_STARS.map(star => ({...star,
				color: NAKSATRA_BY_INDEX.get(star.index)?.color || star.color,
				naksatra: NAKSATRA_BY_INDEX.get(star.index)?.naksatra || ""})),
			...GRAPH_NAKSATRAS.filter(star =>
				!GRAPH_STARS.some(existing => existing.index === star.index))
		].map(star => ({...star, points: []}))
		for(let i = 0; i <= samples; i++) {
			const year = graph.yearMin + (graph.yearMax - graph.yearMin) * i / samples
			const wholeYear = Math.floor(year)
			const jd = getJulianDay(wholeYear, 1, 1, 0, 0) +
				(year - wholeYear) * getYearDays(wholeYear)
			const rotation = getEquatorialRotation((jd - 2451545) / 36525)
			for(const track of declinationTracks) track.points.push({year,
				declination: toTP(mdot(rotation, getStarPosition(track.index, jd)))[1]})}
		graph.declinationCache = {key: declinationKey, tracks: declinationTracks}}
	const tracks = graph.declinationCache.tracks.map(track => ({...track,
		points: track.points.map(point => {
		const azimuth = getRisingAzimuth(point.declination, conditions.latitude, altitude)
		return azimuth === null ? null : {year: point.year, azimuth}})}))
	for(const track of tracks) {
		const sampledPoints = track.points
		const refinedPoints = [sampledPoints[0]]
		for(let i = 1; i < sampledPoints.length; i++) {
			const previous = sampledPoints[i - 1], current = sampledPoints[i]
			if(Boolean(previous) !== Boolean(current)) {
				let visibleYear = (previous || current).year
				let hiddenYear = graph.yearMin + (graph.yearMax - graph.yearMin) *
					(previous ? i : i - 1) / samples
				let boundaryAzimuth = (previous || current).azimuth < 90 ? 0 : 180
				for(let iteration = 0; iteration < 24 &&
					Math.abs(visibleYear - hiddenYear) >= 1 / 365.25; iteration++) {
					const middleYear = (visibleYear + hiddenYear) / 2
					const azimuth = starAzimuthAtYear(track, middleYear, conditions, altitude)
					if(azimuth === null) hiddenYear = middleYear
					else {
						visibleYear = middleYear
						boundaryAzimuth = azimuth < 90 ? 0 : 180}}
				refinedPoints.push({year: (visibleYear + hiddenYear) / 2,
					azimuth: boundaryAzimuth})}
			refinedPoints.push(current)}
		track.points = refinedPoints}
	graph.cache = {key, tracks}
	return tracks}

function trackUncertaintyIntervals(track, bandMin, bandMax) {
	const intervals = []
	function addInterval(start, end) {
		if(end < start) [start, end] = [end, start]
		const previous = intervals[intervals.length - 1]
		if(previous && start <= previous.end + 1e-7) previous.end = Math.max(previous.end, end)
		else intervals.push({start, end})}
	for(let i = 1; i < track.points.length; i++) {
		const first = track.points[i - 1], second = track.points[i]
		if(!first || !second) continue
		const change = second.azimuth - first.azimuth
		let startFraction, endFraction
		if(Math.abs(change) < 1e-12) {
			if(first.azimuth < bandMin || first.azimuth > bandMax) continue
			startFraction = 0
			endFraction = 1}
		else {
			const atMinimum = (bandMin - first.azimuth) / change
			const atMaximum = (bandMax - first.azimuth) / change
			startFraction = Math.max(0, Math.min(atMinimum, atMaximum))
			endFraction = Math.min(1, Math.max(atMinimum, atMaximum))
			if(startFraction > endFraction) continue}
		addInterval(first.year + (second.year - first.year) * startFraction,
			first.year + (second.year - first.year) * endFraction)}
	return intervals}

function uncertaintyIntersections(tracks, conditions) {
	const bandMin = Math.max(0, conditions.rising - conditions.uncertainty)
	const bandMax = Math.min(180, conditions.rising + conditions.uncertainty)
	const intersections = []
	for(const track of tracks)
		trackUncertaintyIntervals(track, bandMin, bandMax).forEach((interval, index) => {
			const midpoint = (interval.start + interval.end) / 2
			const crossings = []
			for(let i = 1; i < track.points.length; i++) {
				const first = track.points[i - 1], second = track.points[i]
				if(!first || !second || second.year < interval.start || first.year > interval.end)
					continue
				const change = second.azimuth - first.azimuth
				if(Math.abs(change) < 1e-12) {
					if(Math.abs(first.azimuth - conditions.rising) < 1e-9)
						crossings.push(Math.max(interval.start, Math.min(interval.end, midpoint)))
					continue}
				const fraction = (conditions.rising - first.azimuth) / change
				if(fraction < 0 || fraction > 1) continue
				const year = first.year + (second.year - first.year) * fraction
				if(year >= interval.start - 1e-7 && year <= interval.end + 1e-7)
					crossings.push(year)}
			intersections.push({id: track.name + ":" + index, track,
				start: interval.start, end: interval.end,
				centralYear: crossings.length ? crossings.reduce((closest, year) =>
					Math.abs(year - midpoint) < Math.abs(closest - midpoint) ? year : closest) : null})})
	return intersections.sort((a, b) => {
		return (Number.isFinite(b.centralYear) ? b.centralYear : (b.start + b.end) / 2) -
			(Number.isFinite(a.centralYear) ? a.centralYear : (a.start + a.end) / 2) ||
			a.track.name.localeCompare(b.track.name)})}

function formatCalendarYear(year) {
	return year <= 0 ? 1 - year + " BC" : "AD " + year}

function formatIntersectionYear(year) {
	return formatCalendarYear(Math.round(year))}

function horizonOppositionError(
	star, julianDay, conditions, starAltitude, sunAltitude,
	starIsRising = true, sunIsRising = !starIsRising) {
	const jc = (julianDay - 2451545) / 36525
	const rotation = getEquatorialRotation(jc)
	const [starRA, starDec] = toTP(mdot(rotation, getStarPosition(star.index, julianDay)))
	const [sunRA, sunDec] = toTP(normalize(mdot(rotation, getGeocentricSunPosition(jc))))
	const starHourAngle = getHorizonHourAngle(starDec, conditions.latitude, starAltitude)
	const sunHourAngle = getHorizonHourAngle(sunDec, conditions.latitude, sunAltitude)
	if(starHourAngle === null || sunHourAngle === null) return null
	return mod(starRA - sunRA + (starIsRising ? -1 : 1) * starHourAngle -
		(sunIsRising ? -1 : 1) * sunHourAngle, 360, -180)}

function sunEventAzimuthAtYear(
	star, year, conditions, starIsRising, sunIsRising, starAltitude, sunAltitude) {
	year = Math.round(year)
	const timeZone = Math.round(conditions.longitude / 15)
	const firstDay = getJulianDay(year, 1, 1, 0, timeZone)
	const days = getYearDays(year)
	function coordinatesAt(julianDay) {
		const jc = (julianDay - 2451545) / 36525
		const rotation = getEquatorialRotation(jc)
		return {
			star: toTP(mdot(rotation, getStarPosition(star.index, julianDay))),
			sun: toTP(normalize(mdot(rotation, getGeocentricSunPosition(jc))))}}
	function error(julianDay) {
		const {star: [starRA, starDec], sun: [sunRA, sunDec]} = coordinatesAt(julianDay)
		const starHourAngle = getHorizonHourAngle(starDec, conditions.latitude, starAltitude)
		const sunHourAngle = getHorizonHourAngle(sunDec, conditions.latitude, sunAltitude)
		if(starHourAngle === null || sunHourAngle === null) return null
		return mod(starRA - sunRA + (starIsRising ? -1 : 1) * starHourAngle -
			(sunIsRising ? -1 : 1) * sunHourAngle, 360, -180)}
	let previousDay = firstDay, previousError = error(firstDay), eventDay = null
	for(let offset = 15; offset <= days + 14; offset += 15) {
		const currentDay = firstDay + Math.min(offset, days)
		const currentError = error(currentDay)
		if(previousError !== null && currentError !== null && previousError * currentError <= 0 &&
			Math.abs(currentError - previousError) < 180) {
			eventDay = findRoot(error, previousDay, currentDay, 1 / 864000)
			break}
		previousDay = currentDay
		previousError = currentError}
	if(eventDay === null) return null
	const risingAzimuth = getRisingAzimuth(
		coordinatesAt(eventDay).sun[1], conditions.latitude, sunAltitude)
	if(!Number.isFinite(risingAzimuth)) return null
	return sunIsRising ? risingAzimuth : mod(360 - risingAzimuth, 360)}

function starCrossingNearOpposition(
	star, oppositionDay, conditions, starAltitude, sunAltitude, starIsRising, sunIsRising) {
	function directCrossing(seedDay) {
		let crossingDay = seedDay
		for(let iteration = 0; iteration < 6; iteration++) {
			const jc = (crossingDay - 2451545) / 36525
			const [rightAscension, declination] = toTP(mdot(
				getEquatorialRotation(jc), getStarPosition(star.index, crossingDay)))
			const hourAngle = getHorizonHourAngle(declination, conditions.latitude, starAltitude)
			if(hourAngle === null) return null
			const siderealError = mod(rightAscension + (starIsRising ? -hourAngle : hourAngle) -
				getSidereal(jc, conditions.longitude), 360, -180)
			const correction = siderealError / 360.98564736629
			crossingDay += correction
			if(Math.abs(correction) < 1 / 86400) break}
		return crossingDay}
	const candidates = [...new Set([-1, 0, 1]
		.map(offset => directCrossing(oppositionDay + offset)).filter(Number.isFinite))]
	if(!candidates.length) return null
	const visibleCandidates = candidates.filter(candidate => {
		const jc = (candidate - 2451545) / 36525
		const [rightAscension, declination] = toTP(normalize(mdot(
			getEquatorialRotation(jc), getGeocentricSunPosition(jc))))
		return getEquatorialAltitude(rightAscension, declination, candidate,
			conditions.latitude, conditions.longitude) - sunAltitude >= -1e-9})
	return (visibleCandidates.length ? visibleCandidates : candidates).reduce((closest, candidate) =>
		Math.abs(horizonOppositionError(star, candidate, conditions, starAltitude, sunAltitude,
			starIsRising, sunIsRising)) <
		Math.abs(horizonOppositionError(star, closest, conditions, starAltitude, sunAltitude,
			starIsRising, sunIsRising)) ? candidate : closest)}

function starOppositionEvent(
	star, centralYear, conditions, starIsRising = true, sunIsRising = !starIsRising) {
	if(!Number.isFinite(centralYear)) return {label: "NA", julianDay: null}
	const year = Math.round(centralYear)
	const {latitude, longitude, sunAltitude: apparentSunAltitude, horizon,
		refraction, temperature, pressure} = conditions
	const key = [star.index, year, latitude, longitude, apparentSunAltitude, horizon,
		refraction, temperature, pressure, starIsRising, sunIsRising].join("|")
	if(graph.oppositionDates.has(key)) return graph.oppositionDates.get(key)
	const starAltitude = geometricHorizon(conditions)
	const sunAltitude = geometricHorizon(conditions, apparentSunAltitude)
	const horizonError = julianDay => horizonOppositionError(
		star, julianDay, conditions, starAltitude, sunAltitude, starIsRising, sunIsRising)
	const firstDay = getJulianDay(year, 1, 1, 0, Math.round(longitude / 15))
	const days = getYearDays(year)
	let previousDay = firstDay, previousError = horizonError(firstDay), oppositionDay = null
	for(let offset = 2; offset <= days + 1; offset += 2) {
		const currentDay = firstDay + Math.min(offset, days)
		const currentError = horizonError(currentDay)
		if(previousError !== null && Math.abs(previousError) < 1e-10) oppositionDay = previousDay
		else if(previousError !== null && currentError !== null &&
			previousError * currentError <= 0 && Math.abs(currentError - previousError) < 180)
			oppositionDay = findRoot(horizonError, previousDay, currentDay, 1 / 864000)
		if(oppositionDay !== null) break
		previousDay = currentDay
		previousError = currentError}
	let result = {label: "NA", julianDay: null}
	if(oppositionDay !== null) {
		const crossingDay = starCrossingNearOpposition(
			star, oppositionDay, conditions, starAltitude, sunAltitude, starIsRising, sunIsRising)
		if(crossingDay !== null) {
			const roundedDay = Math.round(crossingDay * 1440) / 1440
			let [eventYear, month, day, time] = getGregorian(roundedDay, longitude)
			let minuteOfDay = Math.round(time * 4)
			if(minuteOfDay >= 1440) {
				[eventYear, month, day] = getGregorian(roundedDay + 1e-7, longitude)
				minuteOfDay = 0}
			const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
				"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month - 1]
			const timeText = String(Math.floor(minuteOfDay / 60)).padStart(2, "0") + ":" +
				String(minuteOfDay % 60).padStart(2, "0")
			result = {label: monthName + " " + day, julianDay: crossingDay,
				date: eventYear + "-" + String(month).padStart(2, "0") + "-" +
					String(day).padStart(2, "0"), time: timeText,
				tooltip: formatCalendarYear(eventYear) + " " + monthName + " " + day +
					" @ " + timeText}}}
	graph.oppositionDates.set(key, result)
	return result}

function selectedIntersectionEvent(select) {
	return {
		acronRising: [true, false], cosmRising: [true, true],
		cosmSetting: [false, true], acronSetting: [false, false]
	}[select.value]}

function updateIntersectionPanel(intersections, conditions) {
	const list = UI.intersectionList
	const scroller = list.closest(".intersectionScroller")
	const risingEvent = selectedIntersectionEvent(UI.risingEventSelect)
	const settingEvent = selectedIntersectionEvent(UI.settingEventSelect)
	intersections = intersections.filter(item => {
		if(!Number.isFinite(item.centralYear)) return false
		return starOppositionEvent(item.track, item.centralYear, conditions, ...risingEvent).julianDay !== null &&
			starOppositionEvent(item.track, item.centralYear, conditions, ...settingEvent).julianDay !== null})
	if(!intersections.some(item => item.id === graph.selectedIntersection)) {
		const completeRange = intersections.find(item =>
			item.start > graph.yearMin + 1e-6 && item.end < graph.yearMax - 1e-6)
		graph.selectedIntersection = completeRange ? completeRange.id :
			(intersections.length ? intersections[0].id : null)}
	const selectedItem = intersections.find(item => item.id === graph.selectedIntersection)
	if(selectedItem) {
		const sunAltitude = geometricHorizon(conditions, conditions.sunAltitude)
		const selectedSolarEvents = [
			{eventType: risingEvent, stellarEvent:
				UI.risingEventSelect.selectedOptions[0].textContent.toLowerCase() + " rising"},
			{eventType: settingEvent, stellarEvent:
				UI.settingEventSelect.selectedOptions[0].textContent.toLowerCase() + " setting"}]
		const solarEvents = selectedSolarEvents.map(({eventType, stellarEvent}) => {
			const event = starOppositionEvent(
				selectedItem.track, selectedItem.centralYear, conditions, ...eventType)
			if(event.julianDay === null) return null
			const jc = (event.julianDay - 2451545) / 36525
			const declination = toTP(normalize(mdot(
				getEquatorialRotation(jc), getGeocentricSunPosition(jc))))[1]
			const risingAzimuth = getRisingAzimuth(
				declination, conditions.latitude, sunAltitude)
			if(!Number.isFinite(risingAzimuth)) return null
			return {name: eventType[1] ? "sunrise" : "sunset",
				azimuth: eventType[1] ? risingAzimuth : mod(360 - risingAzimuth, 360),
				date: event.label, time: event.time, stellarEvent}}
		).filter(Boolean)
		const altitudeText = (conditions.sunAltitude < 0 ? "−" :
			conditions.sunAltitude > 0 ? "+" : "") +
			Math.abs(conditions.sunAltitude).toFixed(2)
		const eventDescriptions = solarEvents.map(event =>
			event.name[0].toUpperCase() + event.name.slice(1) + " at " +
			event.stellarEvent + ": " +
			formatIntersectionYear(selectedItem.centralYear) + " " + event.date + ", " +
			event.time + "; solar azm. " + event.azimuth.toFixed(2) +
			"°, alt. " + altitudeText + "°.")
		UI.intersectionTimeNote.textContent = eventDescriptions.join("\n")}
	else UI.intersectionTimeNote.textContent = ""
	const scrollTop = scroller.scrollTop
	const focusedId = document.activeElement?.dataset.intersectionId
	list.replaceChildren()
	list.setAttribute("aria-label", intersections.length +
		" stars and naksatras intersecting the azimuth uncertainty band")
	function cell(text, className = "") {
		const element = document.createElement("td")
		element.className = className
		element.textContent = text
		return element}
	for(const item of intersections) {
		const option = document.createElement("tr")
		const isSelected = item.id === graph.selectedIntersection
		option.className = "intersectionOption" + (isSelected ? " selected" : "")
		option.style.color = item.track.color
		option.setAttribute("role", "radio")
		option.setAttribute("aria-checked", String(isSelected))
		option.dataset.intersectionId = item.id
		option.tabIndex = 0
		function select() {
			graph.selectedIntersection = item.id
			requestGraphRender()}
		option.onclick = event => {
			if(!event.target.closest(".intersectionDateLink")) select()}
		option.onkeydown = event => {
			if(event.key === "Enter" || event.key === " ") {
				event.preventDefault(); select()}}
		const starCell = document.createElement("td")
		const starName = document.createElement("span")
		starName.textContent = item.track.name
		starCell.append(starName)
		function eventCell(eventType) {
			const eventCell = cell("", "intersectionDate")
			const event = starOppositionEvent(item.track, item.centralYear, conditions, ...eventType)
			if(event.julianDay === null) eventCell.textContent = "NA"
			else {
				const link = document.createElement("a")
				link.className = "intersectionDateLink"
				link.href = "index.html?" + new URLSearchParams({
					lat: String(conditions.latitude), lon: String(conditions.longitude),
					date: event.date, time: event.time,
					refraction: String(conditions.refraction)}).toString()
				link.target = "_blank"
				link.rel = "noopener"
				link.textContent = event.label + ", " + event.time
				link.title = event.tooltip
				eventCell.append(link)}
			return eventCell}
		option.append(cell(item.track.naksatra || "–"), starCell,
			cell(Number.isFinite(item.centralYear) ? formatIntersectionYear(item.centralYear) :
				"NA", "intersectionCentral"),
			eventCell(risingEvent), eventCell(settingEvent))
		list.append(option)
		if(focusedId === item.id) option.focus({preventScroll: true})}
	const row = list.rows[0]
	if(row?.cells.length === 5) {
		const widths = Array.from(row.cells, cell => cell.getBoundingClientRect().width)
		const headerTable = document.querySelector(".intersectionHeaderTable")
		headerTable.querySelectorAll("col").forEach((column, index) => {
			column.style.width = widths[index] + "px"})
		headerTable.style.width = widths.reduce((sum, width) => sum + width, 0) + "px"}
	const gutter = Math.max(0, scroller.offsetWidth - scroller.clientWidth) + "px"
	UI.intersectionTitle.style.paddingRight = gutter
	scroller.scrollTop = scrollTop
	return intersections.find(item => item.id === graph.selectedIntersection) || null}

function requestGraphRender() {
	if(graph.pending) return
	graph.pending = true
	requestAnimationFrame(() => {
		graph.pending = false
		const conditions = graphConditions()
		if(!conditions) {drawSkyPath(null, null); drawRisingSettingGraph(null, null); return}
		const tracks = getGraphTracks(conditions)
		const selected = updateIntersectionPanel(uncertaintyIntersections(tracks, conditions), conditions)
		const naksatraTracks = tracks.filter(track => NAKSATRA_BY_INDEX.has(track.index))
		const starTracks = tracks.filter(track => GRAPH_STARS.some(star => star.index === track.index))
		if(selected && !naksatraTracks.includes(selected.track)) naksatraTracks.push(selected.track)
		if(selected && !starTracks.includes(selected.track)) starTracks.push(selected.track)
		drawSkyPath(selected, conditions)
		drawAzimuthGraph(UI.naksatraGraph, naksatraTracks, selected, conditions, true)
		drawAzimuthGraph(UI.azimuthGraph, starTracks, selected, conditions)
		drawRisingSettingGraph(selected, conditions)})}

function spreadGraphLabels(labels, min, max, gap) {
	labels.sort((a, b) => a.x - b.x)
	if(!labels.length) return labels
	gap = Math.min(gap, (max - min) / Math.max(1, labels.length - 1))
	const groups = labels.map(label => [label])
	function centerGroup(group) {
		let start = group.reduce((sum, label) => sum + label.x, 0) / group.length -
			gap * (group.length - 1) / 2
		start = Math.max(min, Math.min(max - gap * (group.length - 1), start))
		for(let i = 0; i < group.length; i++) group[i].labelX = start + i * gap}
	for(const group of groups) centerGroup(group)
	for(let i = 0; i < groups.length - 1;) {
		const left = groups[i], right = groups[i + 1]
		if(right[0].labelX - left[left.length - 1].labelX < gap - 1e-6) {
			left.push(...right)
			groups.splice(i + 1, 1)
			centerGroup(left)
			if(i > 0) i--}
		else i++}
	return labels}

function solarAzimuthGuides(conditions) {
	const solarAltitude = geometricHorizon(conditions, conditions.sunAltitude)
	const obliquity = getObliquity(0)
	return {
		solstices: [-obliquity, obliquity].map(declination =>
			getRisingAzimuth(declination, conditions.latitude, solarAltitude))
			.filter(Number.isFinite),
		equinox: 90}}

function prepareGraphCanvas(canvas) {
	const width = canvas.clientWidth, height = canvas.clientHeight
	if(!width || !height) return null
	const dpr = window.devicePixelRatio || 1
	const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr)
	if(canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth
		canvas.height = pixelHeight}
	const ctx = canvas.getContext("2d")
	ctx.setTransform(1, 0, 0, 1, 0, 0)
	ctx.fillStyle = "black"
	ctx.fillRect(0, 0, pixelWidth, pixelHeight)
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	return {ctx, width, height}}

function drawVerticalLabel(ctx, text, x, y, color) {
	ctx.save()
	ctx.translate(x, y)
	ctx.rotate(-Math.PI / 2)
	if(color) ctx.fillStyle = color
	ctx.fillText(text, 0, 0)
	ctx.restore()}

function drawGraphTitle(ctx, canvas, x) {
	const title = canvas.closest(".graphPanel")?.querySelector(".graphCollapsedLabel")?.textContent
	if(!title) return
	ctx.save()
	ctx.fillStyle = "white"
	ctx.font = "14pt sans-serif"
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText(title, x, 17)
	ctx.restore()}

function drawRisingSettingGraph(selectedIntersection, conditions) {
	const canvas = UI.risingSettingGraph
	const prepared = prepareGraphCanvas(canvas)
	if(!prepared) return
	const {ctx, width, height} = prepared
	drawGraphTitle(ctx, canvas, width / 2)
	if(!selectedIntersection || !conditions || !Number.isFinite(selectedIntersection.centralYear)) {
		canvas.setAttribute("aria-label", "No selected star for the acronychal and cosmical detail graph")
		return}
	const risingEvent = selectedIntersectionEvent(UI.risingEventSelect)
	const settingEvent = selectedIntersectionEvent(UI.settingEventSelect)
	const risingEventName = UI.risingEventSelect.value === "acronRising" ? "Acronychal" : "Cosmical"
	const settingEventName = UI.settingEventSelect.value === "acronSetting" ? "Acronychal" : "Cosmical"
	const star = selectedIntersection.track
	const centralYear = selectedIntersection.centralYear
	const viewportUncertainty = Math.max(conditions.uncertainty, 1)
	const viewportInterval = trackUncertaintyIntervals(star,
		Math.max(0, conditions.rising - viewportUncertainty),
		Math.min(180, conditions.rising + viewportUncertainty)).find(interval =>
		centralYear >= interval.start - 1e-7 && centralYear <= interval.end + 1e-7) || selectedIntersection
	const selectedSpan = Math.max(viewportInterval.end - viewportInterval.start, 1)
	const yearMin = Math.max(graph.yearMin, centralYear - selectedSpan)
	const yearMax = Math.min(graph.yearMax, centralYear + selectedSpan)
	const yearTickStep = (yearMax - yearMin) / 8
	const yearTicks = [centralYear]
	for(let offset = 1; offset * yearTickStep <= yearMax - yearMin; offset++) {
		const earlier = centralYear - offset * yearTickStep
		const later = centralYear + offset * yearTickStep
		if(earlier >= yearMin - 1e-7) yearTicks.push(earlier)
		if(later <= yearMax + 1e-7) yearTicks.push(later)}
	yearTicks.sort((a, b) => a - b)
	const starAltitude = geometricHorizon(conditions)
	const sunAltitude = geometricHorizon(conditions, conditions.sunAltitude)
	function sunEventSamples(eventType) {
		const solarPoints = []
		const sampleCount = 30
		for(let index = 0; index <= sampleCount; index++) {
			const year = yearMin + (yearMax - yearMin) * index / sampleCount
			const eventAzimuth = sunEventAzimuthAtYear(
				star, year, conditions, ...eventType, starAltitude, sunAltitude)
			if(eventAzimuth === null) {solarPoints.push({year, azimuth: null}); continue}
			solarPoints.push({year, azimuth: eventType[1] ? eventAzimuth :
				mod(360 - eventAzimuth, 360)})}
		const validIndices = solarPoints.map((point, index) =>
			Number.isFinite(point.azimuth) ? index : -1).filter(index => index >= 0)
		for(let index = 0; index < solarPoints.length; index++) {
			if(Number.isFinite(solarPoints[index].azimuth) || !validIndices.length) continue
			const previous = validIndices.filter(validIndex => validIndex < index).at(-1)
			const next = validIndices.find(validIndex => validIndex > index)
			let first = previous, second = next
			if(first === undefined) [first, second] = validIndices.slice(0, 2)
			else if(second === undefined) [first, second] = validIndices.slice(-2)
			if(second === undefined) solarPoints[index].azimuth = solarPoints[first].azimuth
			else {
				const firstPoint = solarPoints[first], secondPoint = solarPoints[second]
				const fraction = (solarPoints[index].year - firstPoint.year) /
					(secondPoint.year - firstPoint.year)
				solarPoints[index].azimuth = firstPoint.azimuth +
					(secondPoint.azimuth - firstPoint.azimuth) * fraction}}
		return solarPoints}
	const risingSunPoints = sunEventSamples(risingEvent)
	const settingSunPoints = sunEventSamples(settingEvent)
	const solarAzimuths = [...risingSunPoints, ...settingSunPoints]
		.map(point => point.azimuth).filter(azimuth => azimuth >= 0 && azimuth <= 180)
	const azimuthHalfRange = 2 * Math.max(conditions.uncertainty, 1)
	let dataAzimuthMin = Math.max(0, conditions.rising - azimuthHalfRange)
	let dataAzimuthMax = Math.min(180, conditions.rising + azimuthHalfRange)
	if(solarAzimuths.length) {
		dataAzimuthMin = Math.max(0, Math.min(dataAzimuthMin, ...solarAzimuths))
		dataAzimuthMax = Math.min(180, Math.max(dataAzimuthMax, ...solarAzimuths))}
	const rawAzimuthStep = (dataAzimuthMax - dataAzimuthMin) / 8
	const stepMagnitude = 10 ** Math.floor(Math.log10(rawAzimuthStep))
	const azimuthStep = ([1, 2, 2.5, 5, 10].find(value =>
		value >= rawAzimuthStep / stepMagnitude) || 10) * stepMagnitude
	const azimuthMin = Math.max(0,
		(Math.floor(dataAzimuthMin / azimuthStep) - 1) * azimuthStep)
	const azimuthMax = Math.min(180,
		(Math.ceil(dataAzimuthMax / azimuthStep) + 1) * azimuthStep)
	const azimuthBlocks = Math.round((azimuthMax - azimuthMin) / azimuthStep)
	const left = 102, right = width - 102, top = 94, bottom = height - 96
	if(right <= left || bottom <= top || yearMax <= yearMin || azimuthMax <= azimuthMin) return
	const x = azimuth => left + (azimuth - azimuthMin) / (azimuthMax - azimuthMin) * (right - left)
	const y = year => bottom - (year - yearMin) / (yearMax - yearMin) * (bottom - top)
	ctx.font = "10pt sans-serif"
	ctx.textBaseline = "middle"
	ctx.textAlign = "center"
	const altitudeType = conditions.refraction ? "Apparent" : "Geometric"
	ctx.fillStyle = SETTING_AXIS_COLOR
	ctx.fillText(altitudeType + " Setting Azimuth (°)", (left + right) / 2, 49)
	ctx.fillStyle = RISING_AXIS_COLOR
	ctx.fillText(altitudeType + " Rising Azimuth (°)", (left + right) / 2, height - 49)
	const altitude = (conditions.horizon < 0 ? "−" : "+") +
		Math.abs(conditions.horizon).toFixed(2) + "°"
	const sunAltitudeText = (conditions.sunAltitude < 0 ? "−" : "+") +
		Math.abs(conditions.sunAltitude).toFixed(2) + "°"
	ctx.fillStyle = "#aaa"
	ctx.fillText("(The " + altitudeType.toLowerCase() + " rising and setting azimuths of the " +
		"selected star are computed at its " + altitude + " altitude crossings, while sunrise " +
		"and sunset use a Sun altitude of " + sunAltitudeText + ".)",
		(left + right) / 2, height - 17)
	drawVerticalLabel(ctx, risingEventName + " Rising Date***",
		25, (top + bottom) / 2, RISING_AXIS_COLOR)
	drawVerticalLabel(ctx, settingEventName + " Setting Date***", width - 25,
		(top + bottom) / 2, SETTING_AXIS_COLOR)
	ctx.save()
	ctx.globalAlpha = 0.22
	ctx.fillStyle = star.color
	ctx.fillRect(x(Math.max(azimuthMin, conditions.rising - conditions.uncertainty)), top,
		x(Math.min(azimuthMax, conditions.rising + conditions.uncertainty)) -
		x(Math.max(azimuthMin, conditions.rising - conditions.uncertainty)), bottom - top)
	ctx.fillRect(left, y(Math.min(yearMax, selectedIntersection.end)), right - left,
		y(Math.max(yearMin, selectedIntersection.start)) - y(Math.min(yearMax, selectedIntersection.end)))
	ctx.restore()
	for(let majorIndex = 0; majorIndex < azimuthBlocks; majorIndex++) {
		for(let minorIndex = 1; minorIndex < 10; minorIndex++) {
			const azimuth = azimuthMin + azimuthStep * (majorIndex + minorIndex / 10)
			const px = Math.round(x(azimuth)) + 0.5
			ctx.strokeStyle = "#777"
			ctx.lineWidth = 0.3
			ctx.beginPath()
			ctx.moveTo(px, top); ctx.lineTo(px, top - 4)
			ctx.moveTo(px, bottom); ctx.lineTo(px, bottom + 4)
			ctx.stroke()}}
	for(let index = 0; index <= azimuthBlocks; index++) {
		const azimuth = azimuthMin + azimuthStep * index
		const px = Math.round(x(azimuth)) + 0.5
		ctx.strokeStyle = "#777"
		ctx.lineWidth = 0.5
		ctx.beginPath()
		ctx.moveTo(px, top); ctx.lineTo(px, bottom)
		ctx.moveTo(px, top); ctx.lineTo(px, top - 9)
		ctx.moveTo(px, bottom); ctx.lineTo(px, bottom + 9)
		ctx.stroke()
		ctx.textAlign = "center"
		ctx.fillStyle = SETTING_AXIS_COLOR
		let settingLabel = Math.round(mod(360 - azimuth, 360) * 100) / 100
		ctx.fillText(Number.isInteger(settingLabel) ? String(settingLabel) :
			settingLabel.toFixed(2).replace(/0$/, ""), px, top - 21)
		ctx.fillStyle = RISING_AXIS_COLOR
		let risingLabel = Math.round(azimuth * 100) / 100
		ctx.fillText(Number.isInteger(risingLabel) ? String(risingLabel) :
			risingLabel.toFixed(2).replace(/0$/, ""), px, bottom + 23)}
	const yearLabels = []
	for(const year of yearTicks) {
		const py = Math.round(y(year)) + 0.5
		ctx.strokeStyle = "#777"
		ctx.lineWidth = 0.5
		ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(right, py); ctx.stroke()
		ctx.textBaseline = "middle"
		ctx.textAlign = "right"
		ctx.fillStyle = RISING_AXIS_COLOR
		ctx.fillText(starOppositionEvent(star, year, conditions, ...risingEvent).label, left - 10, py)
		ctx.textAlign = "left"
		ctx.fillStyle = SETTING_AXIS_COLOR
		ctx.fillText(starOppositionEvent(star, year, conditions, ...settingEvent).label, right + 10, py)
		yearLabels.push({text: formatIntersectionYear(year), y: py,
			isCentral: Math.abs(year - centralYear) < 1e-7})}
	ctx.strokeStyle = "#aaa"
	ctx.lineWidth = 2
	ctx.lineCap = "round"
	ctx.setLineDash([1, 5])
	ctx.beginPath()
	ctx.moveTo(x(conditions.rising), top); ctx.lineTo(x(conditions.rising), bottom)
	ctx.moveTo(left, y(centralYear)); ctx.lineTo(right, y(centralYear))
	ctx.stroke()
	ctx.setLineDash([])
	ctx.lineCap = "butt"
	ctx.save()
	ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip()
	function sunPath(solarPoints) {
		const solarPath = new Path2D()
		let drawingSolarPath = false
		for(const point of solarPoints) {
			if(!Number.isFinite(point.azimuth)) {drawingSolarPath = false; continue}
			const px = x(point.azimuth), py = y(point.year)
			if(drawingSolarPath) solarPath.lineTo(px, py)
			else solarPath.moveTo(px, py)
			drawingSolarPath = true}
		return solarPath}
	const risingSunPath = sunPath(risingSunPoints)
	const settingSunPath = sunPath(settingSunPoints)
	const risingCentralEvent = starOppositionEvent(
		star, centralYear, conditions, ...risingEvent)
	const settingCentralEvent = starOppositionEvent(
		star, centralYear, conditions, ...settingEvent)
	const sameEventDate = risingCentralEvent.date &&
		risingCentralEvent.date === settingCentralEvent.date
	ctx.strokeStyle = "black"
	ctx.lineWidth = 4.5
	ctx.setLineDash([])
	ctx.stroke(risingSunPath)
	ctx.strokeStyle = RISING_AXIS_COLOR
	ctx.lineWidth = 2
	ctx.stroke(risingSunPath)
	ctx.setLineDash(sameEventDate ? [4, 8] : [])
	ctx.strokeStyle = "black"
	ctx.lineWidth = 4.5
	ctx.lineCap = sameEventDate ? "round" : "butt"
	ctx.stroke(settingSunPath)
	ctx.strokeStyle = SETTING_AXIS_COLOR
	ctx.lineWidth = 2
	ctx.lineCap = "butt"
	ctx.stroke(settingSunPath)
	ctx.setLineDash([])
	const path = new Path2D()
	let drawing = false
	const samples = 30
	for(let index = 0; index <= samples; index++) {
		const year = yearMin + (yearMax - yearMin) * index / samples
		const azimuth = starAzimuthAtYear(star, year, conditions, starAltitude)
		if(azimuth === null) {drawing = false; continue}
		const px = x(azimuth), py = y(year)
		if(drawing) path.lineTo(px, py)
		else path.moveTo(px, py)
		drawing = true}
	ctx.strokeStyle = "black"
	ctx.lineWidth = 4.8
	ctx.stroke(path)
	ctx.strokeStyle = star.color
	ctx.lineWidth = 2
	ctx.stroke(path)
	ctx.restore()
	function labelSunPath(points, labelYear, lines, lineColor) {
		const point = points.filter(candidate => Number.isFinite(candidate.azimuth)).reduce((closest, candidate) =>
			!closest || Math.abs(candidate.year - labelYear) < Math.abs(closest.year - labelYear) ?
				candidate : closest, null)
		if(!point) return
		ctx.font = "10pt sans-serif"
		ctx.textAlign = "center"
		ctx.textBaseline = "middle"
		ctx.lineJoin = "round"
		ctx.strokeStyle = "black"
		ctx.lineWidth = 4
		ctx.fillStyle = lineColor
		const halfLabelWidth = Math.max(...lines.map(text => ctx.measureText(text).width)) / 2
		const labelX = Math.max(left + halfLabelWidth + 4,
			Math.min(right - halfLabelWidth - 4, x(point.azimuth)))
		const labelY = Math.max(top + 24, Math.min(bottom - 24, y(labelYear)))
		lines.forEach((text, index) => {
			const lineY = labelY + (index - (lines.length - 1) / 2) * 16
			ctx.strokeText(text, labelX, lineY)
			ctx.fillText(text, labelX, lineY)})}
	labelSunPath(risingSunPoints,
		(yearMin + Math.max(yearMin, selectedIntersection.start)) / 2,
		["Sunset at", risingEventName, "Rising"], RISING_AXIS_COLOR)
	labelSunPath(settingSunPoints,
		(Math.min(yearMax, selectedIntersection.end) + yearMax) / 2,
		["Sunrise at", settingEventName, "Setting"], SETTING_AXIS_COLOR)
	ctx.font = "10pt sans-serif"
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.lineJoin = "round"
	ctx.strokeStyle = "black"
	ctx.lineWidth = 4
	ctx.fillStyle = "white"
	const annotationX = x(conditions.rising)
	const identityLines = star.naksatra ? [star.naksatra, "(" + star.name + ")"] : [star.name]
	identityLines.forEach((text, index) => {
		const lineY = y(centralYear) + (index - (identityLines.length - 1) / 2) * 16
		ctx.strokeText(text, annotationX, lineY)
		ctx.fillText(text, annotationX, lineY)})
	const upperBoundY = y(Math.min(yearMax, selectedIntersection.end))
	const lowerBoundY = y(Math.max(yearMin, selectedIntersection.start))
	const upperBoundText = formatIntersectionYear(selectedIntersection.end)
	const lowerBoundText = formatIntersectionYear(selectedIntersection.start)
	if(conditions.uncertainty > 1e-9 &&
		Math.abs(selectedIntersection.end - graph.yearMax) >= 1e-6) {
		ctx.strokeText(upperBoundText, annotationX, upperBoundY)
		ctx.fillText(upperBoundText, annotationX, upperBoundY)}
	if(conditions.uncertainty > 1e-9 &&
		Math.abs(selectedIntersection.start - graph.yearMin) >= 1e-6) {
		ctx.strokeText(lowerBoundText, annotationX, lowerBoundY)
		ctx.fillText(lowerBoundText, annotationX, lowerBoundY)}
	ctx.textBaseline = "middle"
	ctx.lineJoin = "round"
	ctx.strokeStyle = "black"
	ctx.lineWidth = 4
	for(const label of yearLabels) {
		ctx.fillStyle = label.isCentral ? "white" : "gray"
		ctx.textAlign = "left"
		ctx.strokeText(label.text, left + 10, label.y)
		ctx.fillText(label.text, left + 10, label.y)
		ctx.textAlign = "right"
		ctx.strokeText(label.text, right - 10, label.y)
		ctx.fillText(label.text, right - 10, label.y)}
	canvas.setAttribute("aria-label", star.name + " " + risingEventName.toLowerCase() +
		" rising and " + settingEventName.toLowerCase() + " setting detail from " +
		formatIntersectionYear(yearMin) + " to " + formatIntersectionYear(yearMax) +
		"; red and blue curves show the Sun's azimuth for the selected rising and setting events")}

function drawAzimuthGraph(canvas, tracks, selectedIntersection, conditions, naksatrasOnly = false) {
	const prepared = prepareGraphCanvas(canvas)
	if(!prepared) return
	const {ctx, width, height} = prepared
	let lowest = conditions.rising - conditions.uncertainty
	let highest = conditions.rising + conditions.uncertainty
	const solarGuides = solarAzimuthGuides(conditions)
	for(const azimuth of [...solarGuides.solstices, solarGuides.equinox]) {
		lowest = Math.min(lowest, azimuth)
		highest = Math.max(highest, azimuth)}
	for(const track of tracks) for(const point of track.points) if(point) {
		lowest = Math.min(lowest, point.azimuth)
		highest = Math.max(highest, point.azimuth)}
	const extent = Math.min(90, Math.max(5,
		Math.ceil((Math.max(90 - lowest, highest - 90) + 1) / 5) * 5))
	const min = 90 - extent, max = 90 + extent
	const left = 102, right = width - 102, top = 94, bottom = height - 96
	const labelSpace = 72
	const trackBottom = bottom - labelSpace
	const x = azimuth => left + (azimuth - min) / (max - min) * (right - left)
	const y = year => trackBottom - (year - graph.yearMin) / (graph.yearMax - graph.yearMin) *
		(trackBottom - top - labelSpace)
	ctx.font = "10pt sans-serif"
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	drawGraphTitle(ctx, canvas, (left + right) / 2)
	const altitudeType = conditions.refraction ? "Apparent" : "Geometric"
	ctx.fillStyle = SETTING_AXIS_COLOR
	ctx.fillText(altitudeType + " Setting Azimuth (°)", (left + right) / 2, 49)
	ctx.fillStyle = RISING_AXIS_COLOR
	ctx.fillText(altitudeType + " Rising Azimuth (°)", (left + right) / 2, height - 49)
	const altitude = (conditions.horizon < 0 ? "−" : "+") +
		Math.abs(conditions.horizon).toFixed(2) + "°"
	const sunAltitude = (conditions.sunAltitude < 0 ? "−" : "+") +
		Math.abs(conditions.sunAltitude).toFixed(2) + "°"
	const altitudeDescription = altitudeType.toLowerCase()
	ctx.fillStyle = "#aaa"
	if(naksatrasOnly)
		ctx.fillText("(The " + altitudeDescription + " rising and setting azimuths of each Indian " +
			"nakṣatra are computed at its yogatārā's " + altitude + " altitude crossings, while the " +
			"red solar guides use a Sun altitude of " + sunAltitude + ".)",
			(left + right) / 2, height - 17)
	else
		ctx.fillText("(The " + altitudeDescription + " rising and setting azimuths of each bright " +
			"star are computed at its " + altitude + " altitude crossings, while the red solar guides " +
			"use a Sun altitude of " + sunAltitude + ".)",
			(left + right) / 2, height - 17)
	ctx.fillStyle = "#ededed"
	drawVerticalLabel(ctx, "Year", 25, (top + bottom) / 2)
	drawVerticalLabel(ctx, "Year", width - 25, (top + bottom) / 2)
	if(solarGuides.solstices.length === 2) {
		const solarMinimum = Math.min(...solarGuides.solstices)
		const solarMaximum = Math.max(...solarGuides.solstices)
		ctx.save()
		ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip()
		ctx.fillStyle = "rgba(255, 0, 0, 0.15)"
		ctx.fillRect(x(solarMinimum), top, x(solarMaximum) - x(solarMinimum), bottom - top)
		ctx.restore()}

	ctx.save()
	ctx.globalAlpha = 0.22
	ctx.fillStyle = selectedIntersection ? selectedIntersection.track.color : "#fff"
	ctx.fillRect(x(Math.max(min, conditions.rising - conditions.uncertainty)), top,
		x(Math.min(max, conditions.rising + conditions.uncertainty)) -
		x(Math.max(min, conditions.rising - conditions.uncertainty)), bottom - top)
	ctx.restore()
	if(selectedIntersection) {
		const firstY = y(selectedIntersection.start)
		const lastY = y(selectedIntersection.end)
		const bandHeight = Math.max(2, Math.abs(lastY - firstY))
		ctx.save()
		ctx.globalAlpha = 0.22
		ctx.fillStyle = selectedIntersection.track.color
		ctx.fillRect(left, (firstY + lastY - bandHeight) / 2, right - left, bandHeight)
		ctx.restore()}
	for(let azimuth = Math.ceil(min); azimuth <= max; azimuth++) {
		const px = x(azimuth)
		const major = azimuth % 10 === 0 || azimuth === 0 || azimuth === 90 || azimuth === 180
		ctx.strokeStyle = major ? "#888" : "#777"
		ctx.lineWidth = 0.5
		ctx.setLineDash([])
		ctx.beginPath()
		if(major) {ctx.moveTo(px, top); ctx.lineTo(px, bottom)}
		ctx.moveTo(px, top); ctx.lineTo(px, top - (major ? 9 : 4))
		ctx.moveTo(px, bottom); ctx.lineTo(px, bottom + (major ? 9 : 4))
		ctx.stroke()
		if(major) {
			ctx.fillStyle = SETTING_AXIS_COLOR
			const settingAzimuth = (360 - azimuth) % 360
			ctx.fillText(({0: "North", 90: "East", 180: "South", 270: "West"})[settingAzimuth] ||
				String(settingAzimuth), px, top - 21)
			ctx.fillStyle = RISING_AXIS_COLOR
			ctx.fillText(({0: "North", 90: "East", 180: "South", 270: "West"})[azimuth] ||
				String(azimuth), px, bottom + 23)}}
	ctx.setLineDash([])
	for(let year = Math.ceil(graph.yearMin / 500) * 500; year < graph.yearMax; year += 500) {
		const py = y(year)
		const yearLabel = formatCalendarYear(year)
		ctx.strokeStyle = "#a1a1a1"
		ctx.lineWidth = 0.5
		ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(right, py); ctx.stroke()
		ctx.fillStyle = "#ddd"
		ctx.textAlign = "right"; ctx.fillText(yearLabel, left - 10, py)
		ctx.textAlign = "left"; ctx.fillText(yearLabel, right + 10, py)}
	ctx.save()
	ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip()
	for(const azimuth of [...solarGuides.solstices, solarGuides.equinox]) {
		const px = x(azimuth)
		ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom)
		ctx.strokeStyle = "black"; ctx.lineWidth = 3; ctx.stroke()
		ctx.strokeStyle = "red"; ctx.lineWidth = 1; ctx.stroke()}
	ctx.restore()
	ctx.strokeStyle = "#aaa"
	ctx.lineWidth = 2
	ctx.lineCap = "round"
	ctx.setLineDash([1, 5])
	ctx.beginPath(); ctx.moveTo(x(conditions.rising), top); ctx.lineTo(x(conditions.rising), bottom); ctx.stroke()
	if(selectedIntersection && Number.isFinite(selectedIntersection.centralYear)) {
		ctx.beginPath(); ctx.moveTo(left, y(selectedIntersection.centralYear))
		ctx.lineTo(right, y(selectedIntersection.centralYear)); ctx.stroke()}
	ctx.setLineDash([])
	ctx.lineCap = "butt"

	ctx.save()
	ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip()
	const upper = [], lower = []
	const trackPaths = []
	for(const track of tracks) {
		const path = new Path2D()
		let drawing = false, first = null, last = null
		for(const point of track.points) {
			if(!point) {drawing = false; continue}
			const px = x(point.azimuth), py = y(point.year)
			if(drawing) path.lineTo(px, py)
			else path.moveTo(px, py)
			drawing = true
			if(!first) first = point
			last = point}
		trackPaths.push({track, path, first, last})}
	ctx.strokeStyle = "black"; ctx.lineWidth = 4.8
	for(const item of trackPaths) ctx.stroke(item.path)
	ctx.lineWidth = 2
	for(const {track, path} of (selectedIntersection ? [
		...trackPaths.filter(item => item.track !== selectedIntersection.track),
		...trackPaths.filter(item => item.track === selectedIntersection.track)
	] : trackPaths)) {
		ctx.strokeStyle = track.color
		ctx.stroke(path)}
	for(const {track, first, last} of trackPaths) {
		if(last) upper.push({track, year: last.year, x: x(last.azimuth), y: y(last.year)})
		if(first) lower.push({track, year: first.year, x: x(first.azimuth), y: y(first.year)})}
	if(selectedIntersection && Number.isFinite(selectedIntersection.centralYear)) {
		ctx.beginPath(); ctx.arc(x(conditions.rising), y(selectedIntersection.centralYear), 4, 0, 2 * Math.PI)
		ctx.fillStyle = "white"; ctx.fill()
		ctx.beginPath(); ctx.arc(x(conditions.rising), y(selectedIntersection.centralYear), 3, 0, 2 * Math.PI)
		ctx.fillStyle = selectedIntersection.track.color; ctx.fill()}
	ctx.restore()
	ctx.font = naksatrasOnly ? "8pt sans-serif" : "10pt sans-serif"
	const sideLabelLanes = {left: [], right: []}
	function placeSideLabel(label) {
		const side = Math.abs(label.x - left) <= Math.abs(label.x - right) ? "left" : "right"
		const halfHeight = ctx.measureText(naksatrasOnly ? label.track.naksatra : label.track.name).width / 2 + 3
		const start = label.y - halfHeight, end = label.y + halfHeight
		let lane = 0
		while(sideLabelLanes[side][lane] &&
			sideLabelLanes[side][lane].some(item => start < item.end && end > item.start)) lane++
		if(!sideLabelLanes[side][lane]) sideLabelLanes[side][lane] = []
		sideLabelLanes[side][lane].push({start, end})
		label.labelX = side === "left" ? left + lane * 12 : right - lane * 12}
	for(const [labels, isUpper] of [[upper, true], [lower, false]]) {
		const edgeYear = isUpper ? graph.yearMax : graph.yearMin
		const edgeLabels = labels.filter(label => Math.abs(label.year - edgeYear) < 1e-6)
		const internalLabels = labels.filter(label => Math.abs(label.year - edgeYear) >= 1e-6)
		spreadGraphLabels(edgeLabels, left + 8, right - 8, naksatrasOnly ? 12 : 15)
		for(const label of internalLabels) placeSideLabel(label)
		for(const label of [...edgeLabels, ...internalLabels]) {
			const sideLabel = Math.abs(label.year - edgeYear) >= 1e-6
			const labelY = sideLabel ? label.y : label.y + (isUpper ? -9 : 9)
			ctx.beginPath()
			ctx.moveTo(label.x, label.y)
			ctx.lineTo(label.labelX, labelY)
			ctx.strokeStyle = "#777"; ctx.lineWidth = 1; ctx.stroke()
			ctx.save(); ctx.translate(label.labelX, labelY); ctx.rotate(-Math.PI / 2)
			ctx.textAlign = sideLabel ? "center" : (isUpper ? "left" : "right")
			ctx.textBaseline = "middle"
			ctx.strokeStyle = "black"; ctx.lineWidth = 3
			const labelText = naksatrasOnly ?
				(label.track.naksatra || label.track.name) : label.track.name
			ctx.strokeText(labelText, 0, 0)
			ctx.fillStyle = label.track.color; ctx.fillText(labelText, 0, 0)
			ctx.restore()}}
	canvas.setAttribute("aria-label", "Rising and setting azimuths of " + tracks.length +
		(naksatrasOnly ? " naksatra principal stars" : " stars") +
		" from " + formatCalendarYear(graph.yearMin) + " to " +
		formatCalendarYear(graph.yearMax) +
		", rising azimuth " + min + " to " + max + " degrees" +
		", at latitude " + conditions.latitude + " degrees. " +
		(conditions.refraction ? "Atmospheric refraction included." : "Atmospheric refraction excluded."))}

function drawSkyPath(selectedIntersection, conditions) {
	const canvas = UI.skyPathCanvas
	const rect = canvas.getBoundingClientRect()
	const width = rect.width || 150, height = rect.height || 150
	const dpr = window.devicePixelRatio || 1
	const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr)
	if(canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth
		canvas.height = pixelHeight}
	const ctx = canvas.getContext("2d")
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	ctx.clearRect(0, 0, width, height)
	const cx = width / 2, cy = height / 2
	const radius = Math.max(1, Math.min(width, height) / 2 - 16)
	const minimumAltitude = -30
	const altitudeSpan = 90 - minimumAltitude
	function screenPoint(azimuth, altitude) {
		const r = radius * (90 - altitude) / altitudeSpan
		const az = azimuth * DEGREE
		return [cx - r * Math.cos(az), cy - r * Math.sin(az)]}
	const solarEdgePaths = []
	if(conditions) {
		const latitude = conditions.latitude * DEGREE
		const solsticeDeclination = getObliquity(0)
		ctx.fillStyle = "rgba(255, 0, 0, 0.30)"
		for(let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
			for(let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
				const dx = cx - (x + 0.5), dy = cy - (y + 0.5)
				const distance = Math.hypot(dx, dy)
				if(distance > radius) continue
				const altitude = (90 - altitudeSpan * distance / radius) * DEGREE
				const declination = Math.asin(clip(Math.sin(latitude) * Math.sin(altitude) +
					Math.cos(latitude) * Math.cos(altitude) *
					(distance < 1e-9 ? 0 : dx / distance), -1, 1)) / DEGREE
				if(Math.abs(declination) <= solsticeDeclination) ctx.fillRect(x, y, 1, 1)}}
		for(const dec of [-solsticeDeclination * DEGREE, 0, solsticeDeclination * DEGREE]) {
			const edgePath = new Path2D()
			let drawing = false
			for(let hourAngle = -180; hourAngle <= 180; hourAngle += 1) {
				const h = hourAngle * DEGREE
				const altitude = Math.asin(clip(Math.sin(latitude) * Math.sin(dec) +
					Math.cos(latitude) * Math.cos(dec) * Math.cos(h), -1, 1)) / DEGREE
				if(altitude < minimumAltitude) {drawing = false; continue}
				const east = -Math.cos(dec) * Math.sin(h)
				const north = Math.cos(latitude) * Math.sin(dec) -
					Math.sin(latitude) * Math.cos(dec) * Math.cos(h)
				const azimuth = mod(Math.atan2(east, north) / DEGREE, 360)
				const point = screenPoint(azimuth, altitude)
				if(drawing) edgePath.lineTo(point[0], point[1])
				else {edgePath.moveTo(point[0], point[1]); drawing = true}}
			solarEdgePaths.push(edgePath)}}
	ctx.strokeStyle = "rgba(128, 128, 128, 0.65)"
	ctx.lineWidth = 0.75
	for(let altitude = 30; altitude < 90; altitude += 30) {
		ctx.beginPath()
		ctx.arc(cx, cy, radius * (90 - altitude) / altitudeSpan, 0, 2 * Math.PI)
		ctx.stroke()}
	for(let azimuth = 0; azimuth < 360; azimuth += 30) {
		const boundaryPoint = screenPoint(azimuth, minimumAltitude)
		ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(boundaryPoint[0], boundaryPoint[1]); ctx.stroke()}
	ctx.strokeStyle = "rgba(128, 128, 128, 0.65)"
	ctx.lineWidth = 0.75
	ctx.beginPath(); ctx.arc(cx, cy, radius, 0, 2 * Math.PI); ctx.stroke()
	const horizonDip = conditions ? getHorizonDip(conditions.latitude, conditions.elevation) : 0
	function drawHorizon() {
		ctx.lineCap = "round"
		ctx.setLineDash([1, 4])
		ctx.beginPath(); ctx.arc(cx, cy, radius * (90 + horizonDip) / altitudeSpan, 0, 2 * Math.PI)
		ctx.strokeStyle = "black"; ctx.lineWidth = 4.5; ctx.stroke()
		ctx.strokeStyle = color.horizontal; ctx.lineWidth = 2; ctx.stroke()
		ctx.setLineDash([])
		ctx.lineCap = "butt"}
	if(!conditions) drawHorizon()
	ctx.fillStyle = "white"
	ctx.font = "12px sans-serif"
	ctx.textAlign = "center"; ctx.textBaseline = "bottom"
	ctx.fillText("East 90°", cx, cy - radius - 2)
	ctx.textBaseline = "top"; ctx.fillText("West 270°", cx, cy + radius + 4)
	ctx.textBaseline = "middle"
	ctx.save(); ctx.translate(8, cy); ctx.rotate(-Math.PI / 2)
	ctx.fillText("North 0°", 0, 0); ctx.restore()
	ctx.save(); ctx.translate(width - 8, cy); ctx.rotate(Math.PI / 2)
	ctx.fillText("South 180°", 0, 0); ctx.restore()
	if(!conditions) {
		canvas.setAttribute("aria-label", "Visible sky path plot, with east at the top and north at the left")
		return}
	const starColor = selectedIntersection?.track.color || color.galactic
	const altitudeRadius = radius * (90 - conditions.horizon) / altitudeSpan
	if(altitudeRadius >= 0) {
		ctx.strokeStyle = "black"
		ctx.lineWidth = 5
		ctx.beginPath(); ctx.arc(cx, cy, altitudeRadius, 0, 2 * Math.PI); ctx.stroke()
		ctx.strokeStyle = starColor
		ctx.lineWidth = 2.5
		ctx.beginPath(); ctx.arc(cx, cy, altitudeRadius, 0, 2 * Math.PI); ctx.stroke()}
	drawHorizon()
	ctx.lineJoin = "round"
	ctx.strokeStyle = "black"
	ctx.lineWidth = 3
	for(const edgePath of solarEdgePaths) ctx.stroke(edgePath)
	ctx.strokeStyle = "rgba(255, 0, 0, 0.95)"
	ctx.lineWidth = 1
	for(const edgePath of solarEdgePaths) ctx.stroke(edgePath)
	const solsticeAzimuths = solarAzimuthGuides(conditions).solstices
	if(solsticeAzimuths.length === 2) {
		const risingMinimum = Math.min(...solsticeAzimuths)
		const risingMaximum = Math.max(...solsticeAzimuths)
		ctx.lineCap = "round"
		ctx.setLineDash([6, 4])
		for(const [start, end] of [[risingMinimum, risingMaximum],
			[360 - risingMaximum, 360 - risingMinimum]]) {
			ctx.beginPath()
			for(let i = 0; i <= 40; i++) {
				const point = screenPoint(start + (end - start) * i / 40, conditions.sunAltitude)
				if(i === 0) ctx.moveTo(point[0], point[1]); else ctx.lineTo(point[0], point[1])}
			ctx.strokeStyle = "black"
			ctx.lineWidth = 4.5
			ctx.stroke()
			ctx.strokeStyle = "red"
			ctx.lineWidth = 2
			ctx.stroke()}
		ctx.setLineDash([])
		ctx.lineCap = "butt"}
	const phi = conditions.latitude * DEGREE
	const starAltitude = geometricHorizon(conditions) * DEGREE
	const risingAzimuth = conditions.rising * DEGREE
	const declination = Math.asin(clip(Math.sin(phi) * Math.sin(starAltitude) +
		Math.cos(phi) * Math.cos(starAltitude) * Math.cos(risingAzimuth), -1, 1)) / DEGREE
	const dec = declination * DEGREE
	const starPath = new Path2D()
	let drawing = false
	for(let hourAngle = -180; hourAngle <= 180; hourAngle += 1) {
		const h = hourAngle * DEGREE
		const geometricAltitude = Math.asin(clip(Math.sin(phi) * Math.sin(dec) +
			Math.cos(phi) * Math.cos(dec) * Math.cos(h), -1, 1)) / DEGREE
		const altitude = conditions.refraction ? apparentAltitude(
			geometricAltitude, conditions.temperature, conditions.pressure) : geometricAltitude
		if(altitude < minimumAltitude || altitude > 90) {drawing = false; continue}
		const east = -Math.cos(dec) * Math.sin(h)
		const north = Math.cos(phi) * Math.sin(dec) -
			Math.sin(phi) * Math.cos(dec) * Math.cos(h)
		const azimuth = mod(Math.atan2(east, north) / DEGREE, 360)
		const point = screenPoint(azimuth, altitude)
		if(drawing) starPath.lineTo(point[0], point[1])
		else {starPath.moveTo(point[0], point[1]); drawing = true}}
	const risingAndSetting = [conditions.rising, mod(360 - conditions.rising, 360)]
	ctx.fillStyle = "rgba(255, 255, 255, 0.25)"
	for(const azimuth of risingAndSetting) {
		ctx.beginPath(); ctx.moveTo(cx, cy)
		for(let i = 0; i <= 32; i++) {
			const point = screenPoint(azimuth - conditions.uncertainty +
				2 * conditions.uncertainty * i / 32, minimumAltitude)
			ctx.lineTo(point[0], point[1])}
		ctx.closePath(); ctx.fill()}
	ctx.strokeStyle = "white"
	ctx.lineWidth = 1
	ctx.lineCap = "round"
	ctx.setLineDash([1, 4])
	for(const azimuth of risingAndSetting.map(value => mod(180 - value, 360))) {
		const point = screenPoint(azimuth, minimumAltitude)
		ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(point[0], point[1]); ctx.stroke()}
	ctx.setLineDash([])
	ctx.lineCap = "butt"
	ctx.lineWidth = 1.5
	function drawLine(point) {
		ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(point[0], point[1]); ctx.stroke()}
	for(const azimuth of risingAndSetting)
		drawLine(screenPoint(azimuth, minimumAltitude))
	ctx.lineJoin = "round"
	ctx.strokeStyle = "black"
	ctx.lineWidth = 5
	ctx.stroke(starPath)
	ctx.strokeStyle = starColor
	ctx.lineWidth = 2.5
	ctx.stroke(starPath)
	ctx.lineJoin = "round"
	for(const azimuth of risingAndSetting) {
		const point = screenPoint(azimuth, conditions.horizon)
		ctx.beginPath()
		for(let i = 0; i < 10; i++) {
			const angle = -Math.PI / 2 + i * Math.PI / 5
			const markerRadius = i % 2 ? 2.25 : 4.5
			const x = point[0] + markerRadius * Math.cos(angle)
			const y = point[1] + markerRadius * Math.sin(angle)
			if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)}
		ctx.closePath()
		ctx.strokeStyle = "black"; ctx.lineWidth = 5; ctx.stroke()
		ctx.strokeStyle = starColor; ctx.lineWidth = 2.5; ctx.stroke()}
	ctx.fillStyle = "black"
	ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2 * Math.PI); ctx.fill()
	ctx.fillStyle = color.horizontal
	ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2 * Math.PI); ctx.fill()
	canvas.setAttribute("aria-label", "Visible stellar path derived from rising azimuth " +
		conditions.rising + " degrees and star altitude " + conditions.horizon +
		" degrees at latitude " + conditions.latitude +
		" degrees, with east at the top and north at the left")}

const graphResizeObserver = new ResizeObserver(requestGraphRender)
for(const canvas of [UI.azimuthGraph, UI.naksatraGraph, UI.risingSettingGraph])
	graphResizeObserver.observe(canvas)
for(const panel of document.querySelectorAll(".graphPanel")) {
	const toggleButtons = [...panel.querySelectorAll(".graphToggleButton")]
	const graphName = panel.getAttribute("aria-label") || "graph"
	function setCollapsed(collapsed) {
		panel.classList.toggle("collapsed", collapsed)
		for(const button of toggleButtons) {
			button.textContent = collapsed ? "▼" : "▲"
			button.setAttribute("aria-expanded", String(!collapsed))
			button.setAttribute("aria-label", (collapsed ? "Show " : "Hide ") + graphName)
			button.title = collapsed ? "Show Graph" : "Hide Graph"}
		if(!collapsed) requestGraphRender()}
	for(const button of toggleButtons) button.title = "Hide Graph"
	for(const button of toggleButtons) button.onclick = event => {
		event.stopPropagation()
		setCollapsed(!panel.classList.contains("collapsed"))}
	let startY = 0
	let startScrollY = 0
	panel.addEventListener("pointerdown", event => {
		if(event.button !== 0 || event.target.closest(".graphToggleButton")) return
		startY = event.clientY
		startScrollY = window.scrollY
		panel.classList.add("dragging")
		panel.setPointerCapture(event.pointerId)})
	panel.addEventListener("pointermove", event => {
		if(!panel.hasPointerCapture(event.pointerId)) return
		event.preventDefault()
		window.scrollTo({top: startScrollY - event.clientY + startY})})
	function stopGraphDrag(event) {
		if(panel.hasPointerCapture(event.pointerId)) panel.releasePointerCapture(event.pointerId)
		panel.classList.remove("dragging")}
	panel.addEventListener("pointerup", stopGraphDrag)
	panel.addEventListener("pointercancel", stopGraphDrag)}
