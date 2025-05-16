const Discord = require("discord.js")
const { Client, Intents, MessageEmbed, MessageSelectMenu, MessageActionRow, Modal, MessageButton, TextInputComponent, CommandInteraction, ApplicationCommand } = require("discord.js")
let enviados = []
const fs = require("fs")
let config = require("./config.json")
const cor = require("chalk")
const https = require('https')
const axios = require('axios')
const { QrCodePix } = require('qrcode-pix');
const QRCode = require("qrcode")

const { connect, connected, transcript } = require("./transcripts.js")()

let ultima_mensagem = null

const canaisAprovados2 = []

if (!fs.existsSync('./finalizados.json')) {
    fs.writeFileSync('./finalizados.json', '{}')
}

const client = new Client({
    intents: Object.values(Intents.FLAGS)
})

const invites = new Map();
const filePath = './invites.json';

function loadInvitesData() {
    if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

function saveInvitesData(data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

let invitesData = loadInvitesData();

client.on('ready', async () => {
    console.log(`${client.user.tag} está online!`);

    client.guilds.cache.forEach(async (guild) => {
        const guildInvites = await guild.invites.fetch();
        invites.set(guild.id, guildInvites);
    });
});

client.on('inviteCreate', (invite) => {
    const guildInvites = invites.get(invite.guild.id) || new Map();
    guildInvites.set(invite.code, invite);
    invites.set(invite.guild.id, guildInvites);
});

client.on('inviteDelete', (invite) => {
    const guildInvites = invites.get(invite.guild.id) || new Map();
    guildInvites.delete(invite.code);
    invites.set(invite.guild.id, guildInvites);
});

client.on('guildMemberAdd', async (member) => {
    const cachedInvites = invites.get(member.guild.id);
    const newInvites = await member.guild.invites.fetch();

    invites.set(member.guild.id, newInvites);

    const usedInvite = newInvites.find(
        (inv) => cachedInvites.get(inv.code) && cachedInvites.get(inv.code).uses < inv.uses
    );

    if (usedInvite) {
        const inviterId = usedInvite.inviter.id;
        const memberId = member.user.id;

        console.log(`${member.user.tag} entrou no servidor usando o convite de ${usedInvite.inviter.tag}.`);

        if (!invitesData[inviterId]) {
            invitesData[inviterId] = [];
        }
        invitesData[inviterId].push(memberId);

        saveInvitesData(invitesData);
    }
});


client.on('messageCreate', async (message) => {
    // Verifica se a mensagem é do canal específico e não é de um bot
    if (message.channel.id === '1315135486603427841' && !message.author.bot) {

        // Deleta a última mensagem, se existir
        if (ultima_mensagem !== null) {
            await ultima_mensagem.delete().catch(() => { });
        }

        // Envia uma nova mensagem
        ultima_mensagem = await message.channel.send({
            content: `> Para **calcular** os **robux**, utilize o comando \`/calcular\` \`/reais\` em qualquer chat !
> Para comprar:
> https://discord.com/channels/1270032070084657262/1273313992864960536
> https://discord.com/channels/1270032070084657262/1334005276168294472
> https://discord.com/channels/1270032070084657262/1334005276168294472
> https://discord.com/channels/1270032070084657262/1301363772207665203`,
        });
    }
});

// Evento para lidar com comandos de barra
client.on('interactionCreate', async (interaction) => {
    // Verifica se a interação é um comando de barra
    if (interaction.isCommand()) {
        // Verifica se o comando é de um canal específico
        if (interaction.channel.id === '1315135486603427841') {
            // Deleta a última mensagem, se existir
            if (ultima_mensagem !== null) {
                await ultima_mensagem.delete().catch(() => { });
            }

            // Envia uma nova mensagem
            ultima_mensagem = await interaction.channel.send({
                content: `> Para **calcular** os **robux**, utilize o comando \`/calcular\` \`/reais\` em qualquer chat !
> Para comprar:
> https://discord.com/channels/1270032070084657262/1273313992864960536
> https://discord.com/channels/1270032070084657262/1334005276168294472
> https://discord.com/channels/1270032070084657262/1334005276168294472
> https://discord.com/channels/1270032070084657262/1301363772207665203`,
            });

            // Responde ao comando para evitar que o Discord mostre um erro
            await interaction.reply({ content: 'Mensagem enviada!', ephemeral: true });
        }
    }
});

var apiPath = 'https://pix.api.efipay.com.br'


async function seraFechado(channel) {
    let horario = Data().getHours()
    let msg = horario <= 6 ? 'uma Boa madrugada, Vá mimir!' : horario <= 12 ? 'um Bom dia!' : horario <= 18 ? 'uma Boa tarde!' : 'uma Boa noite!'
    channel.send({
        embeds: [
            {
                description: `Este ticket será fechado em 15 segundos, Tenha ${msg}`
            }
        ]
    })
}



async function gerarPagamento(value = 0) {
    return new Promise(async (resolve, reject) => {
        while (!lastToken) await wait(1);

        const chaves = await listarChaves();

        if (chaves.length === 0) {
            return reject(new Error("Nenhuma chave registrada!"));
        }

        const accessToken = lastToken;
        const { agent } = await getCertificate();

        const paymentData = {
            calendario: {
                expiracao: 60 * 10,
            },
            chave: chaves[0],
            valor: {
                original: value.toFixed(2),
            },

        };

        const config = {
            method: "POST",
            url: apiPath + "/v2/cob",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            httpsAgent: agent,
            data: JSON.stringify(paymentData),
        };

        try {
            const response = await axios(config);
            const pixData = response.data;
            const qrCodeBase64 = await QRCode.toDataURL(pixData.pixCopiaECola);

            resolve({
                base64: qrCodeBase64,
                ...pixData,
            });
        } catch (error) {
            if (error.response) {
                console.error("Erro na resposta:", error.response.data);
                reject(new Error(error.response.data));
            } else {
                console.error("Erro na requisição:", error.message);
                reject(error);
            }
        }
    });
}

async function listarChaves() {
    return new Promise(async (result, reject) => {
        while (!lastToken) await wait(1)

        try {
            const info = await getCertificate();
            const agent = info.agent;
            const accessToken = lastToken

            const config = {
                method: "GET",
                url: apiPath + "/v2/gn/evp",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                },
                httpsAgent: agent,
            };

            axios(config)
                .then((response) => {
                    result(response.data.chaves);
                })
                .catch((error) => {
                    if (error.response) {
                        console.error(error.response.data);
                    } else {
                        console.error(error);
                    }
                    reject(error);
                });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}

async function consultarPagamento(txId) {
    while (!lastToken) await wait(1)
    const info = getCertificate()
    const config = {
        method: "GET",
        url: apiPath + '/v2/cob/' + txId,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lastToken}`
        },
        httpsAgent: info.agent,
    }

    return axios(config)
        .then(response => response.data)
        .catch(error => {
            throw error
        })
}

async function consultarSaldo() {
    while (!lastToken) await wait(1)

    const config = {
        url: apiPath + `/v2/gn/saldo`,
        method: "GET",
        httpsAgent: getCertificate().agent,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${lastToken}`
        }
    }

    return axios(config)
        .then(response => response.data)
        .catch(error => {
            throw error
        })
}

async function pegarQrcode(id) {
    while (!lastToken) await wait(1)
    const config = {
        url: apiPath + '/v2/loc/' + id + '/qrcode',
        method: "GET",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${lastToken}` },
        httpsAgent: getCertificate().agent,
    }

    return axios(config)
        .then(data => {
            return {
                qrcode: data.imagemQrcode,
                link: data.linkVisualizacao
            }
        })
        .catch(error => {
            throw error
        })
}



function Data() {
    const test = new Date()
    test.setHours(test.getHours())
    return test
}



setInterval(async () => {
    config = JSON.parse(await fs.readFileSync('./config.json', 'utf8'))
}, 1000)

async function registrarVenda(valor, quantidadeRobux, userId) {
    const vendas = JSON.parse(await fs.readFileSync('./vendas.json', 'utf8'))
    const date = Data()

    vendas.push({
        id: userId,
        valor: Number(valor),
        robux: Number(quantidadeRobux),
        timestamp: date.getTime()
    })

    await fs.writeFileSync('./vendas.json', JSON.stringify(vendas, null, 2))
}
; (async () => {
    if (!await fs.existsSync('./vendas.json')) {
        await fs.writeFileSync('./vendas.json', '[]')
    }
})();

function embed(title, description, cor) {
    const embed = new MessageEmbed()
    title ? embed.setTitle(title) : null
    description ? embed.setDescription(description) : null
    cor ? embed.setColor(cor) : embed.setColor(config.geral["cor-embeds"])

    return embed
}
function newembed(title, description, cor) {
    const embed = new MessageEmbed()
    title ? embed.setTitle(title) : null
    description ? embed.setDescription(description) : null
    cor ? embed.setColor(cor) : embed.setColor(config.geral["cor-embeds"])

    return embed
}



const fetch = require("node-fetch")
const crypto = require("crypto")
const accessToken = config.geral.mp

let csrf_token = null
const canvas = require('canvas');
const { createCanvas, loadImage } = canvas;

function warn(txt) {
    console.log(cor.hex(config.geral["cor-embeds"])("-> ") + txt)
}

function calcular_com_taxa(valorDesejado) {
    const valorNecessario = valorDesejado / 0.70;

    return Math.floor(Math.round(valorNecessario));
}



async function gerarImagem(numero, titulo, texto) {
    return await fetch('https://skinmc.net/achievement/' + numero + '/' + titulo.split(" ").join("+") + '/' + texto.split(" ").join("+")).then(r => r.url)
}

async function div(base64, texto, r = 0, g = 0, b = 0) {
    const canvasSize = 500;
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');

    const cleanedBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanedBase64, 'base64');

    const img = await loadImage(buffer);
    ctx.drawImage(img, 0, 0, canvasSize, canvasSize);

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.font = '30px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    ctx.fillText(texto, canvasSize / 2, canvasSize - 5);

    return canvas.toBuffer();
}

function calcular_desconto(valor, porcentagem) {
    return valor * (porcentagem / 100);
}


new MessageEmbed().addField('a', 'b', true)

async function getValue(value) {
    const rank = JSON.parse(await fs.readFileSync('./data.json', 'utf8'))

    return rank[value] ? rank[value] : null
}

async function setValue(name, value) {
    const rank = JSON.parse(await fs.readFileSync('./data.json', 'utf8'))
    rank[name] = value
    await fs.writeFileSync('./data.json', JSON.stringify(rank, null, 2))
}


async function pegarValor(value) {
    const rank = JSON.parse(await fs.readFileSync('./rank.json', 'utf8'))

    return rank[value] ? rank[value] : 0
}

async function setarValor(name, value) {
    warn("Editando valor de " + name + " para " + value)

    if (Number(value)) {

    } else {
        if (typeof (value) !== "number") {
            warn("Mudado pra 0.")
            value = 0
        }
    }


    const rank = JSON.parse(await fs.readFileSync('./rank.json', 'utf8'))
    rank[name] = Number(value)
    await fs.writeFileSync('./rank.json', JSON.stringify(rank, null, 2))
}



const express = require("express")
const cors = require("cors")
const body_parser = require('body-parser')
const { type } = require("os")
const app = express()
app.use(cors())
app.use(body_parser.json({ limit: '50mb' }))



app.get("/", async (req, res) => {
    res.send(await fs.readFileSync('./site.html', 'utf8'))
})

app.get('/config', (req, res) => {
    const token = req.query.token
    if (token !== config.geral.senha) {
        res.send("no")
        return
    }
    res.json(config)
});

app.get('/expira', async (req, res) => {
    const token = req.query.token
    if (token !== config.geral.senha) {
        res.send("no")
        return
    }
    res.send(config.geral.expira)
})

app.post('/alterar', (req, res) => {
    const token = req.query.token
    if (token !== config.geral.senha) {
        res.send("no")
        return
    }

    const updates = req.body.updates;

    fs.readFile('config.json', 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Erro ao ler o arquivo.');
        }

        let config = JSON.parse(data);

        // Aplica as alterações no objeto config
        updates.forEach(update => {
            let keys = update.path.split('/');
            let obj = config;

            for (let i = 0; i < keys.length - 1; i++) {
                obj = obj[keys[i]];
            }

            obj[keys[keys.length - 1]] = update.value;
        });

        // Salva o arquivo alterado
        fs.writeFile('config.json', JSON.stringify(config, null, 2), (err) => {
            if (err) {
                return res.status(500).send('Erro ao salvar o arquivo.');
            }

            res.send('Configurações alteradas com sucesso!');
        });
    });
});

app.get("/connected", async (req, res) => {
    const token = req.query.token
    if (token !== config.geral.senha) {
        res.send("no")
        return
    }

    res.send(client.user.username)
})

app.get("/pendentes", async (req, res) => {
    res.send(await fs.readFileSync('./pagar.json', 'utf8'))
})

app.get('/authenticator', async (req, res) => {
    const token = req.query.token

    if (token == config.geral.senha) {
        res.send("authenticated")
    } else {
        res.send("no")
    }
})



async function forcarPagar(tabela) {
    const args = JSON.parse(await fs.readFileSync('./pagar.json', 'utf8'))

    if (args.findIndex(v => v[1] == tabela[1] && v[2] == tabela[2] && v[3] == tabela[3]) == -1) {

        return
    }

    const user = (await client.guilds.cache.first().members.fetch()).get(tabela[3])
    const canal = (await client.guilds.cache.first().channels.fetch()).get(tabela[2])

    await client.channels.cache.get(config.canais["auto-entregues"]).send({
        content: `**Gamepass Entregue - <@${user?.id}> - ${tabela[1]} Robux**`,
        components: [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setURL(`https://www.roblox.com/pt/game-pass/${tabela[0]}`)
                    .setStyle("LINK")
                    .setLabel("Gamepass")
            )
        ]
    })

    try {
        const dm = await user.createDM()

        if (dm) {
            dm.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**${config.geral.loja} - Entregas**`)
                        .setDescription(`**Olá, ${user.user.username}! Sua entrega de ${Math.floor(Math.round(tabela[1] * 0.70))} Robux foram entregues com sucesso!**\n\n**Verifique seus robux pendentes em:**`)
                        .setColor(config.geral["cor-embeds"])
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setURL('https://www.roblox.com/transactions')
                            .setStyle("LINK")
                            .setLabel("Robux Pendentes")
                            .setEmoji(config.emojis.robux)
                    )
                ]
            })
        }
    } catch {

    }


    await client.channels.cache.get(config.canais["logs-entregas"]).send({
        content: `<@${user?.id}>`,
        embeds: [
            new MessageEmbed()
                .setTitle(`**${config.geral.loja} - Entregas**`)
                .setDescription(`**Olá, <@${user.id}>! Sua entrega de ${Math.floor(Math.round(tabela[1] * 0.70))} Robux foram entregues com sucesso!**\n\n**Verifique seus robux pendentes em:**`)
                .setColor(config.geral["cor-embeds"])
        ],
        components: [
            new MessageActionRow().addComponents(
                new MessageButton()
                    .setURL('https://www.roblox.com/transactions')
                    .setStyle("LINK")
                    .setLabel("Robux Pendentes")
                    .setEmoji(config.emojis.robux)
            )
        ]
    })

    if (canal) {
        try {
            canal.delete()
        } catch {

        }
    }

    const pagar = JSON.parse(await fs.readFileSync('./pagar.json', 'utf8'))
    const i = pagar.findIndex(v => v[0] == tabela[0] && v[1] == tabela[1] && v[2] == tabela[2] && v[3] == tabela[3])

    if (i !== -1) {
        pagar.splice(i, 1)
        await fs.writeFileSync('./pagar.json', JSON.stringify(pagar, null, 2))
    }
}

app.post("/paguei", async (req, res) => {
    try {
        const tabela = req.body.tabela

        await forcarPagar(tabela)
        res.send("Terminei")
    } catch (error) {
        console.log("Ocorreu um erro no /pagar", error)
    }
})




let payments = {
    New: async (price2) => {
        return new Promise(async (resolve, reject) => {
            const price = Number(Number(price2).toFixed(2))
            const idempotencyKey = crypto.randomBytes(16).toString('hex');

            const payment_data = {
                transaction_amount: price,
                description: 'Bot de vendas do Discord',
                payment_method_id: 'pix',
                payer: {
                    email: `${await gerar_nome(15)}@gmail.com`
                }
            };

            try {
                const response = await fetch('https://api.mercadopago.com/v1/payments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${config.geral.mp}`,
                        'X-Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(payment_data)
                });

                if (!response.ok) {
                    throw new Error(`${price} Erro ao criar pagamento: ${response.statusText}`);
                }

                const data = await response.json();
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    },
    Get: async (id) => {
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.geral.mp}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ao obter pagamento: ${response.statusText}`);
            }

            const data = await response.json();

            const banco = data.card && data.card.issuer ? data.card.issuer.name : "Banco não encontrado";

            return {
                ...data,
                banco: banco
            };
        } catch (error) {
            throw error;
        }
    },

    Refund: async (id) => {
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}/refunds`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.geral.mp}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ao reembolsar pagamento: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    },
    Cancel: async (id) => {
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${config.geral.mp}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'cancelled' })
            });

            if (!response.ok) {
                throw new Error(`Erro ao cancelar pagamento: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    },
    listarMetodosPagamento: async () => {
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payment_methods`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${config.geral.mp}`
                }
            });

            if (!response.ok) {
                throw new Error(`Erro ao listar métodos de pagamento: ${response.statusText}`);
            }

            const data = await response.json();

            console.log(data)

            const paypal = data.find(method => method.name.toLowerCase().includes('paypal'));
            const bancoInter = data.find(method => method.issuer && method.issuer.name.toLowerCase().includes('inter'));

            return {
                PayPal: paypal || 'PayPal não encontrado',
                BancoInter: bancoInter || 'Banco Inter não encontrado'
            };
        } catch (error) {
            throw error;
        }
    }
};

const canaisAprovados = []
client.on("messageCreate", async (message) => {
    if (message?.member?.permissions.has("ADMINISTRATOR")) {
        if (message.content.startsWith(".say ")) {
            message.delete()
            message.channel.send(message.content.substring(5, 9e9))
        }
    }



})

async function gerar_nome(tamanho) {
    const letras = 'abcdefghijklmnopqrstuvwxyz';
    let nome = '';
    for (let i = 0; i < tamanho; i++) {
        nome += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    return nome;
}

async function getUserId(username) {
    const response = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            usernames: [username],
            excludeBannedUsers: true
        })
    });

    const data = await response.json();
    if (data.data.length > 0) {
        return data.data[0].id;
    } else {
        return 'https://cdn.discordapp.com/attachments/1273007512148381707/1273159605521875035/9281912c23312bc0d08ab750afa588cc.png?ex=66bd99c8&is=66bc4848&hm=af381bf9eb01a39faa1a6ef47a5ff283a816f7213ac52e321c6d1c3f1419a9f2&'
    }
}

const BASE_URL = "https://thumbnails.roblox.com/v1/users";

async function getAvatarUrl(userId) {
    if (userId == 0) {
        return 'https://i.pinimg.com/236x/21/9e/ae/219eaea67aafa864db091919ce3f5d82.jpg';
    }
    const response = await fetch(`${BASE_URL}/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=true`);
    const data = await response.json();
    if (data.data.length > 0) {
        return data.data[0].imageUrl;
    } else {
        return false;
    }
}

async function esperar_mensagem(id, demora, channelId) {
    return new Promise(result => {
        channelId = channelId ? channelId : false

        const funcao = (message) => {
            if (message?.member?.id == id) {
                if (channelId == false) {
                    client.off("messageCreate", funcao)
                    result(message)
                } else if (message.channel.id == channelId) {
                    client.off("messageCreate", funcao)
                    result(message)
                }

            }
        }

        client.on("messageCreate", funcao)
    })
}
var gerar_smo = (nome, description, emoji, value, callback, parar2) => {
    const final = {}
    nome ? final["label"] = nome : ''
    description ? final["description"] = description : ''
    emoji ? final["emoji"] = `<:oi:${emoji}>` : ''
    value ? final["value"] = value : ''
    const id_ = Math.floor(Math.random() * 100000000)

    if (callback) {
        final['value'] = `smo_${id_}`
        let parar = false
        client.on('interactionCreate', (interaction) => {
            if (parar) return;
            if (interaction.isSelectMenu()) {
                if (interaction.values[0] == `smo_${id_}`) {
                    callback(interaction, nome)
                    if (parar2 == true) {
                        parar = true
                    };
                }
            }
        })
    }
    return final
}

var esperar_modal = async (interaction, title, options) => {
    return new Promise(async result => {
        const id_modal = Math.floor(Math.random() * 10000000)
        const model = new Modal()
            .setCustomId(`modal_${id_modal}`)
            .setTitle(title)
            .addComponents(
                options.map(obj => {
                    return new Discord.MessageActionRow().addComponents(
                        new Discord.TextInputComponent()
                            .setCustomId(obj.customId)
                            .setLabel(obj.label)
                            .setPlaceholder(obj.placeholder)
                            .setRequired(obj.required)
                            .setStyle(obj.style)
                    )
                })
            )

        await interaction.showModal(model)



        const funcao = async interaction2 => {
            if (interaction2.isModalSubmit() && interaction2.customId == `modal_${id_modal}`) {
                result({
                    get: (nome) => {
                        return interaction2.fields.getTextInputValue(nome)
                    },
                    interaction: interaction2
                })
            }
        }


        client.on("interactionCreate", funcao)
    })
}

function criar_btn(btn, callback, id_donoia, remover) {
    const id_dessa_coisa = Math.floor(Math.random() * 1000000000)
    btn.setCustomId(`w_${id_dessa_coisa}`)
    const funcao = (interaction) => {
        if (interaction.isButton() && interaction.customId == `w_${id_dessa_coisa}` && (id_donoia == null ? true : id_donoia == interaction.user.id)) {
            if (remover == true) {
                client.off("interactionCreate", funcao)
            }
            callback(interaction, () => {
                client.off("interactionCreate", funcao)
            })
        }
    }
    client.on("interactionCreate", funcao)
    return btn
}

function btn(a, b, c) {
    const bt = new MessageButton().setStyle(a).setLabel(b)
    c ? bt.setEmoji(c) : ''
    return bt
}

async function wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms)
    })
}


async function pedirCategoriaCarrinhos() {
    const guild = client.guilds.cache.first()
    const principal = config.categorias["carrinhos-robux"];
    const canais = await guild.channels.fetch()

    const naCategoria = canais.filter(canal => canal.type == "GUILD_TEXT" && canal.parentId == principal)

    if (naCategoria.size <= 45) {
        return principal
    } else {
        const subs = canais.filter(canal => canal.type == 'GUILD_CATEGORY' && canal.name.startsWith('carrinhos-sub'))


        let novaCategoria = subs.find(v => canais.filter(canal => canal.type == "GUILD_TEXT" && canal.parentId == v.id).size < 45)

        if (!novaCategoria) {
            novaCategoria = await guild.channels.create(`carrinhos-sub-${subs.size + 1}`, { type: "GUILD_CATEGORY" })
        }

        return novaCategoria.id
    }
}




async function pedirCategoriaAprovados(tipo) {
    const guild = client.guilds.cache.first()
    const principal = config.categorias["aprovados-gamepass"];
    const canais = await guild.channels.fetch()

    const naCategoria = canais.filter(canal => canal.type == "GUILD_TEXT" && canal.parentId == principal)

    if (naCategoria.size <= 45) {
        return principal
    } else {
        const subs = canais.filter(canal => canal.type == 'GUILD_CATEGORY' && canal.name.startsWith('aprovados-gamepass-sub'))


        let novaCategoria = subs.find(v => canais.filter(canal => canal.type == "GUILD_TEXT" && canal.parentId == v.id).size < 45)

        if (!novaCategoria) {
            novaCategoria = await guild.channels.create(`aprovados-gamepass-${subs.size + 1}`, { type: "GUILD_CATEGORY" })
        }

        return novaCategoria.id
    }
}




async function verificarEDeletarCategoriasCarrinhos() {
    const canais = await client.channels.fetch()
    const categoriasExistentes = (await client.channels.fetch()).filter(c => c.type === 'GUILD_CATEGORY' && c.name.startsWith("carrinhos-sub"));
    for (const [id, categoria] of categoriasExistentes) {
        if (canais.filter(v => v.type = 'GUILD_TEXT' && v.parentId == categoria.id).size === 0) {
            await categoria.delete();
        }
    }
}

async function verificarEDeletarCategoriasAprovados() {
    const canais = await client.channels.fetch()
    const categoriasExistentes = (await client.channels.fetch()).filter(c => c.type === 'GUILD_CATEGORY' && c.name.startsWith("aprovados-gamepass-sub"));
    for (const [id, categoria] of categoriasExistentes) {
        if (canais.filter(v => v.type = 'GUILD_TEXT' && v.parentId == categoria.id).size === 0) {
            await categoria.delete();
        }
    }
}

async function checkCargos(member) {
    try {
        const gastos = JSON.parse(fs.readFileSync('./vendas.json', 'utf8')).filter(v => v.id == member.id)
        let valor = 0
        for (v of gastos) {
            valor += v.valor
        }

        for (v of config["cargos-valores"]) {
            if (valor >= v[0]) {
                try {
                    member.roles.add(v[1])

                } catch {

                }
            }
        }
    } catch {

    }
}

let database;

async function gerar_texto_em_imagem(pathDaImagem, textoTopo, textoBaixo) {
    while (!database) {
        await wait(0)
    }

    const image = await loadImage(pathDaImagem);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0, image.width, image.height);

    ctx.fillStyle = 'rgb(17, 125, 240)';
    ctx.textAlign = 'left';

    ctx.font = 'bold 130px "Open Sans ExtraBold"';
    ctx.fillStyle = `rgb(17, 125, 240)`;

    ctx.fillText(textoTopo, 650, 200);

    ctx.font = '80px "Open Sans Regular"';
    ctx.fillText(textoBaixo, 660, 300);

    const Imagem = `./${Math.floor(Math.random() * 10000)}.png`

    const fs = require("fs")
    await fs.writeFileSync(Imagem, canvas.toBuffer().toString('base64'), { encoding: 'base64' })

    const img = await database.send({
        files: [Imagem]
    })

    setTimeout(() => {
        fs.unlinkSync(Imagem)
    }, 5000)
    return img.attachments.first().url
}





async function categoria(guild, id, nome) {
    console.log(id, nome)

    const canais = await guild.channels.fetch()

    const categoria = canais.find(c => c.id == id && c.type == 'GUILD_CATEGORY')

    if (canais.filter(v => v.parentId == categoria.id && v.type == 'GUILD_TEXT').size < 30) {
        console.log("Retornei o id padrao", id)
        return id
    } else {
        const subs = canais.filter(v => v.type == 'GUILD_CATEGORY' && v.name.startsWith(nome + '-sub'))

        let categoria = subs.find(v => canais.filter(o => o.parentId == v.id && o.type == 'GUILD_TEXT').size < 30)

        if (!categoria) {
            categoria = await guild.channels.create(`${nome}-sub${subs.size + 1}`, {
                type: "GUILD_CATEGORY"
            })
        } else {
        }

        return categoria.id
    }
}

client.on('channelDelete', async channel => {
    if (channel?.parentId) {
        const canais = await channel.guild.channels.fetch()
        const categoria = canais.find(v => v.id == channel.parentId && v.type == 'GUILD_CATEGORY')
        const canal = canais.filter(v => v.parentId == channel.parentId && v.type == 'GUILD_TEXT')


        if (categoria && categoria.name.includes('sub') && canal.size == 0) {
            categoria.delete()
        }
    }
})

client.on("ready", async () => {


    warn(`${client.user.username} está online!`)

    client.channels.fetch(config.canais["qr-codes"]).then(channel => {
        database = channel
    })

    const vendasJSON = JSON.parse(fs.readFileSync('./vendas.json', 'utf8'))

    let jaVerifiquei = []
    let guild_ = await client.guilds.fetch("1270032070084657262")
    // for (v of vendasJSON) {
    //     if (!jaVerifiquei.includes(v.id)) {
    //         jaVerifiquei.push(v.id)

    //         ;(async () => {
    //             const member = guild_.members.fetch(v.id)
    //             checkCargos(member)
    //         })();
    //     }
    // }

    client.setMaxListeners(100000)
    client.user.setPresence({
        status: "idle",
        activities: [{
            type: 'CUSTOM',
            name: `⚡ Sᴛᴀʀᴋ'Aᴘᴘs - Sᴇᴜ ᴀʟɪᴀᴅᴏ ᴅᴇ ᴠᴇɴᴅᴀs ᴀᴜᴛᴏᴍᴀ́ᴛɪᴄᴀs ᴇ sᴇᴍɪ ᴀᴜᴛᴏᴍᴀ́ᴛɪᴄᴀs https://discord.gg/N7jyfAuzKu`
        }]
    })

    const comandosManter = [
        'ranking',
        'pendentes',
        'jogos',
        'disparo',
        'aprovar',
        'robuxprompt',
        'jogosprompt',
        'gamepassprompt',
        'ticketprompt',
        'criarcupom',
        'excluircupom',
        'entregar',
        'gastos',
        'calcular'
    ];
    client.application.commands.create({
      name: `gerarpix`,
      description: `Utilize esse comando para gerar um pix.`,
      options: [
          {
              name: 'valor',
              description: 'Qual o valor do pix?',
              required: true,
              type: 'NUMBER',
  
          }
      ]
  })

    client.application.commands.create({
            name: 'criarjogos',
            description: 'Utilize esse comando para criar um embed de seleção de jogos.',
    })

    const comandosParaCriar = [
        {
            name: 'ranking',
            description: 'Utilize esse comando para ver o ranking dos Usuários.'
        },
        {
            name: 'pendentes',
            description: 'Utilize esse comando para ver os pendentes de compras.'
        },
        {
            name: 'jogos',
            description: 'Utilize esse comando para gerenciar os jogos com gamepasses a venda.'
        },
        {
            name: "relatoriovendas",
            description: "Utilize esse comando para ver o relatório de vendas."
        },
        {
            name: 'disparo',
            description: 'Utilize esse comando para Disparar anuncios no servidor.'
        },
        {
            name: 'aprovar',
            description: 'Utilize esse comando para aprovar um carrinho específico.'
        },
        {
            name: 'robuxprompt',
            description: 'Utilize esse comando para exibir o Prompt de Robux.'
        },
        {
            name: 'jogosprompt',
            description: 'Utilize esse comando para exibir o Prompt de Jogos.'
        },
        {
            name: 'gamepassprompt',
            description: 'Utilize esse comando para exibir o Prompt de Robux.'
        },
        {
            name: 'ticketprompt',
            description: 'Utilize esse comando para exibir o Prompt de Tickets.'
        },
        {
            name: 'criarcupom',
            description: 'Utilize esse comando para criar um cupom.',
            options: [
                {
                    name: 'codigo',
                    description: 'Digite o Código do Cupom.',
                    type: 'STRING',
                    required: true
                },
                {
                    name: 'desconto',
                    description: 'Digite o Valor do Desconto (em porcentagem).',
                    type: 'NUMBER',
                    required: true
                },

                {
                    name: 'limite',
                    description: 'Digite o Limite de Usos do Cupom.',
                    type: 'NUMBER',
                    required: true
                },

            ]
        },
        {
            name: 'excluircupom',
            description: 'Utilize esse comando para excluir um cupom.',
            options: [
                {
                    name: 'codigo',
                    description: 'Digite o Codigo do Cupom.',
                    type: 'STRING',
                    required: true,
                    autocomplete: true
                }
            ]
        },
        
        {
            name: 'entregar',
            description: 'Utilize esse comando para simular uma entrega.',
            options: [
                {
                    name: 'usuario',
                    description: 'Selecione o Usuário que será marcado na entrega.',
                    type: 'USER',
                    required: true
                },
                {
                    name: 'foto',
                    description: 'Envie um comprovante da entrega do Usuário.',
                    type: 'ATTACHMENT',
                    required: true
                },
                {
                    name: 'produto',
                    description: 'Envie o nome do produto entregue ao Usuário.',
                    type: 'STRING',
                    required: true
                }
            ]
        },
        {
            name: 'gastos',
            description: 'Utilize esse comando para ver o gasto do Usuário.',
            options: [
                {
                    name: 'usuario',
                    description: 'Selecione o Usuário que deseja ver o gasto.',
                    type: 'USER',
                    required: true
                }
            ]
        },
        {
            name: 'painelcupoms',
            description: 'Utilize esse comando para ver o painel de cupoms.'
        },
        {
            name: 'calcular',
            description: 'Utilize esse comando para calcular o preço do robux.',
            options: [
                {
                    name: 'robux',
                    description: 'Digite a quantidade desejada.',
                    type: 'NUMBER',
                    required: true
                }
            ]
        }
    ];

    client.application.commands.create({
        name: 'reais',
        description: 'Utilize esse comando para calcular o preço do robux.',
        options: [
            {
                name: 'reais',
                description: 'Digite o valor desejado.',
                type: "NUMBER",
                required: true
            }
        ]
    })

    

    client.application.commands.create({
        name: 'promptdois',
        description: 'Utilize esse comando para exibir o Prompt de Robux.'
    })

    client.guilds.cache.forEach(servidor => {
        servidor.commands.fetch().then(comandos => {
            comandos.forEach(comando => {
                if (!comandosManter.includes(comando.name)) {
                    servidor.commands.delete(comando.id);
                }
            });
            comandosParaCriar.forEach(comando => {
                if (!comandos.some(c => c.name === comando.name)) {
                    client.application.commands.create(comando);
                }
            });
        });
    });

})



