const http = require('http');
http.createServer((req, res) => { res.writeHead(200); res.end('Bot läuft!'); }).listen(process.env.PORT || 3000);
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

const ROLE_NEU = 'Neu';
const VERIFIED_ROLE = 'Mitglied';
const ROLE_KUNDE = 'Kunde';
const ROLE_BEWERBER = 'Bewerber';
const ROLE_TEAM = 'Team';
const ROLE_CREATOR = 'Content Creator';
const TICKET_STAFF_ROLE = 'Team';

const findChannel = (guild, name) => guild.channels.cache.find(c => c.name.toLowerCase().includes(name));
async function log(guild, title, desc, color = 0x2b2d31) {
  const ch = guild.channels.cache.find(c => c.name === 'server-logs');
  if (!ch) return;
  const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp();
  ch.send({ embeds: [embed] }).catch(()=>{});
}

const verifyAufgaben = new Map();
const bewerbungen = new Map();
const wakeCooldown = new Set();
const WAKE_TEXTS = ["Bin wieder da! Hab nur kurz geschlafen, mein Kissen war zu bequem 😴","Yo, ich bin wach! Wer hat mich geweckt? 👀","Okay okay, ich bin da! Kaffee ist schon in mir drin ☕","Hab nur kurz die Augen zu gemacht... 60 Sekunden, versprochen! 😅","Morgen... äh ich meine... ich bin wach! Was hab ich verpasst? 🤖","AAAAH ich bin wach! Hab geträumt ich wäre ein Toaster 🍞😂","Bin zurück! Mein Wecker hat geklingelt, danke fürs Wecken! ⏰","Ich lebe wieder! Wer braucht einen Bot? 🙋"];
const SLEEP_TEXTS = ["Okay Leute, ich geh kurz pennen... weckt mich, wenn was ist! 😴","Bin kurz weg, meine Batterien sind leer... 🔋💤","Gute Nacht, ich träum von Bots! 🤖💤","Ich mach kurz ein Nickerchen, bin gleich wieder da! Zzz...","Ich leg mich kurz hin, mein Code braucht eine Pause 🛌","Schlafenszeit! Wenn was ist, schreibt einfach in #bot-status! 🌙"];

const TEAM_FRAGEN = ["Wie alt bist du?","Was kannst du am besten? Bots programmieren / Server einrichten / Beides?","Welche Sprachen / Tools kannst du? (z.B. Python, JavaScript, Discord.js...)","Was würdest du gerne mal für einen Kunden bauen? Beschreib mal deine Traum-Idee für einen Bot / Server!","Wie viel Zeit hast du pro Woche für uns?","Warum willst du ins Team und was willst du bei uns machen?","Was sind deine Schwächen und Stärken?"];
const CREATOR_FRAGEN = ["Wie alt bist du?","Auf welcher Plattform machst du Content? (TikTok, YouTube, Twitch, Insta...)","Wie heißt du da / wie viele Follower hast du ungefähr?","Wie oft postest / streamst du pro Woche?","Warum willst du Content Creator bei uns werden?","Was sind deine Schwächen und Stärken?"];
const getRole = (guild, name) => guild.roles.cache.find(r => r.name === name);
const SYNC_ROLLEN = ['Neu', 'Mitglied', 'Kunde', 'Bewerber', 'Team', 'VIP', 'Partner', 'Stammkunde', 'Content Creator', 'Tester', 'Booster', 'Ehrenmitglied'];

