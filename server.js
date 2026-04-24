const express = require("express");
const { criarBanco } = require("./database");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Rota Principal
app.get("/", (req, res) => {
  res.send(`
        <body>
            <h1>🏠 Sistema de Gestão de Abrigos e Pessoas</h1>
            <p>Endpoints disponíveis: /abrigos e /pessoas</p>
        </body>    
    `);
});

// ==========================================
// --- CRUD: ABRIGOS ---
// ==========================================

//CREATE - Registrar novo Abrigo
app.post("/abrigos", async (req, res) => {
  const {
    nome_abrigo,
    endereco_abrigo,
    capacidade_total,
    vagas_disponiveis,
    aceita_pet,
  } = req.body;
  const db = await criarBanco();
  await db.run(
    `INSERT INTO abrigos(nome_abrigo, endereco_abrigo, capacidade_total, vagas_disponiveis, aceita_pet) VALUES (?,?,?,?,?)`,
    [
      nome_abrigo,
      endereco_abrigo,
      capacidade_total,
      vagas_disponiveis,
      aceita_pet,
    ],
  );
  res.json({ mensagem: `Abrigo ${nome_abrigo} registrado com sucesso!` });
});

//READ - Listar todos os Abrigos (Data BR)
app.get("/abrigos", async (req, res) => {
  const db = await criarBanco();
  const listaAbrigos = await db.all(`
        SELECT id, nome_abrigo, endereco_abrigo, capacidade_total, vagas_disponiveis, aceita_pet,
        strftime('%d/%m/%Y', data_registro) as data_registro 
        FROM abrigos
    `);
  res.json(listaAbrigos);
});

//UPDATE - Atualizar dados do Abrigo
app.put("/abrigos/:id", async (req, res) => {
  const { id } = req.params;
  const {
    nome_abrigo,
    endereco_abrigo,
    capacidade_total,
    vagas_disponiveis,
    aceita_pet,
  } = req.body;
  const db = await criarBanco();
  await db.run(
    `UPDATE abrigos SET nome_abrigo=?, endereco_abrigo=?, capacidade_total=?, vagas_disponiveis=?, aceita_pet=? WHERE id=?`,
    [
      nome_abrigo,
      endereco_abrigo,
      capacidade_total,
      vagas_disponiveis,
      aceita_pet,
      id,
    ],
  );
  res.json({ mensagem: `Abrigo ${id} atualizado com sucesso!` });
});

//DELETE - Remover Abrigo
app.delete("/abrigos/:id", async (req, res) => {
  const { id } = req.params;
  const db = await criarBanco();
  await db.run(`DELETE FROM abrigos WHERE id = ?`, [id]);
  res.json({ mensagem: `Abrigo ${id} removido com sucesso!` });
});

// ==========================================
// --- CRUD: PESSOAS ---
// ==========================================

//READ - Listar Pessoas e seus Abrigos
app.get("/pessoas", async (req, res) => {
  const db = await criarBanco();
  const pessoas = await db.all(`
        SELECT p.id, p.nome_completo, p.data_nascimento, p.endereco_residencial, a.nome_abrigo, a.endereco_abrigo,
        strftime('%d/%m/%Y', p.data_registro) as data_cadastrada
        FROM pessoas p
        LEFT JOIN abrigos a ON p.id_abrigo = a.id
    `);
  // Adicionado p.endereco_residencial acima para o Scroll do React funcionar!
  res.json(pessoas);
});

//UPDATE - Atualizar dados da Pessoa
app.put("/pessoas/:id", async (req, res) => {
  const { id } = req.params;
  const { nome_completo, data_nascimento, endereco_residencial } = req.body;
  const db = await criarBanco();
  await db.run(
    `UPDATE pessoas SET nome_completo=?, data_nascimento=?, endereco_residencial=? WHERE id=?`,
    [nome_completo, data_nascimento, endereco_residencial, id],
  );
  res.json({ mensagem: `Dados da pessoa ${id} atualizados!` });
});

//DELETE - Remover Pessoa (e devolver vaga ao abrigo)
app.delete("/pessoas/:id", async (req, res) => {
  const { id } = req.params;
  const db = await criarBanco();

  // Antes de deletar, pegamos o ID do abrigo para devolver a vaga
  const pessoa = await db.get(`SELECT id_abrigo FROM pessoas WHERE id = ?`, [
    id,
  ]);

  if (pessoa) {
    await db.run(
      `UPDATE abrigos SET vagas_disponiveis = vagas_disponiveis + 1 WHERE id = ?`,
      [pessoa.id_abrigo],
    );
    await db.run(`DELETE FROM pessoas WHERE id = ?`, [id]);
  }

  res.json({ mensagem: `Pessoa ${id} removida e vaga devolvida ao abrigo!` });
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
