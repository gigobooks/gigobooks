/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import { MenuItem, SubMenu, Divider } from 'rc-menu'
import { fileMenuAction0 } from './App'

export function fileMenu(props: {open: boolean, hasFilename: boolean, mru: string[], refreshApp: () => void}) {
    return <SubMenu key='file' title="File">
        <MenuItem key='new'>New</MenuItem>
        <MenuItem key='open'>Open</MenuItem>
        {props.mru.length > 0 && <SubMenu key='mru' title="Open recent">
            {props.mru.map((item, index) => <MenuItem key={`mru:${index}`}>
                {item}
            </MenuItem>)}
            <Divider />
            <MenuItem key='clear-mru'>Clear</MenuItem>
        </SubMenu>}
        <MenuItem key='save' disabled={!props.open || !props.hasFilename}>Save</MenuItem>
        <MenuItem key='save-as' disabled={!props.open}>Save as</MenuItem>
        <MenuItem key='close' disabled={!props.open}>Close</MenuItem>
        <MenuItem key='quit'>Quit</MenuItem>
    </SubMenu>
}

export async function fileMenuAction(op: string, extra: string, done: (path?: string) => void) {
    return fileMenuAction0(op, extra, done)
}