// ================= FINALE SORTIERUNG + DOPPELT FIX =================
const FINALE_STRUKTUR = [
  { kat: '🚀 START', pos: 0, channels: [
    { name: 'willkommen', type: 0, pos: 0 },
    { name: 'verify', type: 0, pos: 1 },
    { name: 'regeln', type: 0, pos: 2 },
    { name: 'ankündigungen', type: 0, pos: 3 },
    { name: 'über-botbastler', type: 0, pos: 4 },
  ]},
  { kat: '💰 LEISTUNGEN', pos: 1, channels: [
    { name: 'preise', type: 0, pos: 0 },
    { name: 'portfolio', type: 0, pos: 1 },
    { name: 'unsere-leistungen', type: 0, pos: 2 },
    { name: 'so-läuft-es-ab', type: 0, pos: 3 },
    { name: 'bewertungen', type: 0, pos: 4 },
    { name: 'gewinnspiele', type: 0, pos: 5 },
  ]},
  { kat: '💬 ANFRAGEN & COMMUNITY', pos: 2, channels: [
    { name: 'support', type: 0, pos: 0 },
    { name: 'community-chat', type: 0, pos: 1 },
    { name: 'feedback', type: 0, pos: 2 },
    { name: 'ticket-eröffnen', type: 0, pos: 3 },
    { name: 'faq', type: 0, pos: 4 },
    { name: 'ideen', type: 0, pos: 5 },
    { name: 'umfragen', type: 0, pos: 6 },
    { name: 'memes', type: 0, pos: 7 },
    { name: 'media', type: 0, pos: 8 },
    { name: 'events', type: 0, pos: 9 },
    { name: 'partner-werbung', type: 0, pos: 10 },
    { name: 'Community Lounge', type: 2, pos: 11 },
    { name: 'Gaming Talk', type: 2, pos: 12 },
    { name: 'Musik & Chill', type: 2, pos: 13 },
  ]},
  { kat: '💬 CHAT', pos: 3, channels: [
    { name: 'allgemein', type: 0, pos: 0 },
    { name: 'gaming', type: 0, pos: 1 },
    { name: 'musik', type: 0, pos: 2 },
    { name: 'bilder', type: 0, pos: 3 },
  ]},
  { kat: '🔑 KUNDENBEREICH', pos: 4, channels: [
    { name: 'kunden-info', type: 0, pos: 0 },
    { name: 'kunden-updates', type: 0, pos: 1 },
    { name: 'kunden-chat', type: 0, pos: 2 },
    { name: 'Kundengespräch', type: 2, pos: 3 },
  ]},
  { kat: '🛠️ INTERN · TEAM', pos: 5, channels: [
    { name: 'aufträge', type: 0, pos: 0 },
    { name: 'planung', type: 0, pos: 1 },
    { name: 'team-chat', type: 0, pos: 2 },
    { name: 'interne-notizen', type: 0, pos: 3 },
    { name: 'bewerbungen', type: 0, pos: 4 },
    { name: 'team-abstimmungen', type: 0, pos: 5 },
    { name: 'team-ideen', type: 0, pos: 6 },
    { name: 'team-ankündigungen', type: 0, pos: 7 },
    { name: 'team-feedback', type: 0, pos: 8 },
    { name: 'team-termine', type: 0, pos: 9 },
    { name: 'Team Talk', type: 2, pos: 10 },
    { name: 'Team Meeting', type: 2, pos: 11 },
  ]},
  { kat: '👑 NUR OWNER', pos: 6, channels: [
    { name: 'server-logs', type: 0, pos: 0 },
  ]},
];

