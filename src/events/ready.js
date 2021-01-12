const Discord = require('discord.js');
const fs = require('fs');
const utils = require('../lib/utils');

module.exports = async (bot) => {
  await bot.user.setStatus(`dnd`);
  await bot.user.setActivity(`Lil Chef`, { url: "https://www.twitch.tv/townsydaboss", type: "STREAMING" });

  await utils.log.info(`${bot.user.username} is ready and waiting!`);
};
