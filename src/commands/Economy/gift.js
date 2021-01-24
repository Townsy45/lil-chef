const Discord = require('discord.js');
const log = require('../../lib/utils/log');
const utils = require('../../lib/utils');
const API = require('../../lib/utils/food-api');
const _ = require('lodash');
const moment = require("moment");

let user; // So I can access the author in the many functions below

module.exports.run = async (client, message, args) => {

  /*
        Gift your cookies
          Usage: !gift @user 5
          Returns: Confirmation on cookies gifted
    */

  // Assign the searcher for pagination
  user = message.mentions.users.first() || client.users.cache.get(args[0]);
  const amount = amount;

  const giftEmbed = new Discord.MessageEmbed()
    .setDescription(`<a:loading:722563785109274707> Attempting to gift cookies!`)
    .setColor('YELLOW');
  const m = await message.channel.send(giftEmbed);
  // Validation
  if (!user) return error(m, 'Cannot find that user!');
  if (!amount || isNaN(amount) || amount < 1) return error(m, 'Invalid amount of cookies!');
  if (user.id === message.author.id) return error(m, 'You cannot gift to yourself!');

  // Get the user data
  const u = await utils.user.get(user.id);
  const a = await utils.user.get(message.author.id);
  // Error if the data is not here
  if (!u || !a || !u.data || !a.data) return error(m, 'Error trying to fetch user data! Please report this if this repeats.');
  console.log('U', JSON.stringify(u));
  console.log('A', JSON.stringify(a));
  console.log(u.data.cookies, a.data.cookies);

  if (!u.data.cookies || u.data.cookies.length < amount) return error(m, 'You do not have any cookies to gift');

  await utils.cookies.remove(message.author.id, amount)
  await utils.cookies.add(user.id, amount);

  // Build embed
  const sendEmbed = new Discord.MessageEmbed()
    .setDescription(`**You have gifted [${amount}](http://lilchef.xyz) cookies to ${user}** 🍪`)
    .setColor('GREEN');
  // Send the embed
  await m.edit(sendEmbed);
};

module.exports.help = {
  name: 'gift',
  description: 'Gift your cookies to other people for fun.',
  aliases: ['share', 'give', 'send'],
  category: 'Economy',
  usage: "gift [@user | UserID]"
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
