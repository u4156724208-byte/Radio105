
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, NoSubscriberBehavior } = require('@discordjs/voice');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// Server per UptimeRobot - DEVE rispondere 200
app.get('/', (req, res) => {
  res.status(200).send('Radio 105 ON - UptimeRobot OK - ' + new Date().toISOString());
});
app.listen(PORT, () => console.log(`Keepalive server ON port ${PORT} for UptimeRobot`));

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1422364839946223698';
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID || '1554283481410965585';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

const RADIO_URLS = [
  'https://ice05.fluidstream.net/R105.aac',
  'https://icecast.105.net/105.mp3',
  'http://icecast.unitedradio.it/Radio105.mp3'
];

let current = 0;
let connection = null;
let player = null;

async function startRadio() {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    console.log(`[RENDER] Guild: ${guild.name}`);

    connection = joinVoiceChannel({
      channelId: VOICE_CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    connection.subscribe(player);

    const play = () => {
      const url = RADIO_URLS[current];
      console.log(`[RADIO] Play ${url}`);
      try {
        const resource = createAudioResource(url, { inlineVolume: false });
        player.play(resource);
        console.log(`[OK] RADIO 105 ON AIR - ${url}`);
      } catch (e) {
        console.error('[PLAY ERROR]', e.message);
        current = (current + 1) % RADIO_URLS.length;
        setTimeout(play, 3000);
      }
    };

    player.on(AudioPlayerStatus.Idle, () => {
      console.log('[PLAYER] Idle -> replay');
      play();
    });

    player.on('error', (e) => {
      console.error('[PLAYER ERROR]', e.message);
      current = (current + 1) % RADIO_URLS.length;
      setTimeout(play, 2000);
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log('[VOICE] Disconnected, reconnect in 5s');
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch {
        setTimeout(startRadio, 5000);
      }
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20000);
    play();

  } catch (e) {
    console.error('[START ERROR]', e.message);
    setTimeout(startRadio, 8000);
  }
}

client.once('ready', () => {
  console.log(`Loggato come ${client.user.tag} - FINALE RENDER + UPTIMEROBOT`);
  startRadio();
});

// Watchdog ogni 30s se cade
setInterval(() => {
  if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed || connection.state.status === VoiceConnectionStatus.Disconnected) {
    console.log('[WATCHDOG] Riconnessione');
    startRadio();
  }
}, 30000);

client.login(TOKEN);
