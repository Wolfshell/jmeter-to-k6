const ind = require('../ind')
const runtimeString = require('../string/run')
const text = require('../text')
const value = require('../value')
const makeResult = require('../result')

function HTTPSamplerProxy (node, context) {
  const result = makeResult()
  if (node.attributes.enabled === 'false') return result
  const settings = {}
  for (const key of Object.keys(node.attributes)) attribute(node, key, result)
  const props = node.children.filter(node => /Prop$/.test(node.name))
  for (const prop of props) property(prop, context, settings)
  if (sufficient(settings)) convert(settings, result, context)
  return result
}

function attribute (node, key, result) {
  switch (key) {
    case 'enabled':
    case 'guiclass':
    case 'testclass':
    case 'testname':
      break
    default: throw new Error('Unrecognized HTTPSamplerProxy attribute: ' + key)
  }
}

function property (node, context, settings) {
  const name = node.attributes.name.split('.').pop()
  switch (name) {
    case 'comments':
      settings.comment = value(node, context)
      break
    case 'domain':
      settings.domain = text(node.children)
      break
    case 'method':
      settings.method = text(node.children)
      break
    case 'path':
      settings.path = text(node.children)
      break
    case 'port': {
      const string = text(node.children)
      const number = Number.parseInt(string, 10)
      if (number <= 0) throw new Error('Invalid port: ' + string)
      settings.port = string
      break
    }
    case 'protocol':
      settings.protocol = value(node, context)
      break
    default: throw new Error('Unrecognized HTTPSamplerProxy property: ' + name)
  }
}

function sufficient (settings) {
  return (
    settings.domain &&
    settings.method &&
    settings.protocol
  )
}

function convert (settings, result, context) {
  result.imports.add('k6/http')
  const params = []
  params.push(method(settings))
  params.push(address(settings))
  result.logic = `

r = http.request(
${ind(params.join(',\n'))}
)`
}

function method (settings) {
  return runtimeString(settings.method)
}

function address (settings) {
  const protocol = `\${${runtimeString(settings.protocol)}}`
  const domain = `\${${runtimeString(settings.domain)}}`
  const path = (settings.path ? `\${${runtimeString(settings.path)}}` : '')
  const port = (settings.port ? `:\${${runtimeString(settings.port)}}` : '')
  return `\`${protocol}://${domain}${port}${path}\``
}

module.exports = HTTPSamplerProxy
