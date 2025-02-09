const express = require('express');
const bodyParser = require('body-parser');
const db = require('./database');
const app = express();
const router = express.Router();

app.use(express.json()); // Replaces bodyParser.json()


// Get group by ID with associated friends
app.get('/api/groups/:id', (req, res) => {
    const groupId = req.params.id;

    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
        } else if (!row) {
            res.status(404).json({ "error": "Group not found" });
        } else {
            db.all('SELECT * FROM friends WHERE group_id = ?', [groupId], (err, rows) => {
                if (err) {
                    res.status(500).json({ "error": err.message });
                } else {
                    res.json({
                        "message": "success",
                        "group": row,
                        "friends": rows
                    });
                }
            });
        }
    });
});

// Add an expense to a group
app.post('/api/groups/:id', (req, res) => {
    const groupId = req.params.id;
    const { friend_id, amount, description } = req.body;

    // Validate required fields
    if (!friend_id || !amount || !description) {
        return res.status(400).json({ message: "Friend ID, amount, and description are required" });
    }

    const query = 'INSERT INTO expenses (group_id, friend_id, amount, description) VALUES (?, ?, ?, ?)';
    db.run(query, [groupId, friend_id, amount, description], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({
                message: "success",
                expense: {
                    id: this.lastID,
                    group_id: groupId,
                    friend_id,
                    amount,
                    description
                }
            });
        }
    });
});

app.get('/api/groups/:id/balances', (req, res) => {
    const groupId = req.params.id;

    // Query to get the friends in the group
    const getFriendsQuery = `
        SELECT friends.id, friends.name 
        FROM friends 
        JOIN groups_members ON friends.id = groups_members.friend_id 
        WHERE groups_members.group_id = ?
    `;

    db.all(getFriendsQuery, [groupId], (err, friends) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (friends.length === 0) {
            return res.status(404).json({ error: "Group not found or no friends in the group" });
        }

        // Query to get the expenses for the group
        const getExpensesQuery = `
            SELECT friend_id, SUM(amount) AS total 
            FROM expenses 
            WHERE group_id = ? 
            GROUP BY friend_id
        `;

        db.all(getExpensesQuery, [groupId], (err, expenses) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Calculate total group expense and equal share
            const totalGroupExpense = expenses.reduce((sum, expense) => sum + expense.total, 0);
            const equalShare = totalGroupExpense / friends.length;

            // Calculate balances for each friend
            const balances = friends.map(friend => {
                const friendExpense = expenses.find(expense => expense.friend_id === friend.id);
                const balance = friendExpense ? friendExpense.total - equalShare : -equalShare;

                return {
                    id: friend.id,
                    name: friend.name,
                    balance: balance.toFixed(2) // Format balance to 2 decimal places
                };
            });

            // Generate messages for balances
            const balanceSummary = balances.map(b => {
                if (b.balance > 0) {
                    return `${b.name} owes ₹${b.balance} to the group.`;
                } else if (b.balance < 0) {
                    return `${b.name} is owed ₹${Math.abs(b.balance)} by the group.`;
                } else {
                    return `${b.name} is settled.`;
                }
            });

            res.json({
                groupId,
                totalGroupExpense: totalGroupExpense.toFixed(2),
                equalShare: equalShare.toFixed(2),
                balances,
                balanceSummary
            });
        });
    });
});
 
app.post('/api/groups/:groupId/settle', async (req, res) => { 
    const { groupId } = req.params;
    const { payerId, payeeId, amount } = req.body;

    try {
        if (!payerId || !payeeId || !amount) {
            return res.status(400).json({ error: "payerId, payeeId, and amount are required" });
        }

        const description = `${payerId} paid ₹${amount} to ${payeeId} to settle the balance`;
        const query = `
            INSERT INTO expenses (group_id, friend_id, amount, description) 
            VALUES (?, ?, ?, ?)
        `;

        db.run(query, [groupId, payerId, -amount, description], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(200).json({
                message: description,
                expense: {
                    id: this.lastID,
                    group_id: groupId,
                    payerId,
                    amount: -amount,
                    description
                }
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});




const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
