<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/User.php';

function setupTestUsers() {
    try {
        $userModel = new User();
        
        // Test users data
        $testUsers = [
            [
                'username' => 'admin',
                'email' => 'admin@stackit.com',
                'password' => 'admin123',
                'role' => 'admin'
            ],
            [
                'username' => 'john_doe',
                'email' => 'john@example.com',
                'password' => 'user123',
                'role' => 'user'
            ],
            [
                'username' => 'jane_smith',
                'email' => 'jane@example.com',
                'password' => 'test123',
                'role' => 'user'
            ]
        ];
        
        echo "🔧 Setting up test users...\n\n";
        
        foreach ($testUsers as $userData) {
            // Check if user already exists
            $existingUser = $userModel->findByEmail($userData['email']);
            if ($existingUser) {
                echo "⚠️  User {$userData['username']} already exists, skipping...\n";
                continue;
            }
            
            // Create user
            $user = $userModel->create(
                $userData['username'],
                $userData['email'],
                $userData['password'],
                $userData['role']
            );
            
            echo "✅ Created user: {$userData['username']} ({$userData['email']})\n";
        }
        
        echo "\n🎉 Test users setup completed!\n\n";
        echo "📋 Login credentials:\n";
        echo "Admin: admin@stackit.com / admin123\n";
        echo "User 1: john@example.com / user123\n";
        echo "User 2: jane@example.com / test123\n";
        
    } catch (Exception $e) {
        echo "❌ Error setting up test users: " . $e->getMessage() . "\n";
        echo "\n💡 Make sure:\n";
        echo "   1. MySQL server is running\n";
        echo "   2. Database 'stackit' exists\n";
        echo "   3. Your database credentials are correct in config/database.php\n";
    }
}

// Run the setup
setupTestUsers();
?> 