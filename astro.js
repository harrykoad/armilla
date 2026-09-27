const STARS = initStars()
const FAINT_NAKSATRA_STAR_INDEX = new Map([
	"35 Ari", "39 Ari", "23 Tau", "19 Tau", "φ¹ Ori", "φ² Ori",
	"η Cnc", "θ Cnc", "93 Leo", "ζ Psc"
].map((name, i, names) => [name, STARS.length - names.length + i]))

const PROPER_MOTION = initProperMotion()

const BRIGHT_STARS = initBrightStars()
const STAR_LABELS = [...BRIGHT_STARS, {index: 50, name: "Polaris", magnitude: 1.98}]
const STAR_LABEL_BY_NAME = new Map(STAR_LABELS.map(star => [star.name, star]))

const SEASONAL_TRIANGLES = [
	{name: "Summer\nTriangle", color: "magenta", stars: ["Vega", "Altair", "Deneb"]},
	{name: "Winter\nTriangle", color: "cyan", stars: ["Sirius", "Procyon", "Betelgeuse"]}]

const CONSTELLATION_FIGURES = initConstellationFigures()
const CONSTELLATION_NAMES = initConstellationNames()

const ZODIAC = [6, 76, 37, 21, 45, 84, 47, 69, 75, 11, 4, 64]
const ZODIAC_NAMES = new Set(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
	"Libra", "Scorpius", "Sagittarius", "Capricornus", "Aquarius", "Pisces"])

const LUNAR_MONTH_NAMES = [
	"Vaiśākha", "Jyaiṣṭha", "Āṣāḍha", "Śrāvaṇa", "Bhādrapada", "Āśvina",
	"Kārttika", "Mārgaśīrṣa", "Pauṣa", "Māgha", "Phālguna", "Caitra"]

const NAKSATRAS = initNaksatras()

const MASS_FACTOR = -82.34295832198312
const MOON_R = 1737.4
const SUN_R = 695700

let geoObserver = [0, 0, 0]

