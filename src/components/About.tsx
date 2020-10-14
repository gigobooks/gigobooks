/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { APP_NAME, Project } from '../core'

export default function About() {
    const [sqliteVersion, setSqliteVersion] = React.useState<string>('')

    React.useEffect(() => {
        if (Project.isOpen()) {
            Project.knex.raw('SELECT sqlite_version() as version').then(rows => {
                if (rows && rows.length > 0) {
                    setSqliteVersion(rows[0].version)
                }
            })
        }
    }, [Project.isOpen])

    return <div>
        <h1 className='title'>{APP_NAME}</h1>
        <div>
            <ul><li>
                <label>Version:</label> not-yet-released
            </li><li>
                <label>Sqlite driver:</label> {Project.driver}
            </li>{sqliteVersion && <li>
                <label>Sqlite version:</label> {sqliteVersion}
            </li>}<li>
                <label>User agent:</label> {window.navigator.userAgent}
            </li><li>
                <label>Locale:</label> {navigator.languages ? `[ "${(navigator.languages).join('", "')}" ]` : navigator.language}
            </li></ul>
        </div>
    </div>
}
