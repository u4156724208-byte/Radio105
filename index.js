
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, StreamType } = require('@discordjs/voice');
const http = require('http');

// --- FIX AUDIO: forza ffmpeg-static ---
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
  console.log('FFMPEG PATH', ffmpegPath);
  if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;
} catch(e) {
  console.error('ffmpeg-static non trovato', e.message);
}

require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1422364839946223698';
const CHANNEL_ID = process.env.VOICE_CHANNEL_ID || '1554283481410965585';
const RADIO_URL = process.env.RADIO_URL || 'https://icecast.105.net/105.mp3';
const PORT = process.env.PORT || 10000;

http.createServer((req,res) => res.writeHead(200).end('Radio 105 bot 3.0 online')).listen(PORT, () => console.log('Web keepalive on '+PORT));

if (!TOKEN) { console.error('Manca DISCORD_TOKEN'); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const player = createAudioPlayer();

function createResource() {
  return createAudioResource(RADIO_URL, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true
  });
}

async function connectAndPlay() {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const connection = joinVoiceChannel({
      channelId: CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    const resource = createResource();
    resource.volume?.setVolume(1.0);
    player.play(resource);
    connection.subscribe(player);
    console.log('[OK] Radio 105 connesso - AUDIO ATTIVO v3.0');

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch {
        console.log('Riconnetto...');
        setTimeout(connectAndPlay, 5000);
      }
    });

    player.on(AudioPlayerStatus.Idle, () => {
      console.log('Stream finito, restart');
      player.play(createResource());
    });

    player.on('error', e => {
      console.error('Player error', e.message, e.stack);
      setTimeout(connectAndPlay, 5000);
    });

  } catch (e) {
    console.error('Connect error', e.message);
    setTimeout(connectAndPlay, 8000);
  }
}

client.on('clientReady', () => {
  console.log(`Loggato ${client.user.tag} v3.0`);
  connectAndPlay();
});
client.on('ready', () => {
  console.log(`Loggato ${client.user.tag} v3.0 (fallback)`);
  connectAndPlay();
});

client.login(TOKEN);
