const Discord = require('discord.js');

module.exports.run = async (client, message, args) => {
  return message.channel.send(`${message.createdTimestamp - new Date()}ms - ${client.ws.ping}ms`);
};

module.exports.help = {
  name: 'ping',
  description: 'Simple Ping Command.',
  aliases: ['p'],
  category: 'Utility',
  usage: "ping"
};
