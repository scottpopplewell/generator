const { URL } = require('url');

module.exports = ({ Nunjucks, _ }) => {
  Nunjucks.addFilter('kebabCase', (string) => {
    return _.kebabCase(string);
  });

  Nunjucks.addFilter('camelCase', (string) => {
    return _.camelCase(string);
  });

  Nunjucks.addFilter('oneLine', (string) => {
    if (!string) return string;
    return string.replace(/\n/g, ' ');
  });

  Nunjucks.addFilter('docline', (field, fieldName, scopePropName) => {
    const buildLine = (f, fName, pName) => {
      const type = f.type() ? f.type() : 'string';
      const description = f.description() ? ` - ${f.description().replace(/\r?\n|\r/g, '')}` : '';
      let def = f.default();

      if (def && type === 'string') def = `'${def}'`;

      let line;
      if (def !== undefined) {
        line = ` * @param {${type}} [${pName ? `${pName}.` : ''}${fName}=${def}]`;
      } else {
        line = ` * @param {${type}} ${pName ? `${pName}.` : ''}${fName}`;
      }

      if (type === 'object') {
        let lines = `${line}\n`;
        let first = true;
        for (const propName in f.properties()) {
          lines = `${lines}${first ? '' : '\n'}${buildLine(f.properties()[propName], propName, `${pName ? `${pName}.` : ''}${fName}`)}`;
          first = false;
        }
        return lines;
      }

      return `${line}${description}`;
    };

    return buildLine(field, fieldName, scopePropName);
  });

  Nunjucks.addFilter('queueName', (title, version) => {
    return _.kebabCase(`${title}-${version}`.toLowerCase()).split('-').join('.');
  });

  function toMqttTopic (str, appendWildcard = false) {
    let result = str;
    if (result === '/') return '#';
    if (result.startsWith('/')) result = result.substr(1);
    result = result.replace(/\{([^}]+)\}/g, '+');
    if (appendWildcard) result += '/#';
    return result;
  }

  Nunjucks.addFilter('toMqttTopic', (topics, appendWildcard = false) => {
    if (typeof topics === 'string') return toMqttTopic(topics, appendWildcard);
    if (Array.isArray(topics)) return topics.map(toMqttTopic);
  });

  function toKafkaTopic (str) {
    let result = str;
    if (result.startsWith('/')) result = result.substr(1);
    result = result.replace(/\//g, '__');
    return result;
  }

  Nunjucks.addFilter('toKafkaTopic', (topics) => {
    if (typeof topics === 'string') return toKafkaTopic(topics);
    if (Array.isArray(topics)) return topics.map(toKafkaTopic);
  });

  function toAmqpTopic (str, appendWildcard = false) {
    let result = str;
    if (result === '/') return '#';
    if (result.startsWith('/')) result = result.substr(1);
    result = result.replace(/\//g, '.').replace(/\{([^}]+)\}/g, '*');
    if (appendWildcard) result += '.#';
    return result;
  }

  Nunjucks.addFilter('toAmqpTopic', (topics, appendWildcard = false) => {
    if (typeof topics === 'string') return toAmqpTopic(topics, appendWildcard);
    if (Array.isArray(topics)) return topics.map(toAmqpTopic);
  });

  Nunjucks.addFilter('toHermesTopic', (str) => {
    return str.replace(/\{([^}]+)\}/g, ':$1');
  });

  Nunjucks.addFilter('commonChannel', (asyncapi, removeTrailingParameters = false) => {
    const channelNames = asyncapi.channelNames().sort().map(ch => ch.split('/'));
    if (!channelNames.length) return '';
    if (channelNames.length === 1) return asyncapi.channelNames()[0];

    let result = [];
    for (let i = 0; i < channelNames.length-1; i++) {
      let ch1;
      if (i === 0) {
        ch1 = channelNames[0];
      } else {
        ch1 = result.concat(); // Makes a copy
        result = [];
      }
      const ch2 = channelNames[i+1];
      let x = 0;
      let shouldContinue = true;
      while(shouldContinue) {
        if (x > Math.max(ch1.length, ch2.length) - 1 || ch1[x] !== ch2[x]) {
          shouldContinue = false;
        } else {
          result.push(ch1[x]);
          x++;
        }
      }
    }

    if (removeTrailingParameters) {
      for (let index = result.length-1; index >= 0; index--) {
        const chunk = result[index];
        if (chunk.match(/^\{.+\}$/)) {
          result.pop();
        }
      }
    }

    return result.join('/');
  });

  Nunjucks.addFilter('channelNamesWithPublish', (asyncapi) => {
    const result = [];
    asyncapi.channelNames().forEach(name => {
      if (asyncapi.channel(name).hasPublish()) result.push(name);
    });
    return result;
  });

  Nunjucks.addFilter('host', (url) => {
    const u = new URL(url);
    return u.host;
  });

  Nunjucks.addFilter('port', (url, defaultPort) => {
    const u = new URL(url);
    return u.port || defaultPort;
  });

  Nunjucks.addFilter('stripProtocol', (url) => {
    const u = new URL(url);
    return url.substr(u.protocol.length+2);
  });

  Nunjucks.addFilter('trimLastChar', (text) => {
    return text.substr(0, text.length - 1);
  });

  function toJS(objFromJSON, indent = 2) {
    if (typeof objFromJSON !== "object" || Array.isArray(objFromJSON)) {
      // not an object, stringify using native function
      if (typeof objFromJSON === 'string') {
        const templateVars = objFromJSON.match(/\$\{[\w\d\.]+\}/g);
        if (templateVars) return `\`${objFromJSON}\``;
        return `'${objFromJSON}'`;
      }
      return JSON.stringify(objFromJSON);
    }

    function maybeQuote (str) {
      if (str.match(/^[\w\d\_\$]+$/g)) return str;
      return `'${str}'`;
    }

    // Implements recursive object serialization according to JSON spec
    // but without quotes around the keys.
    let props = Object
      .keys(objFromJSON)
      .map(key => `${' '.repeat(indent)}${maybeQuote(key)}: ${toJS(objFromJSON[key])}`)
      .join(",\n");
    return `{\n${props}\n}`;
  }

  Nunjucks.addFilter('toJS', (string) => {
    return toJS(string);
  });
};
