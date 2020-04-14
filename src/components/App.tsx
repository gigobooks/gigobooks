import * as React from "react"
import Sidebar from "react-sidebar"

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
        return (
            <Sidebar
                sidebar={<b>Sidebar content</b>}
                open={this.state.sidebarOpen}
                docked={this.state.sidebarDocked}
                onSetOpen={this.onSetSidebarOpen}
            >
                <b>Main content.</b>
            </Sidebar>
        );
    }    
}

export default App;
