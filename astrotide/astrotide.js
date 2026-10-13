const astrotideDisplay = {}
const astrotideExpandedModelCache = new WeakMap()

function readNumericInput(value, fallback) {
	const input = value && typeof value === "object" && "value" in value ? value : null
	const parse = text => {
		const normalized = String(text ?? "").trim().replace(/−/g, "-").replace(/,/g, "")
		return normalized === "" ? NaN : Number(normalized)}
	let number = parse(input ? input.value : value)
	if(!Number.isFinite(number)) {
		if(fallback === undefined && input) fallback = input.nudgeFallback
		number = parse(fallback)}
	return Number.isFinite(number) ? number : NaN}

function attachNumericNudging(input, nudge, commit = null) {
	function remember() {input.nudgeFallback = input.value}
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

function astrotideCubicBSplineBasis(lagCount, basisCount) {
	const degree = 3
	if(basisCount <= degree) throw new Error("Cubic B-splines need at least four controls")
	const interiorCount = basisCount - degree - 1
	const knots = [0, 0, 0, 0]
	for(let index = 1; index <= interiorCount; ++index)
		knots.push(index / (interiorCount + 1))
	knots.push(1, 1, 1, 1)
	const x = new Float64Array(lagCount)
	for(let row = 0; row < lagCount; ++row) x[row] = row / (lagCount - 1)
	let columns = knots.length - 1
	let basis = new Float64Array(lagCount * columns)
	for(let row = 0; row < lagCount; ++row)
		for(let column = 0; column < columns; ++column)
			basis[row * columns + column] =
				x[row] >= knots[column] && x[row] < knots[column + 1] ? 1 : 0
	for(let order = 1; order <= degree; ++order) {
		const nextColumns = knots.length - order - 1
		const next = new Float64Array(lagCount * nextColumns)
		for(let row = 0; row < lagCount; ++row) for(let column = 0; column < nextColumns; ++column) {
			const leftWidth = knots[column + order] - knots[column]
			const rightWidth = knots[column + order + 1] - knots[column + 1]
			if(leftWidth > 0) next[row * nextColumns + column] +=
				(x[row] - knots[column]) / leftWidth * basis[row * columns + column]
			if(rightWidth > 0) next[row * nextColumns + column] +=
				(knots[column + order + 1] - x[row]) / rightWidth *
				basis[row * columns + column + 1]}
		basis = next
		columns = nextColumns}
	for(let column = 0; column < basisCount; ++column)
		basis[(lagCount - 1) * basisCount + column] = 0
	basis[lagCount * basisCount - 1] = 1
	return basis}

function expandAstrotidePredictionModel(model) {
	const cached = astrotideExpandedModelCache.get(model)
	if(cached) return cached
	const prediction = model.prediction
	const specification = prediction.spline_basis
	if(!specification || specification.degree !== 3 ||
		specification.knot_spacing !== "uniform_clamped")
		throw new Error("Unsupported astrotide spline basis")
	const controls = []
	for(const name of prediction.directional_basis)
		controls.push(prediction.r_control_coefficients_by_basis[name])
	for(const name of prediction.directional_basis)
		controls.push(prediction.r2_control_coefficients_by_basis[name])
	controls.push(prediction.ghi_control_coefficients)
	controls.push(prediction.ghi2_control_coefficients)
	const basisCount = specification.basis_count
	const lagCount = specification.lag_count
	function expandWeights(targetLagCount, scale = 1) {
		const basis = astrotideCubicBSplineBasis(targetLagCount, basisCount)
		const expandedWeights = new Float32Array(controls.length * targetLagCount)
		for(let predictor = 0; predictor < controls.length; ++predictor) {
			if(controls[predictor].length !== basisCount)
				throw new Error("Invalid spline-control count")
			for(let lag = 0; lag < targetLagCount; ++lag) {
				let weight = 0
				for(let control = 0; control < basisCount; ++control)
					weight += basis[lag * basisCount + control] * controls[predictor][control]
				expandedWeights[predictor * targetLagCount + lag] = weight * scale}}
		return expandedWeights}
	const weights = expandWeights(lagCount)
	const runtimeLagStepTicks = Math.round(prediction.lag_interval_hours * 4)
	if(!Number.isInteger(runtimeLagStepTicks) || runtimeLagStepTicks < 1)
		throw new Error("Invalid prediction lag interval")
	const runtimeLagCount = lagCount
	const runtimeWeights = weights
	const expanded = {weights, predictorCount: controls.length, lagCount,
		runtimeWeights, runtimeLagCount, runtimeLagStepTicks}
	astrotideExpandedModelCache.set(model, expanded)
	return expanded}

const astrotideModelScriptState = {
	plusCode: null, script: null, model: null, loading: false, error: null,
}

function unloadAstrotidePredictionModel() {
	astrotideModelScriptState.script?.remove()
	astrotideModelScriptState.plusCode = null
	astrotideModelScriptState.script = null
	astrotideModelScriptState.model = null
	astrotideModelScriptState.loading = false
	astrotideModelScriptState.error = null
	astrotideDisplay.seaLevelPredictionCaches?.clear()}

function registerAstrotideModel(plusCode, model) {
	if(plusCode !== astrotideModelScriptState.plusCode) return
	try {
		astrotideModelScriptState.model = {
			model, ...expandAstrotidePredictionModel(model),
		}
		astrotideModelScriptState.error = null
	} catch(error) {
		astrotideModelScriptState.model = null
		astrotideModelScriptState.error = error
		console.error(error)
	}
	astrotideModelScriptState.loading = false
	requestAstrotideRender()}

function loadAstrotidePredictionModel(plusCode) {
	if(astrotideModelScriptState.plusCode === plusCode)
		return astrotideModelScriptState.model
	unloadAstrotidePredictionModel()
	astrotideModelScriptState.plusCode = plusCode
	astrotideModelScriptState.loading = true
	const script = document.createElement("script")
	script.async = true
	script.src = "astrotide/models/" + encodeURIComponent(plusCode) + ".js"
	script.onerror = () => {
		if(astrotideModelScriptState.script !== script) return
		astrotideModelScriptState.loading = false
		astrotideModelScriptState.error = new Error(`Unable to load model: ${plusCode}`)
		console.error(astrotideModelScriptState.error)
		requestAstrotideRender()}
	astrotideModelScriptState.script = script
	document.head.append(script)
	return null}

function astrotidePredictAt(expandedModel, forcingRecords, outputTick) {
	const {model, predictorCount, runtimeWeights: weights,
		runtimeLagCount: lagCount, runtimeLagStepTicks} = expandedModel
	if(predictorCount !== 20)
		throw new Error("Unsupported astrotide predictor layout")
	const series = new Float32Array(predictorCount * lagCount)
	for(let lag = 0; lag < lagCount; ++lag) {
		const forcing = forcingRecords.get(
			outputTick - (lagCount - 1 - lag) * runtimeLagStepTicks)
		if(!forcing) throw new Error("Missing astronomical forcing for prediction lag")
		const east = forcing.east, north = forcing.north, up = forcing.vertical
		const magnitude2 = east * east + north * north + up * up
		const magnitude = Math.sqrt(magnitude2)
		const divide = value => magnitude > 0 ? value / magnitude : 0
		const directional = [1, divide(east), divide(north), divide(up),
			divide(east * north), divide(east * up), divide(north * up),
			divide(east * east - north * north), divide(up * up)]
		const predictors = [
			magnitude, east, north, up, directional[4], directional[5], directional[6],
			directional[7], directional[8],
			magnitude2, magnitude * east, magnitude * north, magnitude * up,
			east * north, east * up, north * up, east * east - north * north, up * up,
			forcing.ghi, forcing.ghi * forcing.ghi]
		for(let predictor = 0; predictor < predictorCount; ++predictor)
			series[predictor * lagCount + lag] = predictors[predictor]}
	let prediction = Math.fround(0)
	for(let predictor = 0; predictor < predictorCount; ++predictor)
		for(let lag = 0; lag < lagCount; ++lag)
			prediction = Math.fround(prediction + Math.fround(
				series[predictor * lagCount + lag] * weights[predictor * lagCount + lag]))
	return prediction}

globalThis.expandAstrotidePredictionModel = expandAstrotidePredictionModel
globalThis.loadAstrotidePredictionModel = loadAstrotidePredictionModel
globalThis.registerAstrotideModel = registerAstrotideModel
globalThis.astrotidePredictAt = astrotidePredictAt

document.getElementById("copyrightYear").textContent = new Date().getUTCFullYear()
const forcingMapPanel = document.querySelector(".forcingMapGroup")
function syncStationPanelHeight() {
	document.querySelector(".stationGroup").style.height =
		forcingMapPanel.getBoundingClientRect().height + "px"}
new ResizeObserver(syncStationPanelHeight).observe(forcingMapPanel)
syncStationPanelHeight()

function setGraphPanelCollapsed(panel, collapsed) {
	if(!panel) return
	const graphName = panel.getAttribute("aria-label") || "graph"
	panel.classList.toggle("collapsed", collapsed)
	for(const button of panel.querySelectorAll(".graphToggleButton")) {
		button.textContent = collapsed ? "▼" : "▲"
		button.setAttribute("aria-expanded", String(!collapsed))
		button.setAttribute("aria-label", (collapsed ? "Show " : "Hide ") + graphName)
		button.title = collapsed ? "Show Graph" : "Hide Graph"}
	if(!collapsed) requestAstrotideRender()}

function selectStationRow(row) {
	for(const option of document.querySelectorAll(".stationOption")) {
		const selected = option === row
		option.classList.toggle("selected", selected)
		option.setAttribute("aria-checked", String(selected))}
	const group = document.querySelector(".stationGroup")
	group.dataset.plusCode = row.dataset.plusCode
	applyStationCoordinates(Number(row.dataset.lat), Number(row.dataset.lon))
	requestAnimationFrame(() => {
		const scroller = document.querySelector(".stationScroller")
		const rowBox = row.getBoundingClientRect(), scrollerBox = scroller.getBoundingClientRect()
		scroller.scrollTop += rowBox.top + rowBox.height / 2 -
			(scrollerBox.top + scrollerBox.height / 2)})}

let nearestStationSelectionTimer = 0
function coordinatesMatchSelectedStation(latitude, longitude) {
	const selected = document.querySelector(".stationOption.selected")
	const displayed = value => Math.round(Number(value) * 100)
	return selected && displayed(selected.dataset.lat) === displayed(latitude) &&
		displayed(selected.dataset.lon) === displayed(longitude)}
function selectNearestStation(latitude, longitude) {
	if(coordinatesMatchSelectedStation(latitude, longitude)) return
	const rows = [...document.querySelectorAll(".stationOption")]
	if(!rows.length) return
	const latitudeRadians = latitude * Math.PI / 180
	let nearest = null, nearestAngle = Infinity
	for(const row of rows) {
		const stationLatitude = Number(row.dataset.lat) * Math.PI / 180
		const longitudeDifference = (Number(row.dataset.lon) - longitude) * Math.PI / 180
		const angle = Math.acos(Math.max(-1, Math.min(1,
			Math.sin(latitudeRadians) * Math.sin(stationLatitude) +
			Math.cos(latitudeRadians) * Math.cos(stationLatitude) * Math.cos(longitudeDifference))))
		if(angle < nearestAngle) {nearest = row; nearestAngle = angle}}
	if(!nearest) return
	const stationName = nearest.cells[2].textContent.trim()
	const adm1 = nearest.cells[1].textContent.trim()
	const country = nearest.cells[0].textContent.trim()
	alert("No Sea Level Data are Available at This Location.\n" +
		"Selecting the Nearest Station: " + [stationName, adm1, country]
			.filter(value => value && value !== "—").join(", ") + ".")
	selectStationRow(nearest)}

function scheduleNearestStationSelection() {
	clearTimeout(nearestStationSelectionTimer)
	if(coordinatesMatchSelectedStation(param.latitude, param.longitude)) return
	nearestStationSelectionTimer = setTimeout(() =>
		selectNearestStation(param.latitude, param.longitude), 0)}

function escapeStationHtml(value) {
	return String(value).replace(/[&<>"']/g, character => ({
		"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
	})[character])}