async function getCookie() {
    return await fs.readFileSync('./cookie.txt', 'utf8')
}
async function setCookie(cookie) {
    await fs.writeFileSync('./cookie.txt', cookie)
}




function calcular_robux(robux) {
    const taxaDeConversao = config.valores["k-robux"] / 1000;
    const precoTotal = robux * taxaDeConversao;
    return precoTotal;
}

function calcular_gamepass(robux) {
    const taxaDeConversao = config.valores["k-gamepass"] / 1000;
    const precoTotal = robux * taxaDeConversao;
    return precoTotal;
}

function calcular_jogos(robux) {
    const taxaDeConversao = config.valores["k-jogos"] / 1000;
    const precoTotal = robux * taxaDeConversao;
    return precoTotal;
}

function calcular_reais(reais) {
    return Math.floor(((reais / config.valores['k-robux']) * 1000));
}


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isAutocomplete()) {
        return;
    }

    const focusedOption = interaction.options.getFocused(true);

    if (interaction.commandName === 'excluircupom' && focusedOption.name === 'codigo') {
        const coupons = Object.values(await getValue('cupoms'));
        const filteredCoupons = coupons.filter(coupon =>
            coupon.nome.toLowerCase().includes(focusedOption.value.toLowerCase())
        );
        const limitedCoupons = filteredCoupons.slice(0, 25);
        interaction.respond(limitedCoupons.map(coupon => {
            return {
                name: `Id: ${coupon.id} - ${coupon.nome} - ${coupon.desconto}%`,
                value: `${coupon.id}`
            };
        }));
    }
});


client.on('interactionCreate', async (interaction) => {
    if (true) {
        return
    }
    setTimeout(() => {
        if (interaction.isButton() || interaction.isSelectMenu()) {
            if (interaction.replied == false && interaction.deferred == false && interaction.message.deleted == false) {
                interaction.reply({
                    ephemeral: true,
                    embeds: [
                        {
                            title: `👋🏻 Olá, ${interaction.user.username}!`,
                            description: `> Não consegui pegar as informações desse botão por ser antigo demais, utilize o comando novamente por favor!`,
                            color: config.geral["cor-embeds"]
                        }
                    ]
                })
            }
        }
    }, 2500)
})

