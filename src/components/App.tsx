/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import Menu, { MenuItem, SubMenu, Divider } from 'rc-menu'
import { HashRouter, Route, Switch, useParams, Redirect } from 'react-router-dom'
import { Project } from '../core'
import { newHistorySegment, NavBar } from './NavBar'
import Preamble from './Preamble'
import About from './About'
import Settings from './Settings'
import SettingsTax from './SettingsTax'
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'
import ActorOverview from './ActorOverview'
import ActorDetail from './ActorDetail'
import ContributeCapital from './ContributeCapital'
import { TransactionOverview, SalesOverview, PurchasesOverview } from './TransactionOverview'
import TransactionDetail from './TransactionDetail'
import 'react-datepicker/dist/react-datepicker.css'
import Sale from './Sale'
import Purchase from './Purchase'
import { refreshWindowTitle } from '../util/util'
import { mruList, mruInsert, mruClear, mruDir } from '../util/mru'

function App() {
    const [open, setOpen] = React.useState<boolean>(Project.isOpen())
    const [hasFilename, setHasFilename] = React.useState<boolean>(false)
    const [mru, setMru] = React.useState<string[]>(mruList())

    function refresh() {
        refreshWindowTitle()
        setOpen(Project.isOpen())
        setHasFilename(!!Project.project && !!Project.project.filename)
        setMru(mruList())
    }

    React.useEffect(() => {
        newHistorySegment()
        refresh()
    }, [])

    return <HashRouter>
        <AppMenu open={open} hasFilename={hasFilename} mru={mru} onChange={refresh} />
        <div className='page'>
            {<Preamble />}
            {open && <NavBar />}
            {open ? <Main /> : <About />}
        </div>
    </HashRouter>
}

async function action(op: string, extra?: string): Promise<string | undefined> {
    let filename = ''
    let redirect = ''

    switch (op) {
        case 'new':
            await Project.create()
            Project.project!.changeListener = refreshWindowTitle
            newHistorySegment()
            redirect = Project.variables.get('mru')
            break

        case 'open':
        case 'recent':
            if (op == 'recent') {
                filename = extra!
            }
            else {
                try {
                    filename = await dialog.File({type: 'load', startDir: mruDir()})
                }
                catch (e) {
                    if (e.toString() != 'Cancelled') {
                        throw e
                    }
                }
            }

            if (filename) {
                await Project.open(filename)
                Project.project!.changeListener = refreshWindowTitle
                mruInsert(filename)
                newHistorySegment()
                redirect = Project.variables.get('mru')
            }
            break

        case 'save':
            await Project.variables.set('mru', window.location.hash.substring(1))
            await Project.save()
            break

        case 'save-as': 
            try {
                filename = await dialog.File({type: 'save', startDir: mruDir()})
            }
            catch (e) {
                if (e.toString() != 'Cancelled') {
                    throw e
                }
            }

            if (filename) {
                await Project.variables.set('mru', window.location.hash.substring(1))
                await Project.saveAs(filename!)
                mruInsert(filename)
            }
            break

        case 'close':
            await Project.close()
            newHistorySegment()
            redirect = '/'
            break

        case 'quit':
            native.exit(0)
            break

        case 'clear-recents':
            mruClear()
            break
    }

    return redirect
}

interface MenuInfo {
    key: React.Key
    keyPath: React.Key[]
    item: React.ReactInstance
    domEvent: React.MouseEvent<HTMLElement>
}

type RedirectSpec = {
    path: string
    push?: boolean
}