function setupStationSelection() {
	const stationList = document.getElementById("stationList")
	const metadata = globalThis.ASTROTIDE_METADATA
	if(!metadata || !Array.isArray(metadata.columns) || !Array.isArray(metadata.rows)) {
		stationList.innerHTML = '<tr><td class="stationStatus" colspan="4">Station metadata could not be loaded.</td></tr>'
		return}
	const column = Object.fromEntries(metadata.columns.map((header, index) => [header, index]))
	for(const required of ["country", "adm1", "station_name", "source",
		"plus_code", "lat", "lon"]) {
		if(column[required] === undefined) {
			stationList.innerHTML = `<tr><td class="stationStatus" colspan="4">Missing metadata column: ${required}</td></tr>`
			return}}
	const stationCollator = new Intl.Collator("en", {numeric: true, sensitivity: "base"})
	const thailandAdm1Order = new Map([
		"Trat", "Chanthaburi", "Rayong", "Chonburi", "Chachoengsao", "Samut Prakan",
		"Bangkok", "Samut Sakhon", "Samut Songkhram", "Phetchaburi",
		"Prachuap Khiri Khan", "Chumphon", "Surat Thani", "Nakhon Si Thammarat",
		"Phatthalung", "Songkhla", "Pattani", "Narathiwat", "Ranong", "Phuket",
		"Phang Nga", "Krabi", "Trang", "Satun",
	].map((adm1, index) => [adm1, index]))
	const ordered = metadata.rows.slice().sort((left, right) => {
		const leftCountry = left[column.country], rightCountry = right[column.country]
		if(leftCountry === "Thailand" && rightCountry !== "Thailand") return -1
		if(rightCountry === "Thailand" && leftCountry !== "Thailand") return 1
		const countryOrder = stationCollator.compare(leftCountry, rightCountry)
		if(countryOrder) return countryOrder
		const leftDart = left[column.source] === "DART"
		const rightDart = right[column.source] === "DART"
		if(leftDart !== rightDart) return leftDart ? 1 : -1
		if(leftCountry === "Thailand") {
			const leftAdm1 = left[column.adm1], rightAdm1 = right[column.adm1]
			const leftOrder = thailandAdm1Order.get(leftAdm1) ?? Number.MAX_SAFE_INTEGER
			const rightOrder = thailandAdm1Order.get(rightAdm1) ?? Number.MAX_SAFE_INTEGER
			return leftOrder - rightOrder ||
				(leftOrder === Number.MAX_SAFE_INTEGER ? stationCollator.compare(leftAdm1, rightAdm1) : 0)}
		return stationCollator.compare(left[column.adm1], right[column.adm1])})
	stationList.innerHTML = ordered.map(values => {
		const country = escapeStationHtml(values[column.country])
		const province = escapeStationHtml(values[column.adm1])
		const station = escapeStationHtml(values[column.station_name])
		const source = escapeStationHtml(values[column.source])
		const plusCode = escapeStationHtml(values[column.plus_code])
		const latitude = escapeStationHtml(values[column.lat])
		const longitude = escapeStationHtml(values[column.lon])
		return `<tr class="stationOption" tabindex="0" role="radio" aria-checked="false" ` +
			`data-plus-code="${plusCode}" data-lat="${latitude}" data-lon="${longitude}">` +
			`<td title="${country}">${country}</td>` +
			`<td title="${province}">${province}</td>` +
			`<td title="${station}">${station}</td>` +
			`<td title="${source}">${source}</td></tr>`}).join("")
	const rows = [...stationList.rows]
	const countryColors = new Map([
		["Australia", "#00cfff"],
		["Bangladesh", "#7ee787"],
		["China", "#ff4040"],
		["India", "#ff8c00"],
		["Indonesia", "#ff66cc"],
		["Int'l Waters", "#b8b8b8"],
		["Japan", "#ff85a1"],
		["Malaysia", "#00d6a3"],
		["Maldives", "#5aa9ff"],
		["Micronesia", "#b388ff"],
		["Myanmar", "#45d35a"],
		["Palau", "#42e5e8"],
		["Philippines", "#4f7cff"],
		["Singapore", "#d96cff"],
		["Taiwan", "#f48fb1"],
		["Thailand", "#ffd700"],
		["UK", "#9fa8da"],
		["Vietnam", "#8bd3c7"],
	])
	for(const [index, row] of rows.entries()) {
		row.dataset.stationIndex = index
		row.style.color = countryColors.get(row.cells[0].textContent) || "white"}
	stationList.onclick = event => {
		const row = event.target.closest(".stationOption")
		if(row) selectStationRow(row)}
	stationList.onkeydown = event => {
		if(event.key === "Enter" || event.key === " ") {
			const row = event.target.closest(".stationOption")
			if(row) {event.preventDefault(); selectStationRow(row)}}}
	const defaultRow = rows.find(row => row.dataset.plusCode === "6MXX2W78") || rows[0]
	if(defaultRow) {
		selectStationRow(defaultRow)
		const widths = [...defaultRow.cells].map(cell => cell.getBoundingClientRect().width)
		const header = document.querySelector(".stationHeader")
		const headerTable = document.querySelector(".stationHeaderTable")
		const scroller = document.querySelector(".stationScroller")
		const gutter = Math.max(0, scroller.offsetWidth - scroller.clientWidth) + "px"
		header.style.paddingRight = gutter
		headerTable.querySelectorAll("col").forEach((column, index) => {
			column.style.width = widths[index] + "px"})
		const tableWidth = widths.reduce((sum, width) => sum + width, 0) + "px"
		headerTable.style.width = tableWidth}}

queueMicrotask(() => {setupStationSelection()})
const astrotideUI = new Proxy({}, {get(object, id) {
	return document.getElementById("page" + id[0].toUpperCase() + id.slice(1)) || UI[id]}})
function setupCoordinateInput(id, limit, wrap, minimum = -limit, onCommit = null) {
	const input = astrotideUI[id]
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
		requestAstrotideRender()}
	function nudge(direction, coarse) {
		let value = readNumericInput(input.value)
		if(!Number.isFinite(value)) value = readNumericInput(fallback)
		const step = coarse ? 1 : 0.01
		value = Math.round(value / step) * step + direction * step
		value = Math.max(minimum, Math.min(limit, value))
		commit(value)}
	input.onfocus = () => {fallback = input.value}
	function commitInput() {
		let value = readNumericInput(input.value)
		if(!Number.isFinite(value) || value < minimum || value > limit) {
			alert("Please enter a valid " + label + " from " +
				(minimum < 0 ? "−" + Math.abs(minimum) : minimum) + "° to +" + limit + "°.")
			input.value = fallback
			input.select()}
		else commit(value)}
	attachNumericNudging(input, nudge, commitInput)}

function setupNumericInput(input, parse, valid, format, error, adjust, coarseStep = null) {
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
		requestAstrotideRender()}
	function nudge(direction, coarse) {
		let value = parse(input.value)
		if(!Number.isFinite(value)) value = parse(committed)
		input.value = String(coarse && coarseStep ?
			adjust(Math.round(value / coarseStep) * coarseStep, direction * coarseStep) :
			adjust(value, direction))
		commit()}
	attachNumericNudging(input, nudge, commit)}

