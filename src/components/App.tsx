import * as React from 'react'
import Sidebar from 'react-sidebar'
import { HashRouter, Link, Route, Switch, useParams } from "react-router-dom"
import AccountOverview from './AccountOverview'
import AccountDetail from './AccountDetail'
import AccountNew from './AccountNew'
import ContributeCapital from './ContributeCapital'

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
        <Link to="/contribute"><h2>Contribute</h2></Link>
    </div>
}

const Main = () => {
    return <Switch>
        <Route path="/contribute">
            <ContributeCapital />
        </Route>
        <Route path="/account/new">
            <AccountNew />
        </Route>
        <Route path="/account/:id">
            <DispatchWithParams element="AccountDetail" />
        </Route>
        <Route path="/account">
            <AccountOverview />
        </Route>
        <Route path="/">
            <h1>Front page</h1>
        </Route>
    </Switch>
}


// For some reason, useParams() doesn't work inside Main() so we have this
// extra level of indirection here.
function DispatchWithParams(props: {element: string}) {
    const components: any = {
        AccountDetail,
    }
    
    const E = components[props.element]
    return React.createElement(E, useParams())
}

export default App;
