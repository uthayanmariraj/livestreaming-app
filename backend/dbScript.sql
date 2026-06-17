-- Create the database if it does not exist
CREATE DATABASE IF NOT EXISTS livestreaming_db;
USE livestreaming_db;

-- Table for User Accounts
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for Livestreams (Streams)
CREATE TABLE IF NOT EXISTS streams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stream_name VARCHAR(255) NOT NULL UNIQUE,
    streamer_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'offline',
    privacy VARCHAR(10) DEFAULT 'PUB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (streamer_name) REFERENCES users(username) ON DELETE CASCADE
);

-- Table for Stream Members (For Private Stream Access)
CREATE TABLE IF NOT EXISTS stream_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stream_id INT NOT NULL,
    username VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    UNIQUE KEY unique_member (stream_id, username)
);

-- Table for Stream Invites
CREATE TABLE IF NOT EXISTS stream_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stream_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    created_by VARCHAR(255) NOT NULL,
    max_uses INT DEFAULT NULL,
    uses INT DEFAULT 0,
    expires_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(username) ON DELETE CASCADE
);
