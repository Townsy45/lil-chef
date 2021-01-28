const Discord = require('discord.js');
const log = require('../../lib/utils/log');
const utils = require('../../lib/utils');
const API = require('../../lib/utils/food-api');
const _ = require('lodash');
const moment = require("moment");
const table = require('string-table');

let user; // So I can access the author in the many functions below

module.exports.run = async (client, message, args) => {

  /*
        Show the top 10 leaderboards
          Usage: !leaderboards [platform]
          Returns: Embed with leaderboards
    */

  // Assign the searcher for pagination
  user = message.author;
  // Get the user's platform
  let platform = user.presence.clientStatus ? Object.keys(user.presence.clientStatus)[0] : 'mobile';
  // Check if the user specifies a platform
  if (args[0] && ['mobile', 'web', 'desktop'].includes(args[0].toLowerCase())) platform = args[0].toLowerCase();
  // Loading leaderboards message
  const loadingEmbed = new Discord.MessageEmbed()
    .setDescription(`<a:loading:722563785109274707> Loading Leaderboards!`)
    .setColor('YELLOW');
  const m = await message.channel.send(loadingEmbed);
  // Get LB data
  const lb = await utils.x.getCookiesLeaderboard(user.id);
  const position = await utils.x.getCookiesPosition(user.id);
  // Check data is returned
  if (!lb || !position) return error(m, 'Failed to get leaderboard data, please try again!');
  // Build leaderboards
  const board = new Discord.MessageEmbed()
    .setTitle('Top 10 Users (Cookies)')
    .setDescription(`**Your Position is [#${position}](https://lilchef.xyz)**\n${platform === 'mobile' ? '➖➖➖➖➖➖➖➖\n' : ''}${await _getTop10(client, lb, platform)}`)
    .setColor('ORANGE');
  // If the platform is not on pc then let them know
  if (platform === 'mobile') board.setFooter('This is the mobile version of the leaderboard.');
  // Send the leaderboards
  return m.edit(board);
};

module.exports.help = {
  name: 'leaderboard',
  description: 'Show the users in the Top 10 positions for amount of cookies!',
  aliases: ['lb', 'top10'],
  category: 'Economy',
  usage: 'leaderboard [platform]'
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

async function _getTop10(client, data, platform) {
  // Check data is sent
  if (!data && typeof data === 'object') return;
  // Build String
  let users = [];
  for (const user of data) {
    // Define a member variable so we can access the fetch data outside the try catch
    let member;
    // Fetch the users or default to [Unknown User]
    try {
      let fetch = await client.users.fetch(user.id);
      if (fetch) member = fetch;
    } catch (err) { member = '[Unknown User]' }
    // Mobile Mode - Push the string to the array for the embed
    if (platform === 'mobile') users.push(`**#${user.position}** ${member} - ${user.cookies} cookies`);
    // Desktop Mode - Push the users to an array for the table
    else users.push({ position: '#' + user.position, user: member.username || member, cookies: user.cookies });
  }
  // Define here as it is used in many places below.
  let board = 'No Board Found!';
  // If they use mobile then send the string version
  if (platform === 'mobile') board = users.join('\n');
  // Create a table for desktop users
  else board = `\`\`\`asciidoc\n${table.create(users, {
    capitalizeHeaders: true,
    formatters: {
      user: (value) => { return { value: value.split('', 16).reduce((o, c) => o.length === 15 ? `${o}${c}...` : `${o}${c}` , '') }},
      cookies: (value) => { return { value: value.toLocaleString(), format: { alignment: 'left' } } }
    }
  })}\n\`\`\``;
  // Return the leaderboard
  return board;
}
