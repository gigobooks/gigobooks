declare module native {
    /**
     * Sets the title of the native window
     *
     * @param title: The title to set to
     */
    function setTitle(title: string): Promise<void>

    /**
     * Asks the native window to exit 
     *
     * @param exitCode The (CLI) exit code to be returned to the operating system.
     */
    function exit(exitCode: number): Promise<void>

    /**
     * Deletes a file
     * 
     * @param filename pathname to delete
     */
    function remove(filename: string): Promise<void>
}

declare module dialog {
    interface FileDialogConfig {
        // Required
        type: 'load' | 'save'

        // Title of dialog
        title?: string

        // Directory to start in
        startDir?: string

        // An array of file filters. See example below
        filters?: object
    }

    /**
     * Opens a file selection dialog and returns the selected filename
     * 
     * @param config Example configuration:
     * ```
     * {
     *   type: 'load',
     *   title: 'Pick a file',
     *   startDir: '.',
     *   filters: {
     *     'All files': ['*'],
     *     'text files': ['txt', 'md'],
     *    }
     * }
     * ```
     */
    function File(config: FileDialogConfig): Promise<string>

    interface DirectoryDialogConfig {
        // Title of dialog
        title?: string
    }

    /**
     * Opens a directory selection dialog and returns the selected directory
     * 
     * @param config Example configuration:
     * ```
     * {
     *   title: 'Pick a directory',
     * }
     * ```
     */
    function Directory(config: DirectoryDialogConfig): Promise<string>
}

declare module gosqlite {
    class Database {
        /**
         * Construct a new database object. The object must be `open()`-ed before it can be used.
         * 
         * @param filename pathname of database, or `:memory:`
         */
        constructor(filename: string)

        /**
         * Opens a database
         */
        open(): Promise<void>

        /**
         * Closes a database
         */
        close(): Promise<void>

        /**
         * Executes a SQL query that does not retrieve any results
         * 
         * @param query Query string. Use `?` for parameter placeholders
         * @param params Optional parameters
         */
        exec(query: string, ...params: any[]): Promise<{lastInsertId: number, rowsAffected: number}>

        /**
         * Executes a SQL SELECT query and returns an array of objects
         * 
         * @param query Query string. Use `?` for parameter placeholders
         * @param params Optional parameters
         */
        query(query: string, ...params: any[]): Promise<object[]>

        /**
         * Executes a SQL SELECT query and returns the first row as an object
         * 
         * @param query Query string. Use `?` for parameter placeholders
         * @param params Optional parameters
         */
        queryRow(query: string, ...params: any[]): Promise<object>

        /**
         * Executes a SQL SELECT query that retrieves a single field and returns it
         * 
         * @param query Query string. Use `?` for parameter placeholders
         * @param params Optional parameters
         */
        queryResult(query: string, ...params: any[]): Promise<any>

        /**
         * Backup the database to a new filename or in-memory database
         * 
         * @param destFilename pathname to backup to, or `:memory:`
         */
        backupTo(destFilename: string): Promise<Database>

        /**
         * Begins a transaction and returns it
         */
        begin(): Promise<Transaction>
    }

    class Transaction {
        /**
         * Commits a transaction
         */
        commit(): Promise<void>

        /**
         * Rollback or cancels a transaction
         */
        rollback(): Promise<void>

        /**
         * See Database.exec/query/queryRow/queryResult above
         */
        exec(query: string, ...params: any[]): Promise<{lastInsertId: number, rowsAffected: number}>
        query(query: string, ...params: any[]): Promise<object[]>
        queryRow(query: string, ...params: any[]): Promise<object>
        queryResult(query: string, ...params: any[]): Promise<any>
    }
}
