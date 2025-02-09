const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./split.db', (err) => {
    if (err) {
        console.error("Error opening database: ", err.message);
    } else {
        console.log("Connected to the database.");
        
        // Create the `groups` table
        db.run('CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL)');
        
        // Create the `friends` table
        db.run('CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, group_id INTEGER, FOREIGN KEY(group_id) REFERENCES groups(id))');

        db.run(`CREATE TABLE IF NOT EXISTS groups_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            friend_id INTEGER NOT NULL,
            FOREIGN KEY(group_id) REFERENCES groups(id),
            FOREIGN KEY(friend_id) REFERENCES friends(id)
        )`);
        
        // Insert initial data
        db.serialize(() => {
            db.run("INSERT INTO groups (name) VALUES ('Trip to Goa')");
            db.run("INSERT INTO friends(name, group_id) VALUES ('Alice', 1)");
            db.run("INSERT INTO friends(name, group_id) VALUES ('Bob', 1)");
            db.run("INSERT INTO friends(name, group_id) VALUES ('Charlie', 1)");
        });

        // Create the `expenses` table
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER,
                friend_id INTEGER,
                amount REAL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(group_id) REFERENCES groups(id),
                FOREIGN KEY(friend_id) REFERENCES friends(id)
            )`);
        
            db.serialize(() => {
                db.run("INSERT INTO groups (name) VALUES ('Trip to Goa')");
                db.run("INSERT INTO friends (name, group_id) VALUES ('Alice', 1)");
                db.run("INSERT INTO friends (name, group_id) VALUES ('Bob', 1)");
                db.run("INSERT INTO friends (name, group_id) VALUES ('Charlie', 1)");
    
                // Insert data into `groups_members`
                db.run("INSERT INTO groups_members (group_id, friend_id) VALUES (1, 1)");
                db.run("INSERT INTO groups_members (group_id, friend_id) VALUES (1, 2)");
                db.run("INSERT INTO groups_members (group_id, friend_id) VALUES (1, 3)");
            });
        });
    }
});

module.exports = db;
