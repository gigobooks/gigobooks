import * as React from 'react'
import Menu, { MenuItem, SubMenu, Divider } from 'rc-menu'
import 'rc-menu/assets/index.css'
import styled from 'styled-components'
import { HashRouter, Route, Switch, useParams, Redirect } from 'react-router-dom'
import { Project } from '../core'
// import { playSuccess } from '../util/sound'
import Settings from './Settings'
import SettingsTax from './SettingsTax'
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'
import ActorOverview from './ActorOverview'
import ActorDetail from './ActorDetail'
import ContributeCapital from './ContributeCapital'
import DebugScreen from './DebugScreen'
import UrlBar from './UrlBar'
import { TransactionOverview, SalesOverview, PurchasesOverview } from './TransactionOverview'
import TransactionDetail from './TransactionDetail'
import 'react-datepicker/dist/react-datepicker.css'
import Sale from './Sale'
import Invoice from './Invoice'
import Purchase from './Purchase'
import Bill from './Bill'

function App() {
    const [open, setOpen] = React.useState<boolean>(Project.isOpen())

    return <HashRouter>
        <AppMenu open={open} onChange={() => {
            setOpen(Project.isOpen())
        }} />
        <UrlBar />
        {open && <Main />}
    </HashRouter>    
}

async function action(action: string): Promise<string | undefined> {
    let filename = ''
    let redirect = ''

    switch (action) {
        case 'new':
            await Project.create();
            // playSuccess()
            redirect = '/settings'
            break
        
        case 'open':
            try {
                filename = await dialog.File({type: 'load'})
            }
            catch (e) {
                if (e.toString() != 'Cancelled') {
                    throw e
                }
            }

            if (filename) {
                await Project.open(filename!)
                // playSuccess()
                redirect = '/'
            }
            break

        case 'save':
            await Project.save();
            // playSuccess()
            break

        case 'save-as': 
            try {
                filename = await dialog.File({type: 'save'})
            }
            catch (e) {
                if (e.toString() != 'Cancelled') {
                    throw e
                }
            }

            if (filename) {
                await Project.saveAs(filename!)
                // playSuccess()
            }
            break

        case 'close':
            await Project.close()
            redirect = '/'
            break

        case 'quit':
            native.exit(0);
            break
    }

    return redirect
}

interface MenuInfo {
    key: React.Key;
    keyPath: React.Key[];
    item: React.ReactInstance;
    domEvent: React.MouseEvent<HTMLElement>;
}

function AppMenu(props: {open: boolean, onChange: () => void}) {
    const [redirect, setRedirect] = React.useState<string>('')
    const [trigger, setTrigger] = React.useState<'hover' | 'click'>('hover')

    useParams()     // This is needed to trigger a re-render or something?

    React.useEffect(() => {
        setRedirect('')
    }, [window.location.hash])

    function onClick(info: MenuInfo) {
        const key = info.key as string
        if (info.keyPath.length > 1 && info.keyPath[1] == 'file') {
            action(key).then(path => {
                if (path) {
                    setRedirect(path)
                }
                props.onChange()
            })
        }
        else if (key.startsWith('/')) {
            setRedirect(key)
        }
    }

    const path = window.location.hash.substring(1)
    if (redirect != '' && redirect != path) {
        return <Redirect to={`${redirect}`} />
    }

    return <Styles><Menu
        mode='horizontal'
        triggerSubMenuAction={trigger}
        onClick={onClick}>
        <SubMenu key='file' title="File">
            <MenuItem key='new'>New</MenuItem>
            <MenuItem key='open'>Open</MenuItem>
            <MenuItem key='save' disabled={!props.open}>Save</MenuItem>
            <MenuItem key='save-as' disabled={!props.open}>Save as</MenuItem>
            <MenuItem key='close' disabled={!props.open}>Close</MenuItem>
            <MenuItem key='quit'>Quit</MenuItem>
        </SubMenu>
        {props.open && <SubMenu key='1' title="Sales">
            <MenuItem key='/sales'>List</MenuItem>
            <MenuItem key='/sales/new'>New cash sale</MenuItem>
            <MenuItem key='/invoices/new'>New invoice</MenuItem>
        </SubMenu>}
        {props.open && <SubMenu key='2' title="Purchases">
            <MenuItem key='/purchases'>List</MenuItem>
            <MenuItem key='/purchases/new'>New cash purchase</MenuItem>
            <MenuItem key='/bills/new'>New bill</MenuItem>
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
        <MenuItem key='/debug'>Debug</MenuItem>
        <MenuItem key='/'>Root</MenuItem>
    </Menu></Styles>
}

const Styles = styled.div`ul { margin: 0; }`

function Main() {
    return <Switch>
        <Route path='/bills/:arg1'>
            <DispatchWithParams element={Bill} pathDir='/bills' />
        </Route>
        <Route path='/purchases/:arg1'>
            <DispatchWithParams element={Purchase} pathDir='/purchases' />
        </Route>
        <Route path='/purchases'>
            <PurchasesOverview />
        </Route>
        <Route path='/invoices/:arg1'>
            <DispatchWithParams element={Invoice} pathDir='/invoices' />
        </Route>
        <Route path='/sales/:arg1'>
            <DispatchWithParams element={Sale} pathDir='/sales' />
        </Route>
        <Route path='/sales'>
            <SalesOverview />
        </Route>
        <Route path='/contributions/:arg1'>
            <DispatchWithParams element={ContributeCapital} pathDir='/contributions' />
        </Route>
        <Route path='/transactions/:arg1'>
            <DispatchWithParams element={TransactionDetail} pathDir='/transactions' />
        </Route>
        <Route path='/transactions'>
            <TransactionOverview />
        </Route>
        <Route path='/suppliers/:arg1'>
            <DispatchWithParams element={ActorDetail} pathDir='/suppliers' supplier />
        </Route>
        <Route path='/customers/:arg1'>
            <DispatchWithParams element={ActorDetail} pathDir='/customers' customer />
        </Route>
        <Route path='/actors'>
            <ActorOverview />
        </Route>
        <Route path='/accounts/:arg1'>
            <DispatchWithParams element={AccountDetail} pathDir='/accounts' />
        </Route>
        <Route path='/accounts'>
            <AccountOverview />
        </Route>
        <Route path='/debug'>
            <DebugScreen />
        </Route>
        <Route path='/settings/tax'>
            <SettingsTax />
        </Route>
        <Route path='/settings'>
            <Settings />
        </Route>
        <Route path='/'>
        </Route>
    </Switch>
}

// For some reason, useParams() doesn't work inside Main() so we have this
// extra level of indirection here.
function DispatchWithParams(props: any) {
    const {element, ...rest} = props
    return React.createElement(element, {...rest, ...useParams()})
}

export default App;
