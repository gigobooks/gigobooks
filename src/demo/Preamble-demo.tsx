/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'

export default function Preamble() {
    const link: React.CSSProperties = { fontWeight: 'bold' }
    return <div style={{ fontSize: '0.75em' }}>
        <p>
            This is a demo of GigoBooks. Please see the <a target="_blank" style={link} href="https://github.com/gigobooks/gigobooks">repository</a> or the <a target="_blank" style={link} href="https://gigobooks.github.io">blog</a> for more information.
        <br />
            Note: Although this demo is on the web, GigoBooks is a desktop application that does not use the internet.
        </p>
    </div>
}
