const { handleLatexProxyRequest } = require("../server/latexProxy")

module.exports = function latexHandler(req, res) {
	handleLatexProxyRequest(req, res)
}