setupCoordinateInput("latitudeInput", 90, false, -90, latitude => {
	param.latitude = latitude
	scheduleNearestStationSelection()})
function formatTwoDigitTimeZone(timeZone) {
	if(timeZone === 0) return "UTC"
	return "UTC" + (timeZone >= 0 ? "+" : "−") +
		String(Math.abs(timeZone)).padStart(2, "0")}
function formatStationCoordinate(value, longitude = false) {
	const rounded = Math.round(value * 100) / 100
	if(longitude && Math.abs(Math.abs(rounded) - 180) < 0.005) return "180.00"
	if(rounded === 0) return "0.00"
	return (rounded > 0 ? "+" : "−") + Math.abs(rounded).toFixed(2)}
function applyStationCoordinates(latitude, longitude) {
	astrotideUI.latitudeInput.value = formatStationCoordinate(latitude)
	astrotideUI.longitudeInput.value = formatStationCoordinate(longitude, true)
	param.latitude = latitude
	param.longitude = longitude
	param.timeZone = Math.round(longitude / 15)
	param.julianDay = getJulianDay()
	if(astrotideUI.timeZoneInput) astrotideUI.timeZoneInput.textContent = formatTwoDigitTimeZone(param.timeZone)
	if(astrotideUI.dayOfWeekValue)
		astrotideUI.dayOfWeekValue.textContent = getDayOfWeek(param.julianDay, param.timeZone)
	requestAstrotideRender()}
setupCoordinateInput("longitudeInput", 180, true, -180, longitude => {
	param.longitude = longitude
	param.timeZone = Math.round(longitude / 15)
	param.julianDay = getJulianDay()
	if(astrotideUI.timeZoneInput) astrotideUI.timeZoneInput.textContent = formatTwoDigitTimeZone(param.timeZone)
	if(astrotideUI.dayOfWeekValue)
		astrotideUI.dayOfWeekValue.textContent = getDayOfWeek(param.julianDay, param.timeZone)
	scheduleNearestStationSelection()})
setupNumericInput(astrotideUI.elevationInput, readNumericInput, value => value >= 0 && value <= 10000,
	value => Math.round(value).toLocaleString("en-US"),
	"Please enter a valid elevation from 0 m to 10,000 m.",
	(value, step) => Math.max(0, Math.min(10000, Math.round(value) + step)), 100)
if(document.getElementById("hereButton")) UI.hereButton.onclick = () => getCurrentLocation()
	.then(location => {
		Object.assign(param, location)
		astrotideUI.latitudeInput.value = param.latitude
		astrotideUI.longitudeInput.value = param.longitude
		astrotideUI.latitudeInput.dispatchEvent(new Event("change"))
		astrotideUI.longitudeInput.dispatchEvent(new Event("change"))
		param.elevation = 0
		astrotideUI.elevationInput.value = 0
		astrotideUI.elevationInput.dispatchEvent(new Event("change"))})
	.catch(error => alert(error.message))
