__COMMITDATE__ = ''
__COMMITHASH__ = ''

var sqlite3 = require('sqlite3')

// Emulate part of sqlite.Database using sqlite3 so the tests can run
gosqlite = (function() {
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
            this.db.run(query, params, function (err) {
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

                // node-sqlite3 stores datetimes as strings of the form '1588049187154.0'
                //   but it doesn't reverse-convert them when being retrieved (!?!?).
                // As a work-around, detect any such strings and convert them into dates.
                // This is a hack that is only suitable for test code.
                for (let row of rows) {   
                    for (let k of Object.keys(row)) {
                        const v = row[k]
                        if (typeof v === 'string' && /^\d{13}.0$/.test(v)) {
                            row[k] = new Date(Number(v))
                        }
                    }
                }

                resolve(rows)
            })
        })
    }

    return {
        Database
    }
})()

jest.mock('./src/util/knex-migrations', () => require('./src/test/__mocks__/knex-migrations'))
jest.mock('./src/util/sound', () => require('./src/test/__mocks__/sound'))
