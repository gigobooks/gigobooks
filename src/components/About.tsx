/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { APP_NAME, Project } from '../core'

export default function About() {
    return <div>
        <h1>
            <span className='title'>
                {APP_NAME}
            </span>
        </h1>
        <div>
            <ul><li>
                <label>Version:</label> not-yet-released
            </li><li>
                <label>Sqlite driver:</label> {Project.driver}
            </li><li>
                <label>User agent:</label> {window.navigator.userAgent}
            </li></ul>
        </div>
    </div>
}

