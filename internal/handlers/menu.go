package handlers

import (
	"net/http"

	"room9/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *Handler) APIMenuList(c *gin.Context) {
	rows, err := h.db.Query(`SELECT id, name, category, price, is_available FROM menu_items ORDER BY category, name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	items := []models.MenuItem{}
	for rows.Next() {
		var item models.MenuItem
		rows.Scan(&item.ID, &item.Name, &item.Category, &item.Price, &item.IsAvailable)
		items = append(items, item)
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *Handler) APIMenuCreate(c *gin.Context) {
	var body struct {
		Name     string  `json:"name" binding:"required"`
		Category string  `json:"category" binding:"required"`
		Price    float64 `json:"price" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name, category, and price are required"})
		return
	}

	res, err := h.db.Exec(`INSERT INTO menu_items (name, category, price) VALUES (?, ?, ?)`,
		body.Name, body.Category, body.Price)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create item"})
		return
	}
	id, _ := res.LastInsertId()

	item := models.MenuItem{ID: int(id), Name: body.Name, Category: body.Category, Price: body.Price, IsAvailable: true}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) APIMenuUpdate(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Name        string  `json:"name" binding:"required"`
		Category    string  `json:"category" binding:"required"`
		Price       float64 `json:"price" binding:"required"`
		IsAvailable bool    `json:"is_available"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields required"})
		return
	}

	avail := 0
	if body.IsAvailable {
		avail = 1
	}
	res, err := h.db.Exec(
		`UPDATE menu_items SET name=?, category=?, price=?, is_available=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		body.Name, body.Category, body.Price, avail, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item not found"})
		return
	}

	item := models.MenuItem{Name: body.Name, Category: body.Category, Price: body.Price, IsAvailable: body.IsAvailable}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) APIMenuDelete(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM menu_items WHERE id=?`, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
