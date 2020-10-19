/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { APP_NAME, VERSION, LICENSE, Project } from '../core'

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
        <h1 className='title'>About {APP_NAME}</h1>
        <div>
            <ul><li>
                <label>Version:</label> {VERSION}
            </li><li>
                <label>Sqlite:</label> {Project.driver}
            </li>{sqliteVersion && <li>
                <label>Sqlite version:</label> {sqliteVersion}
            </li>}<li>
                <label>License:</label> {LICENSE}
            </li></ul>

            System Information
            <ul><li>
                <label>User agent:</label> {window.navigator.userAgent}
            </li><li>
                <label>Locale:</label> {navigator.languages ? `[ "${(navigator.languages).join('", "')}" ]` : navigator.language}
            </li></ul>
        </div>
    </div>
}
