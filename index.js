
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState, NoSubscriberBehavior, getVoiceConnection, StreamType } = require('@discordjs/voice');
const express = require('express');

const app = express();
app.get('/', (req,res)=>res.status(200).send('Radio105 DEFINITIVA OK - '+new Date().toISOString()));
app.get('/health', (req,res)=>res.status(200).send('ok'));
const PORT = process.env.PORT || 10000;
app.listen(PORT, ()=>console.log(`Keepalive DEFINITIVA ON port ${PORT}`));

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID || '1422364839946223698';
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID || '1554283481410965585';

if(!TOKEN){ console.error('Manca DISCORD_TOKEN'); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
const RADIO_URL = 'https://icecast.unitedradio.it/Radio105.mp3';

let conn, player;

async function playRadio(){
  try{
    const guild = await client.guilds.fetch(GUILD_ID);
    const old = getVoiceConnection(GUILD_ID);
    if(old){ try{ old.destroy(); }catch{} }

    conn = joinVoiceChannel({
      channelId: VOICE_CHANNEL_ID,
      guildId: GUILD_ID,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false
    });

    await entersState(conn, VoiceConnectionStatus.Ready, 30000);
    console.log(`[DEFINITIVA] Voce connessa a ${VOICE_CHANNEL_ID}`);

    player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

    const resource = createAudioResource(RADIO_URL, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true
    });
    resource.volume.setVolume(1.0);

    player.play(resource);
    conn.subscribe(player);
    console.log(`[DEFINITIVA] RADIO 105 ON AIR - ${RADIO_URL}`);

    player.on(AudioPlayerStatus.Idle, ()=>{
      console.log('[DEFINITIVA] Idle, replay');
      try{
        const r = createAudioResource(RADIO_URL, { inputType: StreamType.Arbitrary, inlineVolume: true });
        r.volume.setVolume(1.0);
        player.play(r);
      }catch(e){ console.error(e.message); }
    });

    player.on('error', e=>{
      console.error('[Player error]', e.message);
      setTimeout(playRadio, 3000);
    });

    conn.on(VoiceConnectionStatus.Disconnected, async ()=>{
      console.log('[Conn] Disconnected, retry 5s');
      try{
        await Promise.race([
          entersState(conn, VoiceConnectionStatus.Signalling, 5000),
          entersState(conn, VoiceConnectionStatus.Connecting, 5000)
        ]);
      }catch{
        try{ conn.destroy(); }catch{}
        setTimeout(playRadio, 5000);
      }
    });

  }catch(e){
    console.error('[ERROR DEFINITIVA]', e.message);
    setTimeout(playRadio, 10000);
  }
}

client.once('ready', ()=>{ console.log(`DEFINITIVA Loggato come ${client.user.tag}`); playRadio(); });
client.on('clientReady', ()=>{ console.log('DEFINITIVA clientReady'); playRadio(); });
client.login(TOKEN);
