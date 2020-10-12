/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import UrlBar from './UrlBar'

export function newHistorySegment() {
    history.pushState({newSegment: true}, '')
}

export function NavBar() {
    const [enabled, setEnabled] = React.useState<boolean>(false)

    function popStateListener() {
        setEnabled(!history.state || !history.state.newSegment)
    }

    function onClick() {
        history.back()
    }

    React.useEffect(() => {
        window.addEventListener('popstate', popStateListener)
        return () => {
            window.removeEventListener('popstate', popStateListener)
        }
    }, [])

    return <div>
        <input type='button' value='<<' disabled={!enabled} onClick={onClick} />
        {__DEV__ && <>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<UrlBar /></>}
    </div>
}
