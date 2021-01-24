const utils = require('../lib/utils');

module.exports = async (client, message) => {
  // Block Bots and DMs
  if (message.author.bot || message.channel.type === "dm") return;
  // Sorts prefix
  let prefix = await utils.x.getGuildPrefix(client, message.guild.id);
  // If user just tags the bot it returns the prefix
  if (message.content.startsWith(`<@!${client.user.id}>`))
    return client.commands.get('prefix').run(client, message, []);
  // If prefix is not sent return
  if (!message.content.startsWith(prefix)) return;
  // Sorts arguments and message content
  let messageArray = message.content.split(" ");
  let cmd = messageArray[0].slice(prefix.length);
  let args = messageArray.slice(1);
  // What runs the command and uses aliases
  let command = client.commands.get(cmd) ? client.commands.get(cmd) : client.commands.get(client.aliases.get(cmd));
  if (command) await command.run(client, message, args);
};
