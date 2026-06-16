package handlers

import (
	"fmt"
	"net/http"

	"room9/internal/middleware"
	"room9/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *Handler) APIWalkinCheckout(c *gin.Context) {
	var body struct {
		PaymentMethod string `json:"payment_method"`
		Note          string `json:"note"`
		Items         []struct {
			MenuItemID int `json:"menu_item_id"`
			Quantity   int `json:"quantity"`
		} `json:"items" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || len(body.Items) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Items are required"})
		return
	}
	if body.PaymentMethod == "" {
		body.PaymentMethod = "cash"
	}

	// Validate items & calculate total
	type itemDetail struct {
		menuItemID   int
		name         string
		category     string
		price        float64
		quantity     int
		stock        int
	}
	details := []itemDetail{}
	var total float64

	for _, item := range body.Items {
		if item.Quantity <= 0 {
			continue
		}
		var d itemDetail
		d.menuItemID = item.MenuItemID
		d.quantity = item.Quantity
		err := h.db.QueryRow(`SELECT name, category, price, stock FROM menu_items WHERE id=? AND is_available=1`, item.MenuItemID).
			Scan(&d.name, &d.category, &d.price, &d.stock)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Menu item %d not found", item.MenuItemID)})
			return
		}
		if d.stock != -1 && d.stock < d.quantity {
			c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("Insufficient stock for %s", d.name)})
			return
		}
		total += d.price * float64(d.quantity)
		details = append(details, d)
	}

	if len(details) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No valid items"})
		return
	}

	u := middleware.CurrentUser(c)
	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	res, err := tx.Exec(
		`INSERT INTO walkin_orders (payment_method, total, note, created_by) VALUES (?, ?, ?, ?)`,
		body.PaymentMethod, total, body.Note, u.ID,
	)
	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create order"})
		return
	}
	orderID, _ := res.LastInsertId()

	for _, d := range details {
		tx.Exec(
			`INSERT INTO walkin_order_items (order_id, menu_item_id, item_name, item_category, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`,
			orderID, d.menuItemID, d.name, d.category, d.quantity, d.price,
		)
		if d.stock != -1 {
			tx.Exec(`UPDATE menu_items SET stock=stock-?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, d.quantity, d.menuItemID)
		}
	}
	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{"order_id": orderID})
}

func (h *Handler) APIWalkinReceipt(c *gin.Context) {
	id := c.Param("id")

	var o models.WalkinOrder
	err := h.db.QueryRow(`
		SELECT w.id, w.payment_method, w.total, w.note, w.created_by, w.created_at, COALESCE(u.name,'')
		FROM walkin_orders w LEFT JOIN users u ON u.id = w.created_by
		WHERE w.id = ?`, id).
		Scan(&o.ID, &o.PaymentMethod, &o.Total, &o.Note, &o.CreatedBy, &o.CreatedAt, &o.CreatedName)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	rows, _ := h.db.Query(`
		SELECT id, order_id, menu_item_id, item_name, item_category, quantity, unit_price
		FROM walkin_order_items WHERE order_id = ?`, id)
	defer rows.Close()
	items := []models.WalkinOrderItem{}
	for rows.Next() {
		var item models.WalkinOrderItem
		rows.Scan(&item.ID, &item.OrderID, &item.MenuItemID, &item.ItemName, &item.ItemCategory, &item.Quantity, &item.UnitPrice)
		items = append(items, item)
	}

	c.JSON(http.StatusOK, gin.H{"order": o, "items": items})
}

func (h *Handler) APIWalkinList(c *gin.Context) {
	rows, err := h.db.Query(`
		SELECT w.id, w.payment_method, w.total, w.note, w.created_by, w.created_at, COALESCE(u.name,'')
		FROM walkin_orders w LEFT JOIN users u ON u.id = w.created_by
		ORDER BY w.created_at DESC LIMIT 100
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()
	orders := []models.WalkinOrder{}
	for rows.Next() {
		var o models.WalkinOrder
		rows.Scan(&o.ID, &o.PaymentMethod, &o.Total, &o.Note, &o.CreatedBy, &o.CreatedAt, &o.CreatedName)
		orders = append(orders, o)
	}
	c.JSON(http.StatusOK, gin.H{"orders": orders})
}
