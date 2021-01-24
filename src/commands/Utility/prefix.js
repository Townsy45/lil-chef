const Discord = require("discord.js");
const utils = require('../../lib/utils');

module.exports.run = async (client, message, args) => {
  // Define the prefix
  const prefix = await utils.x.getGuildPrefix(client, message.guild.id);
  // Prepare the embed for a reply, saves making multiple embeds
  const reply = new Discord.MessageEmbed().setColor('GREEN');
  // Get the member for ease
  const member = message.member;
  // Check arguments
  if (!args[0]) {
    reply.setDescription(`${member} the current prefix is \`${prefix}\``);
    return message.channel.send(reply);
  }
  // Check member perms
  if (!member.hasPermission('ADMINISTRATOR')) return message.channel.send(':x: Insufficient permissions!').then(m => m.delete({ timeout: 5000 }));
  // Check if prefix is the same
  if (prefix === args[0]) {
    reply.setDescription(`This is already the current prefix!`);
    return message.channel.send(reply);
  }
  // Argument is supplied update the prefix
  try { await utils.x.setGuildPrefix(client, message.guild.id, args[0]) }
  catch (e) {
    reply.setColor('RED').setDescription(`:x: Failed to save new prefix!`);
    return message.channel.send(reply);
  }
  // Successfully updated
  reply.setDescription(`✅ Prefix Updated! New Prefix \`${args[0]}\``);
  return message.channel.send(reply);

};

module.exports.help = {
  name: "prefix",
  description: "View and set the prefix of the guild.",
  aliases: [],
  category: "Utility",
  usage: "prefix [new prefix]"
};
