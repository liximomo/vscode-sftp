
const Nothing = (() => {
	const fn = () => Nothing
	fn.toString = fn.toLocaleString = fn[Symbol.toPrimitive] = () => ''
	fn.valueOf = () => false

	return new Proxy(fn, {
		get: (o, key) => o.hasOwnProperty(key) ? o[key] : Nothing
	})
})()

module.exports = Nothing;
