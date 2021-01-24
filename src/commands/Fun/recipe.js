const Discord = require('discord.js');
const log = require('../../lib/utils/log');
const utils = require('../../lib/utils');
const API = require('../../lib/utils/food-api');
const _ = require('lodash');

let searcher; // So I can access the author in the many functions below

module.exports.run = async (client, message, args) => {

  /*
      Find a recipe command
        Usage: !recipe <id>
        Returns: Returns details on a specific recipe
  */

  // Assign the searcher for pagination
  searcher = message.author;
  const recipeID = args[0];

  // Send the searching embed
  const findEmbed = new Discord.MessageEmbed()
    .setDescription(`<a:loading:722563785109274707> Finding the recipe!`)
    .setColor('YELLOW');
  const m = await message.channel.send({embed: findEmbed});

  // Return if no recipe ID is sent
  if (!recipeID || !recipeID.length) return error(m, 'Please provide a valid recipe ID!');

  try {
    // Find the recipe
    const dbRecipe = await API.get(recipeID);
    // Check if recipe is found
    if (!dbRecipe) return error(m, 'Recipe not found with that ID!');
    // Clone data for embed
    const recipe = _.cloneDeep(dbRecipe.data);
    // Add a view to the database
    await API.view(recipeID);
    // Is favourite - TODO : Move this to a database function
    recipe.favourite = await utils.recipe.isFavourite(searcher.id, recipeID);
    recipe.recipeid = recipeID;
    // Prepare to send the recipe data
    const recipeEmbed = await utils.recipe.dataEmbed(recipe);
    // Send the recipe embed
    await m.edit(`<@${searcher.id}> here is what I found!`, { embed: recipeEmbed })
  } catch (err) {
    await log.error(err.message);
    return error(m, 'An error occurred while trying to fetch this recipe, please report this!');
  }
};

module.exports.help = {
  name: 'recipe',
  description: 'Find a specific recipe by ID.',
  aliases: ['info'],
  category: 'Fun',
  usage: "recipe <id>"
};

async function error(m, e) {
  // Error from the error function if params are not sent
  if (!m || !e) throw 'Invalid params sent to error function!';
  // Send the error embed;
  const failEmbed = new Discord.MessageEmbed()
    .setDescription(`:x: ${e || `There was an error finding that recipe, please try again!`}`)
    .setColor('RED');
  await m.edit({ embed: failEmbed });
}