if(document.getElementById("nowButton")) {
	const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
		"Oct", "Nov", "Dec"]
	function updateCalendarFields() {
		const [hour, minute] = toDMS(param.time / 15, 24)
		astrotideUI[param.year > 0 ? "eraAD" : "eraBC"].checked = true
		astrotideUI.yearInput.value = param.year > 0 ? param.year : Math.abs(param.year - 1)
		astrotideUI.monthInput.value = param.month
		astrotideUI.dayInput.value = param.day
		if(astrotideUI.dayOfWeekValue)
			astrotideUI.dayOfWeekValue.textContent = getDayOfWeek(param.julianDay, param.timeZone)
		astrotideUI.hourInput.value = String(hour).padStart(2, "0")
		astrotideUI.minuteInput.value = String(minute).padStart(2, "0")
		astrotideUI.timeZoneInput.textContent = formatTwoDigitTimeZone(param.timeZone)}
	function commitCalendar() {
		param.julianDay = getJulianDay()
		updateCalendarFields()
		requestAstrotideRender()}
	function setCalendarJulianDay(julianDay) {
		param.julianDay = julianDay
		const [year, month, day, time] = getGregorian(julianDay, param.longitude)
		param.year = year
		param.month = month
		param.day = day
		param.time = time
		updateCalendarFields()
		requestAstrotideRender()}
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
	UI.nowButton.onclick = () => {
		Object.assign(param, getCurrentDateTime(param.timeZone))
		param.julianDay = getJulianDay()
		updateCalendarFields()
		requestAstrotideRender()}
	for(const input of [astrotideUI.eraAD, astrotideUI.eraBC]) input.onchange = () => {
		const year = Math.round(readNumericInput(astrotideUI.yearInput))
		if(!input.checked || !Number.isFinite(year) || year < 1 || year > 5000) return
		param.year = astrotideUI.eraBC.checked ? 1 - year : year
		commitCalendar()}
	astrotideUI.yearInput.onchange = () => {
		const year = Math.round(readNumericInput(astrotideUI.yearInput, ""))
		if(!Number.isFinite(year) || year < 1 || year > 5000) {
			alert("Please enter a valid year number from 1 to 5000.")
			updateCalendarFields(); astrotideUI.yearInput.select(); return}
		param.year = astrotideUI.eraBC.checked ? 1 - year : year
		commitCalendar()}
	attachNumericNudging(astrotideUI.yearInput, direction => changeYear(direction))
	astrotideUI.monthInput.onchange = () => {
		const month = Math.round(readNumericInput(astrotideUI.monthInput, ""))
		if(!Number.isFinite(month) || month < 1 || month > 12) {
			alert("Please enter a valid month number from 1 to 12.")
			updateCalendarFields(); astrotideUI.monthInput.select(); return}
		param.month = month
		commitCalendar()}
	attachNumericNudging(astrotideUI.monthInput, direction => changeMonth(direction))
	astrotideUI.dayInput.onchange = () => {
		const day = Math.round(readNumericInput(astrotideUI.dayInput, ""))
		const maximum = getMonthDays(getYearDays(param.year))[param.month - 1]
		if(!Number.isFinite(day) || day < 1 || day > maximum) {
			alert("Please enter a valid day number."); updateCalendarFields(); astrotideUI.dayInput.select(); return}
		param.day = day
		commitCalendar()}
	attachNumericNudging(astrotideUI.dayInput, direction =>
		setCalendarJulianDay(Math.round((getJulianDay() + direction) * 1440) / 1440))
	astrotideUI.hourInput.onchange = () => {
		const hour = Math.round(readNumericInput(astrotideUI.hourInput, ""))
		if(!Number.isFinite(hour) || hour < 0 || hour > 23) {
			alert("Please enter a valid hour number from 0 to 23.")
			updateCalendarFields(); astrotideUI.hourInput.select(); return}
		param.time = 15 * (hour + readNumericInput(astrotideUI.minuteInput) / 60)
		commitCalendar()}
	attachNumericNudging(astrotideUI.hourInput, direction =>
		setCalendarJulianDay(Math.round((getJulianDay() + direction / 24) * 1440) / 1440))
	astrotideUI.minuteInput.onchange = () => {
		const minute = Math.round(readNumericInput(astrotideUI.minuteInput, ""))
		if(!Number.isFinite(minute) || minute < 0 || minute > 59) {
			alert("Please enter a valid minute number from 0 to 59.")
			updateCalendarFields(); astrotideUI.minuteInput.select(); return}
		param.time = 15 * (Math.floor(param.time / 15) + minute / 60)
		commitCalendar()}
	attachNumericNudging(astrotideUI.minuteInput, direction =>
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
const NOMINAL_SOLAR_IRRADIANCE = 1361
const SOLAR_IRRADIANCE_CONTOURS = [250, 500, 750, 1000, 1250, 1500]
const BODY_GM_KM3_S2 = {
	sun: 1.32712440041279419e11, moon: 4902.800118,
	mercury: 22031.868551, venus: 324858.592000, mars: 42828.375816,
	jupiter: 126712764.100000, saturn: 37940584.841800,
	uranus: 5794556.400000, neptune: 6836527.100580}
const TIDAL_ACCELERATION_CONTOURS = Array.from({length: 7}, (_, index) => (index - 3) * 50)
const MAP_CONTOUR_LINE_WIDTH = 0.8
const MAP_POSITIVE_CONTOUR_LINE_WIDTH = 0.8
const MAP_ZERO_CONTOUR_LINE_WIDTH = 2
for(const checkbox of [UI.verticalTidalAccelerationCheckbox, UI.solarIrradianceCheckbox])
	if(checkbox) checkbox.onchange = () => requestAstrotideRender()

function topOfAtmosphereSolarIrradiance(localZenith, sunDirection, sunDistanceAU) {
	return NOMINAL_SOLAR_IRRADIANCE / (sunDistanceAU * sunDistanceAU) *
		Math.max(0, vdot(localZenith, sunDirection))}

function standardAtmospherePressure(elevationMeters) {
	return 1013.25 * Math.pow(Math.max(0, 1 - 2.25577e-5 * elevationMeters), 5.25588)}

function clearSkyGlobalHorizontalIrradiance(localZenith, sunDirection, sunDistanceAU,
	elevationMeters = 0, directTransmittance = 0.75, diffuseRecovery = 0.15) {
	const sineGeometricAltitude = clip(vdot(localZenith, sunDirection), -1, 1)
	const geometricAltitude = Math.asin(sineGeometricAltitude) / DEGREE
	if(geometricAltitude <= 0) return 0
	const pressure = standardAtmospherePressure(elevationMeters)
	const apparent = apparentAltitude(geometricAltitude, 15, pressure)
	if(apparent <= 0) return 0
	const sineAltitude = Math.sin(apparent * DEGREE)
	const relativeAirMass = 1 / (sineAltitude +
		0.50572 * Math.pow(6.07995 + apparent, -1.6364))
	const absoluteAirMass = relativeAirMass * pressure / 1013.25
	const beamTransmission = Math.pow(directTransmittance, absoluteAirMass)
	const extraterrestrialNormal = NOMINAL_SOLAR_IRRADIANCE /
		(sunDistanceAU * sunDistanceAU)
	return extraterrestrialNormal * sineAltitude *
		(beamTransmission + diffuseRecovery * (1 - beamTransmission))}

function geodeticSurfacePosition(latitude, longitude) {
	const phi = latitude * DEGREE, lambda = longitude * DEGREE
	const sinPhi = Math.sin(phi), cosPhi = Math.cos(phi)
	const primeVerticalRadius = EARTH_A / Math.sqrt(1 - EARTH_E2 * sinPhi * sinPhi)
	return [primeVerticalRadius * cosPhi * Math.cos(lambda),
		primeVerticalRadius * cosPhi * Math.sin(lambda),
		primeVerticalRadius * (1 - EARTH_E2) * sinPhi]}

function verticalGeneralTidalAcceleration(surfacePositionKm, localZenith, bodies) {
	let verticalAccelerationKmS2 = 0
	for(const body of bodies) {
		const centerToBody = body.positionKm
		const surfaceToBody = translate(centerToBody, negate(surfacePositionKm))
		const centerDistance = Math.hypot(...centerToBody)
		const surfaceDistance = Math.hypot(...surfaceToBody)
		const differentialAcceleration = translate(
			scale(surfaceToBody, body.gm / surfaceDistance ** 3),
			negate(scale(centerToBody, body.gm / centerDistance ** 3)))
		verticalAccelerationKmS2 += vdot(differentialAcceleration, localZenith)}
	return verticalAccelerationKmS2 * 1e11}
function currentAstrotideConditions() {
	const conditions = {
		latitude: readNumericInput(astrotideUI.latitudeInput.value),
		longitude: readNumericInput(astrotideUI.longitudeInput.value),
		elevation: readNumericInput(astrotideUI.elevationInput.value),
	}
	if(!Number.isFinite(conditions.latitude) || !Number.isFinite(conditions.longitude) ||
		!Number.isFinite(conditions.elevation) || Math.abs(conditions.latitude) > 90 ||
		Math.abs(conditions.longitude) > 180 || conditions.elevation < 0 ||
		conditions.elevation > 10000) return astrotideDisplay.conditions || null
	astrotideDisplay.conditions = conditions
	return conditions}

function requestAstrotideRender() {
	if(astrotideDisplay.pending) return
	astrotideDisplay.pending = true
	requestAnimationFrame(() => {
		astrotideDisplay.pending = false
		const conditions = currentAstrotideConditions()
		if(!conditions) {
			drawSeaLevelGraph(null)
			drawForcingTimeSeriesGraph(null)
			return}
		drawWorldMapPreview(conditions)
		drawSeaLevelGraph(conditions)
		drawForcingTimeSeriesGraph(conditions)})}
function drawScalarFieldContours(ctx, valueAt, levels, options = {}) {
	const width = options.width ?? 360, height = options.height ?? 180
	const columns = options.columns ?? 72, rows = options.rows ?? 36
	const dx = width / columns, dy = height / rows
	const values = Array.from({length: rows + 1}, (_, row) =>
		Array.from({length: columns + 1}, (_, column) => valueAt(column * dx, row * dy)))
	const cases = {
		1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]],
		5: [[3, 2], [0, 1]], 6: [[0, 2]], 7: [[3, 2]], 8: [[2, 3]],
		9: [[0, 2]], 10: [[0, 3], [1, 2]], 11: [[1, 2]],
		12: [[1, 3]], 13: [[0, 1]], 14: [[3, 0]]}
	function crossing(edge, x, y, cornerValues, level) {
		const corners = [[x, y], [x + dx, y], [x + dx, y + dy], [x, y + dy]]
		const edgeCorners = [[0, 1], [1, 2], [2, 3], [3, 0]][edge]
		const first = edgeCorners[0], second = edgeCorners[1]
		const denominator = cornerValues[second] - cornerValues[first]
		const fraction = denominator === 0 ? 0.5 :
			clip((level - cornerValues[first]) / denominator, 0, 1)
		return [corners[first][0] + (corners[second][0] - corners[first][0]) * fraction,
			corners[first][1] + (corners[second][1] - corners[first][1]) * fraction]}
	function connectedPolylines(segments) {
		const key = point => point[0].toFixed(6) + "," + point[1].toFixed(6)
		const adjacency = new Map()
		segments.forEach((segment, index) => segment.forEach(point => {
			const pointKey = key(point)
			if(!adjacency.has(pointKey)) adjacency.set(pointKey, [])
			adjacency.get(pointKey).push(index)}))
		const unused = new Set(segments.map((_, index) => index)), polylines = []
		function extend(polyline, atEnd) {
			while(true) {
				const endpoint = atEnd ? polyline[polyline.length - 1] : polyline[0]
				const index = (adjacency.get(key(endpoint)) || []).find(candidate => unused.has(candidate))
				if(index === undefined) return
				unused.delete(index)
				const segment = segments[index]
				const next = key(segment[0]) === key(endpoint) ? segment[1] : segment[0]
				atEnd ? polyline.push(next) : polyline.unshift(next)}}
		while(unused.size) {
			const index = unused.values().next().value
			unused.delete(index)
			const polyline = [segments[index][0], segments[index][1]]
			extend(polyline, true); extend(polyline, false); polylines.push(polyline)}
		return polylines}
	ctx.save()
	for(const level of levels) {
		const levelStyle = options.styleForLevel ? options.styleForLevel(level) : {}
		const strokeStyle = levelStyle.color ?? options.color ?? "white"
		const lineWidth = levelStyle.lineWidth ?? options.lineWidth ?? 1
		ctx.strokeStyle = strokeStyle
		ctx.lineWidth = lineWidth
		ctx.setLineDash(levelStyle.dash ?? options.dash ?? [])
		const segments = []
		for(let row = 0; row < rows; row++) for(let column = 0; column < columns; column++) {
			const cornerValues = [values[row][column], values[row][column + 1],
				values[row + 1][column + 1], values[row + 1][column]]
			const index = cornerValues.reduce((bits, value, corner) =>
				bits | (value > level ? 1 << corner : 0), 0)
			for(const segment of cases[index] || []) {
				const first = crossing(segment[0], column * dx, row * dy, cornerValues, level)
				const second = crossing(segment[1], column * dx, row * dy, cornerValues, level)
				segments.push([first, second])}}
		ctx.beginPath()
		for(const polyline of connectedPolylines(segments)) {
			ctx.moveTo(polyline[0][0], polyline[0][1])
			for(let index = 1; index < polyline.length; index++)
				ctx.lineTo(polyline[index][0], polyline[index][1])}
		if(options.paddingWidth) {
			ctx.strokeStyle = options.paddingColor ?? "white"
			ctx.lineWidth = lineWidth + 2 * options.paddingWidth
			ctx.stroke()
			ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth}
		ctx.stroke()}
	ctx.restore()}

function drawWorldMapPreview(conditions) {
	const canvas = UI.worldMapPreview
	if(!canvas) return
	const rect = canvas.getBoundingClientRect()
	const width = rect.width || 408, height = rect.height || width / 2
	const dpr = window.devicePixelRatio || 1
	canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
	const ctx = canvas.getContext("2d", {alpha: false})
	ctx.setTransform(dpr * width / 360, 0, 0, dpr * height / 180, 0, 0)
	ctx.clearRect(0, 0, 360, 180)
	const latitude = conditions.latitude, longitude = conditions.longitude
	const julianDay = param.julianDay
	if(typeof drawSharedWorldMap === "function")
		drawSharedWorldMap(ctx, {julianDay, latitude, longitude,
			elevation: param.elevation, darkTheme: true, showRahu: false, showLagna: false})
	else {ctx.fillStyle = "black"; ctx.fillRect(0, 0, 360, 180)}
	function line(points, strokeStyle, lineWidth = 1, dash = [], paddingWidth = 0) {
		ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; ctx.setLineDash(dash)
		ctx.beginPath(); points.forEach((point, index) =>
			index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]))
		if(paddingWidth) {
			ctx.strokeStyle = "white"; ctx.lineWidth = lineWidth + 2 * paddingWidth; ctx.stroke()
			ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth}
		ctx.stroke(); ctx.setLineDash([])}
	const jc = (julianDay - 2451545) / 36525
	const ayanamsa = getAyanamsa(jc), obliquity = getObliquity(jc)
	const sidereal = getSidereal(jc, longitude)
	const solarSystemVectors = solarSystem(jc)
	const solarSystemPositions = solarSystemVectors.map(normalize)
	const sunDistanceAU = Math.hypot(...solarSystemVectors[1])
	const equatorialToNirayana = mul(rotateZ(ayanamsa), rotateX(-obliquity))
	const nirayanaToWorld = mul(rotateZ(-getSidereal(jc, 0)), transpose(equatorialToNirayana))
	const sunNormal = mdot(nirayanaToWorld, solarSystemPositions[1])
	const tidalBodies = [
		[0, BODY_GM_KM3_S2.moon], [1, BODY_GM_KM3_S2.sun]
	].map(([index, gm]) => ({gm,
			positionKm: scale(mdot(nirayanaToWorld, solarSystemVectors[index]), KM_PER_AU)}))
	const solarTerminator = []
	for(let x = 0; x <= 360; x++) {
		const lon = (x - 180) * DEGREE, cosine = Math.cos(lon), sine = Math.sin(lon)
		const sunLatitude = Math.atan(-(sunNormal[0] * cosine + sunNormal[1] * sine) / sunNormal[2]) / DEGREE
		solarTerminator.push([x, 90 - sunLatitude])}
	if(UI.verticalTidalAccelerationCheckbox?.checked)
		drawScalarFieldContours(ctx, (x, y) => {
			const mapLongitude = x - 180, mapLatitude = 90 - y
			return verticalGeneralTidalAcceleration(
				geodeticSurfacePosition(mapLatitude, mapLongitude),
			toXYZ(mapLongitude, mapLatitude), tidalBodies)},
			TIDAL_ACCELERATION_CONTOURS, {color: "#70b7ff", lineWidth: MAP_CONTOUR_LINE_WIDTH,
				styleForLevel: level => level < 0 ? {dash: [4, 3]} :
					level === 0 ? {lineWidth: MAP_ZERO_CONTOUR_LINE_WIDTH} :
						{lineWidth: MAP_POSITIVE_CONTOUR_LINE_WIDTH}})
	if(UI.solarIrradianceCheckbox?.checked) {
		line(solarTerminator, "#ff6f6f", MAP_ZERO_CONTOUR_LINE_WIDTH)
		drawScalarFieldContours(ctx, (x, y) => {
			const localZenith = toXYZ(x - 180, 90 - y)
			return clearSkyGlobalHorizontalIrradiance(
				localZenith, sunNormal, sunDistanceAU, conditions.elevation)},
			SOLAR_IRRADIANCE_CONTOURS,
			{color: "#ff6f6f", lineWidth: MAP_POSITIVE_CONTOUR_LINE_WIDTH})}
	}

