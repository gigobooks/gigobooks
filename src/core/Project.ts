import schema from './schema/schema0'

async function initSchema(db: sqlite.Database): Promise<void> {
    for (let q of schema) {
        await db.exec(q)
    }
}

export class Project {
    isModified: boolean

    constructor(public filename: string, public database: sqlite.Database) {
        this.isModified = false
    }

    static async create(filename?: string): Promise<Project> {
        const project = new Project(filename ? filename : '', new sqlite.Database(filename ? filename : ':memory:'))
        await project.database.open()
        try {
            await initSchema(project.database)
        }
        catch (e) {
            project.database.close()
            throw e
        }
        return project
    }
}
