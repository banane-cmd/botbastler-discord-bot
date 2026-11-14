require('dotenv').config();

const {
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const STAFF_ROLE_NAMES = ['👑 Owner', '✦ Management', '🛡️ Administrator', '📋 Projektleitung', '💻 Developer', '🎨 Design', '🎫 Ticket-Support', '🤝 Support'];

if (!token || !guildId) {
  console.error('Bitte DISCORD_TOKEN und GUILD_ID in der Datei .env eintragen.');
  process.exit(1);
}

function safeChannelName(username) {
  const clean = username.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `ticket-${clean || 'kunde'}`.slice(0, 90);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
  console.log(`Ticket-Bot ist online als ${client.user.tag}. Das Fenster geöffnet lassen, damit Tickets funktionieren.`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.guildId !== guildId) return;

    if (interaction.isButton() && interaction.customId === 'create_project_ticket') {
      const modal = new ModalBuilder().setCustomId('project_ticket_modal').setTitle('Projektanfrage');
      const service = new TextInputBuilder().setCustomId('service').setLabel('Was brauchst du?').setPlaceholder('Bot, Server-Setup, Design ...').setStyle(TextInputStyle.Short).setRequired(true);
      const description = new TextInputBuilder().setCustomId('description').setLabel('Beschreibe deine Idee kurz').setStyle(TextInputStyle.Paragraph).setRequired(true);
      const budget = new TextInputBuilder().setCustomId('budget').setLabel('Budget (optional)').setPlaceholder('z. B. 50 € oder noch offen').setStyle(TextInputStyle.Short).setRequired(false);
      const deadline = new TextInputBuilder().setCustomId('deadline').setLabel('Wunschtermin (optional)').setPlaceholder('z. B. Ende des Monats').setStyle(TextInputStyle.Short).setRequired(false);
      modal.addComponents(service, description, budget, deadline);
      await interaction.showModal(modal);
      return;
    }

    if (!interaction.isModalSubmit() || interaction.customId !== 'project_ticket_modal') return;
    await interaction.deferReply({ ephemeral: true });
    const guild = await client.guilds.fetch(guildId);
    await guild.channels.fetch();
    await guild.roles.fetch();

    const existing = guild.channels.cache.find((channel) => channel.topic === `ticket-owner:${interaction.user.id}`);
    if (existing) {
      await interaction.editReply(`Du hast bereits ein offenes Ticket: ${existing}`);
      return;
    }

    const category = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === '╭─ PRIVATE PROJEKTE');
    if (!category) throw new Error('Die Kategorie für private Projekte wurde nicht gefunden. Bitte zuerst npm.cmd run setup ausführen.');

    const staffRoleIds = STAFF_ROLE_NAMES
      .map((name) => guild.roles.cache.find((role) => role.name === name)?.id)
      .filter(Boolean);
    const ticket = await guild.channels.create({
      name: safeChannelName(interaction.user.username),
      type: ChannelType.GuildText,
      parent: category.id,
      topic: `ticket-owner:${interaction.user.id}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        ...staffRoleIds.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] })),
      ],
      reason: `Projekt-Ticket von ${interaction.user.tag}`,
    });

    const embed = new EmbedBuilder()
      .setColor(0x00D4C7)
      .setTitle('Neue Projektanfrage')
      .setDescription(`Willkommen ${interaction.user}! Das Team meldet sich hier so bald wie möglich.`)
      .addFields(
        { name: 'Leistung', value: interaction.fields.getTextInputValue('service').slice(0, 1024) },
        { name: 'Beschreibung', value: interaction.fields.getTextInputValue('description').slice(0, 1024) },
        { name: 'Budget', value: interaction.fields.getTextInputValue('budget') || 'Nicht angegeben', inline: true },
        { name: 'Wunschtermin', value: interaction.fields.getTextInputValue('deadline') || 'Nicht angegeben', inline: true },
      )
      .setFooter({ text: 'botBastler Studio · Projekt-Ticket' });
    await ticket.send({ content: `${interaction.user} · <@&${staffRoleIds[0]}>`, embeds: [embed] });
    await interaction.editReply(`Dein privates Ticket wurde erstellt: ${ticket}`);
  } catch (error) {
    console.error('Ticket-Fehler:', error);
    const message = 'Das Ticket konnte gerade nicht erstellt werden. Bitte versuche es später erneut oder kontaktiere das Team.';
    if (interaction.deferred || interaction.replied) await interaction.editReply(message);
    else await interaction.reply({ content: message, ephemeral: true });
  }
});

client.login(token);
