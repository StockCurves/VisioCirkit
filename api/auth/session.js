const { handleSessionRequest } = require("../../server/githubAuth")

module.exports = function sessionHandler(req, res) {
	void handleSessionRequest(req, res)
}