function prepareGraphCanvas(canvas) {
	const width = canvas.clientWidth, height = canvas.clientHeight
	if(!width || !height) return null
	const dpr = window.devicePixelRatio || 1
	const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(height * dpr)
	if(canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
		canvas.width = pixelWidth
		canvas.height = pixelHeight}
	const ctx = canvas.getContext("2d", {alpha: false})
	ctx.setTransform(1, 0, 0, 1, 0, 0)
	ctx.fillStyle = "black"
	ctx.fillRect(0, 0, pixelWidth, pixelHeight)
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
	return {ctx, width, height}}

function drawVerticalLabel(ctx, text, x, y, color) {
	ctx.save()
	ctx.translate(x, y)
	ctx.rotate(-Math.PI / 2)
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
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

function astronomicalForcingSampler(conditions) {
	const latitude = conditions.latitude, longitude = conditions.longitude
	const surfacePosition = geodeticSurfacePosition(latitude, longitude)
	const localZenith = toXYZ(longitude, latitude)
	const phi = latitude * DEGREE, lambda = longitude * DEGREE
	const localEast = [-Math.sin(lambda), Math.cos(lambda), 0]
	const localNorth = [-Math.sin(phi) * Math.cos(lambda),
		-Math.sin(phi) * Math.sin(lambda), Math.cos(phi)]
	return julianDay => {
		const jc = (julianDay - 2451545) / 36525
		const equatorialToNirayana = mul(rotateZ(getAyanamsa(jc)), rotateX(-getObliquity(jc)))
		const nirayanaToWorld = mul(rotateZ(-getSidereal(jc, 0)), transpose(equatorialToNirayana))
		const geomoon = geoMoon(jc)[0]
		const vectors = [geomoon, GeoSun(jc, geomoon)]
		const bodies = [
			[0, BODY_GM_KM3_S2.moon], [1, BODY_GM_KM3_S2.sun]
		].map(([bodyIndex, gm]) => ({gm,
				positionKm: scale(mdot(nirayanaToWorld, vectors[bodyIndex]), KM_PER_AU)}))
		const sunDirection = normalize(mdot(nirayanaToWorld, vectors[1]))
		const component = direction =>
			verticalGeneralTidalAcceleration(surfacePosition, direction, bodies) * 10
		const vertical = component(localZenith)
		const ghi = clearSkyGlobalHorizontalIrradiance(localZenith, sunDirection,
			Math.hypot(...vectors[1]), conditions.elevation)
		return {julianDay,
			vertical, east: component(localEast), north: component(localNorth), ghi,
			tidal: vertical, irradiance: ghi}}}

function astronomicalForcingRequestIndices(request, samplesPerDay = 96) {
	const stepTicks = request.stepTicks ?? 1
	const phaseTicks = ((request.phaseTicks ?? 0) % stepTicks + stepTicks) % stepTicks
	let firstIndex = Math.ceil(request.start * samplesPerDay - 1e-9)
	const remainder = ((firstIndex - phaseTicks) % stepTicks + stepTicks) % stepTicks
	if(remainder) firstIndex += stepTicks - remainder
	const lastIndex = Math.floor(request.end * samplesPerDay + 1e-9)
	const indices = []
	for(let index = firstIndex; index <= lastIndex; index += stepTicks) indices.push(index)
	return indices}

function updateAstronomicalForcingCache(conditions, requests, cacheName = "prediction") {
	const samplesPerDay = 96
	const key = [conditions.latitude, conditions.longitude, conditions.elevation].join("|")
	if(!astrotideDisplay.astronomicalForcingCaches) astrotideDisplay.astronomicalForcingCaches = new Map()
	const cache = astrotideDisplay.astronomicalForcingCaches.get(cacheName)
	const previous = cache?.key === key ? cache.records : new Map()
	const needed = new Set(requests.flatMap(request => astronomicalForcingRequestIndices(request, samplesPerDay)))
	const sampleAt = astronomicalForcingSampler(conditions)
	const records = new Map()
	for(const index of needed)
		records.set(index, previous.get(index) || sampleAt(index / samplesPerDay))
	astrotideDisplay.astronomicalForcingCaches.set(cacheName, {key, records})
	return {records, sampleAt}}

globalThis.updateAstronomicalForcingCache = updateAstronomicalForcingCache

function selectedSeaLevelModel() {
	const group = document.querySelector(".stationGroup")
	const plusCode = group.dataset.plusCode
	if(!plusCode) return null
	return loadAstrotidePredictionModel(plusCode)}

function seaLevelPredictions(conditions, expandedModel, start, end, stepTicks, cacheSeries,
	forcingRecords = null, phaseTicks = 0) {
	const firstTick = Math.floor((start * 96 - phaseTicks) / stepTicks) * stepTicks + phaseTicks
	const lastTick = Math.ceil((end * 96 - phaseTicks) / stepTicks) * stepTicks + phaseTicks
	const maximumLagTicks = (expandedModel.runtimeLagCount - 1) *
		expandedModel.runtimeLagStepTicks
	const modelConditions = {...conditions, elevation: 0}
	if(!forcingRecords) ({records: forcingRecords} = updateAstronomicalForcingCache(modelConditions, [{
		start: (firstTick - maximumLagTicks) / 96,
		end: lastTick / 96,
		stepTicks,
		phaseTicks: ((firstTick % stepTicks) + stepTicks) % stepTicks}]))
	const key = document.querySelector(".stationGroup").dataset.plusCode + "|" + cacheSeries
	if(!astrotideDisplay.seaLevelPredictionCaches) astrotideDisplay.seaLevelPredictionCaches = new Map()
	const previous = astrotideDisplay.seaLevelPredictionCaches.get(key) || new Map()
	const records = new Map()
	for(let tick = firstTick; tick <= lastTick; tick += stepTicks) {
		let sample = previous.get(tick)
		if(!sample) sample = {julianDay: tick / 96,
			seaLevel: astrotidePredictAt(expandedModel, forcingRecords, tick)}
		records.set(tick, sample)}
	astrotideDisplay.seaLevelPredictionCaches.set(key, records)
	return [...records.values()]}

function smoothSeaLevelCurve(samples) {
	const points = samples.filter(sample => Number.isFinite(sample.seaLevel))
	if(points.length < 2) return null
	const count = points.length, slopes = new Float64Array(count)
	const widths = new Float64Array(count - 1), secants = new Float64Array(count - 1)
	for(let index = 0; index < count - 1; ++index) {
		widths[index] = points[index + 1].julianDay - points[index].julianDay
		secants[index] = (points[index + 1].seaLevel - points[index].seaLevel) / widths[index]}
	if(count === 2) slopes[0] = slopes[1] = secants[0]
	else {
		const extended = new Float64Array(count + 3)
		for(let index = 0; index < count - 1; ++index) extended[index + 2] = secants[index]
		extended[1] = 2 * extended[2] - extended[3]
		extended[0] = 2 * extended[1] - extended[2]
		extended[count + 1] = 2 * extended[count] - extended[count - 1]
		extended[count + 2] = 2 * extended[count + 1] - extended[count]
		for(let index = 0; index < count; ++index) {
			const previousWeight = Math.abs(extended[index + 3] - extended[index + 2])
			const followingWeight = Math.abs(extended[index + 1] - extended[index])
			const weight = previousWeight + followingWeight
			slopes[index] = weight > 1e-14 ?
				(previousWeight * extended[index + 1] +
					followingWeight * extended[index + 2]) / weight :
				(extended[index + 1] + extended[index + 2]) / 2}}
	function segmentAt(julianDay) {
		let low = 0, high = count - 1
		while(low + 1 < high) {
			const middle = (low + high) >> 1
			if(points[middle].julianDay <= julianDay) low = middle
			else high = middle}
		return Math.min(count - 2, Math.max(0, low))}
	function evaluate(julianDay) {
		const index = segmentAt(julianDay), h = widths[index]
		const t = Math.max(0, Math.min(1,
			(julianDay - points[index].julianDay) / h))
		const t2 = t * t, t3 = t2 * t
		return (2 * t3 - 3 * t2 + 1) * points[index].seaLevel +
			(t3 - 2 * t2 + t) * h * slopes[index] +
			(-2 * t3 + 3 * t2) * points[index + 1].seaLevel +
			(t3 - t2) * h * slopes[index + 1]}
	function derivative(julianDay) {
		const index = segmentAt(julianDay), h = widths[index]
		const t = Math.max(0, Math.min(1,
			(julianDay - points[index].julianDay) / h))
		const t2 = t * t
		return ((6 * t2 - 6 * t) * points[index].seaLevel +
			(3 * t2 - 4 * t + 1) * h * slopes[index] +
			(-6 * t2 + 6 * t) * points[index + 1].seaLevel +
			(3 * t2 - 2 * t) * h * slopes[index + 1]) / h}
	const extrema = []
	for(let index = 0; index < count - 1; ++index) {
		const h = widths[index], y0 = points[index].seaLevel, y1 = points[index + 1].seaLevel
		const a = 2 * y0 - 2 * y1 + h * (slopes[index] + slopes[index + 1])
		const b = -3 * y0 + 3 * y1 - h * (2 * slopes[index] + slopes[index + 1])
		const c = h * slopes[index], discriminant = 4 * b * b - 12 * a * c
		const roots = Math.abs(a) < 1e-14 ? (Math.abs(b) < 1e-14 ? [] : [-c / (2 * b)]) :
			(discriminant < 0 ? [] : [(-2 * b + Math.sqrt(discriminant)) / (6 * a),
				(-2 * b - Math.sqrt(discriminant)) / (6 * a)])
		for(const root of roots) if(root > 1e-9 && root < 1 - 1e-9) {
			const julianDay = points[index].julianDay + root * h
			extrema.push({julianDay, seaLevel: evaluate(julianDay),
				type: a * 6 * root + 2 * b < 0 ? "maximum" : "minimum"})}}
	return {evaluate, derivative, extrema}}

function tenDayGraphWindow(julianDay, longitude) {
	const timeZone = Math.round(longitude / 15)
	const localMidnight = Math.floor(julianDay + timeZone / 24 - 0.5) +
		0.5 - timeZone / 24
	return {start: localMidnight - 2, end: localMidnight + 8, timeZone}}

function drawSeaLevelGraph(conditions) {
	const canvas = UI.seaLevelGraph
	const horizontalInset = 90, topInset = 62, bottomInset = 62
	const targetHeight = topInset + bottomInset +
		Math.max(0, canvas.clientWidth - 2 * horizontalInset) / 4
	canvas.style.height = targetHeight + "px"
	const prepared = prepareGraphCanvas(canvas)
	if(!prepared) return
	const {ctx, width, height} = prepared
	const selectedRow = document.querySelector(".stationOption.selected")
	const title = canvas.closest(".graphPanel")?.querySelector(".graphCollapsedLabel")
	if(title) {
		const adm1 = selectedRow.cells[1].textContent.trim()
		const location = [
			selectedRow.cells[2].textContent,
			...(adm1 && adm1 !== "—" ? [adm1] : []),
			selectedRow.cells[0].textContent,
		].join(", ")
		title.textContent = "Predicted Sea Level at " + location + "**"}
	drawGraphTitle(ctx, canvas, width / 2)
	if(!conditions) return
	const center = param.julianDay, longitude = conditions.longitude
	const {start, end, timeZone} = tenDayGraphWindow(center, longitude)
	const expandedModel = selectedSeaLevelModel()
	let samples = []
	if(expandedModel) try {
		samples = seaLevelPredictions(
			conditions, expandedModel, start, end, 4, "hourly")
	} catch(error) {console.error("Unable to draw hourly sea level predictions", error)}
	const curve = smoothSeaLevelCurve(samples)
	const rmseBand = 3 * Number(expandedModel?.model?.prediction?.rmse_cm)
	const bandHalfWidth = Number.isFinite(rmseBand) && rmseBand > 0 ? rmseBand : 0
	const curveSamples = []
	if(curve) for(let tick = Math.ceil(start * 288); tick <= Math.floor(end * 288); ++tick)
		curveSamples.push({julianDay: tick / 288, seaLevel: curve.evaluate(tick / 288)})
	astrotideDisplay.seaLevelExtrema = (curve?.extrema || []).slice().sort(
		(first, second) => first.julianDay - second.julianDay)
	const significantExtrema = astrotideDisplay.seaLevelExtrema.slice()
	for(let changed = true; changed && significantExtrema.length >= 3;) {
		changed = false
		for(let index = 1; index + 1 < significantExtrema.length; ++index) {
			const previous = significantExtrema[index - 1]
			const middle = significantExtrema[index]
			const next = significantExtrema[index + 1]
			if(previous.type !== next.type || previous.type === middle.type) continue
			const keepPrevious = previous.type === "minimum" ?
				previous.seaLevel <= next.seaLevel : previous.seaLevel >= next.seaLevel
			const weaker = keepPrevious ? next : previous
			if(Math.abs(middle.seaLevel - weaker.seaLevel) > 1 &&
				Math.abs(middle.julianDay - weaker.julianDay) >= 1 / 24) continue
			if(keepPrevious) significantExtrema.splice(index, 2)
			else significantExtrema.splice(index - 1, 2)
			changed = true
			break}}
	const visibleExtrema = significantExtrema.filter(extremum =>
		extremum.julianDay >= start && extremum.julianDay <= end)
	const visible = curveSamples.filter(sample =>
		sample.julianDay >= start && sample.julianDay <= end &&
		Number.isFinite(sample.seaLevel))
	const currentSeaLevel = curve ? curve.evaluate(center) : null
	const currentTrend = curve ? curve.derivative(center) / 24 : null
	function niceIntegerStep(value) {
		const minimum = Math.max(1, value)
		const magnitude = 10 ** Math.floor(Math.log10(minimum))
		const normalized = minimum / magnitude
		return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude}
	const left = horizontalInset, right = width - horizontalInset
	const top = topInset, bottom = height - bottomInset
	if(right <= left || bottom <= top) return
	let seaLevelMinimum, seaLevelMaximum, seaLevelTickMinimum, seaLevelTickMaximum, seaLevelStep
	if(visible.length) {
		const displayedValues = visible.flatMap(sample =>
			[sample.seaLevel - bandHalfWidth, sample.seaLevel + bandHalfWidth])
		const dataMinimum = Math.min(...displayedValues)
		const dataMaximum = Math.max(...displayedValues)
		const dataSpan = Math.max(1, dataMaximum - dataMinimum)
		seaLevelStep = niceIntegerStep(dataSpan / 5)
		seaLevelMinimum = dataMinimum - dataSpan * 0.04
		seaLevelMaximum = dataMaximum + dataSpan * 0.04
		ctx.save(); ctx.font = "9pt sans-serif"
		const extremaLabelPixels = ctx.measureText("00:00").width + 13
		ctx.restore()
		const plotHeight = bottom - top
		const highestMaximum = Math.max(...visibleExtrema
			.filter(extremum => extremum.type === "maximum").map(extremum => extremum.seaLevel))
		const lowestMinimum = Math.min(...visibleExtrema
			.filter(extremum => extremum.type === "minimum").map(extremum => extremum.seaLevel))
		for(let iteration = 0; iteration < 3; ++iteration) {
			const scaleSpan = seaLevelMaximum - seaLevelMinimum
			const labelClearance = scaleSpan * extremaLabelPixels / plotHeight
			if(Number.isFinite(highestMaximum))
				seaLevelMaximum = Math.max(seaLevelMaximum, highestMaximum + labelClearance)
			if(Number.isFinite(lowestMinimum))
				seaLevelMinimum = Math.min(seaLevelMinimum, lowestMinimum - labelClearance)}
		seaLevelTickMinimum = Math.ceil((seaLevelMinimum - seaLevelStep * 1e-9) / seaLevelStep) * seaLevelStep
		seaLevelTickMaximum = Math.floor((seaLevelMaximum + seaLevelStep * 1e-9) / seaLevelStep) * seaLevelStep
		if(seaLevelTickMinimum > seaLevelTickMaximum)
			seaLevelTickMinimum = seaLevelTickMaximum =
				Math.round((seaLevelMinimum + seaLevelMaximum) / (2 * seaLevelStep)) * seaLevelStep
		astrotideDisplay.seaLevelScale = {minimum: seaLevelMinimum, maximum: seaLevelMaximum,
			tickMinimum: seaLevelTickMinimum, tickMaximum: seaLevelTickMaximum, step: seaLevelStep}}
	else {
		const scale = astrotideDisplay.seaLevelScale || {minimum: -120, maximum: 120,
			tickMinimum: -100, tickMaximum: 100, step: 50}
		seaLevelMinimum = scale.minimum
		seaLevelMaximum = scale.maximum
		seaLevelTickMinimum = scale.tickMinimum ?? scale.minimum
		seaLevelTickMaximum = scale.tickMaximum ?? scale.maximum
		seaLevelStep = scale.step}
	const x = julianDay => left + (julianDay - start) / (end - start) * (right - left)
	const y = value => bottom - (value - seaLevelMinimum) /
		(seaLevelMaximum - seaLevelMinimum) * (bottom - top)
	ctx.font = "10pt sans-serif"; ctx.textBaseline = "middle"
	const seaLevelTicks = []
	for(let value = seaLevelTickMaximum;
		value >= seaLevelTickMinimum - seaLevelStep * 1e-9; value -= seaLevelStep)
		seaLevelTicks.push(Math.abs(value) < seaLevelStep * 1e-9 ? 0 : value)
	for(const value of seaLevelTicks) {
		const py = y(value)
		ctx.strokeStyle = Math.abs(value) < 1e-9 ? "#aaa" : "#777"
		ctx.lineWidth = Math.abs(value) < 1e-9 ? 0.75 : 0.5
		ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(right, py); ctx.stroke()
		ctx.textAlign = "right"; ctx.fillStyle = "white"
		const tickLabel = (value > 0 ? "+" : value < 0 ? "−" : "") +
			formatGraphNumber(Math.abs(value))
		ctx.fillText(tickLabel, left - 9, py)
		ctx.textAlign = "left"
		ctx.fillText(tickLabel, right + 9, py)}
	ctx.textAlign = "center"; ctx.textBaseline = "top"
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
		"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	const completeDays = []
	for(let midnight = start; midnight <= end; midnight++) {
		const px = x(midnight)
		ctx.strokeStyle = "#888"; ctx.lineWidth = 1
		ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke()
		if(midnight < end) completeDays.push(midnight)}
	ctx.strokeStyle = "#888"; ctx.lineWidth = 1
	ctx.strokeRect(left, top, right - left, bottom - top)
	const centerX = x(center)
	ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3])
	ctx.beginPath(); ctx.moveTo(centerX, top - 20); ctx.lineTo(centerX, bottom + 25); ctx.stroke()
	ctx.setLineDash([])
	drawExtremaLabels()
	ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip()
	if(bandHalfWidth && curveSamples.length) {
		ctx.beginPath()
		for(let index = 0; index < curveSamples.length; ++index) {
			const sample = curveSamples[index]
			const px = x(sample.julianDay), py = y(sample.seaLevel + bandHalfWidth)
			index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)}
		for(let index = curveSamples.length - 1; index >= 0; --index) {
			const sample = curveSamples[index]
			ctx.lineTo(x(sample.julianDay), y(sample.seaLevel - bandHalfWidth))}
		ctx.closePath()
		ctx.fillStyle = "rgba(112, 183, 255, 0.25)"
		ctx.fill()}
	function drawPredictionLine(series, color, lineWidth) {
		ctx.beginPath()
		let started = false
		series.forEach(sample => {
			if(!Number.isFinite(sample.seaLevel)) {started = false; return}
			const px = x(sample.julianDay), py = y(sample.seaLevel)
			started ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
			started = true})
		ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke()}
	drawPredictionLine(curveSamples, "#70b7ff", 1.2)
	ctx.fillStyle = "#70b7ff"; ctx.beginPath()
	for(const sample of samples) {
		if(!Number.isFinite(sample.seaLevel)) continue
		const px = x(sample.julianDay), py = y(sample.seaLevel)
		ctx.moveTo(px + 1.4, py); ctx.arc(px, py, 1.4, 0, 2 * Math.PI)}
	ctx.fill()
	ctx.restore()
	ctx.strokeStyle = "#70b7ff"
	ctx.lineWidth = 1.2
	for(const extremum of visibleExtrema) {
		const px = x(extremum.julianDay), py = y(extremum.seaLevel)
		ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.lineTo(px, py + 5); ctx.stroke()}
	function drawExtremaLabels() {
		ctx.font = "9pt sans-serif"
		for(const extremum of visibleExtrema) {
			const [, , , localAngle] = getGregorian(extremum.julianDay, longitude)
			const localMinutes = ((Math.round(localAngle * 4) % 1440) + 1440) % 1440
			const timeLabel = String(Math.floor(localMinutes / 60)).padStart(2, "0") + ":" +
				String(localMinutes % 60).padStart(2, "0")
			ctx.save()
			ctx.translate(x(extremum.julianDay), y(extremum.seaLevel) +
				(extremum.type === "maximum" ? -9 : 9))
			ctx.rotate(-Math.PI / 2)
			ctx.textAlign = extremum.type === "maximum" ? "left" : "right"
			ctx.textBaseline = "middle"
			const labelMetrics = ctx.measureText(timeLabel)
			const labelWidth = labelMetrics.width
			const labelPadding = 2
			const labelLeft = (extremum.type === "maximum" ? 0 : -labelWidth) - labelPadding
			const labelTop = -labelMetrics.actualBoundingBoxAscent - labelPadding
			const labelHeight = labelMetrics.actualBoundingBoxAscent +
				labelMetrics.actualBoundingBoxDescent
			ctx.fillStyle = "black"
			ctx.fillRect(labelLeft, labelTop, labelWidth + 2 * labelPadding,
				labelHeight + 2 * labelPadding)
			ctx.fillStyle = "#aaa"
			ctx.fillText(timeLabel, 0, 0)
			ctx.restore()}}
	ctx.fillStyle = "white"; ctx.strokeStyle = "#000"; ctx.lineWidth = 5; ctx.lineJoin = "round"
	completeDays.forEach((dayStart, index) => {
		const labelTime = dayStart + 0.5, px = x(labelTime)
		const [year, month, day] = getGregorian(labelTime, longitude)
		const dateLabel = monthNames[month - 1] + " " + day
		ctx.strokeText(dateLabel, px, bottom + 9); ctx.fillText(dateLabel, px, bottom + 9)
		if(index === 0 || index === completeDays.length - 1) {
			ctx.strokeText(String(year), px, bottom + 25); ctx.fillText(String(year), px, bottom + 25)}})
	if(Number.isFinite(currentSeaLevel)) {
		ctx.beginPath(); ctx.arc(centerX, y(currentSeaLevel), 4, 0, 2 * Math.PI)
		ctx.fillStyle = "#70b7ff"; ctx.fill(); ctx.strokeStyle = "white"; ctx.lineWidth = 0.75; ctx.stroke()
		ctx.font = "bold 10pt sans-serif"; ctx.textBaseline = "middle"
		const levelLabel = (currentSeaLevel > 0 ? "+" : currentSeaLevel < 0 ? "−" : "") +
			Math.abs(currentSeaLevel).toLocaleString("en-US", {
				minimumFractionDigits: 1, maximumFractionDigits: 1}) +
			(bandHalfWidth ? " ± " + bandHalfWidth.toLocaleString("en-US", {
				minimumFractionDigits: 2, maximumFractionDigits: 2}) : "") + " cm"
		const trendLabel = Number.isFinite(currentTrend) ?
			(currentTrend >= 0 ? "+" : "−") + Math.abs(currentTrend).toLocaleString("en-US", {
				minimumFractionDigits: 2, maximumFractionDigits: 2}) + " cm/hr" : ""
		ctx.strokeStyle = "black"; ctx.lineWidth = 5; ctx.lineJoin = "round"
		ctx.textAlign = "right"; ctx.strokeText(levelLabel, centerX - 6, top - 13)
		ctx.textAlign = "left"; ctx.strokeText(trendLabel, centerX + 6, top - 13)
		ctx.fillStyle = "#70b7ff"
		ctx.textAlign = "right"; ctx.fillText(levelLabel, centerX - 6, top - 13)
		ctx.textAlign = "left"; ctx.fillText(trendLabel, centerX + 6, top - 13)}
	ctx.font = "10pt sans-serif"
	drawVerticalLabel(ctx, "Sea Level (cm AMSL)", 22, (top + bottom) / 2, "white")
	drawVerticalLabel(ctx, "Sea Level (cm AMSL)", width - 22,
		(top + bottom) / 2, "white")
	const [, , , centerTime] = getGregorian(center, longitude)
	const centerHour = Math.floor(centerTime / 15)
	const centerMinute = Math.round((centerTime / 15 - centerHour) * 60)
	ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "top"
	ctx.fillText(String(centerHour).padStart(2, "0") + ":" +
		String(centerMinute).padStart(2, "0") +
		" (" + formatTimeZone(timeZone) + ")", centerX, bottom + 35)
	if(expandedModel)
		canvas.setAttribute("aria-label", "Predicted sea level for " +
			selectedRow.cells[2].textContent +
			" from three days before to seven days after the selected time")
	else
		canvas.setAttribute("aria-label", "Loading predicted sea level for " +
			selectedRow.cells[2].textContent)}

