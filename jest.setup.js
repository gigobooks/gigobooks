var sqlite3 = require('sqlite3')

// Emulate part of sqlite.Database using sqlite3 so the tests can run
sqlite = (function() {
    const Database = function(filename) {
        this.db = new sqlite3.Database(filename)
    }

    Database.prototype.open = function() {
        // No-op
        return Promise.resolve()
    }

    Database.prototype.close = function() {
        return new Promise((resolve, reject) => {
            this.db.close(err => {
                if (err) {
                    reject(err)
                }
                resolve()
            })
        })
    }

    Database.prototype.exec = function(query, ...params) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, err => {
                if (err) {
                    reject(err)
                }
                resolve({
                    lastInsertId: this.lastID,
                    rowsAffected: this.changes,
                })
            })
        })
    }

    Database.prototype.query = function(query, ...params) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err)
                }
                resolve(rows)
            })
        })
    }

    return {
        Database
    }
})()