function geoMoon(jc = param.julianCentury) {
	let lp = mod(218.3166328333 + jc * (1732559343.3328 - jc *
		( 6.8700 - jc * (0.006604 - 0.00003169 * jc))) / 3600, 360) * DEGREE
	let d =  mod(297.8501917222 + jc * (1602961601.0312 - jc *
		( 6.8498 - jc * (0.006595 - 0.00003184 * jc))) / 3600, 360) * DEGREE
	let m =  mod(357.5291040000 + jc * ( 129596581.0733 - jc *
		( 0.5529 - jc * (0.000147 + 0.00000015 * jc))) / 3600, 360) * DEGREE
	let mp = mod(134.9633962222 + jc * (1717915923.0024 + jc *
		(31.3939 + jc * (0.051651 - 0.00024470 * jc))) / 3600, 360) * DEGREE
	let f =  mod( 93.2720976944 + jc * (1739527263.2179 - jc *
		(13.2293 + jc * (0.001021 - 0.00000417 * jc))) / 3600, 360) * DEGREE
	let n = [
		[0,  0,  0,  1], [0,  0,  0,  2], [0,  0,  0,  3], [0,  0,  1, -3], [0,  0,  1, -2], [0,  0,  1, -1],
		[0,  0,  1,  0], [0,  0,  1,  1], [0,  0,  1,  2], [0,  0,  1,  3], [0,  0,  2, -2], [0,  0,  2, -1],
		[0,  0,  2,  0], [0,  0,  2,  1], [0,  0,  2,  2], [0,  0,  3, -1], [0,  0,  3,  0], [0,  0,  3,  1],
		[0,  0,  4,  0], [0,  1, -2, -1], [0,  1, -2,  0], [0,  1, -1, -1], [0,  1, -1,  0], [0,  1, -1,  1],
		[0,  1,  0, -1], [0,  1,  0,  0], [0,  1,  0,  1], [0,  1,  1, -1], [0,  1,  1,  0], [0,  1,  1,  1],
		[0,  1,  2,  0], [0,  1,  2,  1], [0,  2, -1,  0], [0,  2,  0,  0], [0,  2,  1,  0], [1,  0, -2,  0],
		[1,  0, -1, -1], [1,  0, -1,  0], [1,  0,  0, -1], [1,  0,  0,  0], [1,  0,  0,  1], [1,  0,  1, -1],
		[1,  0,  1,  0], [1,  0,  1,  1], [1,  1, -1,  0], [1,  1,  0, -1], [1,  1,  0,  0], [1,  1,  0,  1],
		[1,  1,  1,  0], [2, -2, -1,  0], [2, -2,  0, -1], [2, -2,  0,  0], [2, -2,  0,  1], [2, -1, -2, -1],
		[2, -1, -2,  0], [2, -1, -1, -1], [2, -1, -1,  0], [2, -1, -1,  1], [2, -1,  0, -2], [2, -1,  0, -1],
		[2, -1,  0,  0], [2, -1,  0,  1], [2, -1,  1, -1], [2, -1,  1,  0], [2, -1,  1,  1], [2, -1,  2,  0],
		[2,  0, -3, -1], [2,  0, -3,  0], [2,  0, -2, -1], [2,  0, -2,  0], [2,  0, -2,  1], [2,  0, -1, -2],
		[2,  0, -1, -1], [2,  0, -1,  0], [2,  0, -1,  1], [2,  0, -1,  2], [2,  0,  0, -3], [2,  0,  0, -2],
		[2,  0,  0, -1], [2,  0,  0,  0], [2,  0,  0,  1], [2,  0,  0,  2], [2,  0,  1, -2], [2,  0,  1, -1],
		[2,  0,  1,  0], [2,  0,  1,  1], [2,  0,  2, -1], [2,  0,  2,  0], [2,  0,  2,  1], [2,  0,  3,  0],
		[2,  1, -2,  0], [2,  1, -1, -1], [2,  1, -1,  0], [2,  1, -1,  1], [2,  1,  0, -2], [2,  1,  0, -1],
		[2,  1,  0,  0], [2,  1,  0,  1], [2,  1,  1, -1], [2,  1,  1,  0], [2,  2, -1,  0], [3,  0, -2,  0],
		[3,  0, -1,  0], [4, -1, -2,  0], [4, -1, -1, -1], [4, -1, -1,  0], [4, -1,  0, -1], [4, -1,  0,  0],
		[4,  0, -3,  0], [4,  0, -2, -1], [4,  0, -2,  0], [4,  0, -2,  1], [4,  0, -1, -1], [4,  0, -1,  0],
		[4,  0, -1,  1], [4,  0,  0, -1], [4,  0,  0,  0], [4,  0,  0,  1], [4,  0,  1, -1], [4,  0,  1,  0]]
	let lc = [0, -114332, 0, 0, 10980, 0, 6288774, 0, -12528, 0, -381, 0, 213618, 0, -1110, 0, 10034, 0, 537,
		0, -2689, 0, -40923, 0, 0, -185116, 0, 0, -30383, 0, -2120, 0, -713, -2069, -323, -487, 0, -5163, 0,
		-34720, 0, 0, -2348, 0, 299, 0, 4987, 0, 351, 2048, 0, 2236, 0, 0, 2390, 0, 57066, 0, 596, 0, 45758, 0, 0,
		4036, 0, 327, 0, 3665, 0, 58793, 0, 0, 0, 1274027, 0, -2602, 0, 15327, 0, 658314, 0, -1595, -1773, 0,
		53322, 0, 0, 3994, 0, 294, 691, 0, -7888, 0, -399, 0, -6766, 0, 0, -810, -700, -340, -892, 759, 0, 1215, 0,
		520, 330, 0, 8548, 0, 0, 10675, 0, 0, 3861, 0, 0, 549]
	let bc = [5128122, 0, -1749, 777, 0, 277693, 0, 280602, 0, -283, 0, 8822, 0, 17198, 0, 439, 0, 1107, 0,
		-220, 0, -1870, 0, -1565, -1344, 0, -1794, -1410, 0, -1475, 0, -177, 0, 0, 0, 0, -119, 0, -1335, 0, -1491,
		-164, 0, -185, 0, 223, 0, 223, 0, 0, 302, 0, 107, 181, 0, 2065, 0, 2463, 0, 8216, 0, 2211, 491, 0, 315, 0,
		421, 0, 4324, 0, -451, 0, 46271, 0, 55413, 0, 607, 0, 	173237, 0, 32573, 0, 0, 9266, 0, 4200, 596, 0, 422,
		0, 0, -220, 0, -366, 0, -3359, 0, 	-351, -229, 0, 0, 0, 0, 0, 166, 0, 115, 0, 0, 176, 0, 671, 1828, 0,
		833, 1021, 0, 331, 132, 0]
	let rc = [0, -3149, 0, 0, 79661, 0, -20905355, 0, 0, 0, -4421, 0, -569925, 0, 0, 0, -23210, 0, -1117, 0,
		-7003, 0, -129620, 0, 0, 48888, 0, 0, 104755, 0, 5751, 0, -2117, 0, 1165, -1739, 0, -8379, 0, 108743, 0, 0,
		6322, 0, 0, 0, -16675, 0, 0, -4950, 0, -9884, 0, 0, 10056, 0, -152138, 0, 0, 0, -204586, 0, 0, -12831, 0,
		0, 0, 14403, 0, 246158, 0, 8752, 0, -3699111, 0, 0, 0, 10321, 0, -2955968, 0, 0, 4130, 0, -170733, 0, 0,
		-10445, 0, 0, 0, 0, 24208, 0, 0, 0, 30824, 0, 0, 2616, 2354, 0, 3258, -1897, 0, -3958, 0, -1571, 0, 0,
		-21636, 0, 0, -34782, 0, 0, -11650, 0, 0, -1423]
	let l = 0, b = 0, rM = 385000.56
	for(let k = 0; k < n.length; k++) {
		let e = (1 - 0.002516 * jc - 0.0000074 * jc * jc) ** Math.abs(n[k][1])
		let arg = n[k][0] * d + n[k][1] * m + n[k][2] * mp + n[k][3] * f
		let s = Math.sin(arg)
		l += lc[k] * e * s
		b += bc[k] * e * s
		rM += rc[k] * e * Math.cos(arg) / 1000}
	let av = (119.75 +	131.849 * jc) * DEGREE
	let aj = ( 53.09 + 479264.290 * jc) * DEGREE
	let ae = (313.45 + 481266.484 * jc) * DEGREE
	l = (l + 3958 * Math.sin(av) + 1962 * Math.sin(lp - f) + 318 * Math.sin(aj)) / 1000000 + lp / DEGREE
	b = (b - 2235 * Math.sin(lp) + 382 * Math.sin(ae) + 175 * Math.sin(av - f) + 175 * Math.sin(av + f) +
		127 * Math.sin(lp - mp) - 115 * Math.sin(lp + mp)) / 1000000
	rM /= KM_PER_AU
	let vM = scale(toXYZ(l, b), rM)
	let vR = scale(toXYZ(mod(125.0445351389 -
		jc * (6967919.8851 - jc * (6.3593 + jc * (0.007625 - 0.00003586 * jc))) / 3600 -
		1.4979 * Math.sin(2 * (d - f)) - 0.1500 * Math.sin(m) - 0.1226 * Math.sin(2 * d) +
		0.1176 * Math.sin(2 * f) - 0.0801 * Math.sin(2 * (mp - f)), 360), 0), rM)
	return [vM, vR].map(p => mdot(rotateZ(param.ayanamsaJ2000), p))}

