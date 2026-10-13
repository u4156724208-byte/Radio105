
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const http = require('http');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1422364839946223698';
const CHANNEL_ID = process.env.VOICE_CHANNEL_ID || '1554283481410965585';
const RADIO_URL = process.env.RADIO_URL || 'https://icecast.105.net/105.mp3';
const PORT = process.env.PORT || 3000;

// Mini web server per Render (free) - tiene vivo il bot
http.createServer((req,res) => res.writeHead(200).end('Radio 105 bot online')).listen(PORT, () => console.log('Web keepalive on port '+PORT));

if (!TOKEN) { console.error('Manca DISCORD_TOKEN'); process.exit(1); }
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = createAudioPlayer();
function createResource() { return createAudioResource(RADIO_URL, { inlineVolume: true }); }
async function connectAndPlay() {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const connection = joinVoiceChannel({ channelId: CHANNEL_ID, guildId: GUILD_ID, adapterCreator: guild.voiceAdapterCreator, selfDeaf: false });
    const resource = createResource();
    player.play(resource);
    connection.subscribe(player);
    console.log('[OK] Radio 105 connesso');
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try { await Promise.race([entersState(connection, VoiceConnectionStatus.Signalling, 5000), entersState(connection, VoiceConnectionStatus.Connecting, 5000)]); } catch { setTimeout(connectAndPlay, 5000); }
    });
    player.on(AudioPlayerStatus.Idle, () => { player.play(createResource()); });
  } catch (e) { console.error(e.message); setTimeout(connectAndPlay, 8000); }
}
client.on('ready', () => { console.log(`Loggato ${client.user.tag}`); connectAndPlay(); });
client.login(TOKEN);
