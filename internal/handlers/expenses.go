package handlers

import (
	"net/http"

	"room9/internal/middleware"
	"room9/internal/models"

	"github.com/gin-gonic/gin"
)

func (h *Handler) APIExpenseList(c *gin.Context) {
	year := c.DefaultQuery("year", "")
	month := c.DefaultQuery("month", "")

	query := `
		SELECT e.id, e.amount, e.category, e.description, e.expense_date, e.created_by, e.created_at,
		       COALESCE(u.name, '')
		FROM expenses e
		LEFT JOIN users u ON u.id = e.created_by
	`
	args := []any{}
	if year != "" && month != "" {
		query += ` WHERE strftime('%Y', e.expense_date) = ? AND strftime('%m', e.expense_date) = ?`
		args = append(args, year, month)
	} else if year != "" {
		query += ` WHERE strftime('%Y', e.expense_date) = ?`
		args = append(args, year)
	}
	query += ` ORDER BY e.expense_date DESC, e.id DESC LIMIT 500`

	rows, err := h.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	expenses := []models.Expense{}
	var total float64
	for rows.Next() {
		var e models.Expense
		rows.Scan(&e.ID, &e.Amount, &e.Category, &e.Description, &e.ExpenseDate,
			&e.CreatedBy, &e.CreatedAt, &e.CreatedName)
		total += e.Amount
		expenses = append(expenses, e)
	}
	c.JSON(http.StatusOK, gin.H{"expenses": expenses, "total": total})
}

func (h *Handler) APIExpenseCreate(c *gin.Context) {
	var body struct {
		Amount      float64 `json:"amount" binding:"required"`
		Category    string  `json:"category" binding:"required"`
		Description string  `json:"description" binding:"required"`
		ExpenseDate string  `json:"expense_date" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields required"})
		return
	}
	if body.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be greater than 0"})
		return
	}

	u := middleware.CurrentUser(c)
	res, err := h.db.Exec(
		`INSERT INTO expenses (amount, category, description, expense_date, created_by) VALUES (?, ?, ?, ?, ?)`,
		body.Amount, body.Category, body.Description, body.ExpenseDate, u.ID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense"})
		return
	}
	id, _ := res.LastInsertId()

	var e models.Expense
	h.db.QueryRow(`
		SELECT e.id, e.amount, e.category, e.description, e.expense_date, e.created_by, e.created_at, COALESCE(u.name,'')
		FROM expenses e LEFT JOIN users u ON u.id = e.created_by WHERE e.id = ?`, id).
		Scan(&e.ID, &e.Amount, &e.Category, &e.Description, &e.ExpenseDate, &e.CreatedBy, &e.CreatedAt, &e.CreatedName)
	c.JSON(http.StatusCreated, e)
}

func (h *Handler) APIExpenseUpdate(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Amount      float64 `json:"amount" binding:"required"`
		Category    string  `json:"category" binding:"required"`
		Description string  `json:"description" binding:"required"`
		ExpenseDate string  `json:"expense_date" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields required"})
		return
	}

	res, err := h.db.Exec(
		`UPDATE expenses SET amount=?, category=?, description=?, expense_date=? WHERE id=?`,
		body.Amount, body.Category, body.Description, body.ExpenseDate, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update"})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) APIExpenseDelete(c *gin.Context) {
	id := c.Param("id")
	h.db.Exec(`DELETE FROM expenses WHERE id=?`, id)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
