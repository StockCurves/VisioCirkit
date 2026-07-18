const { handleLogoutRequest } = require("../../server/githubAuth")

module.exports = function logoutHandler(req, res) {
	handleLogoutRequest(req, res)
}
