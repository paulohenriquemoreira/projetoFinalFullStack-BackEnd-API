const express = require('express');
const {criarBanco} = require('./database');
const cors = require('cors');

const app = express();

app.use(cors());

app.use(express.json());

//Rota Principal-Raiz

app.get("/", (req, res) => {

    res.send(`
        <body>
            <h1>🏠 Sistema de Gestão de Abrigos em Situações de Enchentes</h1>
            <h2>Plataforma para organização e alocação de desabrigados em cenários de desastre</h2>
            <p>Endpoint que leva aos abrigos cadastrados: /abrigos</p>
        </body>    
        
    `);
});

app.get("/abrigos", async (req, res) => {

    const db = await criarBanco();
    const listaAbrigos = await db.all(`SELECT * FROM abrigos`);
    res.json(listaAbrigos);

});

//Rota Específica

app.get("/abrigos/:id", async (req,res) => {
    const {id} = req.params;
    const db = await criarBanco();
    const abrigoEspecifico = await db.all(`
    
        SELECT * FROM abrigos WHERE id = ?`,[id],
    );
    res.json(abrigoEspecifico);
});

//Rota Post - Novos Abrigos

app.post("/abrigos", async (req,res) => {
    const {
        nome_abrigo,
        endereco_abrigo,
        capacidade_total,
        vagas_disponiveis,
        aceita_pet,
        aceita_doacoes,
    } = req.body;

    const db = await criarBanco();

    await db.run(
        `INSERT INTO abrigos(nome_abrigo, endereco_abrigo, capacidade_total, vagas_disponiveis, aceita_pet, aceita_doacoes) VALUES (?,?,?,?,?,?)`,
        [
            nome_abrigo,
            endereco_abrigo,
            capacidade_total,
            vagas_disponiveis,
            aceita_pet,
            aceita_doacoes,
        ],
    );
    res.json(
        `Abrigo novo registrado: ${nome_abrigo} no endereço: ${endereco_abrigo}`,
    );

});


//Rota PUT - Atualização

app.put("/abrigos/:id", async (req,res) =>{
    const {id} = req.params;
    const {vagas_disponiveis} = req.body;
    const db = await criarBanco();

    await db.run(
        `
        UPDATE abrigos
        SET vagas_disponiveis = ?
        WHERE id = ?`, [vagas_disponiveis, id],
    );
    res.json(`O abrigo de ${id} foi atualizado com sucesso!`);

});

//Rota DELETE - Rota de remoção

app.delete("/abrigos/:id", async (req, res) => {
    const {id} = req.params;
    const db = await criarBanco();

    await db.run(
        `
            DELETE FROM abrigos WHERE id = ?`, [id],
    );

    res.json(`O abrigo de ${id} foi removido com sucesso!`);
    
});

//Criando uma variável inteligente para a porta.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});