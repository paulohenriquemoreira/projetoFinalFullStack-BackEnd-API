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

//CREATE - Registrar Pessoa (Desalojada ou Desaparecida)
app.post("/pessoas", async (req, res) => {
  const { nome_completo, data_nascimento, endereco_residencial, id_abrigo } = req.body;
  const db = await criarBanco();

  try {
    // 1. Verificação de duplicidade (LEFT JOIN para achar desaparecidos e abrigados)
    const pessoaExistente = await db.get(
        `SELECT p.*, a.nome_abrigo, a.endereco_abrigo, strftime('%d/%m/%Y %H:%M', p.data_registro) as data_formatada
         FROM pessoas p LEFT JOIN abrigos a ON p.id_abrigo = a.id
         WHERE p.nome_completo = ? AND p.data_nascimento = ?`,
        [nome_completo, data_nascimento]
    );

    if (pessoaExistente) {
        return res.status(400).json({
            mensagem: "Pessoa já registrada no sistema!",
            localizacao: {
                abrigo: pessoaExistente.nome_abrigo || "Registrada como Desaparecida",
                endereco: pessoaExistente.endereco_abrigo || "Sem abrigo vinculado",
                data_registro: pessoaExistente.data_formatada
            }
        });
    }

    // 2. Verificação de Vagas CONDICIONAL (Só roda se enviar id_abrigo)
    if (id_abrigo) {
        const abrigo = await db.get("SELECT vagas_disponiveis FROM abrigos WHERE id = ?", [id_abrigo]);
        if (!abrigo || abrigo.vagas_disponiveis <= 0) {
            return res.status(400).json({ mensagem: "Abrigo inválido ou sem vagas." });
        }
    }

    // 3. Inserção (Se id_abrigo não vier, salva como null)
    await db.run(
        `INSERT INTO pessoas(nome_completo, data_nascimento, endereco_residencial, id_abrigo) VALUES (?,?,?,?)`,
        [nome_completo, data_nascimento, endereco_residencial, id_abrigo || null]
    );

    // 4. Baixa na vaga CONDICIONAL (Só roda se enviar id_abrigo)
    if (id_abrigo) {
        await db.run(`UPDATE abrigos SET vagas_disponiveis = vagas_disponiveis - 1 WHERE id = ?`, [id_abrigo]);
    }

    res.json({ mensagem: "Pessoa registrada com sucesso!" });

  } catch (error) {
    console.error("Erro ao registrar pessoa:", error);
    res.status(500).json({ mensagem: "Erro interno no servidor ao tentar salvar a pessoa." });
  }
});


//READ - Listar Pessoas e seus Abrigos
app.get("/pessoas", async (req, res) => {
  const db = await criarBanco();
  const pessoas = await db.all(`
        SELECT p.id, p.nome_completo, p.data_nascimento, p.endereco_residencial, a.nome_abrigo, a.endereco_abrigo,
        strftime('%d/%m/%Y', p.data_registro) as data_cadastrada
        FROM pessoas p
        LEFT JOIN abrigos a ON p.id_abrigo = a.id
    `);
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

  if (pessoa && pessoa.id_abrigo) {
    await db.run(
      `UPDATE abrigos SET vagas_disponiveis = vagas_disponiveis + 1 WHERE id = ?`,
      [pessoa.id_abrigo],
    );
  }
  
  await db.run(`DELETE FROM pessoas WHERE id = ?`, [id]);
  res.json({ mensagem: `Pessoa ${id} removida com sucesso!` });
});

// Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});