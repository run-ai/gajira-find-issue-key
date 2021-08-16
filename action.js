const _ = require('lodash')
const Jira = require('./common/net/Jira')

const issueIdRegEx = /([A-Z0-9]+-[0-9]+)/g

const eventTemplates = {
  branch: '{{event.ref}}',
  commits: "{{event.commits.map(c=>c.message).join(' ')}}",
}

module.exports = class {
  constructor ({ githubEvent, argv, config }) {
    this.Jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    })

    this.config = config
    this.argv = argv
    this.githubEvent = githubEvent
  }

  async execute () {
    if (this.argv.string) {
      const foundIssue = await this.findIssueKeyIn(this.argv.string)

      if (foundIssue) return foundIssue
    }

    if (this.argv.from) {
      // ignoring input - just run on both branch and commit (YG)
      // const template = eventTemplates[this.argv.from]

      const template1 = eventTemplates["branch"]
      const searchStr = this.preprocessString(template1)
      const foundIssue = await this.findIssueKeyIn(searchStr)
      if (foundIssue) return foundIssue

      const template2 = eventTemplates["commits"]
      const searchStr = this.preprocessString(template2)
      const foundIssue = await this.findIssueKeyIn(searchStr)
      if (foundIssue) return foundIssue


    }
  }

  async findIssueKeyIn (searchStr) {
    const match = searchStr.match(issueIdRegEx)

    console.log(`Searching in string: \n ${searchStr}`)

    if (!match) {
      console.log(`String does not contain issueKeys`)

      return
    }

    for (const issueKey of match) {
      const issue = await this.Jira.getIssue(issueKey)

      if (issue) {
        return { issue: issue.key }
      }
    }
  }

  preprocessString (str) {
    _.templateSettings.interpolate = /{{([\s\S]+?)}}/g
    const tmpl = _.template(str)

    return tmpl({ event: this.githubEvent })
  }
}
