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
      Saved Favourites Command
        Usage: !saved <id>
        Returns: List of saved recipes
  */

  // Get the member to search for saved recipes
  const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
  // Assign the searcher for pagination
  searcher = message.author;

  // Send the loading embed
  const loadEmbed = new Discord.MessageEmbed()
    .setDescription(`<a:loading:722563785109274707> Loading your saved recipes!`)
    .setColor('YELLOW');
  const loadingMSG = await message.channel.send({embed: loadEmbed});

  // Get the saved
  try {
    // Load the favourites page and handle pagination, start on page 1
    await loadFavourites(member, loadingMSG, 1);
  } catch (err) {
    // Send error log
    await log.error('Error fetching favourite recipes!', err.message || err);
    // Send an error message to the user
    const failEmbed = new Discord.MessageEmbed()
      .setDescription(`:x: There was an error fetching your saved recipes, please try again!`)
      .setColor('RED');
    await loadingMSG.edit('', { embed: failEmbed });
  }

};

module.exports.help = {
  name: 'saved',
  description: 'Show your saved recipes',
  aliases: ['favourites', 'fav'],
  category: 'Fun'
};

async function loadFavourites(member, message, page) {
  // Check the params that are sent
  if (!member || !message || !page || page < 1) throw 'Invalid params - all must be sent and page must be 1 or higher'
  // Get the favourites from the database
  const favourites = await utils.user.getFavourites(member.id, (page - 1) * 5);
  // If no recipes are found then send a message to the user
  if (!favourites || !favourites.recipes) {
    // No recipes found
    const u = searcher.id === member.id ? 'You have' : member.displayName + ' has';
    // Have a chance to send a tip so it is not every time
    const tip = Math.floor(Math.random() * 10) > 6 ? `\nTip: *React with ❤ to save recipes from searches.*` : '';
    // Send the no recipe response
    const noRecipes = new Discord.MessageEmbed()
      .setDescription(`**${u} no saved recipes!**${tip}`)
      .setColor('RED');
    return message.edit('', { embed: noRecipes})
  }
  // Build the info string for each recipe
  let favString = '';
  // Define the max page number
  const maxPage = Math.round(favourites.totalFavourites / 5);
  // Loop through each recipe and build a string for the embed
  for (const recipe of favourites.recipes) {
    favString += favString.length < 1 ? '' : '\n ';
    favString += `**[${recipe.data.label}](${recipe.data.url})** (${recipe.times_viewed || 0} views)
      • Recipe from [${recipe.data.source}](${recipe.data.url})
      • Recipe ID \`${recipe.recipeid}\`\n`;
  }

  // Post the embed with a different random image from a recipe
  const favEmbed = new Discord.MessageEmbed()
    .setAuthor(`${member.displayName}'s Saved Recipes`, member.user.displayAvatarURL())
    .setDescription(favString)
    .setThumbnail(favourites.recipes[Math.floor(Math.random() * favourites.recipes.length)].data.image)
    .setColor('RANDOM')
    .setFooter(`Page ${page}/${maxPage > 1 ? maxPage : 1}`);
  await message.edit(member, { embed: favEmbed });

  // Handle pagination
  let filterEmojis = ['◀', '❌', '▶'];
  // Pagination reactions
  const r = message.reactions.cache;
  if (!await r.get('◀')) await message.react('◀');
  if (!await r.get('❌')) await message.react('❌');
  if (!await r.get('▶')) await message.react('▶');

  // Collect the reaction
  const filter = (r, u) => filterEmojis.includes(r.emoji.name) && u.id === searcher.id;
  message.awaitReactions(filter, { time: 10000, max: 1 })
    .then(async reaction => {
      // If reaction fails then remove all
      if (!reaction || !reaction.first() || !reaction.size) return closedEmbed(message);
      // Choose what to do based on reaction
      switch (reaction.first()._emoji.name) {
        case '◀':
          // Remove user reaction
          await message.reactions.cache.get('◀').users.remove(searcher.id);
          // Switch page down
          const pageDown = (page - 1) < 1 ? 1 : page - 1;
          // Load last page
          return loadFavourites(member, message, pageDown)
        case '❌':
          // Close the menu
          return closedEmbed(message);
        case '▶':
          // Remove user reaction
          await message.reactions.cache.get('▶').users.remove(searcher.id);
          // Switch page up
          const pageUp = (page + 1) > maxPage ? maxPage : page + 1;
          // Load next page
          return loadFavourites(member, message, pageUp)
      }
    })
    .catch(err => {
      if (err) log.error('Caught error in saved.js pagination', err);
      return errorEmbed(message);
    });
}

async function closedEmbed(message) {
  // Update the message to have a closed embed
  const close = new Discord.MessageEmbed()
    .setDescription(`☑ **Favourite recipes menu has been closed**`)
    .setColor('GREEN');
  await message.reactions.removeAll();
  return message.edit('', { embed: close });
}

async function errorEmbed(message) {
  // Update the message to have an error embed
  const error = new Discord.MessageEmbed()
    .setDescription(`**An Error Occurred** Please try again!`)
    .setColor('RED');
  await message.reactions.removeAll();
  return message.edit('', { embed: error });
}
