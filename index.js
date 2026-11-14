const http = require('http');
http.createServer((req, res) => { res.writeHead(200); res.end('Bot läuft!'); }).listen(process.env.PORT || 3000);// index.js - Alles in einem Bot
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

const VERIFIED_ROLE = 'Mitglied';
const TICKET_STAFF_ROLE = 'Team';

const findChannel = (guild, name) => guild.channels.cache.find(c => c.name.toLowerCase().includes(name));

async function log(guild, title, desc, color = 0x2b2d31) {
  const ch = findChannel(guild, 'log');
  if (!ch) return;
  const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp();
  ch.send({ embeds: [embed] }).catch(()=>{});
}

client.once('ready', async () => {
  console.log(`Online als ${client.user.tag}`);
  const commands = [
    new SlashCommandBuilder().setName('verify-setup').setDescription('Verify-Nachricht mit Button posten').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('ticket-setup').setDescription('Ticket-Nachricht mit Button posten').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('Giveaway starten').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addStringOption(o => o.setName('preis').setDescription('Was gibt es zu gewinnen?').setRequired(true))
      .addIntegerOption(o => o.setName('minuten').setDescription('Wie lange?').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('User warnen').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true))
      .addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('User timeouten').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true))
      .addIntegerOption(o => o.setName('minuten').setDescription('Wie lange?').setRequired(true))
      .addStringOption(o => o.setName('grund').setDescription('Grund')),
    new SlashCommandBuilder().setName('kick').setDescription('User kicken').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true))
      .addStringOption(o => o.setName('grund').setDescription('Grund')),
    new SlashCommandBuilder().setName('ban').setDescription('User bannen').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true))
      .addStringOption(o => o.setName('grund').setDescription('Grund')),
    new SlashCommandBuilder().setName('unban').setDescription('User entbannen').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption(o => o.setName('userid').setDescription('User ID').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Nachrichten löschen').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(o => o.setName('anzahl').setDescription('Wie viele? 1-100').setRequired(true)),
  ].map(c => c.toJSON());
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
  console.log('Slash-Commands geladen');
});

