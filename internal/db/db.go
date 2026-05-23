package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func Init(path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	database, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	database.SetMaxOpenConns(1)

	if err := migrate(database); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	alterSessions(database)
	if err := seed(database); err != nil {
		return nil, fmt.Errorf("seed: %w", err)
	}
	return database, nil
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		name TEXT NOT NULL,
		role TEXT NOT NULL CHECK(role IN ('admin','staff')),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS customers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		phone TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS menu_items (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		category TEXT NOT NULL,
		price REAL NOT NULL,
		is_available INTEGER NOT NULL DEFAULT 1,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS pool_tables (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		hourly_rate REAL NOT NULL,
		status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','occupied','maintenance')),
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS sessions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		table_id INTEGER NOT NULL,
		customer_id INTEGER NOT NULL,
		started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		ended_at DATETIME,
		table_charge REAL DEFAULT 0,
		fnb_charge REAL DEFAULT 0,
		total_amount REAL DEFAULT 0,
		status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed')),
		created_by INTEGER,
		FOREIGN KEY (table_id) REFERENCES pool_tables(id),
		FOREIGN KEY (customer_id) REFERENCES customers(id),
		FOREIGN KEY (created_by) REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS orders (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		session_id INTEGER NOT NULL,
		menu_item_id INTEGER NOT NULL,
		quantity INTEGER NOT NULL DEFAULT 1,
		unit_price REAL NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (session_id) REFERENCES sessions(id),
		FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
	);

	CREATE TABLE IF NOT EXISTS app_sessions (
		id TEXT PRIMARY KEY,
		user_id INTEGER NOT NULL,
		expires_at DATETIME NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	`)
	return err
}

func alterSessions(db *sql.DB) {
	// ignore errors — columns may already exist
	db.Exec(`ALTER TABLE sessions ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'open'`)
	db.Exec(`ALTER TABLE sessions ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 0`)
	db.Exec(`ALTER TABLE sessions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'`)
	db.Exec(`ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`)
}

func seed(db *sql.DB) error {
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count)
	if count > 0 {
		return nil
	}

	// default password for both accounts: admin123
	hash := "$2a$10$QdjRCq3hU22eQgtMd0Wc2ebtYmWgw7moxf7lynY1.7iuRwNbG9apS"
	_, err := db.Exec(`
		INSERT INTO users (username, password_hash, name, role) VALUES
		(?, ?, 'Administrator', 'admin'),
		(?, ?, 'Staff', 'staff')
	`, "admin", hash, "staff", hash)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO customers (name, phone) VALUES
		('Budi Santoso', '08123456789'),
		('Siti Rahayu', '08987654321')
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO pool_tables (name, hourly_rate) VALUES
		('Table 1', 30000),
		('Table 2', 30000),
		('Table 3', 30000),
		('Table 4', 30000),
		('Table 5', 40000),
		('Table 6', 40000),
		('Table 7', 50000),
		('Table 8', 50000)
	`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		INSERT INTO menu_items (name, category, price) VALUES
		('Nasi Goreng', 'Food', 20000),
		('Mie Goreng', 'Food', 18000),
		('Ayam Geprek', 'Food', 22000),
		('Kentang Goreng', 'Snacks', 12000),
		('Cireng Isi', 'Snacks', 10000),
		('Tahu Crispy', 'Snacks', 8000),
		('Es Teh Manis', 'Drinks', 5000),
		('Es Jeruk', 'Drinks', 8000),
		('Air Mineral', 'Drinks', 5000),
		('Kopi Hitam', 'Drinks', 8000),
		('Kopi Susu', 'Drinks', 12000),
		('Jus Alpukat', 'Drinks', 15000)
	`)
	return err
}