client.on('interactionCreate', async (interaction) => {
    if (interaction.isSelectMenu()) {
        if (interaction.customId == 'abrirjogo') {
            if (interaction.values.length == 0) {
                return interaction.deferUpdate()
            }
            if (config["loja-on"] == false) {
                interaction.reply({
                    content: `Olá, ${interaction.user.username}!
${config.geral.loja} está fechada no momento!`, ephemeral: true
                })

                const embed = interaction.message.embeds[0]
                embed.description = embed.description.replace("🟢 Disponível", "🔴 Indisponível")
                interaction.message.edit({
                    embeds: [
                        embed
                    ],
                })
                return
            }
            const embed = interaction.message.embeds[0]
            if (embed.description.includes("🔴 Indisponível")) {
                embed.description = embed.description.replace("🔴 Indisponível", "🟢 Disponível")
                interaction.message.edit({
                    embeds: [
                        embed
                    ],
                })
            }

            const jogoAtual = interaction.values[0]
            const jogoConfigGeral = config.jogos.find(v => v.nome == jogoAtual)

            await interaction.deferReply({ ephemeral: true })

            if (!jogoConfigGeral) {
                return interaction.editReply("Esse jogo está indisponível!")

            }


            const channels = interaction.guild.channels.cache.filter(c => c.type == 'GUILD_TEXT' && c.name.startsWith(`🛒|${jogoAtual}`) && c.name.startsWith(interaction.user.username));
            if (channels.size > 0) {
                return interaction.editReply({
                    content: '**Você ja tem um ticket aberto!**',
                    ephemeral: true
                });
            }

            const categoriaOriginal = await client.channels.fetch(jogoConfigGeral.categoria)
            const channel = await interaction.guild.channels.create(`🛒┃${jogoAtual}-${interaction.user.username}`, {
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                    },
                    {
                        id: interaction.user.id,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
                    },
                    ...config["cargos-administradores"].map(v => {
                        return {
                            id: v,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        }
                    })
                ],
                parent: await categoria(interaction.guild, categoriaOriginal.id, categoriaOriginal.name),
            })


            let lastMessage = Date.now()

            client.on('interactionCreate', async (inter) => {
                if (inter.channel.id == channel.id) {
                    lastMessage = Date.now()
                }
            })
            client.on('messageCreate', async (message) => {
                if (message.channel.id == channel.id) {
                    lastMessage = Date.now()
                }
            })

            let podeExcluir = true
            const inatividade = setInterval(() => {
                const diff = (Date.now() - lastMessage)
                const seconds = diff / 1000

                if (seconds > (60 * 10) && podeExcluir) {
                    setTimeout(() => {
                        channel.delete()
                    }, 5000)
                    clearInterval(inatividade)
                    channel.send("**Deletando por inatividade!**")
                }
            }, 2000)

            warn(`O carrinho de ${interaction.user.username} foi aberto com sucesso!`)

            interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**ROBUX AUTOMATICO ! | ${config.geral.loja}.**`)
                        .setDescription(`| Seu carrinho foi aberto com sucesso em
| Entregamos em um prazo de até 72 horas !`)
                        .setColor(config.geral["cor-embeds"])

                        .setThumbnail(config.imagens.thumbnail)
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`)
                            .setEmoji(config.emojis.robux)
                            .setStyle("LINK")

                            .setLabel(`Ver Carrinho`)
                    )
                ],
                ephemeral: true
            })

            await channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.geral["cor-embeds"])
                        .setImage(config.imagens["compre-aqui"])
                        .setTimestamp()
                        .setTitle(`**Este é seu carrinho, ${interaction.user.username}!**`)
                        .setDescription(`**Você está no caminho certo! Segue as instruções do bot abaixo:**`)
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setStyle("DANGER")
                            .setCustomId("fecharticket_" + interaction.user.id)
                            .setLabel("Cancelar Compra")
                            .setEmoji(config.emojis["emoji menos -"])
                    )
                ]
            })

            let geral = {
                nick: "",
                jogo: jogoAtual,
                id: 0,
                valor: 0,
                robux: 0,
                avatar: "",
                gamepasses: ''
            }

            const msg = await channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.geral["cor-embeds"])
                        .setTimestamp()
                        .setTitle(`**Seu pedido:**`)
                        .setDescription(`**Faça seu pedido abaixo:**`)
                ]
            })
            let ir = false
            let lastEmbed
            while (true) {
                if (ir == 2) {
                    break
                } else {
                    ir = false
                }
                const embed = new MessageEmbed()
                    .setColor(config.geral["cor-embeds"])
                    .setTimestamp()
                    .setTitle(`**Seu pedido:**`)
                    .setDescription(`**Faça seu pedido abaixo:**`)

                    .addField('Nick:', geral.nick !== "" ? geral.nick : 'Aguardando...', false)
                    .addField('Jogo:', geral.jogo !== "" ? geral.jogo : "Inserir Jogo", false)
                    .addField('Gamepasses:', geral.gamepasses !== "" ? geral.gamepasses : 'Aguardando...', false)
                    .addField('Robux total:', geral.robux !== 0 ? `${geral.robux} Robux` : "0 Robux", false)
                    .addField('Valor total:', `R$ ${calcular_jogos(geral.robux).toFixed(2)}`, false)

                if (geral.avatar !== "") {
                    embed.setAuthor({ iconURL: geral.avatar, name: geral.nick })
                    embed.setURL(`https://www.roblox.com/pt/users/${geral.id}/profile`)
                    embed.setTitle(`${geral.nick} (@${geral.nick})`)
                    embed.setThumbnail(geral.avatar)
                }

                lastEmbed = embed

                let texto_nick = "Inserir NickName"
                let texto_jogo = "Inserir Jogo"
                let texto_gamepasses = "Inserir Gamepasses"
                let texto_robux = "Inserir Valor"

                if (geral.nick == "") {
                    texto_nick = "NickName"
                    texto_jogo = "🎮"
                    texto_gamepasses = "💹"
                    texto_robux = "💸"
                } else if (geral.jogo == "") {
                    texto_nick = "🧑🏻"
                    texto_jogo = "Jogo"
                    texto_gamepasses = "💹"
                    texto_robux = "💸"
                } else if (geral.gamepasses == "") {
                    texto_nick = "🧑🏻"
                    texto_jogo = "🎮"
                    texto_gamepasses = "Gamepasses"
                    texto_robux = "💸"
                } else if (geral.valor == 0) {
                    texto_nick = "🧑🏻"
                    texto_jogo = "🎮"
                    texto_gamepasses = "💹"
                    texto_robux = "Valor"
                } else {
                    texto_nick = "🧑🏻"
                    texto_jogo = "🎮"
                    texto_gamepasses = "💹"
                    texto_robux = "💸"
                }

                const meuBUTAO = new MessageButton()
                    .setStyle("PRIMARY")


                if (texto_gamepasses == '💹') {
                    meuBUTAO.setEmoji(config.emojis["emoji mais +"])
                } else {
                    meuBUTAO.setLabel('Gamepasses')
                }
                let terminou_clicar = false
                msg.edit({
                    embeds: [
                        embed
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            criar_btn(
                                new MessageButton()
                                    .setStyle("PRIMARY")
                                    .setLabel(texto_nick),
                                async (inter) => {
                                    const { get, interaction } = await esperar_modal(inter, "Insira seu nickname", [
                                        {
                                            label: "Nickname",
                                            placeholder: "Ex: Roblox",
                                            required: true,
                                            style: "SHORT",
                                            customId: "nickname"
                                        }
                                    ])

                                    const nick = get('nickname')

                                    const userId = await getUserId(nick)
                                    if (typeof (userId) == 'string') {
                                        interaction.reply('.').then(() => { interaction.deleteReply() })
                                    } else {
                                        const avatarUrl = await getAvatarUrl(userId)
                                        if (avatarUrl === false) {
                                            interaction.reply('Seu Nickname foi alterado com sucesso!').then(() => { interaction.deleteReply() })
                                            geral.avatar = config.imagens.thumbnail
                                            geral.nick = nick
                                            geral.id = userId
                                            ir = true
                                        } else {
                                            interaction.reply('Seu Nickname foi alterado com sucesso!').then(() => { interaction.deleteReply() })
                                            geral.nick = nick
                                            geral.id = userId
                                            geral.avatar = avatarUrl
                                            ir = true
                                        }
                                    }
                                }
                            ),
                            criar_btn(
                                meuBUTAO,
                                async (inter) => {
                                    if (terminou_clicar == true) {
                                        inter.reply({ ephemeral: true, content: `**Painel de gamepasses ja está aberto, selecione a sua gamepass acima ^^**` })
                                        return
                                    }
                                    terminou_clicar = true
                                    inter.deferUpdate()

                                    const todas_gamepasses = [...jogoConfigGeral.gamepasses].splice(0, 100)
                                    const varias = []

                                    while (todas_gamepasses.length > 0) {
                                        varias.push(todas_gamepasses.splice(0, 25))
                                    }


                                    const idDissos = []
                                    let i = 0
                                    channel.send({
                                        embeds: [
                                            new MessageEmbed()
                                                .setTitle(`**Gamepasses de ${jogoAtual}**`)
                                                .setDescription(`Selecione as gamepasses que deseja comprar abaixo:`)
                                                .setColor(config.geral["cor-embeds"])
                                        ],
                                        components: [
                                            ...varias.map(v => {
                                                const idDisso = 'w_' + Math.floor(Math.random() * 1000000000)
                                                idDissos.push(idDisso)
                                                i = i + 1
                                                return new MessageActionRow().addComponents(
                                                    new MessageSelectMenu()
                                                        .setCustomId(idDisso)
                                                        .setMaxValues(v.length)
                                                        .setPlaceholder(`Passes [${i}/${varias.length}]`)
                                                        .setOptions(
                                                            v.map(game => {
                                                                return {
                                                                    label: game[0],
                                                                    description: `💸 R$ ${calcular_jogos(game[2]).toFixed(2)}`,
                                                                    emoji: game[1],
                                                                    value: game[0]
                                                                }
                                                            })

                                                        )
                                                )
                                            })
                                        ]
                                    })

                                    client.on('interactionCreate', async (interaction) => {
                                        if (interaction.isSelectMenu()) {
                                            if (idDissos.includes(interaction.customId)) {
                                                interaction.deferUpdate()
                                                await channel.bulkDelete(1)


                                                geral.gamepasses = interaction.values.join(', ')

                                                let ValorDisso = 0

                                                for (v of interaction.values) {
                                                    ValorDisso = ValorDisso + jogoConfigGeral.gamepasses.find(w => w[0] == v)[2]
                                                }

                                                geral.robux = ValorDisso
                                                geral.valor = calcular_jogos(ValorDisso)

                                                ir = true
                                                terminou_clicar = true
                                            }
                                        }
                                    })


                                }
                            ),
                            criar_btn(
                                new MessageButton()
                                    .setStyle("SUCCESS")
                                    .setLabel("Ir para o Pagamento")
                                    .setEmoji(config.emojis.pix)
                                    .setDisabled(geral.nick !== "" && geral.robux !== 0 && geral.gamepasses !== "" && geral.jogo !== "" ? false : true),
                                async (inter) => {
                                    msg.edit({
                                        embeds: [
                                            embed
                                        ],
                                        components: []
                                    })

                                    ir = 2
                                }
                            )
                        )
                    ]
                })

                while (ir == false) {
                    await wait(10)
                }
            }

            let valorTotal = calcular_jogos(geral.robux)
            let descontoAplicado = 0



            let Continuar = false

            channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**Antes de prosseguir com o pagamento**`)
                        .setDescription(`**Deseja adicionar um cupom de desconto?**`)
                        .setColor(config.geral["cor-embeds"])
                ],
                components: [
                    new MessageActionRow().addComponents(
                        criar_btn(
                            new MessageButton().setLabel('Adicionar Cupom').setEmoji(config.emojis["emoji mais +"]).setStyle('PRIMARY'),
                            async (inter) => {
                                const { get, interaction2 } = await esperar_modal(inter, "Digite o cupom de desconto abaixo:", [
                                    {
                                        customId: 'cupom',
                                        label: 'Cupom de desconto',
                                        placeholder: 'Ex: StarKApps',
                                        required: true,
                                        style: 'SHORT',
                                    },
                                ])

                                const cupom = get('cupom')

                                const cupoms = await getValue('cupoms')

                                if (cupoms.findIndex(v => v.nome == cupom) !== -1) {
                                    const t = cupoms[cupoms.findIndex(v => v.nome == cupom)]
                                    const usos = t.usos
                                    const quantidade = t.quantidade

                                    if (usos >= quantidade) {
                                        return interaction.reply({ ephemeral: true, content: "Cupom com máximo de uso!" })
                                    }

                                    if (t?.cargo) {
                                        if (interaction.member.roles.cache.has(t.cargo)) {

                                        } else {
                                            return interaction.reply({ ephemeral: true, content: `**Você não tem permissão para utilizar esse cupom, somente os membros com o cargo <@${t.cargo}>` })
                                        }
                                    }

                                    t.usos = usos + 1

                                    await setValue('cupoms', cupoms)


                                    const desconto = t.desconto

                                    inter.message.delete()

                                    interaction.reply({
                                        embeds: [
                                            new MessageEmbed()
                                                .setTitle("**Cupom aplicado!**")
                                                .setDescription(`*O cupom **${cupom}** foi aplicado com sucesso!* \n*Desconto: ${desconto}%*`)
                                                .setColor(config.geral["cor-embeds"])
                                        ],
                                        components: [

                                        ]
                                    })

                                    descontoAplicado = desconto
                                    Continuar = true
                                    await wait(1500)

                                    interaction.deleteReply()
                                } else {
                                    interaction.reply({ ephemeral: true, content: "Cupom inválido!" })
                                }
                            }
                        ),
                        criar_btn(
                            new MessageButton().setLabel('Continuar sem Cupom').setEmoji(config.emojis["pix"]).setStyle('SUCCESS'),
                            async (inter) => {
                                Continuar = true
                                inter.message.delete()
                            }
                        )
                    )
                ]
            })

            while (Continuar == false) {
                await wait(10)
            }

            const data = await payments.New(valorTotal - calcular_desconto(valorTotal, descontoAplicado))
            const carrinhoatual = `./${Math.floor(Math.random() * 1e9)}.png`
            const copia_cola = data?.point_of_interaction?.transaction_data?.qr_code
            const qr_code_base64 = data?.point_of_interaction?.transaction_data?.qr_code_base64
            const linksite = data?.point_of_interaction?.transaction_data?.ticket_url

            await fs.writeFileSync(carrinhoatual, await div(qr_code_base64, config.geral["qr-div"], config.geral.rgb.R, config.geral.rgb.G, config.geral.rgb.B))
            const msg2 = await (await channel.guild.channels.fetch()).get(config.canais["qr-codes"]).send({
                files: [carrinhoatual]
            })
            // await fs.writeFileSync(carrinhoatual, await novaImagem(warn.attachments.first().url, await client.user.avatarURL()))
            // const warn2 = await (await channel.guild.channels.fetch()).get(config.canais.database).send({
            //     files: [carrinhoatual]
            // })


            await channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTimestamp()
                        .setTitle(`**QR Code - ${data.id}**`)
                        .setDescription(`O QR Code tem válidade de 8 minutos, após o pagamento, o carrinho será aprovado automáticamente.
                            
**🔑 Chave Pix:**
${"`"}${copia_cola}${"`"}
**💸 Valor:**
${descontoAplicado > 0 ? `R$ ${(Number(valorTotal) - calcular_desconto(Number(valorTotal), descontoAplicado)).toFixed(2)} ~~R$ ${Number(valorTotal).toFixed(2)}~~ (Desconto: ${descontoAplicado}%)` : `R$ ${Number(valorTotal).toFixed(2)}`}`)
                        .setImage(msg2.attachments.first().url)
                        .setColor(config.geral["cor-embeds"])
                ],
                components: [
                    new MessageActionRow().addComponents(
                        criar_btn(
                            new MessageButton()
                                .setLabel("Copia e Cola")
                                .setEmoji(config.emojis.pix)
                                .setStyle("PRIMARY"),
                            async (inter) => {
                                inter.deferUpdate()
                                channel.send(copia_cola)
                            }
                        )
                    )
                ]
            })

            setTimeout(async () => {
                await fs.unlinkSync(carrinhoatual)
            }, 1000)


            let intervalo = setInterval(async () => {
                if (canaisAprovados.includes(channel.id) == true || (await payments.Get(data.id)).status == 'approved') {
                    clearTimeout(limite)
                    clearInterval(intervalo)
                    podeExcluir = false
                    if (canaisAprovados.includes(channel.id) == true) {
                        payments.Cancel(data.id)
                    }
                    channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setTitle(`**Seu pagamento foi aprovado!**`)
                                .setDescription("**Aguarde até que um entregador te chame nesse ticket!**")
                                .setColor(config.geral["cor-embeds"])
                        ]
                    })

                    const cOriginal = await client.channels.fetch(jogoConfigGeral["categoria-aprovada"])
                    await channel.setParent(await categoria(interaction.guild, cOriginal.id, cOriginal.name))

                    channel.permissionOverwrites.set([
                        {
                            id: interaction.guild.id,
                            deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                        },
                        {
                            id: interaction.user.id,
                            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
                        },
                        ...config["cargos-administradores"].map(v => {
                            return {
                                id: v,
                                allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                            }
                        })
                    ])

                    channel.setName(`🟩┃${jogoConfigGeral.nome}-${geral.robux}-${interaction.user.username}`)



                    let texto = ''

                    if (geral.robux < 500) {
                        texto = `${geral.robux}`
                    } else if (geral.robux < 1000) {
                        texto = `*${geral.robux}*`
                    } else if (geral.robux < 1500) {
                        texto = `**${geral.robux}**`
                    } else {
                        texto = `**${geral.robux} (UAU)**`
                    }

                    client.channels.cache.get(config.canais.database).send({
                        embeds: [lastEmbed]
                    })

                    client.channels.cache.get(config.canais["logs-compras"]).send({
                        content: `<@${interaction.user?.id}>`,
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.geral["cor-embeds"])
                                .setTitle(`**Transação Aprovada!**`)
                                .setAuthor({ iconURL: await interaction.user.avatarURL(), name: `Obrigado por comprar conosco!` })
                                .setDescription(`Olá! Sua compra de gamepasses no ${geral.jogo} no valor de ${geral.robux} robux foi aceita e enviada à nossa STAFF, Fique atento no seu ticket, pois a qualquer momento um entregador irá te chamar!`)
                                .setFooter({ text: "Prazo de entrega até 72hrs", iconURL: await client.user.avatarURL() })
                                .setImage(config.imagens["obrigado-por-comprar-conosco"] !== "" ? config.imagens["obrigado-por-comprar-conosco"] : null)
                                .setTimestamp()
                        ]
                    })

                    let Tem = await pegarValor(interaction.user.id)
                    setarValor(interaction.user.id, (Tem !== null ? Number(Tem) : 0) + valorTotal - calcular_desconto(valorTotal, descontoAplicado))

                    registrarVenda(
                        valorTotal - calcular_desconto(valorTotal, descontoAplicado),
                        geral.robux,
                        String(interaction.user.id)
                    )

                    interaction.member.roles.add(config.cargos["cargo-cliente"])
                }
            }, 5000)

            let limite = setTimeout(async () => {
                if (config.manual.pix !== '') {
                    return
                }
                clearInterval(intervalo)
                channel.delete()
                payments.Cancel(data?.id)
            }, 1000 * 60 * 8)
        }
    }

    if (interaction.isButton() || interaction.isSelectMenu()) {
        let Robux = false


        let Gamepass = false

        if (interaction.isButton()) {
            if (interaction.customId == 'comprarrobux') {
                Robux = true
            } else if (interaction.customId == 'comprargamepass') {
                Gamepass = true
            }
        } else {
            if (interaction.values.length == 0) {
                return interaction.deferUpdate()
            }
            if (interaction.values[0] == 'comprarrobux') {
                Robux = true
            } else if (interaction.values[0] == 'comprargamepass') {
                Gamepass = true
            }

        }


        if (Gamepass) {


            const embed = interaction.message.embeds[0]
            if (embed.description.includes("🔴 Indisponível")) {
                embed.description = embed.description.replace("🔴 Indisponível", "🟢 Disponível")
                interaction.message.edit({
                    embeds: [
                        embed
                    ],
                })
            }

            await interaction.deferReply({ ephemeral: true })

            const channels = interaction.guild.channels.cache.filter(c => c.type == 'GUILD_TEXT' && c.name.startsWith(`🛒|gamepass`) && c.name.startsWith(interaction.user.username));
            if (channels.size > 0) {
                return interaction.editReply({
                    content: '**Você ja tem um ticket aberto!**',
                    ephemeral: true
                });
            }

            const cOriginal = await client.channels.fetch(config.categorias["carrinhos-gamepass"])
            const channel = await interaction.guild.channels.create(`🛒┃gamepass-${interaction.user.username}`, {
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                    },
                    {
                        id: interaction.user.id,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
                    },

                    ...config["cargos-administradores"].map(v => {
                        return {
                            id: v,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        }
                    })
                ],
                parent: await categoria(interaction.guild, cOriginal.id, cOriginal.name),
            })

            let lastMessage = Date.now()

            client.on('interactionCreate', async (inter) => {
                if (inter.channel.id == channel.id) {
                    lastMessage = Date.now()
                }
            })
            client.on('messageCreate', async (message) => {
                if (message.channel.id == channel.id) {
                    lastMessage = Date.now()
                }
            })

            let podeExcluir = true
            const inatividade = setInterval(() => {
                const diff = (Date.now() - lastMessage)
                const seconds = diff / 1000


                if (seconds > (60 * 10) && podeExcluir) {
                    setTimeout(() => {
                        channel.delete()
                    }, 5000)
                    clearInterval(inatividade)
                    channel.send("**Deletando por inatividade!**")
                }
            }, 2000)

            warn(`O carrinho de ${interaction.user.username} foi aberto com sucesso!`)

            interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`<:fcsticketcor:${config.emojis.fcsticketcor}> ${interaction.user.username} | ${config.geral.loja}.`)
                        .setDescription(`| Seu carrinho foi aberto com sucesso
