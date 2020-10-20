/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { APP_NAME, Project } from '../core'

export default function Front() {
    return <div>
        <h1 className='title'>{APP_NAME}</h1>
        {!Project.isOpen() && <p>Please create a new file or open an existing file.</p>}
    </div>
}
