package models

import "time"

type User struct {
	ID           int       `json:"id"`
	Username     string    `json:"username"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

type Customer struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"created_at"`
}

type MenuItem struct {
	ID          int     `json:"id"`
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	IsAvailable bool    `json:"is_available"`
}

type PoolTable struct {
	ID         int     `json:"id"`
	Name       string  `json:"name"`
	HourlyRate float64 `json:"hourly_rate"`
	Status     string  `json:"status"`
}

type Session struct {
	ID            int        `json:"id"`
	TableID       int        `json:"table_id"`
	CustomerID    int        `json:"customer_id"`
	StartedAt     time.Time  `json:"started_at"`
	EndedAt       *time.Time `json:"ended_at,omitempty"`
	TableCharge   float64    `json:"table_charge"`
	FnbCharge     float64    `json:"fnb_charge"`
	TotalAmount   float64    `json:"total_amount"`
	Status        string     `json:"status"`
	TableName       string     `json:"table_name"`
	CustomerName    string     `json:"customer_name"`
	CustomerPhone   string     `json:"customer_phone"`
	HourlyRate      float64    `json:"hourly_rate"`
	BillingType     string     `json:"billing_type"`
	DurationMinutes int        `json:"duration_minutes"`
	PaymentMethod   string     `json:"payment_method"`
}

type Order struct {
	ID           int       `json:"id"`
	SessionID    int       `json:"session_id"`
	MenuItemID   int       `json:"menu_item_id"`
	Quantity     int       `json:"quantity"`
	UnitPrice    float64   `json:"unit_price"`
	CreatedAt    time.Time `json:"created_at"`
	ItemName     string    `json:"item_name"`
	ItemCategory string    `json:"item_category"`
}

type FinancialSummary struct {
	Period      string  `json:"period"`
	TableCharge float64 `json:"table_charge"`
	FnbCharge   float64 `json:"fnb_charge"`
	Total       float64 `json:"total"`
	Sessions    int     `json:"sessions"`
}

type AppSession struct {
	ID        string    `json:"id"`
	UserID    int       `json:"user_id"`
	ExpiresAt time.Time `json:"expires_at"`
}
