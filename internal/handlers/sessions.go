package handlers

import (
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"room9/internal/middleware"
	"room9/internal/models"

	"github.com/gin-gonic/gin"
)

func calcTableCharge(started time.Time, hourlyRate float64, billingType string, durationMinutes int) float64 {
	var minutes float64
	if billingType == "fixed" {
		minutes = float64(durationMinutes)
	} else {
		minutes = time.Since(started).Minutes()
		if minutes < 0 {
			minutes = 0
		}
	}
	raw := (minutes / 60.0) * hourlyRate
	return math.Ceil(raw/1000) * 1000
}

func (h *Handler) APIBookingPage(c *gin.Context) {
	tableRows, _ := h.db.Query(`SELECT id, name, hourly_rate, status FROM pool_tables ORDER BY name`)
	defer tableRows.Close()
	tables := []models.PoolTable{}
	for tableRows.Next() {
		var t models.PoolTable
		tableRows.Scan(&t.ID, &t.Name, &t.HourlyRate, &t.Status)
		tables = append(tables, t)
	}

	custRows, _ := h.db.Query(`SELECT id, name, phone FROM customers ORDER BY name`)
	defer custRows.Close()
	customers := []models.Customer{}
	for custRows.Next() {
		var cu models.Customer
		custRows.Scan(&cu.ID, &cu.Name, &cu.Phone)
		customers = append(customers, cu)
	}

	sessRows, _ := h.db.Query(`
		SELECT s.id, s.table_id, s.customer_id, s.started_at,
		       t.name, t.hourly_rate, cu.name, cu.phone,
		       s.billing_type, s.duration_minutes
		FROM sessions s
		JOIN pool_tables t ON t.id = s.table_id
		JOIN customers cu ON cu.id = s.customer_id
		WHERE s.status = 'active'
		ORDER BY s.started_at DESC
	`)
	defer sessRows.Close()
	activeSessions := []models.Session{}
	for sessRows.Next() {
		var s models.Session
		s.Status = "active"
		sessRows.Scan(&s.ID, &s.TableID, &s.CustomerID, &s.StartedAt,
			&s.TableName, &s.HourlyRate, &s.CustomerName, &s.CustomerPhone,
			&s.BillingType, &s.DurationMinutes)
		s.TableCharge = calcTableCharge(s.StartedAt, s.HourlyRate, s.BillingType, s.DurationMinutes)
		activeSessions = append(activeSessions, s)
	}

	c.JSON(http.StatusOK, gin.H{
		"tables":          tables,
		"customers":       customers,
		"active_sessions": activeSessions,
	})
}

