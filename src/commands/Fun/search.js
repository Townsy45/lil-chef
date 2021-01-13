const Discord = require('discord.js');
const log = require('../../lib/utils/log');
const API = require('../../lib/utils/food-api');
const moment = require("moment");
const momentDurationFormatSetup = require("moment-duration-format");
momentDurationFormatSetup(moment);

let searcher; // So I can access the author in the many functions below

module.exports.run = async (bot, message, args) => {

  /*
      Search Command
        Usage: !search apple pie
        Returns: List of recipes
  */

  // Check if the args are sent
  if (!args || !args.length) return message.reply('Please provide something to search!');
  const query = args.join(' ');
  let results = [];
  searcher = message.author;

  // Send a searching message
  const searchEmbed = new Discord.MessageEmbed()
    .setDescription(`<a:loading:722563785109274707> Searching for \`"${query}"\``)
    .setColor('BLUE');
  const searchMSG = await message.channel.send({embed: searchEmbed});

  // Attempt to search
  try {
    results = await API.search(query);
    // Found some results
    if (typeof results === 'object' && results.length) {
      const resultEmbed = new Discord.MessageEmbed()
        .setDescription(`☑ Found **${results.length}** results`)
        .setColor('GREEN');
      await searchMSG.edit({embed: resultEmbed});
      searchMSG.delete({timeout: 10000});
    } else {
      // No results found, return a message letting the user know
      const resultEmbed = new Discord.MessageEmbed()
        .setDescription(`:x: **0** Results Found!`)
        .setColor('RED');
      await searchMSG.edit({embed: resultEmbed});
    }
  } catch (err) {
    console.log('ERR', err);
    // An error occurred
    await searchMSG.delete();
    return message.reply(`Sorry I was unable to complete your search please try again!\nIf the problem persists please report it to the development server! \`${bot.prefix[message.guild.id]}support\``);
  }

  // Open the recipe menu
  await openRecipe(message, results, 1);

  return 'done';
};

module.exports.help = {
  name: 'search',
  description: 'Search for recipes',
  aliases: ['find'],
  category: 'Fun'
};

async function openRecipe(m, recipes, index, fav) {
  // Check all the params are sent
  if (!m || !recipes || !index || index < 1) throw 'Please provide all valid params to open a recipe!';
  // The recipe
  const recipe = recipes[index - 1].recipe;
  const recipeID = recipe.uri.split('#')[1];
  // API Calls
  await API.view(recipeID); // View the recipe if it exists
  await API.add(recipeID, recipe) // Add recipe to DB if not already in (defaults 1 view)
  // Total time
  const totalTime = recipe.totalTime > 0 ? moment.duration(recipe.totalTime, "minutes").format("h [hrs], m [min]") : 'N/A';
  // Create the recipe embed
  const embed = new Discord.MessageEmbed()
    .setAuthor(`${fav ? '⭐ ' : ''}${recipe.label}`)
    .setDescription(`**Total Time** ${totalTime} • **Serves** ${Math.round(recipe.yield)}
    **Calories:** ${round(recipe.calories)}`)
    .setImage(recipe.image)
    .addField(`Ingredients (${recipe.ingredientLines.length})`, '• ' + recipe.ingredientLines.join('\n• '), true)
    .addField('Labels', recipe.healthLabels.join('\n'), true)
    .setFooter(`${recipe.source} • Recipe (${index}/${recipes.length})`);
  // Send the recipe embed
  await m.channel.send(`<@${searcher.id}> here is what I found!`, {embed})
    .then(async m => {
      let filterEmojis = [];

      // Go to start
      if (recipes.length > 1 && index > 1) { await m.react('⏪'); filterEmojis.push('⏪') }
      // Back a Page
      if (recipes.length > 1 && index > 1) { await m.react('◀'); filterEmojis.push('◀') }
      // Visit source
      await m.react('❓'); filterEmojis.push('❓');
      // Favourite
      if (!fav) { await m.react('❤'); filterEmojis.push('❤') }
      // Un-favourite
      else { await m.react('💔'); filterEmojis.push('💔') }
      // Close recipes
      await m.react('❌'); filterEmojis.push('❌');
      // Forward a Page
      if (recipes.length > 1 && index < recipes.length) { await m.react('▶'); filterEmojis.push('▶') }
      // Go to end
      if (recipes.length > 1 && index < recipes.length) { await m.react('⏩'); filterEmojis.push('⏩') }

      // Collect the reaction
      const filter = (r, u) => filterEmojis.includes(r.emoji.name) && u.id === searcher.id;
      m.awaitReactions(filter, { time: 20000, max: 1 })
        .then(async reaction => {
          // If reaction fails then remove all
          if (!reaction || !reaction.first() || !reaction.size) return m.reactions.removeAll();
          // Choose what to do based on reaction
          switch (reaction.first()._emoji.name) {
            case '⏪':
              // Go to first recipe
              await m.delete();
              return openRecipe(m, recipes, 1);
            case '◀':
              // Switch page down
              await m.delete();
              const pageDown = (index - 1) < 1 ? 1 : index - 1;
              return openRecipe(m, recipes, pageDown);
            case '❓':
              // Get recipe from DB
              const data = await API.get(recipeID);
              console.log('DATA', data)
              if (data) console.log(data.times_viewed)
              const timesViewed = data && data.times_viewed ? `**Times Viewed** \`${data.times_viewed}\`` : '';
              // Give link to source
              const info = new Discord.MessageEmbed()
                .setAuthor(recipe.label)
                .setThumbnail(recipe.image)
                .setDescription(`Read more about this recipe from ${recipe.source} [here](${recipe.url})!
                ${timesViewed}`)
                .setColor('RANDOM');
              await m.reactions.removeAll();
              return m.edit('', { embed: info });
            case '❤':
              // Repeat and add to user favourites


              // TODO : Add favourites to DB in user table


              console.log('ADDING TO FAVS');
              await m.delete();
              return openRecipe(m, recipes, index, true);
            case '💔':
              // Repeat and remove from favourites
              console.log('DELETING FROM FAVS');
              await m.delete();
              return openRecipe(m, recipes, index);
            case '❌':
              // Close the menu
              return m.delete();
            case '▶':
              // Switch page up
              await m.delete();
              const pageUp = (index + 1) > recipes.length ? recipes.length : index + 1;
              return openRecipe(m, recipes, pageUp);
            case '⏩':
              // Go to last recipe
              await m.delete();
              return openRecipe(m, recipes, recipes.length);
          }
        })
        .catch(err => {
          log.error('Caught error in search.js', err);
          m.reactions.removeAll();
        });

    });
}

function round(n) {
  return parseFloat(n).toFixed(2);
}
