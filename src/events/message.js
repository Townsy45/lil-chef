const Discord = require('discord.js');
const fs = require('fs');
const utils = require('../lib/utils');
const pg = require('../lib/pg');

module.exports = async (bot, message) => {

  // // Check if a user is in the DB
  // let c = await utils.x.checkUserInDB(message.author.id, message.guild.id, 'economy');
  // // Check if the user exists in database
  // if (c && c.count < 1)
  //   await utils.x.addUserToDB(message.author.id, message.guild.id, 'economy')
  //     .catch(err => { console.log('Error adding user to db - ', err) });
  // Checks if a bot is sending the message
  if (message.author.bot) return;
  // Blocks DMs
  if (message.channel.type === "dm") return;


  // Sorts prefixes
  let prefix = '!';

  if (!message.content.startsWith(prefix)) return;

  // let prefixes = JSON.parse(fs.readFileSync("../prefixes.json", "utf8"));
  // if (!prefixes[message.guild.id]) prefixes[message.guild.id] = { prefixes: cfg.prefix };
  //  prefix = prefixes[message.guild.id].prefixes;


  // Handle economy
  // if (message.content && !message.content.startsWith(prefix)) { await utils.x.userFindCash(message); return }

  // Sorts arguments and message content
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0].slice(prefix.length);
  let args = messageArray.slice(1);
  // What runs the command and uses aliases
  let command = bot.commands.get(cmd) ? bot.commands.get(cmd) : bot.commands.get(bot.aliases.get(cmd));
  if (command) {
    await utils.x.checkGuildConfig(message.guild.id, prefix);
    await command.run(bot, message, args, prefix, bot.commands ? bot.commands : null);
  }
};