async function syncAlles(guild) {
  for (const name of SYNC_ROLLEN) {
    if (!guild.roles.cache.find(r => r.name === name)) await guild.roles.create({ name, reason: 'Auto-Sync' }).catch(()=>{});
  }
  const rNeu = guild.roles.cache.find(r => r.name === 'Neu');
  const rMitglied = guild.roles.cache.find(r => r.name === 'Mitglied');

  // --- 1. DOPPELTE FIXEN ---
  // ticket-erstellen -> löschen, wir behalten ticket-eröffnen
  // logs -> löschen, wir behalten server-logs
  // PRIVATE PROJEKTE + INFO + SUPPORT Kategorien löschen (leer/doppelt)
  const zuLoeschenNamen = ['ticket-erstellen', 'logs'];
  for (const ch of [...guild.channels.cache.values()]) {
    if (zuLoeschenNamen.includes(ch.name.toLowerCase())) {
      await ch.delete('Doppelt - Cleanup').catch(()=>{});
      console.log(`Doppelt gelöscht: ${ch.name}`);
    }
    if (ch.type === 4 && ['PRIVATE PROJEKTE', 'INFO', 'SUPPORT'].includes(ch.name.toUpperCase())) {
      // Nur löschen wenn leer oder nur doppelte Kanäle drin waren
      const kinder = guild.channels.cache.filter(c => c.parentId === ch.id);
      if (kinder.size === 0) await ch.delete('Leere Doppel-Kategorie').catch(()=>{});
    }
  }
  // Gleiche Namen doppelt: 2x willkommen, 2x regeln, 2x ankündigungen, 2x aufträge -> ältesten behalten, Rest löschen
  const gesehen = new Map();
  for (const ch of [...guild.channels.cache.values()].sort((a,b) => a.createdTimestamp - b.createdTimestamp)) {
    if (ch.type === 4) continue;
    const key = ch.name.toLowerCase();
    if (gesehen.has(key)) {
      await ch.delete('Doppelter Kanal').catch(()=>{});
      console.log(`Doppelter Kanal gelöscht: ${ch.name}`);
    } else gesehen.set(key, ch.id);
  }

  // --- 2. KATEGORIEN + KANÄLE SORTIEREN ---
  let verifyCh, supportTicketCh, bewCh, botStatusCh;
  for (const katDef of FINALE_STRUKTUR) {
    let kat = guild.channels.cache.find(c => c.name === katDef.kat && c.type === 4);
    if (!kat) kat = await guild.channels.create({ name: katDef.kat, type: 4 }).catch(()=>null);
    if (!kat) continue;
    await kat.setPosition(katDef.pos).catch(()=>{});

    for (const chDef of katDef.channels) {
      let ch = guild.channels.cache.find(c => c.name.toLowerCase() === chDef.name.toLowerCase() && c.type === chDef.type);
      if (!ch) {
        // Erstellen wenn fehlt
        let overwrites = [{ id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }];
        if (chDef.name === 'verify') overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: rNeu.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }];
        if (chDef.name === 'bewerbungen') overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: rMitglied.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, { id: rNeu.id, deny: [PermissionFlagsBits.ViewChannel] }];
        if (chDef.name === 'server-logs') overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: guild.ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }];
        ch = await guild.channels.create({ name: chDef.name, type: chDef.type, parent: kat.id, permissionOverwrites: overwrites }).catch(()=>null);
      } else {
        await ch.setParent(kat.id).catch(()=>{});
        // server-logs IMMER nur Owner!
        if (chDef.name === 'server-logs') {
          await ch.permissionOverwrites.set([{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: guild.ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }]).catch(()=>{});
        }
      }
      if (ch) await ch.setPosition(chDef.pos).catch(()=>{});
      if (chDef.name === 'verify') verifyCh = ch;
      if (chDef.name === 'ticket-eröffnen') supportTicketCh = ch;
      if (chDef.name === 'bewerbungen') bewCh = ch;
      if (chDef.name === 'support') botStatusCh = ch;
    }
  }
  // Alte verwaiste Kategorien löschen, die nicht in der Struktur sind
  for (const ch of [...guild.channels.cache.values()]) {
    if (ch.type === 4 && !FINALE_STRUKTUR.some(k => k.kat === ch.name)) {
      const kinder = guild.channels.cache.filter(c => c.parentId === ch.id);
      if (kinder.size === 0) await ch.delete('Alte Kategorie').catch(()=>{});
    }
  }
  return { verifyCh, supportCh: supportTicketCh, bewCh };
}

