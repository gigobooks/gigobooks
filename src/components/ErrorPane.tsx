/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'

type Props = {
    onDismiss?: () => void
    children?: any
}

export default function ErrorPane({children, onDismiss}: Props) {
    return <div className='error-pane'>
        {children}
        <div className='error-pane-dismiss'>
            <button className='error-pane-dismiss-button' onClick={() => {
                if (onDismiss) {
                    onDismiss()
                }
            }}>Ok</button>
        </div>
    </div>
}
