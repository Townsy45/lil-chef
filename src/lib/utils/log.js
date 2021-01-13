const mustang = require('mustang-log');

// Log functions
const log = {
  async info(m) { await mustang.log(m, 'INFO', true) },
  async error(m, message) { await mustang.log(m + '\n' + message, 'ERROR', true) },
  async warn(m) { await mustang.log(m, 'WARN', true) },
  async debug(m) { await mustang.log(m, 'DEBUG', true) }
};

module.exports = log;
