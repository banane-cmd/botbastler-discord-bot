const http = require('http');
http.createServer((req, res) => { res.writeHead(200); res.end('Bot läuft!'); }).listen(process.env.PORT || 3000);
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, SlashCommandBuilder, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
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

async function log(guild, title, desc, color = 0x2b2d31) {
  const ch = guild.channels.cache.find(c => c.name.includes('server-logs'));
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

// ================= FINALE STRUKTUR - ALLES RICHTIG =================
const FINALE_STRUKTUR = [
  { kat: '🚀 START', pos: 0, channels: [
    { emoji: '👋', name: 'willkommen', topic: '👋 Willkommen bei BotBastler!' },
    { emoji: '✅', name: 'verify', topic: '✅ Hier verifizieren!' },
    { emoji: '📜', name: 'regeln', topic: '📜 Regeln lesen!' },
    { emoji: '📢', name: 'ankündigungen', topic: '📢 Neuigkeiten!' },
    { emoji: '🤖', name: 'über-botbastler', topic: '🤖 Wer sind wir?' },
    { emoji: '🤖', name: 'bot-status', topic: '🤖 Bot schläft / ist wach - hier wecken!' },
  ]},
  { kat: '💰 LEISTUNGEN', pos: 1, channels: [
    { emoji: '💸', name: 'preise', topic: '💸 Unsere Preise' },
    { emoji: '🖼️', name: 'portfolio', topic: '🖼️ Unsere Arbeiten' },
    { emoji: '🛠️', name: 'unsere-leistungen', topic: '🛠️ Was wir machen' },
    { emoji: '📋', name: 'so-läuft-es-ab', topic: '📋 Ablauf' },
    { emoji: '⭐', name: 'bewertungen', topic: '⭐ Bewertungen' },
    { emoji: '🎁', name: 'gewinnspiele', topic: '🎁 Giveaways' },
  ]},
  { kat: '💬 ANFRAGEN & COMMUNITY', pos: 2, channels: [
    { emoji: '🆘', name: 'support', topic: '🆘 Hilfe hier!' },
    { emoji: '💬', name: 'community-chat', topic: '💬 Quatschen - Deutsch' },
    { emoji: '🇬🇧', name: 'english-chat', topic: '🇬🇧 English Only!' },
    { emoji: '💡', name: 'feedback', topic: '💡 Feedback' },
    { emoji: '🎫', name: 'ticket-eröffnen', topic: '🎫 Ticket mit Formular erstellen!' },
    { emoji: '💡', name: 'ideen', topic: '💡 Deine Ideen' },
    { emoji: '📊', name: 'umfragen', topic: '📊 Umfragen' },
    { emoji: '😂', name: 'memes', topic: '😂 Memes' },
    { emoji: '📸', name: 'media', topic: '📸 Bilder & Videos' },
    { emoji: '🎉', name: 'events', topic: '🎉 Events' },
    { emoji: '🤝', name: 'partner-werbung', topic: '🤝 Partner' },
    { emoji: '🎙️', name: 'Community Lounge', type: 2, topic: '🎙️ Voice - Chillen' },
    { emoji: '🎮', name: 'Gaming Talk', type: 2, topic: '🎮 Voice - Zocken' },
    { emoji: '🎵', name: 'Musik & Chill', type: 2, topic: '🎵 Voice - Musik' },
  ]},
  { kat: '🔑 KUNDENBEREICH', pos: 3, channels: [
    { emoji: 'ℹ️', name: 'kunden-info', topic: 'ℹ️ Infos für Kunden' },
    { emoji: '📢', name: 'kunden-updates', topic: '📢 Updates für Kunden' },
    { emoji: '💬', name: 'kunden-chat', topic: '💬 Kunden Chat' },
    { emoji: '📞', name: 'Kundengespräch', type: 2, topic: '📞 Voice - Kundengespräch' },
  ]},
  { kat: '🛠️ INTERN · TEAM', pos: 4, channels: [
    { emoji: '📦', name: 'aufträge', topic: '📦 Aufträge' },
    { emoji: '📅', name: 'planung', topic: '📅 Planung' },
    { emoji: '💬', name: 'team-chat', topic: '💬 Team Chat' },
    { emoji: '📝', name: 'interne-notizen', topic: '📝 Notizen' },
    { emoji: '📝', name: 'bewerbungen', topic: '📝 Bewerbungen' },
    { emoji: '📊', name: 'team-abstimmungen', topic: '📊 Abstimmungen' },
    { emoji: '💡', name: 'team-ideen', topic: '💡 Team Ideen' },
    { emoji: '📢', name: 'team-ankündigungen', topic: '📢 Team News' },
    { emoji: '💬', name: 'team-feedback', topic: '💬 Team Feedback' },
    { emoji: '📅', name: 'team-termine', topic: '📅 Termine' },
    { emoji: '🎙️', name: 'Team Talk', type: 2, topic: '🎙️ Voice - Team' },
    { emoji: '📞', name: 'Team Meeting', type: 2, topic: '📞 Voice - Meeting' },
  ]},
  { kat: '👑 NUR OWNER', pos: 5, channels: [
    { emoji: '📜', name: 'server-logs', topic: '📜 Nur Owner!' },
  ]},
];

// ================= INFO-TEXTE DEUTSCH + ENGLISCH =================
const INFO_TEXTE = {
  'regeln': `**📜 Regeln - Bitte genau lesen! / Rules - Please read carefully!**\n\n**Wer diesem Server beitritt, akzeptiert automatisch alle Regeln!**\n**Anyone who joins this server automatically accepts all rules!**\n\n**DEUTSCH:**\n1. **Sei respektvoll!** Kein Beleidigen, kein Mobbing, kein Rassismus, kein Sexismus, keine Hassrede.\n2. **Kein Spam!** Nicht 10x die gleiche Nachricht, keine unnötigen Pings, keine Kettenbriefe.\n3. **Keine Werbung!** Keine Werbung für andere Server, Bots oder Produkte - außer in #partner-werbung und nur mit Erlaubnis vom Team.\n4. **Kein NSFW / 18+ Inhalt!** Keine pornografischen, gewalttätigen oder ekelhaften Inhalte.\n5. **Keine privaten Daten!** Teil keine Adressen, Telefonnummern, Passwörter oder sonstige private Sachen - weder von dir noch von anderen.\n6. **Kein Cheaten / Hacken!** Keine Hacks, keine Cheats, keine Scam-Links, keine Phishing-Links.\n7. **Support nur über Tickets!** Schreib Team-Mitglieder bitte nicht privat an. Mach ein Ticket in #ticket-eröffnen auf.\n8. **Hör auf das Team!** Wenn Team oder Owner was sagen, dann gilt das.\n9. **Kein Leaken!** Was im Kundenbereich oder in Tickets steht, bleibt da!\n10. **Kein Alt-Account / Ban-Umgehung!** Wer gebannt ist, bleibt gebannt.\n11. **Discord TOS gelten!** Die Discord Regeln gelten hier natürlich auch.\n12. **Eigener Content!** Keine geklauten Sachen als deine eigenen ausgeben.\n\n**Bei Verstoß: Warn / Timeout / Kick / Ban**\n\n**ENGLISH:**\n1. **Be respectful!** No insults, no bullying, no racism, no sexism, no hate speech.\n2. **No spam!** Don't send the same message 10x, no unnecessary pings, no chain messages.\n3. **No advertising!** No ads for other servers, bots or products - except in #partner-werbung and only with team permission.\n4. **No NSFW / 18+ content!** No pornographic, violent or disgusting content.\n5. **No private data!** Don't share addresses, phone numbers, passwords or other private stuff.\n6. **No cheating / hacking!** No hacks, cheats, scam links or phishing links.\n7. **Support only via tickets!** Don't DM team members. Open a ticket in #ticket-eröffnen.\n8. **Listen to the team!** When team or owner says something, it counts.\n9. **No leaking!** What is in the customer area or tickets, stays there!\n10. **No alt accounts / ban evasion!** If you are banned, you stay banned.\n11. **Discord TOS apply!** Discord's rules apply here too.\n12. **Own content only!** Don't claim stolen stuff as your own.\n\n**If you break the rules: Warn / Timeout / Kick / Ban**`,
  'über-botbastler': `**🤖 Wer sind wir? / Who are we?**\n\n**DEUTSCH:** Wir sind **BotBastler Studio** - wir bauen dir deinen eigenen Discord-Bot und deinen eigenen Discord-Server - genau so, wie du ihn dir vorstellst!\n**ENGLISH:** We are **BotBastler Studio** - we build your own Discord Bot and your own Discord Server - exactly how you imagine it!\n\nEgal ob klein oder groß - wir machen das! / No matter small or big - we do it!`,
  'preise': `**💸 Preise / Prices**\n\n**🤖 DISCORD BOT:**\n- Kleiner Bot (z.B. Verify, Tickets, Warn-System): **ab 5€ / from 5€**\n- Mittlerer Bot (mit Bewerbung, Giveaway, Logs & mehr): **ab 10€ / from 10€**\n- Großer Custom Bot (alles was du willst): **ab 15-20€ / from 15-20€ - Preis nach Absprache / price on request**\n\n**🛠️ DISCORD SERVER:**\n- Kleiner Server (Kanäle + Rollen + Regeln): **ab 5€ / from 5€**\n- Kompletter Server (mit allem: Tickets, Bewerbung, Kundenbereich...): **ab 15-20€ / from 15-20€**\n\n**🔥 BOT + SERVER ZUSAMMEN / TOGETHER: 25€ - du sparst! / you save!**\n\n**Bezahlung / Payment: NUR Paysafecard & Überweisung / ONLY Paysafecard & Bank Transfer**\n\nMach einfach ein Ticket auf und sag uns, was du brauchst - dann sagen wir dir den genauen Preis!\nJust open a ticket and tell us what you need - then we tell you the exact price!`,
  'portfolio': `**🖼️ Portfolio / Our Work**\n\n**DEUTSCH:** Hier siehst du, was wir schon gebaut haben! Bots, Server, alles was wir gemacht haben - hier als Bilder / Videos!\n**ENGLISH:** Here you can see what we have already built! Bots, servers, everything we made - here as pictures / videos!\n\nBald kommen hier die ersten Projekte! / First projects coming soon!`,
  'unsere-leistungen': `**🛠️ Was wir machen / What we do:**\n\n**DEUTSCH:**\n**1. Discord Bots 🤖** Verify-System, Ticket-System mit Formular, Bewerbungs-System, Giveaways, Warn / Timeout / Kick / Ban, Logs, Schlafen / Wach-System und viel mehr!\n**2. Discord Server 🛠️** Komplett eingerichtet: Kategorien, Kanäle mit Emojis, Rollen, Berechtigungen, Kundenbereich, Team-Bereich - alles fertig!\n**3. Bot + Server Kombi 🔥** Das Beste aus beidem - Server + Bot, die perfekt zusammenpassen!\n**4. Support & Hilfe 🆘** Auch nach dem Kauf helfen wir dir weiter!\n\n**ENGLISH:**\n**1. Discord Bots 🤖** Verify system, ticket system with form, application system, giveaways, warn / timeout / kick / ban, logs and much more!\n**2. Discord Servers 🛠️** Fully set up: categories, channels with emojis, roles, permissions, customer area, team area - all done!\n**3. Bot + Server Combo 🔥** The best of both - server + bot that fit perfectly!\n**4. Support & Help 🆘** Even after purchase we help you!\n\nInteresse? Ticket in #ticket-eröffnen aufmachen! / Interested? Open a ticket in #ticket-eröffnen!`,
  'so-läuft-es-ab': `**📋 So läuft es ab / How it works:**\n\n**DEUTSCH:**\n**1. Ticket aufmachen 🎫** Geh zu #ticket-eröffnen und füll das Formular aus: Was brauchst du? Was soll es können? Bis wann? Budget?\n**2. Wir quatschen 💬** Wir reden mit dir im Ticket und klären alles: Preis, was genau gebaut wird, bis wann fertig.\n**3. Wir bauen 🛠️** Wir bauen deinen Bot / Server. Du bekommst Updates in deinem Ticket!\n**4. Du testest ✅** Du guckst dir alles an und sagst, ob noch was geändert werden soll.\n**5. Fertig & Bezahlen 💸** Wenn alles passt, bezahlst du und bekommst deinen Bot / Server!\n\n**ENGLISH:**\n**1. Open a ticket 🎫** Go to #ticket-eröffnen and fill the form: What do you need? What should it do? Until when? Budget?\n**2. We talk 💬** We talk with you in the ticket and clarify everything: price, what will be built, until when.\n**3. We build 🛠️** We build your bot / server. You get updates in your ticket!\n**4. You test ✅** You check everything and say if something should be changed.\n**5. Done & Pay 💸** If everything fits, you pay and get your bot / server!\n\nEasy, oder? / Easy, right? 😎`,
  'bewertungen': `**⭐ Bewertungen / Reviews**\n\n**DEUTSCH:** Warst du schon Kunde bei uns? Dann bewerte uns hier!\n**So geht's:** Schreib in #feedback oder in deinem Ticket:\n1. Was hast du bestellt? Bot / Server / Beides?\n2. Wie viele Sterne? ⭐⭐⭐⭐⭐ (1-5)\n3. Wie war es? Warst du zufrieden? Was war gut? Was können wir besser machen?\nWir posten deine Bewertung dann hier!\n\n**ENGLISH:** Have you been a customer? Then rate us here!\n**How it works:** Write in #feedback or in your ticket:\n1. What did you order? Bot / Server / Both?\n2. How many stars? ⭐⭐⭐⭐⭐ (1-5)\n3. How was it? Were you happy? What was good? What can we do better?\nWe will post your review here!\n\nDanke für euer Vertrauen! / Thanks for your trust! ❤️`,
  'partner-werbung': `**🤝 Partner-Werbung / Partner Advertising**\n\n**DEUTSCH:** Hier dürfen unsere Partner Werbung machen! Nur mit Erlaubnis vom Team! Schreib uns ein Ticket, wenn du Partner werden willst. 1x Werbung pro Tag, kein Spam!\n**ENGLISH:** Here our partners can advertise! Only with team permission! Open a ticket if you want to become a partner. 1 ad per day, no spam!`,
  'ideen': `**💡 Ideen / Ideas**\n\n**DEUTSCH:** Hast du eine Idee für uns? Für einen Bot? Für den Server? Für ein neues Feature? Schreib sie hier rein! Die besten Ideen bauen wir vielleicht sogar!\n**ENGLISH:** Do you have an idea for us? For a bot? For the server? For a new feature? Write it here! Maybe we will build the best ideas!`,
  'english-chat': `**💬 English Chat / Englischer Chat**\n\n**ENGLISH ONLY HERE!** This channel is only for English! Please speak English here!\n**DEUTSCH:** Hier wird NUR Englisch gesprochen! Für Deutsch geh zu #community-chat!`,
  'community-chat': `**💬 Community Chat**\n\n**DEUTSCH:** Hier wird Deutsch gequatscht! Für Englisch geh zu #english-chat!\n**ENGLISH:** German chat here! For English go to #english-chat!`,
  'kunden-info': `**ℹ️ Infos für Kunden / Info for Customers**\n\n**DEUTSCH:** Hey Kunde! Schön, dass du bei uns bestellt hast! Hier findest du alle Infos zu deinem Auftrag. Dein Ticket ist dein Haupt-Ort - da quatschen wir alles ab! Bei Fragen: Einfach im Ticket schreiben!\n**ENGLISH:** Hey customer! Nice that you ordered from us! Here you find all info about your order. Your ticket is your main place - we talk everything there! If you have questions: Just write in the ticket!`,
  'bot-status': `**🤖 Bot-Status / Bot Status**\n\n**DEUTSCH:** Hier siehst du, ob ich schlafe oder wach bin! 😴 / 👀\nWenn ich schlafe, schreib einfach hier was rein und ich wache nach 60 Sekunden wieder auf!\nMit **/schlafen** schickt mich das Team schlafen!\n\n**ENGLISH:** Here you can see if I am sleeping or awake! 😴 / 👀\nIf I am sleeping, just write something here and I will wake up after 60 seconds!\nWith **/schlafen** the team sends me to sleep!`,
};

async function postIfNotExists(channel, checkText, content) {
  if (!channel) return;
  try {
    const msgs = await channel.messages.fetch({ limit: 20 }).catch(()=>null);
    if (msgs) {
      for (const m of msgs.values()) {
        const text = (m.content || '') + ' ' + (m.embeds.map(e => (e.title||'') + ' ' + (e.description||'')).join(' '));
        if (text.includes(checkText)) return;
      }
    }
    await channel.send({ embeds: [new EmbedBuilder().setDescription(content).setColor(0x5865F2)] }).catch(()=>{});
  } catch {}
}

async function syncAlles(guild) {
  for (const name of SYNC_ROLLEN) {
    if (!guild.roles.cache.find(r => r.name === name)) await guild.roles.create({ name }).catch(()=>{});
  }
  const rNeu = guild.roles.cache.find(r => r.name === 'Neu');
  const rMitglied = guild.roles.cache.find(r => r.name === 'Mitglied');
  let verifyCh, supportTicketCh, bewCh;

  for (const katDef of FINALE_STRUKTUR) {
    let kat = guild.channels.cache.find(c => c.name === katDef.kat && c.type === 4);
    if (!kat) kat = await guild.channels.create({ name: katDef.kat, type: 4 }).catch(()=>null);
    if (!kat) continue;
    await kat.setPosition(katDef.pos).catch(()=>{});

    for (let i = 0; i < katDef.channels.length; i++) {
      const chDef = katDef.channels[i];
      const type = chDef.type || 0;
      const nameMitEmoji = `${chDef.emoji}-${chDef.name.toLowerCase().replace(/ /g, '-')}`;
      let ch = guild.channels.cache.find(c => {
        const n = c.name.toLowerCase();
        return c.type === type && (n === nameMitEmoji.toLowerCase() || n === chDef.name.toLowerCase().replace(/ /g, '-') || n.includes(chDef.name.toLowerCase()));
      });
      if (!ch) {
        let overwrites = [{ id: guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }];
        if (chDef.name === 'verify') overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: rNeu.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }];
        if (chDef.name === 'bewerbungen') overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: rMitglied.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, { id: rNeu.id, deny: [PermissionFlagsBits.ViewChannel] }];
        if (chDef.name === 'server-logs') overwrites = [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: guild.ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }];
        ch = await guild.channels.create({ name: nameMitEmoji, type, parent: kat.id, topic: chDef.topic, permissionOverwrites: overwrites }).catch(async () => {
          return await guild.channels.create({ name: chDef.name.toLowerCase().replace(/ /g, '-'), type, parent: kat.id, topic: chDef.topic, permissionOverwrites: overwrites }).catch(()=>null);
        });
      } else {
        await ch.setParent(kat.id).catch(()=>{});
        if (chDef.name === 'server-logs') {
          await ch.permissionOverwrites.set([{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: guild.ownerId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }]).catch(()=>{});
        }
        if (type === 0 && chDef.topic) await ch.setTopic(chDef.topic).catch(()=>{});
      }
      if (ch) await ch.setPosition(i).catch(()=>{});
      if (chDef.name === 'verify') verifyCh = ch;
      if (chDef.name === 'ticket-eröffnen') supportTicketCh = ch;
      if (chDef.name === 'bewerbungen') bewCh = ch;
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
    new SlashCommandBuilder().setName('setup-all').setDescription('ALLES neu erstellen: Rollen + Kanäle mit Emoji + Panels').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
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
  const ch = member.guild.channels.cache.find(c => c.name.includes('willkommen'));
  if (ch) {
    const embed = new EmbedBuilder().setTitle(`Willkommen, ${member.user.username}! 🎉`).setDescription(`Schön dass du da bist! Geh zu #verify und verifiziere dich mit dem Button.\n\nWelcome! Go to #verify and verify yourself with the button.\n\n**Mit deinem Beitritt akzeptierst du automatisch unsere Regeln in #regeln!**\n**By joining you automatically accept our rules in #regeln!**`).setColor(0x57F287).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
    ch.send({ content: `${member}`, embeds: [embed] }).catch(()=>{});
  }
  log(member.guild, '👋 Mitglied beigetreten', `${member} (${member.id}) ist beigetreten - Rolle Neu gegeben`, 0x57F287);
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  // ===== BOT-STATUS - AUFWECKEN =====
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
  if (interaction.isModalSubmit() && interaction.customId === 'ticket_modal') {
    const was = interaction.fields.getTextInputValue('ticket_was');
    const koennen = interaction.fields.getTextInputValue('ticket_koennen');
    const bisWann = interaction.fields.getTextInputValue('ticket_biswann');
    const budget = interaction.fields.getTextInputValue('ticket_budget');
    const existing = interaction.guild.channels.cache.find(c => c.name.includes(`ticket-${interaction.user.username.toLowerCase()}`));
    if (existing) return interaction.reply({ content: `Du hast schon ein Ticket: ${existing}`, ephemeral: true });
    const staffRole = getRole(interaction.guild, TICKET_STAFF_ROLE);
    const kundeRole = getRole(interaction.guild, ROLE_KUNDE);
    if (kundeRole) await interaction.member.roles.add(kundeRole).catch(()=>{});
    const ticketCat = interaction.guild.channels.cache.find(c => c.name.includes('ANFRAGEN') && c.type === 4);
    const channel = await interaction.guild.channels.create({ name: `🎫-ticket-${interaction.user.username.toLowerCase()}`, type: ChannelType.GuildText, parent: ticketCat ? ticketCat.id : null, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])] }).catch(async () => await interaction.guild.channels.create({ name: `ticket-${interaction.user.username.toLowerCase()}`, type: ChannelType.GuildText, parent: ticketCat ? ticketCat.id : null, permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }, ...(staffRole ? [{ id: staffRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : [])] }));
    const closeRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
    await channel.send({ content: `${interaction.user} ${staffRole ? staffRole : ''}`, embeds: [new EmbedBuilder().setTitle('🎫 Neues Ticket - Formular ausgefüllt').setDescription(`**Was brauchst du?**\n${was}\n\n**Was soll der Bot / Server können?**\n${koennen}\n\n**Bis wann brauchst du es?**\n${bisWann}\n\n**Budget:**\n${budget}`).setColor(0x5865F2)], components: [closeRow] });
    await interaction.reply({ content: `✅ Ticket erstellt: ${channel} - Du hast jetzt die Rolle **${ROLE_KUNDE}**!`, ephemeral: true });
    log(interaction.guild, '🎫 Ticket erstellt', `${interaction.user} hat ein Ticket erstellt: ${channel}`, 0x5865F2);
    return;
  }
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
      const modal = new ModalBuilder().setCustomId('ticket_modal').setTitle('🎫 Ticket erstellen');
      const q1 = new TextInputBuilder().setCustomId('ticket_was').setLabel('Was brauchst du? Bot / Server / Beides?').setStyle(TextInputStyle.Short).setPlaceholder('z.B. Bot').setRequired(true);
      const q2 = new TextInputBuilder().setCustomId('ticket_koennen').setLabel('Was soll der Bot / Server können?').setStyle(TextInputStyle.Paragraph).setPlaceholder('Beschreib mal genau, was er können soll...').setRequired(true);
      const q3 = new TextInputBuilder().setCustomId('ticket_biswann').setLabel('Bis wann brauchst du es?').setStyle(TextInputStyle.Short).setPlaceholder('z.B. bis Freitag / so schnell wie möglich').setRequired(true);
      const q4 = new TextInputBuilder().setCustomId('ticket_budget').setLabel('Budget?').setStyle(TextInputStyle.Short).setPlaceholder('z.B. 5€ / 10€ / 25€').setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(q1), new ActionRowBuilder().addComponents(q2), new ActionRowBuilder().addComponents(q3), new ActionRowBuilder().addComponents(q4));
      await interaction.showModal(modal);
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
      if (synced.verifyCh) {
        const msgs = await synced.verifyCh.messages.fetch({ limit: 10 }).catch(()=>null);
        let hasBtn = false; if (msgs) for (const m of msgs.values()) if (m.components.length > 0) hasBtn = true;
        if (!hasBtn) await synced.verifyCh.send({ embeds: [new EmbedBuilder().setTitle('🔒 Verifizierung').setDescription('Klicke auf den Button, um eine Mathe-Aufgabe zu bekommen. Wenn du sie richtig löst, wirst du verifiziert!').setColor(0x57F287)], components: [verifyRow] }).catch(()=>{});
      }
      const ticketRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_create').setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
      if (synced.supportCh) {
        const msgs = await synced.supportCh.messages.fetch({ limit: 10 }).catch(()=>null);
        let hasBtn = false; if (msgs) for (const m of msgs.values()) if (m.components.length > 0) hasBtn = true;
        if (!hasBtn) await synced.supportCh.send({ embeds: [new EmbedBuilder().setTitle('🎫 Support Ticket').setDescription('Brauchst du Hilfe? Klicke auf den Button und fülle das Formular aus!\n\n**Formular:**\n1. Was brauchst du? Bot / Server / Beides?\n2. Was soll der Bot / Server können?\n3. Bis wann brauchst du es?\n4. Budget?').setColor(0x5865F2)], components: [ticketRow] }).catch(()=>{});
      }
      const bewRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bew_team').setLabel('Als Team bewerben').setStyle(ButtonStyle.Success).setEmoji('💼'), new ButtonBuilder().setCustomId('bew_creator').setLabel('Als Content Creator bewerben').setStyle(ButtonStyle.Primary).setEmoji('🎬'));
      if (synced.bewCh) {
        const msgs = await synced.bewCh.messages.fetch({ limit: 10 }).catch(()=>null);
        let hasBtn = false; if (msgs) for (const m of msgs.values()) if (m.components.length > 0) hasBtn = true;
        if (!hasBtn) await synced.bewCh.send({ embeds: [new EmbedBuilder().setTitle('📝 Bewerbungen').setDescription('Willst du ins Team oder Content Creator werden? Wähle unten aus!').setColor(0xFF9900)], components: [bewRow] }).catch(()=>{});
      }
      for (const [key, text] of Object.entries(INFO_TEXTE)) {
        const ch = interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes(key));
        if (ch) {
          let check = 'Regeln'; if (key === 'preise') check = 'Preise'; if (key === 'über-botbastler') check = 'Wer sind wir'; if (key === 'portfolio') check = 'Portfolio'; if (key === 'unsere-leistungen') check = 'Was wir machen'; if (key === 'so-läuft-es-ab') check = 'So läuft es ab'; if (key === 'bewertungen') check = 'Bewertungen'; if (key === 'partner-werbung') check = 'Partner-Werbung'; if (key === 'ideen') check = 'Ideen'; if (key === 'english-chat') check = 'English Chat'; if (key === 'community-chat') check = 'Community Chat'; if (key === 'kunden-info') check = 'Infos für Kunden'; if (key === 'bot-status') check = 'Bot-Status';
          await postIfNotExists(ch, check, text);
        }
      }
      return interaction.editReply({ content: '✅ Fertig! Alles erstellt - NICHTS doppelt! Kanäle, Rollen, Panels & Info-Texte alle da!' });
    }
    if (commandName === 'verify-setup') { const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_btn').setLabel('Verifizieren').setStyle(ButtonStyle.Success).setEmoji('✅')); await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🔒 Verifizierung').setDescription('Klicke auf den Button, um eine Mathe-Aufgabe zu bekommen.').setColor(0x57F287)], components: [row] }); return interaction.reply({ content: 'Verify-Nachricht gepostet!', ephemeral: true }); }
    if (commandName === 'ticket-setup') { const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_create').setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫')); await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('🎫 Support Ticket').setDescription('Brauchst du Hilfe? Klicke auf den Button und fülle das Formular aus!').setColor(0x5865F2)], components: [row] }); return interaction.reply({ content: 'Ticket-Nachricht gepostet!', ephemeral: true }); }
    if (commandName === 'bewerbung-setup') { const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bew_team').setLabel('Als Team bewerben').setStyle(ButtonStyle.Success).setEmoji('💼'), new ButtonBuilder().setCustomId('bew_creator').setLabel('Als Content Creator bewerben').setStyle(ButtonStyle.Primary).setEmoji('🎬')); await interaction.channel.send({ embeds: [new EmbedBuilder().setTitle('📝 Bewerbungen').setDescription('Willst du ins Team oder Content Creator werden?').setColor(0xFF9900)], components: [row] }); return interaction.reply({ content: 'Bewerbungs-Panel gepostet!', ephemeral: true }); }
    if (commandName === 'schlafen') { const ch = interaction.guild.channels.cache.find(c => c.name.includes('bot-status')); const text = SLEEP_TEXTS[Math.floor(Math.random() * SLEEP_TEXTS.length)]; if (ch) await ch.send(`🔴 **Ich geh schlafen...**\n${text}`); return interaction.reply({ content: 'Gute Nacht! 😴 - Nachricht in #bot-status gepostet!', ephemeral: true }); }
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
