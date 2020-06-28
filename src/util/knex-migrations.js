/**
 * Copyright (c) 2020-present Beng Tan
 */

class WebpackMigrationSource {
    constructor(migrationContext) {
        this.migrationContext = migrationContext;
    }
  
    getMigrations() {
        // Omit the './' prefix
        return Promise.resolve(this.migrationContext.keys().map(s => s.substring(2)).sort())
    }
  
    getMigrationName(migration) {
        return migration
    }
  
    getMigration(migration) {
        return this.migrationContext('./' + migration)
    }
}

module.exports = {
    migrations: {
        migrationSource: new WebpackMigrationSource(require.context('../core/migrations', false, /.(js|ts)$/)),
        tableName: 'knex_migrations',
    },
}
