/**
 * Copyright (c) 2020-present Beng Tan
 */

import * as React from 'react'
import Menu, { MenuItem, SubMenu, Divider } from 'rc-menu'
import { HashRouter, Route, Switch, useParams, Redirect } from 'react-router-dom'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { Project } from '../core'
import { newHistorySegment, NavBar } from './NavBar'
import { fileMenu, fileMenuAction } from './FileMenu'
import ErrorPane from './ErrorPane'
import { Wrapper } from './Stubs'
import About from './About'
import Settings from './Settings'
import TaxSettings from './TaxSettings'
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'
import ActorOverview from './ActorOverview'
import ActorDetail from './ActorDetail'
import ContributeCapital from './ContributeCapital'
import { TransactionOverview, SalesOverview, PurchasesOverview } from './TransactionOverview'
import TransactionDetail from './TransactionDetail'
import 'react-datepicker/dist/react-datepicker.css'
import Sale from './Sale'
import SalePDF from './SalePDF'
import Purchase from './Purchase'
import { refreshWindowTitle } from '../util/util'
import { mruList, mruInsert, mruClear, mruDir } from '../util/mru'
import { ProfitAndLoss } from './ProfitAndLoss'
import { BalanceSheet } from './BalanceSheet'
import { TransactionTaxesDetail } from './TransactionTaxes'
import { taxReportsMenuItems, TaxReportsRouter } from './TaxReports'

function App() {
    const [open, setOpen] = React.useState<boolean>(Project.isOpen())
    const [hasFilename, setHasFilename] = React.useState<boolean>(false)
    const [mru, setMru] = React.useState<string[]>(mruList())
    const [error, setError] = React.useState<string>('')
    const [componentStack, setComponentStack] = React.useState<string>('')

    function refresh() {
        refreshWindowTitle()
        setOpen(Project.isOpen())
        setHasFilename(!!Project.project && !!Project.project.filename)
        setMru(mruList())
    }

    function beforeUnloadListener(e: BeforeUnloadEvent) {
        if (Project.isOpen() && Project.project!.isModified) {
            e.preventDefault()
            e.returnValue = 'You have unsaved changes'
            return e.returnValue
        }
    }

    // Logs both handled and unhandled rejections
    function rejectionLogger(e: PromiseRejectionEvent) {
        let text = e.reason.toString()

        // PromiseRejectionEvent objects are weird
        // ... and seem to be implementation dependent
        if (typeof e.reason === 'object') {
            const o: Record<any, any> = {}
            Object.getOwnPropertyNames(e.reason).forEach((k: any) => {
                o[k] = e.reason[k]
            })
            text = `${text}\n${JSON.stringify(o, null, 2)}`
        }

        setError(error => `${error}\n${text}`)
    }

    React.useEffect(() => {
        newHistorySegment()
        refresh()

        window.addEventListener('beforeunload', beforeUnloadListener)
        window.addEventListener('rejectionhandled', rejectionLogger)
        window.addEventListener('unhandledrejection', rejectionLogger)

        return () => {
            window.removeEventListener('beforeunload', beforeUnloadListener)
            window.removeEventListener('rejectionhandled', rejectionLogger)
            window.removeEventListener('unhandledrejection', rejectionLogger)
        }
    }, [])

    return <HashRouter><Wrapper>
        <AppMenu open={open} hasFilename={hasFilename} mru={mru} refreshApp={refresh} />
        <div className='page'>
            {open && <NavBar />}

            {error && <ErrorPane onDismiss={() => setError('')}>
                <pre>{error}</pre>
            </ErrorPane>}
            <ErrorBoundary
                onError={(error: Error, info: { componentStack: string }) => {
                    setComponentStack(info.componentStack)
                }}
                fallbackRender={(props: FallbackProps) => {
                    return <ErrorFallback stack={componentStack} {...props} />
                }}
            >
                {open ? <Main refreshApp={refresh} /> : <About />}
            </ErrorBoundary>
        </div>
    </Wrapper></HashRouter>
}

function ErrorFallback({error, resetErrorBoundary, stack}: FallbackProps & {stack?: string}) {
    // Auto-reset ErrorBoundary if the path changes
    function clearError() {
        if (resetErrorBoundary) {
            resetErrorBoundary()
        }
    }

    React.useEffect(() => {
        window.addEventListener('popstate', clearError)
        return () => {
            window.removeEventListener('popstate', clearError)
        }
    }, [])

    return <ErrorPane onDismiss={clearError}>
        {error!.toString()}
        {stack && <pre>{stack}</pre>}
    </ErrorPane>
}

export async function fileMenuAction0(op: string, extra: string, done: (path?: string) => void, force = false) {
    let filename = ''
    let redirect = ''

    if (!__WEB__) {
        if (Project.isOpen() && Project.project!.isModified &&
            ['new', 'open', 'mru', 'close', 'quit'].indexOf(op) >= 0 && !force) {
            const proceed = await dialog.confirm('You have unsaved changes which will be lost. Continue?')
            if (!proceed) {
                done()
                return
            }
        }    
    }

    switch (op) {
        case 'new':
            await Project.create()
            Project.project!.changeListener = refreshWindowTitle
            newHistorySegment()
            redirect = Project.variables.get('mru')
            break

        case 'open':
        case 'mru':
            if (op == 'mru') {
                filename = extra
            }
            else {
                try {
                    filename = await dialog.file({type: 'load', startDir: mruDir()})
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
                filename = await dialog.file({type: 'save', startDir: mruDir()})
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

        case 'clear-mru':
            mruClear()
            break
    }

    done(redirect)
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

function AppMenu(props: {open: boolean, hasFilename: boolean, mru: string[], refreshApp: () => void}) {
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
            const extra = keyParts[0] == 'mru' ? props.mru[Number(keyParts[1])] : ''

            fileMenuAction(keyParts[0], extra, function (path) {
                if (path) {
                    setRedirect({path})
                }
                props.refreshApp()
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
        {fileMenu(props)}
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
        {props.open && <SubMenu key='reports' title="Reports">
            <MenuItem key='/reports/pl-summary'>Profit and Loss: Summary</MenuItem>
            <MenuItem key='/reports/pl-detail'>Profit and Loss: Detail</MenuItem>
            <MenuItem key='/reports/bs'>Balance Sheet</MenuItem>
            <MenuItem key='/reports/bs-log'>Balance Sheet: Log</MenuItem>
            <MenuItem key='/reports/tax-detail'>Transaction Tax: Detail</MenuItem>
            {taxReportsMenuItems()}
        </SubMenu>}
        <SubMenu key='help' title="Help">
            <MenuItem key='/'>About</MenuItem>
        </SubMenu>
    </Menu>
}

function Main({refreshApp}: {refreshApp: () => void}) {
    return <Switch>
        <Route path='/reports/tax'>
            <TaxReportsRouter />
        </Route>
        <Route path='/reports/tax-detail'>
            <TransactionTaxesDetail />
        </Route>
        <Route path='/reports/pl-detail'>
            <ProfitAndLoss />
        </Route>
        <Route path='/reports/pl-summary'>
            <ProfitAndLoss summary />
        </Route>
        <Route path='/reports/bs-log'>
            <BalanceSheet />
        </Route>
        <Route path='/reports/bs'>
            <BalanceSheet summary />
        </Route>
        <Route path='/purchases/:arg1'>
            <DispatchWithParams element={Purchase} />
        </Route>
        <Route path='/purchases'>
            <PurchasesOverview />
        </Route>
        <Route path='/sales/:arg1/pdf'>
            <DispatchWithParams element={SalePDF} />
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
            <TaxSettings refreshApp={refreshApp} />
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