function trueAnomaly(meanAnomaly, e) {
	let M = meanAnomaly * DEGREE
	let E = M
	for(let k = 0; k < 5; k++)
		E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
	return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2),
		Math.sqrt(1 - e) * Math.cos(E / 2)) / DEGREE}

function helioDistance(trueAnomaly, a, e) {
	return a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly * DEGREE))}

function helioEMB(jc = param.julianCentury) {
	let a =  1.00000018 - 0.00000003 * jc
	let e =  0.01673163 - 0.00003661 * jc
	let i = -0.00054346 - 0.01337178 * jc
	let omg = 108.04266274 + 0.55919116 * jc
	let OMG = - 5.11260389 - 0.24123856 * jc
	let nu = trueAnomaly(mod(-2.46314313 + 35999.05511069 * jc, 360), e)
	return mdot(mul(rotateZ(OMG + param.ayanamsaJ2000), mul(rotateX(i), rotateZ(nu + omg))),
		[helioDistance(nu, a, e), 0, 0])}

function getGeocentricSunPosition(jc = param.julianCentury, moon = geoMoon(jc)[0]) {
	return translate(scale(moon, 1 / MASS_FACTOR), negate(helioEMB(jc)))}

function helioPlanets(jc = param.julianCentury) {
	let a = [0.38709843,
		0.72332102 - 0.00000026 * jc,  1.52371243 + 0.00000097 * jc,  5.20248019 - 0.00002864 * jc,
		9.54149883 - 0.00003065 * jc, 19.18797948 - 0.00020455 * jc, 30.06952752 + 0.00006447 * jc]
	let e = [0.20563661 + 0.00002123 * jc,
		0.00676399 - 0.00005107 * jc, 0.09336511 + 0.00009149 * jc, 0.04853590 + 0.00018026 * jc,
		0.05550825 - 0.00032044 * jc, 0.04685740 - 0.00001550 * jc, 0.00895439 + 0.00000818 * jc]
	let i = [7.00559432 - 0.00590158 * jc,
		3.39777545 + 0.00043494 * jc, 1.85181869 - 0.00724757 * jc, 1.29861416 - 0.00322699 * jc,
		2.49424102 + 0.00451969 * jc, 0.77298127 - 0.00180155 * jc, 1.77005520 + 0.00022400 * jc]
	let mu = [174.79394829 + 149472.5154661 * jc,
		50.21215137 + 58517.75880612 * jc, 19.34931620 + 19139.84710618 * jc,
		 20.05983908 + jc * (3034.72172561 - 0.00012452 * jc) +
			0.3614771452160488 * Math.cos(1.402241562493016 + 38.35125 * jc),
		-42.78564734 + jc * (1221.57315246 + 0.00025899 * jc) +
			0.8834756945957014 * Math.cos(1.723452370158191 - 38.35125 * jc),
		141.76872184 + jc * ( 428.40245610 + 0.00058331 * jc) +
			0.9931980417905146 * Math.cos(2.9625334422741805 - 7.67025 * jc),
		257.54130563 + jc * ( 218.45505376 - 0.00041348 * jc) +
			0.6909773184182193 * Math.cos(0.1476104320021216 + 7.67025 * jc)].map(p => mod(p, 360))
	let omg = [29.11810076 + 0.28154195 * jc,
		 55.09494217 + 0.32953822 * jc, -73.63065768 + 0.72076056 * jc, -86.01787410 + 0.05174577 * jc,
		-20.77862639 + 0.79194480 * jc,  98.47154226 + 0.03527286 * jc, -85.10477129 + 0.01616240 * jc]
	let OMG = [48.33961819 - 0.12214182 * jc,
		 76.67261496 - 0.27274174 * jc,  49.71320984 - 0.26852431 * jc, 100.29282654 + 0.13024619 * jc,
		113.63998702 - 0.25015002 * jc,  73.96250215 + 0.05739699 * jc, 131.78635853 - 0.00606302 * jc]
	let v = []
	for(let k = 0; k < 7; k++) {
		let nu = trueAnomaly(mu[k], e[k])
		v.push(mdot(mul(rotateZ(OMG[k] + param.ayanamsaJ2000), mul(rotateX(i[k]), rotateZ(nu + omg[k]))),
			[helioDistance(nu, a[k], e[k]), 0, 0]))}
	return v}

