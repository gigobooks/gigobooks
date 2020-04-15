import * as Knex from 'knex'
import * as Client_SQLite3 from 'knex/lib/dialects/sqlite3'

// Some magic:
// * Modify the sqlite3 dialect so it works with our sqlite API
// * Return a knex object that uses the supplied database/connection
export function makeKnex(filename, connection) {
    const modifications = {
        modified: true,
        acquireRawConnection: () => {
            return new Promise((resolve, reject) => {
              resolve(connection)
            })
        },
        destroyRawConnection(connection) {
            // No-op: Don't close the underlying connection
        },
        _query: (connection, obj) => {
            const callMethod = obj.method == 'select' ? 'query' : 'exec'
            return new Promise(function(resolver, rejecter) {
                if (!connection || !connection[callMethod]) {
                    return rejecter(
                      new Error(`Error calling ${callMethod} on connection.`)
                    );
                }
                connection[callMethod](obj.sql, ...obj.bindings).then(response => {
                    obj.response = response
                    resolver(obj)
                }).catch(rejecter)
            });
        },
        processResponse: (obj, runner) => {
            let { response } = obj;
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
    })
}
