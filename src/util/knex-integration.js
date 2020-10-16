/**
 * Copyright (c) 2020-present Beng Tan
 */

const Knex = require('knex')
const Client_SQLite3 = require('knex/lib/dialects/sqlite3')
const knexSnakeCaseMappers = require('objection').knexSnakeCaseMappers
const migrations = require('./knex-migrations')

let connectionId = 0

// Some magic:
// * Modify the sqlite3 dialect so it works with our sqlite API
//   This affects all knex sqlite3 objects, not just this one.
// * Return a knex object that uses the supplied database/connection
function makeKnex(filename, preExistingConnection, onChange = undefined) {
    const modifications = {
        modified: true,
        acquireRawConnection: function () {
            return new Promise((resolve, reject) => {
              resolve({
                  mainConnection: this.config.preExistingConnection,
                  txConnection: null,
                  id: connectionId++,
              })
            })
        },
        destroyRawConnection(connection) {
            // No-op: Don't close the underlying connection
        },
        _query: function (connection, obj) {
            // console.log('k-i.js query obj:', {sql: obj.sql, bindings: obj.bindings})
            // If the database has a `.begin()` function, then use that for transactions
            if (connection.mainConnection.begin) {
                // A hack to convert BEGIN/COMMIT/ROLLBACK statements into function calls
                const sqlUpper = obj.sql.toUpperCase()
                if (sqlUpper.startsWith('BEGIN')) {
                    if (connection.txConnection) {
                        return Promise.reject(new Error('Cannot BEGIN whilst already in a transaction'))
                    } else {
                        return new Promise((resolve, reject) => {
                            connection.mainConnection.begin().then(txConnection => {
                                connection.txConnection = txConnection
                                resolve(obj)
                            }).catch(reject)
                        })
                    }
                } else if (sqlUpper.startsWith('COMMIT')) {
                    if (connection.txConnection) {
                        return new Promise((resolve, reject) => {
                            connection.txConnection.commit().then(() => {
                                connection.txConnection = null
                                resolve(obj)
                            }).catch(reject)
                        })
                    }
                    else {
                        return Promise.reject(new Error('Cannot COMMIT. Not in a transaction'))
                    }
                } else if (sqlUpper.startsWith('ROLLBACK')) {
                    if (connection.txConnection) {
                        return new Promise((resolve, reject) => {
                            connection.txConnection.rollback().then(() => {
                                connection.txConnection = null
                                resolve(obj)
                            }).catch(reject)
                        })
                    }
                    else {
                        return Promise.reject(new Error('Cannot ROLLBACK. Not in a transaction'))
                    }
                }
            }

            const lowerSql = obj.sql.trim().toLowerCase()
            const callObj = connection.txConnection ? connection.txConnection : connection.mainConnection
            let callMethod = 'query'
            ;['insert', 'del', 'delete', 'update'].forEach(op => {
                if (lowerSql.startsWith(`${op} `)) {
                    callMethod = 'exec'
                }
            })

            return new Promise(function(resolver, rejecter) {
                if (!callObj || !callObj[callMethod]) {
                    return rejecter(
                      new Error(`Error calling ${callMethod} on connection.`)
                    );
                }
                const bindings = obj.bindings ? obj.bindings : []
                callObj[callMethod](obj.sql, ...bindings).then(response => {
                    obj.response = response
                    resolver(obj)
                }).catch(rejecter)
            });
        },
        processResponse: function (obj, runner) {
            // console.log('k-i.js processResponse obj:', obj)
            let { response } = obj;

            // Notify upstream if any rows were changed
            if (response.rowsAffected && this.config.onChange) {
                this.config.onChange(obj)
            }

            if (obj.output) return obj.output.call(runner, response);
            switch (obj.method) {
                case 'select':
                case 'pluck':
                case 'first':
                    if (obj.method === 'pluck') response = map(response, obj.pluck);
                    return obj.method === 'first' ? response[0] : response;
                case 'insert':
                    return [response.lastInsertId]
                case 'del':
                case 'update':
                case 'counter':
                    return response.rowsAffected
                default:
                    return response;
            }
        }
    }

    if (!Client_SQLite3.prototype.modified) {
        Object.assign(Client_SQLite3.prototype, modifications)
    }

    return Knex({
        connection: {
            filename: filename
        },
        useNullAsDefault: true,
        client: Client_SQLite3,
        preExistingConnection,
        onChange,
        ...migrations,
        ...knexSnakeCaseMappers()
    })
}

module.exports = makeKnex
