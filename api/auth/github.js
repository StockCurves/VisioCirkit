const { handleGithubAuthRequest } = require("../../server/githubAuth")

module.exports = function githubAuthHandler(req, res) {
	handleGithubAuthRequest(req, res)
}
