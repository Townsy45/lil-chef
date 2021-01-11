/*
    Created by @Townsy#0001
    https://github.com/Townsy45
*/

const pg = require('./lib/pg');
const utils = require('./lib/utils.js');

(async () => {
  // Create the bot instance
  const bot = await utils.core.createBot();
  // Load events
  await utils.core.loadEvents(bot)
  // Load commands
  await utils.core.loadCommands(bot);
  // Connect to the database
  await pg.connect();
})();
