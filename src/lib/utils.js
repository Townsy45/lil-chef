require("dotenv").config(); // For the environment variables
const Discord = require("discord.js"); // Discord.js for the bot
const fs = require('fs');
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");
momentDurationFormatSetup(moment);
const { join } = require('path');
const pg = require('./pg');
const log = require('./utils/log');

// Normal Util functions
const x = {
  async getGuildPrefix(client, guild) {
    // Check params
    if (!client || !guild) return;
    // Check if cache exists
    if (!client.prefixes) client.prefixes = new Discord.Collection();
    // Get prefix from cache
    let prefix = client.prefixes.get(guild);
    // Check cache if there is a prefix already saved
    if (prefix) return prefix;
    // Check if guild is in database
    await this.checkGuildConfig(client, guild);
    // Prefix not found in cache so update the cache with the database
    const db = await pg.query(`SELECT prefix FROM chef.guilds WHERE guild_id = '${guild}'`);
    // Check if database returned a prefix or not
    if (db.prefix) prefix = db.prefix;
    // Check if the database returned nothing, return default prefix
    if (!prefix) prefix = process.env.DEFAULT_PREFIX;
    // Update the cache
    client.prefixes.set(guild, prefix);
    // Return the prefix
    return prefix;
  },
  async setGuildPrefix(client, guild, prefix) {
    // Check params
    if (!client || !guild || !prefix) throw 'Invalid params sent!';
    // Cache check exists
    if (!client.prefixes) client.prefixes = new Discord.Collection();
    // Define prefix from cache or default
    const cache = client.prefixes.get(guild);
    let sysPrefix = cache || process.env.DEFAULT_PREFIX;
    // If cache doesnt exist fetch from the database
    if (!cache) {
      await this.checkGuildConfig(client, guild);
      let DB = await pg.query(`SELECT prefix FROM chef.guilds WHERE guild_id = $1`, [guild]); // Fetches the prefix from database
      if (DB) sysPrefix = DB.prefix; // Set the db prefix if it exists
    }
    // Check if the prefix is the same
    if (sysPrefix === prefix) throw 'Prefix is the same as the current!';
    // Update cache and database
    client.prefixes.set(guild, prefix);
    await pg.query(`UPDATE chef.guilds SET prefix = $1 WHERE guild_id = $2`, [prefix, guild]);
  },
  async checkGuildConfig(client, guild) {
    // Check params
    if (!client || !guild) throw 'client and guild must be sent (x.checkGuildConfig)';
    // Check config cache exists
    if (!client.config) client.config = new Discord.Collection();
    // Check if guild is in the config cache
    if (!client.config.get(guild)) {
      let DB = await pg.query(`SELECT guild_id FROM chef.guilds WHERE guild_id = $1`, [guild]);
      if (DB) client.config.set(guild, true); // Add the guild to the cache
    }
    // Return if the guild is in the cache
    if (client.config.get(guild)) return;
    // Insert the guild into the config database
    await pg.query(`INSERT INTO chef.guilds (guild_id) VALUES ($1)`, [guild]);
    client.config.set(guild, true); // Add it to the cache
  },
  async getPointsLeaderboard() {
    // TODO - Add cache that updates every 1 minute or so possibly.
    // Get leaderboard data from database
    return await pg.query(`SELECT ROW_NUMBER () OVER (ORDER BY points DESC) as position, userid as id, points, correct, incorrect FROM wokmas.stats LIMIT 10;`);
  },
  async getPointsPosition(user) {
    // Check user is sent
    if (!user) return;
    // Get the users position in the leaderboard
    let data = await pg.query(`SELECT * FROM (SELECT userid, ROW_NUMBER () OVER (ORDER BY points DESC) as position FROM wokmas.stats) x WHERE userid = '${user}';`);
    if (data && data.position) return data.position;
  },
};

