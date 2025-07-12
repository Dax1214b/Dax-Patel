<?php
// Simple PHP development server startup script
echo "🚀 Starting StackIt PHP Server...\n";
echo "📁 Project directory: " . __DIR__ . "\n";
echo "🌐 Server will be available at: http://localhost:8000\n";
echo "⏹️  Press Ctrl+C to stop the server\n\n";

// Start PHP development server
$command = 'php -S localhost:8000';
echo "Running: $command\n\n";

// Execute the command
system($command);
?> 