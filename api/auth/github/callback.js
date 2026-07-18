const { handleGithubCallbackRequest } = require("../../../server/githubAuth")

module.exports = function githubCallbackHandler(req, res) {
	void handleGithubCallbackRequest(req, res)
}
