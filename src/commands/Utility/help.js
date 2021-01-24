const Discord = require("discord.js");
const utils = require('../../lib/utils');

module.exports.run = async (client, message, args) => {

  /*
      Help Command
        Usage: !help <command>
        Returns: Embed with help information
  */

  const command = args[0];
  const guildPrefix = client.prefixes.get(message.guild.id);

  if (command) {
    // Find help on that command
    const cmd = client.commands.get(command) || client.commands.get(client.aliases.get(command));
    if (cmd) {
      const commandHelp = new Discord.MessageEmbed()
        .setTitle(`Lil Chef - ${cmd.help.name} command`)
        .setDescription(`\`\`\`css\n${cmd.help.description}\`\`\`
        **Usage:** \`${guildPrefix}${cmd.help.usage || cmd.help.name}\`
        **Aliases:** \`${cmd.help.aliases.join('\`, \`') || 'None'}\`
        **Category:** \`${cmd.help.category}\``)
        .setColor('RANDOM')
        .setFooter(`Use ${guildPrefix}support to join our support server.`);
      return message.channel.send(commandHelp);
    }
  }

  // Otherwise just return standard help menu

  const help = new Discord.MessageEmbed()
    .setTitle('Lil Chef - Help Menu')
    .setDescription(`Current Guild Prefix: \`${guildPrefix}\``)
    .setFooter(`View more with ${guildPrefix}help [command name] • Use ${guildPrefix}support to join our support server.`);

  for (const cat of client.categories) {
    help.addField(cat, client.commands.map(c => {
      if (c.help.category.toLowerCase() === cat.toLowerCase()) return c.help.usage ? `\`\`${guildPrefix}${c.help.usage}\`\`` : `\`\`${guildPrefix}${c.help.name}\`\``;
    }), true)
  }

  await message.channel.send(help);

};

module.exports.help = {
  name: "help",
  description: "Show help with commands.",
  aliases: [],
  category: "Utility",
  usage: "help [command]"
};
