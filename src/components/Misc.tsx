/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import ReactTooltip from 'react-tooltip'

var ICON_URL = require('../../assets/media/Icon-round-Question_mark.svg').default
export function ToolTip({text}: {text: string}) {
    return <>&nbsp;
        <a className="tool-tip" data-tip={text}><img className="tool-tip-icon" src={ICON_URL} /></a>
        <ReactTooltip multiline={true} effect='solid' />
    </>
}

var ASTERISK_URL = require('../../assets/media/red-asterisk.png').default
export function Required() {
    return <img className='required-asterisk' src={ASTERISK_URL} alt='required' />
}