func (h *Handler) APIBookingStart(c *gin.Context) {
	var body struct {
		TableID         int    `json:"table_id" binding:"required"`
		CustomerID      int    `json:"customer_id" binding:"required"`
		BillingType     string `json:"billing_type"`
		DurationMinutes int    `json:"duration_minutes"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "table_id and customer_id are required"})
		return
	}
	if body.BillingType == "" {
		body.BillingType = "open"
	}
	if body.BillingType == "fixed" && body.DurationMinutes <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "duration_minutes required for fixed billing"})
		return
	}

	var status string
	h.db.QueryRow(`SELECT status FROM pool_tables WHERE id=?`, body.TableID).Scan(&status)
	if status != "available" {
		c.JSON(http.StatusConflict, gin.H{"error": "Table not available"})
		return
	}

	u := middleware.CurrentUser(c)
	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	now := time.Now().UTC().Format("2006-01-02 15:04:05")
	res, err := tx.Exec(
		`INSERT INTO sessions (table_id, customer_id, started_at, status, created_by, billing_type, duration_minutes)
		 VALUES (?, ?, ?, 'active', ?, ?, ?)`,
		body.TableID, body.CustomerID, now, u.ID, body.BillingType, body.DurationMinutes,
	)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	tx.Exec(`UPDATE pool_tables SET status='occupied', updated_at=CURRENT_TIMESTAMP WHERE id=?`, body.TableID)
	tx.Commit()

	sessionID, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"session_id": sessionID})
}

func (h *Handler) APIBookingDetail(c *gin.Context) {
	id := c.Param("id")

	var s models.Session
	err := h.db.QueryRow(`
		SELECT s.id, s.table_id, s.customer_id, s.started_at, s.status,
		       t.name, t.hourly_rate, cu.name, cu.phone,
		       s.billing_type, s.duration_minutes
		FROM sessions s
		JOIN pool_tables t ON t.id = s.table_id
		JOIN customers cu ON cu.id = s.customer_id
		WHERE s.id = ?
	`, id).Scan(&s.ID, &s.TableID, &s.CustomerID, &s.StartedAt, &s.Status,
		&s.TableName, &s.HourlyRate, &s.CustomerName, &s.CustomerPhone,
		&s.BillingType, &s.DurationMinutes)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	if s.Status == "active" {
		s.TableCharge = calcTableCharge(s.StartedAt, s.HourlyRate, s.BillingType, s.DurationMinutes)
	}

	orderRows, _ := h.db.Query(`
		SELECT o.id, o.quantity, o.unit_price, o.created_at, m.name, m.category
		FROM orders o JOIN menu_items m ON m.id = o.menu_item_id
		WHERE o.session_id = ? ORDER BY o.created_at
	`, id)
	defer orderRows.Close()
	orders := []models.Order{}
	var fnbTotal float64
	for orderRows.Next() {
		var o models.Order
		o.SessionID = s.ID
		orderRows.Scan(&o.ID, &o.Quantity, &o.UnitPrice, &o.CreatedAt, &o.ItemName, &o.ItemCategory)
		fnbTotal += float64(o.Quantity) * o.UnitPrice
		orders = append(orders, o)
	}
	s.FnbCharge = fnbTotal

	menuRows, _ := h.db.Query(`SELECT id, name, category, price, stock FROM menu_items WHERE is_available=1 ORDER BY category, name`)
	defer menuRows.Close()
	menuItems := []models.MenuItem{}
	for menuRows.Next() {
		var m models.MenuItem
		menuRows.Scan(&m.ID, &m.Name, &m.Category, &m.Price, &m.Stock)
		menuItems = append(menuItems, m)
	}

	c.JSON(http.StatusOK, gin.H{
		"session":    s,
		"orders":     orders,
		"menu_items": menuItems,
	})
}

func (h *Handler) APIBookingEnd(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		PaymentMethod string `json:"payment_method"`
	}
	c.ShouldBindJSON(&body)
	if body.PaymentMethod == "" {
		body.PaymentMethod = "cash"
	}

	var s models.Session
	err := h.db.QueryRow(`
		SELECT s.id, s.table_id, s.started_at, t.hourly_rate, s.billing_type, s.duration_minutes
		FROM sessions s JOIN pool_tables t ON t.id = s.table_id
		WHERE s.id = ? AND s.status = 'active'
	`, id).Scan(&s.ID, &s.TableID, &s.StartedAt, &s.HourlyRate, &s.BillingType, &s.DurationMinutes)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found or already completed"})
		return
	}

	tableCharge := calcTableCharge(s.StartedAt, s.HourlyRate, s.BillingType, s.DurationMinutes)
	var fnbCharge float64
	h.db.QueryRow(`SELECT COALESCE(SUM(quantity*unit_price),0) FROM orders WHERE session_id=?`, id).Scan(&fnbCharge)
	total := tableCharge + fnbCharge
	now := time.Now().UTC().Format("2006-01-02 15:04:05")

	tx, _ := h.db.Begin()
	tx.Exec(`UPDATE sessions SET status='completed', ended_at=?, table_charge=?, fnb_charge=?, total_amount=?, payment_method=? WHERE id=?`,
		now, tableCharge, fnbCharge, total, body.PaymentMethod, id)
	tx.Exec(`UPDATE pool_tables SET status='available', updated_at=CURRENT_TIMESTAMP WHERE id=?`, s.TableID)
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"session_id": s.ID})
}

func (h *Handler) APIPaymentList(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT s.id, s.started_at, s.ended_at, s.table_charge, s.fnb_charge,
		       s.total_amount, s.payment_method, s.billing_type,
		       t.name, cu.name, cu.phone
		FROM sessions s
		JOIN pool_tables t ON t.id = s.table_id
		JOIN customers cu ON cu.id = s.customer_id
		WHERE s.status = 'completed'
		ORDER BY s.ended_at DESC
		LIMIT 200
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	type Payment struct {
		ID            int        `json:"id"`
		StartedAt     time.Time  `json:"started_at"`
		EndedAt       *time.Time `json:"ended_at"`
		TableCharge   float64    `json:"table_charge"`
		FnbCharge     float64    `json:"fnb_charge"`
		TotalAmount   float64    `json:"total_amount"`
		PaymentMethod string     `json:"payment_method"`
		BillingType   string     `json:"billing_type"`
		TableName     string     `json:"table_name"`
		CustomerName  string     `json:"customer_name"`
		CustomerPhone string     `json:"customer_phone"`
	}

	payments := []Payment{}
	for rows.Next() {
		var p Payment
		rows.Scan(&p.ID, &p.StartedAt, &p.EndedAt, &p.TableCharge, &p.FnbCharge,
			&p.TotalAmount, &p.PaymentMethod, &p.BillingType,
			&p.TableName, &p.CustomerName, &p.CustomerPhone)
		payments = append(payments, p)
	}
	c.JSON(http.StatusOK, gin.H{"payments": payments})
}

func (h *Handler) APIBookingReceipt(c *gin.Context) {
	id := c.Param("id")

	var s models.Session
	var endedAt *time.Time
	err := h.db.QueryRow(`
		SELECT s.id, s.table_id, s.customer_id, s.started_at, s.ended_at,
		       s.table_charge, s.fnb_charge, s.total_amount, s.status,
		       t.name, t.hourly_rate, cu.name, cu.phone,
		       s.billing_type, s.duration_minutes
		FROM sessions s
		JOIN pool_tables t ON t.id = s.table_id
		JOIN customers cu ON cu.id = s.customer_id
		WHERE s.id = ?
	`, id).Scan(&s.ID, &s.TableID, &s.CustomerID, &s.StartedAt, &endedAt,
		&s.TableCharge, &s.FnbCharge, &s.TotalAmount, &s.Status,
		&s.TableName, &s.HourlyRate, &s.CustomerName, &s.CustomerPhone,
		&s.BillingType, &s.DurationMinutes)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}
	s.EndedAt = endedAt

	orderRows, _ := h.db.Query(`
		SELECT o.id, o.quantity, o.unit_price, m.name, m.category
		FROM orders o JOIN menu_items m ON m.id = o.menu_item_id
		WHERE o.session_id = ? ORDER BY o.created_at
	`, id)
	defer orderRows.Close()
	orders := []models.Order{}
	for orderRows.Next() {
		var o models.Order
		orderRows.Scan(&o.ID, &o.Quantity, &o.UnitPrice, &o.ItemName, &o.ItemCategory)
		orders = append(orders, o)
	}

	duration := ""
	if endedAt != nil {
		d := endedAt.Sub(s.StartedAt)
		h := int(d.Hours())
		m := int(d.Minutes()) % 60
		duration = fmt.Sprintf("%dh %dm", h, m)
	}

	c.JSON(http.StatusOK, gin.H{
		"session":  s,
		"orders":   orders,
		"duration": duration,
	})
}

func (h *Handler) APIOrderCreate(c *gin.Context) {
	var body struct {
		SessionID  int `json:"session_id" binding:"required"`
		MenuItemID int `json:"menu_item_id" binding:"required"`
		Quantity   int `json:"quantity" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Quantity <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid order fields"})
		return
	}

	var price float64
	var stock int
	if err := h.db.QueryRow(`SELECT price, stock FROM menu_items WHERE id=?`, body.MenuItemID).Scan(&price, &stock); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Menu item not found"})
		return
	}
	if stock != -1 && stock < body.Quantity {
		c.JSON(http.StatusConflict, gin.H{"error": "Insufficient stock"})
		return
	}

	tx, _ := h.db.Begin()
	res, err := tx.Exec(
		`INSERT INTO orders (session_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)`,
		body.SessionID, body.MenuItemID, body.Quantity, price,
	)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add order"})
		return
	}
	if stock != -1 {
		tx.Exec(`UPDATE menu_items SET stock=stock-?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, body.Quantity, body.MenuItemID)
	}
	tx.Commit()
	id, _ := res.LastInsertId()

	var o models.Order
	h.db.QueryRow(`
		SELECT o.id, o.session_id, o.menu_item_id, o.quantity, o.unit_price, o.created_at, m.name, m.category
		FROM orders o JOIN menu_items m ON m.id=o.menu_item_id WHERE o.id=?`, id).
		Scan(&o.ID, &o.SessionID, &o.MenuItemID, &o.Quantity, &o.UnitPrice, &o.CreatedAt, &o.ItemName, &o.ItemCategory)
	c.JSON(http.StatusCreated, o)
}

func (h *Handler) APIOrderDelete(c *gin.Context) {
	id := c.Param("id")
	var sessionID, menuItemID, quantity int
	h.db.QueryRow(`SELECT session_id, menu_item_id, quantity FROM orders WHERE id=?`, id).Scan(&sessionID, &menuItemID, &quantity)

	tx, _ := h.db.Begin()
	tx.Exec(`DELETE FROM orders WHERE id=?`, id)
	// restore stock if tracked
	tx.Exec(`UPDATE menu_items SET stock=stock+?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND stock != -1`, quantity, menuItemID)
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"ok": true, "session_id": sessionID})
}

func (h *Handler) APICharts(c *gin.Context) {
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))
	monthStr := c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month())))
	year, _ := strconv.Atoi(yearStr)
	month, _ := strconv.Atoi(monthStr)
	yy := fmt.Sprintf("%04d", year)
	mm := fmt.Sprintf("%02d", month)

	// Revenue per table for the given month
	type TableStat struct {
		TableName string  `json:"table_name"`
		Total     float64 `json:"total"`
		Sessions  int     `json:"sessions"`
	}
	tableRows, _ := h.db.Query(`
		SELECT t.name, COALESCE(SUM(s.total_amount), 0), COUNT(s.id)
		FROM pool_tables t
		LEFT JOIN sessions s ON s.table_id = t.id
			AND s.status = 'completed'
			AND strftime('%Y', s.ended_at) = ?
			AND strftime('%m', s.ended_at) = ?
		GROUP BY t.id, t.name
		ORDER BY t.name
	`, yy, mm)
	defer tableRows.Close()
	perTable := []TableStat{}
	for tableRows.Next() {
		var ts TableStat
		tableRows.Scan(&ts.TableName, &ts.Total, &ts.Sessions)
		perTable = append(perTable, ts)
	}

	// Sessions per hour of day
	type HourStat struct {
		Hour     int     `json:"hour"`
		Sessions int     `json:"sessions"`
		Total    float64 `json:"total"`
	}
	hourRows, _ := h.db.Query(`
		SELECT CAST(strftime('%H', started_at) AS INTEGER), COUNT(*), COALESCE(SUM(total_amount), 0)
		FROM sessions
		WHERE status = 'completed'
			AND strftime('%Y', ended_at) = ?
			AND strftime('%m', ended_at) = ?
		GROUP BY strftime('%H', started_at)
		ORDER BY 1
	`, yy, mm)
	defer hourRows.Close()
	perHour := []HourStat{}
	for hourRows.Next() {
		var hs HourStat
		hourRows.Scan(&hs.Hour, &hs.Sessions, &hs.Total)
		perHour = append(perHour, hs)
	}

	c.JSON(http.StatusOK, gin.H{
		"per_table": perTable,
		"per_hour":  perHour,
		"year":      year,
		"month":     month,
	})
}

func (h *Handler) APIReportData(c *gin.Context) {
	period := c.DefaultQuery("period", "monthly")
	yearStr := c.DefaultQuery("year", strconv.Itoa(time.Now().Year()))
	monthStr := c.DefaultQuery("month", strconv.Itoa(int(time.Now().Month())))
	year, _ := strconv.Atoi(yearStr)
	month, _ := strconv.Atoi(monthStr)

	summaries, err := fetchSummaries(h.db, period, year, month)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var grandTable, grandFnb, grandTotal float64
	var grandSessions int
	for _, s := range summaries {
		grandTable += s.TableCharge
		grandFnb += s.FnbCharge
		grandTotal += s.Total
		grandSessions += s.Sessions
	}

	c.JSON(http.StatusOK, gin.H{
		"period":    period,
		"year":      year,
		"month":     month,
		"summaries": summaries,
		"grand": gin.H{
			"table_charge": grandTable,
			"fnb_charge":   grandFnb,
			"total":        grandTotal,
			"sessions":     grandSessions,
		},
	})
}
