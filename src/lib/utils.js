require("dotenv").config(); // For the environment variables
const Discord = require("discord.js"); // Discord.js for the bot
const fs = require('fs');
const { join } = require('path');
const pg = require('./pg');
const log = require('./utils/log');

// Normal Util functions
const x = {
  // TODO : Update this to work with chef database when guild stuff is added
  async checkGuildConfig(guild, prefix) {
    let guildConfig = await pg.query(`SELECT * FROM dev.config WHERE guildid = '${guild}'`);
    if (!guildConfig) await pg.query(`INSERT INTO dev.config (guildid${prefix ? ', prefix' : ''}) VALUES ('${guild}'${prefix ? `, '${prefix}'` : ''})`);
  },
  sanitize(input) {
    input.replace(/[']/g, "''");
    return input;
  }
};

const user = {
  async favAdd(uID, rID) {
    // Check id is sent
    if (!uID || !rID) throw 'Invalid Params Sent';
    // Check if favourite already exists
    const fav = await pg.query(`SELECT idnr FROM chef.favourites WHERE user_id = '${uID}' AND recipeID = '${rID}'`);
    console.log('FAV', fav);
    if (!fav) {
      // Try to insert into the favourites table
      return await pg.query(`INSERT INTO chef.favourites (user_id, recipeID) VALUES ('${uID}', '${rID}')`)
    }
  },
  async favRemove(uID, rID) {
    // Check id is sent
    if (!uID || !rID) throw 'Invalid Params Sent';
    // Check if favourite already exists
    const fav = await pg.query(`SELECT idnr FROM chef.favourites WHERE user_id = '${uID}' AND recipeID = '${rID}'`);
    if (fav && fav.idnr) {
      // Try to insert into the favourites table
      return await pg.query(`DELETE FROM chef.favourites WHERE user_id = '${uID}' AND recipeID = '${rID}'`)

    }
  },
  async getFavourites(uID, offset = 0, limit = 5) {
    // Check user id is sent
    if (!uID) throw 'A user id MUST be supplied!';
    console.log('GETTING FAVS', uID, offset, limit)
    // Get the favourites from the offset
    const favs = await pg.query(`SELECT chef.get_favourites($1)`, [{ user_id: uID, offset, limit }], { parseOutput: true });
    if (favs && favs.status === 'pass') {
      const totalFavs = await pg.query(`SELECT COUNT(idnr) FROM chef.favourites WHERE user_id = $1`, [uID]);
      return {
        recipes: favs.data.recipes,
        totalFavourites: totalFavs.count
      };
    }
  }
};

const recipe = {
  async isFavourite(uID, rID) {
    // Check params are sent
    if (!uID || !rID) throw 'Invalid Params Sent';
    // Check if recipe exists as a favourite
    const r = await pg.query(`SELECT idnr FROM chef.favourites WHERE user_id = '${uID}' AND recipeID = '${rID}'`);
    return !!(r && r.idnr);
  },
  async timesViewed(rID) {
    // Check id is sent
    if (!rID) throw 'Recipe ID is needed!';
    // Get the data
    const r = await pg.query(`SELECT times_viewed as views FROM chef.recipes WHERE recipeID = '${rID}'`);
    // Check if views exists
    if (r && r.views) return r.views;
  }
}

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

module.exports = { x, recipe, user, core, log };
