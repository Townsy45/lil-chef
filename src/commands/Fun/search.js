const Discord = require('discord.js');
const log = require('../../lib/utils/log');
const utils = require('../../lib/utils');
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
      // Open the recipe menu
      return openRecipe(searchMSG, results, 1);
    } else {
      // No results found, return a message letting the user know
      const resultEmbed = new Discord.MessageEmbed()
        .setDescription(`:x: **0** Results Found!`)
        .setColor('RED');
      return searchMSG.edit({embed: resultEmbed});
    }
  } catch (err) {
    await log.error('Error caught in search.js', err.message || err);
    // An error occurred
    await searchMSG.delete();
    return message.reply(`Sorry I was unable to complete your search please try again!\nIf the problem persists please report it to the development server! \`${bot.prefix[message.guild.id]}support\``);
  }
};

module.exports.help = {
  name: 'search',
  description: 'Search for recipes',
  aliases: ['find'],
  category: 'Fun'
};

async function openRecipe(m, recipes, index) {
  // Check all the params are sent
  if (!m || !recipes || !index || index < 1) throw 'Please provide all valid params to open a recipe!';
  // Check recipe length
  if (typeof recipes !== 'object' || !recipes.length) return 'No recipes to open';
  // The recipe
  const recipe = recipes[index - 1].recipe;
  // Add recipe to DB if not already in (defaults 1 view)
  const recipeID = await API.add(recipe);
  // API Calls
  await API.view(recipeID); // View the recipe if it exists
  // Check if the recipe is a favourite
  const fav = await utils.recipe.isFavourite(searcher.id, recipeID);

  // Assign props to pass to embed function
  recipe.recipeid = recipeID; recipe.favourite = fav;
  recipe.page = `${index}/${recipes.length}`;
  // Create the recipe embed
  const embed = await utils.recipe.dataEmbed(recipe);
  // Send the recipe embed
  await m.edit(`<@${searcher.id}> here is what I found!`, {embed})

  // Emojis to filter on
  let filterEmojis = ['⏪', '◀', '❓', '⭐', '❌', '▶', '⏩'];
  // Get reactions cache
  const r = m.reactions.cache;
  // Go to start
  if (!await r.get('⏪')) await m.react('⏪');
  // Back a Page
  if (!await r.get('◀')) await m.react('◀');
  // Visit source
  if (!await r.get('❓')) await m.react('❓');
  // Favourite / Un-favourite
  if (!await r.get('⭐')) await m.react('⭐');
  // Close recipes
  if (!await r.get('❌')) await m.react('❌');
  // Forward a Page
  if (!await r.get('▶')) await m.react('▶');
  // Go to end
  if (!await r.get('⏩')) await m.react('⏩');

  // Collect the reaction
  const filter = (r, u) => filterEmojis.includes(r.emoji.name) && u.id === searcher.id;
  m.awaitReactions(filter, {time: 60000, max: 1})
    .then(async reaction => {
      // If reaction fails then remove all
      if (!reaction || !reaction.first() || !reaction.size) return m.reactions.removeAll();
      // Choose what to do based on reaction
      switch (reaction.first()._emoji.name) {
        case '⏪':
          // Remove user reaction
          await m.reactions.cache.get('⏪').users.remove(searcher.id);
          // Go to first recipe
          return openRecipe(m, recipes, 1);
        case '◀':
          // Remove user reaction
          await m.reactions.cache.get('◀').users.remove(searcher.id);
          // Switch page down
          const pageDown = (index - 1) < 1 ? recipes.length : index - 1;
          return openRecipe(m, recipes, pageDown);
        case '❓':
          // TODO : Have this link to the !recipe command to return all the info on that recipe and allow them to rate it from this page
          const timesViewed = await utils.recipe.timesViewed(recipeID);
          // Give link to source
          const info = new Discord.MessageEmbed()
            .setAuthor(recipe.label)
            .setThumbnail(recipe.image)
            .setDescription(`Read more about this recipe from ${recipe.source} [here](${recipe.url})!\n
                **Recipe ID** \`${recipeID}\`
                ${timesViewed ? `**Views** ${timesViewed}` : ''}`)
            .setColor('RANDOM');
          await m.reactions.removeAll();
          return m.edit('', {embed: info});
        case '⭐':
          // Remove user reaction
          await m.reactions.cache.get('⭐').users.remove(searcher.id);
          if (fav) {
            // Repeat and remove from favourites
            await utils.user.favRemove(searcher.id, recipeID);
          } else {
            // Repeat and add to user favourites
            await utils.user.favAdd(searcher.id, recipeID);
          }
          return openRecipe(m, recipes, index);
        case '❌':
          // Close the menu
          const close = new Discord.MessageEmbed()
            .setDescription(`☑ **Recipe search has been closed**`)
            .setColor('GREEN');
          await m.reactions.removeAll();
          return m.edit('', {embed: close});
        case '▶':
          // Remove user reaction
          await m.reactions.cache.get('▶').users.remove(searcher.id);
          // Switch page up
          const pageUp = (index + 1) > recipes.length ? 1 : index + 1;
          return openRecipe(m, recipes, pageUp);
        case '⏩':
          // Remove user reaction
          await m.reactions.cache.get('⏩').users.remove(searcher.id);
          // Go to last recipe
          return openRecipe(m, recipes, recipes.length);
      }
    })
    .catch(err => {
      log.error('Caught error in search.js', err);
      m.reactions.removeAll();
    });

}
