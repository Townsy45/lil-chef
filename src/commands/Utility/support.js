const Discord = require("discord.js");
const utils = require('../../lib/utils');

module.exports.run = async (client, message, args) => {

  /*
      Support Command
        Usage: !support
        Returns: Embed with support information
  */

  const support = new Discord.MessageEmbed()
    .setTitle('Lil Chef - Support Server')
    .setDescription(`Click **[here](https://discord.lilchef.xyz)** to join the support server!`)
    .setColor('RANDOM')
    .setFooter(`Current Prefix is ${client.prefixes.get(message.guild.id)}`);
  await message.channel.send(support);

};

module.exports.help = {
  name: "support",
  description: "Show support discord.",
  aliases: [],
  category: "Utility"
};
