/**
 * Copyright (c) 2020-present Beng Tan
 */

const Knex = require('knex')
const Client_SQLite3 = require('knex/lib/dialects/sqlite3')
const knexSnakeCaseMappers = require('objection').knexSnakeCaseMappers
const migrations = require('../util/knex-migrations')

// Some magic:
// * Modify the sqlite3 dialect so it works with sql.js
//   This affects all knex sqlite3 objects, not just this one.
// * Return a knex object that uses the supplied database/connection
function makeKnex(filename, preExistingConnection, onChange = undefined) {
    const modifications = {
        modified: true,
        acquireRawConnection: function () {
            return new Promise((resolve, reject) => {
              resolve(this.config.preExistingConnection)
            })
        },
        destroyRawConnection(connection) {
            // No-op: Don't close the underlying connection
        },
        _query: function (connection, obj) {
            // console.log('k-i.js query obj:', {sql: obj.sql, bindings: obj.bindings})

            const callObj = connection
            const callMethod = 'each'
            return new Promise(function(resolver, rejecter) {
                if (!callObj || !callObj[callMethod]) {
                    return rejecter(
                      new Error(`Error calling ${callMethod} on connection.`)
                    );
                }
                const bindings = obj.bindings ? obj.bindings : []

                obj.connection = connection
                obj.response = []
                callObj[callMethod](obj.sql, bindings, row => {
                    obj.response.push(row)
                }, () => {
                    resolver(obj)
                })
            });
        },
        processResponse: function (obj, runner) {
            let { response } = obj;

            const rowsAffected = obj.connection.getRowsModified()
            // Notify upstream if any rows were changed
            if (['insert', 'del', 'update'].includes(obj.method) && rowsAffected && this.config.onChange) {
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
                    return obj.connection.exec('SELECT last_insert_rowid()')[0].values[0]
                case 'del':
                case 'update':
                case 'counter':
                    return rowsAffected
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
