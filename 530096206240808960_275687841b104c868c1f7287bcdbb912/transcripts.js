const WebSocket = require('ws');

async function wait(ms) {
    return new Promise(result => setTimeout(result, ms));
}

function createTranscriptClient() {
    let ws;
    let conectado = false;
    let transScripts_respostas = {};
    let TokenAguardando;

    async function connectWebSocket() {
        ws = new WebSocket('wss://codextranscripts.squareweb.app/transcripts');
        
        ws.on('open', async function() {
            console.log('Conexão estabelecida');
            while (!TokenAguardando) {
                await wait(10);
            }
            ws.send(`{"token":"${TokenAguardando}"}`);
            conectado = true;
        });

        ws.on('message', function incoming(data) {
            const tab = JSON.parse(data);

            if (tab.connected === true) {
                conectado = true;
            }

            if (tab?.link) {
                const link = tab.link;
                const id = tab.id;
                transScripts_respostas[id] = link;
            }
        });

        setTimeout(() => {
            ws.on('close', async function close() {
                conectado = false;
                console.log('Conexão fechada, tentando reconectar em 1 segundo...');
                await wait(5000);
                connectWebSocket();   
            });
    
        }, 1000 * 30)
        ws.on('error', async function error(err) {
            conectado = false;
            
            await wait(5000);
            connectWebSocket();   
        });
    }

    async function Transcript(channel_id, randId) {
        return new Promise(async result => {
            while (!conectado) {
                await wait(1)
            }
            let randomId = randId ? randId : Math.floor(Math.random() * 1000000000000000);
            ws.send(`{"channel_id":"${channel_id}", "id": "${randomId}"}`);

            let transcript;
            do {
                transcript = transScripts_respostas[randomId];
                await wait(0);
            } while (!transcript);

            result(transcript);
            delete transScripts_respostas[randomId]
        });
    }

    return {
        connect: function(token) {
            TokenAguardando = token;
            connectWebSocket();   
        },
        connected: function() {
            return conectado;
        },
        transcript: Transcript
    };
}

module.exports = createTranscriptClient;
