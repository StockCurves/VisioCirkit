const { handleGithubProxyRequest } = require("../../server/githubAuth")

module.exports = function githubProxyHandler(req, res) {
	void handleGithubProxyRequest(req, res)
}
