// seedAdmin.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user');

// Replace with your MongoDB connection string
const mongoURI = 'mongodb://localhost:27017/schoolDb';

// Admin details
const adminDetails = {
    username: 'admin',
    password: '123', // replace with your desired admin password
    email: 'admin@example.com',
    fullName: 'Admin User'
};

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
        seedAdmin();
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
    });

async function seedAdmin() {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(adminDetails.password, 10);

            const adminUser = new User({
                username: adminDetails.username,
                password: hashedPassword,
                email: adminDetails.email,
                fullName: adminDetails.fullName,
                role: 'admin'
            });

            await adminUser.save();
            console.log('Admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }
    } catch (err) {
        console.error('Error creating admin user:', err);
    } finally {
        mongoose.disconnect();
    }
}