client.on('guildMemberAdd', async (member) => {
  const ch = findChannel(member.guild, 'willkommen');
  if (ch) {
    const embed = new EmbedBuilder().setTitle(`Willkommen, ${member.user.username}! 🎉`).setDescription(`Schön dass du da bist! Geh zu #verify und verifiziere dich mit dem Button.`).setColor(0x57F287).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
    ch.send({ content: `${member}`, embeds: [embed] }).catch(()=>{});
  }
  log(member.guild, '👋 Mitglied beigetreten', `${member} (${member.id}) ist beigetreten`, 0x57F287);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;
  if (interaction.isButton()) {
    if (interaction.customId === 'verify_btn') {
      const role = interaction.guild.roles.cache.find(r => r.name === VERIFIED_ROLE);
      if (!role) return interaction.reply({ content: `Rolle "${VERIFIED_ROLE}" nicht gefunden!`, ephemeral: true });
      if (interaction.member.roles.cache.has(role.id)) return interaction.reply({ content: 'Du bist schon verifiziert!', ephemeral: true });
      await interaction.member.roles.add(role);
      await interaction.reply({ content: '✅ Du bist jetzt verifiziert! Willkommen!', ephemeral: true });
      log(interaction.guild, '✅ Verifiziert', `${interaction.user} hat sich verifiziert`, 0x57F287);
      return;
    }
    if (interaction.customId === 'ticket_create') {
      const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
      if (existing) return interaction.reply({ content: `Du hast schon ein Ticket: ${existing}`, ephemeral: true });
      const staffRole = interaction.guild.roles.cache.find(r => r.name === TICKET_STAFF_ROLE);
      const ticketCat = interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes('ticket') && c.type === 4);
      const channel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        parent: ticketCat ? ticketCat.id : null,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
        ]
      });
      const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
      await channel.send({ content: `${interaction.user} ${staffRole ? staffRole : ''}`, embeds: [new EmbedBuilder().setTitle('🎫 Neues Ticket').setDescription('Beschreibe dein Problem, das Team meldet sich gleich.').setColor(0x5865F2)], components: [closeRow] });
      await interaction.reply({ content: `Ticket erstellt: ${channel}`, ephemeral: true });
      log(interaction.guild, '🎫 Ticket erstellt', `${interaction.user} hat ein Ticket erstellt: ${channel}`, 0x5865F2);
      return;
    }
    if (interaction.customId === 'ticket_close') {
      await interaction.reply({ content: 'Ticket wird in 5 Sekunden geschlossen...' });
      log(interaction.guild, '🔒 Ticket geschlossen', `${interaction.user} hat ${interaction.channel} geschlossen`, 0xED4245);
      setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
      return;
    }
    if (interaction.customId.startsWith('giveaway_join_')) {
      const msgId = interaction.customId.split('_')[2];
      if (!global.giveaways) global.giveaways = new Map();
      if (!global.giveaways.has(msgId)) global.giveaways.set(msgId, new Set());
      const set = global.giveaways.get(msgId);
      if (set.has(interaction.user.id)) return interaction.reply({ content: 'Du bist schon dabei!', ephemeral: true });
      set.add(interaction.user.id);
      return interaction.reply({ content: '🎉 Du nimmst teil!', ephemeral: true });
    }
  }
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    if (commandName === 'verify-setup') {
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_btn').setLabel('Verifizieren').setStyle(ButtonStyle.Success).setEmoji('✅'));
      await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🔒 Verifizierung').setDescription('Klicke auf den Button, um verifiziert zu werden und Zugriff auf den Server zu bekommen.').setColor(0x57F287)], components: [row] });
      return interaction.reply({ content: 'Verify-Nachricht gepostet!', ephemeral: true });
    }
    if (commandName === 'ticket-setup') {
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_create').setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
      await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🎫 Support Ticket').setDescription('Brauchst du Hilfe? Klicke auf den Button, um ein Ticket zu erstellen.').setColor(0x5865F2)], components: [row] });
      return interaction.reply({ content: 'Ticket-Nachricht gepostet!', ephemeral: true });
    }
    if (commandName === 'giveaway') {
      const preis = interaction.options.getString('preis');
      const minuten = interaction.options.getInteger('minuten');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join_temp`).setLabel('Teilnehmen').setStyle(ButtonStyle.Success).setEmoji('🎉'));
      const msg = await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎉 GIVEAWAY').setDescription(`**Preis:** ${preis}\n**Endet in:** ${minuten} Minuten\n\nKlicke auf Teilnehmen!`).setColor(0xFEE75C)], components: [row], fetchReply: true });
      const msgId = msg.id;
      const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join_${msgId}`).setLabel('Teilnehmen').setStyle(ButtonStyle.Success).setEmoji('🎉'));
      await msg.edit({ components: [row2] });
      setTimeout(async () => {
        const set = global.giveaways?.get(msgId) || new Set();
        const arr = [...set];
        if (arr.length === 0) return interaction.followUp({ content: `Giveaway vorbei - leider hat niemand teilgenommen. Preis war: ${preis}` });
        const winner = arr[Math.floor(Math.random() * arr.length)];
        await interaction.followUp({ content: `🎉 Gewinner für **${preis}** ist <@${winner}>! Herzlichen Glückwunsch!` });
        log(interaction.guild, '🎉 Giveaway beendet', `Gewinner: <@${winner}> - Preis: ${preis}`, 0xFEE75C);
      }, minuten * 60 * 1000);
      return;
    }
    if (commandName === 'warn') {
      const user = interaction.options.getUser('user');
      const grund = interaction.options.getString('grund');
      await interaction.reply({ content: `⚠️ ${user} wurde verwarnt. Grund: ${grund}` });
      try { await user.send(`Du wurdest auf **${interaction.guild.name}** verwarnt. Grund: ${grund}`); } catch {}
      log(interaction.guild, '⚠️ Warn', `${user} wurde von ${interaction.user} verwarnt. Grund: ${grund}`, 0xFEE75C);
      return;
    }
    if (commandName === 'timeout') {
      const member = interaction.options.getMember('user');
      const minuten = interaction.options.getInteger('minuten');
      const grund = interaction.options.getString('grund') || 'Kein Grund';
      await member.timeout(minuten * 60 * 1000, grund);
      await interaction.reply({ content: `🔇 ${member} wurde für ${minuten} Min getimeoutet. Grund: ${grund}` });
      log(interaction.guild, '🔇 Timeout', `${member} von ${interaction.user} für ${minuten} Min. Grund: ${grund}`, 0xFEE75C);
      return;
    }
    if (commandName === 'kick') {
      const member = interaction.options.getMember('user');
      const grund = interaction.options.getString('grund') || 'Kein Grund';
      await member.kick(grund);
      await interaction.reply({ content: `👢 ${member} wurde gekickt. Grund: ${grund}` });
      log(interaction.guild, '👢 Kick', `${member} von ${interaction.user} gekickt. Grund: ${grund}`, 0xED4245);
      return;
    }
    if (commandName === 'ban') {
      const member = interaction.options.getMember('user');
      const grund = interaction.options.getString('grund') || 'Kein Grund';
      await member.ban({ reason: grund });
      await interaction.reply({ content: `🔨 ${member} wurde gebannt. Grund: ${grund}` });
      log(interaction.guild, '🔨 Ban', `${member} von ${interaction.user} gebannt. Grund: ${grund}`, 0xED4245);
      return;
    }
    if (commandName === 'unban') {
      const id = interaction.options.getString('userid');
      await interaction.guild.members.unban(id);
      await interaction.reply({ content: `✅ <@${id}> wurde entbannt.` });
      log(interaction.guild, '✅ Unban', `<@${id}> von ${interaction.user} entbannt`, 0x57F287);
      return;
    }
    if (commandName === 'clear') {
      const anzahl = interaction.options.getInteger('anzahl');
      await interaction.channel.bulkDelete(anzahl, true);
      await interaction.reply({ content: `🧹 ${anzahl} Nachrichten gelöscht.`, ephemeral: true });
      log(interaction.guild, '🧹 Clear', `${interaction.user} hat ${anzahl} Nachrichten in ${interaction.channel} gelöscht`, 0x5865F2);
      return;
    }
  }
});

client.on('messageDelete', (msg) => { if (msg.guild && msg.author && !msg.author.bot) log(msg.guild, '🗑️ Nachricht gelöscht', `**Von:** ${msg.author}\n**Channel:** ${msg.channel}\n**Inhalt:** ${msg.content || '(kein Text)'}`, 0xED4245); });
client.on('guildMemberRemove', (member) => log(member.guild, '👋 Mitglied gegangen', `${member.user.tag} (${member.id}) hat den Server verlassen`, 0xED4245));

client.login(process.env.DISCORD_TOKEN);