client.once('ready', async () => {
  console.log(`Online als ${client.user.tag}`);
  const commands = [
    new SlashCommandBuilder().setName('verify-setup').setDescription('Verify-Nachricht mit Button posten').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('ticket-setup').setDescription('Ticket-Nachricht mit Button posten').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('bewerbung-setup').setDescription('Bewerbungs-Panel posten').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('setup-all').setDescription('ALLES automatisch syncen: Rollen + Kanäle sortieren + Doppelte fixen').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('schlafen').setDescription('Bot geht schlafen').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('Giveaway starten').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addStringOption(o => o.setName('preis').setDescription('Was gibt es zu gewinnen?').setRequired(true)).addIntegerOption(o => o.setName('minuten').setDescription('Wie lange?').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('User warnen').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true)).addStringOption(o => o.setName('grund').setDescription('Grund').setRequired(true)),
    new SlashCommandBuilder().setName('timeout').setDescription('User timeouten').setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers).addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true)).addIntegerOption(o => o.setName('minuten').setDescription('Wie lange?').setRequired(true)).addStringOption(o => o.setName('grund').setDescription('Grund')),
    new SlashCommandBuilder().setName('kick').setDescription('User kicken').setDefaultMemberPermissions(PermissionFlagsBits.KickMembers).addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true)).addStringOption(o => o.setName('grund').setDescription('Grund')),
    new SlashCommandBuilder().setName('ban').setDescription('User bannen').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addUserOption(o => o.setName('user').setDescription('Wen?').setRequired(true)).addStringOption(o => o.setName('grund').setDescription('Grund')),
    new SlashCommandBuilder().setName('unban').setDescription('User entbannen').setDefaultMemberPermissions(PermissionFlagsBits.BanMembers).addStringOption(o => o.setName('userid').setDescription('User ID').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Nachrichten löschen').setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages).addIntegerOption(o => o.setName('anzahl').setDescription('Wie viele? 1-100').setRequired(true)),
  ].map(c => c.toJSON());
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  for (const guild of client.guilds.cache.values()) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guild.id), { body: commands }).catch(()=>{});
    console.log(`Commands für ${guild.name} geladen`);
  }
});