const user = {
  async get(uID) {
    // Error is no user id is sent
    if (!uID) throw 'Invalid User ID (user.get)';
    // Check user exists
    const user = await this.checkExists(uID);
    // Not found try to add
    if (!user) await this.add(uID);
    // Return user
    const data = await pg.query('SELECT * FROM chef.users WHERE user_id = $1', [uID]);
    let events = await pg.query('SELECT * FROM chef.events WHERE user_id = $1 ORDER BY event_date DESC LIMIT 10', [uID]);
    if (events && events.idnr) events = [events]; // If there is only 1 event then make it an array
    return { data, events };
  },
  async add(uID) {
    // Check user id is sent, needed for creation
    if (!uID) throw 'User ID is required (user.add)';
    // Check if user exists
    if (!await this.checkExists(uID)) {
      // User is not found add user
      await pg.query('INSERT INTO chef.users (user_id) VALUES ($1)', [uID]);
    }
  },
  async favAdd(uID, rID) {
    // Check id is sent
    if (!uID || !rID) throw 'Invalid Params Sent';
    // Check if favourite already exists
    const fav = await pg.query(`SELECT idnr FROM chef.favourites WHERE user_id = '${uID}' AND recipeID = '${rID}'`);
    if (!fav) {
      // Try to insert into the favourites table
      return await pg.query(`INSERT INTO chef.favourites (user_id, recipeID) VALUES ('${uID}', '${rID}')`)
    }
  },
  async favRemove(uID, rID) {
    // Check id is sent
    if (!uID || !rID) throw 'Invalid Params Sent';
    // Use the sql function to remove favourites
    const res = await pg.query('SELECT chef.remove_favourite($1)', [{ recipe_id: rID, user_id: uID }], { parseOutput: true })
    // Return the error message if it errors
    if (res.status !== 'pass') return res.message || 'an unknown error occurred';
  },
  async getFavourites(uID, offset = 0, limit = 5) {
    // Check user id is sent
    if (!uID) throw 'A user id MUST be supplied!';
    // Get the favourites from the offset
    const favs = await pg.query(`SELECT chef.get_favourites($1)`, [{ user_id: uID, offset, limit }], { parseOutput: true });
    if (favs && favs.status === 'pass') {
      const totalFavs = await pg.query(`SELECT COUNT(idnr) FROM chef.favourites WHERE user_id = $1`, [uID]);
      return {
        recipes: favs.data.recipes,
        totalFavourites: totalFavs.count
      };
    }
  },
  async checkExists(uID) {
    // Check user id is sent
    if (!uID) throw 'Invalid User ID Sent';
    // Check user exists
    const u = await pg.query(`SELECT user_id FROM chef.users WHERE user_id = $1`, [uID], { parseOutput: true });
    return !!u;
  },
  async event(uID, type, detail) {
    // Check params are sent
    if (!uID || !type || !detail) throw 'Not all params are valid (user.event)';
    // Insert into the event table and return the event
    return await pg.query('INSERT INTO chef.events (user_id, event_type, details) VALUES ($1, $2, $3) RETURNING *', [uID, type, detail]);
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
  },
  async dataEmbed(r) {
    const views = await recipe.timesViewed(r.recipeid);
    // Total time
    const totalTime = r.totalTime > 0 ? moment.duration(r.totalTime, "minutes").format("h [hrs], m [min]") : 'N/A';
    // Return the embed
    return new Discord.MessageEmbed()
      .setAuthor(`${r.favourite ? '⭐ ' : ''}${r.label}${views ? ` - ${views} Views` : ''}`)
      .setDescription(`**Total Time** ${totalTime} • **Serves** ${Math.round(r.yield)}
    **Calories:** ${parseFloat(r.calories).toFixed(2)}`)
      .setImage(r.image)
      .addField(`Ingredients (${r.ingredientLines.length})`, '• ' + r.ingredientLines.join('\n• '), true)
      .addField('Labels', r.healthLabels.join('\n'), true)
      .setFooter(`${r.source} • Recipe (${r.page || '1/1'}) • ID: ${r.recipeid}`);
  }
}

const cookies = {
  async cooldown(uID) {
    // Check user id is sent
    if (!uID) throw 'User ID must be sent (cookies.cooldown)';
    // Get user from DB
    const u = await user.get(uID);
    // Compare diff in date timestamps
    if (!u.data || !u.data.last_bake) return false;
    // Calculate time left
    const breakTime = 600000; // 10 min in MS
    const now = Date.now(); // Current time in MS
    const last = new Date(u.data.last_bake).getTime(); // Last time in MS
    const diff = breakTime - (now - last); // Should be the difference in MS
    // If diff expires format a cooldown remaining
    if (diff > 0) return moment.duration(diff, 'ms').format('h [hours,] m [minutes,] s [seconds]');
    // Defaults false
    return false;
  },
  async bake(uID) {
    // Check user id is sent
    if (!uID) throw 'User id is need to update (cookies.bake)'
    // Update user settings
    const cookies = await pg.query('UPDATE chef.users SET cookies = cookies + 1, last_bake = to_timestamp($1 / 1000.0) WHERE user_id = $2 RETURNING cookies', [Date.now(), uID], { parseOutput: true })
    // Return cookies the user has
    if (cookies) return cookies;
  },
  async add(uID, amount) {
    // Check params are sent
    if (!uID || !amount || isNaN(amount)) throw 'Invalid params (cookies.add)';
    // Check the user exists
    const u = await user.checkExists(uID);
    // Error if user doesnt exist
    if (!u) throw 'User does not exist (cookies.add)';
    // Update the user's cookies
    await pg.query('UPDATE chef.users SET cookies = cookies + $1 WHERE user_id = $2', [amount, uID])
  },
  async remove(uID, amount) {
    // Check params are sent
    if (!uID || !amount || isNaN(amount)) throw 'Invalid params (cookies.remove)';
    // Check the user exists
    const u = await user.checkExists(uID);
    // Error if user doesnt exist
    if (!u) throw 'User does not exist (cookies.remove)';
    // Update the user's cookies
    await pg.query('UPDATE chef.users SET cookies = cookies - $1 WHERE user_id = $2', [amount, uID])
  },

}

// Core system functions
const core = {

  // Create the bot and collections
  async createBot() {
    const bot = new Discord.Client(); // Create the bot instance
    bot.commands = new Discord.Collection(); // Create a commands collection
    bot.categories = new Discord.Collection(); // Create a commands categories collection
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

    let commands = await this.getAllFiles(commandDir);

    // Set the categories
    if (commands && commands.categories) bot.categories = commands.categories;

    // Set the commands and aliases
    if (commands && commands.files) {
      for (const f of commands.files) {
        let props = require(f);
        bot.commands.set(props.help.name, props);
        if (props.help.aliases && Array.isArray(props.help.aliases))
          for (const alias of props.help.aliases)
            bot.aliases.set(alias, props.help.name);
      }
      await log.info(`Loaded ${bot.commands.size} commands!`)
    } else {
      await log.warn('No Commands Found!');
    }
  },

  // Get all files recursively
  async getAllFiles(dirPath, arrayOfFiles = [], arrayOfCategories = []) {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfCategories.push(file);
        await this.getAllFiles(dirPath + "/" + file, arrayOfFiles, arrayOfCategories);
      } else {
        arrayOfFiles.push(join(dirPath, "/", file));
      }
    }

    return { files: arrayOfFiles, categories: arrayOfCategories };
  },

};

module.exports = { x, recipe, cookies, user, core, log };
