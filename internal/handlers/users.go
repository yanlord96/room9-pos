package handlers

import (
	"net/http"

	"room9/internal/middleware"
	"room9/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func (h *Handler) APIUserList(c *gin.Context) {
	rows, err := h.db.Query(`SELECT id, username, name, role, created_at FROM users ORDER BY role, name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var u models.User
		rows.Scan(&u.ID, &u.Username, &u.Name, &u.Role, &u.CreatedAt)
		users = append(users, u)
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

func (h *Handler) APIUserCreate(c *gin.Context) {
	var body struct {
		Username string `json:"username" binding:"required"`
		Name     string `json:"name" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "All fields are required"})
		return
	}
	if body.Role != "admin" && body.Role != "staff" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role must be admin or staff"})
		return
	}
	if len(body.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	res, err := h.db.Exec(
		`INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)`,
		body.Username, string(hash), body.Name, body.Role,
	)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	id, _ := res.LastInsertId()
	var u models.User
	h.db.QueryRow(`SELECT id, username, name, role, created_at FROM users WHERE id=?`, id).
		Scan(&u.ID, &u.Username, &u.Name, &u.Role, &u.CreatedAt)
	c.JSON(http.StatusCreated, u)
}

func (h *Handler) APIUserUpdate(c *gin.Context) {
	id := c.Param("id")
	me := middleware.CurrentUser(c)

	var body struct {
		Name     string `json:"name" binding:"required"`
		Role     string `json:"role" binding:"required"`
		Password string `json:"password"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and role are required"})
		return
	}
	if body.Role != "admin" && body.Role != "staff" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role must be admin or staff"})
		return
	}
	// Prevent demoting yourself
	if me != nil && string(rune(me.ID)) == id && body.Role != "admin" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change your own role"})
		return
	}

	if body.Password != "" {
		if len(body.Password) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password must be at least 6 characters"})
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}
		h.db.Exec(`UPDATE users SET name=?, role=?, password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
			body.Name, body.Role, string(hash), id)
	} else {
		h.db.Exec(`UPDATE users SET name=?, role=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
			body.Name, body.Role, id)
	}

	var u models.User
	h.db.QueryRow(`SELECT id, username, name, role, created_at FROM users WHERE id=?`, id).
		Scan(&u.ID, &u.Username, &u.Name, &u.Role, &u.CreatedAt)
	c.JSON(http.StatusOK, u)
}

func (h *Handler) APIUserDelete(c *gin.Context) {
	id := c.Param("id")
	me := middleware.CurrentUser(c)

	// Cannot delete yourself
	if me != nil && me.ID == mustInt(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your own account"})
		return
	}

	// Must keep at least one admin
	var adminCount int
	h.db.QueryRow(`SELECT COUNT(*) FROM users WHERE role='admin'`).Scan(&adminCount)
	var targetRole string
	h.db.QueryRow(`SELECT role FROM users WHERE id=?`, id).Scan(&targetRole)
	if targetRole == "admin" && adminCount <= 1 {
		c.JSON(http.StatusConflict, gin.H{"error": "Cannot delete the last admin account"})
		return
	}

	res, _ := h.db.Exec(`DELETE FROM users WHERE id=?`, id)
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func mustInt(s string) int {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0
		}
		n = n*10 + int(c-'0')
	}
	return n
}