client.on('guildMemberAdd', async (member) => {
  const rolleNeu = getRole(member.guild, ROLE_NEU);
  if (rolleNeu) await member.roles.add(rolleNeu).catch(()=>{});
  const ch = member.guild.channels.cache.find(c => c.name === 'willkommen');
  if (ch) {
    const embed = new EmbedBuilder().setTitle(`Willkommen, ${member.user.username}! 🎉`).setDescription(`Schön dass du da bist! Geh zu #verify und verifiziere dich mit dem Button.`).setColor(0x57F287).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
    ch.send({ content: `${member}`, embeds: [embed] }).catch(()=>{});
  }
  log(member.guild, '👋 Mitglied beigetreten', `${member} (${member.id}) ist beigetreten - Rolle Neu gegeben`, 0x57F287);
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  if (message.channel.name && message.channel.name.toLowerCase().includes('bot-status')) {
    if (!wakeCooldown.has(message.author.id)) {
      wakeCooldown.add(message.author.id);
      await message.react('👀').catch(()=>{});
      setTimeout(async () => {
        const text = WAKE_TEXTS[Math.floor(Math.random() * WAKE_TEXTS.length)];
        await message.channel.send(`🟢 **Ich bin wieder wach!**\n${text}`).catch(()=>{});
        wakeCooldown.delete(message.author.id);
      }, 60 * 1000);
    }
    return;
  }
  if (verifyAufgaben.has(message.author.id)) {
    const { frage, antwort } = verifyAufgaben.get(message.author.id);
    if (!message.channel.name.toLowerCase().includes('verify')) return;
    const zahl = parseInt(message.content.trim());
    if (isNaN(zahl)) { await message.reply({ content: `Bitte nur eine Zahl schreiben! Versuch nochmal: ${frage}` }).catch(()=>{}); return; }
    if (zahl === antwort) {
      verifyAufgaben.delete(message.author.id);
      const rolleNeu = getRole(message.guild, ROLE_NEU);
      const rolleMitglied = getRole(message.guild, VERIFIED_ROLE);
      if (rolleNeu && message.member.roles.cache.has(rolleNeu.id)) await message.member.roles.remove(rolleNeu).catch(()=>{});
      if (rolleMitglied) await message.member.roles.add(rolleMitglied).catch(()=>{});
      await message.channel.send(`🎉 ${message.author} Richtig! Du bist jetzt **Mitglied**!`).then(m => setTimeout(()=>m.delete().catch(()=>{}), 10000)).catch(()=>{});
      await message.delete().catch(()=>{});
      log(message.guild, '✅ Verifiziert', `${message.author} hat sich verifiziert`, 0x57F287);
    } else {
      await message.channel.send(`${message.author} Falsch! 😅 Versuch nochmal: ${frage}`).then(m => setTimeout(()=>m.delete().catch(()=>{}), 5000)).catch(()=>{});
      await message.delete().catch(()=>{});
    }
    return;
  }
  if (bewerbungen.has(message.author.id)) {
    const data = bewerbungen.get(message.author.id);
    if (message.channel.id !== data.channelId) return;
    if (data.index >= data.fragen.length) return;
    data.antworten.push({ frage: data.fragen[data.index], antwort: message.content });
    data.index++;
    await message.delete().catch(()=>{});
    if (data.index < data.fragen.length) {
      await message.channel.send(`**Frage ${data.index + 1}/${data.fragen.length}:** ${data.fragen[data.index]}`);
    } else {
      const embed = new EmbedBuilder().setTitle(`📝 Bewerbung - ${message.author.username}`).setDescription(data.typ === 'team' ? 'Team-Bewerbung' : 'Content Creator Bewerbung').setColor(0x00ff00).setTimestamp();
      data.antworten.forEach(a => embed.addFields({ name: a.frage, value: a.antwort, inline: false }));
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`bew_annehmen_${message.author.id}_${data.typ}`).setLabel('Annehmen').setStyle(ButtonStyle.Success).setEmoji('✅'), new ButtonBuilder().setCustomId(`bew_ablehnen_${message.author.id}_${data.typ}`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger).setEmoji('❌'));
      await message.channel.send({ embeds: [embed] });
      await message.channel.send({ content: `<@${message.guild.ownerId}> Neue Bewerbung ist da!`, components: [row] });
    }
    return;
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;
  if (interaction.isButton()) {
    if (interaction.customId === 'verify_btn') {
      const role = getRole(interaction.guild, VERIFIED_ROLE);
      if (!role) return interaction.reply({ content: `Rolle "${VERIFIED_ROLE}" nicht gefunden! Mach /setup-all`, ephemeral: true });
      if (interaction.member.roles.cache.has(role.id)) return interaction.reply({ content: 'Du bist schon verifiziert!', ephemeral: true });
      const a = Math.floor(Math.random()*10)+1; const b = Math.floor(Math.random()*10)+1; const op = ['+', '-', '*'][Math.floor(Math.random()*3)];
      let antwort = op === '+' ? a+b : op === '-' ? a-b : a*b;
      verifyAufgaben.set(interaction.user.id, { frage: `Was ist ${a} ${op} ${b} ?`, antwort });
      await interaction.reply({ content: `Deine Aufgabe: **Was ist ${a} ${op} ${b} ?**\nSchreib die Antwort einfach hier in den #verify Kanal!`, ephemeral: true });
      return;
    }
    if (interaction.customId === 'ticket_create') {
      const existing = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
      if (existing) return interaction.reply({ content: `Du hast schon ein Ticket: ${existing}`, ephemeral: true });
      const staffRole = getRole(interaction.guild, TICKET_STAFF_ROLE);
      const kundeRole = getRole(interaction.guild, ROLE_KUNDE);
      if (kundeRole) await interaction.member.roles.add(kundeRole).catch(()=>{});
      const ticketCat = interaction.guild.channels.cache.find(c => c.name.includes('ANFRAGEN') && c.type === 4);
      const channel = await interaction.guild.channels.create({ name: `ticket-${interaction.user.username.toLowerCase()}`, type: ChannelType.GuildText, parent: ticketCat ? ticketCat.id : null, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])] });
      const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
      await channel.send({ content: `${interaction.user} ${staffRole ? staffRole : ''}`, embeds: [new EmbedBuilder().setTitle('🎫 Neues Ticket').setDescription('Beschreibe dein Problem, das Team meldet sich gleich.').setColor(0x5865F2)], components: [closeRow] });
      await interaction.reply({ content: `Ticket erstellt: ${channel} - Du hast jetzt die Rolle **${ROLE_KUNDE}**!`, ephemeral: true });
      log(interaction.guild, '🎫 Ticket erstellt', `${interaction.user} hat ein Ticket erstellt: ${channel}`, 0x5865F2);
      return;
    }
    if (interaction.customId === 'ticket_close') {
      await interaction.reply({ content: 'Ticket wird in 5 Sekunden geschlossen...' });
      const kundeRole = getRole(interaction.guild, ROLE_KUNDE);
      if (kundeRole) { for (const [, member] of interaction.channel.members) { if (member.roles.cache.has(kundeRole.id)) await member.roles.remove(kundeRole).catch(()=>{}); } }
      log(interaction.guild, '🔒 Ticket geschlossen', `${interaction.user} hat ${interaction.channel} geschlossen`, 0xED4245);
      setTimeout(() => interaction.channel.delete().catch(()=>{}), 5000);
      return;
    }
    if (interaction.customId === 'bew_team' || interaction.customId === 'bew_creator') {
      const typ = interaction.customId === 'bew_team' ? 'team' : 'creator';
      const bewerberRole = getRole(interaction.guild, ROLE_BEWERBER);
      if (bewerberRole && interaction.member.roles.cache.has(bewerberRole.id)) return interaction.reply({ content: 'Du hast schon eine laufende Bewerbung!', ephemeral: true });
      if (bewerberRole) await interaction.member.roles.add(bewerberRole).catch(()=>{});
      const fragen = typ === 'team' ? TEAM_FRAGEN : CREATOR_FRAGEN;
      const prefix = typ === 'team' ? 'bewerbung' : 'creator';
      const bewCat = interaction.guild.channels.cache.find(c => c.name.includes('INTERN') && c.type === 4);
      const channel = await interaction.guild.channels.create({ name: `${prefix}-${interaction.user.username.toLowerCase()}`, type: ChannelType.GuildText, parent: bewCat ? bewCat.id : null, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, { id: interaction.guild.ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] });
      bewerbungen.set(interaction.user.id, { fragen, antworten: [], index: 0, typ, channelId: channel.id });
      await channel.send(`${interaction.user} Willkommen zu deiner Bewerbung! 📝\nBeantworte die Fragen eine nach der anderen.\n\n**Frage 1/${fragen.length}:** ${fragen[0]}`);
      await interaction.reply({ content: `Bewerbung gestartet: ${channel} - Du hast jetzt die Rolle **${ROLE_BEWERBER}**!`, ephemeral: true });
      return;
    }
    if (interaction.customId.startsWith('bew_annehmen_') || interaction.customId.startsWith('bew_ablehnen_')) {
      if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Nur der Owner kann das!', ephemeral: true });
      const parts = interaction.customId.split('_'); const bewerberId = parts[2]; const typ = parts[3];
      const member = await interaction.guild.members.fetch(bewerberId).catch(()=>null);
      const bewerberRole = getRole(interaction.guild, ROLE_BEWERBER);
      const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bew_close').setLabel('Schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒'), new ButtonBuilder().setCustomId('bew_keep').setLabel('Offen lassen').setStyle(ButtonStyle.Secondary).setEmoji('💬'));
      if (interaction.customId.startsWith('bew_annehmen_')) {
        if (member) { if (bewerberRole && member.roles.cache.has(bewerberRole.id)) await member.roles.remove(bewerberRole).catch(()=>{}); const zielName = typ === 'team' ? ROLE_TEAM : ROLE_CREATOR; const zielRole = getRole(interaction.guild, zielName); if (zielRole) await member.roles.add(zielRole).catch(()=>{}); await interaction.reply({ content: `🎉 ${member} wurde angenommen und hat die Rolle **${zielName}** bekommen!` }); await interaction.channel.send(`Herzlichen Glückwunsch ${member}! 🎉 Du bist jetzt **${zielName}**!`); }
        bewerbungen.delete(bewerberId); await interaction.channel.send({ content: 'Was willst du mit dem Kanal machen?', components: [closeRow] });
      } else {
        if (member && bewerberRole && member.roles.cache.has(bewerberRole.id)) await member.roles.remove(bewerberRole).catch(()=>{}); await interaction.reply({ content: `${member ? member : 'Bewerber'} wurde abgelehnt.` }); bewerbungen.delete(bewerberId); await interaction.channel.send({ content: 'Was willst du mit dem Kanal machen?', components: [closeRow] });
      }
      return;
    }
    if (interaction.customId === 'bew_close') { if (interaction.user.id !== interaction.guild.ownerId) return interaction.reply({ content: 'Nur der Owner kann schließen!', ephemeral: true }); await interaction.reply({ content: 'Wird geschlossen...' }); setTimeout(() => interaction.channel.delete().catch(()=>{}), 2000); return; }
    if (interaction.customId === 'bew_keep') { await interaction.reply({ content: 'Okay, Kanal bleibt offen!', ephemeral: true }); return; }
    if (interaction.customId.startsWith('giveaway_join_')) {
      const msgId = interaction.customId.split('_')[2]; if (!global.giveaways) global.giveaways = new Map(); if (!global.giveaways.has(msgId)) global.giveaways.set(msgId, new Set()); const set = global.giveaways.get(msgId); if (set.has(interaction.user.id)) return interaction.reply({ content: 'Du bist schon dabei!', ephemeral: true }); set.add(interaction.user.id); return interaction.reply({ content: '🎉 Du nimmst teil!', ephemeral: true });
    }
  }
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;
    if (commandName === 'setup-all') {
      await interaction.deferReply({ ephemeral: true });
      const synced = await syncAlles(interaction.guild);
      const verifyRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_btn').setLabel('Verifizieren').setStyle(ButtonStyle.Success).setEmoji('✅'));
      if (synced.verifyCh) await synced.verifyCh.send({ embeds: [new EmbedBuilder().setTitle('🔒 Verifizierung').setDescription('Klicke auf den Button, um eine Mathe-Aufgabe zu bekommen. Wenn du sie richtig löst, wirst du verifiziert!').setColor(0x57F287)], components: [verifyRow] }).catch(()=>{});
      const ticketRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_create').setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
      if (synced.supportCh) await synced.supportCh.send({ embeds: [new EmbedBuilder().setTitle('🎫 Support Ticket').setDescription('Brauchst du Hilfe? Klicke auf den Button, um ein Ticket zu erstellen.').setColor(0x5865F2)], components: [ticketRow] }).catch(()=>{});
      const bewRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bew_team').setLabel('Als Team bewerben').setStyle(ButtonStyle.Success).setEmoji('💼'), new ButtonBuilder().setCustomId('bew_creator').setLabel('Als Content Creator bewerben').setStyle(ButtonStyle.Primary).setEmoji('🎬'));
      if (synced.bewCh) await synced.bewCh.send({ embeds: [new EmbedBuilder().setTitle('📝 Bewerbungen').setDescription('Willst du ins Team oder Content Creator werden? Wähle unten aus!').setColor(0xFF9900)], components: [bewRow] }).catch(()=>{});
      return interaction.editReply({ content: '✅ Fertig! Doppelte gelöscht, alle Kanäle sortiert, #server-logs ist jetzt NUR für dich sichtbar!' });
    }
    if (commandName === 'verify-setup') { const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_btn').setLabel('Verifizieren').setStyle(ButtonStyle.Success).setEmoji('✅')); await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🔒 Verifizierung').setDescription('Klicke auf den Button, um eine Mathe-Aufgabe zu bekommen.').setColor(0x57F287)], components: [row] }); return interaction.reply({ content: 'Verify-Nachricht gepostet!', ephemeral: true }); }
    if (commandName === 'ticket-setup') { const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_create').setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫')); await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🎫 Support Ticket').setDescription('Brauchst du Hilfe? Klicke auf den Button!').setColor(0x5865F2)], components: [row] }); return interaction.reply({ content: 'Ticket-Nachricht gepostet!', ephemeral: true }); }
    if (commandName === 'bewerbung-setup') { const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bew_team').setLabel('Als Team bewerben').setStyle(ButtonStyle.Success).setEmoji('💼'), new ButtonBuilder().setCustomId('bew_creator').setLabel('Als Content Creator bewerben').setStyle(ButtonStyle.Primary).setEmoji('🎬')); await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('📝 Bewerbungen').setDescription('Willst du ins Team oder Content Creator werden?').setColor(0xFF9900)], components: [row] }); return interaction.reply({ content: 'Bewerbungs-Panel gepostet!', ephemeral: true }); }
    if (commandName === 'schlafen') { const ch = interaction.guild.channels.cache.find(c => c.name === 'support'); const text = SLEEP_TEXTS[Math.floor(Math.random() * SLEEP_TEXTS.length)]; if (ch) await ch.send(`🔴 **Ich geh schlafen...**\n${text}`); return interaction.reply({ content: 'Gute Nacht! 😴', ephemeral: true }); }
    if (commandName === 'giveaway') { const preis = interaction.options.getString('preis'); const minuten = interaction.options.getInteger('minuten'); const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join_temp`).setLabel('Teilnehmen').setStyle(ButtonStyle.Success).setEmoji('🎉')); const msg = await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎉 GIVEAWAY').setDescription(`**Preis:** ${preis}\n**Endet in:** ${minuten} Minuten`).setColor(0xFEE75C)], components: [row], fetchReply: true }); const msgId = msg.id; const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`giveaway_join_${msgId}`).setLabel('Teilnehmen').setStyle(ButtonStyle.Success).setEmoji('🎉')); await msg.edit({ components: [row2] }); setTimeout(async () => { const set = global.giveaways?.get(msgId) || new Set(); const arr = [...set]; if (arr.length === 0) return interaction.followUp({ content: `Giveaway vorbei - leider hat niemand teilgenommen. Preis war: ${preis}` }); const winner = arr[Math.floor(Math.random() * arr.length)]; await interaction.followUp({ content: `🎉 Gewinner für **${preis}** ist <@${winner}>!` }); log(interaction.guild, '🎉 Giveaway beendet', `Gewinner: <@${winner}> - Preis: ${preis}`, 0xFEE75C); }, minuten * 60 * 1000); return; }
    if (commandName === 'warn') { const user = interaction.options.getUser('user'); const grund = interaction.options.getString('grund'); await interaction.reply({ content: `⚠️ ${user} wurde verwarnt. Grund: ${grund}` }); try { await user.send(`Du wurdest auf **${interaction.guild.name}** verwarnt. Grund: ${grund}`); } catch {} log(interaction.guild, '⚠️ Warn', `${user} von ${interaction.user} verwarnt. Grund: ${grund}`, 0xFEE75C); return; }
    if (commandName === 'timeout') { const member = interaction.options.getMember('user'); const minuten = interaction.options.getInteger('minuten'); const grund = interaction.options.getString('grund') || 'Kein Grund'; await member.timeout(minuten * 60 * 1000, grund); await interaction.reply({ content: `🔇 ${member} für ${minuten} Min getimeoutet. Grund: ${grund}` }); log(interaction.guild, '🔇 Timeout', `${member} für ${minuten} Min. Grund: ${grund}`, 0xFEE75C); return; }
    if (commandName === 'kick') { const member = interaction.options.getMember('user'); const grund = interaction.options.getString('grund') || 'Kein Grund'; await member.kick(grund); await interaction.reply({ content: `👢 ${member} gekickt. Grund: ${grund}` }); log(interaction.guild, '👢 Kick', `${member} gekickt. Grund: ${grund}`, 0xED4245); return; }
    if (commandName === 'ban') { const member = interaction.options.getMember('user'); const grund = interaction.options.getString('grund') || 'Kein Grund'; await member.ban({ reason: grund }); await interaction.reply({ content: `🔨 ${member} gebannt. Grund: ${grund}` }); log(interaction.guild, '🔨 Ban', `${member} gebannt. Grund: ${grund}`, 0xED4245); return; }
    if (commandName === 'unban') { const id = interaction.options.getString('userid'); await interaction.guild.members.unban(id); await interaction.reply({ content: `✅ <@${id}> entbannt.` }); log(interaction.guild, '✅ Unban', `<@${id}> entbannt`, 0x57F287); return; }
    if (commandName === 'clear') { const anzahl = interaction.options.getInteger('anzahl'); await interaction.channel.bulkDelete(anzahl, true); await interaction.reply({ content: `🧹 ${anzahl} Nachrichten gelöscht.`, ephemeral: true }); log(interaction.guild, '🧹 Clear', `${interaction.user} hat ${anzahl} Nachrichten gelöscht`, 0x5865F2); return; }
  }
});

client.on('messageDelete', (msg) => { if (msg.guild && msg.author && !msg.author.bot) log(msg.guild, '🗑️ Nachricht gelöscht', `**Von:** ${msg.author}\n**Channel:** ${msg.channel}\n**Inhalt:** ${msg.content || '(kein Text)'}`, 0xED4245); });
client.on('guildMemberRemove', (member) => log(member.guild, '👋 Mitglied gegangen', `${member.user.tag} hat den Server verlassen`, 0xED4245));
client.login(process.env.DISCORD_TOKEN);
