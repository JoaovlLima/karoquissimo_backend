-- ============================================================
-- Estoque Karoquíssimo — Schema PostgreSQL (Supabase / Hostinger)
-- ============================================================

-- ── Tipos ENUM ──────────────────────────────────────────────
CREATE TYPE tipo_movimentacao AS ENUM ('entrada', 'saida', 'ajuste');
CREATE TYPE status_venda      AS ENUM ('quitada', 'pendente', 'cancelada');
CREATE TYPE status_parcela    AS ENUM ('pendente', 'pago', 'atrasado');

-- ── Tabela: usuarios ────────────────────────────────────────
CREATE TABLE usuarios (
    id         SERIAL       PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    ativo      BOOLEAN      NOT NULL DEFAULT true,
    criado_em  TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT usuarios_email_key UNIQUE (email)
);

-- ── Tabela: empresa ─────────────────────────────────────────
CREATE TABLE empresa (
    id            SERIAL       PRIMARY KEY,
    razao_social  VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(150) NOT NULL,
    cnpj          VARCHAR(18)  NOT NULL,
    telefone      VARCHAR(20)  NOT NULL,
    whatsapp      VARCHAR(20),
    email         VARCHAR(150),
    logradouro    VARCHAR(200) NOT NULL,
    numero        VARCHAR(10)  NOT NULL,
    complemento   VARCHAR(100),
    bairro        VARCHAR(100) NOT NULL,
    cidade        VARCHAR(100) NOT NULL,
    uf            CHAR(2)      NOT NULL,
    cep           VARCHAR(10)  NOT NULL,

    CONSTRAINT empresa_cnpj_key UNIQUE (cnpj)
);

-- ── Tabela: clientes ────────────────────────────────────────
CREATE TABLE clientes (
    id              SERIAL       PRIMARY KEY,
    nome_completo   VARCHAR(150) NOT NULL,
    cpf             VARCHAR(14)  NOT NULL,
    data_nascimento DATE         NOT NULL,
    telefone        VARCHAR(20)  NOT NULL,
    whatsapp        VARCHAR(20),
    email           VARCHAR(150),
    logradouro      VARCHAR(200) NOT NULL,
    numero          VARCHAR(10)  NOT NULL,
    complemento     VARCHAR(100),
    bairro          VARCHAR(100) NOT NULL,
    cidade          VARCHAR(100) NOT NULL,
    uf              CHAR(2)      NOT NULL,
    cep             VARCHAR(10)  NOT NULL,
    ativo           BOOLEAN      NOT NULL DEFAULT true,
    criado_em       TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT clientes_cpf_key UNIQUE (cpf)
);

-- ── Tabela: categorias ──────────────────────────────────────
CREATE TABLE categorias (
    id   SERIAL      PRIMARY KEY,
    nome VARCHAR(80) NOT NULL,

    CONSTRAINT categorias_nome_key UNIQUE (nome)
);

-- ── Tabela: produtos ────────────────────────────────────────
CREATE TABLE produtos (
    id            SERIAL        PRIMARY KEY,
    codigo        VARCHAR(50)   NOT NULL,
    nome          VARCHAR(150)  NOT NULL,
    categoria_id  INTEGER       NOT NULL,
    cor           VARCHAR(50)   NOT NULL,
    tamanho       VARCHAR(20)   NOT NULL,
    valor         DECIMAL(10,2) NOT NULL,
    unidades      INTEGER       NOT NULL DEFAULT 0,
    fornecedor    VARCHAR(150)  NOT NULL,
    validade      DATE,
    criado_em     TIMESTAMP(3)  NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP(3)  NOT NULL DEFAULT NOW(),

    CONSTRAINT produtos_codigo_key UNIQUE (codigo)
);

-- ── Tabela: movimentacoes_estoque ───────────────────────────
CREATE TABLE movimentacoes_estoque (
    id         SERIAL             PRIMARY KEY,
    produto_id INTEGER            NOT NULL,
    tipo       tipo_movimentacao  NOT NULL,
    quantidade INTEGER            NOT NULL,
    motivo     VARCHAR(200)       NOT NULL,
    usuario_id INTEGER            NOT NULL,
    criado_em  TIMESTAMP(3)       NOT NULL DEFAULT NOW()
);

-- ── Tabela: vendas ──────────────────────────────────────────
CREATE TABLE vendas (
    id             SERIAL        PRIMARY KEY,
    numero_doc     VARCHAR(20)   NOT NULL,
    cliente_id     INTEGER       NOT NULL,
    usuario_id     INTEGER       NOT NULL,
    valor_total    DECIMAL(10,2) NOT NULL,
    valor_entrada  DECIMAL(10,2) NOT NULL DEFAULT 0,
    valor_restante DECIMAL(10,2) NOT NULL,
    status         status_venda  NOT NULL DEFAULT 'pendente',
    observacao     TEXT,
    criado_em      TIMESTAMP(3)  NOT NULL DEFAULT NOW(),

    CONSTRAINT vendas_numero_doc_key UNIQUE (numero_doc)
);

-- ── Tabela: itens_venda ─────────────────────────────────────
CREATE TABLE itens_venda (
    id             SERIAL        PRIMARY KEY,
    venda_id       INTEGER       NOT NULL,
    produto_id     INTEGER       NOT NULL,
    quantidade     INTEGER       NOT NULL,
    valor_unitario DECIMAL(10,2) NOT NULL,
    valor_total    DECIMAL(10,2) NOT NULL
);

-- ── Tabela: parcelas ────────────────────────────────────────
CREATE TABLE parcelas (
    id         SERIAL          PRIMARY KEY,
    venda_id   INTEGER         NOT NULL,
    numero     INTEGER         NOT NULL,
    valor      DECIMAL(10,2)   NOT NULL,
    vencimento DATE            NOT NULL,
    pago_em    DATE,
    status     status_parcela  NOT NULL DEFAULT 'pendente'
);

-- ── Chaves Estrangeiras ─────────────────────────────────────
ALTER TABLE produtos
    ADD CONSTRAINT produtos_categoria_id_fkey
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE movimentacoes_estoque
    ADD CONSTRAINT movimentacoes_estoque_produto_id_fkey
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE movimentacoes_estoque
    ADD CONSTRAINT movimentacoes_estoque_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE vendas
    ADD CONSTRAINT vendas_cliente_id_fkey
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE vendas
    ADD CONSTRAINT vendas_usuario_id_fkey
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE itens_venda
    ADD CONSTRAINT itens_venda_venda_id_fkey
    FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE itens_venda
    ADD CONSTRAINT itens_venda_produto_id_fkey
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE parcelas
    ADD CONSTRAINT parcelas_venda_id_fkey
    FOREIGN KEY (venda_id) REFERENCES vendas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
