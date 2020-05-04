const schema = [
    `CREATE TABLE account (
        id INTEGER NOT NULL PRIMARY KEY,
        title TEXT,
        type TEXT,
        updated_at TEXT,
        created_at TEXT
    )`,
    `CREATE TABLE variable (
        name TEXT NOT NULL PRIMARY KEY,
        value TEXT,
        updated_at TEXT,
        created_at TEXT
    )`,
    `CREATE TABLE txn (
        id INTEGER NOT NULL PRIMARY KEY,
        description TEXT,
        type TEXT,
        date TEXT,
        updated_at TEXT,
        created_at TEXT
    )`,
    `CREATE TABLE txn_element (
        id INTEGER NOT NULL PRIMARY KEY,
        transaction_id INTEGER,
        description TEXT,
        account_id INTEGER,
        drcr INTEGER,
        amount INTEGER,
        updated_at TEXT,
        created_at TEXT
    )`,
    `CREATE INDEX index_txn_element_transaction_id ON txn_element (transaction_id)`,
    `CREATE INDEX index_txn_element_account_id ON txn_element (account_id)`,
]

export default schema
