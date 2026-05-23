package handlers

import (
	"net/http"
	"strconv"

	"room9/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *Handler) APICustomerList(c *gin.Context) {
	q := c.Query("q")
	query := `SELECT id, name, phone, created_at FROM customers`
	args := []interface{}{}
	if q != "" {
		query += ` WHERE name LIKE ? OR phone LIKE ?`
		args = append(args, "%"+q+"%", "%"+q+"%")
	}
	query += ` ORDER BY name`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	customers := []models.Customer{}
	for rows.Next() {
		var cust models.Customer
		rows.Scan(&cust.ID, &cust.Name, &cust.Phone, &cust.CreatedAt)
		customers = append(customers, cust)
	}
	c.JSON(http.StatusOK, gin.H{"customers": customers})
}

func (h *Handler) APICustomerCreate(c *gin.Context) {
	var body struct {
		Name  string `json:"name" binding:"required"`
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and phone are required"})
		return
	}

	res, err := h.db.Exec(`INSERT INTO customers (name, phone) VALUES (?, ?)`, body.Name, body.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create customer"})
		return
	}
	id, _ := res.LastInsertId()

	var cust models.Customer
	h.db.QueryRow(`SELECT id, name, phone, created_at FROM customers WHERE id = ?`, id).
		Scan(&cust.ID, &cust.Name, &cust.Phone, &cust.CreatedAt)
	c.JSON(http.StatusCreated, cust)
}

func (h *Handler) APICustomerUpdate(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Name  string `json:"name" binding:"required"`
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and phone are required"})
		return
	}

	res, err := h.db.Exec(
		`UPDATE customers SET name=?, phone=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		body.Name, body.Phone, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	var cust models.Customer
	h.db.QueryRow(`SELECT id, name, phone, created_at FROM customers WHERE id=?`, id).
		Scan(&cust.ID, &cust.Name, &cust.Phone, &cust.CreatedAt)
	c.JSON(http.StatusOK, cust)
}

func (h *Handler) APICustomerDelete(c *gin.Context) {
	id := c.Param("id")
	idInt, _ := strconv.Atoi(id)

	var active int
	h.db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE customer_id=? AND status='active'`, idInt).Scan(&active)
	if active > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete customer with an active session"})
		return
	}
	h.db.Exec(`DELETE FROM customers WHERE id=?`, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
