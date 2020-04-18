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
]

export default schema