| Nosso atendimento é 100% automático, portanto, responda somente o que o bot perguntar!`)
                        .setColor(config.geral["cor-embeds"])

                        .setThumbnail(config.imagens.thumbnail)
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`)
                            .setEmoji("<:carrinho_cinza7:1194009126871781498>")
                            .setStyle("LINK")

                            .setLabel(`Ir para o carrinho`)
                    )
                ],
                ephemeral: true
            })

            let Continuar = null
            const msg = await channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.geral["cor-embeds"])
                        .setAuthor({ name: "Seu Carrinho", iconURL: await interaction.guild.iconURL() })
                        .setThumbnail(config.imagens.thumbnail)
                        .setDescription(`> <:carrinhocor:${config.emojis.carrinhocor}> › **Olá, <@${interaction.user.id}> ! **Seja **bem-vindo** ao seu carrinho.

> Para continuar a sua compra, aperta o botão **"Confirmar"** e responda as **perguntas**. Caso tenha aberto o carrinho por **engano** ou tenha **mudado** de ideia, utilize o botão **Cancelar**.

> Você pode parar o processo a qualquer momento.

> Lembre-se de ler nossos **termos de compra**, para não ter nenhum problema futuramente, ao continuar com a compra, você **concorda** com nossos **termos**.
 

`)
                        .setImage(await gerar_texto_em_imagem('./Imagens/4.png', 'Seu Carrinho', '- Compra de Gamepass -'))
                ],
                components: [
                    new MessageActionRow().addComponents(
                        criar_btn(
                            new MessageButton().setLabel('Aceitar e Continuar').setStyle('PRIMARY')
                                .setEmoji('1330765654634270740'),
                            async (inter) => {

                                inter.deferUpdate()
                                Continuar = true
                            }),

                        criar_btn(
                            new MessageButton().setLabel('Cancelar').setStyle('DANGER')
                                .setEmoji("1368414354327994469"),
                            async (inter) => {
                                inter.deferUpdate()
                                Continuar = false
                            }),

                        criar_btn(
                            new MessageButton().setLabel('Ler os Termos').setStyle('PRIMARY')
                                .setEmoji("1196181464220446871"),
                            async (inter) => {
                                inter.reply({
                                    ephemeral: true,
                                    embeds: [
                                        new MessageEmbed()
                                            .setDescription(await fs.readFileSync('./termos.txt', 'utf8'))
                                            .setColor(config.geral["cor-embeds"])
                                    ]
                                })

                            }),
                    )
                ]
            })

            while (Continuar == null) {
                await wait(0)
            }

            if (Continuar == false) {
                seraFechado(channel)
                await wait(15000)

                await channel.delete().catch(() => { })
            }

            msg.edit({
                components: []
            })

            let geral = {
                nick: "",
                avatar: "",
                nome_gamepass: "",
                nome_jogo: "",
                valor_robux: 0,
                valor_reais: 0,
                link: ''

            }

            let vezes = 0
            do {
                vezes = vezes + 1
                const pergunta = await channel.send(`<:usercor:${config.emojis.usercor}> › Qual é o seu **nickname** no Roblox?
> **OBS**: Escreva **apenas** o seu nick.`)
                const resp = await esperar_mensagem(interaction.user.id, 1000 * 60 * 5, channel.id)
                if (resp == false) {
                    continue
                }
                await pergunta.delete()
                await resp.delete()
                if (vezes !== 1) {
                    await channel.bulkDelete(1)
                }
                await channel.send({
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageButton()
                                .setCustomId('aguardando')
                                .setLabel("Buscando Informações...")
                                .setStyle("SECONDARY")
                                .setEmoji({ animated: true, id: '1340711352980869253' })
                                .setDisabled(true)
                        )
                    ]
                })


                const userId = await getUserId(resp.content)
                if (String(userId).includes('https')) {
                    await channel.bulkDelete(1)
                    await channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.geral["cor-embeds"])
                                .setDescription(`**Esse usuário não foi encontrado, tente novamente!**`)
                        ]
                    })

                    await wait(1000)
                    await channel.bulkDelete(1)

                    continue
                }
                await channel.bulkDelete(1)
                const avatar = await getAvatarUrl(userId)

                let souEu = null


                channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.geral["cor-embeds"])
                            .setAuthor({ name: `${resp.content} (@${resp.content})`, iconURL: avatar })
                            .setDescription(`> <:inforcor:${config.emojis.inforcor}> › **Este é você?**
                            
                > Nome: **${resp.content}**
                > Perfil: **[Clique aqui](https://www.roblox.com/pt/users/${userId}/profile)**`)
                            .setThumbnail(avatar)
                            .setImage(await gerar_texto_em_imagem('./Imagens/5.png', `${resp.content}`, ''))
                            .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            criar_btn(
                                new MessageButton().setLabel('Sim').setStyle('SUCCESS')
                                    .setEmoji('1330765654634270740'),
                                async (inter) => {
                                    // await channel.bulkDelete(3)

                                    let InterVoltar = null
                                    while (true) {
                                        let vouRetornar = null

                                        const modal = await esperar_modal(InterVoltar ? InterVoltar : inter, 'Compra de Gamepass', [
                                            {
                                                customId: 'nome-jogo',
                                                label: 'Nome do Jogo',
                                                placeholder: 'Ex: Anime Souls X, Blox Fruits, King Legacy, BedWars',
                                                required: true,
                                                style: 'SHORT'
                                            },
                                            {
                                                customId: 'nome-gamepass',
                                                label: 'Nome da Gamepass',
                                                placeholder: 'Ex: Notificador, 2x Maestria, Yoru',
                                                required: true,
                                                style: 'SHORT'
                                            },
                                            {
                                                customId: 'valor-robux',
                                                label: 'Valor em Robux',
                                                placeholder: 'Exemplo: 450',
                                                required: true,
                                                style: 'SHORT'
                                            },
                                        ])
                                        await channel.bulkDelete(1)
                                        const nome = modal.get('nome-jogo')
                                        const nome_gamepass = modal.get('nome-gamepass')
                                        const valor = modal.get('valor-robux')

                                        if (isNaN(valor)) {
                                            return modal.interaction.reply({ ephemeral: true, content: "Digite um valor válido!" })
                                        }

                                        geral.nome_jogo = nome
                                        geral.nome_gamepass = nome_gamepass
                                        geral.valor_robux = Math.floor(Number(valor))
                                        geral.nick = resp.content
                                        geral.avatar = avatar
                                        geral.link = `https://www.roblox.com/pt/users/${userId}/profile`
                                        geral.valor_reais = Number(calcular_gamepass(Number(valor)).toFixed(2))

                                        await channel.bulkDelete(1)

                                        let descontoAplicado = 0

                                        async function gerarBomba() {
                                            let valorEDesconto = '';
                                            if (descontoAplicado > 0) {
                                                valorEDesconto = `ᴅᴇ **~~R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}~~** ᴘᴏʀ **R$ ${(geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado)).toFixed(2).replace('.', ',')}**`;
                                            } else {
                                                valorEDesconto = `**R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}**`;
                                            }
                                            return new MessageEmbed()
                                                .setColor(config.geral["cor-embeds"])
                                                .setAuthor({ name: "Seu carrinho", iconURL: await interaction.guild.iconURL() })
                                                .setDescription(`> <:carrinhocor:${config.emojis.carrinhocor}> › Seu **carrinho**.\n\n> **Abaixo** está o orçamento de sua compra. Caso queira **prosseguir** com a sua compra, aperte o botão **"Confirmar"**, caso queira **desistir**, aperte o botão **"Cancelar"** ou caso queira **alterar** a quantia, utilize o botão **"Editar"**.`)
                                                .addField(`**Gamepass:**`, `> <:robloxcor:${config.emojis.fcsticketcor}> **${geral.nome_gamepass}**`, true)
                                                .addField(`**Valor em Robux:**`, `> <:robuxcor:${config.emojis.robuxcor}> **${geral.valor_robux.toLocaleString()} Robux**`, true)
                                                .addField(`**Preço:**`, `> 💸 ${valorEDesconto}`, true)
                                                .addField(`**Desconto:**`, `> <:cupomcor:${config.emojis.cupomcor}> **${descontoAplicado}%**`, true)
                                                .setImage(await gerar_texto_em_imagem('./Imagens/4.png', `R$ ${String((geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado)).toFixed(2)).replace(".", ",")}`, `- Jogo: ${geral.nome_jogo} -`))
                                                .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                                                .setThumbnail(interaction.guild.iconURL())
                                                .setTimestamp()
                                        }

                                        await modal.interaction.reply({
                                            embeds: [
                                                await gerarBomba()
                                            ],
                                            components: [
                                                new MessageActionRow().addComponents(
                                                    criar_btn(
                                                        new MessageButton().setLabel("Confirmar").setStyle("SUCCESS")
                                                            .setEmoji(config.emojis.confirmacor),
                                                        async (inter) => {
                                                            inter.deferUpdate()

                                                            await channel.bulkDelete(15)

                                                            if (config.manual.pix !== "") {
                                                                podeExcluir = false

                                                            }
                                                            const data = await payments.New(geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado))
                                                            const carrinhoatual = `./${Math.floor(Math.random() * 1e9)}.png`

                                                            const copia_cola = data?.point_of_interaction?.transaction_data?.qr_code
                                                            const qr_code_base64 = data?.point_of_interaction?.transaction_data?.qr_code_base64

                                                            await fs.writeFileSync(carrinhoatual, await div(qr_code_base64, config.geral["qr-div"], config.geral.rgb.R, config.geral.rgb.G, config.geral.rgb.B))
                                                            const msg = await (await channel.guild.channels.fetch()).get(config.canais["qr-codes"]).send({
                                                                files: [carrinhoatual]
                                                            })
                                                            setTimeout(() => {
                                                                fs.unlinkSync(carrinhoatual)
                                                            }, 1000 * 10)
                                                            const qrCodeUrl = msg.attachments.first().url

                                                            let a = {}
                                                            if (config.manual.pix !== '') {
                                                                a = {
                                                                    content: copia_cola
                                                                }
                                                            }

                                                            const DataAtual = Data()
                                                            DataAtual.setMinutes(DataAtual.getMinutes() + 10)

                                                            let valorEDesconto = '';
                                                            if (descontoAplicado > 0) {
                                                                valorEDesconto = `ᴅᴇ **~~R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}~~** ᴘᴏʀ **R$ ${(geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado)).toFixed(2).replace('.', ',')}**`;
                                                            } else {
                                                                valorEDesconto = `**R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}**`;
                                                            }


                                                            const ISSOAQUI = await channel.send({
                                                                embeds: [
                                                                    new MessageEmbed()
                                                                        .setColor(config.geral["cor-embeds"])
                                                                        .setAuthor({ name: "Pagamento", iconURL: await interaction.guild.iconURL() })

                                                                        .setThumbnail(interaction.guild.iconURL())
                                                                        .setDescription(`
> ID de transação:  
> ${data?.id == 0 ? '' : `${data?.id}`}

> Realize o pagamento escaneando o QRCode ou com a nossa Chave Pix acima!\n\n> Nome: **${config.manual.nome}**\n> Banco: **${config.manual.instituicao}**\n\n> Nome do Roblox: **${geral.nick}**\n> Perfil do Roblox: **[Clique Aqui](${geral.link})**\n\n- Você está pagando por:\n> Quantidade de Robux: **${geral.valor_robux}**\n> Jogo: **${geral.nome_jogo}**\n> Gamepass: **${geral.nome_gamepass}**\n\n> Esse pagamento expira ${config.manual.pix == "" ? `<t:${Math.floor(DataAtual.getTime() / 1000)}:R>` : 'em: Nunca'}.${data?.id == 0 ? "\n\n> Após pagar, envie o comprovante e espere até que a nossa equipe entre em contato pelo ticket." : ''}\n\n> 💸 Valor: ${valorEDesconto}
                                                                                        `)
                                                                        .setImage(qrCodeUrl)
                                                                        .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                                                                        .setTimestamp()
                                                                ],
                                                                ...a,
                                                                components: [
                                                                    new MessageActionRow().addComponents(
                                                                        criar_btn(
                                                                            new MessageButton().setLabel("Código Copia e Cola").setStyle("PRIMARY").setEmoji('📋')
                                                                                .setEmoji("1314076917745324042"),
                                                                            async (inter) => {
                                                                                inter.reply({
                                                                                    content: copia_cola,
                                                                                    ephemeral: true

                                                                                })
                                                                            }
                                                                        ),
                                                                        criar_btn(
                                                                            new MessageButton().setLabel("Fechar Ticket").setStyle("DANGER")
                                                                                .setEmoji("1368414354327994469"),
                                                                            async (inter) => {
                                                                                if (config.manual.pix == "") {
                                                                                    // Automatico
                                                                                    payments.Cancel(data?.id)

                                                                                    seraFechado(inter.channel)
                                                                                    await wait(15000)

                                                                                    inter.channel.delete()
                                                                                } else {

                                                                                }

                                                                            }
                                                                        )
                                                                    )
                                                                ],

                                                            })

                                                            if (config.manual.pix !== '') {
                                                                podeExcluir = false
                                                            }

                                                            let aguardando = setInterval(async () => {
                                                                if ((await payments.Get(data.id)).status == 'approved' || canaisAprovados.includes(channel.id) == true) {
                                                                    clearInterval(aguardando)
                                                                    clearTimeout(limite)

                                                                    podeExcluir = false

                                                                    interaction.member.roles.add(config.cargos["cargo-cliente"]).catch(() => {

                                                                    })




                                                                    ISSOAQUI.edit({ components: [] })

                                                                    const dataInfo = Data()
                                                                    client.channels.cache.get(config.canais["logs-compras"]).send({
                                                                        content: `<@${interaction.user?.id}>`,
                                                                        embeds: [
                                                                            new MessageEmbed()
                                                                                .setColor(config.geral["cor-embeds"])
                                                                                .setAuthor({ iconURL: await interaction.user.avatarURL(), name: `${config.geral.loja} | Pedido aprovado!` })
                                                                                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                                                                                .setDescription(`
> <:usercor:${config.emojis.usercor}> | **ID de pedido**
> * \`\`${canaisAprovados2[channel.id] ? canaisAprovados2[channel.id] : data?.id}\`\`

> <:usercor:${config.emojis.usercor}> | **Comprador**
> * <@${interaction.user.id}>

> 💸 | **Valor pago**  
> * \`\`${geral.valor_reais}\`\`

> <:oi:${config.emojis.fcsticketcor}> | **Quantia em robux** 
> * \`\`R$ ${geral.valor_robux} Robux\`\`

> <:jogocor:${config.emojis.jogocor}> | **Jogo**
> * \`\`${geral.nome_jogo}\`\`

> <:robloxcor:${config.emojis.robloxcor}> | **Gamepass (Produto)**
> * \`\`${geral.nome_gamepass}\`\`

> <:fcsticketcor:${config.emojis.fcsticketcor}> | **ID de ticket**
> * \`\`${channel.id}\`\`

> <:relogiocor:${config.emojis.relogiocor}> | **Pedido feito em**
> * <t:${Math.floor(dataInfo.getTime() / 1000)}:F> (<t:${Math.floor(dataInfo.getTime() / 1000)}:R>)
`)
                                                                                .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                                                                                .setImage(config.imagens["pedido-aprovado"] !== "" ? config.imagens["pedido-aprovado"] : null)
                                                                                .setTimestamp()
                                                                        ]
                                                                    })

                                                                    channel.send({
                                                                        embeds: [
                                                                            new MessageEmbed()
                                                                                .setColor(config.geral["cor-embeds"])
                                                                                .setAuthor({ name: "Pagamento Aprovado!", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                                                                                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                                                                                .setDescription(`
Seu **pagamento foi confirmado**, aguarde até que um **membro de nossa equipe** entre em **contato **por aqui.

> Nome: **${geral.nick}**
> Perfil: **[Clique Aqui](${geral.link})**
> Quantia de Robux: **${geral.valor_robux}**
> Jogo: **${geral.nome_jogo}**
> Gamepass: **${geral.nome_gamepass}**
                                                                                                 `)
                                                                                .addField(`**Horário de Atendimento**`, `> https://discord.com/channels/${interaction.guild.id}/${config.canais["canal-horario-atendimento"]}`, true)
                                                                                .addField(`**Prazo de Entrega**`, `> Em até **72 horas**`, true)
                                                                                .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                                                                                .setImage(config.imagens["pagamento-aprovado"] !== "" ? config.imagens["pagamento-aprovado"] : null)
                                                                                .setTimestamp()
                                                                        ]
                                                                    })

                                                                    const oCategoria = await client.channels.fetch(config.categorias["aprovados-gamepass"])
                                                                    await channel.setParent(await categoria(interaction.guild, oCategoria.id, oCategoria.name))
                                                                    await channel.setName(`🟩┃gamepass-${geral.valor_robux}-${interaction.user.username}`)




                                                                    channel.permissionOverwrites.set([
                                                                        { id: interaction.guild.id, deny: ['VIEW_CHANNEL'] },
                                                                        { id: interaction.user.id, allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'] },

                                                                        ...config["cargos-administradores"].map(v => {
                                                                            return {
                                                                                id: v,
                                                                                allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                                                                            }
                                                                        })
                                                                    ])

                                                                    registrarVenda(geral.valor_reais, geral.valor_robux, interaction.user.id)


                                                                }
                                                            }, 5000)

                                                            let limite = setTimeout(() => {
                                                                if (config.manual.pix !== '') {
                                                                    return
                                                                }
                                                                clearInterval(aguardando)

                                                                payments.Cancel(data?.id)
                                                                channel.delete()
                                                            }, 1000 * 60 * 10)
                                                        }
                                                    ),
                                                    criar_btn(
                                                        new MessageButton().setLabel('Adicionar Cupom').setEmoji(config.emojis.cupomcor).setStyle('PRIMARY'),
                                                        async (inter) => {
                                                            const { get, interaction } = await esperar_modal(inter, "Digite o cupom de desconto abaixo:", [
                                                                {
                                                                    customId: 'cupom',
                                                                    label: 'Cupom de desconto',
                                                                    placeholder: 'Ex: OFF20',
                                                                    required: true,
                                                                    style: 'SHORT',
                                                                },
                                                            ])

                                                            const cupom = get('cupom')

                                                            const cupoms = await getValue('cupoms')

                                                            if (cupoms.findIndex(v => v.nome == cupom) !== -1) {
                                                                const t = cupoms[cupoms.findIndex(v => v.nome == cupom)]
                                                                const usos = t.usos
                                                                const quantidade = t.quantidade

                                                                if (usos >= quantidade) {
                                                                    return interaction.reply({ ephemeral: true, content: "Cupom com máximo de uso!" })
                                                                }

                                                                t.usos = usos + 1

                                                                await setValue('cupoms', cupoms)


                                                                const desconto = t.desconto


                                                                interaction.reply({
                                                                    embeds: [
                                                                        new MessageEmbed()
                                                                            .setDescription(`<:cupomcor:${config.emojis.cupomcor}> | **Um desconto de \`\`${desconto}% OFF\`\` foi aplicado no seu pedido**`)
                                                                            .setColor(config.geral["cor-embeds"])
                                                                    ],
                                                                    components: [

                                                                    ]
                                                                })

                                                                descontoAplicado = desconto

                                                                modal.interaction.editReply({
                                                                    embeds: [
                                                                        await gerarBomba()
                                                                    ]
                                                                })

                                                                await wait(1500)

                                                                interaction.deleteReply()
                                                            } else {
                                                                interaction.reply({ ephemeral: true, content: "Cupom inválido!" })
                                                            }
                                                        }
                                                    ),
                                                    criar_btn(
                                                        new MessageButton().setLabel("Fechar Ticket").setStyle("DANGER")
                                                            .setEmoji("1368414354327994469"),
                                                        async (inter) => {
                                                            seraFechado(inter.channel)
                                                            await wait(15000)

                                                            inter.channel.delete()
                                                        }
                                                    ),
                                                    criar_btn(
                                                        new MessageButton().setLabel("Editar").setStyle("SECONDARY")
                                                            .setEmoji("1187635101555773531"),
                                                        async (inter) => {
                                                            InterVoltar = inter
                                                            vouRetornar = true

                                                        }
                                                    ),


                                                )
                                            ]
                                        })

                                        while (vouRetornar == null) {
                                            await wait(100)
                                        }
                                        if (vouRetornar == true) {
                                            continue
                                        }
                                        break
                                    }


                                }
                            ),
                            criar_btn(
                                new MessageButton().setLabel('Não').setStyle('SECONDARY')
                                    .setEmoji('1368414354327994469'),
                                async (inter) => {
                                    inter.deferUpdate();
                                    souEu = false;
                                }
                            ),
                            criar_btn(
                                new MessageButton().setLabel('Cancelar').setStyle('DANGER')
                                    .setEmoji('1368414354327994469'),
                                async (inter) => {
                                    inter.deferUpdate();
                                    seraFechado(channel)
                                    await wait(15000)

                                    channel.delete();
                                }
                            )
                        )
                    ]
                });

                do {
                    await wait(0)
                } while (souEu == null)

                if (souEu == true) {
                    geral.nick = resp.content
                    geral.avatar = avatar
                    break
                }
            } while (geral.nick == "")




        }

        if (Robux) {

            if (config["loja-on"] == false) {
                interaction.reply({
                    content: `> A loja está fechada no momento. Para ser notificado quando ela abrir, clique no botão abaixo.`, ephemeral: true
                })

                const embed = interaction.message.embeds[0]
                embed.description = embed.description.replace("🟢 Disponível", "🔴 Indisponível")
                // interaction.message.edit({
                //     embeds: [
                //         embed
                //     ],
                // })
                return
            }
            const embed = interaction.message.embeds[0]
            if (embed.description.includes("🔴 Indisponível")) {
                embed.description = embed.description.replace("🔴 Indisponível", "🟢 Disponível")
                interaction.message.edit({
                    embeds: [
                        embed
                    ],
                })
            }
            await interaction.deferReply({ ephemeral: true })

            const channels = interaction.guild.channels.cache.filter(c => c.type == 'GUILD_TEXT' && c.name.startsWith(`🛒|robux`) && c.name.startsWith(interaction.user.username));
            if (channels.size > 0) {
                return interaction.editReply({
                    content: '**Você ja tem um ticket aberto!**',
                    ephemeral: true
                });
            }

            const cOriginal = await client.channels.fetch(config.categorias["carrinhos-robux"])
            const channel = await interaction.guild.channels.create(`🛒┃robux-${interaction.user.username}`, {
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                    },
                    {
                        id: interaction.user.id,
                        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
                    },

                    ...config["cargos-administradores"].map(v => {
                        return {
                            id: v,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        }
                    })
                ],
                parent: await categoria(interaction.guild, cOriginal.id, cOriginal.name),
            })

            let lastMessage = Date.now()

            client.on('interactionCreate', async (inter) => {
                if (inter.channel.id == channel.id) {
                    lastMessage = Date.now()
                }
            })
            client.on('messageCreate', async (message) => {
                if (message.channel.id == channel.id) {
                    lastMessage = Date.now()
                }
            })

            let podeExcluir = true
            const inatividade = setInterval(() => {

                const diff = (Date.now() - lastMessage)
                const seconds = diff / 1000


                if (seconds > (60 * 10) && podeExcluir) {
                    setTimeout(() => {
                        channel.delete()
                    }, 5000)
                    clearInterval(inatividade)
                    channel.send("**Deletando por inatividade!**")
                }
            }, 2000)

            warn(`O carrinho de ${interaction.user.username} foi aberto com sucesso!`)

            interaction.editReply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`<:fcsticketcor:${config.emojis.fcsticketcor}> ${interaction.user.username} | ${config.geral.loja}.`)
                        .setDescription(`| Seu carrinho foi aberto com sucesso
| Nosso atendimento é 100% automático, portanto, responda somente o que o bot perguntar!`)
                        .setColor(config.geral["cor-embeds"])

                        .setThumbnail(interaction.guild.iconURL())

                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`)
                            .setEmoji("<:carrinho_cinza7:1194009126871781498>")
                            .setStyle("LINK")

                            .setLabel(`Ir para o carrinho`)
                    )
                ],
                ephemeral: true
            })

            let Continuar = null
            const msg = await channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.geral["cor-embeds"])
                        .setAuthor({ name: "Seu Carrinho", iconURL: await interaction.guild.iconURL() })
                        .setThumbnail(interaction.guild.iconURL())

                        .setDescription(`> <:carrinhocor:${config.emojis.carrinhocor}> › **Olá, <@${interaction.user.id}> ! **Seja **bem-vindo** ao seu carrinho.

