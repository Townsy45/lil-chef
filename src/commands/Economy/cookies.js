const Discord = require('discord.js');
const log = require('../../lib/utils/log');
const utils = require('../../lib/utils');
const API = require('../../lib/utils/food-api');
const _ = require('lodash');
const moment = require("moment");

let user; // So I can access the author in the many functions below

module.exports.run = async (client, message, args) => {

  /*
        Show your cookies
          Usage: !cookies @user
          Returns: Details on cookies
    */

  // Assign the searcher for pagination
  user = message.mentions.users.first() || client.users.cache.get(args[0]) || message.author;

  const searchingEmbed = new Discord.MessageEmbed()
    .setDescription(`<a:loading:722563785109274707> Loading!`)
    .setColor('YELLOW');

  const m = await message.channel.send(searchingEmbed);

  // Get the user data
  const u = await utils.user.get(user.id);
  // Check if user is not sent
  if (!u || !u.data) return error(m, 'There was an error fetching your user data, please report this if it repeats');
  let transactions = '';
  if (u.events && u.events.length) {
    let index = 1;
    for (const e of u.events) {
      // Get transactions of type bake, trade and use
      if (['bake', 'trade', 'use'].includes(e.event_type)) {
        const d = new Date(e.event_date);
        transactions += `**${index}.** \`${e.details}\` - [${moment(d).format('hh:mm A[,] Do MMM YYYY')}](http://lilchef.xyz)\n`
      }
      index++;
    }
  }
  // Build embed
  const cookieEmbed = new Discord.MessageEmbed()
    .setDescription(`**${user.id === message.author.id ? 'You have' : `${user} has`} [${u.data.cookies}](http://lilchef.xyz) cookies 🍪**\n\n${transactions}`)
    .setColor('ORANGE');
  // Send the embed
  await m.edit(cookieEmbed);
};

module.exports.help = {
  name: 'cookies',
  description: 'Show your cookies and recent events.',
  aliases: ['balance', 'bal', 'jar'],
  category: 'Economy',
  usage: "cookies [@user | UserID]"
};

async function error(m, e) {
  // Error from the error function if params are not sent
  if (!m || !e) throw 'Invalid params sent to error function!';
  // Send the error embed;
  const failEmbed = new Discord.MessageEmbed()
    .setDescription(`:x: ${e || `There was an error, please try again!`}`)
    .setColor('RED');
  await m.edit({ embed: failEmbed });
}
