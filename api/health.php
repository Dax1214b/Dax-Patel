<?php
require_once __DIR__ . '/../includes/functions.php';

// Set CORS headers
setCorsHeaders();

// Health check response
$response = [
    'status' => 'OK',
    'message' => 'StackIt PHP API is running',
    'timestamp' => date('c'),
    'version' => '1.0.0',
    'backend' => 'PHP'
];

sendJsonResponse($response);
?> 