> Para continuar a sua compra, aperta o botão **"Confirmar"** e responda as **perguntas**. Caso tenha aberto o carrinho por **engano** ou tenha **mudado** de ideia, utilize o botão **Cancelar**.

> Você pode parar o processo a qualquer momento.

> Lembre-se de ler nossos **termos de compra**, para não ter nenhum problema futuramente, ao continuar com a compra, você **concorda** com nossos **termos**.
 
`)
                        .setImage(await gerar_texto_em_imagem('./Imagens/4.png', 'Seu Carrinho', '- Compra de Robux -'))
                ],
                components: [
                    new MessageActionRow().addComponents(
                        criar_btn(
                            new MessageButton().setLabel('Aceitar e Continuar').setStyle('PRIMARY')
                                .setEmoji('1330765654634270740'),
                            async (inter) => {

                                inter.deferUpdate()
                                Continuar = true
                            }),

                        criar_btn(
                            new MessageButton().setLabel('Cancelar').setStyle('DANGER')
                                .setEmoji("1368414354327994469"),
                            async (inter) => {
                                inter.deferUpdate()
                                Continuar = false
                            }),

                        criar_btn(
                            new MessageButton().setLabel('Ler os Termos').setStyle('PRIMARY')
                                .setEmoji("1196181464220446871"),
                            async (inter) => {
                                inter.reply({
                                    ephemeral: true,
                                    embeds: [
                                        new MessageEmbed()
                                            .setDescription(await fs.readFileSync('./termos.txt', 'utf8'))
                                            .setColor(config.geral["cor-embeds"])
                                    ]
                                })

                            }),
                    )
                ]
            })

            while (Continuar == null) {
                await wait(0)
            }

            if (Continuar == false) {
                seraFechado(channel)
                await wait(15000)

                await channel.delete().catch(() => { })
            }

            msg.edit({
                components: []
            })

            let geral = {
                nick: "",
                avatar: "",
                valor_robux: 0,
                valor_reais: 0,

            }

            do {
                const perg = await channel.send(`<:usercor:${config.emojis.usercor}> › Qual é o seu **nickname** no Roblox?