function drawForcingTimeSeriesGraph(conditions) {
	const canvas = UI.forcingTimeSeriesGraph
	const horizontalInset = 90, topInset = 62, bottomInset = 62
	const targetHeight = topInset + bottomInset +
		Math.max(0, canvas.clientWidth - 2 * horizontalInset) / 4
	canvas.style.height = targetHeight + "px"
	const prepared = prepareGraphCanvas(canvas)
	if(!prepared) return
	const {ctx, width, height} = prepared
	const panel = canvas.closest(".graphPanel")
	const title = panel?.querySelector(".graphCollapsedLabel")
	if(title) title.textContent = "Computed Vertical TGA and Estimated Clear-Sky GHI***"
	panel?.setAttribute("aria-label", "Tidal acceleration and solar irradiance time-series graph")
	drawGraphTitle(ctx, canvas, width / 2)
	if(!conditions) return
	const center = param.julianDay, longitude = conditions.longitude
	const {start, end, timeZone} = tenDayGraphWindow(center, longitude)
	const {records: forcingRecords, sampleAt} = updateAstronomicalForcingCache(conditions, [{
		start, end, stepTicks: 1, phaseTicks: 0}], "display")
	const samples = astronomicalForcingRequestIndices({start, end, stepTicks: 1, phaseTicks: 0})
		.map(index => forcingRecords.get(index))
	const currentSample = sampleAt(center)
	const horizontalDivisions = 6
	const ghiInterval = 200, ghiLimit = 1200
	const verticalTgaMinimum = -1000, verticalTgaMaximum = 2000
	const left = horizontalInset, right = width - horizontalInset
	const top = topInset, bottom = height - bottomInset
	if(right <= left || bottom <= top) return
	const x = julianDay => left + (julianDay - start) / (end - start) * (right - left)
	const verticalTgaY = value => bottom - (value - verticalTgaMinimum) /
		(verticalTgaMaximum - verticalTgaMinimum) * (bottom - top)
	const ghiY = value => bottom - value / ghiLimit * (bottom - top)
	ctx.font = "10pt sans-serif"; ctx.textBaseline = "middle"
	const verticalTgaTicks = [2000, 1500, 1000, 500, 0, -500, -1000]
	for(let index = 0; index < verticalTgaTicks.length; index++) {
		const fraction = index / horizontalDivisions, verticalTgaTick = verticalTgaTicks[index]
		const py = top + fraction * (bottom - top)
		ctx.strokeStyle = verticalTgaTick === 0 ? "#aaa" : "#777"
		ctx.lineWidth = verticalTgaTick === 0 ? 0.75 : 0.5
		ctx.beginPath(); ctx.moveTo(left, py); ctx.lineTo(right, py); ctx.stroke()
		ctx.textAlign = "right"; ctx.fillStyle = "#70b7ff"
		ctx.fillText(verticalTgaTick === 0 ? "0" : (verticalTgaTick > 0 ? "+" : "−") +
			formatGraphNumber(Math.abs(verticalTgaTick)), left - 9, py)
		ctx.textAlign = "left"; ctx.fillStyle = "#ff6f6f"
		ctx.fillText(formatGraphNumber(ghiInterval * (horizontalDivisions - index)),
			right + 9, py)}
	ctx.textAlign = "center"; ctx.textBaseline = "top"
	const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
		"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
	const completeDays = []
	for(let midnight = start; midnight <= end; midnight++) {
		const px = x(midnight)
		ctx.strokeStyle = "#888"; ctx.lineWidth = 1
		ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke()
		if(midnight < end) completeDays.push(midnight)}
	const centerX = x(center)
	ctx.strokeStyle = "white"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3])
	ctx.beginPath(); ctx.moveTo(centerX, top - 20); ctx.lineTo(centerX, bottom + 25); ctx.stroke()
	ctx.setLineDash([])
	ctx.beginPath(); ctx.moveTo(centerX, bottom + 22); ctx.lineTo(centerX, bottom + 25); ctx.stroke()
	ctx.strokeStyle = "#000"; ctx.lineWidth = 5; ctx.lineJoin = "round"
	ctx.fillStyle = "white"
	completeDays.forEach((dayStart, index) => {
		const labelTime = dayStart + 0.5
		const px = x(labelTime)
		const [year, month, day] = getGregorian(labelTime, longitude)
		const dateLabel = monthNames[month - 1] + " " + day
		ctx.strokeText(dateLabel, px, bottom + 9)
		ctx.fillText(dateLabel, px, bottom + 9)
		if(index === 0 || index === completeDays.length - 1) {
			const yearLabel = String(year)
			ctx.strokeText(yearLabel, px, bottom + 25)
			ctx.fillText(yearLabel, px, bottom + 25)}})
	ctx.strokeStyle = "#888"; ctx.lineWidth = 1
	ctx.strokeRect(left, top, right - left, bottom - top)
	function drawSeries(valueName, y, strokeStyle) {
		ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip()
		ctx.beginPath()
		samples.forEach((sample, index) => {
			const px = x(sample.julianDay), py = y(sample[valueName])
			index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)})
		ctx.strokeStyle = strokeStyle; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore()}
	drawSeries("vertical", verticalTgaY, "#70b7ff")
	drawSeries("ghi", ghiY, "#ff6f6f")
	function drawCurrentDot(y, fillStyle) {
		ctx.beginPath(); ctx.arc(centerX, y, 4, 0, 2 * Math.PI)
		ctx.fillStyle = fillStyle; ctx.fill()
		ctx.strokeStyle = "white"; ctx.lineWidth = 0.75; ctx.stroke()}
	drawCurrentDot(verticalTgaY(currentSample.vertical), "#70b7ff")
	drawCurrentDot(ghiY(currentSample.ghi), "#ff6f6f")
	ctx.font = "10pt sans-serif"; ctx.textBaseline = "middle"
	drawVerticalLabel(ctx, "Vertical TGA (nm/s²)", 22,
		(top + bottom) / 2, "#70b7ff")
	ctx.save(); ctx.translate(width - 22, (top + bottom) / 2); ctx.rotate(Math.PI / 2)
	ctx.fillStyle = "#ff6f6f"; ctx.textAlign = "center"
	ctx.fillText("Clear-Sky GHI (W/m²)", 0, 0); ctx.restore()
	const [, , , centerTime] = getGregorian(center, longitude)
	const centerHour = Math.floor(centerTime / 15)
	const centerMinute = Math.round((centerTime / 15 - centerHour) * 60)
	ctx.fillStyle = "white"; ctx.textAlign = "center"; ctx.textBaseline = "top"
	ctx.fillText(String(centerHour).padStart(2, "0") + ":" +
		String(centerMinute).padStart(2, "0") + " (" + formatTimeZone(timeZone) + ")",
		centerX, bottom + 35)
	ctx.font = "bold 10pt sans-serif"; ctx.textBaseline = "middle"
	const currentVerticalTga = Math.round(currentSample.vertical)
	const currentGhi = Math.round(currentSample.ghi)
	ctx.textAlign = "right"; ctx.fillStyle = "#70b7ff"
	ctx.fillText((currentVerticalTga > 0 ? "+" : currentVerticalTga < 0 ? "−" : "") +
		formatGraphNumber(Math.abs(currentVerticalTga)) + " nm/s²", centerX - 6, top - 13)
	ctx.textAlign = "left"; ctx.fillStyle = "#ff6f6f"
	ctx.fillText(formatGraphNumber(currentGhi) + " W/m²", centerX + 6, top - 13)
	canvas.setAttribute("aria-label", "Vertical tide-generating acceleration and clear-sky global " +
		"horizontal irradiance from three days before to seven days after the selected date and time")}

