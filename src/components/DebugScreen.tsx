import * as React from 'react'
import { Project } from '../core'

export default function DebugScreen() {
    return <div>
        <h1>Debug</h1>
        <button onClick={() => {
            Project.saveAs('./foo1.db')
        }}>Save to ./foo1.db</button>
    </div>
}