> **OBS**: Escreva **apenas** o seu nick.`)

                const resp = await esperar_mensagem(interaction.user.id, 1000 * 60 * 5, channel.id)
                if (resp == false) {
                    continue
                }
                await resp.delete()
                await perg.delete()
                await channel.send({
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageButton()
                                .setCustomId('aguardando')
                                .setLabel("Buscando Informações...")
                                .setStyle("SECONDARY")
                                .setEmoji({ animated: true, id: '1340711352980869253' })
                                .setDisabled(true)
                        )
                    ]
                })

                const userId = await getUserId(resp.content)
                if (String(userId).includes('https')) {
                    await channel.bulkDelete(1)
                    await channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setColor(config.geral["cor-embeds"])
                                .setDescription(`**Esse usuário não foi encontrado, tente novamente!**`)
                        ]
                    })

                    await wait(1000)
                    await channel.bulkDelete(1)

                    continue
                }
                const avatar = await getAvatarUrl(userId)

                let souEu = null

                await channel.bulkDelete(1)
                channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.geral["cor-embeds"])
                            .setAuthor({ name: `${resp.content} (@${resp.content})`, iconURL: avatar })
                            .setDescription(`> <:inforcor:${config.emojis.inforcor}> › **Este é você?**
                            
                > Nome: **${resp.content}**
                > Perfil: **[Clique aqui](https://www.roblox.com/pt/users/${userId}/profile)**`)
                            .setThumbnail(avatar)
                            .setImage(await gerar_texto_em_imagem('./Imagens/5.png', `${resp.content}`, ''))
                            .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            criar_btn(
                                new MessageButton().setLabel('Sim').setStyle('SUCCESS')
                                    .setEmoji('1330765654634270740'),
                                async (inter) => {
                                    inter.deferUpdate()
                                    await channel.bulkDelete(3)
                                    souEu = true
                                }
                            ),
                            criar_btn(
                                new MessageButton().setLabel('Não').setStyle('SECONDARY')
                                    .setEmoji('1368414354327994469'),
                                async (inter) => {
                                    await channel.bulkDelete(1)
                                    inter.deferUpdate();
                                    souEu = false;
                                }
                            ),
                            criar_btn(
                                new MessageButton().setLabel('Cancelar').setStyle('DANGER')
                                    .setEmoji('1368414354327994469'),
                                async (inter) => {
                                    seraFechado(channel)
                                    await wait(15000)

                                    inter.deferUpdate();
                                    channel.delete();
                                }
                            )
                        )
                    ]
                });

                do {
                    await wait(0)
                } while (souEu == null)

                if (souEu == true) {
                    geral.nick = resp.content
                    geral.avatar = avatar
                    geral.link = `https://www.roblox.com/pt/users/${userId}/profile`
                    break
                }
            } while (geral.nick == "")

            let podePassar = false
            let descontoAplicado = 0

            do {
                await channel.send(`<:robuxcor:${config.emojis.robuxcor}> › Quantos **Robux** você deseja? Deve ser entre 100 e 25000.\n> **Exemplo:** 100`)
                const resp = await esperar_mensagem(interaction.user.id, 1000 * 60 * 15, channel.id)
                if (resp == false) {
                    continue
                }

                if (isNaN(resp.content)) {
                    channel.send(`Por favor envie um valor válido!`)
                    await wait(1000)
                    await channel.bulkDelete(3)
                    continue
                }

                if (resp.content < 100 || resp.content > 25000) {
                    channel.send(`Por favor envie um valor entre 100 e 25000!`)
                    await wait(1000)
                    await channel.bulkDelete(3)
                    continue
                }


                await channel.bulkDelete(2)

                geral.valor_robux = Math.floor(Number(resp.content))
                geral.valor_reais = Number(calcular_robux(Math.floor(Number(resp.content))).toFixed(2))

                let Aceito = null

                async function gerarBomba() {
                    let valorEDesconto = '';
                    if (descontoAplicado > 0) {
                        valorEDesconto = `ᴅᴇ **~~R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}~~** ᴘᴏʀ **R$ ${(geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado)).toFixed(2).replace('.', ',')}**`;
                    } else {
                        valorEDesconto = `**R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}**`;
                    }
                    return new MessageEmbed()
                        .setColor(config.geral["cor-embeds"])
                        .setAuthor({ name: `Seu carrinho`, iconURL: interaction.guild.iconURL() })
                        .setDescription(`> <:carrinhocor:${config.emojis.carrinhocor}> › Seu **carrinho**.\n\n> **Abaixo** está o orçamento de sua compra. Caso queira **prosseguir** com a sua compra, aperte o botão **"Confirmar"**, caso queira **desitir**, aperte o botão **"Cancelar"** ou caso queira **alterar** a quantia, utilize o botão **"Editar"**.`)
                        .setImage(await gerar_texto_em_imagem('./Imagens/4.png', `R$ ${String((geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado)).toFixed(2)).replace(".", ",")}`, '- ' + geral.valor_robux + ' Robux -'))

                        .addField(`**Robux:**`, `> <:robuxcor:${config.emojis.robuxcor}> **${geral.valor_robux}**`, true)
                        .addField(`**Preço:**`, `> 💸 ${valorEDesconto}`, true)
                        .addField(`**Desconto:**`, `> <:cupomcor:${config.emojis.cupomcor}> **${descontoAplicado}%**`, true)

                        .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                        .setThumbnail(interaction.guild.iconURL())
                        .setTimestamp()
                }

                let msg;
                msg = await channel.send({
                    embeds: [
                        await gerarBomba()
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            criar_btn(
                                new MessageButton().setStyle("SUCCESS").setLabel("Confirmar")
                                    .setEmoji(config.emojis.confirmacor),
                                async (inter) => {
                                    inter.deferUpdate().then(a => {
                                        Aceito = true
                                    })
                                }
                            ),
                            criar_btn(
                                new MessageButton().setLabel('Adicionar Cupom')
                                    .setEmoji(config.emojis.cupomcor)
                                    .setStyle('PRIMARY'),
                                async (inter) => {
                                    const { get, interaction } = await esperar_modal(inter, "Digite o cupom de desconto abaixo:", [
                                        {
                                            customId: 'cupom',
                                            label: 'Cupom de desconto',
                                            placeholder: 'Ex: OFF20',
                                            required: true,
                                            style: 'SHORT',
                                        },
                                    ])

                                    const cupom = get('cupom')

                                    const cupoms = await getValue('cupoms')

                                    if (cupoms.findIndex(v => v.nome == cupom) !== -1) {
                                        const t = cupoms[cupoms.findIndex(v => v.nome == cupom)]
                                        const usos = t.usos
                                        const quantidade = t.quantidade

                                        if (usos >= quantidade) {
                                            return interaction.reply({ ephemeral: true, content: "Cupom com máximo de uso!" })
                                        }

                                        t.usos = usos + 1

                                        await setValue('cupoms', cupoms)


                                        const desconto = t.desconto


                                        interaction.reply({
                                            embeds: [
                                                new MessageEmbed()
                                                    .setDescription(`<:cupomcor:${config.emojis.cupomcor}> | **Um desconto de \`\`${desconto}% OFF\`\` foi aplicado no seu pedido**`)
                                                    .setColor(config.geral["cor-embeds"])
                                            ],
                                            components: [

                                            ]
                                        })

                                        descontoAplicado = desconto

                                        msg.edit({ embeds: [await gerarBomba()] })

                                        await wait(1500)

                                        interaction.deleteReply()
                                    } else {
                                        interaction.reply({ ephemeral: true, content: "Cupom inválido!" })
                                    }
                                }
                            ),
                            criar_btn(
                                new MessageButton().setStyle("DANGER").setLabel("Fechar Ticket")
                                    .setEmoji("1368414354327994469"),
                                async (inter) => {
                                    seraFechado(inter.channel)
                                    await wait(15000)

                                    inter.channel.delete()
                                }
                            ),
                            criar_btn(
                                new MessageButton().setStyle("SECONDARY").setLabel("Editar")
                                    .setEmoji("1187635101555773531"),
                                async (inter) => {
                                    inter.deferUpdate().then(a => {
                                        Aceito = false
                                    })
                                }
                            )
                        )
                    ]
                })

                while (Aceito == null) { await wait(0) }

                if (Aceito == false) {
                    await channel.bulkDelete(1)
                    continue
                }
                podePassar = true
                break
            } while (podePassar == false)

            if (true) {

                let valorEDesconto = '';
                if (descontoAplicado > 0) {
                    valorEDesconto = `ᴅᴇ **~~R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}~~** ᴘᴏʀ **R$ ${(geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado)).toFixed(2).replace('.', ',')}**`;
                } else {
                    valorEDesconto = `**R$ ${geral.valor_reais.toFixed(2).replace('.', ',')}**`;
                }



                await channel.bulkDelete(100)
                if (config.manual.pix !== "") {
                    podeExcluir = false
                }
                const data = await payments.New(geral.valor_reais - calcular_desconto(geral.valor_reais, descontoAplicado))
                const carrinhoatual = `./${Math.floor(Math.random() * 1e9)}.png`

                const copia_cola = data?.point_of_interaction?.transaction_data?.qr_code
                const qr_code_base64 = data?.point_of_interaction?.transaction_data?.qr_code_base64

                await fs.writeFileSync(carrinhoatual, await div(qr_code_base64, config.geral["qr-div"], config.geral.rgb.R, config.geral.rgb.G, config.geral.rgb.B))
                const msg = await (await channel.guild.channels.fetch()).get(config.canais["qr-codes"]).send({
                    files: [carrinhoatual]
                })
                setTimeout(() => {
                    fs.unlinkSync(carrinhoatual)
                }, 1000 * 10)
                const qrCodeUrl = msg.attachments.first().url

                let a = {}
                if (config.manual.pix !== '') {
                    a = {
                        content: copia_cola
                    }
                }

                const DataAtual = Data()
                DataAtual.setMinutes(DataAtual.getMinutes() + 10)


                const painel = await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.geral["cor-embeds"])
                            .setAuthor({ name: "Pagamento", iconURL: await interaction.guild.iconURL() })
                            .setThumbnail(interaction.guild.iconURL())
                            .setDescription(`
> ID de transação:  
> ${data?.id == 0 ? '' : `${data?.id}`}

> Realize o pagamento escaneando o QRCode ou com a nossa Chave Pix acima!\n\n> Nome: **${config.manual.nome}**\n> Banco: **${config.manual.instituicao}**\n\n> Nome do Roblox: **${geral.nick}**\n> Perfil do Roblox: **[Clique Aqui](${geral.link})**\n\n- Você está pagando por:\n> Quantidade de Robux: **${geral.valor_robux}**\n\n> Esse pagamento expira ${config.manual.pix == "" ? `<t:${Math.floor(DataAtual.getTime() / 1000)}:R>` : 'em: Nunca'}.${data?.id == 0 ? "\n\n> Após pagar, envie o comprovante e espere até que a nossa equipe entre em contato pelo ticket." : ''}\n\n> 💸 Valor: ${valorEDesconto}
                                            `)
                            .setImage(qrCodeUrl)
                            .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                            .setTimestamp()
                    ],
                    ...a,
                    components: [
                        new MessageActionRow().addComponents(
                            criar_btn(
                                new MessageButton().setLabel("Código Copia e Cola").setStyle("PRIMARY").setEmoji('📋')
                                    .setEmoji("1314076917745324042"),
                                async (inter) => {
                                    inter.reply({
                                        content: copia_cola,
                                        ephemeral: true
                                    })
                                }
                            ),
                            criar_btn(
                                new MessageButton().setLabel("Fechar Ticket").setStyle("DANGER")
                                    .setEmoji("1368414354327994469"),
                                async (inter) => {
                                    if (config.manual.pix == "") {
                                        // Automatico
                                        payments.Cancel(data?.id)
                                        seraFechado(inter.channel)
                                        await wait(15000)

                                        inter.channel.delete()
                                    } else {

                                    }

                                }
                            )
                        )
                    ],

                })

                podeExcluir = false

                let aguardando = setInterval(async () => {
                    if ((await payments.Get(data.id)).status == 'approved' || canaisAprovados.includes(channel.id) == true) {
                        clearInterval(aguardando)
                        clearTimeout(limite)

                        podeExcluir = false

                        painel.edit({ components: [] }).catch(() => {

                        })

                        interaction.member.roles.add(config.cargos["cargo-cliente"]).catch(() => {

                        })



                        const dataInfo = Data()

                        client.channels.cache.get(config.canais["logs-compras"]).send({
                            content: `<@${interaction.user?.id}>`,
                            embeds: [
                                new MessageEmbed()
                                    .setColor(config.geral["cor-embeds"])
                                    .setAuthor({ iconURL: await interaction.user.avatarURL(), name: `${config.geral.loja} | Pedido aprovado!` })
                                    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                                    .setDescription(`
> <:usercor:${config.emojis.usercor}> | **ID de pedido**
> * \`\`${canaisAprovados2[channel.id] ? canaisAprovados2[channel.id] : data?.id}\`\`

> <:usercor:${config.emojis.usercor}> | **Comprador**
> * <@${interaction.user.id}>

> 💸 | **Valor pago**  
> * \`\`R$ ${geral.valor_reais}\`\`

> <:oi:${config.emojis.fcsticketcor}> | **Quantia em robux (Produto)** 
> * \`\`${geral.valor_robux} Robux\`\`

> <:fcsticketcor:${config.emojis.fcsticketcor}> | **ID de ticket**
> * \`\`${channel.id}\`\`

> <:relogiocor:${config.emojis.relogiocor}> | **Pedido feito em**
> * <t:${Math.floor(dataInfo.getTime() / 1000)}:F> (<t:${Math.floor(dataInfo.getTime() / 1000)}:R>)
`)
                                    .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                                    .setImage(config.imagens["pedido-aprovado"] !== "" ? config.imagens["pedido-aprovado"] : null)
                                    .setTimestamp()
                            ]
                        })


                        const cOriginal = await client.channels.fetch(config.categorias["robux-pendente"])
                        await channel.setParent(await categoria(interaction.guild, cOriginal.id, cOriginal.name))
                        await channel.setName(channel.name.replace("🛒", "🟡"))

                        channel.permissionOverwrites.set([
                            { id: interaction.guild.id, deny: ['VIEW_CHANNEL'] },
                            { id: interaction.user.id, allow: ['VIEW_CHANNEL'] },

                            ...config["cargos-administradores"].map(v => {
                                return {
                                    id: v,
                                    allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                                }
                            })
                        ])

                        registrarVenda(geral.valor_reais, geral.valor_robux, interaction.user.id)

                        if (config.manual.pix == '') {
                            await channel.bulkDelete(10)
                        }

                        const old = JSON.parse(fs.readFileSync('./finalizados.json', 'utf8'))

                        old[channel.id] = {
                            username: geral.nick,
                            valor_robux: geral.valor_robux,
                            valor_reais: geral.valor_reais,
                            timestamp: new Date().getTime(),
                            id: interaction.user.id,
                            valor_taxado: calcular_com_taxa(geral.valor_robux),

                        }
                        fs.writeFileSync('./finalizados.json', JSON.stringify(old, null, 2))


                        await channel.send({
                            embeds: [
                                new MessageEmbed()
                                    .setColor(config.geral["cor-embeds"])
                                    .setAuthor({ name: 'Pagamento Aprovado!', iconURL: interaction.guild.iconURL() })
                                    .setDescription(`Sua compra foi confirmada com sucesso. Agora, **crie uma gamepass no valor indicado abaixo** para receber seus Robux em 7 dias (restrição do Roblox).\n\n> Nome: **${geral.nick}**\n> Perfil do Roblox: **[Clique Aqui](${geral.link})**\n> Quantia de Robux: **${geral.valor_robux}**\n\n**Como criar gamepass: **\nhttps://www.youtube.com/watch?v=B-LQU3J24pI\n<:robuxcor:${config.emojis.robuxcor}> **Valor da Gamepass:**\n> **${calcular_com_taxa(geral.valor_robux)}** *(Coloque este valor ao criar a gamepass)*`)
                                    .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                                    .setTimestamp()
                                    .setImage(await gerar_texto_em_imagem('./Imagens/4.png', 'Crie sua gamepass!', `- Pagamento aprovado -`))
                            ],
                            components: [
                                new MessageActionRow().addComponents(
                                    new MessageButton()
                                        .setLabel("Gamepass Finalizada")
                                        .setCustomId(`finalizada_${channel.id}`)
                                        .setEmoji(config.emojis.confirmacor)
                                        .setStyle("SECONDARY")
                                )
                            ]
                        })

                    }
                }, 5000)

                let limite = setTimeout(() => {

                    if (config.manual.pix !== '') {
                        return
                    }
                    clearInterval(aguardando)
                    payments.Cancel(data?.id)

                    channel.delete()
                }, 1000 * 60 * 10)
            }

        }
    }

    if (interaction.isButton()) {
        if (interaction.customId.startsWith('finalizada_')) {
            const channel = interaction.channel
            const id = interaction.customId.split("_")[1]
            const data = JSON.parse(fs.readFileSync(`./finalizados.json`, 'utf8'))

            if (!data[id]) {
                return interaction.reply({ ephemeral: true, content: `DB Não encontrada!` })
            }

            const find = data[id]


            interaction.component.setDisabled(true)

            await interaction.message.edit({
                components: interaction.message.components
            })
            interaction.deferUpdate().catch(() => {

            })

            function habilitarBotao() {
                interaction.component.setDisabled(false)
                interaction.component.setLabel('Gamepass Finalizada')


                interaction.message.edit({
                    components: interaction.message.components
                })
            }

            await channel.send({
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('aguardando')
                            .setLabel("Buscando Informações...")
                            .setStyle("SECONDARY")
                            .setEmoji({ animated: true, id: '1340711352980869253' })
                            .setDisabled(true)
                    )
                ]
            })

            const fetch = require('node-fetch');

            let username = find.username;
            let userId = null;
            let experienceIds = [];
            let gamepasses = [];
            let continuar = false
            let erro = false


            try {
                fetch(`https://users.roblox.com/v1/usernames/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        "usernames": [username],
                        "excludeBannedUsers": true
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        userId = data.data[0].id;
                        fetch(`https://games.roblox.com/v2/users/${userId}/games?sortOrder=Asc&limit=50`)
                            .then(response => response.json())
                            .then(data => {
                                const games = data;
                                if (games.length == 0) {
                                    continuar = true
                                    return
                                }
                                for (const game of games.data) {
                                    experienceIds.push(game.id);
                                }
                                experienceIds.forEach(experienceId => {
                                    fetch(`https://games.roblox.com/v1/games/${experienceId}/game-passes?limit=100&sortOrder=Asc`)
                                        .then(response => response.json())
                                        .then(data => {
                                            const passes = data;
                                            for (const pass of passes.data) {
                                                if (typeof (pass.price) == "number" && pass.price !== 0 && pass.price > 0) {
                                                    gamepasses.push({
                                                        valor: pass.price,
                                                        price: pass.price,
                                                        name: pass.name,
                                                        link: `https://www.roblox.com/game-pass/${pass.id}`,
                                                        id: pass.id
                                                    });
                                                }


                                            }
                                            continuar = true
                                        })
                                        .catch(() => {

                                        })
                                });
                            }).catch(() => {
                                erro = true
                            })
                    })
                    .catch(error => {
                        erro = true
                    });
            } catch {
                erro = true
            }

            let tempoMaximo = setTimeout(() => {
                continuar = true
            }, 7000)

            if (erro == true) {
                clearTimeout(tempoMaximo)
                channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setColor(config.geral["cor-embeds"])
                            .setDescription(`> **Tente novamente**`)
                    ]
                })
                await wait(2000)
                channel.bulkDelete(1)
                return
            }

            warn(`Todas gamepasses de ${username} foram encontradas!`)

            while (continuar == false) {
                await wait(10)
            }

            clearTimeout(tempoMaximo)

            await channel.bulkDelete(1)

            let Encontrei = false
            for (v of gamepasses) {
                if (v.valor == calcular_com_taxa(find.valor_robux)) {
                    Encontrei = {
                        id: v.id,
                        link: v.link,
                        nome: v.name,
                        valor: v.price
                    }
                }
            }

            if (Encontrei == false) {
                await channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`❌ **Gamepass de \`\`${calcular_com_taxa(find.valor_robux)}\`\` Robux não foi encontrada**`)
                            .setColor(config.geral["cor-embeds"])
                            .setDescription(`
> Talvez você tenha cometido **algum erro** ou seu **mapa esteja privado**.

> Verifique se criou a gamepass corretamente e certifique-se de que o mapa onde ela foi criada está **público**. Caso não saiba como resolver, o vídeo abaixo ensina como corrigir possíveis erros:                                                                                                                        
                    `)
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageButton()
                                .setURL('https://www.youtube.com/watch?v=B-LQU3J24pI')
                                .setLabel('Ver possíveis erros')
                                .setEmoji(config.emojis.linkcor)
                                .setStyle("LINK")
                        )
                    ]
                })
                await wait(10000)
                await channel.bulkDelete(1)
                habilitarBotao()
                return
            }

            channel.send({
                embeds: [
                    new MessageEmbed()
                        .setColor(config.geral["cor-embeds"])
                        .setAuthor({ name: "Gamepass Finalizada.", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                        .setDescription(`
        Agora, com sua **gamepass concluída**, você **não precisa fazer mais nada**. Apenas aguarde, pois em breve **um membro de nossa equipe** fará a sua **entrega**.
        
        Você será notificado no **privado** e no canal de [entregas](https://discord.com/channels/${interaction.guild.id}/${config.canais["logs-entregas"]})!                                                                                                                  
                         `)
                        .addField(`**Horário de Atendimento**`, `> https://discord.com/channels/${interaction.guild.id}/${config.canais["canal-horario-atendimento"]}`, true)
                        .addField(`**Prazo de Entrega**`, `> Em até **72 horas**`, true)
                        .setFooter({ iconURL: interaction.guild.iconURL(), text: `${config.geral.loja} © Todos os direitos reservados.` })
                        .setImage(config.imagens["gamepass-finalizada"] !== "" ? config.imagens["gamepass-finalizada"] : null)
                        .setTimestamp()

                ]
            })

            const cOriginal = await client.channels.fetch(config.categorias["aprovados-robux"])
            await channel.setParent(await categoria(interaction.guild, cOriginal.id, cOriginal.name))
            await channel.setName(channel.name.replace("🟡", "✅").replace('robux', Encontrei.valor))
            channel.permissionOverwrites.edit(interaction.user.id, {
                SEND_MESSAGES: false,
                VIEW_CHANNEL: true,
            })
            channel.permissionOverwrites.edit(interaction.guild.id, {
                VIEW_CHANNEL: false,
            })

            let atual = JSON.parse(await fs.readFileSync('./pagar.json', 'utf8'))
            atual.push([
                Encontrei.id,
                Encontrei.valor,
                channel.id,
                interaction.user.id
            ])
            await fs.writeFileSync('./pagar.json', JSON.stringify(atual, null, 2))

            const old = JSON.parse(fs.readFileSync('./finalizados.json', 'utf8'))
            if (old[interaction.channel.id]) {
                delete old[interaction.channel.id]
                fs.writeFileSync('./finalizados.json', JSON.stringify(old, null, 2))
            }

            transcript(channel.id).then(async url => {

                const channel = await client.channels.fetch(config.canais.transcripts)

                channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setAuthor({ name: `Nova transcrição gerada`, iconURL: interaction.guild.iconURL() })
                            .setDescription(`
                          
        > <:usercor:${config.emojis.usercor}> | **Comprador**
        > * <@${interaction.user.id}>
        
        > <:fcsticketcor:${config.emojis.fcsticketcor}> | **ID de ticket**
        > * \`\`${channel.id}\`\`
        
        `)
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                            .setColor(config.geral["cor-embeds"])

                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageButton()
                                .setURL(url)
                                .setEmoji('📃')
                                .setLabel(`Ver Transcrição`)
                                .setStyle("LINK")
                        )
                    ]
                })
            })


        }

        if (interaction.customId.startsWith('fecharticket')) {
            if (interaction.member.permissions.has("ADMINISTRADOR")) {
                const user = await interaction.guild.members.fetch(interaction.customId.split("_")[1])


                try {
                    client.channels.cache.get("1318425639123943475").send({
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({
                                    name: `${user.user.displayName} (@${user.user.username})`,
                                    iconURL: user.user.displayAvatarURL()
                                })
                                .setTitle(`**Carrinho Fechado!**`)
                                .setDescription(`**Carrinho:** ${interaction.channel.name}
    **> Id do Carrinho: ${interaction.channel.id}**`)
                                .setColor("DARK_RED")
                        ],
                        components: [
                            new MessageActionRow().addComponents(
                                new MessageButton()
                                    .setURL(await transcript(interaction.channel.id))
                                    .setLabel(`Ver Transcrição`)
                                    .setEmoji('📃')
                                    .setStyle("LINK")
                            )
                        ]
                    })
                } catch {

                }

                await interaction.channel.delete()

                verificarEDeletarCategoriasCarrinhos()
                verificarEDeletarCategoriasAprovados()
            } else {
                interaction.reply({ ephemeral: true, content: "**Você não tem permissão para utilizar esse comando!**" })
            }
        }

        if (interaction.customId == 'abrirticket') {

            const userChannels = interaction.guild.channels.cache.filter(channel => channel.type === 'GUILD_TEXT' && channel.name.startsWith(`🤝〡${interaction.user.username}`));
            if (userChannels.size > 0) {
                await interaction.reply({ content: `**Você já tem um ticket aberto!** <#${userChannels.first().id}>`, ephemeral: true });
                return;
            }

            async function pegar_categoria(id, client, guildId) {
                const guild = await client.guilds.fetch(guildId);
                const category = guild.channels.cache.get(id);
                return category && category.type === 4;
            }



            let category = await client.channels.fetch(config.categorias.tickets)


            const channel = await interaction.guild.channels.create(`🤝〡${interaction.user.username}`, {
                parent: await categoria(interaction.guild, category.id, category.name),
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                    },
                    {
                        id: interaction.user.id,
                        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                    },
                    {
                        id: "1273313928767733870",
                        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
                    },
                    ...config["cargos-administradores"].map(v => {
                        return {
                            id: v,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                        }
                    })
                ]
            });


            interaction.reply({
                embeds: [
                    {
                        title: "**Seu ticket foi aberto com sucesso!**",
                        description: `**Você pode acessar o mesmo clicando no link abaixo:**`,
                        color: config.geral["cor-embeds"],
                    }
                ],
                ephemeral: true,
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`)
                            .setStyle("LINK")
                            .setLabel(`🤝〡${interaction.user.username}`)
                    )
                ]
            });

            channel.sendTyping();

            setTimeout(() => {
                channel.send({
                    embeds: [
                        {
                            color: config.geral["cor-embeds"],
                            title: `**Você está no caminho certo, este é o seu ticket!**`,
                        }
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageButton()
                                .setCustomId("fecharticket_" + interaction.user.id)
                                .setStyle("DANGER")
                                .setLabel("Fechar Ticket")
                        )
                    ]
                });
            }, 1);
        }

        checkCargos(interaction.member)



    }

    if (interaction.isCommand()) {
        if (interaction.commandName == 'reais') {
            const quantidade = interaction.options.getNumber('reais')

            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(config.geral.loja)
                        .setDescription(`### 📈 Valores dos produtos
**<:oi:${config.emojis.robux}> | Robux pra conta: ${Math.floor(calcular_reais(quantidade, config["valores"]["k-robux"]))} Robux**
**<:oi:${config.emojis.robux}> | Colocar na gamepass: (${Math.floor(Math.round(calcular_com_taxa(calcular_reais(quantidade, config.valores["k-gamepass"]))))})**
**<:oi:${config.emojis.robux}> | Gamepass via GIFT: ${Math.floor((quantidade) / (Math.round(config["valores"]["k-gamepass"])) * 1000)} Robux**

`)
                        .setColor(config.geral["cor-embeds"])
                        .setImage(await gerarImagem(Math.floor(Math.random() * 39), 'Conversor', `Valor de R$ ${quantidade} Reais`))
                        .setThumbnail(config.imagens.thumbnail)
                        .setTimestamp()
                ]
            })
        }

        if (interaction.commandName == 'gastos') {
            let user = interaction.options.getUser("usuario")

            if (!user) {
                user = interaction.user
            }

            let vendas = JSON.parse(fs.readFileSync('./vendas.json', 'utf8'))
            let gastos = vendas.filter(v => v.id == user.id).map(v => v.valor)

            gastos = gastos.reduce((a, b) => a + b, 0)

            const embed = new MessageEmbed()
                .setImage(await gerarImagem(Math.floor(Math.random() * 39), user.username, `Gastou R$ ${gastos.toFixed(2)}`))
                .setColor(config.geral["cor-embeds"])

            interaction.reply({ embeds: [embed] })
        }

        if (interaction.commandName == 'ranking') {
            let paginaAtual = 1;
            let rank = JSON.parse(await fs.readFileSync('./rank.json', 'utf8'))

            const users = Object.entries(rank).sort((a, b) => b[1] - a[1]);
            const pages = Math.ceil(users.length / 10);

            const criarEmbed = async (paginaAtual) => {
                return new MessageEmbed()
                    .setAuthor({ name: "Ranking", iconURL: config.imagens.thumbnail })
                    .setColor(config.geral["cor-embeds"])
                    .setDescription(`**Ranking ${paginaAtual}/${pages}**\n\n${users.slice((paginaAtual - 1) * 10, paginaAtual * 10).map(([id, value], index) => `**${index + 1 + (paginaAtual - 1) * 10}**: <@${id}> - **R$ ${value.toFixed(2)}**`).join('\n')}`)
                    .setFooter({ text: "Para ir para próxima página utilize as setas!", iconURL: await client.user.avatarURL() });
            };

            let embed = await criarEmbed(paginaAtual);

            const row = new MessageActionRow().addComponents(
                criar_btn(
                    new MessageButton().setCustomId('Voltar').setEmoji(config.emojis["seta esquerda"]).setStyle('PRIMARY'),
                    async (interaction) => {
                        if (paginaAtual > 1) {
                            paginaAtual--;
                            embed = await criarEmbed(paginaAtual);
                            interaction.update({ embeds: [embed] });
                        } else {
                            interaction.update({ embeds: [embed] });

                        }
                    }
                ),
                criar_btn(
                    new MessageButton().setCustomId('Avançar').setEmoji(config.emojis["seta direita"]).setStyle('PRIMARY'),
                    async (interaction) => {
                        if (paginaAtual < pages) {
                            paginaAtual++;
                            embed = await criarEmbed(paginaAtual);
                            interaction.update({ embeds: [embed] });
                        } else {
                            interaction.update({ embeds: [embed] });
                        }
                    }
                )
            );

            interaction.reply({ embeds: [embed], components: [row] });


        }

        if (interaction.commandName == 'painelcupoms') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'))
            const cupoms = data.cupoms

            interaction.reply({
                ephemeral: true,
                embeds: [
                    new MessageEmbed()
                        .setTitle(`${config.geral.loja} - Cupoms`)
                        .setColor(config.geral["cor-embeds"])
                        .setAuthor({ name: config.geral.loja, iconURL: interaction.guild.iconURL() })
                        .setDescription(`Todos cupoms de ${interaction.guild.name} abaixo:\n\n${cupoms.map(v => {
                            return `> ✉ ${v.nome} (id ${v.id})\n> * Uso Max: ${v.quantidade}\n> * Usos: ${v.usos}\n> * Desconto: ${v.desconto}%`
                        }).join('\n')
                            }`)
                        .setFooter({ text: `${config.geral.loja} - Todos direitos reservados.` })
                ]
            })
        }

        if (interaction.commandName == 'calcular') {
            const quantidade = interaction.options.getNumber('robux')
            if (quantidade > 25000) {
                return interaction.reply({ ephemeral: true, content: `O Limite é de 25.000 Robux.` })
            }
            await interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(config.geral.loja)
                        .setDescription(`### 📈 Valores dos produtos
    **<:oi:${config.emojis.robux}> | Valor Robux: R$ ${calcular_robux(Math.floor(quantidade)).toFixed(2).replace('.', ',')}**
    **<:oi:${config.emojis.robux}> | Colocar na gamepass: ( ${Math.floor(calcular_com_taxa(quantidade))} )**
    **<:oi:${config.emojis.pix}> | Valor via GIFT: R$ ${calcular_gamepass(quantidade).toFixed(2).replace('.', ',')}**`)
                        .setColor(config.geral["cor-embeds"])
                        .setImage(await gerarImagem(Math.floor(Math.random() * 39), 'Conversor', `Valor de ${quantidade} Robux`))
                        .setThumbnail(config.imagens.thumbnail)
                        .setTimestamp()
                ]
            })



        }
        if (interaction.commandName === 'gerarpix') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." });
            }

            const valor = interaction.options.getNumber('valor');
            if (!valor || valor <= 0) return interaction.reply({ content: "Valor inválido.", ephemeral: true });

            await interaction.deferReply();

            try {
                const descontoAplicado = 0;
                const valorTotal = valor;
                const data = await payments.New(valorTotal - calcular_desconto(valorTotal, descontoAplicado));

                const copia_cola = data?.point_of_interaction?.transaction_data?.qr_code;
                const qr_code_base64 = data?.point_of_interaction?.transaction_data?.qr_code_base64;
                const qrTemp = `./${Math.floor(Math.random() * 1e9)}.png`;

                await fs.writeFileSync(qrTemp, await div(qr_code_base64, config.geral["qr-div"], config.geral.rgb.R, config.geral.rgb.G, config.geral.rgb.B));

                const canalQR = await interaction.guild.channels.fetch(config.canais["qr-codes"]);
                const qrMsg = await canalQR.send({ files: [qrTemp] });

                let embed = new MessageEmbed()
                    .setTimestamp()
                    .setTitle(`**QR Code - ${data.id}**`)
                    .setDescription(`O QR Code tem validade de 15 minutos. Após o pagamento, o carrinho será aprovado automaticamente.\n\n**🔑 Chave Pix:**\n\`${copia_cola}\`\n**💸 Valor:**\n${descontoAplicado > 0 ? `R$ ${(valorTotal - calcular_desconto(valorTotal, descontoAplicado)).toFixed(2)} ~~R$ ${valorTotal.toFixed(2)}~~ (Desconto: ${descontoAplicado}%)` : `R$ ${valorTotal.toFixed(2)}`}`)
                    .setImage(qrMsg.attachments.first().url)
                    .setColor(config.geral["cor-embeds"]);

                const row = new MessageActionRow().addComponents(
                    criar_btn(
                        new MessageButton()
                            .setLabel("Copia e Cola")
                            .setEmoji(config.emojis.pix)
                            .setStyle("PRIMARY"),
                        async (inter) => {
                            inter.reply({ content: copia_cola, ephemeral: true });
                        }
                    )
                );

                const reply = await interaction.editReply({ embeds: [embed], components: [row] });

                const interval = setInterval(async () => {
                    try {
                        const status = await payments.Get(data.id);
                        if (status.status === 'approved') {
                            embed = new MessageEmbed()
                                .setTimestamp()
                                .setTitle(`✅ Pagamento Aprovado — R$ ${valorTotal.toFixed(2)}`)
                                .setColor("GREEN")

                            clearTimeout(timeOutAq)
                            await reply.edit({ embeds: [embed], components: [] });
                            clearInterval(interval);
                        }
                    } catch (err) {
                        console.error("Erro ao verificar pagamento:", err.message);
                    }
                }, 5000);

                const timeOutAq = setTimeout(async () => {
                    clearInterval(interval)
                    payments.Cancel(data?.id)

                    embed = new MessageEmbed()
                        .setTimestamp()
                        .setTitle(`❌ Pagamento Expirado`)
                        .setColor("RED")
                    await reply.edit({ embeds: [embed], components: [] });
                }, 15 * 60 * 1000);

            } catch (err) {
                console.error(err);
                return interaction.editReply({ content: "Erro ao gerar pagamento: " + err.message });
            }
        }

        if (interaction.commandName == 'relatoriovendas') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            async function editarEmbed(maxStamp) {
                const Hoje = Data()
                const Inicio = Data()
                Inicio.setTime(maxStamp)

                const hoje_dia = Hoje.getDate()
                const hoje_mes = Hoje.getMonth() + 1
                const hoje_minuto = Hoje.getMinutes()
                const hoje_segundo = Hoje.getSeconds()

                const inicio_dia = Inicio.getDate()
                const inicio_mes = Inicio.getMonth() + 1
                const inicio_minuto = Inicio.getMinutes()
                const inicio_segundo = Inicio.getSeconds()

                const hoje_ano = Hoje.getFullYear();
                const inicio_ano = Inicio.getFullYear();

                const vendas = JSON.parse(await fs.readFileSync('./vendas.json', 'utf8'))

                let TotalValor = 0
                let TotalRobux = 0

                for (const venda of vendas) {
                    if (venda.timestamp >= maxStamp) {
                        TotalValor += venda.valor
                        TotalRobux += venda.robux
                    }
                }

                TotalValor = Number(TotalValor.toFixed(2))
                TotalRobux = Math.floor(TotalRobux)

                interaction.editReply({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`**Relatório de vendas - ${config.geral.loja}**`)
                            .setColor(config.geral["cor-embeds"])
                            .setDescription(`Vendas de <t:${Math.floor(maxStamp / 1000)}:f> até Hoje [<t:${Math.floor(Data().getTime() / 1000)}:d>]
Vendas à **${Math.floor((Data().getTime() - maxStamp) / (1000 * 60 * 60 * 24 * 30.44)) > 0 ? `${Math.floor((Data().getTime() - maxStamp) / (1000 * 60 * 60 * 24 * 30.44))} meses, ` : ``}${Math.floor(((Data().getTime() - maxStamp) % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24)) > 0 ? `${Math.floor(((Data().getTime() - maxStamp) % (1000 * 60 * 60 * 24 * 30.44)) / (1000 * 60 * 60 * 24))} dia(s) e ` : ``}${Math.floor((((Data().getTime() - maxStamp) % (1000 * 60 * 60 * 24 * 30.44)) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))} horas atrás.**


`)
                            .addField(`**Total de vendas:**`, `> **${TotalValor} Reais [Bruto]**`, true)
                            .addField(`**Total de vendas:**`, `> **${TotalValor * 0.99.toFixed(2)} Reais [Líquido]**`, true)
                            .addField(`**Total de Robux:**`, `> **${TotalRobux} Robux vendidos**`, false)


                    ]
                })
            }

            await interaction.reply({
                ephemeral: true,
                embeds: [
                    new MessageEmbed()
                        .setTitle("  ")
                        .setDescription("> Aguarde enquanto eu carrego todas suas vendas!")
                        .setColor(config.geral["cor-embeds"])
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageSelectMenu()
                            .setPlaceholder("Selecione uma data")
                            .setCustomId('data')
                            .setOptions([
                                gerar_smo('Hoje', `Vendas de hoje`, config.emojis.pix, null, (a) => {
                                    editarEmbed(Data().getTime() - (1000 * 60 * 60 * 24))
                                    a.deferUpdate()
                                }),
                                gerar_smo('Última Semana', `Vendas da última Semana`, config.emojis.pix, null, (a) => {
                                    editarEmbed(Data().getTime() - (1000 * 60 * 60 * 24 * 7))
                                    a.deferUpdate()
                                }),
                                gerar_smo('Último mês', `Vendas do último Mês`, config.emojis.pix, null, (a) => {
                                    editarEmbed(Data().getTime() - (1000 * 60 * 60 * 24 * 30.44))
                                    a.deferUpdate()
                                }),
                                gerar_smo('Último ano', `Vendas do último Ano`, config.emojis.pix, null, (a) => {
                                    editarEmbed(Data().getTime() - (1000 * 60 * 60 * 24 * 365.25))
                                    a.deferUpdate()
                                }),
                            ])
                    )
                ]
            })
            editarEmbed(Data().getTime() - (1000 * 60 * 60 * 24))
        }

        if (interaction.commandName == 'jogos') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            let i = -1

            const interInicial = interaction
            if (config.jogos.length == 0) {
                config.jogos.push({
                    nome: "Adicione um jogo no botao abaixo",
                    "emoji-id": config.emojis.robux
                })
            }
            const myEmbed = () => {
                return {
                    ephemeral: true,
                    embeds: [
                        embed(
                            `**Todos jogos da ${config.geral.loja}**`,
                            `*Selecione o jogo que você deseja editar/adicionar & remover gamepasses*`
                        )
                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageSelectMenu()
                                .setPlaceholder("Selecione um Jogo")
                                .setCustomId("selecionar")
                                .setOptions(config.jogos.map(v => {
                                    const gamepasses = config.jogos.find(j => j.nome === v.nome)?.gamepasses || [];
                                    const jogo = v
                                    const btnAli = criar_btn(
                                        new MessageButton().setStyle('SUCCESS').setLabel("Gamepasses").setEmoji(config.emojis.robux),
                                        async (inter) => {
                                            const interEditar = inter
                                            const gamepasses = config.jogos.find(j => j.nome === jogo.nome)?.gamepasses || [];

                                            if (gamepasses.length === 0) {
                                                return inter.reply({
                                                    content: "Nenhuma gamepass configurada. Por favor, adicione uma.",
                                                    ephemeral: true
                                                });
                                            }

                                            const options = gamepasses.map(o => {
                                                return gerar_smo(o[0], `${o[2]} Robux`, o[1], null, async (inter) => {
                                                    const nome = o[0];
                                                    inter.deferUpdate()
                                                    interEditar.editReply({
                                                        embeds: [
                                                            embed(`**Selecione abaixo o que você deseja fazer com a gamepass ${nome}**`)
                                                        ],
                                                        ephemeral: true,
                                                        components: [
                                                            new MessageActionRow().addComponents(
                                                                criar_btn(
                                                                    btn('PRIMARY', 'Excluir', config.emojis.robux),
                                                                    async (inter) => {
                                                                        const index = config.jogos.find(j => j.nome === jogo.nome).gamepasses.findIndex(g => g[0] === nome);
                                                                        if (index > -1) {
                                                                            config.jogos.find(j => j.nome === jogo.nome).gamepasses.splice(index, 1);
                                                                        }

                                                                        inter.reply({
                                                                            ephemeral: true,
                                                                            embeds: [
                                                                                embed(`**Deletado com sucesso**`)
                                                                            ]
                                                                        });
                                                                        await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                                                                    }
                                                                ),
                                                                await criar_btn(
                                                                    new MessageButton()
                                                                        .setStyle("PRIMARY")
                                                                        .setLabel("Editar Nome")
                                                                        .setEmoji("📝"),
                                                                    async (inter) => {
                                                                        const modal = await esperar_modal(inter, "Editar Nome", [
                                                                            { customId: "nome", label: "Nome", placeholder: "Novo Nome", required: true, style: "SHORT" }
                                                                        ]);

                                                                        const novoNome = modal.get("nome");
                                                                        const index = config.jogos.find(j => j.nome === jogo.nome).gamepasses.findIndex(g => g[0] === nome);

                                                                        config.jogos.find(j => j.nome === jogo.nome).gamepasses[index][0] = novoNome

                                                                        await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                                                                        interInicial.editReply({ embeds: [embed("**Alterado com sucesso! Feche e abre a embed para atualizar!**")], components: [] })
                                                                        interEditar.editReply({ embeds: [embed("**Alterado com sucesso! Feche e abre a embed para atualizar!**")], components: [] })

                                                                    }
                                                                ),
                                                                await criar_btn(
                                                                    new MessageButton()
                                                                        .setStyle("PRIMARY")
                                                                        .setLabel("Editar Emoji ID")
                                                                        .setEmoji("💬"),
                                                                    async (inter) => {
                                                                        const modal = await esperar_modal(inter, "Editar Emoji ID", [
                                                                            { customId: "emoji-id", label: "Emoji ID", placeholder: "Novo ID do Emoji", required: true, style: "SHORT" }
                                                                        ]);
                                                                        const index = config.jogos.find(j => j.nome === jogo.nome).gamepasses.findIndex(g => g[0] === nome);

                                                                        const novoEmojiID = modal.get("emoji-id");

                                                                        config.jogos.find(j => j.nome === jogo.nome).gamepasses[index][1] = novoEmojiID

                                                                        await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));


                                                                        modal.interaction.reply({
                                                                            ephemeral: true,
                                                                            embeds: [
                                                                                embed("**Alterado com sucesso! Feche e abre a embed para atualizar!**")
                                                                            ]
                                                                        });
                                                                    }
                                                                ),
                                                                await criar_btn(
                                                                    new MessageButton()
                                                                        .setStyle("PRIMARY")
                                                                        .setLabel("Editar Valor em Robux")
                                                                        .setEmoji("💰"),
                                                                    async (inter) => {
                                                                        const modal = await esperar_modal(inter, "Editar Valor em Robux", [
                                                                            { customId: "valor-robux", label: "Valor em Robux", placeholder: "Novo Valor em Robux", required: true, style: "SHORT" }
                                                                        ]);
                                                                        const index = config.jogos.find(j => j.nome === jogo.nome).gamepasses.findIndex(g => g[0] === nome);

                                                                        const novoValorRobux = modal.get("valor-robux");

                                                                        config.jogos.find(j => j.nome === jogo.nome).gamepasses[index][2] = Number(novoValorRobux)

                                                                        await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

                                                                        modal.interaction.reply({
                                                                            ephemeral: true,
                                                                            embeds: [
                                                                                embed("**Alterado com sucesso! Feche e abre a embed para atualizar!**")
                                                                            ]
                                                                        });
                                                                    }
                                                                )
                                                            )
                                                        ]
                                                    })
                                                });
                                            });

                                            inter.reply({
                                                components: [
                                                    new MessageActionRow().addComponents(
                                                        new MessageSelectMenu()
                                                            .setPlaceholder("Selecione uma gamepass")
                                                            .setCustomId("selecionar_gamepass")
                                                            .setOptions(options)
                                                    )
                                                ],
                                                ephemeral: true
                                            });
                                        }
                                    )
                                    return gerar_smo(v.nome, `Edite ${v.nome}`, v["emoji-id"], null, async (inter) => {
                                        const jogo = v
                                        inter.reply({
                                            embeds: [
                                                embed(null, "**Edite o que você deseja editar nesse jogo:**")
                                            ],
                                            ephemeral: true,
                                            components: [
                                                new MessageActionRow().addComponents(
                                                    criar_btn(
                                                        new MessageButton().setStyle('PRIMARY').setLabel("Categoria").setEmoji(config.emojis.robux),
                                                        async (inter) => {
                                                            const res = await esperar_modal(inter, "Insira o ID da categoria", [
                                                                {
                                                                    label: "ID",
                                                                    customId: "id",
                                                                    placeholder: "Insira o ID da categoria",
                                                                    required: true,
                                                                    style: "SHORT",
                                                                    maxLength: 18,
                                                                    minLength: 1
                                                                }
                                                            ])

                                                            const id = res.get("id")



                                                            if (isNaN(id)) {
                                                                return res.interaction.reply({
                                                                    ephemeral: true,
                                                                    content: "ID inválido!"
                                                                })
                                                            }


                                                            const categorias = (await inter.guild.channels.fetch()).filter(channel => channel.type === 'GUILD_CATEGORY');

                                                            const categoria = categorias.find(c => c.id === id)

                                                            if (!categoria) {
                                                                return res.interaction.reply({
                                                                    ephemeral: true,
                                                                    content: "ID inválido!"
                                                                })
                                                            }

                                                            res.interaction.reply({ ephemeral: true, content: `Categoria de ${jogo.nome} foi alterado com sucesso para <#${categoria.id}>` })
                                                            config.jogos[config.jogos.findIndex(v => v["nome"] == jogo["nome"])]["categoria"] = categoria.id

                                                            await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))
                                                        }
                                                    ),
                                                    criar_btn(
                                                        new MessageButton().setStyle('PRIMARY').setLabel("Categoria Aprovados").setEmoji(config.emojis.robux),
                                                        async (inter) => {
                                                            const res = await esperar_modal(inter, "Insira o ID da categoria aprovados", [
                                                                {
                                                                    label: "ID",
                                                                    customId: "id",
                                                                    placeholder: "Insira o ID da categoria",
                                                                    required: true,
                                                                    style: "SHORT",
                                                                    maxLength: 20,
                                                                    minLength: 1
                                                                }
                                                            ])

                                                            const id = res.get("id")



                                                            if (isNaN(id)) {
                                                                return res.interaction.reply({
                                                                    ephemeral: true,
                                                                    content: "ID inválido!"
                                                                })
                                                            }


                                                            const categorias = (await inter.guild.channels.fetch()).filter(channel => channel.type === 'GUILD_CATEGORY');

                                                            const categoria = categorias.find(c => c.id === id)

                                                            if (!categoria) {
                                                                return res.interaction.reply({
                                                                    ephemeral: true,
                                                                    content: "ID inválido!"
                                                                })
                                                            }

                                                            res.interaction.reply({ ephemeral: true, content: `Categoria de ${jogo.nome} foi alterado com sucesso para <#${categoria.id}>` })
                                                            config.jogos[config.jogos.findIndex(v => v["nome"] == jogo["nome"])]["categoria-aprovada"] = categoria.id

                                                            await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))
                                                        }
                                                    ),
                                                    criar_btn(
                                                        new MessageButton()
                                                            .setStyle("SUCCESS")
                                                            .setLabel(`Alterar Emoji Jogo`)
                                                            .setEmoji(config.emojis.robux),
                                                        async (inter) => {
                                                            const res = await esperar_modal(inter, "Insira o ID da Emoji do Jogo", [
                                                                {
                                                                    label: "ID",
                                                                    customId: "id",
                                                                    placeholder: "Insira o ID do emoji",
                                                                    required: true,
                                                                    style: "SHORT",
                                                                    maxLength: 20,
                                                                    minLength: 1
                                                                }
                                                            ])

                                                            const id = res.get("id")



                                                            if (isNaN(id)) {
                                                                return res.interaction.reply({
                                                                    ephemeral: true,
                                                                    content: "ID inválido!"
                                                                })
                                                            }


                                                            res.interaction.reply({ ephemeral: true, content: `Emoji alterado com sucesso para!` })
                                                            config.jogos[config.jogos.findIndex(v => v["nome"] == jogo["nome"])]["emoji-id"] = id

                                                            await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))
                                                        }
                                                    ),
                                                    criar_btn(
                                                        btn("SUCCESS", "Criar Gamepass", config.emojis["emoji mais +"]),
                                                        async (inter) => {
                                                            const { get, interaction: interModal } = await esperar_modal(inter, "Criar Gamepass", [
                                                                { label: "Nome", placeholder: "Ex: Dark Blade", required: true, style: "SHORT", customId: "nome" },
                                                                { label: "ID", placeholder: "Ex: 1234567890", required: true, style: "SHORT", customId: "id" },
                                                                { label: "Valor", placeholder: "Ex: 1200", required: true, style: "SHORT", customId: "valor" }
                                                            ]);

                                                            const nome = get("nome")
                                                            const id = get("id")
                                                            const valor = Number(get("valor"))

                                                            if (isNaN(valor)) {
                                                                return interModal.reply({
                                                                    content: "O valor precisa ser um número.",
                                                                    ephemeral: true
                                                                });
                                                            }

                                                            const gamepasses = config.jogos.find(j => j.nome === jogo.nome)?.gamepasses || [];
                                                            gamepasses.push([nome, id, valor])
                                                            config.jogos.find(j => j.nome === jogo.nome).gamepasses = gamepasses

                                                            fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))
                                                            interModal.reply({
                                                                content: "Gamepass adicionada com sucesso.",
                                                                ephemeral: true
                                                            });
                                                        }
                                                    ),
                                                    btnAli
                                                ),
                                                new MessageActionRow().addComponents(
                                                    criar_btn(
                                                        btn("DANGER", "Excluir jogo", config.emojis["emoji menos -"]),
                                                        async (inter) => {
                                                            const index = config.jogos.findIndex(v => v.nome == jogo.nome)

                                                            config.jogos.splice(index, 1)

                                                            await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))
                                                            inter.reply({
                                                                ephemeral: true,
                                                                embeds: [
                                                                    embed("**Jogo excluido com sucesso!**", "*Para não bugar, feche esse embed e abra outra novamente utilizando /jogos*")
                                                                ]
                                                            })
                                                        }
                                                    )
                                                )
                                            ]
                                        })
                                    })
                                }))
                        ),
                        new MessageActionRow().addComponents(
                            criar_btn(
                                new MessageButton()
                                    .setStyle("SUCCESS")
                                    .setLabel("Adicionar Jogo")
                                    .setEmoji(config.emojis["emoji mais +"]),
                                async (inter) => {
                                    const res = await esperar_modal(inter, "Insira o nome do jogo", [
                                        {
                                            label: "Nome do Jogo",
                                            style: "SHORT",
                                            customId: "nome_jogo",
                                            placeholder: "Insira o nome do jogo",
                                            min_length: 1,
                                            max_length: 50
                                        }
                                    ])


                                    const novo_jogo = {
                                        "nome": res.get("nome_jogo"),
                                        "categoria": null,
                                        "categoria-aprovada": null,
                                        "gamepasses": []
                                    }

                                    config.jogos.push(novo_jogo)

                                    await fs.writeFileSync('./config.json', JSON.stringify(config, null, 2))

                                    res.interaction.reply({
                                        ephemeral: true, embeds: [
                                            embed("**Seu jogo foi adicionado com sucesso, Utilize /jogos novamente para configurar**")
                                        ]
                                    })
                                }
                            ),

                        )
                    ]
                }
            }

            interaction.reply(myEmbed())
        }

        if (interaction.commandName == 'pendentes') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            let pendentes = JSON.parse(await fs.readFileSync('./pagar.json', 'utf8'))

            if (pendentes.length == 0) {
                return interaction.reply({
                    embeds: [
                        embed(null, "**Você não tem nenhuma pendência, Parabéns!**")
                    ],
                    ephemeral: true
                })
            }

            let i = -1
            interaction.reply({
                ephemeral: true,
                embeds: [
                    embed(
                        `**Pendências da ${config.geral.loja}:**`,
                        pendentes.map(v => {
                            i++
                            return `${i}. <@${v[3]}> - ${v[1]} Robux - https://www.roblox.com/pt/game-pass/${v[0]}/ `
                        }).join(`\n`).substring(0, 1900) + `\n\n**Total: ${pendentes.map(v => v[1]).reduce((acc, curr) => acc + curr, 0)} Robux**`
                    )
                ],
                components: [
                    new MessageActionRow().addComponents(
                        criar_btn(
                            new MessageButton()
                                .setStyle("SUCCESS")
                                .setLabel("Forçar Entrega")
                                .setEmoji(config.emojis["emoji mais +"]),
                            async (inter) => {
                                const users = await interaction.guild.members.fetch()

                                inter.reply({
                                    ephemeral: true,
                                    embeds: [
                                        embed(null, "**Selecione o Gamepass que deseja forçar a entrega.**")
                                    ],
                                    components: [
                                        new MessageActionRow().addComponents(
                                            new MessageSelectMenu()
                                                .setPlaceholder("Selecione uma gamepass")
                                                .setCustomId("Selecione")
                                                .setOptions(pendentes.splice(0, 25).map(o => {
                                                    const v = o
                                                    return gerar_smo(users.get(v[3])?.user?.username, `${v[1]} Robux`, config.emojis.robux, null, async (inter) => {
                                                        inter.reply({
                                                            ephemeral: true,
                                                            embeds: [
                                                                embed(null, "**Gamepass forçada com sucesso!**")
                                                            ]
                                                        })

                                                        forcarPagar(v)
                                                    })
                                                }))
                                        )
                                    ]
                                })
                            }
                        )
                    )
                ]
            })
        }


        if (interaction.commandName == 'disparo') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            let color = config.geral["cor-embeds"]
            let banner = config.imagens.thumbnail
            let selected = null
            interaction.reply({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**Disparo de Mensagens**`)
                        .setDescription("**Você deseja enviar essa mensagem para todos membros ou somente para os onlines?**")
                        .setColor(color)
                        .setThumbnail(banner)
                        .setTimestamp()
                ],
                ephemeral: true,
                components: [
                    new MessageActionRow().addComponents(
                        await criar_btn(
                            new MessageButton()
                                .setStyle("SUCCESS")
                                .setLabel("Onlines"),
                            async (inter) => {
                                inter.deferUpdate()
                                selected = 'onlines'
                            }
                        ),
                        await criar_btn(
                            new MessageButton()
                                .setStyle("PRIMARY")
                                .setLabel("Todos"),
                            async (inter) => {
                                inter.deferUpdate()
                                selected = 'todos'
                            }
                        )
                    )
                ]
            })

            while (selected == null) {
                await wait(1)
            }
            await interaction.editReply({
                components: [],
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**Disparo de Mensagens**`)
                        .setDescription(selected == 'todos' ? "**Estamos pegando todos membros, aguarde.**" : "**Estamos pegando todos membros online, aguarde.**")
                        .setColor(color)
                        .setThumbnail(banner)
                        .setTimestamp()
                ],
            })

            const guild = interaction.guild
            const members = await guild.members.fetch()


            let total = members.size
            let administradores = 0
            let offlines = 0
            let onlines = 0
            let enviar = []

            for (const [_, v] of members) {
                if (v.permissions.has("ADMINISTRATOR")) {
                    administradores = administradores + 1
                } else if (v?.presence?.status == 'offline' || !v?.presence) {
                    offlines = offlines + 1
                    if (selected == 'todos') {
                        enviar.push(v)
                    }
                } else if (v?.presence && v?.presence?.status !== 'offline') {
                    onlines = onlines + 1
                    enviar.push(v)
                }
            }

            await interaction.editReply({
                components: [
                    new MessageActionRow().addComponents(
                        await criar_btn(
                            new MessageButton()
                                .setStyle("SUCCESS")
                                .setLabel("Continuar"),
                            async (inter) => {
                                inter.deferUpdate()
                                let titleEmbed = 'Não setado'
                                let descriptionEmbed = 'Não setado'
                                let imageEmbed = config.imagens.thumbnail
                                let colorEmbed = config.geral["cor-embeds"]

                                const components = [
                                    new MessageActionRow().addComponents(
                                        await criar_btn(
                                            new MessageButton()
                                                .setStyle("PRIMARY")
                                                .setLabel("Titulo")
                                                .setEmoji("👨"),
                                            async (inter) => {
                                                inter.deferUpdate()
                                                inter.channel.send("**Envie:**").then(async msg1 => {
                                                    const msg2 = await esperar_mensagem(interaction.user.id, 1000 * 60 * 60 * 24, interaction.channel.id)
                                                    const msg3 = msg2.content

                                                    msg1.delete()
                                                    msg2.delete()

                                                    titleEmbed = msg3

                                                    interaction.editReply(mensagem())
                                                })
                                            }
                                        ),
                                        await criar_btn(
                                            new MessageButton()
                                                .setStyle("PRIMARY")
                                                .setLabel("Descrição")
                                                .setEmoji("👨"),
                                            async (inter) => {
                                                inter.deferUpdate()
                                                inter.channel.send("**Envie:**").then(async msg1 => {
                                                    const msg2 = await esperar_mensagem(interaction.user.id, 1000 * 60 * 60 * 24, interaction.channel.id)
                                                    const msg3 = msg2.content

                                                    msg1.delete()
                                                    msg2.delete()

                                                    descriptionEmbed = msg3

                                                    interaction.editReply(mensagem())
                                                })
                                            }
                                        ),
                                        await criar_btn(
                                            new MessageButton()
                                                .setStyle("PRIMARY")
                                                .setLabel("Color")
                                                .setEmoji("👨"),
                                            async (inter) => {
                                                inter.deferUpdate()
                                                inter.channel.send("**Envie:**").then(async msg1 => {
                                                    const msg2 = await esperar_mensagem(interaction.user.id, 1000 * 60 * 60 * 24, interaction.channel.id)
                                                    const msg3 = msg2.content

                                                    msg1.delete()
                                                    msg2.delete()

                                                    colorEmbed = msg3

                                                    interaction.editReply(mensagem())
                                                })
                                            }
                                        ),
                                        await criar_btn(
                                            new MessageButton()
                                                .setStyle("PRIMARY")
                                                .setLabel("Imagem")
                                                .setEmoji("👨"),
                                            async (inter) => {
                                                inter.deferUpdate()
                                                inter.channel.send("**Envie:**").then(async msg1 => {
                                                    const msg2 = await esperar_mensagem(interaction.user.id, 1000 * 60 * 60 * 24, interaction.channel.id)
                                                    const msg3 = msg2.content

                                                    msg1.delete()
                                                    msg2.delete()

                                                    imageEmbed = msg3

                                                    interaction.editReply(mensagem())
                                                })
                                            }
                                        ),
                                        await criar_btn(
                                            new MessageButton()
                                                .setStyle("SUCCESS")
                                                .setLabel("Continuar")
                                                .setEmoji("👨"),
                                            async (inter) => {
                                                const msgEnviar = mensagem()
                                                enviados = []
                                                interaction.editReply({ components: [], embeds: [], content: `**Estamos enviando suas mensagens!**` })
                                                delete msgEnviar["components"]
                                                let enviando_numero = 0

                                                for (let i = 0; i < enviar.length; i++) {
                                                    enviando_numero = enviando_numero + 1
                                                    try {
                                                        await (await enviar[i].createDM()).send({
                                                            embeds: [
                                                                msgEnviar.embeds[0]
                                                            ],
                                                        }).catch(err => console.error(err))
                                                        enviados.push("Enviado com sucesso! " + enviar[i].displayName)
                                                    } catch {
                                                        enviados.push("Dm Fechada! " + enviar[i].displayName)
                                                    }
                                                    await require('fs').writeFileSync('./teste.txt', enviados.join("\n"))
                                                    if (enviando_numero >= 5) {
                                                        enviando_numero = 0
                                                        interaction.editReply({ components: [], embeds: [], content: `**Estamos enviando suas mensagens! [${i}/${enviar.length}]**`, files: ['./teste.txt'] })
                                                    }

                                                    await wait(1000)
                                                }
                                            }
                                        )
                                    )
                                ]

                                const mensagem = () => {
                                    return {
                                        embeds: [
                                            new MessageEmbed()
                                                .setTitle(titleEmbed)
                                                .setDescription(descriptionEmbed)
                                                .setColor(colorEmbed)
                                                .setThumbnail(imageEmbed)
                                                .setTimestamp()
                                        ],
                                        components: components
                                    }
                                }
                                interaction.editReply(mensagem())
                            }
                        )
                    )
                ],
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**Disparo de Mensagens**`)
                        .setDescription(`**Pegamos todos membros, Segue informações abaixo:**`)
                        .setColor(color)
                        .setThumbnail(banner)
                        .addField("**Online:**", String(onlines), false)
                        .addField("**Offline:**", String(offlines), false)
                        .addField("**Administradores:**", String(administradores), false)
                        .addField("**Total no server:**", String(total), false)
                        .addField("**Irei enviar para:**", String(enviar.length), false)
                        .setTimestamp()
                ],
            })

        }

        if (interaction.commandName == 'criarcupom') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            const nome = interaction.options.getString("codigo")
            const desconto = interaction.options.getNumber("desconto")
            const quantidade = interaction.options.getNumber("limite")
            const cargo = interaction.options.getRole('cargo')

            if (desconto > 99 && desconto < 1 && quantidade < 1) {
                await interaction.reply("Digite um número válido!")
            }

            const cupons = await getValue('cupoms')
            const id = cupons.length + 1

            cupons.push({
                id: id,
                nome: nome,
                desconto: desconto,
                quantidade: quantidade,
                usos: 0,
                cargo: cargo?.id
            })

            await setValue('cupoms', cupons)

            interaction.reply({ content: "Cupom criado com sucesso!", ephemeral: true })
        }

        if (interaction.commandName == 'excluircupom') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            const id = interaction.options.getString("codigo")

            const cupons = await getValue('cupoms')

            const i = cupons.findIndex(v => v.id == id)
            if (i !== -1) {
                cupons.splice(i, 1)
                await setValue('cupoms', cupons)
                interaction.reply({ content: "Cupom excluido com sucesso!", ephemeral: true })
            } else {
                interaction.reply({ content: "Cupom não encontrado!", ephemeral: true })
            }
        }

        if (interaction.commandName == 'criarjogos') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            await interaction.deferReply({ ephemeral: true });

            const jogosDisponiveis = config.jogos.filter(jogo => jogo.categoria !== null && jogo["categoria-aprovada"] !== null && jogo.gamepasses.length > 0)
            
            if (jogosDisponiveis.length === 0) {
                return interaction.editReply({ 
                    content: "Não há jogos configurados disponíveis. Configure alguns jogos primeiro usando o comando /jogos." 
                })
            }

            const selectMenu = new MessageSelectMenu()
                .setCustomId('selecao-jogos')
                .setPlaceholder('Selecione os jogos')
                .setMinValues(1)
                .setMaxValues(jogosDisponiveis.length)
                .addOptions(
                    jogosDisponiveis.map(jogo => ({
                        label: jogo.nome,
                        value: jogo.nome,
                        emoji: jogo["emoji-id"] ? { id: jogo["emoji-id"] } : null
                    }))
                )

            const embed = new MessageEmbed()
                .setTitle('Seleção de Jogos')
                .setDescription('Selecione os jogos que você deseja incluir no painel de compras.')
                .setColor(config.geral["cor-embeds"])
                .setThumbnail(config.imagens.thumbnail)

            await interaction.editReply({
                embeds: [embed],
                components: [new MessageActionRow().addComponents(selectMenu)]
            })

            try {
                const filter = i => i.customId === 'selecao-jogos' && i.user.id === interaction.user.id
                const response = await interaction.channel.awaitMessageComponent({ filter, time: 60000 })

                const jogosSelecionados = response.values.map(nome => 
                    jogosDisponiveis.find(jogo => jogo.nome === nome)
                ).filter(Boolean)

                interaction.channel.send({
                    embeds: [
                        new MessageEmbed()
                            .setTitle(`**${config.geral.loja}.**`)
                            .setDescription(`## Painel de compras\n😃 Este é o lugar certo para iniciar sua compra!\nFaça o seu pedido clicando no botão abaixo.\n### 🧊 Informações:\nEm caso de dúvidas, entre em contato com o suporte\n### ⚠️ Estado da loja:\n${"`"}🟢 Disponível${"`"}`)
                            .setColor(config.geral["cor-embeds"])
                            .setImage(config.imagens["compre-aqui"])
                            .setThumbnail(config.imagens.thumbnail)
                            .setColor(config.geral["cor-embeds"])
                            .setImage(config.imagens["compre-aqui"])

                    ],
                    components: [
                        new MessageActionRow().addComponents(
                            new MessageSelectMenu()
                                .setCustomId('abrirjogo')
                                .setMinValues(0)
                                .setPlaceholder("Selecione um Jogo")
                                .setOptions(
                                    jogosSelecionados.map(v => ({
                                        label: v.nome,
                                        emoji: { id: v["emoji-id"] },
                                        value: v.nome
                                    }))
                                )
                        )
                    ]
                })

                await response.update({
                    content: 'Painel de compras criado com sucesso!',
                    embeds: [],
                    components: []
                })

            } catch (error) {
                if (error.code === 'INTERACTION_COLLECTOR_ERROR') {
                    await interaction.editReply({
                        content: 'Tempo de seleção expirado. Por favor, tente novamente.',
                        embeds: [],
                        components: []
                    })
                } else {
                    console.error(error)
                    await interaction.editReply({
                        content: 'Ocorreu um erro ao criar o painel de compras. Por favor, tente novamente.',
                        embeds: [],
                        components: []
                    })
                }
            }
        }

        if (interaction.commandName == 'entregar') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            const user = interaction.options.getUser("usuario")
            const entregador = interaction.user

            const foto = interaction.options.getAttachment("foto")
            const produto = interaction.options.getString("produto")

            interaction.reply(".").then(() => {
                interaction.deleteReply()
            })
            await client.channels.cache.get(config.canais["logs-entregas"]).send({
                content: `<@${user?.id}>`,
                embeds: [
                    new MessageEmbed()
                        .setColor(config.geral["cor-embeds"])
                        .setTitle(`**Finalmente!!**`)
                        .setAuthor({ name: `Easybux Payments | Entregas.` })
                        .setDescription(`> <a:oi:1275874514433081354>** | Entregador: <@${interaction.user.id}>**\n<a:oi:1104838756386754620>** | Cliente: <@${user.id}>**\n> <:oi:1273336941005508692>** | Produto: ${produto} <:oi:1273336941005508692>**\n\n> <a:oi:1278218124520587286>** | Avalie aqui: <#${config.canais["canal-avaliacoes"]}>**\n * **Agradecemos seu Feedback.**`)
                        .setFooter({ text: "Easybux | Tickets", iconURL: await client.user.avatarURL() })
                        .setImage(foto.url)
                        .setTimestamp()
                ]
            })

            if (interaction.channel.name.includes('🟩') || interaction.channel.name.includes('🛒')) {
                transcript(interaction.channel.id).then(async url => {
                    const channel = await client.channels.fetch(config.canais.transcripts)

                    channel.send({
                        embeds: [
                            new MessageEmbed()
                                .setAuthor({ name: `Nova transcrição gerada`, iconURL: interaction.guild.iconURL() })
                                .setDescription(`
                                

> <:usercor:${config.emojis.usercor}> | **Comprador**
> * <@${user.id}>

> <:fcsticketcor:${config.emojis.fcsticketcor}> | **ID de ticket**
> * \`\`${interaction.channel.id}\`\`

`)
                                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                                .setColor(config.geral["cor-embeds"])

                        ],
                        components: [
                            new MessageActionRow().addComponents(
                                new MessageButton()
                                    .setURL(url)
                                    .setLabel(`Ver Transcrição`)
                                    .setEmoji('📃')
                                    .setStyle("LINK")
                            )
                        ]
                    })

                    seraFechado(interaction.channel)
                    await wait(15000)
                    interaction.channel.delete()
                })

            }

            user.createDM(async dm => {
                dm.send(`Seu pedido foi entregue!\nAvalie: https://discord.com/channels/1190486828554399786/1190486831196811282`)
            }).catch(() => {

            })
        }

        if (interaction.commandName == 'ticketprompt') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando!" })
            }
            interaction.reply(".").then(a => interaction.deleteReply())

            interaction.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setDescription(`**Suporte**

**Abra ticket para receber suporte em nosso servidor!**`)
                        .setColor(config.geral["cor-embeds"])
                        .setImage(await gerarImagem(11, 'Suporte', 'Clique no botão abaixo'))
                        .setFooter({ text: "Não abra tickets sem motivo!", iconURL: await client.user.avatarURL() })
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setCustomId('abrirticket')
                            .setStyle("SECONDARY")
                            .setLabel(config.textos["botão-abrir-ticket"])
                            .setEmoji(config.emojis.ticket)
                    )
                ]
            })
        }

        if (interaction.commandName == 'aprovar') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }
            canaisAprovados.push(interaction.channel.id)
            interaction.reply({ ephemeral: true, content: `Olá, ${interaction.user.username}! Este carrinho foi aprovado com sucesso.` })
        }

        if (interaction.commandName == 'jogosprompt') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            interaction.reply(".").then(() => { interaction.deleteReply() })

            const test = [...config.jogos].filter(a => a.categoria !== null && a["categoria-aprovada"] !== null && a.gamepasses.length > 0)
            interaction.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**${config.geral.loja}.**`)
                        .setDescription(`## Painel de compras\n😃 Este é o lugar certo para iniciar sua compra!\nFaça o seu pedido clicando no botão abaixo.\n### 🧊 Informações:\nEm caso de dúvidas, entre em contato com o suporte\n### ⚠️ Estado da loja:\n${"`"}🟢 Disponível${"`"}`)
                        .setColor(config.geral["cor-embeds"])
                        .setImage(config.imagens["compre-aqui"])
                        .setThumbnail(config.imagens.thumbnail)
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageSelectMenu()
                            .setCustomId('abrirjogo')
                            .setMinValues(0)
                            .setPlaceholder("Selecione um Jogo")
                            .setOptions([
                                ...test.map(v => {
                                    return {
                                        label: v.nome,
                                        emoji: { id: v["emoji-id"] },
                                        value: v.nome
                                    }
                                })
                            ])
                    )
                ]
            })
        }

        if (interaction.commandName == 'promptdois') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            interaction.reply(".").then(() => { interaction.deleteReply() })


            interaction.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setAuthor({ name: "Central de Vendas", iconURL: interaction.guild.iconURL({ dynamic: true }) })
                        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                        .setDescription(`> <:roblox_verde7:1333581948869939273> Seja bem-vindo a **Central de Vendas** da ${config.geral.loja}.\n* Adquira **Robux** ou **Gamepass** utilizando o botão abaixo. \n\n> Escolha a opção desejada e responda a todas as perguntas!`)
                        // .addField(`**Horário de Atendimento:**`, `<:relogio_verde7:1308619234972274720> https://discord.com/channels/${interaction.guild.id}/${config.canais["canal-horario-atendimento"]}`, true)
                        // .addField(`**Como comprar?**`, `<:infor_verde7:1309289885030682694> https://discord.com/channels/${interaction.guild.id}/${config.canais["canal-como-comprar"]}`, true)                  
                        .setColor(config.geral["cor-embeds"])
                        .setImage(config.imagens["compre-aqui"])

                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageSelectMenu()
                            .setCustomId('comprarrobuxougamepass')
                            .setPlaceholder("Selecione uma opção")

                            .setOptions([
                                {
                                    label: "Comprar Robux",
                                    value: "comprarrobux",
                                    description: `Deseja adquirir robux para sua conta? Clique aqui.`,
                                    emoji: config.emojis.robuxcor
                                },
                                {
                                    label: "Comprar Gamepass",
                                    value: "comprargamepass",
                                    description: `Deseja adquirir gamepasses em jogos? Clique aqui.`,
                                    emoji: config.emojis.robloxcor
                                }
                            ])
                    )
                ]
            })
        }

        if (interaction.commandName == 'robuxprompt') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            interaction.reply(".").then(() => { interaction.deleteReply() })

            interaction.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**${config.geral.loja}.**`)
                        .setDescription(`## Painel de compras\n😃 Este é o lugar certo para iniciar sua compra!\nFaça o seu pedido clicando no botão abaixo.\n### 🧊 Informações:\nEm caso de dúvidas, entre em contato com o suporte\n### ⚠️ Estado da loja:\n${"`"}🟢 Disponível${"`"}`)
                        .setColor(config.geral["cor-embeds"])
                        .setImage(config.imagens["compre-aqui"])
                        .setThumbnail(config.imagens.thumbnail)
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setStyle('SUCCESS')
                            .setLabel(config.textos["botão-comprar-robux"])
                            .setCustomId('comprarrobux')
                            .setEmoji(config.emojis.robux)
                    )
                ]
            })
        }

        if (interaction.commandName == 'gamepassprompt') {
            if (!interaction.member.permissions.has("ADMINISTRATOR")) {
                return interaction.reply({ ephemeral: true, content: "Você não tem permissão para utilizar esse comando." })
            }

            interaction.reply(".").then(() => { interaction.deleteReply() })

            interaction.channel.send({
                embeds: [
                    new MessageEmbed()
                        .setTitle(`**${config.geral.loja}.**`)
                        .setDescription(`## Painel de compras\n😃 Este é o lugar certo para iniciar sua compra!\nFaça o seu pedido clicando no botão abaixo.\n### 🧊 Informações:\nEm caso de dúvidas, entre em contato com o suporte\n### ⚠️ Estado da loja:\n${"`"}🟢 Disponível${"`"}`)
                        .setColor(config.geral["cor-embeds"])
                        .setImage(config.imagens["compre-aqui"])
                        .setThumbnail(config.imagens.thumbnail)
                ],
                components: [
                    new MessageActionRow().addComponents(
                        new MessageButton()
                            .setStyle('SUCCESS')
                            .setLabel(config.textos["botão-comprar-gamepass"])
                            .setCustomId('comprargamepass')
                            .setEmoji(config.emojis.robux)
                    )
                ]
            })
        }
    }
})

async function deuErro(error) {
    const st = String(error)

    if (st.includes('passes.data is not')) {
        warn('Ocorreu um erro ao pegar todas gamepasses, mas as que foram pegas foi enviada ao usuário!')
    } else if (st.includes('Unknown')) {
        warn('Unknown message')
    } else if (st.includes('JSON')) {
        warn('Arrume o config.json!')
    } else if (st.includes("(reading 'permissions')")) {
        warn("Permissions missing")
    } else {
        console.error(error)
    }
}

process.on("rejectionHandled", (error) => {
    // deuErro(error)
})
process.on("unhandledRejection", (error) => {
    // deuErro(error)
})

app.listen(80, () => {
    console.clear()
    warn('API online!')
})

connect(config.geral.token)
client.login(config.geral.token)