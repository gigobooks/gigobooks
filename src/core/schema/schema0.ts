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
    `CREATE TABLE txn_entry (
        id INTEGER NOT NULL PRIMARY KEY,
        transaction_id INTEGER,
        description TEXT,
        account_id INTEGER,
        debit REAL,
        updated_at TEXT,
        created_at TEXT
    )`,
    `CREATE INDEX index_txn_entry_transaction_id ON txn_entry (transaction_id)`,
    `CREATE INDEX index_txn_entry_account_id ON txn_entry (account_id)`,
]

export default schema
