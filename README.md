# botBastler Studio · Discord-Server und Tickets

Dieses Paket richtet deinen Discord-Server für **botBastler Studio** ein und enthält ein privates Ticketsystem für Projektanfragen. Es verbindet sich ausschließlich mit dem Server, dessen `GUILD_ID` du selbst einträgst.

## Was jetzt eingerichtet wird

- Professionelle Start-, Leistungs-, Community-, Kunden- und Team-Bereiche
- Zentrale Seite `#🛍️│unsere-leistungen` statt einzelner Servicekanäle
- Feste Einstiegspreise und ein Portfolio mit Beispielen
- Zusätzliche Rollen: Projektleitung, Ticket-Support, Stammkunde und Partner
- Sorgfältig getrennte Berechtigungen: Team intern, Kundenbereich nur für Kunden, Tickets nur für Kunde und Team
- Ein Ticket-Panel: Kunden geben per Button eine private Anfrage ab
- Automatische Kanaltexte, die der Bot bei späteren Setups aktualisiert

## Einmalig: Struktur und Texte aktualisieren

Öffne PowerShell im Ordner und führe aus:

```powershell
npm.cmd run setup
```

Dabei werden genau diese abgelösten Kanäle entfernt, weil sie durch `#🛍️│unsere-leistungen` ersetzt werden:

- `#🤖│bot-entwicklung`
- `#🧩│server-setup`
- `#🎨│server-design`
- `#📝│projekt-anfrage` (wird durch das Ticketsystem ersetzt)

Eigene andere Kanäle, Rollen und Nachrichten löscht das Skript nicht.

## Tickets aktiv halten

Damit die Schaltfläche **Ticket eröffnen** funktioniert, muss der Ticket-Bot online bleiben. Starte nach dem Setup in einem zweiten PowerShell-Fenster:

```powershell
npm.cmd run bot
```

Lass dieses Fenster geöffnet, solange Tickets funktionieren sollen. Beim Klick auf die Schaltfläche öffnet sich ein Formular. Nach dem Absenden entsteht ein eigener, privater Kanal unter **╭─ PRIVATE PROJEKTE**. Sichtbar sind nur der anfragende Kunde und Teamrollen.

Für dauerhaftes Hosting kannst du den Bot später auf einem eigenen Rechner oder einem Hosting-Dienst laufen lassen. Der Token bleibt dabei immer nur in deiner lokalen `.env`-Datei.

## Berechtigungen des Bots

Für die einfachste Einrichtung kannst du dem Bot im Discord Developer Portal beim Einladen `Administrator` geben. Ohne Administrator benötigt er mindestens:

- Manage Channels
- Manage Roles
- View Channels
- Send Messages
- Read Message History
- Embed Links
- Attach Files

Die Bot-Rolle muss in den Servereinstellungen oberhalb der Rollen stehen, die sie verwaltet.

## Nach dem Setup

1. Gib `👑 Owner` nur dir selbst.
2. Vergib Teammitgliedern nur die Rolle, die sie brauchen.
3. Gib bestehenden Kunden bei Bedarf `💎 Kunde`.
4. Ändere Preise oder Texte direkt oben in `setup.js` im Bereich `CHANNEL_POSTS`.
5. Bei öffentlichen Preisen gilt: Erst das Angebot im Ticket bestätigt den endgültigen Preis.

## Sicherheit

- Teile niemals deine `.env` oder den Bot-Token.
- Wenn ein Token öffentlich wird, setze ihn im Discord Developer Portal sofort zurück.
- Der Ticket-Bot braucht keinen Nachrichteninhalt-Intent und liest keine privaten Nachrichten außerhalb der von ihm erstellten Tickets.
