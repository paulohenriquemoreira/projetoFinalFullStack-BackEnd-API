const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const criarBanco = async () => {
    const db = await open({
        filename: "./database.db",
        driver: sqlite3.Database,
    });

    // Criar tabela Abrigos
    await db.exec(`
        CREATE TABLE IF NOT EXISTS abrigos(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_abrigo TEXT,
            endereco_abrigo TEXT,
            capacidade_total INTEGER,
            vagas_disponiveis INTEGER,
            aceita_pet TEXT,
            data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Criar tabela Pessoas (Relacionada ao Abrigo)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pessoas(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_completo TEXT,
            data_nascimento TEXT,
            endereco_residencial TEXT,
            id_abrigo INTEGER,
            data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_abrigo) REFERENCES abrigos(id)
        )
    `);

    console.log("Tabelas configuradas com sucesso!");

    // Insert de abrigos (opcional, mantido do seu código)
    const listaAbrigos = await db.get(`SELECT COUNT (*) AS total FROM abrigos`);
    if (listaAbrigos.total === 0) {
        await db.exec(`
            INSERT INTO abrigos 
            (nome_abrigo, endereco_abrigo, capacidade_total, vagas_disponiveis, aceita_pet)
            VALUES 
            ("Escola Municipal Esperança", "Rua das Flores, 123 - Centro", 35, 35, "1"),
            ("Igreja São João Batista", "Av. Brasil, 456 - Vila Nova", 20, 20, "0"),
            ("Escola Manoel Tobias Barretos", "Av. São José, 55 - Centro", 20, 20, "1"),
            ("Ginásio Poliesportivo Ayrosa", "Rua Ciriema, 6 - Vila Ayrosa", 20, 0, "0"),
            ("Galpão Mãe Terra", "Rua Albert Frack, 53 - Centro", 50, 35, "1"),
            ("Igreja Evangélica Santa Fé", "Av. Um, 46 - Jardim Roberto", 15, 0, "0")
        `);
    }

    return db;
};

module.exports = { criarBanco };
criarBanco();