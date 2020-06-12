import * as React from 'react'
import Sidebar from 'react-sidebar'
import { HashRouter, Link, Route, Switch, useParams } from 'react-router-dom'
import Settings from './Settings'
import SettingsTax from './SettingsTax'
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'
import ActorOverview from './ActorOverview'
import ActorDetail from './ActorDetail'
import ContributeCapital from './ContributeCapital'
import DebugScreen from './DebugScreen'
import UrlBar from './UrlBar'
import TransactionOverview from './TransactionOverview'
import TransactionDetail from './TransactionDetail'
import 'react-datepicker/dist/react-datepicker.css'
import Sale from './Sale'
import Invoice from './Invoice'
import Purchase from './Purchase'
import Bill from './Bill'

const mql = window.matchMedia(`(min-width: 800px)`);

interface AppState {
    sidebarDocked: boolean,
    sidebarOpen: boolean
}

class App extends React.Component<{}, AppState> {
    constructor(props: any) {
        super(props)
        this.state = {
            sidebarDocked: mql.matches,
            sidebarOpen: false
        };
    
        this.mediaQueryChanged = this.mediaQueryChanged.bind(this);
        this.onSetSidebarOpen = this.onSetSidebarOpen.bind(this);
    }
    
    componentDidMount() {
        mql.addListener(this.mediaQueryChanged);
    }
    
    componentWillUnmount() {
        mql.removeListener(this.mediaQueryChanged);
    }
    
    onSetSidebarOpen(open: boolean) {
        this.setState({ sidebarOpen: open });
    }
    
    mediaQueryChanged() {
        this.setState({ sidebarDocked: mql.matches, sidebarOpen: false });
    }

    render() {
        return <HashRouter>
            <Sidebar
                sidebar={<Menu />}
                open={this.state.sidebarOpen}
                docked={this.state.sidebarDocked}
                onSetOpen={this.onSetSidebarOpen}
            >
                <Main />
            </Sidebar>
        </HashRouter>    
    }    
}

const Menu = () => {
    return <div>
        <div>
            Sales
            <ul style={{marginTop: '0'}}><li>
                List
            </li><li>
                <Link to='/sales/new'>New cash sale</Link>
            </li><li>
                <Link to='/invoices/new'>New invoice</Link>
            </li></ul>
        </div><div>
            Purchases
            <ul style={{marginTop: '0'}}><li>
                List
            </li><li>
            <Link to='/purchases/new'>New cash purchase</Link>
            </li><li>
            <Link to='/bills/new'>New bill</Link>
            </li></ul>
        </div><div>
            Customers/Suppliers
            <ul style={{marginTop: '0'}}><li>
                <Link to='/actors'>List</Link>
            </li><li>
                <Link to='/customers/new'>New customer</Link>
            </li><li>
            <Link to='/suppliers/new'>New supplier</Link>
            </li></ul>
        </div><div>
            Company
            <ul style={{marginTop: '0'}}><li>
                <Link to='/accounts'>Accounts</Link>
            </li><li>
                <Link to='/contributions/new'>New contribution</Link>
            </li><li>
                <Link to='/transactions'>Transactions</Link>
            </li><li>
                <Link to='/settings'>Settings</Link>
            </li><li>
                <Link to='/settings/tax'>Tax settings</Link>
            </li></ul>
        </div><div>
            <Link to='/debug'>Debug</Link> | <Link to='/'>Root</Link>
        </div>

        <Switch>
            <Route path='/:path'>
                <UrlBar />
            </Route>
            <Route path='/'>
                <UrlBar />
            </Route>
        </Switch>
    </div>
}

const Main = () => {
    return <Switch>
        <Route path='/bills/:arg1'>
            <DispatchWithParams element={Bill} pathDir='/bills' />
        </Route>
        <Route path='/purchases/:arg1'>
            <DispatchWithParams element={Purchase} pathDir='/purchases' />
        </Route>
        <Route path='/invoices/:arg1'>
            <DispatchWithParams element={Invoice} pathDir='/invoices' />
        </Route>
        <Route path='/sales/:arg1'>
            <DispatchWithParams element={Sale} pathDir='/sales' />
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
            <h1>Front page</h1>
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
