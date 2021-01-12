require("dotenv").config(); // For the environment variables
const Discord = require("discord.js"); // Discord.js for the bot
const fs = require('fs');
const { join } = require('path');
const pg = require('./pg');
const log = require('./utils/log');

// Normal Util functions
const x = {
  async checkGuildConfig(guild, prefix) {
    let guildConfig = await pg.query(`SELECT * FROM dev.config WHERE guildid = '${guild}'`);
    if (!guildConfig) await pg.query(`INSERT INTO dev.config (guildid${prefix ? ', prefix' : ''}) VALUES ('${guild}'${prefix ? `, '${prefix}'` : ''})`);
  }
};

// Core system functions
const core = {

  // Create the bot and collections
  async createBot() {
    const bot = new Discord.Client(); // Create the bot instance
    bot.commands = new Discord.Collection(); // Create a commands collection
    bot.aliases = new Discord.Collection(); // Create an events collection
    bot.prefix = new Discord.Collection(); // Create a prefix cache collection
    await bot.login(process.env.TOKEN); // Login the bot
    return bot;
  },

  // Event Handler
  async loadEvents(bot) {
    const eventDir = join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventDir);

    eventFiles.forEach(file => {
      const event = require(`${eventDir}/${file}`);
      const eventName = file.split('.').shift();
      bot.on(eventName, event.bind(null, bot));
      delete require.cache[require.resolve(`${eventDir}/${file}`)];
    });

    bot.events = eventFiles.length;
    await log.info(`Loaded ${bot.events} events!`)

    return eventDir;
    // return glob(__dirname + '/')
  },

  // Command Handler
  async loadCommands(bot) {
    const commandDir = join(__dirname, '..', 'commands');

    let files = await this.getAllFiles(commandDir);

    if (files) {
      for (const f of files) {
        let props = require(f);
        bot.commands.set(props.help.name, props);
        if (props.help.aliases && Array.isArray(props.help.aliases))
          for (const alias of props.help.aliases)
            bot.aliases.set(alias, props.help.name);
      }
      await log.info(`Loaded ${files.length} commands!`)
    } else {
      await log.warn('No Commands Found!');
    }
  },

  // Get all files recursively
  async getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (fs.statSync(dirPath + "/" + file).isDirectory())
        arrayOfFiles = await this.getAllFiles(dirPath + "/" + file, arrayOfFiles);
      else arrayOfFiles.push(join(dirPath, "/", file));
    }

    return arrayOfFiles;
  },

};

module.exports = { x, core, log };
