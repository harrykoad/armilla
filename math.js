const PI = Math.PI
const TWO_PI = 2 * PI
const DEGREE = PI / 180

function mod(m, n, d = 0) {return ((m - d) % n + n) % n + d}
function clip(n, min, max) {return Math.max(min, Math.min(max, n))}

function findRoot(fn, low, high, tolerance = 1e-12, iterations = 100) {
	let a = low, b = high, c = high
	let fa = fn(a), fb = fn(b), fc = fb
	if(fa === null || fb === null || !Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0)
		return null
	let d = b - a, e = d
	for(let i = 0; i < iterations; i++) {
		if((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
			c = a; fc = fa; d = e = b - a}
		if(Math.abs(fc) < Math.abs(fb)) {
			let oldB = b, oldFb = fb
			a = b; fa = fb; b = c; fb = fc; c = oldB; fc = oldFb}
		let midpoint = (c - b) / 2
		let threshold = 2 * Number.EPSILON * Math.abs(b) + tolerance / 2
		if(Math.abs(midpoint) <= threshold || fb === 0) return b
		if(Math.abs(e) >= threshold && Math.abs(fa) > Math.abs(fb)) {
			let s = fb / fa, p, q
			if(a === c) {p = 2 * midpoint * s; q = 1 - s}
			else {
				q = fa / fc
				let r = fb / fc
				p = s * (2 * midpoint * q * (q - r) - (b - a) * (r - 1))
				q = (q - 1) * (r - 1) * (s - 1)}
			if(p > 0) q = -q
			else p = -p
			if(2 * p < Math.min(3 * midpoint * q - Math.abs(threshold * q), Math.abs(e * q))) {
				e = d; d = p / q}
			else {d = midpoint; e = d}}
		else {d = midpoint; e = d}
		a = b; fa = fb
		b += Math.abs(d) > threshold ? d : Math.sign(midpoint) * threshold
		fb = fn(b)
		if(fb === null || !Number.isFinite(fb)) return null}
	return b}

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

function negate(vector) {return vector.map(n => -n)}
function scale(vector, scalar) {return vector.map(n => scalar * n)}
function translate(vector, offset) {return vector.map((n, i) => n + offset[i])}

function normalize(vector) {
	let r = Math.hypot(...vector)
	return r === 0 ? [0, 0, 0] : scale(vector, 1 / r)}

function vdot(a, b) {return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]}

function cross(a, b) {return [
	a[1]*b[2] - a[2]*b[1],   a[2]*b[0] - a[0]*b[2],   a[0]*b[1] - a[1]*b[0]]}

function mdot(m, v) {return [
	m[0]*v[0] + m[1]*v[1] + m[2]*v[2],   m[3]*v[0] + m[4]*v[1] + m[5]*v[2],   m[6]*v[0] + m[7]*v[1] + m[8]*v[2]]}

function mul(a, b) {return [
	a[0]*b[0] + a[1]*b[3] + a[2]*b[6],   a[0]*b[1] + a[1]*b[4] + a[2]*b[7],   a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
	a[3]*b[0] + a[4]*b[3] + a[5]*b[6],   a[3]*b[1] + a[4]*b[4] + a[5]*b[7],   a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
	a[6]*b[0] + a[7]*b[3] + a[8]*b[6],   a[6]*b[1] + a[7]*b[4] + a[8]*b[7],   a[6]*b[2] + a[7]*b[5] + a[8]*b[8]]}

function transpose(m) {return [
	m[0], m[3], m[6],   m[1], m[4], m[7],   m[2], m[5], m[8]]}

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
