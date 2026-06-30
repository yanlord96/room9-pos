package handlers

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func ownerPassword() string {
	if p := os.Getenv("OWNER_PASSWORD"); p != "" {
		return p
	}
	return "owner123"
}

func (h *Handler) APIReportsVerify(c *gin.Context) {
	var body struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password required"})
		return
	}
	if body.Password != ownerPassword() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Password salah"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) APIDeleteSession(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password required"})
		return
	}
	if body.Password != ownerPassword() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Password salah"})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	// Restore stock for all ordered items
	rows, err := tx.Query(`SELECT menu_item_id, quantity FROM orders WHERE session_id = ?`, id)
	if err == nil {
		for rows.Next() {
			var menuItemID, qty int
			rows.Scan(&menuItemID, &qty)
			tx.Exec(`UPDATE menu_items SET stock = stock + ? WHERE stock != -1 AND id = ?`, qty, menuItemID)
		}
		rows.Close()
	}

	tx.Exec(`DELETE FROM orders WHERE session_id = ?`, id)
	tx.Exec(`UPDATE pool_tables SET status = 'available' WHERE id = (SELECT table_id FROM sessions WHERE id = ?)`, id)
	tx.Exec(`DELETE FROM sessions WHERE id = ?`, id)

	if err := tx.Commit(); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) APIDeleteWalkin(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password required"})
		return
	}
	if body.Password != ownerPassword() {
		c.JSON(http.StatusForbidden, gin.H{"error": "Password salah"})
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	rows, err := tx.Query(`SELECT menu_item_id, quantity FROM walkin_order_items WHERE order_id = ?`, id)
	if err == nil {
		for rows.Next() {
			var menuItemID, qty int
			rows.Scan(&menuItemID, &qty)
			tx.Exec(`UPDATE menu_items SET stock = stock + ? WHERE stock != -1 AND id = ?`, qty, menuItemID)
		}
		rows.Close()
	}

	tx.Exec(`DELETE FROM walkin_order_items WHERE order_id = ?`, id)
	tx.Exec(`DELETE FROM walkin_orders WHERE id = ?`, id)

	if err := tx.Commit(); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"ok": true})
}