function AppMenu(props: {open: boolean, hasFilename: boolean, mru: string[], onChange: () => void}) {
    const [redirect, setRedirect] = React.useState<RedirectSpec>({path: ''})
    const [trigger, setTrigger] = React.useState<'hover' | 'click'>('hover')
    const [nonce, setNonce] = React.useState<number>(0)

    useParams()     // This is needed somehow. Don't know why.

    React.useEffect(() => {
        setRedirect({path: ''})
    }, [window.location.hash])

    function onClick(info: MenuInfo) {
        const key = info.key as string
        if (info.keyPath.length > 1 && info.keyPath[info.keyPath.length - 1] == 'file') {
            const keyParts = key.split(':')
            const extra = keyParts[0] == 'recent' ? props.mru[Number(keyParts[1])] : undefined

            action(keyParts[0], extra).then(path => {
                if (path) {
                    setRedirect({path})
                }
                props.onChange()
            })
        }
        else if (key.startsWith('/')) {
            setRedirect({path: key, push: true})
        }
        setNonce(nonce + 1)
    }

    const path = window.location.hash.substring(1)
    if (redirect.path != '' && redirect.path != path) {
        return <Redirect push={redirect.push} to={`${redirect.path}`} />
    }

    // Setting `key` to a unique value results in a new instance of Menu.
    // This is a work-around to make the menu 'close' after each click
    return <Menu
        key={nonce}
        mode='horizontal'
        triggerSubMenuAction={trigger}
        onClick={onClick}>
        <SubMenu key='file' title="File">
            <MenuItem key='new'>New</MenuItem>
            <MenuItem key='open'>Open</MenuItem>
            {props.mru.length > 0 && <SubMenu key='recents' title="Open recent">
                {props.mru.map((item, index) => <MenuItem key={`recent:${index}`}>
                    {item}
                </MenuItem>)}
                <Divider />
                <MenuItem key='clear-recents'>Clear</MenuItem>
            </SubMenu>}
            <MenuItem key='save' disabled={!props.open || !props.hasFilename}>Save</MenuItem>
            <MenuItem key='save-as' disabled={!props.open}>Save as</MenuItem>
            <MenuItem key='close' disabled={!props.open}>Close</MenuItem>
            <MenuItem key='quit'>Quit</MenuItem>
        </SubMenu>
        {props.open && <SubMenu key='1' title="Sales">
            <MenuItem key='/sales'>List</MenuItem>
            <MenuItem key='/sales/new'>New sale</MenuItem>
        </SubMenu>}
        {props.open && <SubMenu key='2' title="Purchases">
            <MenuItem key='/purchases'>List</MenuItem>
            <MenuItem key='/purchases/new'>New purchase</MenuItem>
        </SubMenu>}
        {props.open && <SubMenu key='3' title="Customers/Suppliers">
            <MenuItem key='/actors'>List</MenuItem>
            <MenuItem key='/customers/new'>New customer</MenuItem>
            <MenuItem key='/suppliers/new'>New supplier</MenuItem>
        </SubMenu>}
        {props.open && <SubMenu key='4' title="Company">
            <MenuItem key='/accounts'>Accounts</MenuItem>
            <MenuItem key='/accounts/new'>New account</MenuItem>
            <Divider />
            <MenuItem key='/contributions/new'>New contribution</MenuItem>
            <Divider />
            <MenuItem key='/transactions'>Journal</MenuItem>
            <MenuItem key='/transactions/new'>New raw journal entry</MenuItem>
            <Divider />
            <MenuItem key='/settings'>Settings</MenuItem>
            <MenuItem key='/settings/tax'>Tax Settings</MenuItem>
        </SubMenu>}
        <SubMenu key='help' title="Help">
            <MenuItem key='/'>About</MenuItem>
        </SubMenu>
    </Menu>
}

function Main() {
    return <Switch>
        <Route path='/purchases/:arg1'>
            <DispatchWithParams element={Purchase} />
        </Route>
        <Route path='/purchases'>
            <PurchasesOverview />
        </Route>
        <Route path='/sales/:arg1'>
            <DispatchWithParams element={Sale} />
        </Route>
        <Route path='/sales'>
            <SalesOverview />
        </Route>
        <Route path='/contributions/:arg1'>
            <DispatchWithParams element={ContributeCapital} />
        </Route>
        <Route path='/transactions/:arg1'>
            <DispatchWithParams element={TransactionDetail} />
        </Route>
        <Route path='/transactions'>
            <TransactionOverview />
        </Route>
        <Route path='/suppliers/:arg1'>
            <DispatchWithParams element={ActorDetail} supplier />
        </Route>
        <Route path='/customers/:arg1'>
            <DispatchWithParams element={ActorDetail} customer />
        </Route>
        <Route path='/actors'>
            <ActorOverview />
        </Route>
        <Route path='/accounts/:arg1'>
            <DispatchWithParams element={AccountDetail} />
        </Route>
        <Route path='/accounts'>
            <AccountOverview />
        </Route>
        <Route path='/settings/tax'>
            <SettingsTax />
        </Route>
        <Route path='/settings'>
            <Settings />
        </Route>
        <Route path='/'>
            <About />
        </Route>
    </Switch>
}

// For some reason, useParams() doesn't work inside Main() so we have this
// extra level of indirection here.
function DispatchWithParams(props: any) {
    const {element, ...rest} = props
    return React.createElement(element, {...rest, ...useParams()})
}

export default App
