const TWO_PI = 2 * Math.PI
const DEGREE = Math.PI / 180

function mod(m, n, d = 0) {return ((m - d) % n + n) % n + d}
function clip(n, min, max) {return Math.max(min, Math.min(max, n))}

function toDMS(degree, range = 360, offset = 0, decimal = 2) {
	let t = mod(degree, range, offset)
	let sign = t < 0 ? -1 : 1
	t = Math.abs(t)
	let d = Math.floor(t)
	let m = Math.floor(60 * (t - d))
	let s = 60 * (60 * (t - d) - m)
	let f = 10 ** decimal
	s = Math.round(s * f) / f
	s === 60 ? (s = 0, m += 1) : null
	m === 60 ? (m = 0, d += 1) : null
	return [mod(sign * d, range, offset), sign * m, sign * s]}

function formatHourAngle(degree, decimal) {
	let [h, m, s] = toDMS(degree / 15, 24, 0, decimal)
	return h + "ʰ " + m + "ᵐ " + s.toFixed(decimal) + "ˢ"}

function formatAngleDMS(degree, decimal) {
	let [d, m, s] = toDMS(degree, 360, 0, decimal)
	return d + "° " + m + "\' " + s.toFixed(decimal) + "\""}

function formatSignedAngleDecimal(degree, decimal) {
	let t = mod(degree, 360, -180)
	let f = 10 ** decimal
	let a = Math.round(Math.abs(t) * f) / f
	if(a === 0) return (0).toFixed(decimal)
	return (t > 0 ? "+" : "−") + a.toFixed(decimal) + "°"}

function formatSignedAngleDMS(degree, decimal) {
	let t = mod(degree, 360, -180)
	let [d, m, s] = toDMS(Math.abs(t), 360, -180, decimal)
	let sign = t < 0 ? "−" : (t > 0 ? "+" : "")
	return sign + d + "° " + m + "\' " + s.toFixed(decimal) + "\""}

function toXYZ(theta, phi) {
	theta *= DEGREE
	phi *= DEGREE
	let c = Math.cos(phi)
	return [c * Math.cos(theta), c * Math.sin(theta), Math.sin(phi)]}

function toTP(xyz) {
	let p = Math.asin(clip(xyz[2], -1, 1)) / DEGREE
	if(Math.abs(xyz[2]) === 1) return [0, p]
	let t = mod(Math.atan2(xyz[1], xyz[0]) / DEGREE, 360)
	return [t, p]}

function normalize(vector) {
	let r = Math.hypot(vector[0], vector[1], vector[2])
	if(r === 0) return [0, 0, 0]
	return [vector[0] / r, vector[1] / r, vector[2] / r]}

function dot(m, v) {return [
	m[0]*v[0] + m[1]*v[1] + m[2]*v[2],   m[3]*v[0] + m[4]*v[1] + m[5]*v[2],   m[6]*v[0] + m[7]*v[1] + m[8]*v[2]]}

function mul(a, b) {return [
	a[0]*b[0] + a[1]*b[3] + a[2]*b[6],   a[0]*b[1] + a[1]*b[4] + a[2]*b[7],   a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
	a[3]*b[0] + a[4]*b[3] + a[5]*b[6],   a[3]*b[1] + a[4]*b[4] + a[5]*b[7],   a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
	a[6]*b[0] + a[7]*b[3] + a[8]*b[6],   a[6]*b[1] + a[7]*b[4] + a[8]*b[7],   a[6]*b[2] + a[7]*b[5] + a[8]*b[8]]}

function rotateX(angle) {
	angle *= DEGREE
	let c = Math.cos(angle), s = Math.sin(angle)
	return [1, 0, 0,   0, c, -s,   0, s, c]}

function rotateY(angle) {
	angle *= DEGREE
	let c = Math.cos(angle), s = Math.sin(angle)
	return [c, 0, s,   0, 1, 0,   -s, 0, c]}

function rotateZ(angle) {
	angle *= DEGREE
	let c = Math.cos(angle), s = Math.sin(angle)
	return [c, -s, 0,   s, c, 0,   0, 0, 1]}