<?php
require_once __DIR__ . '/../config/database.php';

class User {
    private $conn;
    private $table_name = "users";

    public function __construct() {
        $database = new Database();
        $this->conn = $database->getConnection();
    }

    // Create a new user
    public function create($username, $email, $password, $role = 'user') {
        try {
            // Hash password
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            $query = "INSERT INTO " . $this->table_name . " (username, email, password_hash, role) VALUES (?, ?, ?, ?)";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$username, $email, $hashedPassword, $role]);
            
            return [
                'id' => $this->conn->lastInsertId(),
                'username' => $username,
                'email' => $email,
                'role' => $role
            ];
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Find user by ID
    public function findById($id) {
        try {
            $query = "SELECT id, username, email, role, created_at FROM " . $this->table_name . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$id]);
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Find user by username or email
    public function findByUsernameOrEmail($identifier) {
        try {
            $query = "SELECT * FROM " . $this->table_name . " WHERE username = ? OR email = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$identifier, $identifier]);
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Find user by username
    public function findByUsername($username) {
        try {
            $query = "SELECT * FROM " . $this->table_name . " WHERE username = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$username]);
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Find user by email
    public function findByEmail($email) {
        try {
            $query = "SELECT * FROM " . $this->table_name . " WHERE email = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$email]);
            
            return $stmt->fetch();
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Update user
    public function update($id, $updateData) {
        try {
            $fields = [];
            $values = [];
            
            foreach ($updateData as $key => $value) {
                if ($key !== 'id' && $key !== 'password') {
                    $fields[] = "$key = ?";
                    $values[] = $value;
                }
            }
            
            if (empty($fields)) {
                return false;
            }
            
            $values[] = $id;
            $query = "UPDATE " . $this->table_name . " SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute($values);
            
            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Update password
    public function updatePassword($id, $newPassword) {
        try {
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            
            $query = "UPDATE " . $this->table_name . " SET password_hash = ? WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$hashedPassword, $id]);
            
            return $stmt->rowCount() > 0;
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Get all users (for admin)
    public function findAll($limit = 50, $offset = 0) {
        try {
            $query = "SELECT id, username, email, role, created_at FROM " . $this->table_name . " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute([$limit, $offset]);
            
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            throw $e;
        }
    }

    // Compare password
    public function comparePassword($password, $hashedPassword) {
        return password_verify($password, $hashedPassword);
    }

    // Get public profile (without sensitive data)
    public function getPublicProfile($user) {
        unset($user['password_hash']);
        unset($user['email']);
        return $user;
    }
}
?> 