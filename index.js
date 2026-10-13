
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, NoSubscriberBehavior, getVoiceConnection } = require('@discordjs/voice');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req,res)=>res.status(200).send('Radio105 OK '+new Date().toISOString()));
app.listen(PORT, ()=>console.log(`Keepalive ON port ${PORT}`));

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1422364839946223698';
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID || '1554283481410965585';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

// LINK NUOVO UFFICIALE FUNZIONANTE
const RADIO_URL = 'http://icecast.unitedradio.it/Radio105.mp3';

async function play() {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const old = getVoiceConnection(GUILD_ID);
    if (old) { try { old.destroy(); } catch {} }

    const conn = joinVoiceChannel({
      channelId: VOICE_CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false
    });

    await entersState(conn, VoiceConnectionStatus.Ready, 30000);
    console.log('[OK] Voce connessa');

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    const resource = createAudioResource(RADIO_URL);
    
    player.play(resource);
    conn.subscribe(player);
    console.log(`[OK] RADIO 105 ON AIR - ${RADIO_URL}`);

    player.on(AudioPlayerStatus.Idle, () => {
      console.log('Idle -> replay');
      try { const r = createAudioResource(RADIO_URL); player.play(r); } catch {}
    });
    player.on('error', e=>{ console.error('Player error', e.message); setTimeout(play, 3000); });

    conn.on(VoiceConnectionStatus.Disconnected, async ()=>{
      console.log('Disconnected, retry 5s');
      setTimeout(play, 5000);
    });

  } catch(e) {
    console.error('[ERROR]', e.message);
    setTimeout(play, 10000);
  }
}

client.once('ready', ()=>{ console.log(`Loggato come ${client.user.tag} - LINK NUOVO`); play(); });
client.login(TOKEN);
