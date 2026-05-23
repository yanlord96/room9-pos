package handlers

import (
	"net/http"
	"time"

	"room9/internal/middleware"
	"room9/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func (h *Handler) APILogin(c *gin.Context) {
	var body struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	var u models.User
	err := h.db.QueryRow(
		`SELECT id, username, password_hash, name, role FROM users WHERE username = ?`,
		body.Username,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Name, &u.Role)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(body.Password)) != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	token := uuid.New().String()
	expires := time.Now().Add(8 * time.Hour)
	_, err = h.db.Exec(
		`INSERT INTO app_sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
		token, u.ID, expires.UTC().Format("2006-01-02 15:04:05"),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Login failed"})
		return
	}

	c.SetCookie(middleware.SessionCookie, token, int(8*time.Hour.Seconds()), "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"user": u})
}

func (h *Handler) APILogout(c *gin.Context) {
	token, _ := c.Cookie(middleware.SessionCookie)
	if token != "" {
		h.db.Exec(`DELETE FROM app_sessions WHERE id = ?`, token)
	}
	c.SetCookie(middleware.SessionCookie, "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) APIMe(c *gin.Context) {
	u := middleware.CurrentUser(c)
	if u == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": u})
}

func (h *Handler) APIDashboard(c *gin.Context) {
	var totalActive, totalAvailable, totalTables int
	h.db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE status = 'active'`).Scan(&totalActive)
	h.db.QueryRow(`SELECT COUNT(*) FROM pool_tables WHERE status = 'available'`).Scan(&totalAvailable)
	h.db.QueryRow(`SELECT COUNT(*) FROM pool_tables`).Scan(&totalTables)

	var todayRevenue float64
	h.db.QueryRow(`
		SELECT COALESCE(SUM(total_amount),0) FROM sessions
		WHERE status = 'completed' AND DATE(ended_at,'localtime') = DATE('now','localtime')
	`).Scan(&todayRevenue)

	c.JSON(http.StatusOK, gin.H{
		"active_sessions":  totalActive,
		"available_tables": totalAvailable,
		"total_tables":     totalTables,
		"today_revenue":    todayRevenue,
	})
}
