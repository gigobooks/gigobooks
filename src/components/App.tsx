import * as React from 'react'
import Sidebar from 'react-sidebar'
import { HashRouter, Link, Route, Switch, useParams } from 'react-router-dom'
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'
import ActorDetail from './ActorDetail'
import ContributeCapital from './ContributeCapital'
import DebugScreen from './DebugScreen'
import UrlBar from './UrlBar'
import TransactionOverview from './TransactionOverview'
import TransactionDetail from './TransactionDetail'
import 'react-datepicker/dist/react-datepicker.css'
import Sale from './Sale'

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
        <Link to='/'>Home</Link><br />
        <Link to='/accounts'>Accounts</Link> - <Link to='/accounts/new'>new</Link><br />
        Actors - <Link to='/actors/new'>new</Link><br />
        <Link to='/transactions'>Transactions</Link> - <Link to='/transactions/new'>new</Link><br />
        <Link to='/contributions/new'>New contribution</Link><br />
        <Link to='/sales/new'>New sale</Link><br />
        <Link to='/debug'>Debug</Link>

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
        <Route path='/sales/:arg1'>
            <DispatchWithParams element={Sale} />
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
        <Route path='/actors/:arg1'>
            <DispatchWithParams element={ActorDetail} />
        </Route>
        <Route path='/accounts/:arg1'>
            <DispatchWithParams element={AccountDetail} />
        </Route>
        <Route path='/accounts'>
            <AccountOverview />
        </Route>
        <Route path='/Debug'>
            <DebugScreen />
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