function formatGraphNumber(value) {
	const absolute = Math.abs(value)
	const decimals = absolute >= 100 ? 0 : absolute >= 10 ? 1 : 2
	const rounded = Math.abs(value) < 10 ** (-decimals) / 2 ? 0 : value
	return Number(rounded.toFixed(decimals)).toLocaleString("en-US", {
		maximumFractionDigits: decimals})}

const astrotideResizeObserver = new ResizeObserver(requestAstrotideRender)
for(const canvas of [UI.seaLevelGraph, UI.forcingTimeSeriesGraph])
	astrotideResizeObserver.observe(canvas)
for(const panel of document.querySelectorAll(".graphPanel")) {
	const toggleButtons = [...panel.querySelectorAll(".graphToggleButton")]
	for(const button of toggleButtons) button.title = "Hide Graph"
	for(const button of toggleButtons) button.onclick = event => {
		event.stopPropagation()
		setGraphPanelCollapsed(panel, !panel.classList.contains("collapsed"))}
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


function syncAstrotideTopPanelWidths() {
	const mapPanel = document.querySelector(".forcingMapGroup")
	const mapBlock = document.querySelector(".worldMapBlock")
	const leftStack = document.querySelector(".leftControlStack")
	const stationPanel = document.querySelector(".stationGroup")
	const controlsBar = document.querySelector(".controlsBar")
	const planetLegend = document.querySelector(".worldMapLegend")
	const overlayLegend = document.querySelector(".worldMapOverlayLegend")
	const pairWidth = stationPanel.getBoundingClientRect().width + mapPanel.getBoundingClientRect().width
	const panelStyle = getComputedStyle(mapPanel)
	const verticalExtra = parseFloat(panelStyle.paddingTop) + parseFloat(panelStyle.paddingBottom) +
		parseFloat(panelStyle.borderTopWidth) + parseFloat(panelStyle.borderBottomWidth)
	const horizontalExtra = planetLegend.getBoundingClientRect().width +
		parseFloat(panelStyle.columnGap) + parseFloat(panelStyle.paddingLeft) +
		parseFloat(panelStyle.paddingRight) + parseFloat(panelStyle.borderLeftWidth) +
		parseFloat(panelStyle.borderRightWidth)
	const planetItems = [...planetLegend.querySelectorAll(".worldMapLegendItem")]
	const itemHeight = planetItems[0]?.getBoundingClientRect().height || 0
	const planetItemsHeight = planetItems.length * itemHeight
	const overlayLegendHeight = overlayLegend.getBoundingClientRect().height
	const availableHeight = leftStack.getBoundingClientRect().height - verticalExtra - overlayLegendHeight
	const mapHeight = availableHeight > planetItemsHeight ?
		(availableHeight + planetItemsHeight / Math.max(1, planetItems.length - 1)) /
			(1 + 1 / Math.max(1, planetItems.length - 1)) : availableHeight
	const mapWidth = Math.max(370, mapHeight * 2)
	const mapPanelWidth = mapWidth + horizontalExtra
	const stationPanelWidth = pairWidth - mapPanelWidth
	mapBlock.style.flexBasis = mapWidth + "px"
	mapBlock.style.width = mapWidth + "px"
	planetLegend.style.height = mapHeight + "px"
	const legendGap = planetItems.length > 1 ?
		Math.max(0, (mapHeight - planetItems.length * itemHeight) / (planetItems.length - 1)) : 0
	overlayLegend.style.marginTop = legendGap + "px"
	for(const property of ["width", "minWidth", "maxWidth"])
		mapPanel.style[property] = mapPanelWidth + "px"
	for(const property of ["width", "minWidth", "maxWidth"])
		stationPanel.style[property] = stationPanelWidth + "px"
	controlsBar.style.gridTemplateColumns = stationPanelWidth + "px 200px " + mapPanelWidth + "px"}
new ResizeObserver(syncAstrotideTopPanelWidths).observe(document.querySelector(".leftControlStack"))
syncAstrotideTopPanelWidths()
