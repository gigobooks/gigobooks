import * as React from 'react'
import Sidebar from 'react-sidebar'
import { HashRouter, Link, Route, Switch, useParams } from 'react-router-dom'
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'
import AccountNew from './AccountNew'
import ContributeCapital from './ContributeCapital'
import DebugScreen from './DebugScreen'
import UrlBar from './UrlBar'

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
        <Link to='/'><h2>Home</h2></Link>
        <Link to='/accounts'><h2>Accounts</h2></Link>
        <Link to='/accounts/new'><h2>New account</h2></Link>
        <Link to='/contributions/new'><h2>Contribute</h2></Link>
        <Link to='/contributions/1'><h2>Contribution 1</h2></Link>
        <Link to='/debug'><h2>Debug</h2></Link>

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
        <Route path='/contributions/:arg1'>
            <DispatchWithParams element={ContributeCapital} />
        </Route>
        <Route path='/accounts/new'>
            <AccountNew />
        </Route>
        <Route path='/accounts/:id'>
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
function DispatchWithParams(props: {element: any}) {
    const E = props.element
    return React.createElement(E, useParams())
}

export default App;
