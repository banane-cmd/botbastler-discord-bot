// setup.js - Erstellt alles automatisch
require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once('ready', async () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  console.log(`Setup für Server: ${guild.name}`);

  // Rollen erstellen wenn sie nicht da sind
  const rolesToCreate = ['Mitglied', 'Team'];
  for (const name of rolesToCreate) {
    let role = guild.roles.cache.find(r => r.name === name);
    if (!role) {
      role = await guild.roles.create({ name });
      console.log(`Rolle erstellt: ${name}`);
    } else {
      console.log(`Rolle existiert schon: ${name}`);
    }
  }

  // Kategorien + Channels
  const categories = [
    { name: '📋 INFO', channels: ['📜-regeln', '📢-ankündigungen', '👋-willkommen', '✅-verify'] },
    { name: '💬 CHAT', channels: ['💬-allgemein', '🎮-gaming', '🎵-musik', '📸-bilder'] },
    { name: '🎫 SUPPORT', channels: ['🎫-ticket-erstellen', '📩-logs'] },
  ];

  for (const cat of categories) {
    let category = guild.channels.cache.find(c => c.name === cat.name && c.type === ChannelType.GuildCategory);
    if (!category) {
      category = await guild.channels.create({ name: cat.name, type: ChannelType.GuildCategory });
      console.log(`Kategorie erstellt: ${cat.name}`);
    }
    for (const chName of cat.channels) {
      let ch = guild.channels.cache.find(c => c.name === chName);
      if (!ch) {
        ch = await guild.channels.create({ name: chName, type: ChannelType.GuildText, parent: category.id });
        console.log(`Channel erstellt: ${chName}`);
      }
    }
  }

  console.log('FERTIG! Setup abgeschlossen.');
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);