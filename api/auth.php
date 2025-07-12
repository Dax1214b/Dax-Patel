<?php
require_once __DIR__ . '/../includes/functions.php';
require_once __DIR__ . '/../models/User.php';

// Set CORS headers
setCorsHeaders();

// Handle different endpoints
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Get the endpoint (last part of URL)
$endpoint = end($pathParts);

// Get request data
$input = getJsonInput();

switch ($endpoint) {
    case 'register':
        if (!isPostRequest()) {
            sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        }
        handleRegister($input);
        break;
        
    case 'login':
        if (!isPostRequest()) {
            sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        }
        handleLogin($input);
        break;
        
    case 'me':
        if (!isGetRequest()) {
            sendJsonResponse(['success' => false, 'message' => 'Method not allowed'], 405);
        }
        handleGetProfile();
        break;
        
    default:
        sendJsonResponse(['success' => false, 'message' => 'Endpoint not found'], 404);
}

function handleRegister($input) {
    // Validate input
    if (!isset($input['username']) || !isset($input['email']) || !isset($input['password'])) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Username, email, and password are required'
        ], 400);
    }
    
    $username = sanitizeInput($input['username']);
    $email = sanitizeInput($input['email']);
    $password = $input['password'];
    
    // Validate email
    if (!isValidEmail($email)) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Invalid email format'
        ], 400);
    }
    
    // Validate password length
    if (strlen($password) < 6) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Password must be at least 6 characters long'
        ], 400);
    }
    
    try {
        $userModel = new User();
        
        // Check if user already exists
        $existingUser = $userModel->findByUsernameOrEmail($username);
        if ($existingUser) {
            sendJsonResponse([
                'success' => false,
                'message' => 'User already exists with this username or email'
            ], 400);
        }
        
        // Check if email already exists
        $existingEmail = $userModel->findByEmail($email);
        if ($existingEmail) {
            sendJsonResponse([
                'success' => false,
                'message' => 'Email is already registered'
            ], 400);
        }
        
        // Create new user
        $user = $userModel->create($username, $email, $password);
        
        // Generate token
        $token = generateToken($user['id']);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'User registered successfully',
            'data' => [
                'user' => $userModel->getPublicProfile($user),
                'token' => $token
            ]
        ], 201);
        
    } catch (Exception $e) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Registration failed: ' . $e->getMessage()
        ], 500);
    }
}

function handleLogin($input) {
    // Validate input
    if (!isset($input['identifier']) || !isset($input['password'])) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Email/username and password are required'
        ], 400);
    }
    
    $identifier = sanitizeInput($input['identifier']);
    $password = $input['password'];
    
    try {
        $userModel = new User();
        
        // Find user by username or email
        $user = $userModel->findByUsernameOrEmail($identifier);
        if (!$user) {
            sendJsonResponse([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }
        
        // Check password
        $isPasswordValid = $userModel->comparePassword($password, $user['password_hash']);
        if (!$isPasswordValid) {
            sendJsonResponse([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }
        
        // Generate token
        $token = generateToken($user['id']);
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => $userModel->getPublicProfile($user),
                'token' => $token
            ]
        ]);
        
    } catch (Exception $e) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Login failed: ' . $e->getMessage()
        ], 500);
    }
}

function handleGetProfile() {
    // Get authorization header
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Authorization token required'
        ], 401);
    }
    
    $token = $matches[1];
    
    try {
        // Get current user from token
        $user = getCurrentUser($token);
        if (!$user) {
            sendJsonResponse([
                'success' => false,
                'message' => 'Invalid or expired token'
            ], 401);
        }
        
        $userModel = new User();
        
        sendJsonResponse([
            'success' => true,
            'data' => [
                'user' => $userModel->getPublicProfile($user)
            ]
        ]);
        
    } catch (Exception $e) {
        sendJsonResponse([
            'success' => false,
            'message' => 'Failed to get profile: ' . $e->getMessage()
        ], 500);
    }
}
?> 