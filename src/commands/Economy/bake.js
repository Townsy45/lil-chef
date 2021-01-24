const Discord = require('discord.js');
const log = require('../../lib/utils/log');
const utils = require('../../lib/utils');
const API = require('../../lib/utils/food-api');
const _ = require('lodash');

let user; // So I can access the author in the many functions below

module.exports.run = async (client, message, args) => {

  /*
        Bake cookies
          Usage: !bake
          Returns: Start the baking process of cookies
    */

  // Assign the searcher for pagination
  user = message.author;

  // Check if the user can bake
  const cooldown = await utils.cookies.cooldown(user.id);
  if (cooldown) return error(message, `${user} you cannot bake cookies for ${cooldown}`);

  // Complete the bake and update user
  const cookies = await utils.cookies.bake(user.id);

  const bakingEmbed = new Discord.MessageEmbed()
    .setDescription(`**You have baked a 🍪**`)
    .setColor('ORANGE')
    .setFooter(`${cookies} Cookies in total`)

  await message.channel.send(bakingEmbed);
  await utils.user.event(user.id, 'bake', 'You baked 1 cookie');
};

module.exports.help = {
  name: 'bake',
  description: 'Bake cookies to trade and use.',
  aliases: ['cook'],
  category: 'Economy'
};

async function error(m, e) {
  // Error from the error function if params are not sent
  if (!m || !e) throw 'Invalid params sent to error function!';
  // Send the error embed;
  const failEmbed = new Discord.MessageEmbed()
    .setDescription(`:x: ${e || `There was an error, please try again!`}`)
    .setColor('RED');
  await m.channel.send({ embed: failEmbed });
}
