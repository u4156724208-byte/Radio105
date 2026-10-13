
const { Client, GatewayIntentBits } = require('discord.js');
const { Manager } = require('erela.js');
const http = require('http');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.VOICE_CHANNEL_ID;
const PORT = process.env.PORT || 10000;

http.createServer((req,res)=>res.end('Lavalink bot live')).listen(PORT,()=>console.log('keepalive '+PORT));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });

// Usa un nodo Lavalink pubblico gratis - non devi hostarlo tu
const nodes = [
  {
    identifier: 'main',
    host: 'lavalink-v4.derock.dev',
    port: 443,
    password: 'youshallnotpass',
    secure: true,
    retryAmount: 20,
    retryDelay: 5000
  }
];

const manager = new Manager({
  nodes,
  send: (id, payload) => {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
  }
});

client.on('raw', d => manager.updateVoiceState(d));

async function startRadio(){
  try{
    const guildId = GUILD_ID;
    const voiceChannel = CHANNEL_ID;
    console.log('Cerco player per', guildId, voiceChannel);
    let player = manager.players.get(guildId);
    if(player) player.destroy();
    
    player = manager.create({
      guild: guildId,
      voiceChannel: voiceChannel,
      textChannel: voiceChannel, // non usato ma richiesto
      selfDeafen: false
    });
    player.connect();
    console.log('Connesso a vocale, cerco stream 105...');
    
    // Radio 105 URL diretto che Lavalink digerisce
    const res = await manager.search('http://icecast.unitedradio.it/Radio105.mp3', { requester: client.user });
    console.log('Search result', res.loadType, res.tracks?.length);
    
    if(res.loadType === 'LOAD_FAILED' || res.loadType === 'NO_MATCHES'){
      console.log('Provo fallback url https...');
      const res2 = await manager.search('https://icecast.105.net/105.mp3', { requester: client.user });
      if(res2.tracks.length > 0){
        player.queue.add(res2.tracks[0]);
        player.play();
        console.log('[OK] RADIO 105 ON AIR - LAVALINK');
        return;
      }
      throw new Error('Nessun stream trovato');
    }
    
    player.queue.add(res.tracks[0]);
    player.play();
    console.log('[OK] RADIO 105 ON AIR - LAVALINK v1.0');
    
  }catch(e){
    console.error('Lavalink error', e.message);
    setTimeout(startRadio, 8000);
  }
}

manager.on('nodeConnect', node => console.log(`Lavalink ${node.options.identifier} connesso`));
manager.on('nodeError', (node, err) => console.error(`Lavalink ${node.options.identifier} errore`, err.message));
manager.on('trackStart', (player, track) => console.log(`Track start ${track.title}`));
manager.on('queueEnd', player => {
  console.log('Queue end, riavvio radio...');
  setTimeout(startRadio, 2000);
});

client.once('ready', async () => {
  console.log(`Loggato ${client.user.tag} - LAVALINK EDITION`);
  manager.init(client.user.id);
  // aspetta connessione nodi
  setTimeout(startRadio, 3000);
});

client.login(TOKEN);