function solarSystem(jc = param.julianCentury) {
	let gm = geoMoon(jc)
	let gs = getGeocentricSunPosition(jc, gm[0])
	let gp = helioPlanets(jc).map(p => translate(p, gs))
	return [/* Moon */gm[0], /*	Sun */gs, /* Mercury */gp[0], /* Venus */gp[1], /* Mars */gp[2],
		/* Jupiter */gp[3], /* Saturn */gp[4], /* Uranus */gp[5], /* Neptune */gp[6], /* Rahu */gm[1]]}

function getStarPosition(index, jd = param.julianDay) {
	let position = normalize(STARS[index])
	if(!show.properMotion) return position
	let years = (jd - 2451545) / 365.25
	let pair = PROPER_MOTION[index].pair
	if(pair) {
		let angle = Math.atan(pair.rate * years)
		let c = Math.cos(angle), s = Math.sin(angle)
		return normalize(translate(translate(scale(position, c), scale(cross(pair.axis, position), s)),
			scale(pair.axis, vdot(pair.axis, position) * (1 - c))))}
	return normalize(translate(position, scale(PROPER_MOTION[index], years)))}

function initBrightStars() {
	let data = [
		[0, "Sirius", -1.46], [1, "Canopus", -0.74], [2, "Rigil Kent.", -0.27],
		[5, "Arcturus", -0.05], [3, "Vega", 0.03], [4, "Capella", 0.08],
		[6, "Rigel", 0.13], [7, "Procyon", 0.34], [8, "Achernar", 0.46],
		[9, "Betelgeuse", 0.50], [10, "Hadar", 0.61], [11, "Altair", 0.76],
		[25, "Acrux", 0.76], [12, "Aldebaran", 0.85], [14, "Spica", 0.97],
		[15, "Antares", 1.06], [16, "Pollux", 1.14], [17, "Fomalhaut", 1.16],
		[20, "Deneb", 1.25], [19, "Mimosa", 1.25], [22, "Regulus", 1.35],
		[23, "Adhara", 1.50], [24, "Castor", 1.58], [26, "Shaula", 1.63],
		[27, "Gacrux", 1.63], [28, "Bellatrix", 1.64], [34, "Alnair", 1.74],
		[33, "Alioth", 1.76], [38, "Dubhe", 1.79], [36, "Mirfak", 1.79]
	]
	return data.map(([index, name, magnitude]) => ({index, name, magnitude}))}
