/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { Link } from 'react-router-dom'

export default function PreferencesPage() {
    return <div>
        <span className='breadcrumb'><Link to='/'>Home</Link> » </span>
        <h1 className='title inline'>Preferences</h1>
    </div>
}
