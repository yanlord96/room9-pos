package middleware

import (
	"database/sql"
	"net/http"
	"time"

	"room9/internal/models"

	"github.com/gin-gonic/gin"
)

const SessionCookie = "room9_session"

func APIRequireAuth(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(SessionCookie)
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var s models.AppSession
		var u models.User
		err = db.QueryRow(`
			SELECT s.id, s.user_id, s.expires_at,
			       u.id, u.username, u.name, u.role
			FROM app_sessions s
			JOIN users u ON u.id = s.user_id
			WHERE s.id = ? AND s.expires_at > ?
		`, token, time.Now().UTC().Format("2006-01-02 15:04:05")).Scan(
			&s.ID, &s.UserID, &s.ExpiresAt,
			&u.ID, &u.Username, &u.Name, &u.Role,
		)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		c.Set("user", &u)
		c.Set("session_token", token)
		c.Next()
	}
}

func APIRequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		u := CurrentUser(c)
		if u == nil || u.Role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		c.Next()
	}
}

func CurrentUser(c *gin.Context) *models.User {
	v, exists := c.Get("user")
	if !exists {
		return nil
	}
	u, _ := v.(*models.User)
	return u
}
