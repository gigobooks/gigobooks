import * as React from 'react'
import Sidebar from 'react-sidebar'
import { HashRouter, Link, Route, Switch, useParams } from "react-router-dom"
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'

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
        <Link to="/"><h2>Home</h2></Link>
        <Link to="/account"><h2>Accounts</h2></Link>
        <Link to="/account/new"><h2>New account</h2></Link>
    </div>
}

const Main = () => {
    return <Switch>
        <Route path="/account/new">
            <h1>New account</h1>
        </Route>
        <Route path="/account/:id">
            <AccountDetailDispatch />
        </Route>
        <Route path="/account">
            <AccountOverview />
        </Route>
        <Route path="/">
            <h1>Front page</h1>
        </Route>
    </Switch>
}

function AccountDetailDispatch() {
    let { id } = useParams()
    return <AccountDetail id={id} />
}

export default App;
