package handlers

import (
	"net/http"
	"strconv"

	"room9/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *Handler) APITableList(c *gin.Context) {
	rows, err := h.db.Query(`SELECT id, name, hourly_rate, status FROM pool_tables ORDER BY name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	tables := []models.PoolTable{}
	for rows.Next() {
		var t models.PoolTable
		rows.Scan(&t.ID, &t.Name, &t.HourlyRate, &t.Status)
		tables = append(tables, t)
	}
	c.JSON(http.StatusOK, gin.H{"tables": tables})
}

func (h *Handler) APITableCreate(c *gin.Context) {
	var body struct {
		Name       string  `json:"name" binding:"required"`
		HourlyRate float64 `json:"hourly_rate" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and hourly rate are required"})
		return
	}

	res, err := h.db.Exec(`INSERT INTO pool_tables (name, hourly_rate) VALUES (?, ?)`, body.Name, body.HourlyRate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create table"})
		return
	}
	id, _ := res.LastInsertId()
	t := models.PoolTable{ID: int(id), Name: body.Name, HourlyRate: body.HourlyRate, Status: "available"}
	c.JSON(http.StatusCreated, t)
}

func (h *Handler) APITableUpdate(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Name       string  `json:"name" binding:"required"`
		HourlyRate float64 `json:"hourly_rate" binding:"required"`
		Status     string  `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and hourly rate are required"})
		return
	}

	if body.Status == "" {
		body.Status = "available"
	}
	res, err := h.db.Exec(
		`UPDATE pool_tables SET name=?, hourly_rate=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
		body.Name, body.HourlyRate, body.Status, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Table not found"})
		return
	}

	idInt, _ := strconv.Atoi(id)
	t := models.PoolTable{ID: idInt, Name: body.Name, HourlyRate: body.HourlyRate, Status: body.Status}
	c.JSON(http.StatusOK, t)
}

func (h *Handler) APITableDelete(c *gin.Context) {
	id := c.Param("id")
	var count int
	h.db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE table_id=? AND status='active'`, id).Scan(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete an occupied table"})
		return
	}
	h.db.Exec(`DELETE FROM pool_tables WHERE id=?`, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
